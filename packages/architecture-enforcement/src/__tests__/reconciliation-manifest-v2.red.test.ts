import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const ARCHITECTURE_TEST_ROOT = "/tmp/opencode/architecture-v2-red";
const V1_MANIFEST_SHA256 =
  "4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0";
const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";
const V2_ARTIFACT_PATHS = [
  "packages/architecture-enforcement/src/config/ownership-map.v2.json",
  "packages/architecture-enforcement/src/config/baselines/database.v2.json",
  "packages/architecture-enforcement/src/config/baselines/provider.v2.json",
] as const;
const V2_MANIFEST_KEYS = [
  "schemaVersion",
  "reconciliationId",
  "v1ManifestSha256",
  "v1Artifacts",
  "v2Artifacts",
  "analyzerImplementationTreeSha256",
  "implementationAndTestTreeSha256",
  "analyzerInputSnapshotSha256",
  "reportSha256s",
  "reviewSubjectSha256",
  "reviews",
  "baselineAdditions",
  "baselineRemovals",
  "baselineRenames",
  "acceptance",
] as const;

interface V2Manifest {
  readonly schemaVersion?: unknown;
  readonly reconciliationId?: unknown;
  readonly v1ManifestSha256?: unknown;
  readonly v1Artifacts?: unknown;
  readonly v2Artifacts?: unknown;
  readonly analyzerImplementationTreeSha256?: unknown;
  readonly implementationAndTestTreeSha256?: unknown;
  readonly analyzerInputSnapshotSha256?: unknown;
  readonly reportSha256s?: readonly [unknown, unknown];
  readonly reviewSubjectSha256?: unknown;
  readonly reviews?: unknown;
  readonly baselineAdditions?: unknown;
  readonly baselineRemovals?: unknown;
  readonly baselineRenames?: unknown;
  readonly acceptance?: unknown;
}

interface V2ManifestModule {
  readonly validateAnalyzerReconciliationManifestV2?: (
    input: V2ManifestValidationInput,
  ) => Promise<unknown> | unknown;
}

interface V2ManifestValidationInput {
  readonly repoRoot: string;
  readonly manifest: unknown;
}

const REVIEW_ROLES = [
  "adversarial-testing",
  "correctness",
  "developer-api",
  "security",
] as const;
const REVIEW_EVIDENCE_PATHS = REVIEW_ROLES.map(
  (role) =>
    `measure/tracks/durable_job_worker_platform_20260713/reviews/${role}.md`,
) as readonly string[];
const OWNER_RECEIPT_PATH =
  "measure/tracks/durable_job_worker_platform_20260713/owner-receipt.json";
const temporaryRoots: string[] = [];

interface V2ArtifactReference {
  readonly path: string;
  readonly sha256: string;
}

interface ReviewRecord {
  readonly role: string;
  readonly reviewer: string;
  readonly result: "accepted";
  readonly reviewSubjectSha256: string;
  readonly evidencePath: string;
  readonly evidenceSha256: string;
  readonly v1ManifestSha256: string;
  readonly v2Artifacts: readonly V2ArtifactReference[];
}

interface MaterializedManifest {
  readonly repoRoot: string;
  readonly manifest: V2Manifest;
  readonly ownerReceiptSource?: string;
}

const V1_ARTIFACT_PATHS = [
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json",
  "packages/architecture-enforcement/src/config/ownership-map.v1.json",
  "packages/architecture-enforcement/src/config/baselines/database.v1.json",
  "packages/architecture-enforcement/src/config/baselines/provider.v1.json",
] as const;

/** Reads one optional candidate manifest without turning its absence into a transform error.
 * @returns Candidate manifest, when present.
 */
async function readCandidateManifest(): Promise<V2Manifest | undefined> {
  try {
    return JSON.parse(
      await readFile(resolve(repositoryRoot, V2_MANIFEST_PATH), "utf8"),
    ) as V2Manifest;
  } catch {
    return undefined;
  }
}

/** Hashes exact candidate artifact bytes for manifest binding checks.
 * @param path Repository-relative artifact path.
 * @returns Lowercase SHA-256 digest.
 */
async function artifactSha256(path: string): Promise<string> {
  const bytes = await readFile(resolve(repositoryRoot, path));
  return createHash("sha256").update(bytes).digest("hex");
}

/** Loads the future v2 validator through the current public module shape.
 * @returns Future v2 validator function.
 */
async function loadV2ManifestValidator(): Promise<
  V2ManifestModule["validateAnalyzerReconciliationManifestV2"]
> {
  const module = (await import("../index.js")) as V2ManifestModule;
  return module.validateAnalyzerReconciliationManifestV2;
}

/** Hashes exact UTF-8 text bytes.
 * @param value Exact text to hash.
 * @returns Lowercase SHA-256 digest.
 */
function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Serializes JSON data with stable object-key ordering.
 * @param value JSON-compatible value.
 * @returns Canonical compact JSON.
 */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Computes the v2 review subject from protected manifest fields.
 * @param manifest Manifest whose mutable review fields are excluded.
 * @returns Expected review-subject SHA-256.
 */
function computeExpectedReviewSubjectSha256(manifest: V2Manifest): string {
  const {
    reviews: _reviews,
    acceptance: _acceptance,
    reviewSubjectSha256: _reviewSubjectSha256,
    ...protectedFields
  } = manifest as Record<string, unknown>;
  return sha256Text(canonicalJson(protectedFields));
}

/** Returns exact v2 artifact references from one manifest.
 * @param manifest Manifest containing v2 artifact references.
 * @returns The manifest's v2 artifact references.
 */
function getV2ArtifactReferences(
  manifest: V2Manifest,
): readonly V2ArtifactReference[] {
  return Array.isArray(manifest.v2Artifacts)
    ? (manifest.v2Artifacts as readonly V2ArtifactReference[])
    : [];
}

/** Creates one evidence document that binds every required review input.
 * @param review Review fields to serialize into the evidence document.
 * @returns Canonical evidence document text.
 */
function createReviewEvidenceSource(
  review: Pick<
    ReviewRecord,
    "role" | "reviewer" | "result" | "reviewSubjectSha256" | "v2Artifacts"
  >,
): string {
  return `${JSON.stringify({
    role: review.role,
    reviewer: review.reviewer,
    result: review.result,
    reviewSubjectSha256: review.reviewSubjectSha256,
    v1ManifestSha256: V1_MANIFEST_SHA256,
    v2Artifacts: review.v2Artifacts,
    baselineAdditions: [],
    baselineRemovals: [],
    baselineRenames: [],
  })}\n`;
}

/** Copies exact manifest artifacts and writes temporary review and receipt evidence.
 * @param manifest Manifest whose files and evidence must be materialized.
 * @returns Temporary validation root and the materialized manifest.
 */
async function materializeManifestValidationInputs(
  manifest: V2Manifest,
): Promise<MaterializedManifest> {
  const configuredRoot = process.env.ARCHITECTURE_TEST_TMPDIR;
  if (
    configuredRoot !== undefined &&
    configuredRoot !== ARCHITECTURE_TEST_ROOT
  ) {
    throw new Error(
      `ARCHITECTURE_TEST_TMPDIR must equal ${ARCHITECTURE_TEST_ROOT}`,
    );
  }
  await mkdir(ARCHITECTURE_TEST_ROOT, { recursive: true });
  const repoRoot = await mkdtemp(
    resolve(ARCHITECTURE_TEST_ROOT, "architecture-manifest-v2-"),
  );
  temporaryRoots.push(repoRoot);
  for (const path of [
    ...V1_ARTIFACT_PATHS,
    V2_MANIFEST_PATH,
    ...V2_ARTIFACT_PATHS,
  ]) {
    const destination = resolve(repoRoot, path);
    await mkdir(resolve(destination, ".."), { recursive: true });
    await copyFile(resolve(repositoryRoot, path), destination);
  }

  const artifactReferences = getV2ArtifactReferences(manifest);
  const reviews = Array.isArray(manifest.reviews)
    ? (manifest.reviews as readonly ReviewRecord[])
    : [];
  const materializedReviews = reviews.map((review) => {
    const evidenceSource = createReviewEvidenceSource({
      role: review.role,
      reviewer: review.reviewer,
      result: review.result,
      reviewSubjectSha256: review.reviewSubjectSha256,
      v2Artifacts: artifactReferences,
    });
    return {
      ...review,
      v1ManifestSha256: V1_MANIFEST_SHA256,
      v2Artifacts: artifactReferences,
      evidenceSha256: sha256Text(evidenceSource),
    };
  });
  for (const review of materializedReviews) {
    const evidenceSource = createReviewEvidenceSource(review);
    await mkdir(resolve(repoRoot, review.evidencePath, ".."), {
      recursive: true,
    });
    await writeFile(resolve(repoRoot, review.evidencePath), evidenceSource);
  }

  const acceptance = manifest.acceptance as
    | {
        ownerBinding?: {
          ownerId?: string;
          ownerReceiptPath?: string;
          ownerReceiptSha256?: string;
          ownerReviewSubjectSha256?: string;
        };
      }
    | undefined;
  const ownerBinding = acceptance?.ownerBinding;
  let ownerReceiptSource: string | undefined;
  let materializedManifest = {
    ...manifest,
    reviews: materializedReviews,
  } as V2Manifest;
  if (ownerBinding) {
    ownerReceiptSource = `${JSON.stringify({
      ownerId: ownerBinding.ownerId,
      reviewSubjectSha256: ownerBinding.ownerReviewSubjectSha256,
      v1ManifestSha256: V1_MANIFEST_SHA256,
      v2Artifacts: artifactReferences,
      baselineAdditions: [],
      baselineRemovals: [],
      baselineRenames: [],
    })}\n`;
    await mkdir(resolve(repoRoot, OWNER_RECEIPT_PATH, ".."), {
      recursive: true,
    });
    await writeFile(resolve(repoRoot, OWNER_RECEIPT_PATH), ownerReceiptSource);
    materializedManifest = {
      ...materializedManifest,
      acceptance: {
        ...(manifest.acceptance as Record<string, unknown>),
        ownerBinding: {
          ...ownerBinding,
          ownerReceiptPath: OWNER_RECEIPT_PATH,
          ownerReceiptSha256: sha256Text(ownerReceiptSource),
        },
      },
    };
  }
  return { repoRoot, manifest: materializedManifest, ownerReceiptSource };
}

/** Requires one malformed manifest to fail through the future v2 validator.
 * @param validator Validator under test.
 * @param manifest Manifest input to reject.
 * @param repoRoot Root containing bound artifact bytes.
 * @returns Nothing after rejection is proven.
 */
async function expectManifestRejected(
  validator: NonNullable<
    V2ManifestModule["validateAnalyzerReconciliationManifestV2"]
  >,
  manifest: V2Manifest,
  repoRoot = repositoryRoot,
): Promise<void> {
  let rejected = false;
  try {
    const result = await validator({ repoRoot, manifest });
    rejected =
      typeof result === "object" &&
      result !== null &&
      "valid" in result &&
      (result as { valid?: unknown }).valid === false;
  } catch {
    rejected = true;
  }
  expect(rejected).toBe(true);
}

/** Requires one valid v2 manifest state to pass through the future validator.
 * @param validator Validator under test.
 * @param manifest Manifest input to accept.
 * @param repoRoot Root containing bound artifact bytes.
 * @returns Nothing after explicit success is proven.
 */
async function expectManifestAccepted(
  validator: NonNullable<
    V2ManifestModule["validateAnalyzerReconciliationManifestV2"]
  >,
  manifest: V2Manifest,
  repoRoot = repositoryRoot,
): Promise<void> {
  let accepted = false;
  try {
    const result = await validator({ repoRoot, manifest });
    accepted =
      typeof result === "object" &&
      result !== null &&
      "valid" in result &&
      (result as { valid?: unknown }).valid === true;
  } catch {
    accepted = false;
  }
  expect(accepted).toBe(true);
}

/** Creates the canonical review prefix used by candidate and accepted states.
 * @param manifest Manifest supplying the review subject and v2 artifacts.
 * @returns Four ordered review records.
 */
function createReviewPrefix(manifest: V2Manifest): ReviewRecord[] {
  const v2Artifacts = getV2ArtifactReferences(manifest);
  return REVIEW_ROLES.map((role, index) => ({
    role,
    reviewer: `${role}-reviewer`,
    result: "accepted",
    reviewSubjectSha256: manifest.reviewSubjectSha256 as string,
    evidencePath: REVIEW_EVIDENCE_PATHS[index]!,
    evidenceSha256: sha256Text(`review-evidence-${index}`),
    v1ManifestSha256: V1_MANIFEST_SHA256,
    v2Artifacts,
  }));
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("architecture analyzer reconciliation manifest v2 (expected Red)", () => {
  it("requires the strict v2 manifest and complete artifact family", async () => {
    const manifest = await readCandidateManifest();
    expect(
      manifest,
      "missing v2 manifest artifact; v2 reconciliation behavior is absent",
    ).toBeDefined();
    if (!manifest) return;

    expect(Object.keys(manifest)).toEqual(V2_MANIFEST_KEYS);
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.reconciliationId).toBe("backend-architecture-analyzer-v2");
    expect(manifest.v1ManifestSha256).toBe(V1_MANIFEST_SHA256);
    expect(manifest.v1Artifacts).toEqual([
      {
        path: "packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json",
        sha256:
          "4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0",
      },
      {
        path: "packages/architecture-enforcement/src/config/ownership-map.v1.json",
        sha256:
          "f6d7b64d8d0091ef9d696d3bf0677f3b995ee78f41011ed56eea50399949f1e8",
      },
      {
        path: "packages/architecture-enforcement/src/config/baselines/database.v1.json",
        sha256:
          "8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73",
      },
      {
        path: "packages/architecture-enforcement/src/config/baselines/provider.v1.json",
        sha256:
          "7137e81c662f25073e233144a585178fdd19ec324630f58cc5a807de42b4ace5",
      },
    ]);
    expect(manifest.v2Artifacts).toEqual(
      V2_ARTIFACT_PATHS.map((path) =>
        expect.objectContaining({
          path,
          sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      ),
    );
  });

  it("binds committed lifecycle, hashes, evidence, reviews, and zero baseline deltas", async () => {
    const manifest = await readCandidateManifest();
    expect(
      manifest,
      "missing v2 manifest prevents reconciliation binding checks",
    ).toBeDefined();
    if (!manifest) return;

    expect(manifest.analyzerImplementationTreeSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.implementationAndTestTreeSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.analyzerInputSnapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.reportSha256s).toEqual([
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.stringMatching(/^[a-f0-9]{64}$/),
    ]);
    expect(manifest.reportSha256s?.[0]).toBe(manifest.reportSha256s?.[1]);
    expect(manifest.reviewSubjectSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.reviewSubjectSha256).toBe(
      computeExpectedReviewSubjectSha256(manifest),
    );
    const reviews: ReviewRecord[] = Array.isArray(manifest.reviews)
      ? (manifest.reviews as ReviewRecord[])
      : [];
    const v2Artifacts = getV2ArtifactReferences(manifest);
    expect(reviews.length).toBeLessThanOrEqual(REVIEW_ROLES.length);
    expect(reviews.map((review) => review.role)).toEqual(
      REVIEW_ROLES.slice(0, reviews.length),
    );
    expect(reviews).toEqual(
      reviews.map((review, index) =>
        expect.objectContaining({
          role: REVIEW_ROLES[index],
          reviewer: expect.any(String),
          result: "accepted",
          reviewSubjectSha256: manifest.reviewSubjectSha256,
          evidencePath: REVIEW_EVIDENCE_PATHS[index],
          evidenceSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          v1ManifestSha256: V1_MANIFEST_SHA256,
          v2Artifacts,
        }),
      ),
    );
    expect(new Set(reviews.map((review) => review.evidenceSha256)).size).toBe(
      reviews.length,
    );
    expect(manifest.baselineAdditions).toEqual([]);
    expect(manifest.baselineRemovals).toEqual([]);
    expect(manifest.baselineRenames).toEqual([]);
    const acceptance = manifest.acceptance as {
      status?: unknown;
      defaultPolicy?: unknown;
      ownerBinding?: unknown;
    };
    expect(["candidate", "accepted"]).toContain(acceptance.status);
    if (acceptance.status === "candidate") {
      expect(acceptance.defaultPolicy).toBe("v1");
      expect(acceptance.ownerBinding).toBeUndefined();
    } else if (acceptance.status === "accepted") {
      expect(acceptance.defaultPolicy).toBe("v2");
      expect(reviews).toHaveLength(REVIEW_ROLES.length);
      const ownerBinding = acceptance.ownerBinding as {
        ownerId?: unknown;
        ownerReceiptPath?: unknown;
        ownerReceiptSha256?: unknown;
        ownerReviewSubjectSha256?: unknown;
      };
      expect(ownerBinding).toEqual(
        expect.objectContaining({
          ownerId: expect.stringMatching(/^[a-z][a-z0-9-]*$/),
          ownerReceiptPath: OWNER_RECEIPT_PATH,
          ownerReceiptSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          ownerReviewSubjectSha256: manifest.reviewSubjectSha256,
        }),
      );
      expect(ownerBinding.ownerReceiptSha256).not.toBe(
        manifest.reviewSubjectSha256,
      );
      const ownerReceiptSource = await readFile(
        resolve(repositoryRoot, ownerBinding.ownerReceiptPath as string),
        "utf8",
      );
      expect(sha256Text(ownerReceiptSource)).toBe(
        ownerBinding.ownerReceiptSha256,
      );
    }

    const artifacts: Array<{ path: string; sha256: string }> = Array.isArray(
      manifest.v2Artifacts,
    )
      ? (manifest.v2Artifacts as Array<{ path: string; sha256: string }>)
      : [];
    for (const artifact of artifacts) {
      expect(artifact.sha256).toBe(await artifactSha256(artifact.path));
    }
  });

  it("rejects malformed ordering, paths, secrets, bindings, and hashes", async () => {
    const manifest = await readCandidateManifest();
    expect(
      manifest,
      "missing v2 manifest prevents strict validator rejection checks",
    ).toBeDefined();
    if (!manifest) return;
    const validator = await loadV2ManifestValidator();
    expect(validator).toBeTypeOf("function");
    if (typeof validator !== "function") return;

    const prepared = await materializeManifestValidationInputs({
      ...manifest,
      reviews: createReviewPrefix(manifest),
      acceptance: { status: "candidate", defaultPolicy: "v1" },
    });
    const baseManifest = prepared.manifest;
    const artifacts = Array.isArray(baseManifest.v2Artifacts)
      ? (baseManifest.v2Artifacts as Array<Record<string, unknown>>)
      : [];
    const v1Artifacts = Array.isArray(baseManifest.v1Artifacts)
      ? (baseManifest.v1Artifacts as Array<Record<string, unknown>>)
      : [];
    const reviews = baseManifest.reviews as ReviewRecord[];
    await expectManifestRejected(
      validator,
      { ...baseManifest, reviewSubjectSha256: "0".repeat(64) },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        v1Artifacts: v1Artifacts.map((artifact, index) =>
          index === 0 ? { ...artifact, sha256: "0".repeat(64) } : artifact,
        ),
      },
      prepared.repoRoot,
    );
    for (const evidencePath of [
      "changed-review.md",
      "measure/tracks/*/review.md",
      "../review.md",
    ]) {
      await expectManifestRejected(
        validator,
        {
          ...baseManifest,
          reviews: reviews.map((review, index) =>
            index === 0 ? { ...review, evidencePath } : review,
          ),
        },
        prepared.repoRoot,
      );
    }
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        acceptance: { status: "unknown", defaultPolicy: "v1" },
      },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        acceptance: { status: "candidate", defaultPolicy: "unknown" },
      },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        v2Artifacts: [...artifacts].reverse(),
      },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        v2Artifacts: [...artifacts, artifacts[0]],
      },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        baselineAdditions: [{ instanceKey: "a".repeat(64) }],
      },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        v2Artifacts: artifacts.map((artifact, index) =>
          index === 0 ? { ...artifact, sha256: "0".repeat(64) } : artifact,
        ),
      },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        v2Artifacts: artifacts.map((artifact, index) =>
          index === 0
            ? { ...artifact, path: "packages/*/secret.json" }
            : artifact,
        ),
      },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        v2Artifacts: artifacts.map((artifact, index) =>
          index === 0
            ? { ...artifact, source: "embedded source body" }
            : artifact,
        ),
      },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      { ...baseManifest, apiKey: "secret-value" } as V2Manifest,
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      { ...baseManifest, v1ManifestSha256: "0".repeat(64) },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        reviews: reviews.map((review, index) =>
          index === 0
            ? { ...review, reviewSubjectSha256: "0".repeat(64) }
            : review,
        ),
      },
      prepared.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...baseManifest,
        reviews: reviews.map((review, index) =>
          index === 0 ? { ...review, evidenceSha256: "0".repeat(64) } : review,
        ),
      },
      prepared.repoRoot,
    );
  });

  it("accepts candidate prefixes and accepted owner activation only", async () => {
    const manifest = await readCandidateManifest();
    expect(
      manifest,
      "missing v2 manifest prevents activation-state validation",
    ).toBeDefined();
    if (!manifest) return;
    const validator = await loadV2ManifestValidator();
    expect(validator).toBeTypeOf("function");
    if (typeof validator !== "function") return;

    const reviewPrefix = createReviewPrefix(manifest);
    for (let count = 0; count <= REVIEW_ROLES.length; count += 1) {
      const prepared = await materializeManifestValidationInputs({
        ...manifest,
        reviews: reviewPrefix.slice(0, count),
        acceptance: { status: "candidate", defaultPolicy: "v1" },
      });
      await expectManifestAccepted(
        validator,
        prepared.manifest,
        prepared.repoRoot,
      );
    }
    const candidateDefaultV2 = await materializeManifestValidationInputs({
      ...manifest,
      reviews: reviewPrefix.slice(0, 1),
      acceptance: { status: "candidate", defaultPolicy: "v2" },
    });
    await expectManifestRejected(
      validator,
      candidateDefaultV2.manifest,
      candidateDefaultV2.repoRoot,
    );

    const candidateOwnerActivation = await materializeManifestValidationInputs({
      ...manifest,
      reviews: reviewPrefix.slice(0, 1),
      acceptance: {
        status: "candidate",
        defaultPolicy: "v1",
        ownerBinding: {
          ownerId: "architecture-owner",
          ownerReceiptPath: OWNER_RECEIPT_PATH,
          ownerReceiptSha256: "0".repeat(64),
          ownerReviewSubjectSha256: manifest.reviewSubjectSha256,
        },
      },
    });
    await expectManifestRejected(
      validator,
      candidateOwnerActivation.manifest,
      candidateOwnerActivation.repoRoot,
    );

    const acceptedWithoutOwner = await materializeManifestValidationInputs({
      ...manifest,
      reviews: reviewPrefix,
      acceptance: { status: "accepted", defaultPolicy: "v2" },
    });
    await expectManifestRejected(
      validator,
      acceptedWithoutOwner.manifest,
      acceptedWithoutOwner.repoRoot,
    );

    const acceptedDefaultV1 = await materializeManifestValidationInputs({
      ...manifest,
      reviews: reviewPrefix,
      acceptance: {
        status: "accepted",
        defaultPolicy: "v1",
        ownerBinding: {
          ownerId: "architecture-owner",
          ownerReceiptPath: OWNER_RECEIPT_PATH,
          ownerReceiptSha256: "0".repeat(64),
          ownerReviewSubjectSha256: manifest.reviewSubjectSha256,
        },
      },
    });
    await expectManifestRejected(
      validator,
      acceptedDefaultV1.manifest,
      acceptedDefaultV1.repoRoot,
    );

    const accepted = await materializeManifestValidationInputs({
      ...manifest,
      reviews: reviewPrefix,
      acceptance: {
        status: "accepted",
        defaultPolicy: "v2",
        ownerBinding: {
          ownerId: "architecture-owner",
          ownerReceiptPath: OWNER_RECEIPT_PATH,
          ownerReceiptSha256: "0".repeat(64),
          ownerReviewSubjectSha256: manifest.reviewSubjectSha256,
        },
      },
    });
    await expectManifestAccepted(
      validator,
      accepted.manifest,
      accepted.repoRoot,
    );
    const acceptedReviews = accepted.manifest.reviews as ReviewRecord[];
    await expectManifestRejected(
      validator,
      {
        ...accepted.manifest,
        reviews: acceptedReviews.map((review, index) =>
          index === 0
            ? { ...review, v1ManifestSha256: "0".repeat(64) }
            : review,
        ),
      },
      accepted.repoRoot,
    );
    await expectManifestRejected(
      validator,
      {
        ...accepted.manifest,
        reviews: acceptedReviews.map((review, index) =>
          index === 0
            ? {
                ...review,
                v2Artifacts: review.v2Artifacts.map(
                  (artifact, artifactIndex) =>
                    artifactIndex === 0
                      ? { ...artifact, sha256: "0".repeat(64) }
                      : artifact,
                ),
              }
            : review,
        ),
      },
      accepted.repoRoot,
    );
    const acceptedBinding = (
      accepted.manifest.acceptance as {
        ownerBinding: {
          ownerId: string;
          ownerReceiptPath: string;
          ownerReceiptSha256: string;
          ownerReviewSubjectSha256: string;
        };
      }
    ).ownerBinding;
    for (const ownerReceiptPath of [
      "changed-owner-receipt.json",
      "measure/tracks/*/owner-receipt.json",
      "../owner-receipt.json",
    ]) {
      await expectManifestRejected(
        validator,
        {
          ...accepted.manifest,
          acceptance: {
            ...(accepted.manifest.acceptance as Record<string, unknown>),
            ownerBinding: {
              ...acceptedBinding,
              ownerReceiptPath,
            },
          },
        },
        accepted.repoRoot,
      );
    }
    await expectManifestRejected(
      validator,
      {
        ...accepted.manifest,
        acceptance: {
          ...(accepted.manifest.acceptance as Record<string, unknown>),
          ownerBinding: {
            ...acceptedBinding,
            ownerReceiptSha256: "0".repeat(64),
          },
        },
      },
      accepted.repoRoot,
    );

    const tamperedReceipt = await materializeManifestValidationInputs({
      ...manifest,
      reviews: reviewPrefix,
      acceptance: {
        status: "accepted",
        defaultPolicy: "v2",
        ownerBinding: {
          ownerId: "architecture-owner",
          ownerReceiptPath: OWNER_RECEIPT_PATH,
          ownerReceiptSha256: "0".repeat(64),
          ownerReviewSubjectSha256: manifest.reviewSubjectSha256,
        },
      },
    });
    await writeFile(
      resolve(tamperedReceipt.repoRoot, OWNER_RECEIPT_PATH),
      `${tamperedReceipt.ownerReceiptSource}tampered`,
    );
    await expectManifestRejected(
      validator,
      tamperedReceipt.manifest,
      tamperedReceipt.repoRoot,
    );

    const tamperedEvidence = await materializeManifestValidationInputs({
      ...manifest,
      reviews: reviewPrefix,
      acceptance: {
        status: "accepted",
        defaultPolicy: "v2",
        ownerBinding: {
          ownerId: "architecture-owner",
          ownerReceiptPath: OWNER_RECEIPT_PATH,
          ownerReceiptSha256: "0".repeat(64),
          ownerReviewSubjectSha256: manifest.reviewSubjectSha256,
        },
      },
    });
    const firstEvidencePath = (
      tamperedEvidence.manifest.reviews as ReviewRecord[]
    )[0]!.evidencePath;
    await writeFile(
      resolve(tamperedEvidence.repoRoot, firstEvidencePath),
      "tampered evidence\n",
    );
    await expectManifestRejected(
      validator,
      tamperedEvidence.manifest,
      tamperedEvidence.repoRoot,
    );
    expect(accepted.ownerReceiptSource).toContain(
      '"ownerId":"architecture-owner"',
    );
    expect(accepted.ownerReceiptSource).toContain(
      `"reviewSubjectSha256":"${manifest.reviewSubjectSha256}"`,
    );
    expect(accepted.ownerReceiptSource).toContain(
      `"v1ManifestSha256":"${V1_MANIFEST_SHA256}"`,
    );
    expect(accepted.ownerReceiptSource).toContain('"baselineAdditions":[]');
    expect(accepted.ownerReceiptSource).toContain('"baselineRemovals":[]');
    expect(accepted.ownerReceiptSource).toContain('"baselineRenames":[]');
    expect(accepted.ownerReceiptSource).not.toContain("manifestSha256");
    const receipt = JSON.parse(accepted.ownerReceiptSource!) as {
      readonly ownerId: string;
      readonly reviewSubjectSha256: string;
      readonly v1ManifestSha256: string;
      readonly v2Artifacts: readonly V2ArtifactReference[];
      readonly baselineAdditions: readonly unknown[];
      readonly baselineRemovals: readonly unknown[];
      readonly baselineRenames: readonly unknown[];
    };
    expect(receipt).toEqual({
      ownerId: "architecture-owner",
      reviewSubjectSha256: manifest.reviewSubjectSha256,
      v1ManifestSha256: V1_MANIFEST_SHA256,
      v2Artifacts: getV2ArtifactReferences(accepted.manifest),
      baselineAdditions: [],
      baselineRemovals: [],
      baselineRenames: [],
    });
    expect(receipt).not.toHaveProperty("manifestSha256");
    for (const review of accepted.manifest.reviews as ReviewRecord[]) {
      const evidenceSource = await readFile(
        resolve(accepted.repoRoot, review.evidencePath),
        "utf8",
      );
      expect(sha256Text(evidenceSource)).toBe(review.evidenceSha256);
      expect(JSON.parse(evidenceSource)).toEqual({
        role: review.role,
        reviewer: review.reviewer,
        result: "accepted",
        reviewSubjectSha256: manifest.reviewSubjectSha256,
        v1ManifestSha256: V1_MANIFEST_SHA256,
        v2Artifacts: getV2ArtifactReferences(accepted.manifest),
        baselineAdditions: [],
        baselineRemovals: [],
        baselineRenames: [],
      });
    }

    const wrongOwnerSubject = await materializeManifestValidationInputs({
      ...manifest,
      reviews: reviewPrefix,
      acceptance: {
        status: "accepted",
        defaultPolicy: "v2",
        ownerBinding: {
          ownerId: "architecture-owner",
          ownerReceiptPath: OWNER_RECEIPT_PATH,
          ownerReceiptSha256: "0".repeat(64),
          ownerReviewSubjectSha256: "b".repeat(64),
        },
      },
    });
    await expectManifestRejected(
      validator,
      wrongOwnerSubject.manifest,
      wrongOwnerSubject.repoRoot,
    );
  });
});

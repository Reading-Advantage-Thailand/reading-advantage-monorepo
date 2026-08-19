import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  analyzeArchitectureSources,
  type ArchitectureAnalysisResult,
} from "./analyzer.js";
import { computeRulesetHash } from "./baseline.js";
import {
  architectureBaselineSchema,
  architectureConfigSchema,
} from "./contracts.js";
import { selectArchitectureSourceFiles } from "./inventory.js";
import {
  compareArchitectureDebt,
  type ArchitectureComparison,
} from "./ratchet.js";
import {
  computeAnalyzerImplementationTreeSha256V2,
  computeAnalyzerImplementationTreeSha256V2Sync,
  computeReconciliationImplementationTreeSha256V2,
  computeReconciliationImplementationTreeSha256V2Sync,
} from "./reconciliation-manifest.js";
import { compareStableStrings } from "./stable-order.js";
import {
  listWorkspacePackageManifestPaths,
  loadWorkspaceModuleTargets,
} from "./workspace-resolution.js";
import { V1_ARTIFACT_BINDINGS } from "./v1-validation.js";

/** Input accepted by the v2 candidate and acceptance validator. */
export interface ValidateAnalyzerReconciliationManifestV2Input {
  /** Repository root containing every bound artifact and evidence file. */
  repoRoot: string;
  /** Untrusted candidate or accepted manifest data. */
  manifest: unknown;
  /** Whether full current implementation and analyzer evidence must be checked. */
  validateCurrentState?: boolean;
}

/** Result returned after strict v2 manifest validation. */
export interface AnalyzerReconciliationManifestV2ValidationResult {
  /** True when every v2 contract and byte binding passes. */
  valid: boolean;
  /** Secret-safe validation failures for diagnostic callers. */
  errors?: readonly string[];
}

interface ArtifactReference {
  path: string;
  sha256: string;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const V1_MANIFEST_SHA256 =
  "4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0";
const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";
const V2_ARTIFACT_PATHS = [
  "packages/architecture-enforcement/src/config/ownership-map.v2.json",
  "packages/architecture-enforcement/src/config/baselines/database.v2.json",
  "packages/architecture-enforcement/src/config/baselines/provider.v2.json",
] as const;
/** Stable identifier for the v2-only tenant registry classification exception. */
export const V2_TENANT_REGISTRY_EXCEPTION_ID =
  "durable-job-tenant-registry-classification";
const REVIEW_ROLES = [
  "adversarial-testing",
  "correctness",
  "developer-api",
  "security",
] as const;
const REVIEWER_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const REVIEW_EVIDENCE_PATHS = REVIEW_ROLES.map(
  (role) =>
    `measure/tracks/durable_job_worker_platform_20260713/reviews/${role}.md`,
);
const OWNER_RECEIPT_PATH =
  "measure/tracks/durable_job_worker_platform_20260713/owner-receipt.json";
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
const ANALYZER_INPUT_SUPPORT_PATHS = [
  "package.json",
  "pnpm-workspace.yaml",
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json",
  "packages/architecture-enforcement/src/config/ownership-map.v1.json",
  "packages/architecture-enforcement/src/config/baselines/database.v1.json",
  "packages/architecture-enforcement/src/config/baselines/provider.v1.json",
  ...V2_ARTIFACT_PATHS,
] as const;
const CODING_CANDIDATE_ROOT = "packages/architecture-enforcement";

/** Immutable filesystem projection used by v2 analyzer evidence. */
export interface V2EvidenceSourceProjection {
  /** Repository root used to select immutable Git inputs. */
  sourceRoot: string;
  /** Isolated root containing clean HEAD plus the Coding candidate. */
  projectedRoot: string;
  /** Canonical source paths included in the projected analyzer run. */
  sourcePaths: readonly string[];
  /** Workspace package manifests copied into the projected root. */
  workspaceManifestPaths: readonly string[];
  /** Removes the isolated projection. */
  dispose(): Promise<void>;
}

interface SynchronousV2EvidenceSourceProjection {
  sourceRoot: string;
  projectedRoot: string;
  sourcePaths: readonly string[];
  workspaceManifestPaths: readonly string[];
  dispose(): void;
}

/** Fixed v2 production files that must remain in the analyzer source set before tracking. */
export const V2_PRODUCTION_TYPESCRIPT_PATHS = [
  "packages/architecture-enforcement/src/policy-selection.ts",
  "packages/architecture-enforcement/src/policy-write-guard.ts",
  "packages/architecture-enforcement/src/v1-validation.ts",
  "packages/architecture-enforcement/src/v2-manifest-validation.ts",
] as const;

/** Converts JSON-compatible values to canonical stable-key JSON. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort(compareStableStrings)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Hashes exact UTF-8 text bytes with SHA-256. */
function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Hashes exact bytes with SHA-256. */
function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Tests whether a value is a lowercase SHA-256 digest. */
function isSha256(value: unknown): value is string {
  return (
    typeof value === "string" &&
    SHA256_PATTERN.test(value) &&
    !/^0{64}$/.test(value) &&
    !/^a{64}$/.test(value)
  );
}

/** Tests whether a repository-relative path is exact and traversal-free. */
function isExactPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.includes("//") &&
    !value.includes("*") &&
    !value.includes("?") &&
    value.split("/").every((segment) => segment !== "." && segment !== "..")
  );
}

/** Reads exact bytes after validating a repository-relative path. */
function readExactSync(repoRoot: string, path: string): Uint8Array {
  if (!isExactPath(path)) throw new Error(`Unsafe bound path: ${String(path)}`);
  return readFileSync(resolve(repoRoot, path));
}

/** Lists tracked and untracked bytes owned by this Coding candidate. */
function listCodingCandidatePaths(repoRoot: string): string[] {
  const changedTracked = execFileSync(
    "git",
    ["diff", "--name-only", "HEAD", "--", `${CODING_CANDIDATE_ROOT}/`],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const changedUntracked = execFileSync(
    "git",
    [
      "ls-files",
      "--others",
      "--exclude-standard",
      "--",
      `${CODING_CANDIDATE_ROOT}/`,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  return [...new Set(`${changedTracked}\n${changedUntracked}`.split("\n"))]
    .filter(
      (path) =>
        path.length > 0 &&
        isExactPath(path) &&
        (path === CODING_CANDIDATE_ROOT ||
          path.startsWith(`${CODING_CANDIDATE_ROOT}/`)),
    )
    .sort(compareStableStrings);
}

/** Extracts immutable HEAD bytes into one isolated source root. */
function extractHeadProjectionSync(
  projectedRoot: string,
  repoRoot: string,
  headPaths: readonly string[],
): void {
  const archivePath = resolve(projectedRoot, ".head.tar");
  try {
    execFileSync(
      "git",
      [
        "archive",
        "--format=tar",
        "--output",
        archivePath,
        "HEAD",
        "--",
        ...headPaths,
      ],
      { cwd: repoRoot },
    );
    execFileSync("tar", ["-xf", archivePath, "-C", projectedRoot]);
  } finally {
    rmSync(archivePath, { force: true });
  }
}

/** Selects exact tracked HEAD inputs required by the projected analyzer. */
function listProjectionHeadPaths(
  repoRoot: string,
  sourcePaths: readonly string[],
): string[] {
  const headPaths = new Set(
    execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    })
      .split("\n")
      .filter(Boolean),
  );
  return listAnalyzerInputPaths(repoRoot, sourcePaths).filter((path) =>
    headPaths.has(path),
  );
}

/** Overlays one candidate path onto an immutable source projection. */
function overlayCandidatePathSync(
  repoRoot: string,
  projectedRoot: string,
  path: string,
): void {
  const destination = resolve(projectedRoot, path);
  if (!existsSync(resolve(repoRoot, path))) {
    rmSync(destination, { force: true });
    return;
  }
  mkdirSync(resolve(destination, ".."), { recursive: true });
  writeFileSync(destination, readFileSync(resolve(repoRoot, path)));
}

/** Creates clean HEAD plus Coding-candidate bytes for one immutable run. */
export async function createV2EvidenceSourceProjection(
  repoRoot: string,
): Promise<V2EvidenceSourceProjection> {
  const projectedRoot = await mkdtemp(
    join(tmpdir(), "architecture-v2-source-"),
  );
  try {
    const sourcePaths = selectV2AnalyzerSourcePaths(repoRoot);
    const workspaceManifestPaths = listWorkspacePackageManifestPaths(repoRoot);
    const headPaths = listProjectionHeadPaths(repoRoot, sourcePaths);
    const archivePath = resolve(projectedRoot, ".head.tar");
    try {
      execFileSync(
        "git",
        [
          "archive",
          "--format=tar",
          "--output",
          archivePath,
          "HEAD",
          "--",
          ...headPaths,
        ],
        { cwd: repoRoot },
      );
      execFileSync("tar", ["-xf", archivePath, "-C", projectedRoot]);
    } finally {
      await rm(archivePath, { force: true });
    }
    for (const path of listCodingCandidatePaths(repoRoot)) {
      const source = resolve(repoRoot, path);
      const destination = resolve(projectedRoot, path);
      if (!existsSync(source)) {
        await rm(destination, { force: true });
        continue;
      }
      await mkdir(resolve(destination, ".."), { recursive: true });
      await writeFile(destination, await readFile(source));
    }
    return {
      sourceRoot: repoRoot,
      projectedRoot,
      sourcePaths,
      workspaceManifestPaths,
      dispose: async () => {
        await rm(projectedRoot, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await rm(projectedRoot, { recursive: true, force: true });
    throw error;
  }
}

/** Creates a synchronous clean HEAD plus Coding-candidate source projection. */
function createV2EvidenceSourceProjectionSync(
  repoRoot: string,
): SynchronousV2EvidenceSourceProjection {
  const projectedRoot = mkdtempSync(join(tmpdir(), "architecture-v2-source-"));
  try {
    const sourcePaths = selectV2AnalyzerSourcePaths(repoRoot);
    const workspaceManifestPaths = listWorkspacePackageManifestPaths(repoRoot);
    extractHeadProjectionSync(
      projectedRoot,
      repoRoot,
      listProjectionHeadPaths(repoRoot, sourcePaths),
    );
    for (const path of listCodingCandidatePaths(repoRoot)) {
      overlayCandidatePathSync(repoRoot, projectedRoot, path);
    }
    return {
      sourceRoot: repoRoot,
      projectedRoot,
      sourcePaths,
      workspaceManifestPaths,
      dispose: () => rmSync(projectedRoot, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(projectedRoot, { recursive: true, force: true });
    throw error;
  }
}

/** Compares two artifact references by complete exact record bytes. */
function artifactReferencesEqual(
  left: readonly ArtifactReference[],
  right: readonly ArtifactReference[],
): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

/** Returns the exact tenant-registry exception allowed only by v2. */
function tenantRegistryException(): Record<string, string | number> {
  return {
    schemaVersion: 1,
    id: V2_TENANT_REGISTRY_EXCEPTION_ID,
    ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
    sourcePath: "packages/domain/src/tenant-registry.ts",
    owner: "domain-platform",
    rationale:
      "Mandatory TenantDB classification only; no durable-job queries or mutation.",
  };
}

/** Validates v1 and v2 artifact bytes and the exact v2 policy differences. */
function validateArtifactFamilySync(
  repoRoot: string,
  manifest: Record<string, unknown>,
): void {
  const expectedV1 = V1_ARTIFACT_BINDINGS.map((artifact) => ({
    path: artifact.path,
    sha256: artifact.acceptedSha256,
  }));
  if (canonicalJson(manifest.v1Artifacts) !== canonicalJson(expectedV1)) {
    throw new Error("v1 artifact references do not match Gate 1");
  }
  const v2Artifacts = manifest.v2Artifacts;
  if (!Array.isArray(v2Artifacts) || v2Artifacts.length !== 3) {
    throw new Error("v2 artifact references are incomplete");
  }
  const references = v2Artifacts as Array<Record<string, unknown>>;
  if (
    references.some(
      (reference, index) =>
        Object.keys(reference).sort(compareStableStrings).join("\0") !==
          "path\0sha256" ||
        reference.path !== V2_ARTIFACT_PATHS[index] ||
        !isSha256(reference.sha256),
    )
  ) {
    throw new Error("v2 artifact references are not exact and ordered");
  }
  for (const reference of [...expectedV1, ...references]) {
    if (
      sha256Bytes(readExactSync(repoRoot, reference.path as string)) !==
      (reference.sha256 as string)
    ) {
      throw new Error(`Artifact bytes do not match: ${reference.path}`);
    }
  }

  const v1Config = architectureConfigSchema.parse(
    JSON.parse(
      Buffer.from(readExactSync(repoRoot, expectedV1[1]!.path)).toString(
        "utf8",
      ),
    ),
  );
  const v2Config = architectureConfigSchema.parse(
    JSON.parse(
      Buffer.from(readExactSync(repoRoot, V2_ARTIFACT_PATHS[0])).toString(
        "utf8",
      ),
    ),
  );
  const expectedV2Config = {
    ...v1Config,
    exactExceptions: [...v1Config.exactExceptions, tenantRegistryException()],
    baselineFiles: {
      database: V2_ARTIFACT_PATHS[1],
      provider: V2_ARTIFACT_PATHS[2],
    },
  };
  if (canonicalJson(v2Config) !== canonicalJson(expectedV2Config)) {
    throw new Error("v2 ownership map does not preserve the exact v1 policy");
  }

  for (const [domain, v1Index, v2Index] of [
    ["database", 2, 1],
    ["provider", 3, 2],
  ] as const) {
    const v1Baseline = architectureBaselineSchema.parse(
      JSON.parse(
        Buffer.from(
          readExactSync(repoRoot, expectedV1[v1Index]!.path),
        ).toString("utf8"),
      ),
    );
    const v2Baseline = architectureBaselineSchema.parse(
      JSON.parse(
        Buffer.from(
          readExactSync(repoRoot, V2_ARTIFACT_PATHS[v2Index]),
        ).toString("utf8"),
      ),
    );
    if (
      v2Baseline.domain !== domain ||
      v2Baseline.rulesetHash !== computeRulesetHash(v2Config, domain)
    ) {
      throw new Error(`${domain} v2 baseline ruleset hash is invalid`);
    }
    if (
      canonicalJson(v2Baseline.entries) !== canonicalJson(v1Baseline.entries)
    ) {
      throw new Error(`${domain} v2 baseline entries differ from v1`);
    }
  }
}

/** Validates review evidence and its exact file bytes. */
function validateReviewSync(
  repoRoot: string,
  manifest: Record<string, unknown>,
  review: Record<string, unknown>,
  index: number,
): void {
  const expectedKeys = [
    "role",
    "reviewer",
    "result",
    "reviewSubjectSha256",
    "evidencePath",
    "evidenceSha256",
    "v1ManifestSha256",
    "v2Artifacts",
  ].sort(compareStableStrings);
  if (
    Object.keys(review).sort(compareStableStrings).join("\0") !==
    expectedKeys.join("\0")
  ) {
    throw new Error("review record contains an unknown field");
  }
  if (
    review.role !== REVIEW_ROLES[index] ||
    typeof review.reviewer !== "string" ||
    !REVIEWER_ID_PATTERN.test(review.reviewer) ||
    review.result !== "accepted" ||
    review.reviewSubjectSha256 !== manifest.reviewSubjectSha256 ||
    review.evidencePath !== REVIEW_EVIDENCE_PATHS[index] ||
    review.v1ManifestSha256 !== V1_MANIFEST_SHA256 ||
    !isSha256(review.evidenceSha256) ||
    !Array.isArray(review.v2Artifacts) ||
    !artifactReferencesEqual(
      review.v2Artifacts as ArtifactReference[],
      manifest.v2Artifacts as ArtifactReference[],
    )
  ) {
    throw new Error("review binding is invalid");
  }
  const evidenceSource = Buffer.from(
    readExactSync(repoRoot, review.evidencePath as string),
  ).toString("utf8");
  if (sha256Text(evidenceSource) !== review.evidenceSha256) {
    throw new Error("review evidence bytes do not match the manifest");
  }
  const evidence = JSON.parse(evidenceSource) as Record<string, unknown>;
  const expectedEvidence = {
    role: review.role,
    reviewer: review.reviewer,
    result: review.result,
    reviewSubjectSha256: manifest.reviewSubjectSha256,
    v1ManifestSha256: V1_MANIFEST_SHA256,
    v2Artifacts: manifest.v2Artifacts,
    baselineAdditions: [],
    baselineRemovals: [],
    baselineRenames: [],
  };
  if (canonicalJson(evidence) !== canonicalJson(expectedEvidence)) {
    throw new Error("review evidence content is not bound");
  }
}

/** Validates the strict structural and byte contract synchronously. */
function validateManifestShapeSync(
  repoRoot: string,
  inputManifest: unknown,
): void {
  if (
    typeof inputManifest !== "object" ||
    inputManifest === null ||
    Array.isArray(inputManifest)
  ) {
    throw new Error("v2 manifest must be an object");
  }
  const manifest = inputManifest as Record<string, unknown>;
  if (
    Object.keys(manifest).join("\0") !== V2_MANIFEST_KEYS.join("\0") ||
    manifest.schemaVersion !== 2 ||
    manifest.reconciliationId !== "backend-architecture-analyzer-v2" ||
    manifest.v1ManifestSha256 !== V1_MANIFEST_SHA256
  ) {
    throw new Error("v2 manifest top-level contract is invalid");
  }
  for (const key of [
    "analyzerImplementationTreeSha256",
    "implementationAndTestTreeSha256",
    "analyzerInputSnapshotSha256",
    "reviewSubjectSha256",
  ]) {
    if (!isSha256(manifest[key])) {
      throw new Error(`Invalid manifest hash: ${key}`);
    }
  }
  if (
    !Array.isArray(manifest.reportSha256s) ||
    manifest.reportSha256s.length !== 2 ||
    !isSha256(manifest.reportSha256s[0]) ||
    manifest.reportSha256s[0] !== manifest.reportSha256s[1]
  ) {
    throw new Error("Analyzer reports must be byte-identical hashes");
  }
  for (const key of [
    "baselineAdditions",
    "baselineRemovals",
    "baselineRenames",
  ]) {
    if (!Array.isArray(manifest[key]) || manifest[key].length !== 0) {
      throw new Error("V2 baseline deltas must be empty");
    }
  }
  validateArtifactFamilySync(repoRoot, manifest);

  const {
    reviews: _reviews,
    acceptance: _acceptance,
    reviewSubjectSha256: _subject,
    ...protectedFields
  } = manifest;
  if (
    sha256Text(canonicalJson(protectedFields)) !== manifest.reviewSubjectSha256
  ) {
    throw new Error("Review subject does not match protected manifest fields");
  }

  const reviews = manifest.reviews;
  if (!Array.isArray(reviews) || reviews.length > REVIEW_ROLES.length) {
    throw new Error("Review records must be an ordered candidate prefix");
  }
  for (let index = 0; index < reviews.length; index += 1) {
    const review = reviews[index];
    if (
      typeof review !== "object" ||
      review === null ||
      Array.isArray(review)
    ) {
      throw new Error("Review records must be objects");
    }
    validateReviewSync(
      repoRoot,
      manifest,
      review as Record<string, unknown>,
      index,
    );
  }

  const acceptance = manifest.acceptance;
  if (
    typeof acceptance !== "object" ||
    acceptance === null ||
    Array.isArray(acceptance)
  ) {
    throw new Error("Manifest acceptance state is missing");
  }
  const acceptanceRecord = acceptance as Record<string, unknown>;
  const status = acceptanceRecord.status;
  const expectedAcceptanceKeys =
    status === "accepted"
      ? ["status", "defaultPolicy", "ownerBinding"]
      : ["status", "defaultPolicy"];
  if (
    Object.keys(acceptanceRecord).sort(compareStableStrings).join("\0") !==
      expectedAcceptanceKeys.sort(compareStableStrings).join("\0") ||
    (status !== "candidate" && status !== "accepted")
  ) {
    throw new Error("Manifest acceptance state is invalid");
  }
  if (
    status === "candidate" &&
    (acceptanceRecord.defaultPolicy !== "v1" ||
      Object.prototype.hasOwnProperty.call(acceptanceRecord, "ownerBinding"))
  ) {
    throw new Error("Candidate manifests must retain v1 and no owner binding");
  }
  if (
    status === "accepted" &&
    (acceptanceRecord.defaultPolicy !== "v2" ||
      reviews.length !== REVIEW_ROLES.length)
  ) {
    throw new Error("Accepted manifests require all reviews and v2 default");
  }
  if (status !== "accepted") return;

  const ownerBinding = acceptanceRecord.ownerBinding;
  if (
    typeof ownerBinding !== "object" ||
    ownerBinding === null ||
    Array.isArray(ownerBinding)
  ) {
    throw new Error("Accepted manifests require an owner binding");
  }
  const binding = ownerBinding as Record<string, unknown>;
  const expectedBindingKeys = [
    "ownerId",
    "ownerReceiptPath",
    "ownerReceiptSha256",
    "ownerReviewSubjectSha256",
  ].sort(compareStableStrings);
  if (
    Object.keys(binding).sort(compareStableStrings).join("\0") !==
      expectedBindingKeys.join("\0") ||
    typeof binding.ownerId !== "string" ||
    !REVIEWER_ID_PATTERN.test(binding.ownerId) ||
    binding.ownerReceiptPath !== OWNER_RECEIPT_PATH ||
    binding.ownerReviewSubjectSha256 !== manifest.reviewSubjectSha256 ||
    !isSha256(binding.ownerReceiptSha256)
  ) {
    throw new Error("Owner binding is invalid");
  }
  const receiptSource = Buffer.from(
    readExactSync(repoRoot, binding.ownerReceiptPath as string),
  ).toString("utf8");
  if (sha256Text(receiptSource) !== binding.ownerReceiptSha256) {
    throw new Error("Owner receipt bytes do not match the manifest");
  }
  const receipt = JSON.parse(receiptSource) as Record<string, unknown>;
  const expectedReceipt = {
    ownerId: binding.ownerId,
    reviewSubjectSha256: manifest.reviewSubjectSha256,
    v1ManifestSha256: V1_MANIFEST_SHA256,
    v2Artifacts: manifest.v2Artifacts,
    baselineAdditions: [],
    baselineRemovals: [],
    baselineRenames: [],
  };
  if (canonicalJson(receipt) !== canonicalJson(expectedReceipt)) {
    throw new Error("Owner receipt is not bound to the review subject");
  }
}

/** Requires the committed manifest file to use canonical pretty JSON bytes. */
function assertCanonicalManifestSourceSync(
  repoRoot: string,
  manifest: Record<string, unknown>,
): void {
  const manifestSource = readFileSync(
    resolve(repoRoot, V2_MANIFEST_PATH),
    "utf8",
  );
  if (`${JSON.stringify(manifest, null, 2)}\n` !== manifestSource) {
    throw new Error(
      "v2 manifest must use canonical pretty JSON with one trailing newline",
    );
  }
}

/** Selects tracked architecture sources plus every fixed v2 production TypeScript path. */
export function selectV2AnalyzerSourcePaths(
  repoRoot: string,
  trackedSourcePaths: readonly string[] = selectArchitectureSourceFiles(
    { repoRoot },
    repoRoot,
  ),
): string[] {
  return [
    ...new Set([...trackedSourcePaths, ...V2_PRODUCTION_TYPESCRIPT_PATHS]),
  ].sort(compareStableStrings);
}

/** Rejects an accepted v2 manifest when its architecture comparison has any debt delta.
 * @param comparison Current architecture comparison for the accepted v2 policy.
 * @returns Nothing when the comparison is clean.
 * @throws When additions, removals, or renames remain.
 */
export function assertAcceptedV2ComparisonIsClean(
  comparison: Pick<
    ArchitectureComparison,
    "additions" | "removals" | "renames"
  >,
): void {
  if (
    comparison.additions.length !== 0 ||
    comparison.removals.length !== 0 ||
    comparison.renames.length !== 0
  ) {
    throw new Error(
      "Accepted v2 manifests require a clean zero-delta architecture comparison",
    );
  }
}

/** Lists the exact tracked support files used by the analyzer input snapshot. */
function listAnalyzerInputPaths(
  repoRoot: string,
  sourcePaths: readonly string[],
): string[] {
  const stdout = execFileSync(
    "git",
    [
      "ls-files",
      "--",
      "package.json",
      "pnpm-workspace.yaml",
      ":(glob)tsconfig*.json",
      ":(glob)**/tsconfig*.json",
      ":(glob)packages/config/tsconfig/**/*.json",
      ":(glob)apps/*/package.json",
      ":(glob)integrations/*/package.json",
      ":(glob)packages/*/package.json",
      ":(glob)packages/integrations/*/package.json",
      ":(glob)services/*/package.json",
    ],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return [
    ...new Set([
      ...sourcePaths,
      ...ANALYZER_INPUT_SUPPORT_PATHS,
      ...listWorkspacePackageManifestPaths(repoRoot),
      ...stdout.split("\n").filter(Boolean),
    ]),
  ].sort(compareStableStrings);
}

/** Hashes the ordered analyzer input paths and exact file bytes.
 * @param repoRoot Repository root containing the analyzer inputs.
 * @param sourcePaths Canonical analyzer source paths used by the report.
 * @returns Lowercase SHA-256 digest of the canonical input snapshot.
 */
export async function computeAnalyzerInputSnapshotSha256(
  repoRoot: string,
  sourcePaths: readonly string[] = selectV2AnalyzerSourcePaths(repoRoot),
): Promise<string> {
  const projection = await createV2EvidenceSourceProjection(repoRoot);
  try {
    const files = await Promise.all(
      listAnalyzerInputPaths(repoRoot, sourcePaths).map(async (path) => ({
        path,
        sha256: sha256Bytes(
          await readFile(resolve(projection.projectedRoot, path)),
        ),
      })),
    );
    return sha256Text(canonicalJson(files));
  } finally {
    await projection.dispose();
  }
}

/** Hashes the ordered analyzer input paths and exact bytes synchronously.
 * @param repoRoot Repository root containing the analyzer inputs.
 * @param sourcePaths Canonical analyzer source paths used by the report.
 * @returns Lowercase SHA-256 digest of the canonical input snapshot.
 */
export function computeAnalyzerInputSnapshotSha256Sync(
  repoRoot: string,
  sourcePaths: readonly string[] = selectV2AnalyzerSourcePaths(repoRoot),
): string {
  const projection = createV2EvidenceSourceProjectionSync(repoRoot);
  try {
    const files = listAnalyzerInputPaths(repoRoot, sourcePaths).map((path) => ({
      path,
      sha256: sha256Bytes(
        readFileSync(resolve(projection.projectedRoot, path)),
      ),
    }));
    return sha256Text(canonicalJson(files));
  } finally {
    projection.dispose();
  }
}

/** Produces the deterministic current analyzer report bytes.
 * @param projection Immutable source projection used by the report.
 * @param sourcePaths Canonical analyzer source paths used by the report.
 * @returns Deterministic analyzer evidence for the canonical source set.
 */
async function computeCurrentAnalyzerReport(
  projection: V2EvidenceSourceProjection,
  sourcePaths: readonly string[] = projection.sourcePaths,
): Promise<ArchitectureAnalysisResult> {
  const repoRoot = projection.projectedRoot;
  const config = architectureConfigSchema.parse(
    JSON.parse(
      (await readFile(
        resolve(
          repoRoot,
          "packages/architecture-enforcement/src/config/ownership-map.v2.json",
        ),
        "utf8",
      )) as string,
    ),
  );
  return analyzeArchitectureSources({
    repoRoot,
    sourcePaths,
    workspaceTargets: await loadWorkspaceModuleTargets(
      repoRoot,
      projection.workspaceManifestPaths,
    ),
    trackedSourceOnly: true,
    config,
    policyVersion: "v2",
  });
}

/** Hashes two deterministic analyzer reports after confirming identical bytes.
 * @param repoRoot Repository root containing the analyzer inputs.
 * @param sourcePaths Canonical analyzer source paths used by the report.
 * @returns Lowercase SHA-256 digest of the serialized analyzer report.
 */
export async function computeAnalyzerReportSha256(
  repoRoot: string,
  sourcePaths?: readonly string[],
): Promise<string> {
  const projection = await createV2EvidenceSourceProjection(repoRoot);
  try {
    const selectedSourcePaths = sourcePaths ?? projection.sourcePaths;
    const [firstReport, secondReport] = await Promise.all([
      computeCurrentAnalyzerReport(projection, selectedSourcePaths),
      computeCurrentAnalyzerReport(projection, selectedSourcePaths),
    ]);
    const firstSource = JSON.stringify(firstReport);
    if (firstSource !== JSON.stringify(secondReport)) {
      throw new Error("Analyzer reports are not byte-identical");
    }
    return sha256Text(firstSource);
  } finally {
    await projection.dispose();
  }
}

/** Returns true when the repository contains the full production analyzer input set. */
function hasFullRepositoryInputSet(repoRoot: string): boolean {
  return (
    existsSync(resolve(repoRoot, "package.json")) &&
    existsSync(
      resolve(repoRoot, "packages/architecture-enforcement/src/analyzer.ts"),
    )
  );
}

/** Validates a committed v2 manifest and its structural byte bindings synchronously. */
export function validateAnalyzerReconciliationManifestV2Sync(
  input: ValidateAnalyzerReconciliationManifestV2Input,
): AnalyzerReconciliationManifestV2ValidationResult {
  try {
    validateManifestShapeSync(input.repoRoot, input.manifest);
    if (
      input.validateCurrentState !== false &&
      hasFullRepositoryInputSet(input.repoRoot)
    ) {
      const manifest = input.manifest as Record<string, unknown>;
      const sourcePaths = selectV2AnalyzerSourcePaths(input.repoRoot);
      if (
        manifest.analyzerImplementationTreeSha256 !==
        computeAnalyzerImplementationTreeSha256V2Sync(input.repoRoot)
      ) {
        throw new Error(
          "Analyzer implementation tree hash does not match current bytes",
        );
      }
      if (
        manifest.implementationAndTestTreeSha256 !==
        computeReconciliationImplementationTreeSha256V2Sync(input.repoRoot)
      ) {
        throw new Error(
          "Implementation and test tree hash does not match current bytes",
        );
      }
      if (
        manifest.analyzerInputSnapshotSha256 !==
        computeAnalyzerInputSnapshotSha256Sync(input.repoRoot, sourcePaths)
      ) {
        throw new Error(
          "Analyzer input snapshot hash does not match current bytes",
        );
      }
      assertCanonicalManifestSourceSync(input.repoRoot, manifest);
    } else if (
      input.validateCurrentState === false &&
      hasFullRepositoryInputSet(input.repoRoot)
    ) {
      assertCanonicalManifestSourceSync(
        input.repoRoot,
        input.manifest as Record<string, unknown>,
      );
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "invalid v2 manifest"],
    };
  }
}

/** Validates a v2 manifest, its artifact bytes, and current analyzer evidence. */
export async function validateAnalyzerReconciliationManifestV2(
  input: ValidateAnalyzerReconciliationManifestV2Input,
): Promise<AnalyzerReconciliationManifestV2ValidationResult> {
  const structural = validateAnalyzerReconciliationManifestV2Sync(input);
  if (
    !structural.valid ||
    input.validateCurrentState === false ||
    !hasFullRepositoryInputSet(input.repoRoot)
  ) {
    return structural;
  }
  try {
    const projection = await createV2EvidenceSourceProjection(input.repoRoot);
    try {
      const manifest = input.manifest as Record<string, unknown>;
      const sourcePaths = projection.sourcePaths;
      const [
        analyzerTree,
        implementationTree,
        inputSnapshot,
        reportOne,
        reportTwo,
      ] = await Promise.all([
        computeAnalyzerImplementationTreeSha256V2(input.repoRoot),
        computeReconciliationImplementationTreeSha256V2(input.repoRoot),
        computeAnalyzerInputSnapshotSha256(input.repoRoot, sourcePaths),
        computeCurrentAnalyzerReport(projection, sourcePaths),
        computeCurrentAnalyzerReport(projection, sourcePaths),
      ]);
      const reportOneSource = JSON.stringify(reportOne);
      const reportTwoSource = JSON.stringify(reportTwo);
      if (reportOneSource !== reportTwoSource) {
        throw new Error("Analyzer reports are not byte-identical");
      }
      const reportHash = sha256Text(reportOneSource);
      if (manifest.analyzerImplementationTreeSha256 !== analyzerTree) {
        throw new Error(
          "Analyzer implementation tree hash does not match current bytes",
        );
      }
      if (manifest.implementationAndTestTreeSha256 !== implementationTree) {
        throw new Error(
          "Implementation and test tree hash does not match current bytes",
        );
      }
      if (manifest.analyzerInputSnapshotSha256 !== inputSnapshot) {
        throw new Error(
          "Analyzer input snapshot hash does not match current bytes",
        );
      }
      if (
        !Array.isArray(manifest.reportSha256s) ||
        manifest.reportSha256s[0] !== reportHash ||
        manifest.reportSha256s[1] !== reportHash
      ) {
        throw new Error(
          "Analyzer report hashes do not match current byte-identical reports",
        );
      }
      const acceptance = (manifest.acceptance ?? {}) as Record<string, unknown>;
      if (acceptance.status === "accepted") {
        if (reportOne.parseErrors.length !== 0) {
          throw new Error(
            "Accepted v2 manifests require zero analyzer parse errors",
          );
        }
        const comparison = compareArchitectureDebt({
          baselines: {
            database: architectureBaselineSchema.parse(
              JSON.parse(
                await readFile(
                  resolve(
                    input.repoRoot,
                    "packages/architecture-enforcement/src/config/baselines/database.v2.json",
                  ),
                  "utf8",
                ),
              ),
            ),
            provider: architectureBaselineSchema.parse(
              JSON.parse(
                await readFile(
                  resolve(
                    input.repoRoot,
                    "packages/architecture-enforcement/src/config/baselines/provider.v2.json",
                  ),
                  "utf8",
                ),
              ),
            ),
          },
          findings: reportOne.findings,
        });
        assertAcceptedV2ComparisonIsClean(comparison);
      }
      return { valid: true };
    } finally {
      await projection.dispose();
    }
  } catch (error) {
    return {
      valid: false,
      errors: [
        error instanceof Error ? error.message : "invalid current v2 evidence",
      ],
    };
  }
}

import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const ARCHITECTURE_TEST_ROOT = "/tmp/opencode/architecture-v2-red";
const GATE_1_COMMIT = "4ff2caecf8d38622fa727bddb3e1c763f02a7451";

interface V1Artifact {
  readonly path: string;
  readonly acceptedSha256: string;
}

interface V2ReconciliationModule {
  readonly validateV1ArtifactFamily?: (
    input: V1ArtifactValidationInput,
  ) => Promise<V1ArtifactValidationResult> | V1ArtifactValidationResult;
  readonly applyArchitectureReconciliationForPolicy?: (
    input: V2WriteGuardInput,
  ) => Promise<V2WriteGuardResult> | V2WriteGuardResult;
}

interface V1ArtifactValidationInput {
  readonly repoRoot: string;
}

interface V1ArtifactValidationResult {
  readonly valid: boolean;
  readonly mismatches?: readonly {
    path: string;
    expectedSha256: string;
    actualSha256: string;
  }[];
}

interface V2WriteGuardInput {
  readonly policyVersion: "v2";
  readonly repoRoot: string;
  readonly destinationPaths: readonly string[];
  readonly dryRun: boolean;
}

interface V2WriteGuardResult {
  readonly allowed: boolean;
  readonly applied: boolean;
}

const V1_ARTIFACTS: readonly V1Artifact[] = [
  {
    path: "packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json",
    acceptedSha256:
      "4c95113cfff50d9e92f0770e1f18ef7d195dd50b5201f108e90990771ca46ec0",
  },
  {
    path: "packages/architecture-enforcement/src/config/ownership-map.v1.json",
    acceptedSha256:
      "f6d7b64d8d0091ef9d696d3bf0677f3b995ee78f41011ed56eea50399949f1e8",
  },
  {
    path: "packages/architecture-enforcement/src/config/baselines/database.v1.json",
    acceptedSha256:
      "8de5a20f36bd81fc492cd4e99676a439d4e2545dea927ed8389f186d08f4fe73",
  },
  {
    path: "packages/architecture-enforcement/src/config/baselines/provider.v1.json",
    acceptedSha256:
      "7137e81c662f25073e233144a585178fdd19ec324630f58cc5a807de42b4ace5",
  },
];
const V2_DESTINATION_PATHS = [
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json",
  "packages/architecture-enforcement/src/config/ownership-map.v2.json",
  "packages/architecture-enforcement/src/config/baselines/database.v2.json",
  "packages/architecture-enforcement/src/config/baselines/provider.v2.json",
] as const;

const temporaryRoots: string[] = [];

/** Hashes exact artifact bytes without parsing or normalizing JSON.
 * @param bytes Exact artifact bytes.
 * @returns Lowercase SHA-256 digest.
 */
function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Copies the complete v1 artifact family into one isolated temporary root.
 * @param changeOwnershipMap Whether to alter the ownership map bytes.
 * @returns Temporary artifact root.
 */
async function copyV1ArtifactFamily(
  changeOwnershipMap: boolean,
): Promise<string> {
  const baseDirectory = getArchitectureTestRoot();
  await mkdir(baseDirectory, { recursive: true });
  const root = await mkdtemp(resolve(baseDirectory, "architecture-v1-"));
  temporaryRoots.push(root);
  for (const artifact of V1_ARTIFACTS) {
    const destination = resolve(root, artifact.path);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(resolve(repositoryRoot, artifact.path), destination);
  }
  if (changeOwnershipMap) {
    const path = resolve(root, V1_ARTIFACTS[1]!.path);
    const changed = Buffer.from(await readFile(path));
    changed[changed.length - 1] = changed[changed.length - 1] === 10 ? 32 : 10;
    await writeFile(path, changed);
  }
  return root;
}

/** Copies the exact Gate 1 artifact family from Git into an isolated root.
 * @returns Temporary root containing the Gate 1 artifact bytes.
 */
async function copyGate1ArtifactFamily(): Promise<string> {
  const baseDirectory = getArchitectureTestRoot();
  await mkdir(baseDirectory, { recursive: true });
  const root = await mkdtemp(resolve(baseDirectory, "architecture-gate1-"));
  temporaryRoots.push(root);
  for (const artifact of V1_ARTIFACTS) {
    const destination = resolve(root, artifact.path);
    await mkdir(dirname(destination), { recursive: true });
    const bytes = execFileSync(
      "git",
      ["show", `${GATE_1_COMMIT}:${artifact.path}`],
      { cwd: repositoryRoot },
    );
    await writeFile(destination, bytes);
  }
  return root;
}

/** Returns the one approved temporary root for architecture tests.
 * @returns Approved architecture test root.
 */
function getArchitectureTestRoot(): string {
  const configuredRoot = process.env.ARCHITECTURE_TEST_TMPDIR;
  if (
    configuredRoot !== undefined &&
    configuredRoot !== ARCHITECTURE_TEST_ROOT
  ) {
    throw new Error(
      `ARCHITECTURE_TEST_TMPDIR must equal ${ARCHITECTURE_TEST_ROOT}`,
    );
  }
  return ARCHITECTURE_TEST_ROOT;
}

/** Hashes one copied artifact family by its exact relative paths.
 * @param root Temporary artifact root.
 * @returns Ordered artifact hashes.
 */
async function hashArtifactFamily(root: string): Promise<readonly string[]> {
  return Promise.all(
    V1_ARTIFACTS.map(async (artifact) =>
      sha256(await readFile(resolve(root, artifact.path))),
    ),
  );
}

/** Requires one destination set to fail without changing v1 artifact bytes.
 * @param apply Reconciliation write guard.
 * @param root Temporary artifact root.
 * @param destinationPaths Destination paths under test.
 * @param dryRun Whether the guard runs in dry-run mode.
 * @param before Artifact hashes before the rejected operation.
 * @returns Nothing after rejection and byte preservation are proven.
 */
async function expectRejectedDestinationSet(
  apply: NonNullable<
    V2ReconciliationModule["applyArchitectureReconciliationForPolicy"]
  >,
  root: string,
  destinationPaths: readonly string[],
  dryRun: boolean,
  before: readonly string[],
): Promise<void> {
  let rejected = false;
  try {
    const result = await apply({
      policyVersion: "v2",
      repoRoot: root,
      destinationPaths,
      dryRun,
    });
    rejected = result.allowed === false && result.applied === false;
  } catch {
    rejected = true;
  }
  expect(rejected).toBe(true);
  expect(await hashArtifactFamily(root)).toEqual(before);
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("architecture analyzer v1 immutability v2 (expected Red)", () => {
  it("exposes every clean-HEAD mismatch against the Gate 1 v1 lineage", async () => {
    const mismatches: Array<{
      path: string;
      acceptedSha256: string;
      actualSha256: string;
    }> = [];

    for (const artifact of V1_ARTIFACTS) {
      const actualSha256 = sha256(
        await readFile(resolve(repositoryRoot, artifact.path)),
      );
      if (actualSha256 !== artifact.acceptedSha256) {
        mismatches.push({
          path: artifact.path,
          acceptedSha256: artifact.acceptedSha256,
          actualSha256,
        });
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("validates the Gate 1 artifact family and rejects changed bytes", async () => {
    const gate1Root = await copyGate1ArtifactFamily();
    const root = await copyV1ArtifactFamily(true);
    const reconciliation =
      (await import("../index.js")) as V2ReconciliationModule;
    expect(reconciliation.validateV1ArtifactFamily).toBeTypeOf("function");
    if (typeof reconciliation.validateV1ArtifactFamily !== "function") return;

    const gate1Result = await reconciliation.validateV1ArtifactFamily({
      repoRoot: gate1Root,
    });
    expect(gate1Result).toEqual(expect.objectContaining({ valid: true }));

    const result = await reconciliation.validateV1ArtifactFamily({
      repoRoot: root,
    });
    expect(result.valid).toBe(false);
    expect(result.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: V1_ARTIFACTS[1]!.path,
          expectedSha256: V1_ARTIFACTS[1]!.acceptedSha256,
        }),
      ]),
    );
  });

  it("allows v2 dry-run and rejects v2-to-v1 destinations without changing bytes", async () => {
    const root = await copyV1ArtifactFamily(false);
    const before = await hashArtifactFamily(root);
    const reconciliation =
      (await import("../index.js")) as V2ReconciliationModule;
    expect(reconciliation.applyArchitectureReconciliationForPolicy).toBeTypeOf(
      "function",
    );
    if (
      typeof reconciliation.applyArchitectureReconciliationForPolicy !==
      "function"
    ) {
      return;
    }

    const allowedV2 =
      await reconciliation.applyArchitectureReconciliationForPolicy({
        policyVersion: "v2",
        repoRoot: root,
        destinationPaths: V2_DESTINATION_PATHS,
        dryRun: true,
      });
    expect(allowedV2.allowed).toBe(true);
    expect(allowedV2.applied).toBe(false);
    expect(await hashArtifactFamily(root)).toEqual(before);

    let rejectedV1 = false;
    try {
      const result =
        await reconciliation.applyArchitectureReconciliationForPolicy({
          policyVersion: "v2",
          repoRoot: root,
          destinationPaths: V1_ARTIFACTS.map((artifact) => artifact.path),
          dryRun: true,
        });
      rejectedV1 = result.allowed === false && result.applied === false;
    } catch {
      rejectedV1 = true;
    }
    expect(rejectedV1).toBe(true);
    expect(await hashArtifactFamily(root)).toEqual(before);

    let rejectedV1NonDryRun = false;
    try {
      const result =
        await reconciliation.applyArchitectureReconciliationForPolicy({
          policyVersion: "v2",
          repoRoot: root,
          destinationPaths: V1_ARTIFACTS.map((artifact) => artifact.path),
          dryRun: false,
        });
      rejectedV1NonDryRun =
        result.allowed === false && result.applied === false;
    } catch {
      rejectedV1NonDryRun = true;
    }
    expect(rejectedV1NonDryRun).toBe(true);
    expect(await hashArtifactFamily(root)).toEqual(before);

    const invalidDestinationSets: readonly (readonly string[])[] = [
      V2_DESTINATION_PATHS.slice(0, 3),
      [...V2_DESTINATION_PATHS, V2_DESTINATION_PATHS[0]!],
      [...V2_DESTINATION_PATHS].reverse(),
      [
        V2_DESTINATION_PATHS[0]!,
        V2_DESTINATION_PATHS[1]!,
        V1_ARTIFACTS[0]!.path,
      ],
      [...V2_DESTINATION_PATHS.slice(0, 3), "packages/unknown.json"],
      [
        "packages/architecture-enforcement/src/config/*.json",
        ...V2_DESTINATION_PATHS.slice(1),
      ],
      [
        "packages/architecture-enforcement/src/config/../secret.json",
        ...V2_DESTINATION_PATHS.slice(1),
      ],
      V1_ARTIFACTS.map((artifact) => artifact.path),
    ];
    for (const dryRun of [true, false]) {
      for (const destinationPaths of invalidDestinationSets) {
        await expectRejectedDestinationSet(
          reconciliation.applyArchitectureReconciliationForPolicy,
          root,
          destinationPaths,
          dryRun,
          before,
        );
      }
    }
  });
});

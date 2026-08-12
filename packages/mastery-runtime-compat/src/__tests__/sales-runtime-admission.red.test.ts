import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  lstat,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "../..");
const REPOSITORY_CACHE_ROOT = resolve(REPOSITORY_ROOT, ".cache");
const MANIFEST_PATH = resolve(PACKAGE_ROOT, "runtime-manifest.json");
const SALES_DESCRIPTOR_PATH = resolve(
  PACKAGE_ROOT,
  "fixtures/consumer/sales-advantage.json",
);
const SALES_PACKAGE_MANIFEST_PATH = resolve(
  REPOSITORY_ROOT,
  "packages/sales-knowledge/package.json",
);
const SALES_EVIDENCE_MANIFEST_PATH = resolve(
  REPOSITORY_ROOT,
  "packages/sales-knowledge/src/data/sales-release-evidence.json",
);
const CHECK_CONSUMER_SCRIPT = resolve(
  PACKAGE_ROOT,
  "fixtures/consumer/check-consumer.mjs",
);
const execute = promisify(execFile);

const CODECAMP_RELEASE_SET_ID = "mastery-runtime-0.1.0-kst-srs-3.2";
const CODECAMP_SYNTHETIC_GRAPH_RELEASE =
  "knowledge-space-synthetic-codecamp-proof-v1.0.0";
const SALES_GRAPH_RELEASE = "knowledge-space-sales-mastery-v1.0.0";
const SALES_GRAPH_DIGEST =
  "5f2b35f7178f0fed9ca103959d59d5e75c0f4818eac355c14a1be270776a9808";
const SALES_BINDINGS_DIGEST =
  "e8843314e2f381a44143acb08c6ff6596bdeac4e9da32fbdb9a5851c8ed32197";

const REVIEWED_RUNTIME_AXES = {
  normativeVersion: "kst-srs.v3.2",
  contracts: {
    practice: "practice.v1",
    srs: "srs.contract.v2",
    persistence: "mastery.persistence.v1",
  },
  persistence: {
    schema: "mastery.persistence.v1",
    migrationHead: "0028_mastery_tenant_hardening",
  },
  fixtures: {
    version: "mastery-fixtures.v3.2.0",
    sourceCommit: "34f9fb508c3e1751518aec335af3040c381d1d12",
  },
  source: {
    commit: "34f9fb508c3e1751518aec335af3040c381d1d12",
  },
} as const;

const ENGINE_PACKAGE_VERSIONS = {
  "@reading-advantage/knowledge-space-core": "0.1.0",
  "@reading-advantage/knowledge-space-practice": "0.1.0",
  "@reading-advantage/practice-core": "0.1.0",
  "@reading-advantage/srs-engine": "0.1.0",
} as const;

const ENGINE_PACKAGES = Object.keys(ENGINE_PACKAGE_VERSIONS);
const SALES_KNOWLEDGE_PACKAGE = "@reading-advantage/sales-knowledge";
const PACKED_PACKAGE_NAMES = [...ENGINE_PACKAGES, SALES_KNOWLEDGE_PACKAGE].sort();

const SALES_EVIDENCE_IDENTITY = {
  releaseCandidateByteSha256:
    "723198653a09417f92b597a3faefe919e3d83504f3320f9d962ac0ea1f8b2168",
  approvalByteSha256:
    "8b058a5b66631bbffe662a131eed5330bb0c12fa10134a096378e9a4c8bff404",
  staticSeedByteSha256:
    "0519b43a6c1a177bcbd7f06fe4d9cf86225afedd5af1f0b76e2aa04c4f3d13ec",
  graphCanonicalSha256: SALES_GRAPH_DIGEST,
  bindingsCanonicalSha256: SALES_BINDINGS_DIGEST,
} as const;

const SALES_KNOWLEDGE_IDENTITY = {
  package: {
    name: SALES_KNOWLEDGE_PACKAGE,
    version: "0.1.0",
  },
  verifierExport: "verifySalesReleaseEvidence",
  evidenceManifestExport: "salesReleaseEvidenceManifest",
  evidence: SALES_EVIDENCE_IDENTITY,
} as const;

interface RuntimePackageEntry {
  name: string;
  version: string;
  exports: string[];
}

interface RuntimeEvidenceBinding {
  graphCanonicalSha256: string;
  bindingsCanonicalSha256: string;
}

interface SalesEvidenceIdentity extends RuntimeEvidenceBinding {
  releaseCandidateByteSha256: string;
  approvalByteSha256: string;
  staticSeedByteSha256: string;
}

interface SalesKnowledgeIdentity {
  package: { name: string; version: string };
  verifierExport: string;
  evidenceManifestExport: string;
  evidence: SalesEvidenceIdentity;
}

interface RuntimeReleaseSet {
  id: string;
  normativeVersion: string;
  packages: RuntimePackageEntry[];
  graph: { release: string; schema: string };
  contracts: { practice: string; srs: string; persistence: string };
  persistence: { schema: string; migrationHead: string };
  fixtures: { version: string; sourceCommit: string };
  source: { commit: string };
  evidence?: RuntimeEvidenceBinding;
  salesKnowledge?: SalesKnowledgeIdentity;
  supportedConsumers: Array<{ name: string; range: string }>;
}

interface RuntimeManifest {
  releaseSets: RuntimeReleaseSet[];
}

interface SalesConsumerDescriptor {
  name: string;
  version: string;
  releaseSet: string;
  normativeVersion: string;
  packages: Record<string, string>;
  graph: { release: string; schema: string };
  contracts: { practice: string; srs: string; persistence: string };
  persistence: { schema: string; migrationHead: string };
  fixtures: { version: string; sourceCommit: string };
  source: { commit: string };
  imports: Array<{ package: string; export: string }>;
  evidence?: RuntimeEvidenceBinding;
  salesKnowledge?: SalesKnowledgeIdentity;
}

interface CompatibilityIssue {
  code: string;
  path: string;
  message: string;
}

interface CompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
}

interface GovernanceModule {
  parseRuntimeManifest(input: unknown): RuntimeManifest;
  evaluateConsumerCompatibility(
    manifest: RuntimeManifest,
    descriptor: unknown,
  ): CompatibilityResult;
}

interface ReleaseArtifactCheckOptions {
  temporaryRoot: string;
  consumerDescriptorPaths: string[];
}

interface ReleaseArtifactCheckResult {
  packages: string[];
  dryRun: true;
  exportsVerified: true;
  workspaceDependencies: string[];
  cleanConsumer: true;
  checkedConsumers: string[];
  verifiedSalesKnowledge: SalesKnowledgeIdentity;
}

interface ReleaseArtifactModule {
  runReleaseArtifactCheck: (
    options: ReleaseArtifactCheckOptions,
  ) => Promise<ReleaseArtifactCheckResult>;
}

/** Reads a JSON artifact while turning a missing checked-in contract into an actionable Red failure. */
async function readRequiredJson(path: string, label: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      `SALES_RUNTIME_ADMISSION_ARTIFACT_MISSING label=${label} path=${path} detail=${detail}`,
    );
  }
}

/** Loads the public compatibility gate without allowing a missing export to break test discovery. */
async function loadGovernanceModule(): Promise<GovernanceModule | null> {
  try {
    const moduleSpecifier = "../index.js";
    return (await import(moduleSpecifier)) as GovernanceModule;
  } catch {
    return null;
  }
}

/** Loads the packed-artifact gate without starting its side-effecting release workflow. */
async function loadReleaseArtifactModule(): Promise<ReleaseArtifactModule | null> {
  try {
    const moduleSpecifier = "../release-artifact.js";
    return (await import(moduleSpecifier)) as ReleaseArtifactModule;
  } catch {
    return null;
  }
}

/** Returns the Sales-specific runtime release set or a precise failure when it was never admitted. */
function salesReleaseSet(manifest: RuntimeManifest): RuntimeReleaseSet {
  const release = manifest.releaseSets.find(
    (candidate) => candidate.graph.release === SALES_GRAPH_RELEASE,
  );
  if (!release) {
    throw new Error(
      "SALES_RUNTIME_RELEASE_SET_MISSING expected a distinct release set bound to knowledge-space-sales-mastery-v1.0.0",
    );
  }
  return release;
}

/** Returns the stable diagnostic codes from an incompatible gate result. */
function issueCodes(result: CompatibilityResult): string[] {
  return result.issues.map((issue) => issue.code);
}

/** Expects one malformed Sales candidate to be rejected with a stable, actionable code. */
function expectRejected(
  result: CompatibilityResult,
  expectedCode: string,
): void {
  expect(result.compatible).toBe(false);
  expect(issueCodes(result)).toContain(expectedCode);
  for (const issue of result.issues) {
    expect(issue.path).not.toHaveLength(0);
    expect(issue.message).not.toHaveLength(0);
  }
}

/** Creates a unique absolute test root nested under the repository-local cache. */
function salesPackedArtifactRoot(label: string): string {
  const root = resolve(
    REPOSITORY_CACHE_ROOT,
    "mastery-runtime-compat/sales-packed-admission",
    `${label}-${randomUUID()}`,
  );
  expect(root.startsWith(`${REPOSITORY_CACHE_ROOT}${sep}`)).toBe(true);
  return root;
}

/** Reports whether a path exists without treating a missing test root as an error. */
async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw cause;
  }
}

/** Requires the packed gate and checked-in descriptor before invoking any release-side effects. */
async function loadPackedAdmission(): Promise<{
  module: ReleaseArtifactModule;
  descriptorPath: string;
}> {
  const [module, descriptor] = await Promise.all([
    loadReleaseArtifactModule(),
    readRequiredJson(SALES_DESCRIPTOR_PATH, "Sales consumer descriptor"),
  ]);
  expect(
    module,
    "SALES_PACKED_ADMISSION_GATE_MISSING expected src/release-artifact.ts to expose the reusable packed gate",
  ).not.toBeNull();
  expect(descriptor).toBeTruthy();
  if (!module) throw new Error("SALES_PACKED_ADMISSION_GATE_MISSING");
  return { module, descriptorPath: SALES_DESCRIPTOR_PATH };
}

/** Runs the packed release proof and checks its explicit Sales package evidence. */
async function runPackedAdmission(
  module: ReleaseArtifactModule,
  temporaryRoot: string,
  consumerDescriptorPaths: string[],
): Promise<ReleaseArtifactCheckResult> {
  const result = await module.runReleaseArtifactCheck({
    temporaryRoot,
    consumerDescriptorPaths,
  });
  expect(result.packages.slice().sort()).toEqual(PACKED_PACKAGE_NAMES);
  expect(result).toMatchObject({
    dryRun: true,
    exportsVerified: true,
    workspaceDependencies: [],
    cleanConsumer: true,
    checkedConsumers: ["sales-advantage"],
    verifiedSalesKnowledge: SALES_KNOWLEDGE_IDENTITY,
  });
  return result;
}

describe("Sales runtime admission (intended red)", () => {
  it("declares one Sales-only release set pinned to every reviewed runtime and evidence axis", async () => {
    const [api, rawManifest, rawSalesEvidence] = await Promise.all([
      loadGovernanceModule(),
      readRequiredJson(MANIFEST_PATH, "runtime manifest"),
      readRequiredJson(
        SALES_EVIDENCE_MANIFEST_PATH,
        "accepted Sales release evidence",
      ),
    ]);
    expect(
      api,
      "SALES_RUNTIME_GOVERNANCE_API_MISSING expected the reusable runtime compatibility entrypoint",
    ).not.toBeNull();
    if (!api) return;

    expect(rawSalesEvidence).toMatchObject({
      releaseId: SALES_GRAPH_RELEASE,
      artifacts: {
        graphCanonicalSha256: SALES_GRAPH_DIGEST,
        bindingsCanonicalSha256: SALES_BINDINGS_DIGEST,
      },
    });
    const manifest = api.parseRuntimeManifest(rawManifest);
    const salesReleases = manifest.releaseSets.filter(
      (candidate) => candidate.graph.release === SALES_GRAPH_RELEASE,
    );
    expect(salesReleases).toHaveLength(1);
    const release = salesReleaseSet(manifest);
    expect(release.id).not.toBe(CODECAMP_RELEASE_SET_ID);
    expect(release).toMatchObject({
      ...REVIEWED_RUNTIME_AXES,
      graph: { release: SALES_GRAPH_RELEASE, schema: "knowledge-space.v1" },
      evidence: {
        graphCanonicalSha256: SALES_GRAPH_DIGEST,
        bindingsCanonicalSha256: SALES_BINDINGS_DIGEST,
      },
      salesKnowledge: SALES_KNOWLEDGE_IDENTITY,
    });
    expect(
      Object.fromEntries(
        release.packages.map((entry) => [entry.name, entry.version]),
      ),
    ).toEqual(ENGINE_PACKAGE_VERSIONS);
    expect(release.supportedConsumers).toEqual([
      { name: "sales-advantage", range: ">=0.1.0 <0.2.0" },
    ]);
    expect(JSON.stringify(release)).not.toContain("codecamp");
  });

  it("checks in an exact Sales descriptor and immutable public Sales knowledge identity", async () => {
    const [api, rawManifest, rawDescriptor, rawPackageManifest, salesKnowledge] =
      await Promise.all([
        loadGovernanceModule(),
        readRequiredJson(MANIFEST_PATH, "runtime manifest"),
        readRequiredJson(SALES_DESCRIPTOR_PATH, "Sales consumer descriptor"),
        readRequiredJson(SALES_PACKAGE_MANIFEST_PATH, "Sales knowledge package"),
        import("../../../sales-knowledge/src/index.js"),
      ]);
    expect(api).not.toBeNull();
    if (!api) return;

    const release = salesReleaseSet(api.parseRuntimeManifest(rawManifest));
    const descriptor = rawDescriptor as SalesConsumerDescriptor;
    expect(descriptor).toEqual({
      name: "sales-advantage",
      version: "0.1.0",
      releaseSet: release.id,
      ...REVIEWED_RUNTIME_AXES,
      packages: ENGINE_PACKAGE_VERSIONS,
      graph: { release: SALES_GRAPH_RELEASE, schema: "knowledge-space.v1" },
      evidence: {
        graphCanonicalSha256: SALES_GRAPH_DIGEST,
        bindingsCanonicalSha256: SALES_BINDINGS_DIGEST,
      },
      salesKnowledge: SALES_KNOWLEDGE_IDENTITY,
      imports: ENGINE_PACKAGES.map((packageName) => ({
        package: packageName,
        export: ".",
      })),
    });
    expect(rawPackageManifest).toMatchObject({
      name: SALES_KNOWLEDGE_PACKAGE,
      version: "0.1.0",
      exports: { ".": expect.anything() },
    });
    expect(typeof salesKnowledge.verifySalesReleaseEvidence).toBe("function");
    expect(salesKnowledge.salesReleaseEvidenceManifest).toMatchObject({
      releaseId: SALES_GRAPH_RELEASE,
      artifacts: {
        graphCanonicalSha256: SALES_GRAPH_DIGEST,
        bindingsCanonicalSha256: SALES_BINDINGS_DIGEST,
      },
    });
    expect(descriptor.releaseSet).not.toBe(CODECAMP_RELEASE_SET_ID);
    expect(descriptor.graph.release).not.toBe(CODECAMP_SYNTHETIC_GRAPH_RELEASE);
  });

  it("fails closed for missing, tampered, or Codecamp-misassigned Sales release evidence", async () => {
    const [api, rawManifest, rawDescriptor] = await Promise.all([
      loadGovernanceModule(),
      readRequiredJson(MANIFEST_PATH, "runtime manifest"),
      readRequiredJson(SALES_DESCRIPTOR_PATH, "Sales consumer descriptor"),
    ]);
    expect(api).not.toBeNull();
    if (!api) return;

    const manifest = api.parseRuntimeManifest(rawManifest);
    const descriptor = rawDescriptor as SalesConsumerDescriptor;
    expect(api.evaluateConsumerCompatibility(manifest, descriptor)).toEqual({
      compatible: true,
      issues: [],
    });

    const missingReleaseEvidence = structuredClone(descriptor);
    delete missingReleaseEvidence.evidence;
    expectRejected(
      api.evaluateConsumerCompatibility(manifest, missingReleaseEvidence),
      "MISSING_RELEASE_EVIDENCE",
    );

    const missingKnowledgeIdentity = structuredClone(descriptor);
    delete missingKnowledgeIdentity.salesKnowledge;
    expectRejected(
      api.evaluateConsumerCompatibility(manifest, missingKnowledgeIdentity),
      "MISSING_SALES_KNOWLEDGE_IDENTITY",
    );

    const tamperedGraphDigest = structuredClone(descriptor);
    if (tamperedGraphDigest.evidence) {
      tamperedGraphDigest.evidence.graphCanonicalSha256 = "0".repeat(64);
    }
    expectRejected(
      api.evaluateConsumerCompatibility(manifest, tamperedGraphDigest),
      "GRAPH_EVIDENCE_DIGEST_MISMATCH",
    );

    const tamperedBindingsDigest = structuredClone(descriptor);
    if (tamperedBindingsDigest.evidence) {
      tamperedBindingsDigest.evidence.bindingsCanonicalSha256 = "f".repeat(64);
    }
    expectRejected(
      api.evaluateConsumerCompatibility(manifest, tamperedBindingsDigest),
      "BINDINGS_EVIDENCE_DIGEST_MISMATCH",
    );

    const tamperedStaticSeed = structuredClone(descriptor);
    if (tamperedStaticSeed.salesKnowledge) {
      tamperedStaticSeed.salesKnowledge.evidence.staticSeedByteSha256 = "f".repeat(
        64,
      );
    }
    expectRejected(
      api.evaluateConsumerCompatibility(manifest, tamperedStaticSeed),
      "SALES_KNOWLEDGE_EVIDENCE_MISMATCH",
    );

    const codecampGraph = structuredClone(descriptor);
    codecampGraph.graph.release = CODECAMP_SYNTHETIC_GRAPH_RELEASE;
    expectRejected(
      api.evaluateConsumerCompatibility(manifest, codecampGraph),
      "GRAPH_RELEASE_MISMATCH",
    );

    const codecampReleaseSet = structuredClone(descriptor);
    codecampReleaseSet.releaseSet = CODECAMP_RELEASE_SET_ID;
    expectRejected(
      api.evaluateConsumerCompatibility(manifest, codecampReleaseSet),
      "UNSUPPORTED_CONSUMER",
    );
  });
});

describe("Sales clean-consumer containment (intended red)", () => {
  it("rejects a descriptor source symlink before reading outside the consumer", async () => {
    const root = salesPackedArtifactRoot("descriptor-source-symlink");
    const consumerRoot = resolve(root, "consumer");
    const gatePath = resolve(consumerRoot, "gate.js");
    const outsideDescriptorPath = resolve(root, "outside-descriptor.json");
    const descriptorPath = resolve(consumerRoot, "descriptor.json");
    await mkdir(consumerRoot, { recursive: true });
    await writeFile(gatePath, "export {};\n", "utf8");
    await writeFile(outsideDescriptorPath, "{}\n", "utf8");
    await symlink(outsideDescriptorPath, descriptorPath);

    try {
      await expect(
        execute(process.execPath, [CHECK_CONSUMER_SCRIPT, gatePath, descriptorPath], {
          cwd: consumerRoot,
          encoding: "utf8",
        }),
      ).rejects.toThrow(/descriptor.*regular file|symlink/i);
      expect(await readFile(outsideDescriptorPath, "utf8")).toBe("{}\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects an in-consumer gate symlink before importing the gate", async () => {
    const root = salesPackedArtifactRoot("gate-symlink");
    const consumerRoot = resolve(root, "consumer");
    const outsideGatePath = resolve(root, "outside-gate.js");
    const gatePath = resolve(consumerRoot, "gate.js");
    const descriptorPath = resolve(consumerRoot, "descriptor.json");
    await mkdir(consumerRoot, { recursive: true });
    await writeFile(outsideGatePath, "export {};\n", "utf8");
    await writeFile(descriptorPath, "{}\n", "utf8");
    await symlink(outsideGatePath, gatePath);

    try {
      await expect(
        execute(process.execPath, [CHECK_CONSUMER_SCRIPT, gatePath, descriptorPath], {
          cwd: consumerRoot,
          encoding: "utf8",
        }),
      ).rejects.toThrow(/gate.*regular file|symlink/i);
      expect(await readFile(outsideGatePath, "utf8")).toBe("export {};\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a caller root symlink without writing through it", async () => {
    const { module, descriptorPath } = await loadPackedAdmission();
    const root = salesPackedArtifactRoot("caller-root-symlink");
    const outsideTarget = resolve(REPOSITORY_ROOT, "..");
    await symlink(outsideTarget, root);

    try {
      await expect(
        module.runReleaseArtifactCheck({
          temporaryRoot: root,
          consumerDescriptorPaths: [descriptorPath],
        }),
      ).rejects.toThrow(/temporaryRoot|cache|outside/i);
      expect((await lstat(root)).isSymbolicLink()).toBe(true);
    } finally {
      await rm(root, { force: true });
    }
  });
});

describe("Sales packed consumer admission (intended red)", () => {
  it("creates an absent repository-local root and removes its unique successful child", async () => {
    const { module, descriptorPath } = await loadPackedAdmission();
    const temporaryRoot = salesPackedArtifactRoot("create-root");
    expect(await pathExists(temporaryRoot)).toBe(false);

    try {
      await runPackedAdmission(module, temporaryRoot, [descriptorPath]);
      expect(await readdir(temporaryRoot)).toEqual([]);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 180_000);

  it("uses distinct successful children concurrently and preserves the caller root sentinel", async () => {
    const { module, descriptorPath } = await loadPackedAdmission();
    const temporaryRoot = salesPackedArtifactRoot("parallel-success");
    const sentinelPath = resolve(temporaryRoot, "caller-sentinel.txt");
    await mkdir(temporaryRoot, { recursive: true });
    await writeFile(sentinelPath, "do not remove\n", "utf8");

    try {
      await Promise.all([
        runPackedAdmission(module, temporaryRoot, [descriptorPath]),
        runPackedAdmission(module, temporaryRoot, [descriptorPath]),
      ]);
      expect(await readFile(sentinelPath, "utf8")).toBe("do not remove\n");
      expect(await readdir(temporaryRoot)).toEqual(["caller-sentinel.txt"]);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 180_000);

  it("cleans its failed child without removing caller-owned root files", async () => {
    const { module } = await loadPackedAdmission();
    const temporaryRoot = salesPackedArtifactRoot("failure-cleanup");
    const sentinelPath = resolve(temporaryRoot, "caller-sentinel.txt");
    const invalidDescriptorPath = resolve(temporaryRoot, "invalid-sales.json");
    await mkdir(temporaryRoot, { recursive: true });
    await writeFile(sentinelPath, "do not remove\n", "utf8");
    await writeFile(
      invalidDescriptorPath,
      `${JSON.stringify({ name: "sales-advantage" })}\n`,
      "utf8",
    );

    try {
      await expect(
        module.runReleaseArtifactCheck({
          temporaryRoot,
          consumerDescriptorPaths: [invalidDescriptorPath],
        }),
      ).rejects.toThrow();
      expect(await readFile(sentinelPath, "utf8")).toBe("do not remove\n");
      expect((await readdir(temporaryRoot)).sort()).toEqual([
        "caller-sentinel.txt",
        "invalid-sales.json",
      ]);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 180_000);

  it("rejects an outside-repository artifact root before writing to it", async () => {
    const { module, descriptorPath } = await loadPackedAdmission();
    const outsideRoot = resolve(
      REPOSITORY_ROOT,
      "..",
      `.sales-runtime-admission-outside-${randomUUID()}`,
    );
    expect(await pathExists(outsideRoot)).toBe(false);

    await expect(
      module.runReleaseArtifactCheck({
        temporaryRoot: outsideRoot,
        consumerDescriptorPaths: [descriptorPath],
      }),
    ).rejects.toThrow(/temporaryRoot|repository|cache/i);
    expect(await pathExists(outsideRoot)).toBe(false);
  });

  it("rejects an absent root inside the repository when it is outside .cache", async () => {
    const { module, descriptorPath } = await loadPackedAdmission();
    const outsideCacheRoot = resolve(
      REPOSITORY_ROOT,
      `.sales-runtime-admission-outside-cache-${randomUUID()}`,
    );
    expect(outsideCacheRoot.startsWith(`${REPOSITORY_ROOT}${sep}`)).toBe(true);
    expect(outsideCacheRoot.startsWith(`${REPOSITORY_CACHE_ROOT}${sep}`)).toBe(
      false,
    );
    expect(await pathExists(outsideCacheRoot)).toBe(false);

    await expect(
      module.runReleaseArtifactCheck({
        temporaryRoot: outsideCacheRoot,
        consumerDescriptorPaths: [descriptorPath],
      }),
    ).rejects.toThrow(/temporaryRoot|cache/i);
    expect(await pathExists(outsideCacheRoot)).toBe(false);
  });
});

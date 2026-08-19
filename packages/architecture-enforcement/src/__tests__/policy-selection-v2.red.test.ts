import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ArchitectureAnalysisResult } from "../analyzer.js";
import type { ArchitectureConfig } from "../contracts.js";
import { loadOwnershipMap } from "../ownership-map.js";
import { analyzerHardeningInputs } from "./fixtures/analyzer-hardening-inputs.js";

const temporaryRoots: string[] = [];
const ARCHITECTURE_TEST_ROOT = "/tmp/opencode/architecture-v2-red";
const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";

type Policy = "v1" | "v2";

interface ArchitecturePolicySelection {
  readonly policyVersion: Policy;
  readonly config: ArchitectureConfig;
  readonly status: "candidate" | "accepted";
  readonly defaultPolicy: Policy;
  readonly manifestSha256: string;
}

interface CommittedManifest {
  readonly acceptance?: {
    readonly status?: unknown;
    readonly defaultPolicy?: unknown;
  };
}

interface PolicyAwareAnalyzerOptions {
  readonly repoRoot: string;
  readonly sourcePaths: readonly string[];
  readonly workspaceTargets: ReadonlyMap<string, string>;
  readonly config: ArchitectureConfig;
  readonly policyVersion: Policy;
}

interface PolicySelectionModule {
  readonly selectArchitecturePolicy?: (
    policy?: Policy,
  ) => ArchitecturePolicySelection;
  readonly analyzeArchitectureSources: (
    options: PolicyAwareAnalyzerOptions,
  ) => Promise<ArchitectureAnalysisResult>;
}

/** Recursively freezes one embedded immutable oracle.
 * @param value Oracle value to freeze.
 * @returns The frozen value.
 */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

/** Reads and hashes the committed v2 manifest.
 * @returns Manifest data and exact byte hash.
 */
async function readCommittedManifest(): Promise<{
  readonly manifest: CommittedManifest;
  readonly manifestSha256: string;
}> {
  const source = await readFile(
    resolve(repositoryRoot, V2_MANIFEST_PATH),
    "utf8",
  );
  return {
    manifest: JSON.parse(source) as CommittedManifest,
    manifestSha256: createHash("sha256").update(source, "utf8").digest("hex"),
  };
}

/** Adds counts and exact serialized bytes to one Gate 1 analyzer result.
 * @param output Analyzer result data.
 * @returns Oracle data with counts and serialized bytes.
 */
function createOracle(output: {
  schemaVersion: 1;
  sourcePaths: readonly string[];
  findings: readonly Record<string, unknown>[];
  parseErrors: readonly Record<string, unknown>[];
}) {
  const result = {
    schemaVersion: output.schemaVersion,
    sourcePaths: [...output.sourcePaths],
    findings: [...output.findings],
    parseErrors: [...output.parseErrors],
  };
  return {
    result,
    findingCount: result.findings.length,
    diagnosticCount: result.parseErrors.length,
    serializedOutput: JSON.stringify(result),
  };
}

const GATE_1_V1_OUTPUT_ORACLE = deepFreeze({
  directOrigins: createOracle({
    schemaVersion: 1,
    sourcePaths: ["apps/example/src/direct.ts"],
    findings: [
      {
        schemaVersion: 1,
        ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
        domain: "database",
        sourcePath: "apps/example/src/direct.ts",
        line: 3,
        column: 3,
        evidenceKind: "static-import",
        importSpecifier: "@reading-advantage/db",
        resource: "database-table:review_jobs",
        resolvedTarget: "external:database-table",
        semanticKey:
          "a0430f6fab4d2ea5eb47dc7939fc42585c55d693d4e88d65f4678afa207e139c",
        instanceKey:
          "1914203c1dc46c41f9d07232bc83db184988f664900ffa2f6abc034dd0d93db3",
      },
      {
        schemaVersion: 1,
        ruleId: "DATABASE_BOUNDARY",
        domain: "database",
        sourcePath: "apps/example/src/direct.ts",
        line: 3,
        column: 3,
        evidenceKind: "static-import",
        importSpecifier: "@reading-advantage/db",
        resource: "database-table:review_jobs",
        resolvedTarget: "external:database-table",
        semanticKey:
          "8e1f9f2ea170bf0a510c05c555c4f3f9c6d180d8379216896ed7060bf8ea7e1f",
        instanceKey:
          "8d765003f0ed69f0b98a42eb956fad911fa3e919786b34a234677aec2900fd93",
      },
      {
        schemaVersion: 1,
        ruleId: "DATABASE_BOUNDARY",
        domain: "database",
        sourcePath: "apps/example/src/direct.ts",
        line: 3,
        column: 3,
        evidenceKind: "static-import",
        importSpecifier: "@reading-advantage/db",
        resolvedTarget: "external:@reading-advantage/db",
        semanticKey:
          "a28ea37cd252ff175301bbda3687c062be0db91bb572009fea360480734d9c25",
        instanceKey:
          "be139d87306a5cd402257289e64503d4196ae402da301bfcb7c4e98b77ed3f89",
      },
    ],
    parseErrors: [],
  }),
  durableAccess: createOracle({
    schemaVersion: 1,
    sourcePaths: [
      "packages/backend/src/jobs/adapters/postgres/raw-durable-query.ts",
      "packages/backend/src/jobs/client-construction-durable.ts",
      "packages/backend/src/jobs/commonjs-durable-query.ts",
      "packages/backend/src/jobs/durable-reexports.ts",
      "packages/backend/src/jobs/dynamic-durable-query.ts",
      "packages/backend/src/jobs/literal-concat-durable-query.ts",
      "packages/backend/src/jobs/literal-const-durable-query.ts",
      "packages/backend/src/jobs/namespace-durable-query.ts",
      "packages/backend/src/jobs/raw-durable-query.ts",
      "packages/backend/src/jobs/reexport-durable-query.ts",
      "packages/backend/src/jobs/shadowed-durable-query.ts",
      "packages/backend/src/jobs/sql-mention-durable-query.ts",
    ],
    findings: [
      {
        schemaVersion: 1,
        ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
        domain: "database",
        sourcePath: "packages/backend/src/jobs/reexport-durable-query.ts",
        line: 1,
        column: 1,
        evidenceKind: "static-import",
        importSpecifier: "./durable-reexports.js",
        resource: "database-table:durable_jobs",
        resolvedTarget: "external:database-table",
        semanticKey:
          "bfadf57dea5fc2e42bebd34a93b0b7df009766358cf7d780ed39381e0fe3dc81",
        instanceKey:
          "06a572515c9e6282a92519bcb6f83adf7a6e938b92d7f3dd1c60361111f126d5",
      },
      {
        schemaVersion: 1,
        ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
        domain: "database",
        sourcePath: "packages/backend/src/jobs/reexport-durable-query.ts",
        line: 5,
        column: 31,
        evidenceKind: "query-call",
        resource: "database-table:durable_jobs",
        resolvedTarget: "external:database-table",
        semanticKey:
          "9c1a4df2090bc96e0d7db303bf1ad2c9bf946ffe6c7508097db37cc98c09508e",
        instanceKey:
          "2595fb2bd5dbfd24984987993fde18f7194873d913edd45025dc37d14d6b5792",
      },
      {
        schemaVersion: 1,
        ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
        domain: "database",
        sourcePath: "packages/backend/src/jobs/durable-reexports.ts",
        line: 1,
        column: 1,
        evidenceKind: "re-export",
        importSpecifier: "@reading-advantage/db",
        resource: "database-table:durable_jobs",
        resolvedTarget: "external:database-table",
        semanticKey:
          "fd6bf12a1b8c0d2cfa1be95e93de7a951fed15292378072f39022a4b29f27a11",
        instanceKey:
          "7460db5f874385f5870cee1f8a1f98a9f70c630649a427aa5198a3aa40a6a10a",
      },
      {
        schemaVersion: 1,
        ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
        domain: "database",
        sourcePath: "packages/backend/src/jobs/shadowed-durable-query.ts",
        line: 1,
        column: 1,
        evidenceKind: "static-import",
        importSpecifier: "@reading-advantage/db",
        resource: "database-table:durable_jobs",
        resolvedTarget: "external:database-table",
        semanticKey:
          "bfadf57dea5fc2e42bebd34a93b0b7df009766358cf7d780ed39381e0fe3dc81",
        instanceKey:
          "a47417e061d09f65f7e10c68723692b1368b2467ed71a539ed7826357561bd68",
      },
      {
        schemaVersion: 1,
        ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
        domain: "database",
        sourcePath: "packages/backend/src/jobs/client-construction-durable.ts",
        line: 1,
        column: 1,
        evidenceKind: "static-import",
        importSpecifier: "@reading-advantage/db",
        resource: "database-table:durable_jobs",
        resolvedTarget: "external:database-table",
        semanticKey:
          "bfadf57dea5fc2e42bebd34a93b0b7df009766358cf7d780ed39381e0fe3dc81",
        instanceKey:
          "f661030b0116da5f50285acdda904713a6cca62ee6efffd1aca3882a3827a866",
      },
    ],
    parseErrors: [],
  }),
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

/** Creates an isolated source root for the shared hardening inputs.
 * @param fixture Hardening source fixture to materialize.
 * @returns Temporary root and source paths.
 */
async function createFixtureRoot(
  fixture:
    | typeof analyzerHardeningInputs.directOrigins
    | typeof analyzerHardeningInputs.durableAccess,
): Promise<{ root: string; sourcePaths: string[] }> {
  const baseDirectory = getArchitectureTestRoot();
  await mkdir(baseDirectory, { recursive: true });
  const root = await mkdtemp(resolve(baseDirectory, "architecture-policy-v2-"));
  temporaryRoots.push(root);
  const sources =
    "sources" in fixture
      ? fixture.sources
      : { [fixture.sourcePath]: fixture.source };
  for (const [sourcePath, source] of Object.entries(sources)) {
    await mkdir(resolve(root, dirname(sourcePath)), { recursive: true });
    await writeFile(resolve(root, sourcePath), source, "utf8");
  }
  return { root, sourcePaths: Object.keys(sources) };
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

/** Adds the existing direct-origin resource matcher used by hardening tests.
 * @param base Base architecture configuration.
 * @returns Configuration with the direct-origin matcher.
 */
function applyDirectOriginMatcher(
  base: ArchitectureConfig,
): ArchitectureConfig {
  return {
    ...base,
    rules: base.rules.map((rule) =>
      rule.id === "DATABASE_BOUNDARY"
        ? {
            ...rule,
            resourceMatchers: [
              ...rule.resourceMatchers,
              { kind: "exact" as const, value: "database-table:review_jobs" },
            ],
          }
        : rule,
    ),
  };
}

/** Returns a Red fallback selection until the public selector exists.
 * @param policy Explicit policy, when supplied.
 * @returns Fallback policy selection.
 */
function fallbackPolicySelection(policy?: Policy): ArchitecturePolicySelection {
  const policyVersion = policy ?? "v1";
  return {
    policyVersion,
    config: loadOwnershipMap(),
    status: "candidate",
    defaultPolicy: "v1",
    manifestSha256: "0".repeat(64),
  };
}

/** Selects one policy through the future public selector or the Red fallback.
 * @param policy Explicit policy to select.
 * @returns Selected policy state.
 */
async function selectPolicy(
  policy: Policy,
): Promise<ArchitecturePolicySelection> {
  const analyzer = (await import("../index.js")) as PolicySelectionModule;
  return typeof analyzer.selectArchitecturePolicy === "function"
    ? analyzer.selectArchitecturePolicy(policy)
    : fallbackPolicySelection(policy);
}

/** Runs the current public analyzer shape for one named policy probe.
 * @param policy Explicit policy under test.
 * @param fixture Hardening source fixture to analyze.
 * @returns Analyzer result for the fixture.
 */
async function runPolicyProbe(
  policy: Policy,
  fixture:
    | typeof analyzerHardeningInputs.directOrigins
    | typeof analyzerHardeningInputs.durableAccess,
): Promise<ArchitectureAnalysisResult> {
  const { root, sourcePaths } = await createFixtureRoot(fixture);
  const selection = await selectPolicy(policy);
  const analyzer = (await import("../index.js")) as PolicySelectionModule;
  return analyzer.analyzeArchitectureSources({
    repoRoot: root,
    sourcePaths,
    workspaceTargets: new Map(),
    config: applyDirectOriginMatcher(selection.config),
    policyVersion: policy,
  });
}

describe("architecture analyzer policy selection v2 (expected Red)", () => {
  it("preserves the Gate 1 v1 findings, diagnostics, ordering, counts, and bytes", async () => {
    const probes = [
      await runPolicyProbe("v1", analyzerHardeningInputs.directOrigins),
      await runPolicyProbe("v1", analyzerHardeningInputs.durableAccess),
    ];
    const oracles = [
      GATE_1_V1_OUTPUT_ORACLE.directOrigins,
      GATE_1_V1_OUTPUT_ORACLE.durableAccess,
    ];

    for (const [result, oracle] of probes.map(
      (result, index) => [result, oracles[index]] as const,
    )) {
      expect(result.findings).toEqual(oracle.result.findings);
      expect(result.parseErrors).toEqual(oracle.result.parseErrors);
      expect(result.sourcePaths).toEqual(oracle.result.sourcePaths);
      expect(result.findings).toHaveLength(oracle.findingCount);
      expect(result.parseErrors).toHaveLength(oracle.diagnosticCount);
      expect(JSON.stringify(result)).toBe(oracle.serializedOutput);
    }
  });

  it("detects hardened analyzer cases under explicit v2 selection", async () => {
    const direct = await runPolicyProbe(
      "v2",
      analyzerHardeningInputs.directOrigins,
    );
    const durable = await runPolicyProbe(
      "v2",
      analyzerHardeningInputs.durableAccess,
    );

    expect(direct.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceKind: "static-import",
          resolvedTarget: "external:@reading-advantage/db",
        }),
      ]),
    );
    expect(direct.findings.filter((finding) => finding.resource)).toEqual([]);
    const provenanceFreePaths = new Set<string>([
      analyzerHardeningInputs.durableAccess.sourcePaths.namespace,
      analyzerHardeningInputs.durableAccess.sourcePaths.dynamic,
      analyzerHardeningInputs.durableAccess.sourcePaths.commonjs,
      analyzerHardeningInputs.durableAccess.sourcePaths.reexport,
      analyzerHardeningInputs.durableAccess.sourcePaths.clientConstruction,
      analyzerHardeningInputs.durableAccess.sourcePaths.shadowed,
    ]);
    expect(
      durable.findings.filter(
        (finding) =>
          finding.resource && provenanceFreePaths.has(finding.sourcePath),
      ),
    ).toEqual([]);
  });

  it("accepts explicit v1/v2 and restricts no-policy default states", async () => {
    const analyzer = (await import("../index.js")) as PolicySelectionModule;
    expect(analyzer.selectArchitecturePolicy).toBeTypeOf("function");
    if (typeof analyzer.selectArchitecturePolicy !== "function") return;
    const selectArchitecturePolicy = analyzer.selectArchitecturePolicy;

    for (const policy of ["v1", "v2"] as const) {
      const explicitSelection = selectArchitecturePolicy(policy);
      expect(explicitSelection.policyVersion).toBe(policy);
      expect(explicitSelection.config).toEqual(
        expect.objectContaining({
          schemaVersion: 1,
          rules: expect.any(Array),
          ownershipRoots: expect.any(Array),
        }),
      );
    }

    const committed = await readCommittedManifest();
    const defaultSelection = selectArchitecturePolicy();
    const acceptance = committed.manifest.acceptance;
    expect(["candidate", "accepted"]).toContain(acceptance?.status);
    expect(["v1", "v2"]).toContain(acceptance?.defaultPolicy);
    const expectedDefaultPolicy =
      acceptance?.status === "accepted" ? "v2" : "v1";
    expect(acceptance?.defaultPolicy).toBe(expectedDefaultPolicy);
    expect([
      {
        policyVersion: expectedDefaultPolicy,
        status: acceptance?.status,
        defaultPolicy: acceptance?.defaultPolicy,
        manifestSha256: committed.manifestSha256,
      },
    ]).toContainEqual({
      policyVersion: defaultSelection.policyVersion,
      status: defaultSelection.status,
      defaultPolicy: defaultSelection.defaultPolicy,
      manifestSha256: defaultSelection.manifestSha256,
    });
    expect(defaultSelection.config).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        rules: expect.any(Array),
        ownershipRoots: expect.any(Array),
      }),
    );

    for (const policy of ["v1", "v2"] as const) {
      const explicitSelection = selectArchitecturePolicy(policy);
      expect(explicitSelection.status).toBe(defaultSelection.status);
      expect(explicitSelection.defaultPolicy).toBe(
        defaultSelection.defaultPolicy,
      );
      expect(explicitSelection.manifestSha256).toBe(
        defaultSelection.manifestSha256,
      );
    }

    for (const invalidPolicy of ["candidate", "accepted"] as const) {
      expect(() => selectArchitecturePolicy(invalidPolicy as never)).toThrow();
    }
  });
});

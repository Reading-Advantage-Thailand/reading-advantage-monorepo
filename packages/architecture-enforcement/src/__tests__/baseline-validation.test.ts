import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeRulesetHash,
  createArchitectureBaseline,
  serializeArchitectureBaseline,
} from "../baseline.js";
import {
  validateCommittedBaselines,
  type BaselineValidationDependencies,
} from "../baseline-validation.js";
import type { DirectViolationCandidate } from "../inventory.js";
import { loadOwnershipMap } from "../ownership-map.js";
import {
  RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
  RECONCILIATION_DIRECT_REVIEW_PATH,
  RECONCILIATION_MANIFEST_PATH,
  RECONCILIATION_REVIEW_EVIDENCE_PATHS,
  type AnalyzerReconciliationManifest,
} from "../reconciliation-manifest.js";
import {
  assertAcceptedV2ComparisonIsClean,
  computeAnalyzerInputSnapshotSha256,
  computeAnalyzerReportSha256,
  createV2EvidenceSourceProjection,
  selectV2AnalyzerSourcePaths,
  V2_PRODUCTION_TYPESCRIPT_PATHS,
  validateAnalyzerReconciliationManifestV2Sync,
} from "../v2-manifest-validation.js";
import {
  applyArchitectureReconciliationForPolicy,
  V2_RECONCILIATION_DESTINATION_PATHS,
} from "../policy-write-guard.js";

const temporaryRoots: string[] = [];
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const V1_ARTIFACT_PATHS = [
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json",
  "packages/architecture-enforcement/src/config/ownership-map.v1.json",
  "packages/architecture-enforcement/src/config/baselines/database.v1.json",
  "packages/architecture-enforcement/src/config/baselines/provider.v1.json",
] as const;
const V2_ARTIFACT_PATHS = [
  "packages/architecture-enforcement/src/config/ownership-map.v2.json",
  "packages/architecture-enforcement/src/config/baselines/database.v2.json",
  "packages/architecture-enforcement/src/config/baselines/provider.v2.json",
] as const;
const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";

/** Serializes JSON data with stable object-key ordering for manifest subjects. */
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

/** Recomputes the review subject after changing one protected manifest hash. */
function withProtectedManifestHash(
  manifest: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const changed = { ...manifest, [key]: "1".repeat(64) };
  const {
    reviews: _reviews,
    acceptance: _acceptance,
    reviewSubjectSha256: _reviewSubjectSha256,
    ...protectedFields
  } = changed;
  return {
    ...changed,
    reviewSubjectSha256: createHash("sha256")
      .update(canonicalJson(protectedFields), "utf8")
      .digest("hex"),
  };
}

/**
 * Creates an isolated tracked-source repository for baseline gate tests.
 * @param sourcePath Repository-relative TypeScript source path.
 * @param source TypeScript source body written to the tracked path.
 * @returns Absolute temporary git repository root.
 */
async function createTemporaryRepository(
  sourcePath: string,
  source: string,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "architecture-baseline-"));
  temporaryRoots.push(root);
  await mkdir(dirname(resolve(root, sourcePath)), { recursive: true });
  await writeFile(resolve(root, sourcePath), source, "utf8");
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "--", sourcePath], { cwd: root });
  return root;
}

/** Creates the smallest Git repository accepted by the production v2 evidence functions. */
async function createMinimalV2EvidenceRepository(): Promise<{
  root: string;
  codingPath: string;
  unrelatedPath: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "architecture-v2-evidence-"));
  temporaryRoots.push(root);
  const codingPath =
    "packages/architecture-enforcement/src/policy-selection.ts";
  const unrelatedPath = "apps/unrelated/src/input.ts";
  const paths = [
    "package.json",
    "pnpm-workspace.yaml",
    "packages/fixture/package.json",
    unrelatedPath,
    V2_MANIFEST_PATH,
    ...V1_ARTIFACT_PATHS,
    ...V2_ARTIFACT_PATHS,
    ...V2_PRODUCTION_TYPESCRIPT_PATHS,
  ];
  for (const path of new Set(paths)) {
    const destination = resolve(root, path);
    await mkdir(dirname(destination), { recursive: true });
    const source =
      path === V2_ARTIFACT_PATHS[0]
        ? await readFile(resolve(repositoryRoot, path), "utf8")
        : path === "packages/fixture/package.json"
          ? '{"name":"fixture"}\n'
          : path === codingPath
            ? "export const fixture = true;\n"
            : path === unrelatedPath
              ? "export const unrelated = true;\n"
              : `${path}\n`;
    await writeFile(destination, source, "utf8");
  }
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync(
    "git",
    [
      "-c",
      "user.email=architecture@example.com",
      "-c",
      "user.name=Architecture Tests",
      "commit",
      "--quiet",
      "-m",
      "baseline",
    ],
    { cwd: root },
  );
  return { root, codingPath, unrelatedPath };
}

/**
 * Writes strict database and provider baselines into a temporary repository.
 * @param root Absolute temporary repository root.
 * @param databaseCandidates Reviewed database candidates expected from inventory.
 * @returns Nothing after both configured baseline files are written.
 */
async function writeBaselines(
  root: string,
  databaseCandidates: readonly DirectViolationCandidate[],
): Promise<void> {
  const config = loadOwnershipMap();
  for (const [domain, candidates] of [
    ["database", databaseCandidates],
    ["provider", []],
  ] as const) {
    const path = config.baselineFiles[domain];
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(
      resolve(root, path),
      serializeArchitectureBaseline(
        createArchitectureBaseline(candidates, config, domain),
      ),
      "utf8",
    );
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("committed architecture baseline validation", () => {
  it("wires tracked inventory through both expected domain baseline files", async () => {
    const sourcePath = "apps/gate/src/database.ts";
    const root = await createTemporaryRepository(
      sourcePath,
      'import postgres from "postgres";\nvoid postgres;\n',
    );
    await writeBaselines(root, [
      {
        schemaVersion: 1 as const,
        ruleId: "DATABASE_BOUNDARY",
        domain: "database",
        sourcePath,
        line: 1,
        column: 1,
        evidenceKind: "static-import",
        importSpecifier: "postgres",
        owner: "gate-platform",
        rationale:
          "Reviewed direct database match selected by DATABASE_BOUNDARY; migrate it into an approved ownership root.",
        proposedDisposition: "baseline-review",
      },
    ]);

    await expect(validateCommittedBaselines(root)).resolves.toMatchObject({
      schemaVersion: 1,
      mode: "historical-direct",
      filesScanned: 1,
      databaseEntries: 1,
      providerEntries: 0,
    });

    const config = loadOwnershipMap();
    const provider = await readFile(
      resolve(root, config.baselineFiles.provider),
      "utf8",
    );
    await writeFile(
      resolve(root, config.baselineFiles.database),
      provider,
      "utf8",
    );
    await expect(validateCommittedBaselines(root)).rejects.toThrow(
      /expected database baseline/i,
    );
  }, 30_000);

  it("fails closed before baseline reads when tracked source cannot parse", async () => {
    const root = await createTemporaryRepository(
      "apps/gate/src/broken.ts",
      "import {",
    );

    await expect(validateCommittedBaselines(root)).rejects.toThrow(
      /parse errors/i,
    );
  }, 30_000);

  it("fails closed when an exact test exception has not been reviewed", async () => {
    const root = await createTemporaryRepository(
      "apps/gate/src/database.test.ts",
      'import postgres from "postgres";\nvoid postgres;\n',
    );

    await expect(validateCommittedBaselines(root)).rejects.toThrow(
      /exact test or fixture exceptions remain unreviewed/i,
    );
  }, 30_000);

  it("makes the executable CLI return non-zero when baseline files are missing", async () => {
    const root = await createTemporaryRepository(
      "apps/gate/src/clean.ts",
      "export const clean = true;\n",
    );
    const result = spawnSync(
      resolve(repositoryRoot, "node_modules/.bin/tsx"),
      [resolve(packageRoot, "src/baseline-cli.ts"), "--repo-root", root],
      { cwd: packageRoot, encoding: "utf8", timeout: 30_000 },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/architecture baseline validation failed/i);
  }, 30_000);

  it("validates analyzer-complete provenance and fails closed on live checker drift", async () => {
    const root = await createTemporaryRepository(
      "apps/gate/src/clean.ts",
      "export const clean = true;\n",
    );
    await writeBaselines(root, [
      {
        schemaVersion: 1 as const,
        ruleId: "DATABASE_BOUNDARY",
        domain: "database",
        sourcePath: "apps/gate/src/legacy-database.ts",
        line: 1,
        column: 1,
        evidenceKind: "static-import",
        importSpecifier: "postgres",
        owner: "gate-platform",
        rationale: "Reviewed legacy database access pending adapter migration.",
        proposedDisposition: "baseline-review",
      },
    ]);
    const config = loadOwnershipMap();
    const databaseBaseline = JSON.parse(
      await readFile(resolve(root, config.baselineFiles.database), "utf8"),
    ) as { entries: Array<{ instanceKey: string }> };
    const files = new Map<string, string>([
      [
        "packages/architecture-enforcement/src/config/ownership-map.v1.json",
        `${JSON.stringify(config, null, 2)}\n`,
      ],
      [RECONCILIATION_MANIFEST_PATH, "manifest fixture\n"],
      [RECONCILIATION_DIRECT_REVIEW_PATH, "direct review fixture\n"],
      [RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH, "diff audit fixture\n"],
      ...Object.values(RECONCILIATION_REVIEW_EVIDENCE_PATHS).map(
        (path) => [path, "review evidence fixture\n"] as const,
      ),
    ]);
    await Promise.all(
      [...files].map(async ([path, contents]) => {
        const destination = resolve(root, path);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, contents, "utf8");
      }),
    );
    const manifest = {
      historical: {
        baselineProofs: [
          { instanceKey: databaseBaseline.entries[0]!.instanceKey },
        ],
        rulesetHashes: {
          database: computeRulesetHash(config, "database"),
          provider: computeRulesetHash(config, "provider"),
        },
        directReviewPath: RECONCILIATION_DIRECT_REVIEW_PATH,
      },
    } as unknown as AnalyzerReconciliationManifest;
    const checkRepository = vi.fn(async () => ({
      schemaVersion: 1 as const,
      status: "clean" as const,
      filesScanned: 1,
      findings: [],
      parseErrors: [],
      comparison: {
        schemaVersion: 1 as const,
        status: "clean" as const,
        additions: [],
        removals: [],
        renames: [],
      },
    }));
    const dependencies: Partial<BaselineValidationDependencies> = {
      checkRepository,
      computeAnalyzerTree: async () => "a".repeat(64),
      computeReconciliationTree: async () => "b".repeat(64),
      parseManifest: () => manifest,
      validateReconciliation: vi.fn(() => ({
        schemaVersion: 1 as const,
        manifestSha256: "c".repeat(64),
        sourceBaseSha: "source-base",
        analyzerCommitSha: "analyzer-commit",
        databaseEntries: 1,
        providerEntries: 0,
        productionAdditions: 0,
        exactExceptionAdditions: 0,
        coveredTestFindings: 0,
      })),
    };

    await expect(
      validateCommittedBaselines(root, dependencies),
    ).resolves.toMatchObject({
      schemaVersion: 1,
      mode: "analyzer-complete",
      filesScanned: 1,
      databaseEntries: 1,
      providerEntries: 0,
      reconciliationManifestHash: "c".repeat(64),
    });
    expect(checkRepository).toHaveBeenCalledWith(root, config);

    const withoutParser = { ...dependencies };
    delete withoutParser.parseManifest;
    await expect(
      validateCommittedBaselines(root, withoutParser),
    ).rejects.toThrow();

    const withoutChecker = { ...dependencies };
    delete withoutChecker.checkRepository;
    await expect(
      validateCommittedBaselines(root, withoutChecker),
    ).rejects.toThrow(/checker is not clean/i);

    dependencies.checkRepository = async () => ({
      schemaVersion: 1,
      status: "debt-change",
      filesScanned: 1,
      findings: [],
      parseErrors: [],
      comparison: {
        schemaVersion: 1,
        status: "new-debt",
        additions: [],
        removals: [],
        renames: [],
      },
    });
    await expect(
      validateCommittedBaselines(root, dependencies),
    ).rejects.toThrow(/checker is not clean/i);
  }, 30_000);

  it("binds analyzer reports and input snapshots to fixed v2 sources before tracking", async () => {
    const complete = selectV2AnalyzerSourcePaths(repositoryRoot);
    const trackedBeforeCommit = complete.filter(
      (path) => !V2_PRODUCTION_TYPESCRIPT_PATHS.includes(path as never),
    );
    const beforeTracking = selectV2AnalyzerSourcePaths(
      repositoryRoot,
      trackedBeforeCommit,
    );
    const afterTracking = selectV2AnalyzerSourcePaths(repositoryRoot, [
      ...trackedBeforeCommit,
      ...V2_PRODUCTION_TYPESCRIPT_PATHS,
    ]);

    expect(beforeTracking).toEqual(afterTracking);
    expect(beforeTracking).toEqual(
      expect.arrayContaining([...V2_PRODUCTION_TYPESCRIPT_PATHS]),
    );
  }, 30_000);

  it("projects clean HEAD plus Coding bytes without unrelated dirty inputs", async () => {
    const root = await mkdtemp(join(tmpdir(), "architecture-v2-projection-"));
    temporaryRoots.push(root);
    const unrelatedPath = "apps/unrelated/src/dirty.ts";
    const codingPath = "packages/architecture-enforcement/src/analyzer.ts";
    await mkdir(dirname(resolve(root, unrelatedPath)), { recursive: true });
    await mkdir(dirname(resolve(root, codingPath)), { recursive: true });
    await writeFile(resolve(root, unrelatedPath), "HEAD unrelated\n", "utf8");
    await writeFile(resolve(root, codingPath), "HEAD Coding\n", "utf8");
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    execFileSync("git", ["add", "--", unrelatedPath, codingPath], {
      cwd: root,
    });
    execFileSync(
      "git",
      [
        "-c",
        "user.email=architecture@example.com",
        "-c",
        "user.name=Architecture Tests",
        "commit",
        "--quiet",
        "-m",
        "baseline",
      ],
      { cwd: root },
    );
    await writeFile(resolve(root, unrelatedPath), "dirty unrelated\n", "utf8");
    await writeFile(resolve(root, codingPath), "Coding candidate\n", "utf8");

    const projection = await createV2EvidenceSourceProjection(root);
    try {
      await expect(
        readFile(resolve(projection.projectedRoot, unrelatedPath), "utf8"),
      ).resolves.toBe("HEAD unrelated\n");
      await expect(
        readFile(resolve(projection.projectedRoot, codingPath), "utf8"),
      ).resolves.toBe("Coding candidate\n");
    } finally {
      await projection.dispose();
    }
  });

  it("keeps production evidence stable for unrelated dirt and sensitive to Coding bytes", async () => {
    const fixture = await createMinimalV2EvidenceRepository();
    const cleanSnapshot = await computeAnalyzerInputSnapshotSha256(
      fixture.root,
    );
    const cleanReport = await computeAnalyzerReportSha256(fixture.root);

    await writeFile(
      resolve(fixture.root, fixture.unrelatedPath),
      "unrelated dirty import\n",
      "utf8",
    );
    await expect(
      computeAnalyzerInputSnapshotSha256(fixture.root),
    ).resolves.toBe(cleanSnapshot);
    await expect(computeAnalyzerReportSha256(fixture.root)).resolves.toBe(
      cleanReport,
    );

    await writeFile(
      resolve(fixture.root, fixture.codingPath),
      'import openai from "openai";\nvoid openai;\n',
      "utf8",
    );
    await expect(
      computeAnalyzerInputSnapshotSha256(fixture.root),
    ).resolves.not.toBe(cleanSnapshot);
    await expect(computeAnalyzerReportSha256(fixture.root)).resolves.not.toBe(
      cleanReport,
    );
  }, 30_000);

  it("rejects stale synchronous v2 implementation and input hashes", async () => {
    const manifest = JSON.parse(
      await readFile(
        resolve(
          repositoryRoot,
          "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;

    const staleImplementation = validateAnalyzerReconciliationManifestV2Sync({
      repoRoot: repositoryRoot,
      manifest: withProtectedManifestHash(
        manifest,
        "analyzerImplementationTreeSha256",
      ),
    });
    expect(staleImplementation).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        "Analyzer implementation tree hash does not match current bytes",
      ]),
    });

    const staleInput = validateAnalyzerReconciliationManifestV2Sync({
      repoRoot: repositoryRoot,
      manifest: withProtectedManifestHash(
        manifest,
        "analyzerInputSnapshotSha256",
      ),
    });
    expect(staleInput).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        "Analyzer input snapshot hash does not match current bytes",
      ]),
    });
  }, 30_000);

  it("guards the exact v2 manifest transaction destination set", async () => {
    await expect(
      applyArchitectureReconciliationForPolicy({
        policyVersion: "v2",
        repoRoot: repositoryRoot,
        destinationPaths: V2_RECONCILIATION_DESTINATION_PATHS,
        dryRun: true,
      }),
    ).resolves.toEqual({ allowed: true, applied: false });
    await expect(
      applyArchitectureReconciliationForPolicy({
        policyVersion: "v2",
        repoRoot: repositoryRoot,
        destinationPaths: V2_RECONCILIATION_DESTINATION_PATHS,
        dryRun: false,
      }),
    ).resolves.toEqual({ allowed: true, applied: true });

    for (const destinationPaths of [
      V2_RECONCILIATION_DESTINATION_PATHS.slice(1),
      [...V2_RECONCILIATION_DESTINATION_PATHS].reverse(),
      [...V2_RECONCILIATION_DESTINATION_PATHS, "unexpected.json"],
    ]) {
      await expect(
        applyArchitectureReconciliationForPolicy({
          policyVersion: "v2",
          repoRoot: repositoryRoot,
          destinationPaths,
          dryRun: false,
        }),
      ).resolves.toEqual({ allowed: false, applied: false });
    }
  });

  it("rejects dirty comparisons for accepted v2 state", () => {
    expect(() =>
      assertAcceptedV2ComparisonIsClean({
        additions: [{} as never],
        removals: [],
        renames: [],
      }),
    ).toThrow(/clean zero-delta/i);
    expect(() =>
      assertAcceptedV2ComparisonIsClean({
        additions: [],
        removals: [],
        renames: [],
      }),
    ).not.toThrow();
  });
});

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

const temporaryRoots: string[] = [];
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));

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
        schemaVersion: 1,
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
        schemaVersion: 1,
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
        schemaVersion: 1,
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
});

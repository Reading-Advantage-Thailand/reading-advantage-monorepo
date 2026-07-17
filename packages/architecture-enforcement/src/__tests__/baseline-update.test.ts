import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { computeRulesetHash } from "../baseline.js";
import {
  createUpdatedArchitectureBaselines,
  updateArchitectureBaselines,
  type ArchitectureBaselineFileOperations,
} from "../baseline-update.js";
import {
  architectureConfigSchema,
  type ArchitectureBaseline,
  type ArchitectureConfig,
  type ArchitectureFinding,
} from "../contracts.js";
import { createNodeRepositoryFileTransactionOperations } from "../node-file-transaction.js";
import {
  ARCHITECTURE_WRITE_LOCK_PATH,
  RepositoryFileTransactionFailure,
} from "../policy-update-transaction.js";

const hash = (character: string): string => character.repeat(64);
const fixtureRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    fixtureRoots
      .splice(0)
      .map((fixtureRoot) => rm(fixtureRoot, { recursive: true, force: true })),
  );
});

const config: ArchitectureConfig = architectureConfigSchema.parse({
  schemaVersion: 1,
  rules: [
    {
      schemaVersion: 1,
      id: "DATABASE_BOUNDARY",
      domain: "database",
      description: "Database access stays inside approved ownership roots.",
      severity: "error",
      findingKinds: ["static-import"],
      moduleMatchers: [{ kind: "exact", value: "@reading-advantage/db" }],
      resourceMatchers: [],
      resolvedTargetRoots: ["packages/db/src/"],
      ownershipRootIds: ["database-package"],
    },
    {
      schemaVersion: 1,
      id: "AI_PROVIDER_BOUNDARY",
      domain: "provider",
      description: "AI provider access stays inside approved adapter roots.",
      severity: "error",
      findingKinds: ["static-import"],
      moduleMatchers: [{ kind: "exact", value: "openai" }],
      resourceMatchers: [],
      resolvedTargetRoots: [],
      ownershipRootIds: ["ai-adapter"],
    },
  ],
  ownershipRoots: [
    {
      schemaVersion: 1,
      id: "database-package",
      domain: "database",
      path: "packages/db/src/",
      kind: "database",
      ruleIds: ["DATABASE_BOUNDARY"],
      owner: "database-platform",
      rationale: "The database package owns low-level database primitives.",
    },
    {
      schemaVersion: 1,
      id: "ai-adapter",
      domain: "provider",
      path: "packages/ai/src/providers/",
      kind: "adapter",
      ruleIds: ["AI_PROVIDER_BOUNDARY"],
      owner: "ai-platform",
      rationale: "The AI adapter owns direct provider client integrations.",
    },
  ],
  exactExceptions: [],
  baselineFiles: {
    database: "config/baselines/database.json",
    provider: "config/baselines/provider.json",
  },
});

/** Creates one valid architecture finding with controllable identity fields. */
function finding(
  overrides: Partial<ArchitectureFinding> = {},
): ArchitectureFinding {
  return {
    schemaVersion: 1,
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: "apps/sales/src/database.ts",
    line: 1,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "@reading-advantage/db",
    resolvedTarget: "packages/db/src/index.ts",
    semanticKey: hash("a"),
    instanceKey: hash("1"),
    ...overrides,
  };
}

/** Creates one canonical domain baseline from reviewed findings. */
function baseline(
  domain: ArchitectureBaseline["domain"],
  entries: readonly ArchitectureFinding[],
): ArchitectureBaseline {
  return {
    schemaVersion: 1,
    domain,
    rulesetHash: computeRulesetHash(config, domain),
    entries: [...entries]
      .sort((left, right) => left.instanceKey.localeCompare(right.instanceKey))
      .map((entry, index) => ({
        ...entry,
        owner: `reviewed-owner-${index + 1}`,
        rationale: `Reviewed legacy architecture debt entry number ${index + 1}.`,
      })),
  };
}

interface LiveBaselineFixture {
  databaseBaselinePath: string;
  databaseOriginal: string;
  providerBaselinePath: string;
  providerOriginal: string;
  repoRoot: string;
  sourcePath: string;
}

/**
 * Creates a real temporary repository surface for checker and update tests.
 * @param source TypeScript source written into the isolated repository.
 * @returns Paths and original bytes needed to verify update behavior.
 */
async function createLiveBaselineFixture(
  source = 'import OpenAI from "openai";\nvoid OpenAI;\n',
): Promise<LiveBaselineFixture> {
  const repoRoot = await mkdtemp(join(tmpdir(), "architecture-update-"));
  fixtureRoots.push(repoRoot);
  const sourcePath = "apps/sample.ts";
  const databaseBaselinePath = resolve(repoRoot, config.baselineFiles.database);
  const providerBaselinePath = resolve(repoRoot, config.baselineFiles.provider);
  await mkdir(resolve(repoRoot, "apps"), { recursive: true });
  await mkdir(resolve(repoRoot, "config/baselines"), { recursive: true });
  const databaseOriginal = `${JSON.stringify(baseline("database", []), null, 2)}\n`;
  const providerOriginal = `${JSON.stringify(baseline("provider", []), null, 2)}\n`;
  await Promise.all([
    writeFile(resolve(repoRoot, sourcePath), source, "utf8"),
    writeFile(databaseBaselinePath, databaseOriginal, "utf8"),
    writeFile(providerBaselinePath, providerOriginal, "utf8"),
  ]);
  return {
    databaseBaselinePath,
    databaseOriginal,
    providerBaselinePath,
    providerOriginal,
    repoRoot,
    sourcePath,
  };
}

/**
 * Returns isolated checker options that avoid repository process discovery.
 * @param fixture Live repository fixture whose exact source is checked.
 * @returns Checker options with deterministic workspace resolution.
 */
function liveUpdateOptions(fixture: LiveBaselineFixture) {
  return {
    repoRoot: fixture.repoRoot,
    config,
    sourcePaths: [fixture.sourcePath],
    workspaceTargets: new Map<string, string>(),
  };
}

/**
 * Creates native operations that fail immediately after the second replacement.
 * @returns Filesystem adapter that injects one post-rename provider failure.
 */
function secondReplacementFailureOperations(): ArchitectureBaselineFileOperations {
  const operations = createNodeRepositoryFileTransactionOperations();
  let stagedReplacementCount = 0;
  return {
    ...operations,
    rename: async (source, destination) => {
      await operations.rename(source, destination);
      if (source.endsWith(".tmp")) {
        stagedReplacementCount += 1;
        if (stagedReplacementCount === 2) {
          throw new Error("forced second baseline replacement failure");
        }
      }
    },
  };
}

describe("explicit architecture baseline updates", () => {
  it("preserves metadata for exact and renamed debt and reviews additions", () => {
    const exact = finding({ instanceKey: hash("1") });
    const previous = finding({
      sourcePath: "apps/marketing/src/provider.ts",
      instanceKey: hash("2"),
    });
    const moved = finding({
      sourcePath: "apps/marketing/src/moved-provider.ts",
      instanceKey: hash("3"),
    });
    const added = finding({
      ruleId: "AI_PROVIDER_BOUNDARY",
      domain: "provider",
      sourcePath: "apps/accounts/src/openai.ts",
      importSpecifier: "openai",
      resolvedTarget: "external:openai",
      semanticKey: hash("b"),
      instanceKey: hash("4"),
    });
    const baselines = {
      database: baseline("database", [exact, previous]),
      provider: baseline("provider", []),
    };

    const updated = createUpdatedArchitectureBaselines({
      config,
      baselines,
      findings: [added, moved, exact],
      newDebtMetadata: {
        owner: "architecture-platform",
        rationale:
          "Reviewed temporary provider debt pending adapter migration.",
      },
    });
    const updatedExact = updated.database.entries.find(
      (entry) => entry.instanceKey === exact.instanceKey,
    );
    const updatedMoved = updated.database.entries.find(
      (entry) => entry.instanceKey === moved.instanceKey,
    );
    const updatedAdded = updated.provider.entries[0];

    expect(updatedExact?.owner).toBe("reviewed-owner-1");
    expect(updatedMoved?.owner).toBe("reviewed-owner-2");
    expect(updatedMoved?.rationale).toContain("entry number 2");
    expect(updatedAdded?.owner).toBe("architecture-platform");
    expect(updatedAdded?.rationale).toContain("pending adapter migration");
    expect(updated.database.rulesetHash).toBe(
      computeRulesetHash(config, "database"),
    );
  });

  it("requires valid owner and rationale only when additions are accepted", () => {
    const added = finding();
    const baselines = {
      database: baseline("database", []),
      provider: baseline("provider", []),
    };

    expect(() =>
      createUpdatedArchitectureBaselines({
        config,
        baselines,
        findings: [added],
      }),
    ).toThrow(/requires --owner and --rationale/);
    expect(() =>
      createUpdatedArchitectureBaselines({
        config,
        baselines,
        findings: [added],
        newDebtMetadata: {
          owner: "Architecture Team",
          rationale: "too short",
        },
      }),
    ).toThrow();
  });

  it("ratchets removed entries down without requiring new-debt metadata", () => {
    const removed = finding();
    const updated = createUpdatedArchitectureBaselines({
      config,
      baselines: {
        database: baseline("database", [removed]),
        provider: baseline("provider", []),
      },
      findings: [],
    });

    expect(updated.database.entries).toEqual([]);
    expect(updated.provider.entries).toEqual([]);
  });

  it("previews live debt without writing either configured baseline", async () => {
    const fixture = await createLiveBaselineFixture();

    const result = await updateArchitectureBaselines({
      ...liveUpdateOptions(fixture),
      acknowledge: false,
    });

    expect(result.report.status).toBe("debt-change");
    expect(result.wroteBaselines).toBe(false);
    await expect(readFile(fixture.databaseBaselinePath, "utf8")).resolves.toBe(
      fixture.databaseOriginal,
    );
    await expect(readFile(fixture.providerBaselinePath, "utf8")).resolves.toBe(
      fixture.providerOriginal,
    );
  });

  it("writes both live baselines only after acknowledged reviewed additions", async () => {
    const fixture = await createLiveBaselineFixture();

    const result = await updateArchitectureBaselines({
      ...liveUpdateOptions(fixture),
      acknowledge: true,
      newDebtMetadata: {
        owner: "architecture-platform",
        rationale:
          "Reviewed temporary debt pending the provider adapter migration.",
      },
    });
    const provider = JSON.parse(
      await readFile(fixture.providerBaselinePath, "utf8"),
    ) as ArchitectureBaseline;

    expect(result.wroteBaselines).toBe(true);
    expect(provider.entries).toHaveLength(1);
    expect(provider.entries[0]?.owner).toBe("architecture-platform");
    expect(provider.entries[0]?.rationale).toContain("provider adapter");
  });

  it("preserves a baseline changed after analysis instead of overwriting it", async () => {
    const fixture = await createLiveBaselineFixture();
    const nodeOperations = createNodeRepositoryFileTransactionOperations();
    const concurrentDatabase = `${fixture.databaseOriginal}\n`;
    let injected = false;
    const fileOperations: ArchitectureBaselineFileOperations = {
      ...nodeOperations,
      readFile: async (path) => {
        if (!injected && path === fixture.databaseBaselinePath) {
          await writeFile(path, concurrentDatabase, "utf8");
          injected = true;
        }
        return nodeOperations.readFile(path);
      },
    };

    await expect(
      updateArchitectureBaselines({
        ...liveUpdateOptions(fixture),
        acknowledge: true,
        newDebtMetadata: {
          owner: "architecture-platform",
          rationale:
            "Reviewed temporary debt pending the provider adapter migration.",
        },
        fileOperations,
      }),
    ).rejects.toThrow(/baseline changed after analysis/i);
    expect(injected).toBe(true);
    await expect(readFile(fixture.databaseBaselinePath, "utf8")).resolves.toBe(
      concurrentDatabase,
    );
    await expect(readFile(fixture.providerBaselinePath, "utf8")).resolves.toBe(
      fixture.providerOriginal,
    );
    await expect(
      readFile(resolve(fixture.repoRoot, ARCHITECTURE_WRITE_LOCK_PATH), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("requires owner and rationale before an acknowledged live addition", async () => {
    const fixture = await createLiveBaselineFixture();

    await expect(
      updateArchitectureBaselines({
        ...liveUpdateOptions(fixture),
        acknowledge: true,
      }),
    ).rejects.toThrow(/requires --owner and --rationale/);
    await expect(readFile(fixture.databaseBaselinePath, "utf8")).resolves.toBe(
      fixture.databaseOriginal,
    );
    await expect(readFile(fixture.providerBaselinePath, "utf8")).resolves.toBe(
      fixture.providerOriginal,
    );
  });

  it("fails closed without writes for parser and invalid-config failures", async () => {
    const fixture = await createLiveBaselineFixture("const invalid = ;\n");

    const parserResult = await updateArchitectureBaselines({
      ...liveUpdateOptions(fixture),
      acknowledge: true,
    });
    expect(parserResult.report.status).toBe("analysis-error");
    expect(parserResult.wroteBaselines).toBe(false);

    const invalidConfig = {
      ...config,
      schemaVersion: 2,
    } as unknown as ArchitectureConfig;
    await expect(
      updateArchitectureBaselines({
        ...liveUpdateOptions(fixture),
        config: invalidConfig,
        acknowledge: true,
      }),
    ).rejects.toThrow();
    await expect(readFile(fixture.databaseBaselinePath, "utf8")).resolves.toBe(
      fixture.databaseOriginal,
    );
    await expect(readFile(fixture.providerBaselinePath, "utf8")).resolves.toBe(
      fixture.providerOriginal,
    );
  });

  it("restores both original files when the second replacement fails", async () => {
    const fixture = await createLiveBaselineFixture();

    const error = await updateArchitectureBaselines({
      ...liveUpdateOptions(fixture),
      acknowledge: true,
      newDebtMetadata: {
        owner: "architecture-platform",
        rationale:
          "Reviewed temporary debt pending the provider adapter migration.",
      },
      fileOperations: secondReplacementFailureOperations(),
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RepositoryFileTransactionFailure);
    expect(
      (error as RepositoryFileTransactionFailure).primaryError,
    ).toHaveProperty("message", "forced second baseline replacement failure");

    await expect(readFile(fixture.databaseBaselinePath, "utf8")).resolves.toBe(
      fixture.databaseOriginal,
    );
    await expect(readFile(fixture.providerBaselinePath, "utf8")).resolves.toBe(
      fixture.providerOriginal,
    );
    const artifacts = (
      await readdir(resolve(fixture.repoRoot, "config/baselines"))
    ).filter((path) => path.includes("architecture-transaction"));
    expect(artifacts).toEqual([]);
  });
});

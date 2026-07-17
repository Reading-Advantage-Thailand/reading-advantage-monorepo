import { createHash } from "node:crypto";
import { posix } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { computeRulesetHash } from "../baseline.js";
import {
  applyArchitectureReconciliation,
  previewArchitectureReconciliation,
  type ArchitectureReconciliationDependencies,
} from "../architecture-reconciliation.js";
import {
  architectureConfigSchema,
  type ArchitectureBaseline,
  type ArchitectureConfig,
  type ArchitectureFinding,
  type BaselineEntry,
} from "../contracts.js";
import { createFindingIdentity } from "../finding-identity.js";
import {
  RECONCILIATION_DIRECT_REVIEW_PATH,
  RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
  RECONCILIATION_MANIFEST_PATH,
  RECONCILIATION_REVIEW_EVIDENCE_PATHS,
  type AnalyzerReconciliationManifest,
} from "../reconciliation-manifest.js";
import type {
  RepositoryFileTransactionOperations,
  RepositoryFileTransactionPlan,
  RepositoryFileReplacementProposal,
} from "../policy-update-transaction.js";

const ROOT = "/repo";
const OWNERSHIP_PATH =
  "packages/architecture-enforcement/src/config/ownership-map.v1.json";

function sha256(contents: string): string {
  return createHash("sha256").update(contents, "utf8").digest("hex");
}

function configFixture(): ArchitectureConfig {
  return architectureConfigSchema.parse({
    schemaVersion: 1,
    rules: [
      {
        schemaVersion: 1,
        id: "DATABASE_BOUNDARY",
        domain: "database",
        description: "Database access stays in approved roots.",
        severity: "error",
        findingKinds: ["static-import"],
        moduleMatchers: [{ kind: "exact", value: "postgres" }],
        resourceMatchers: [],
        resolvedTargetRoots: [],
        ownershipRootIds: ["database-root"],
      },
      {
        schemaVersion: 1,
        id: "AI_PROVIDER_BOUNDARY",
        domain: "provider",
        description: "AI provider access stays in approved roots.",
        severity: "error",
        findingKinds: ["static-import"],
        moduleMatchers: [{ kind: "exact", value: "openai" }],
        resourceMatchers: [],
        resolvedTargetRoots: [],
        ownershipRootIds: ["provider-root"],
      },
    ],
    ownershipRoots: [
      {
        schemaVersion: 1,
        id: "database-root",
        domain: "database",
        path: "packages/db/src/",
        kind: "database",
        ruleIds: ["DATABASE_BOUNDARY"],
        owner: "database-platform",
        rationale: "The database package owns database access primitives.",
      },
      {
        schemaVersion: 1,
        id: "provider-root",
        domain: "provider",
        path: "packages/ai/src/providers/",
        kind: "adapter",
        ruleIds: ["AI_PROVIDER_BOUNDARY"],
        owner: "ai-platform",
        rationale: "The AI package owns provider adapter construction.",
      },
    ],
    exactExceptions: [],
    baselineFiles: {
      database:
        "packages/architecture-enforcement/src/config/baselines/database.v1.json",
      provider:
        "packages/architecture-enforcement/src/config/baselines/provider.v1.json",
    },
  });
}

function findingFixture(
  input: Omit<
    ArchitectureFinding,
    "schemaVersion" | "semanticKey" | "instanceKey"
  >,
): ArchitectureFinding {
  const identity = createFindingIdentity(input);
  return { schemaVersion: 1, ...input, ...identity };
}

function reviewed(finding: ArchitectureFinding, owner: string): BaselineEntry {
  return {
    ...finding,
    owner,
    rationale: `Reviewed architecture debt owned by ${owner}.`,
  };
}

interface Fixture {
  dependencies: Partial<ArchitectureReconciliationDependencies>;
  files: Map<string, string>;
  manifest: AnalyzerReconciliationManifest;
  transactionApply: ReturnType<typeof vi.fn>;
  transactionPreview: ReturnType<typeof vi.fn>;
  validateReconciliation: ReturnType<typeof vi.fn>;
  setAnalyzerTreeHash(value: string): void;
}

function createFixture(): Fixture {
  const config = configFixture();
  const historicalFinding = findingFixture({
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: "apps/sales/src/database.ts",
    line: 1,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "postgres",
    resolvedTarget: "external:postgres",
  });
  const productionFinding = findingFixture({
    ruleId: "AI_PROVIDER_BOUNDARY",
    domain: "provider",
    sourcePath: "apps/marketing/src/provider.ts",
    line: 2,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "openai",
    resolvedTarget: "external:openai",
  });
  const coveredFinding = findingFixture({
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: "apps/sales/src/__tests__/database.test.ts",
    line: 3,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "postgres",
    resolvedTarget: "external:postgres",
  });
  const productionAddition = reviewed(productionFinding, "marketing-platform");
  const exactException = {
    schemaVersion: 1 as const,
    id: "reviewed-test-database",
    ruleId: "DATABASE_BOUNDARY",
    sourcePath: coveredFinding.sourcePath,
    owner: "sales-platform",
    rationale:
      "Reviewed exact test exception with all covered findings listed.",
  };
  const manifest = {
    productionAdditions: [productionAddition],
    exactExceptionAdditions: [
      { exception: exactException, coveredFindings: [coveredFinding] },
    ],
  } as unknown as AnalyzerReconciliationManifest;
  const databaseBaseline: ArchitectureBaseline = {
    schemaVersion: 1,
    domain: "database",
    rulesetHash: computeRulesetHash(config, "database"),
    entries: [reviewed(historicalFinding, "sales-platform")],
  };
  const providerBaseline: ArchitectureBaseline = {
    schemaVersion: 1,
    domain: "provider",
    rulesetHash: computeRulesetHash(config, "provider"),
    entries: [],
  };
  const files = new Map<string, string>([
    [posix.join(ROOT, OWNERSHIP_PATH), `${JSON.stringify(config)}\n`],
    [
      posix.join(ROOT, config.baselineFiles.database),
      `${JSON.stringify(databaseBaseline)}\n`,
    ],
    [
      posix.join(ROOT, config.baselineFiles.provider),
      `${JSON.stringify(providerBaseline)}\n`,
    ],
    [posix.join(ROOT, RECONCILIATION_MANIFEST_PATH), "manifest-v1\n"],
    [posix.join(ROOT, RECONCILIATION_DIRECT_REVIEW_PATH), "direct-review\n"],
    [
      posix.join(ROOT, RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH),
      "diff-audit\n",
    ],
    ...Object.values(RECONCILIATION_REVIEW_EVIDENCE_PATHS).map(
      (path) => [posix.join(ROOT, path), "Verdict: **ACCEPTED**\n"] as const,
    ),
    [posix.join(ROOT, historicalFinding.sourcePath), "historical source\n"],
    [posix.join(ROOT, productionFinding.sourcePath), "production source\n"],
  ]);
  const fileOperations: RepositoryFileTransactionOperations = {
    acquireExclusiveLock: vi.fn(async () => {
      throw new Error("preview must not lock");
    }),
    assertTransactionPath: vi.fn(async () => {
      throw new Error("preview must not assert paths");
    }),
    bindTransactionPaths: vi.fn(async () => {
      throw new Error("preview must not bind paths");
    }),
    copyFileExclusive: vi.fn(async () => {
      throw new Error("preview must not copy");
    }),
    inspect: vi.fn(async (path) => ({
      device: "fake-device",
      inode: path,
      isFile: true,
      isSymbolicLink: false,
    })),
    readFile: vi.fn(async (path) => {
      const contents = files.get(path);
      if (contents === undefined) throw new Error(`missing ${path}`);
      return contents;
    }),
    realpath: vi.fn(async (path) => path),
    rename: vi.fn(async () => {
      throw new Error("preview must not rename");
    }),
    releaseExclusiveLock: vi.fn(async () => {
      throw new Error("preview must not unlock");
    }),
    releaseTransactionPaths: vi.fn(async () => {
      throw new Error("preview must not release paths");
    }),
    unlink: vi.fn(async () => {
      throw new Error("preview must not unlink");
    }),
    writeFileExclusive: vi.fn(async () => {
      throw new Error("preview must not write");
    }),
  };
  const transactionPreview = vi.fn(
    async (options: {
      repoRoot: string;
      replacements: readonly RepositoryFileReplacementProposal[];
    }): Promise<RepositoryFileTransactionPlan> => ({
      schemaVersion: 1 as const,
      repoRoot: options.repoRoot,
      replacements: options.replacements.map((replacement) => ({
        ...replacement,
        destination: posix.join(options.repoRoot, replacement.repositoryPath),
        canonicalDestination: posix.join(
          options.repoRoot,
          replacement.repositoryPath,
        ),
        device: "fake-device",
        inode: posix.join(options.repoRoot, replacement.repositoryPath),
        beforeHash: sha256(
          files.get(posix.join(ROOT, replacement.repositoryPath))!,
        ),
        afterHash: sha256(replacement.contents),
      })),
      planHash: "a".repeat(64),
    }),
  );
  const transactionApply = vi.fn(async (options) => {
    if (!options.acknowledge) {
      return {
        state: "not-acknowledged" as const,
        planHash: options.plan.planHash,
      };
    }
    for (const replacement of options.plan.replacements) {
      await options.validate?.(replacement, replacement.contents);
    }
    return { state: "committed" as const, planHash: options.plan.planHash };
  });
  const validateReconciliation = vi.fn(() => ({
    schemaVersion: 1 as const,
    manifestSha256: "b".repeat(64),
    sourceBaseSha: "source-base",
    analyzerCommitSha: "analyzer-commit",
    databaseEntries: 1,
    providerEntries: 1,
    productionAdditions: 1,
    exactExceptionAdditions: 1,
    coveredTestFindings: 1,
  }));
  let analyzerTreeHash = "c".repeat(64);
  const dependencies: Partial<ArchitectureReconciliationDependencies> = {
    fileOperations,
    parseManifest: (source) => {
      if (source !== "manifest-v1\n") {
        return {
          ...manifest,
          productionAdditions: [],
        } as AnalyzerReconciliationManifest;
      }
      return manifest;
    },
    hashManifest: (value) =>
      value.productionAdditions.length === 1 ? "b".repeat(64) : "d".repeat(64),
    selectSourcePaths: () => [
      historicalFinding.sourcePath,
      productionFinding.sourcePath,
    ],
    listArchitectureInputPaths: (_repoRoot, sourcePaths) => sourcePaths,
    loadWorkspaceTargets: async () => new Map(),
    analyzeSources: async (options) => {
      expect(options.config.exactExceptions).toEqual([exactException]);
      return {
        schemaVersion: 1,
        sourcePaths: [...options.sourcePaths],
        findings: [historicalFinding, productionFinding].sort((left, right) =>
          left.instanceKey.localeCompare(right.instanceKey),
        ),
        parseErrors: [],
      };
    },
    computeAnalyzerImplementationTreeHash: async () => analyzerTreeHash,
    computeReconciliationImplementationTreeHash: async () => "f".repeat(64),
    validateReconciliation,
    previewTransaction: transactionPreview,
    applyTransaction: transactionApply,
  };
  return {
    dependencies,
    files,
    manifest,
    transactionApply,
    transactionPreview,
    validateReconciliation,
    setAnalyzerTreeHash: (value) => {
      analyzerTreeHash = value;
    },
  };
}

describe("architecture reconciliation orchestration", () => {
  it("previews the exact three-file candidate without writing", async () => {
    const fixture = createFixture();

    const preview = await previewArchitectureReconciliation({
      repoRoot: ROOT,
      dependencies: fixture.dependencies,
    });

    expect(fixture.transactionPreview).toHaveBeenCalledOnce();
    const replacementIds = preview.transactionPlan.replacements.map(
      (replacement) => replacement.id,
    );
    expect(replacementIds).toEqual([
      "ownership-map",
      "database-baseline",
      "provider-baseline",
    ]);
    expect(fixture.validateReconciliation).toHaveBeenCalledOnce();
    expect(preview.summary.exactExceptionPairs).toEqual([
      {
        ruleId: "DATABASE_BOUNDARY",
        sourcePath: "apps/sales/src/__tests__/database.test.ts",
      },
    ]);
    expect(preview.summary.counts).toEqual({
      databaseEntries: 1,
      providerEntries: 1,
      productionAdditions: 1,
      exactExceptionAdditions: 1,
      coveredTestFindings: 1,
      removals: 0,
      renames: 0,
    });
    expect(preview.reconciliationPlanHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(preview.summary)).not.toContain("replacement-");
    expect(JSON.stringify(preview.summary)).not.toContain(ROOT);
    const operations = fixture.dependencies
      .fileOperations as RepositoryFileTransactionOperations;
    expect(operations.writeFileExclusive).not.toHaveBeenCalled();
    expect(operations.copyFileExclusive).not.toHaveBeenCalled();
    expect(operations.rename).not.toHaveBeenCalled();
  });

  it("fails closed on analyzer errors or a non-exact current finding set", async () => {
    const parserFixture = createFixture();
    parserFixture.dependencies.analyzeSources = async () => ({
      schemaVersion: 1 as const,
      sourcePaths: [],
      findings: [],
      parseErrors: [
        {
          schemaVersion: 1,
          sourcePath: "apps/broken.ts",
          line: 1,
          column: 1,
          code: "TYPESCRIPT_PARSE_ERROR",
        },
      ],
    });
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: parserFixture.dependencies,
      }),
    ).rejects.toThrow(/analyzer errors/i);
    expect(parserFixture.transactionPreview).not.toHaveBeenCalled();

    const mismatchFixture = createFixture();
    mismatchFixture.dependencies.analyzeSources = async (options) => ({
      schemaVersion: 1,
      sourcePaths: [...options.sourcePaths],
      findings: [],
      parseErrors: [],
    });
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: mismatchFixture.dependencies,
      }),
    ).rejects.toThrow(/finding set/i);
    expect(mismatchFixture.transactionPreview).not.toHaveBeenCalled();
  });

  it("fails when tracked inputs or coordinated files change during preview", async () => {
    const inputFixture = createFixture();
    const originalAnalyze = inputFixture.dependencies.analyzeSources!;
    inputFixture.dependencies.analyzeSources = async (options) => {
      const analysis = await originalAnalyze(options);
      inputFixture.files.set(
        posix.join(ROOT, "apps/sales/src/database.ts"),
        "changed during preview\n",
      );
      return analysis;
    };
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: inputFixture.dependencies,
      }),
    ).rejects.toThrow(/inputs changed while/i);
    expect(inputFixture.transactionPreview).not.toHaveBeenCalled();

    const policyFixture = createFixture();
    const originalPreview = policyFixture.dependencies.previewTransaction!;
    policyFixture.dependencies.previewTransaction = async (options) => {
      const plan = await originalPreview(options);
      return {
        ...plan,
        replacements: plan.replacements.map((replacement) =>
          replacement.id === "ownership-map"
            ? { ...replacement, beforeHash: "f".repeat(64) }
            : replacement,
        ),
      };
    };
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: policyFixture.dependencies,
      }),
    ).rejects.toThrow(/policy or baseline bytes changed/i);
  });

  it("fails closed on source-set, implementation-tree, and validator races", async () => {
    const sourceFixture = createFixture();
    const sourceAnalyze = sourceFixture.dependencies.analyzeSources!;
    sourceFixture.dependencies.analyzeSources = async (options) => {
      const analysis = await sourceAnalyze(options);
      return { ...analysis, sourcePaths: [...analysis.sourcePaths].reverse() };
    };
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: sourceFixture.dependencies,
      }),
    ).rejects.toThrow(/source set changed/i);

    const analyzerTreeFixture = createFixture();
    let analyzerTreeCalls = 0;
    analyzerTreeFixture.dependencies.computeAnalyzerImplementationTreeHash =
      async () => (++analyzerTreeCalls === 1 ? "c" : "d").repeat(64);
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: analyzerTreeFixture.dependencies,
      }),
    ).rejects.toThrow(/analyzer implementation changed while/i);

    const reconciliationTreeFixture = createFixture();
    let reconciliationTreeCalls = 0;
    reconciliationTreeFixture.dependencies.computeReconciliationImplementationTreeHash =
      async () => (++reconciliationTreeCalls === 1 ? "e" : "f").repeat(64);
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: reconciliationTreeFixture.dependencies,
      }),
    ).rejects.toThrow(/reconciliation implementation changed while/i);

    const validatorFixture = createFixture();
    validatorFixture.dependencies.validateReconciliation = vi.fn(() => ({
      schemaVersion: 1 as const,
      manifestSha256: "0".repeat(64),
      sourceBaseSha: "source-base",
      analyzerCommitSha: "analyzer-commit",
      databaseEntries: 1,
      providerEntries: 1,
      productionAdditions: 1,
      exactExceptionAdditions: 1,
      coveredTestFindings: 1,
    }));
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: validatorFixture.dependencies,
      }),
    ).rejects.toThrow(/different manifest hash/i);
  });

  it("rejects duplicate exceptions, wrong domains, and incomplete transaction plans", async () => {
    const duplicateFixture = createFixture();
    const configPath = posix.join(ROOT, OWNERSHIP_PATH);
    const config = JSON.parse(duplicateFixture.files.get(configPath)!) as {
      exactExceptions: unknown[];
    };
    config.exactExceptions = [
      duplicateFixture.manifest.exactExceptionAdditions[0]!.exception,
    ];
    duplicateFixture.files.set(configPath, `${JSON.stringify(config)}\n`);
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: duplicateFixture.dependencies,
      }),
    ).rejects.toThrow(/already exists/i);

    const domainFixture = createFixture();
    const configSource = JSON.parse(domainFixture.files.get(configPath)!) as {
      baselineFiles: { database: string };
    };
    const databasePath = posix.join(ROOT, configSource.baselineFiles.database);
    const database = JSON.parse(domainFixture.files.get(databasePath)!) as {
      domain: string;
    };
    database.domain = "provider";
    domainFixture.files.set(databasePath, `${JSON.stringify(database)}\n`);
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: domainFixture.dependencies,
      }),
    ).rejects.toThrow(/domain/i);

    const transactionFixture = createFixture();
    const originalPreview = transactionFixture.dependencies.previewTransaction!;
    transactionFixture.dependencies.previewTransaction = async (options) => {
      const plan = await originalPreview(options);
      return { ...plan, replacements: plan.replacements.slice(0, 2) };
    };
    await expect(
      previewArchitectureReconciliation({
        repoRoot: ROOT,
        dependencies: transactionFixture.dependencies,
      }),
    ).rejects.toThrow(/missing a required document hash/i);
  });

  it("applies only the exact wrapper-hash-bound preview", async () => {
    const fixture = createFixture();
    const preview = await previewArchitectureReconciliation({
      repoRoot: ROOT,
      dependencies: fixture.dependencies,
    });

    const result = await applyArchitectureReconciliation({
      preview,
      acknowledge: true,
      expectedReconciliationPlanHash: preview.reconciliationPlanHash,
      dependencies: fixture.dependencies,
    });

    expect(result.transactionOutcome.state).toBe("committed");
    expect(fixture.transactionPreview).toHaveBeenCalledTimes(2);
    expect(fixture.transactionApply).toHaveBeenCalledOnce();
    expect(fixture.transactionApply.mock.calls[0]?.[0]).toMatchObject({
      acknowledge: true,
      expectedPlanHash: preview.transactionPlan.planHash,
    });

    const mismatchFixture = createFixture();
    const mismatchPreview = await previewArchitectureReconciliation({
      repoRoot: ROOT,
      dependencies: mismatchFixture.dependencies,
    });
    await expect(
      applyArchitectureReconciliation({
        preview: mismatchPreview,
        acknowledge: true,
        expectedReconciliationPlanHash: "0".repeat(64),
        dependencies: mismatchFixture.dependencies,
      }),
    ).rejects.toThrow(/plan hash/i);
    expect(mismatchFixture.transactionApply).not.toHaveBeenCalled();

    const declinedFixture = createFixture();
    const declinedPreview = await previewArchitectureReconciliation({
      repoRoot: ROOT,
      dependencies: declinedFixture.dependencies,
    });
    const declined = await applyArchitectureReconciliation({
      preview: declinedPreview,
      acknowledge: false,
      expectedReconciliationPlanHash: declinedPreview.reconciliationPlanHash,
      dependencies: declinedFixture.dependencies,
    });
    expect(declined.transactionOutcome.state).toBe("not-acknowledged");
    expect(declinedFixture.transactionApply).toHaveBeenCalledWith(
      expect.objectContaining({ acknowledge: false }),
    );
  });

  it("rechecks manifest, analyzer tree, and tracked inputs before mutation", async () => {
    const manifestFixture = createFixture();
    const manifestPreview = await previewArchitectureReconciliation({
      repoRoot: ROOT,
      dependencies: manifestFixture.dependencies,
    });
    manifestFixture.files.set(
      posix.join(ROOT, RECONCILIATION_MANIFEST_PATH),
      "manifest-v2\n",
    );
    await expect(
      applyArchitectureReconciliation({
        preview: manifestPreview,
        acknowledge: true,
        expectedReconciliationPlanHash: manifestPreview.reconciliationPlanHash,
        dependencies: manifestFixture.dependencies,
      }),
    ).rejects.toThrow(/finding set|changed before acknowledged apply/i);
    expect(manifestFixture.transactionApply).not.toHaveBeenCalled();

    const treeFixture = createFixture();
    const treePreview = await previewArchitectureReconciliation({
      repoRoot: ROOT,
      dependencies: treeFixture.dependencies,
    });
    treeFixture.setAnalyzerTreeHash("e".repeat(64));
    await expect(
      applyArchitectureReconciliation({
        preview: treePreview,
        acknowledge: true,
        expectedReconciliationPlanHash: treePreview.reconciliationPlanHash,
        dependencies: treeFixture.dependencies,
      }),
    ).rejects.toThrow(/changed before acknowledged apply/i);
    expect(treeFixture.transactionApply).not.toHaveBeenCalled();

    const inputFixture = createFixture();
    const inputPreview = await previewArchitectureReconciliation({
      repoRoot: ROOT,
      dependencies: inputFixture.dependencies,
    });
    inputFixture.files.set(
      posix.join(ROOT, "apps/sales/src/database.ts"),
      "changed source\n",
    );
    await expect(
      applyArchitectureReconciliation({
        preview: inputPreview,
        acknowledge: true,
        expectedReconciliationPlanHash: inputPreview.reconciliationPlanHash,
        dependencies: inputFixture.dependencies,
      }),
    ).rejects.toThrow(/changed before acknowledged apply/i);
    expect(inputFixture.transactionApply).not.toHaveBeenCalled();

    const directReviewFixture = createFixture();
    const directReviewPreview = await previewArchitectureReconciliation({
      repoRoot: ROOT,
      dependencies: directReviewFixture.dependencies,
    });
    directReviewFixture.files.set(
      posix.join(ROOT, RECONCILIATION_DIRECT_REVIEW_PATH),
      "changed direct review\n",
    );
    await expect(
      applyArchitectureReconciliation({
        preview: directReviewPreview,
        acknowledge: true,
        expectedReconciliationPlanHash:
          directReviewPreview.reconciliationPlanHash,
        dependencies: directReviewFixture.dependencies,
      }),
    ).rejects.toThrow(/changed before acknowledged apply/i);
    expect(directReviewFixture.transactionApply).not.toHaveBeenCalled();
  });

  it("rejects caller-side summary tampering before mutation", async () => {
    const fixture = createFixture();
    const preview = await previewArchitectureReconciliation({
      repoRoot: ROOT,
      dependencies: fixture.dependencies,
    });
    preview.summary.counts.productionAdditions = 999;

    await expect(
      applyArchitectureReconciliation({
        preview,
        acknowledge: true,
        expectedReconciliationPlanHash: preview.reconciliationPlanHash,
        dependencies: fixture.dependencies,
      }),
    ).rejects.toThrow(/preview.*changed/i);
    expect(fixture.transactionApply).not.toHaveBeenCalled();
  });
});

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { isAbsolute, resolve } from "node:path";
import {
  analyzeArchitectureSources,
  type AnalyzeArchitectureSourcesOptions,
  type ArchitectureAnalysisResult,
} from "./analyzer.js";
import {
  computeRulesetHash,
  serializeArchitectureBaseline,
} from "./baseline.js";
import {
  architectureBaselineSchema,
  architectureConfigSchema,
  architectureFindingSchema,
  type ArchitectureBaseline,
  type ArchitectureConfig,
  type ArchitectureFinding,
  type BaselineEntry,
  type ExactException,
} from "./contracts.js";
import { selectArchitectureSourceFiles } from "./inventory.js";
import { createNodeRepositoryFileTransactionOperations } from "./node-file-transaction.js";
import {
  applyRepositoryFileTransaction,
  previewRepositoryFileTransaction,
  type ApplyRepositoryFileTransactionOptions,
  type RepositoryFileTransactionOperations,
  type RepositoryFileTransactionOutcome,
  type RepositoryFileTransactionPlan,
} from "./policy-update-transaction.js";
import {
  RECONCILIATION_DIRECT_REVIEW_PATH,
  RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
  RECONCILIATION_MANIFEST_PATH,
  RECONCILIATION_REVIEW_EVIDENCE_PATHS,
  analyzerReconciliationManifestSchema,
  computeAnalyzerImplementationTreeSha256,
  computeReconciliationImplementationTreeSha256,
  hashAnalyzerReconciliationManifest,
  validateAnalyzerReconciliation,
  type AnalyzerReconciliationManifest,
  type AnalyzerReconciliationValidationSummary,
  type ValidateAnalyzerReconciliationInput,
} from "./reconciliation-manifest.js";
import type { ArchitectureBaselines } from "./ratchet.js";
import { compareStableStrings } from "./stable-order.js";
import {
  loadWorkspaceModuleTargets,
  type WorkspaceModuleTargets,
} from "./workspace-resolution.js";

/** Fixed version-controlled policy path participating in reconciliation. */
export const ARCHITECTURE_OWNERSHIP_MAP_PATH =
  "packages/architecture-enforcement/src/config/ownership-map.v1.json";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

/** Exact rule and test-file pair safe for preview output. */
export interface ArchitectureReconciliationExceptionPair {
  /** Architecture rule receiving the exact exception. */
  ruleId: string;
  /** Exact repository-relative test or fixture file. */
  sourcePath: string;
}

/** Secret-safe reconciliation counts derived from accepted validation. */
export interface ArchitectureReconciliationCounts {
  /** Final database baseline entry count. */
  databaseEntries: number;
  /** Final provider baseline entry count. */
  providerEntries: number;
  /** Independently accepted production additions. */
  productionAdditions: number;
  /** Independently accepted exact test exceptions. */
  exactExceptionAdditions: number;
  /** Analyzer findings covered by accepted exact exceptions. */
  coveredTestFindings: number;
  /** Historical findings removed by reconciliation; always zero. */
  removals: number;
  /** Historical findings reidentified as moves; always zero. */
  renames: number;
}

/** Secret-safe before and proposed hashes for the coordinated documents. */
export interface ArchitectureReconciliationFileHashes {
  /** Ownership-map file SHA-256. */
  ownershipMap: string;
  /** Database baseline file SHA-256. */
  databaseBaseline: string;
  /** Provider baseline file SHA-256. */
  providerBaseline: string;
}

/** Secret-safe summary intended for human or JSON preview output. */
export interface ArchitectureReconciliationSummary {
  /** Version of the summary contract. */
  schemaVersion: 1;
  /** Portable hash binding all reviewed reconciliation inputs and proposed files. */
  reconciliationPlanHash: string;
  /** Canonical accepted manifest hash. */
  manifestHash: string;
  /** Portable generic three-file transaction hash. */
  transactionPlanHash: string;
  /** Frozen analyzer implementation tree hash. */
  analyzerImplementationTreeHash: string;
  /** Frozen reconciliation implementation and test tree hash. */
  reconciliationImplementationTreeHash: string;
  /** Portable path-and-byte hash of every tracked analyzer input. */
  architectureInputSnapshotHash: string;
  /** Current coordinated file hashes observed by preview. */
  beforeFileHashes: ArchitectureReconciliationFileHashes;
  /** Proposed coordinated file hashes validated by preview. */
  proposedFileHashes: ArchitectureReconciliationFileHashes;
  /** Final ruleset hashes computed from the proposed policy. */
  rulesetHashes: { database: string; provider: string };
  /** Exact accepted exception pairs without source bodies or machine paths. */
  exactExceptionPairs: readonly ArchitectureReconciliationExceptionPair[];
  /** Accepted final counts. */
  counts: ArchitectureReconciliationCounts;
}

/** Complete preview retained for exact acknowledged application. */
export interface ArchitectureReconciliationPreview {
  /** Version of the preview contract. */
  schemaVersion: 1;
  /** Portable wrapper hash required by apply. */
  reconciliationPlanHash: string;
  /** Canonical manifest hash observed during preview. */
  manifestHash: string;
  /** Analyzer implementation tree hash observed during preview. */
  analyzerImplementationTreeHash: string;
  /** Reconciliation implementation and test tree hash observed during preview. */
  reconciliationImplementationTreeHash: string;
  /** Tracked analyzer-input snapshot hash observed during preview. */
  architectureInputSnapshotHash: string;
  /** Exact generic transaction plan containing the validated replacement bytes. */
  transactionPlan: RepositoryFileTransactionPlan;
  /** Secret-safe review summary. */
  summary: ArchitectureReconciliationSummary;
}

/** Replaceable orchestration boundaries used by production and isolated tests. */
export interface ArchitectureReconciliationDependencies {
  /** Filesystem adapter shared by preview reads and the transaction. */
  fileOperations: RepositoryFileTransactionOperations;
  /** Strictly parses fixed manifest bytes. */
  parseManifest(source: string): AnalyzerReconciliationManifest;
  /** Hashes the canonical parsed manifest. */
  hashManifest(manifest: AnalyzerReconciliationManifest): string;
  /** Selects the complete tracked source set analyzed by policy. */
  selectSourcePaths(
    repoRoot: string,
  ): readonly string[] | Promise<readonly string[]>;
  /** Selects all tracked source and resolution files bound by the input snapshot. */
  listArchitectureInputPaths(
    repoRoot: string,
    sourcePaths: readonly string[],
  ): readonly string[] | Promise<readonly string[]>;
  /** Loads exact workspace export targets used by analyzer resolution. */
  loadWorkspaceTargets(repoRoot: string): Promise<WorkspaceModuleTargets>;
  /** Runs the analyzer directly under the proposed policy. */
  analyzeSources(
    options: AnalyzeArchitectureSourcesOptions,
  ): Promise<ArchitectureAnalysisResult>;
  /** Computes the frozen analyzer implementation tree hash. */
  computeAnalyzerImplementationTreeHash(repoRoot: string): Promise<string>;
  /** Computes the reviewed reconciliation implementation and test tree hash. */
  computeReconciliationImplementationTreeHash(
    repoRoot: string,
  ): Promise<string>;
  /** Validates historical provenance and the complete proposed state. */
  validateReconciliation(
    input: ValidateAnalyzerReconciliationInput,
  ): AnalyzerReconciliationValidationSummary;
  /** Creates the mutation-free generic file transaction preview. */
  previewTransaction: typeof previewRepositoryFileTransaction;
  /** Applies the exact generic file transaction after wrapper validation. */
  applyTransaction: typeof applyRepositoryFileTransaction;
}

/** Inputs accepted by the mutation-free reconciliation preview. */
export interface PreviewArchitectureReconciliationOptions {
  /** Absolute repository root containing all fixed reconciliation inputs. */
  repoRoot: string;
  /** Optional dependency overrides used by isolated tests. */
  dependencies?: Partial<ArchitectureReconciliationDependencies>;
}

/** Inputs accepted by the explicitly acknowledged reconciliation apply. */
export interface ApplyArchitectureReconciliationOptions {
  /** Exact preview whose candidate bytes may be committed. */
  preview: ArchitectureReconciliationPreview;
  /** Explicit consent required before transaction staging. */
  acknowledge: boolean;
  /** Reviewed portable wrapper hash that must match the preview. */
  expectedReconciliationPlanHash: string;
  /** Optional dependency overrides used by isolated tests. */
  dependencies?: Partial<ArchitectureReconciliationDependencies>;
}

/** Result of applying or declining the exact reconciliation preview. */
export interface ArchitectureReconciliationApplyResult {
  /** Secret-safe summary of the exact reviewed candidate. */
  summary: ArchitectureReconciliationSummary;
  /** Generic transaction outcome, including committed cleanup warnings. */
  transactionOutcome: RepositoryFileTransactionOutcome;
}

/** Converts JSON-compatible data into deterministic key-sorted compact JSON. */
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
  return JSON.stringify(value);
}

/** Hashes exact UTF-8 text bytes with SHA-256. */
function textSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Hashes canonical JSON-compatible data with SHA-256. */
function canonicalSha256(value: unknown): string {
  return textSha256(canonicalJson(value));
}

/** Lists tracked resolver inputs in addition to the already selected source set. */
function listTrackedArchitectureInputPaths(
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
    ...new Set([...sourcePaths, ...stdout.split("\n").filter(Boolean)]),
  ].sort(compareStableStrings);
}

/** Resolves complete dependency defaults without allowing undefined functions. */
function resolveDependencies(
  overrides: Partial<ArchitectureReconciliationDependencies> | undefined,
): ArchitectureReconciliationDependencies {
  const fileOperations =
    overrides?.fileOperations ??
    createNodeRepositoryFileTransactionOperations();
  return {
    fileOperations,
    parseManifest:
      overrides?.parseManifest ??
      ((source) =>
        analyzerReconciliationManifestSchema.parse(JSON.parse(source))),
    hashManifest: overrides?.hashManifest ?? hashAnalyzerReconciliationManifest,
    selectSourcePaths:
      overrides?.selectSourcePaths ??
      ((repoRoot) => selectArchitectureSourceFiles({ repoRoot }, repoRoot)),
    listArchitectureInputPaths:
      overrides?.listArchitectureInputPaths ??
      listTrackedArchitectureInputPaths,
    loadWorkspaceTargets:
      overrides?.loadWorkspaceTargets ?? loadWorkspaceModuleTargets,
    analyzeSources: overrides?.analyzeSources ?? analyzeArchitectureSources,
    computeAnalyzerImplementationTreeHash:
      overrides?.computeAnalyzerImplementationTreeHash ??
      computeAnalyzerImplementationTreeSha256,
    computeReconciliationImplementationTreeHash:
      overrides?.computeReconciliationImplementationTreeHash ??
      computeReconciliationImplementationTreeSha256,
    validateReconciliation:
      overrides?.validateReconciliation ?? validateAnalyzerReconciliation,
    previewTransaction:
      overrides?.previewTransaction ?? previewRepositoryFileTransaction,
    applyTransaction:
      overrides?.applyTransaction ?? applyRepositoryFileTransaction,
  };
}

/** Reads one fixed repository-relative file through the injected adapter. */
async function readRepositoryFile(
  repoRoot: string,
  repositoryPath: string,
  fileOperations: RepositoryFileTransactionOperations,
): Promise<string> {
  if (
    isAbsolute(repositoryPath) ||
    repositoryPath.includes("\\") ||
    repositoryPath
      .split("/")
      .some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(
      `Invalid repository-relative reconciliation path: ${repositoryPath}`,
    );
  }
  return fileOperations.readFile(resolve(repoRoot, repositoryPath));
}

/** Parses strict historical baseline bytes and verifies their domains. */
function parseHistoricalBaselines(
  databaseSource: string,
  providerSource: string,
): ArchitectureBaselines {
  const database = architectureBaselineSchema.parse(JSON.parse(databaseSource));
  const provider = architectureBaselineSchema.parse(JSON.parse(providerSource));
  if (database.domain !== "database" || provider.domain !== "provider") {
    throw new Error(
      "Historical reconciliation baselines declare incorrect domains",
    );
  }
  return { database, provider };
}

/** Returns the exact finding fields of one reviewed baseline entry. */
function findingFromEntry(entry: BaselineEntry): ArchitectureFinding {
  const { owner: _owner, rationale: _rationale, ...finding } = entry;
  return architectureFindingSchema.parse(finding);
}

/** Creates an exact, metadata-preserving proposed policy. */
function proposedConfig(
  currentConfig: ArchitectureConfig,
  manifest: AnalyzerReconciliationManifest,
): ArchitectureConfig {
  const additions = manifest.exactExceptionAdditions.map(
    (addition) => addition.exception,
  );
  const existingKeys = new Set(
    currentConfig.exactExceptions.map(
      (exception) => `${exception.ruleId}\0${exception.sourcePath}`,
    ),
  );
  for (const exception of additions) {
    const key = `${exception.ruleId}\0${exception.sourcePath}`;
    if (existingKeys.has(key)) {
      throw new Error(
        `Reconciliation exact exception already exists: ${exception.ruleId} ${exception.sourcePath}`,
      );
    }
    existingKeys.add(key);
  }
  return architectureConfigSchema.parse({
    ...currentConfig,
    exactExceptions: [...currentConfig.exactExceptions, ...additions],
  });
}

/** Compares complete finding arrays after canonical instance ordering. */
function assertExactFindingSet(
  actual: readonly ArchitectureFinding[],
  historicalBaselines: ArchitectureBaselines,
  manifest: AnalyzerReconciliationManifest,
): void {
  const expected = [
    ...historicalBaselines.database.entries.map(findingFromEntry),
    ...historicalBaselines.provider.entries.map(findingFromEntry),
    ...manifest.productionAdditions.map(findingFromEntry),
  ].sort((left, right) =>
    compareStableStrings(left.instanceKey, right.instanceKey),
  );
  const sortedActual = [...actual].sort((left, right) =>
    compareStableStrings(left.instanceKey, right.instanceKey),
  );
  if (
    new Set(expected.map((finding) => finding.instanceKey)).size !==
      expected.length ||
    canonicalJson(sortedActual) !== canonicalJson(expected)
  ) {
    throw new Error(
      "Current analyzer finding set does not exactly equal historical entries plus manifest production additions",
    );
  }
}

/** Constructs strict final baselines with exact preserved and reviewed metadata. */
function createFinalBaselines(
  config: ArchitectureConfig,
  historicalBaselines: ArchitectureBaselines,
  manifest: AnalyzerReconciliationManifest,
): ArchitectureBaselines {
  const createDomain = (
    domain: ArchitectureBaseline["domain"],
  ): ArchitectureBaseline =>
    architectureBaselineSchema.parse({
      schemaVersion: 1,
      domain,
      rulesetHash: computeRulesetHash(config, domain),
      entries: [
        ...historicalBaselines[domain].entries,
        ...manifest.productionAdditions.filter(
          (entry) => entry.domain === domain,
        ),
      ].sort((left, right) =>
        compareStableStrings(left.instanceKey, right.instanceKey),
      ),
    });
  return {
    database: createDomain("database"),
    provider: createDomain("provider"),
  };
}

/** Serializes a strict ownership map into deterministic pretty JSON. */
function serializeArchitectureConfig(config: ArchitectureConfig): string {
  return `${JSON.stringify(architectureConfigSchema.parse(config), null, 2)}\n`;
}

/** Computes the portable path-and-byte snapshot for all analyzer inputs. */
async function computeArchitectureInputSnapshot(
  repoRoot: string,
  inputPaths: readonly string[],
  fileOperations: RepositoryFileTransactionOperations,
): Promise<string> {
  const sortedPaths = [...new Set(inputPaths)].sort(compareStableStrings);
  const files = await Promise.all(
    sortedPaths.map(async (path) => ({
      path,
      sha256: textSha256(
        await readRepositoryFile(repoRoot, path, fileOperations),
      ),
    })),
  );
  return canonicalSha256(files);
}

/** Computes the portable wrapper hash over every reviewed reconciliation input. */
function computeReconciliationPlanHash(input: {
  manifestHash: string;
  transactionPlanHash: string;
  analyzerImplementationTreeHash: string;
  reconciliationImplementationTreeHash: string;
  architectureInputSnapshotHash: string;
}): string {
  for (const value of Object.values(input)) {
    if (!SHA256_PATTERN.test(value)) {
      throw new Error("Reconciliation plan inputs must be SHA-256 digests");
    }
  }
  return canonicalSha256({ schemaVersion: 1, ...input });
}

/** Selects named before or after hashes from the generic transaction plan. */
function transactionFileHashes(
  plan: RepositoryFileTransactionPlan,
  field: "afterHash" | "beforeHash",
): ArchitectureReconciliationFileHashes {
  const hashes = new Map(
    plan.replacements.map((replacement) => [
      replacement.id,
      replacement[field],
    ]),
  );
  const ownershipMap = hashes.get("ownership-map");
  const databaseBaseline = hashes.get("database-baseline");
  const providerBaseline = hashes.get("provider-baseline");
  if (!ownershipMap || !databaseBaseline || !providerBaseline) {
    throw new Error(
      "Reconciliation transaction is missing a required document hash",
    );
  }
  return { ownershipMap, databaseBaseline, providerBaseline };
}

/** Verifies that generic preview observed the exact bytes used to build the candidate. */
function assertTransactionObservedCurrentBytes(
  plan: RepositoryFileTransactionPlan,
  currentConfigSource: string,
  historicalDatabaseBaselineSource: string,
  historicalProviderBaselineSource: string,
): void {
  const observed = transactionFileHashes(plan, "beforeHash");
  const expected = {
    ownershipMap: textSha256(currentConfigSource),
    databaseBaseline: textSha256(historicalDatabaseBaselineSource),
    providerBaseline: textSha256(historicalProviderBaselineSource),
  };
  if (canonicalJson(observed) !== canonicalJson(expected)) {
    throw new Error(
      "Coordinated policy or baseline bytes changed while reconciliation preview was built",
    );
  }
}

/** Creates a secret-safe summary from validated state and exact plan hashes. */
function createSummary(input: {
  reconciliationPlanHash: string;
  manifestHash: string;
  transactionPlan: RepositoryFileTransactionPlan;
  analyzerImplementationTreeHash: string;
  reconciliationImplementationTreeHash: string;
  architectureInputSnapshotHash: string;
  validation: AnalyzerReconciliationValidationSummary;
  config: ArchitectureConfig;
  exactExceptions: readonly ExactException[];
}): ArchitectureReconciliationSummary {
  return {
    schemaVersion: 1,
    reconciliationPlanHash: input.reconciliationPlanHash,
    manifestHash: input.manifestHash,
    transactionPlanHash: input.transactionPlan.planHash,
    analyzerImplementationTreeHash: input.analyzerImplementationTreeHash,
    reconciliationImplementationTreeHash:
      input.reconciliationImplementationTreeHash,
    architectureInputSnapshotHash: input.architectureInputSnapshotHash,
    beforeFileHashes: transactionFileHashes(
      input.transactionPlan,
      "beforeHash",
    ),
    proposedFileHashes: transactionFileHashes(
      input.transactionPlan,
      "afterHash",
    ),
    rulesetHashes: {
      database: computeRulesetHash(input.config, "database"),
      provider: computeRulesetHash(input.config, "provider"),
    },
    exactExceptionPairs: input.exactExceptions.map((exception) => ({
      ruleId: exception.ruleId,
      sourcePath: exception.sourcePath,
    })),
    counts: {
      databaseEntries: input.validation.databaseEntries,
      providerEntries: input.validation.providerEntries,
      productionAdditions: input.validation.productionAdditions,
      exactExceptionAdditions: input.validation.exactExceptionAdditions,
      coveredTestFindings: input.validation.coveredTestFindings,
      removals: 0,
      renames: 0,
    },
  };
}

/**
 * Builds and validates the complete three-file reconciliation without mutations.
 * @param options Absolute repository root and optional isolated dependencies.
 * @returns Exact transaction plan plus a secret-safe, portable review summary.
 */
export async function previewArchitectureReconciliation(
  options: PreviewArchitectureReconciliationOptions,
): Promise<ArchitectureReconciliationPreview> {
  const dependencies = resolveDependencies(options.dependencies);
  const manifestSource = await readRepositoryFile(
    options.repoRoot,
    RECONCILIATION_MANIFEST_PATH,
    dependencies.fileOperations,
  );
  const manifest = dependencies.parseManifest(manifestSource);
  const manifestHash = dependencies.hashManifest(manifest);
  const currentConfigSource = await readRepositoryFile(
    options.repoRoot,
    ARCHITECTURE_OWNERSHIP_MAP_PATH,
    dependencies.fileOperations,
  );
  const currentConfig = architectureConfigSchema.parse(
    JSON.parse(currentConfigSource),
  );
  const historicalDatabaseBaselineSource = await readRepositoryFile(
    options.repoRoot,
    currentConfig.baselineFiles.database,
    dependencies.fileOperations,
  );
  const historicalProviderBaselineSource = await readRepositoryFile(
    options.repoRoot,
    currentConfig.baselineFiles.provider,
    dependencies.fileOperations,
  );
  const historicalBaselines = parseHistoricalBaselines(
    historicalDatabaseBaselineSource,
    historicalProviderBaselineSource,
  );
  const directReviewSource = await readRepositoryFile(
    options.repoRoot,
    RECONCILIATION_DIRECT_REVIEW_PATH,
    dependencies.fileOperations,
  );
  const denominatorDiffAuditSource = await readRepositoryFile(
    options.repoRoot,
    RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
    dependencies.fileOperations,
  );
  const reviewEvidenceSources = Object.fromEntries(
    await Promise.all(
      Object.entries(RECONCILIATION_REVIEW_EVIDENCE_PATHS).map(
        async ([role, path]) => [
          role,
          await readRepositoryFile(
            options.repoRoot,
            path,
            dependencies.fileOperations,
          ),
        ],
      ),
    ),
  ) as ValidateAnalyzerReconciliationInput["reviewEvidenceSources"];
  const config = proposedConfig(currentConfig, manifest);
  const sourcePaths = [
    ...(await dependencies.selectSourcePaths(options.repoRoot)),
  ];
  const selectedInputPaths = await dependencies.listArchitectureInputPaths(
    options.repoRoot,
    sourcePaths,
  );
  const architectureInputPaths = [
    ...new Set([
      ...selectedInputPaths,
      RECONCILIATION_DIRECT_REVIEW_PATH,
      RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
      ...Object.values(RECONCILIATION_REVIEW_EVIDENCE_PATHS),
    ]),
  ].sort(compareStableStrings);
  const architectureInputSnapshotHash = await computeArchitectureInputSnapshot(
    options.repoRoot,
    architectureInputPaths,
    dependencies.fileOperations,
  );
  const analyzerImplementationTreeHash =
    await dependencies.computeAnalyzerImplementationTreeHash(options.repoRoot);
  const reconciliationImplementationTreeHash =
    await dependencies.computeReconciliationImplementationTreeHash(
      options.repoRoot,
    );
  const workspaceTargets = await dependencies.loadWorkspaceTargets(
    options.repoRoot,
  );
  const analysis = await dependencies.analyzeSources({
    repoRoot: options.repoRoot,
    sourcePaths,
    config,
    workspaceTargets,
  });
  if (analysis.parseErrors.length > 0) {
    throw new Error(
      `Architecture reconciliation analyzer errors: ${analysis.parseErrors.length}`,
    );
  }
  if (canonicalJson(analysis.sourcePaths) !== canonicalJson(sourcePaths)) {
    throw new Error("Architecture reconciliation analyzer source set changed");
  }
  const analyzerImplementationTreeHashAfter =
    await dependencies.computeAnalyzerImplementationTreeHash(options.repoRoot);
  if (analyzerImplementationTreeHashAfter !== analyzerImplementationTreeHash) {
    throw new Error(
      "Analyzer implementation changed while reconciliation preview was built",
    );
  }
  const reconciliationImplementationTreeHashAfter =
    await dependencies.computeReconciliationImplementationTreeHash(
      options.repoRoot,
    );
  if (
    reconciliationImplementationTreeHashAfter !==
    reconciliationImplementationTreeHash
  ) {
    throw new Error(
      "Reconciliation implementation changed while preview was built",
    );
  }
  const architectureInputSnapshotHashAfter =
    await computeArchitectureInputSnapshot(
      options.repoRoot,
      architectureInputPaths,
      dependencies.fileOperations,
    );
  if (architectureInputSnapshotHashAfter !== architectureInputSnapshotHash) {
    throw new Error(
      "Tracked architecture inputs changed while reconciliation preview was built",
    );
  }
  assertExactFindingSet(analysis.findings, historicalBaselines, manifest);
  const baselines = createFinalBaselines(config, historicalBaselines, manifest);
  const validation = dependencies.validateReconciliation({
    manifest,
    config,
    baselines,
    analyzerImplementationTreeSha256: analyzerImplementationTreeHash,
    reconciliationImplementationTreeSha256:
      reconciliationImplementationTreeHash,
    directReviewSource,
    historicalDatabaseBaselineSource,
    historicalProviderBaselineSource,
    denominatorDiffAuditSource,
    reviewEvidenceSources,
  });
  if (validation.manifestSha256 !== manifestHash) {
    throw new Error(
      "Reconciliation validator returned a different manifest hash",
    );
  }
  const transactionPlan = await dependencies.previewTransaction({
    repoRoot: options.repoRoot,
    replacements: [
      {
        id: "ownership-map",
        repositoryPath: ARCHITECTURE_OWNERSHIP_MAP_PATH,
        contents: serializeArchitectureConfig(config),
      },
      {
        id: "database-baseline",
        repositoryPath: currentConfig.baselineFiles.database,
        contents: serializeArchitectureBaseline(baselines.database),
      },
      {
        id: "provider-baseline",
        repositoryPath: currentConfig.baselineFiles.provider,
        contents: serializeArchitectureBaseline(baselines.provider),
      },
    ],
    fileOperations: dependencies.fileOperations,
  });
  assertTransactionObservedCurrentBytes(
    transactionPlan,
    currentConfigSource,
    historicalDatabaseBaselineSource,
    historicalProviderBaselineSource,
  );
  const reconciliationPlanHash = computeReconciliationPlanHash({
    manifestHash,
    transactionPlanHash: transactionPlan.planHash,
    analyzerImplementationTreeHash,
    reconciliationImplementationTreeHash,
    architectureInputSnapshotHash,
  });
  const addedExceptions = manifest.exactExceptionAdditions.map(
    (addition) => addition.exception,
  );
  const summary = createSummary({
    reconciliationPlanHash,
    manifestHash,
    transactionPlan,
    analyzerImplementationTreeHash,
    reconciliationImplementationTreeHash,
    architectureInputSnapshotHash,
    validation,
    config,
    exactExceptions: addedExceptions,
  });
  return {
    schemaVersion: 1,
    reconciliationPlanHash,
    manifestHash,
    analyzerImplementationTreeHash,
    reconciliationImplementationTreeHash,
    architectureInputSnapshotHash,
    transactionPlan,
    summary,
  };
}

/** Strictly parses one post-write reconciliation document. */
function validateCommittedDocument(id: string, contents: string): void {
  const parsed: unknown = JSON.parse(contents);
  if (id === "ownership-map") {
    architectureConfigSchema.parse(parsed);
    return;
  }
  if (id === "database-baseline" || id === "provider-baseline") {
    const baseline = architectureBaselineSchema.parse(parsed);
    const expectedDomain = id === "database-baseline" ? "database" : "provider";
    if (baseline.domain !== expectedDomain) {
      throw new Error(`Committed ${id} declares the wrong domain`);
    }
    return;
  }
  throw new Error(`Unknown reconciliation transaction document: ${id}`);
}

/**
 * Revalidates immutable wrapper inputs and applies the exact previewed transaction.
 * @param options Exact preview, explicit acknowledgement, wrapper hash, and dependencies.
 * @returns Secret-safe summary plus the generic transaction outcome.
 */
export async function applyArchitectureReconciliation(
  options: ApplyArchitectureReconciliationOptions,
): Promise<ArchitectureReconciliationApplyResult> {
  const dependencies = resolveDependencies(options.dependencies);
  if (
    options.expectedReconciliationPlanHash !==
      options.preview.reconciliationPlanHash ||
    options.preview.summary.reconciliationPlanHash !==
      options.preview.reconciliationPlanHash
  ) {
    throw new Error(
      "Acknowledged reconciliation plan hash does not match preview",
    );
  }
  if (!options.acknowledge) {
    const transactionOutcome = await dependencies.applyTransaction({
      plan: options.preview.transactionPlan,
      acknowledge: false,
      expectedPlanHash: options.preview.transactionPlan.planHash,
      fileOperations: dependencies.fileOperations,
    });
    return { summary: options.preview.summary, transactionOutcome };
  }

  const repoRoot = options.preview.transactionPlan.repoRoot;
  const freshPreview = await previewArchitectureReconciliation({
    repoRoot,
    dependencies,
  });
  if (canonicalJson(freshPreview) !== canonicalJson(options.preview)) {
    throw new Error(
      "Reconciliation preview or reviewed inputs changed before acknowledged apply",
    );
  }

  const transactionOptions: ApplyRepositoryFileTransactionOptions = {
    plan: freshPreview.transactionPlan,
    acknowledge: true,
    expectedPlanHash: freshPreview.transactionPlan.planHash,
    fileOperations: dependencies.fileOperations,
    validate: (replacement, contents) =>
      validateCommittedDocument(replacement.id, contents),
  };
  const transactionOutcome =
    await dependencies.applyTransaction(transactionOptions);
  return { summary: freshPreview.summary, transactionOutcome };
}

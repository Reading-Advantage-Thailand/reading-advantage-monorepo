import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  architectureBaselineSchema,
  architectureConfigSchema,
  type ArchitectureBaseline,
  type ArchitectureConfig,
} from "./contracts.js";
import { inventoryRepository, proposeDirectViolations } from "./inventory.js";
import {
  serializeArchitectureBaseline,
  validateArchitectureBaseline,
} from "./baseline.js";
import { loadOwnershipMap } from "./ownership-map.js";
import { loadWorkspaceModuleTargets } from "./workspace-resolution.js";
import { checkArchitectureRepository } from "./architecture-check.js";
import type { ArchitectureCheckReport } from "./architecture-check.js";
import {
  analyzerReconciliationManifestSchema,
  computeAnalyzerImplementationTreeSha256,
  computeReconciliationImplementationTreeSha256,
  RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
  RECONCILIATION_MANIFEST_PATH,
  RECONCILIATION_REVIEW_EVIDENCE_PATHS,
  validateAnalyzerReconciliation,
  type AnalyzerReconciliationManifest,
  type AnalyzerReconciliationValidationSummary,
  type ValidateAnalyzerReconciliationInput,
} from "./reconciliation-manifest.js";

/** Deterministic result returned after validating both committed baselines. */
export interface BaselineValidationSummary {
  /** Version of the validation result contract. */
  schemaVersion: 1;
  /** Number of tracked source files parsed by the direct inventory. */
  filesScanned: number;
  /** Number of reviewed database violations frozen in the baseline. */
  databaseEntries: number;
  /** Number of reviewed provider violations frozen in the baseline. */
  providerEntries: number;
  /** Canonical database ruleset hash. */
  databaseRulesetHash: string;
  /** Canonical provider ruleset hash. */
  providerRulesetHash: string;
  /** Evidence model validated by this invocation. */
  mode: "analyzer-complete" | "historical-direct";
  /** Accepted reconciliation manifest hash in analyzer-complete mode. */
  reconciliationManifestHash?: string;
}

/** Replaceable analyzer-complete validation boundaries used by isolated tests. */
export interface BaselineValidationDependencies {
  /** Runs the normal analyzer and ratchet under the accepted policy. */
  checkRepository(
    repoRoot: string,
    config: ArchitectureConfig,
  ): Promise<ArchitectureCheckReport>;
  /** Computes the frozen analyzer implementation hash. */
  computeAnalyzerTree(repoRoot: string): Promise<string>;
  /** Computes the reviewed reconciliation implementation/test hash. */
  computeReconciliationTree(repoRoot: string): Promise<string>;
  /** Strictly parses accepted manifest bytes. */
  parseManifest(source: string): AnalyzerReconciliationManifest;
  /** Validates provenance, final state, and reviewer receipts. */
  validateReconciliation(
    input: ValidateAnalyzerReconciliationInput,
  ): AnalyzerReconciliationValidationSummary;
}

/** Resolves production validation defaults without undefined functions. */
function resolveDependencies(
  overrides: Partial<BaselineValidationDependencies> | undefined,
): BaselineValidationDependencies {
  return {
    checkRepository:
      overrides?.checkRepository ??
      ((root, config) =>
        checkArchitectureRepository({ repoRoot: root, config })),
    computeAnalyzerTree:
      overrides?.computeAnalyzerTree ?? computeAnalyzerImplementationTreeSha256,
    computeReconciliationTree:
      overrides?.computeReconciliationTree ??
      computeReconciliationImplementationTreeSha256,
    parseManifest:
      overrides?.parseManifest ??
      ((source) =>
        analyzerReconciliationManifestSchema.parse(JSON.parse(source))),
    validateReconciliation:
      overrides?.validateReconciliation ?? validateAnalyzerReconciliation,
  };
}

/** Returns true only for a missing-path filesystem error. */
function isMissingPath(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

/** Reads an optional UTF-8 file while failing closed on non-missing errors. */
async function readOptionalFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isMissingPath(error)) return undefined;
    throw error;
  }
}

/**
 * Reads and parses one strict architecture baseline file.
 * @param repoRoot Absolute repository root used to resolve the configured path.
 * @param path Exact repository-relative baseline path from validated policy.
 * @returns Parsed version-one architecture baseline.
 * @throws When the file is unreadable, invalid JSON, or contract-invalid.
 */
async function readBaseline(
  repoRoot: string,
  path: string,
): Promise<ArchitectureBaseline> {
  const source = await readFile(resolve(repoRoot, path), "utf8");
  return architectureBaselineSchema.parse(JSON.parse(source));
}

/**
 * Validates the accepted analyzer-complete manifest, baselines, and live checker.
 * @param repoRoot Repository root containing the coordinated accepted state.
 * @param manifestSource Exact accepted reconciliation manifest bytes.
 * @returns Accepted counts, policy hashes, and manifest binding.
 * @throws When provenance, reviewer evidence, historical reconstruction, or live analysis drifts.
 */
async function validateAnalyzerCompleteBaselines(
  repoRoot: string,
  manifestSource: string,
  dependencies: BaselineValidationDependencies,
): Promise<BaselineValidationSummary> {
  const manifest = dependencies.parseManifest(manifestSource);
  const configSource = await readFile(
    resolve(
      repoRoot,
      "packages/architecture-enforcement/src/config/ownership-map.v1.json",
    ),
    "utf8",
  );
  const config = architectureConfigSchema.parse(JSON.parse(configSource));
  const database = await readBaseline(repoRoot, config.baselineFiles.database);
  const provider = await readBaseline(repoRoot, config.baselineFiles.provider);
  const historicalInstances = new Set(
    manifest.historical.baselineProofs.map((proof) => proof.instanceKey),
  );
  const historicalDatabase = architectureBaselineSchema.parse({
    schemaVersion: 1,
    domain: "database",
    rulesetHash: manifest.historical.rulesetHashes.database,
    entries: database.entries.filter((entry) =>
      historicalInstances.has(entry.instanceKey),
    ),
  });
  const historicalProvider = architectureBaselineSchema.parse({
    schemaVersion: 1,
    domain: "provider",
    rulesetHash: manifest.historical.rulesetHashes.provider,
    entries: provider.entries.filter((entry) =>
      historicalInstances.has(entry.instanceKey),
    ),
  });
  const directReviewSource = await readFile(
    resolve(repoRoot, manifest.historical.directReviewPath),
    "utf8",
  );
  const denominatorDiffAuditSource = await readFile(
    resolve(repoRoot, RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH),
    "utf8",
  );
  const reviewEvidenceSources = Object.fromEntries(
    await Promise.all(
      Object.entries(RECONCILIATION_REVIEW_EVIDENCE_PATHS).map(
        async ([role, path]) => [
          role,
          await readFile(resolve(repoRoot, path), "utf8"),
        ],
      ),
    ),
  ) as Parameters<
    typeof validateAnalyzerReconciliation
  >[0]["reviewEvidenceSources"];
  const accepted = dependencies.validateReconciliation({
    manifest,
    config,
    baselines: { database, provider },
    analyzerImplementationTreeSha256:
      await dependencies.computeAnalyzerTree(repoRoot),
    reconciliationImplementationTreeSha256:
      await dependencies.computeReconciliationTree(repoRoot),
    directReviewSource,
    historicalDatabaseBaselineSource:
      serializeArchitectureBaseline(historicalDatabase),
    historicalProviderBaselineSource:
      serializeArchitectureBaseline(historicalProvider),
    denominatorDiffAuditSource,
    reviewEvidenceSources,
  });
  const report = await dependencies.checkRepository(repoRoot, config);
  if (
    report.status !== "clean" ||
    report.parseErrors.length !== 0 ||
    report.comparison?.status !== "clean"
  ) {
    throw new Error(
      `Analyzer-complete baseline checker is not clean: ${report.status}`,
    );
  }
  return {
    schemaVersion: 1,
    mode: "analyzer-complete",
    filesScanned: report.filesScanned,
    databaseEntries: accepted.databaseEntries,
    providerEntries: accepted.providerEntries,
    databaseRulesetHash: database.rulesetHash,
    providerRulesetHash: provider.rulesetHash,
    reconciliationManifestHash: accepted.manifestSha256,
  };
}

/**
 * Validates both committed baselines against current tracked direct violations.
 * @param repoRoot Repository root containing policy, sources, and baselines.
 * @returns Deterministic entry counts and accepted ruleset hashes.
 * @throws When source parsing, exception review, policy, or snapshots drift.
 */
export async function validateCommittedBaselines(
  repoRoot: string,
  overrides?: Partial<BaselineValidationDependencies>,
): Promise<BaselineValidationSummary> {
  const manifestSource = await readOptionalFile(
    resolve(repoRoot, RECONCILIATION_MANIFEST_PATH),
  );
  if (manifestSource !== undefined) {
    return validateAnalyzerCompleteBaselines(
      repoRoot,
      manifestSource,
      resolveDependencies(overrides),
    );
  }
  const config = loadOwnershipMap();
  const workspaceTargets = await loadWorkspaceModuleTargets(repoRoot);
  const inventory = await inventoryRepository({ repoRoot });
  if (inventory.parseErrors.length > 0) {
    const first = inventory.parseErrors[0]!;
    throw new Error(
      `Architecture inventory has ${inventory.parseErrors.length} parse errors; first is ${first.sourcePath}:${first.line}:${first.column} ${first.code}`,
    );
  }
  const candidates = proposeDirectViolations(inventory, config);
  const pendingExceptions = candidates.filter(
    (candidate) => candidate.proposedDisposition === "exact-exception-review",
  );
  if (pendingExceptions.length > 0) {
    const first = pendingExceptions[0]!;
    throw new Error(
      `${pendingExceptions.length} exact test or fixture exceptions remain unreviewed; first is ${first.ruleId} ${first.sourcePath}`,
    );
  }

  const database = validateArchitectureBaseline(
    await readBaseline(repoRoot, config.baselineFiles.database),
    candidates,
    config,
    "database",
    workspaceTargets,
  );
  const provider = validateArchitectureBaseline(
    await readBaseline(repoRoot, config.baselineFiles.provider),
    candidates,
    config,
    "provider",
    workspaceTargets,
  );
  return {
    schemaVersion: 1,
    mode: "historical-direct",
    filesScanned: inventory.filesScanned,
    databaseEntries: database.entries.length,
    providerEntries: provider.entries.length,
    databaseRulesetHash: database.rulesetHash,
    providerRulesetHash: provider.rulesetHash,
  };
}

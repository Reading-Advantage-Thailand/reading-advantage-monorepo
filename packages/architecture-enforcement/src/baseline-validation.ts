import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  architectureBaselineSchema,
  type ArchitectureBaseline,
} from "./contracts.js";
import { inventoryRepository, proposeDirectViolations } from "./inventory.js";
import { validateArchitectureBaseline } from "./baseline.js";
import { loadOwnershipMap } from "./ownership-map.js";
import { loadWorkspaceModuleTargets } from "./workspace-resolution.js";

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
 * Validates both committed baselines against current tracked direct violations.
 * @param repoRoot Repository root containing policy, sources, and baselines.
 * @returns Deterministic entry counts and accepted ruleset hashes.
 * @throws When source parsing, exception review, policy, or snapshots drift.
 */
export async function validateCommittedBaselines(
  repoRoot: string,
): Promise<BaselineValidationSummary> {
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
    filesScanned: inventory.filesScanned,
    databaseEntries: database.entries.length,
    providerEntries: provider.entries.length,
    databaseRulesetHash: database.rulesetHash,
    providerRulesetHash: provider.rulesetHash,
  };
}

import { randomUUID } from "node:crypto";
import {
  constants as fsConstants,
  copyFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import {
  checkArchitectureRepository,
  readArchitectureBaselines,
  type ArchitectureCheckReport,
  type CheckArchitectureRepositoryOptions,
} from "./architecture-check.js";
import { computeRulesetHash } from "./baseline.js";
import {
  architectureBaselineSchema,
  baselineEntrySchema,
  type ArchitectureBaseline,
  type ArchitectureConfig,
  type ArchitectureFinding,
  type BaselineEntry,
} from "./contracts.js";
import { loadOwnershipMap } from "./ownership-map.js";
import {
  compareArchitectureDebt,
  type ArchitectureBaselines,
  type ArchitectureComparison,
} from "./ratchet.js";
import { compareStableStrings } from "./stable-order.js";

/** Review metadata required to accept newly introduced architecture debt. */
export interface NewDebtReviewMetadata {
  /** Accountable lowercase owner identifier stored on each new entry. */
  owner: string;
  /** Reviewed reason explaining why the new debt is temporarily accepted. */
  rationale: string;
}

/** Inputs for constructing replacement baselines without writing them. */
export interface CreateUpdatedArchitectureBaselinesOptions {
  /** Validated architecture policy whose hashes the baselines record. */
  config: ArchitectureConfig;
  /** Existing reviewed baselines whose metadata must be preserved. */
  baselines: ArchitectureBaselines;
  /** Current analyzer findings that become the complete replacement set. */
  findings: readonly ArchitectureFinding[];
  /** Review metadata required when the current findings contain additions. */
  newDebtMetadata?: NewDebtReviewMetadata;
}

/** Result of an explicit baseline update command. */
export interface ArchitectureBaselineUpdateResult {
  /** Version of the update result contract. */
  schemaVersion: 1;
  /** Read-only checker report shown before any possible write. */
  report: ArchitectureCheckReport;
  /** Whether both replacement baselines were durably written. */
  wroteBaselines: boolean;
}

/** Options accepted by the explicit baseline update operation. */
export interface UpdateArchitectureBaselinesOptions extends CheckArchitectureRepositoryOptions {
  /** Explicit consent required before any baseline file can be written. */
  acknowledge: boolean;
  /** Review metadata applied only to genuinely new findings. */
  newDebtMetadata?: NewDebtReviewMetadata;
  /** Optional file-operation adapter used to verify transactional failure recovery. */
  fileOperations?: ArchitectureBaselineFileOperations;
}

/** Minimal filesystem operations required by the two-baseline replacement transaction. */
export interface ArchitectureBaselineFileOperations {
  /**
   * Copies one existing file without overwriting the destination.
   * @param source Existing file whose exact bytes are copied.
   * @param destination Exclusive backup path created by the transaction.
   * @returns A promise resolved after the backup is complete.
   */
  copyFile(source: string, destination: string): Promise<void>;
  /**
   * Atomically renames one staged file over its destination.
   * @param source Staged replacement or backup file.
   * @param destination Configured baseline destination.
   * @returns A promise resolved after the atomic rename completes.
   */
  rename(source: string, destination: string): Promise<void>;
  /**
   * Removes one transaction artifact.
   * @param path Staged or backup artifact to remove.
   * @returns A promise resolved after the path is removed.
   */
  unlink(path: string): Promise<void>;
  /**
   * Creates one private transaction artifact without overwriting a file.
   * @param path Exclusive staged-replacement path.
   * @param contents Canonically serialized baseline contents.
   * @returns A promise resolved after the staged file is written.
   */
  writeFile(path: string, contents: string): Promise<void>;
}

const nodeBaselineFileOperations: ArchitectureBaselineFileOperations = {
  copyFile: async (source, destination) => {
    await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
  },
  rename,
  unlink,
  writeFile: async (path, contents) => {
    await writeFile(path, contents, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
  },
};

/**
 * Finds one reviewed entry across both domain baselines.
 * @param baselines Reviewed database and provider baselines.
 * @returns Entries indexed by their exact instance identity.
 */
function reviewedEntriesByInstance(
  baselines: ArchitectureBaselines,
): Map<string, BaselineEntry> {
  return new Map(
    [...baselines.database.entries, ...baselines.provider.entries].map(
      (entry) => [entry.instanceKey, entry],
    ),
  );
}

/**
 * Maps moved current instances back to their reviewed metadata source.
 * @param comparison Architecture debt comparison containing detected renames.
 * @returns Current instance identities mapped to previous instance identities.
 */
function renameSourcesByCurrentInstance(
  comparison: ArchitectureComparison,
): Map<string, string> {
  return new Map(
    comparison.renames.map((renameRecord) => [
      renameRecord.currentInstanceKey,
      renameRecord.previousInstanceKey,
    ]),
  );
}

/**
 * Creates one reviewed baseline entry while preserving existing metadata.
 * @param finding Current analyzer finding to record.
 * @param reviewedByInstance Previously reviewed entries by instance identity.
 * @param renameSources Current instances mapped to prior reviewed instances.
 * @param newDebtMetadata Reviewer metadata used only for new findings.
 * @returns One strict reviewed baseline entry.
 * @throws When a new finding has no valid reviewer metadata.
 */
function reviewedEntryForFinding(
  finding: ArchitectureFinding,
  reviewedByInstance: ReadonlyMap<string, BaselineEntry>,
  renameSources: ReadonlyMap<string, string>,
  newDebtMetadata: NewDebtReviewMetadata | undefined,
): BaselineEntry {
  const reviewed = reviewedByInstance.get(
    renameSources.get(finding.instanceKey) ?? finding.instanceKey,
  );
  const metadata = reviewed ?? newDebtMetadata;
  if (!metadata) {
    throw new Error(
      `New architecture debt requires --owner and --rationale: ${finding.ruleId} ${finding.sourcePath}:${finding.line}:${finding.column}`,
    );
  }
  return baselineEntrySchema.parse({
    ...finding,
    owner: metadata.owner,
    rationale: metadata.rationale,
  });
}

/**
 * Creates one canonically sorted domain baseline.
 * @param domain Architecture domain whose findings are selected.
 * @param findings Complete current analyzer finding set.
 * @param config Validated architecture policy used to hash the ruleset.
 * @param reviewedByInstance Previously reviewed entries by instance identity.
 * @param renameSources Current instances mapped to prior reviewed instances.
 * @param newDebtMetadata Reviewer metadata used only for new findings.
 * @returns Strict replacement baseline for the selected domain.
 */
function createDomainBaseline(
  domain: ArchitectureBaseline["domain"],
  findings: readonly ArchitectureFinding[],
  config: ArchitectureConfig,
  reviewedByInstance: ReadonlyMap<string, BaselineEntry>,
  renameSources: ReadonlyMap<string, string>,
  newDebtMetadata: NewDebtReviewMetadata | undefined,
): ArchitectureBaseline {
  const entries = findings
    .filter((finding) => finding.domain === domain)
    .map((finding) =>
      reviewedEntryForFinding(
        finding,
        reviewedByInstance,
        renameSources,
        newDebtMetadata,
      ),
    )
    .sort((left, right) =>
      compareStableStrings(left.instanceKey, right.instanceKey),
    );
  return architectureBaselineSchema.parse({
    schemaVersion: 1,
    domain,
    rulesetHash: computeRulesetHash(config, domain),
    entries,
  });
}

/**
 * Builds complete replacement baselines while retaining exact and renamed metadata.
 * @param options Current findings, existing baselines, policy, and new-debt review.
 * @returns Strict canonical database and provider replacement baselines.
 * @throws When new findings lack valid owner and rationale metadata.
 */
export function createUpdatedArchitectureBaselines(
  options: CreateUpdatedArchitectureBaselinesOptions,
): ArchitectureBaselines {
  const comparison = compareArchitectureDebt({
    baselines: options.baselines,
    findings: options.findings,
  });
  const reviewedByInstance = reviewedEntriesByInstance(options.baselines);
  const renameSources = renameSourcesByCurrentInstance(comparison);
  return {
    database: createDomainBaseline(
      "database",
      options.findings,
      options.config,
      reviewedByInstance,
      renameSources,
      options.newDebtMetadata,
    ),
    provider: createDomainBaseline(
      "provider",
      options.findings,
      options.config,
      reviewedByInstance,
      renameSources,
      options.newDebtMetadata,
    ),
  };
}

/**
 * Serializes one strict baseline to stable pretty JSON.
 * @param baseline Strict architecture baseline to serialize.
 * @returns Canonical pretty JSON terminated by one newline.
 */
function serializeBaseline(baseline: ArchitectureBaseline): string {
  return `${JSON.stringify(architectureBaselineSchema.parse(baseline), null, 2)}\n`;
}

interface BaselineReplacement {
  backup: string;
  destination: string;
  staged: string;
  contents: string;
}

/**
 * Removes a transaction artifact while tolerating an already-consumed path.
 * @param fileOperations Filesystem adapter used by the transaction.
 * @param path Staged or backup path to remove.
 * @returns A promise resolved after removal or an absent-path result.
 * @throws When removal fails for a reason other than a missing path.
 */
async function removeTransactionArtifact(
  fileOperations: ArchitectureBaselineFileOperations,
  path: string,
): Promise<void> {
  try {
    await fileOperations.unlink(path);
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

/**
 * Restores both original baseline bytes after a replacement failure.
 * @param replacements Complete domain replacement descriptors with backups.
 * @param fileOperations Filesystem adapter used by the transaction.
 * @returns A promise resolved only when both originals are restored.
 * @throws When either original baseline cannot be restored.
 */
async function restoreArchitectureBaselines(
  replacements: readonly BaselineReplacement[],
  fileOperations: ArchitectureBaselineFileOperations,
): Promise<void> {
  const failures: unknown[] = [];
  for (const replacement of [...replacements].reverse()) {
    try {
      await fileOperations.rename(replacement.backup, replacement.destination);
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      "Architecture baseline replacement failed and rollback was incomplete",
    );
  }
}

/**
 * Replaces both domain baselines as one recoverable filesystem transaction.
 * @param repoRoot Absolute repository root containing configured baselines.
 * @param config Validated policy containing distinct baseline paths.
 * @param baselines Complete database and provider replacements.
 * @param fileOperations Filesystem adapter used for staging and rollback.
 * @returns A promise resolved only after both replacements complete.
 * @throws When staging, replacement, cleanup, or rollback fails.
 */
async function writeArchitectureBaselines(
  repoRoot: string,
  config: ArchitectureConfig,
  baselines: ArchitectureBaselines,
  fileOperations: ArchitectureBaselineFileOperations,
): Promise<void> {
  const transactionId = `${process.pid}-${randomUUID()}`;
  const replacements = (["database", "provider"] as const).map(
    (domain): BaselineReplacement => {
      const destination = resolve(repoRoot, config.baselineFiles[domain]);
      return {
        destination,
        staged: `${destination}.architecture-update-${transactionId}.tmp`,
        backup: `${destination}.architecture-update-${transactionId}.bak`,
        contents: serializeBaseline(baselines[domain]),
      };
    },
  );

  if (replacements[0].destination === replacements[1].destination) {
    throw new Error("Database and provider baselines must use distinct files");
  }

  let preserveBackups = false;
  try {
    for (const replacement of replacements) {
      await fileOperations.writeFile(replacement.staged, replacement.contents);
      await fileOperations.copyFile(
        replacement.destination,
        replacement.backup,
      );
    }
    try {
      for (const replacement of replacements) {
        await fileOperations.rename(
          replacement.staged,
          replacement.destination,
        );
      }
    } catch (replacementError) {
      try {
        await restoreArchitectureBaselines(replacements, fileOperations);
      } catch (rollbackError) {
        preserveBackups = true;
        throw new AggregateError(
          [replacementError, rollbackError],
          "Architecture baseline replacement and rollback both failed; recovery backup artifacts remain beside the configured baseline files",
        );
      }
      throw replacementError;
    }
  } finally {
    for (const replacement of replacements) {
      await removeTransactionArtifact(fileOperations, replacement.staged);
      if (!preserveBackups) {
        await removeTransactionArtifact(fileOperations, replacement.backup);
      }
    }
  }
}

/**
 * Runs preview-first baseline update behavior and writes only after acknowledgement.
 * @param options Checker inputs, acknowledgement, and optional new-debt metadata.
 * @returns Report plus an explicit indication of whether baselines were written.
 */
export async function updateArchitectureBaselines(
  options: UpdateArchitectureBaselinesOptions,
): Promise<ArchitectureBaselineUpdateResult> {
  const report = await checkArchitectureRepository(options);
  if (
    report.status === "analysis-error" ||
    report.status === "clean" ||
    !options.acknowledge
  ) {
    return { schemaVersion: 1, report, wroteBaselines: false };
  }

  const config = options.config ?? loadOwnershipMap();
  const baselines = await readArchitectureBaselines(options.repoRoot, config);
  const replacements = createUpdatedArchitectureBaselines({
    config,
    baselines,
    findings: report.findings,
    ...(options.newDebtMetadata
      ? { newDebtMetadata: options.newDebtMetadata }
      : {}),
  });
  await writeArchitectureBaselines(
    options.repoRoot,
    config,
    replacements,
    options.fileOperations ?? nodeBaselineFileOperations,
  );
  return { schemaVersion: 1, report, wroteBaselines: true };
}

import { createHash } from "node:crypto";
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
import { selectArchitecturePolicy } from "./policy-selection.js";
import { createNodeRepositoryFileTransactionOperations } from "./node-file-transaction.js";
import {
  applyRepositoryFileTransaction,
  previewRepositoryFileTransaction,
  type RepositoryFileTransactionOperations,
} from "./policy-update-transaction.js";
import {
  compareArchitectureDebt,
  type ArchitectureBaselines,
  type ArchitectureComparison,
} from "./ratchet.js";
import { compareStableStrings } from "./stable-order.js";
import { V1_ARTIFACT_BINDINGS } from "./v1-validation.js";
import { V2_RECONCILIATION_DESTINATION_PATHS } from "./policy-write-guard.js";
import { computeV2ManifestReviewSubjectSha256 } from "./v2-manifest-validation.js";

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
export type ArchitectureBaselineFileOperations =
  RepositoryFileTransactionOperations;

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

/** Computes the exact UTF-8 SHA-256 used by repository transaction plans. */
function baselineSourceHash(baseline: ArchitectureBaseline): string {
  return createHash("sha256")
    .update(serializeBaseline(baseline), "utf8")
    .digest("hex");
}

/** Computes the UTF-8 SHA-256 of exact text bytes. */
function textSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Replaces both baselines through the shared locked repository transaction.
 * When the configured baselines are the v2 reconciliation destinations, the same
 * transaction also rewrites the v2 manifest so its artifact hashes and review
 * subject stay bound to the new baseline bytes.
 * @param repoRoot Absolute repository root containing configured baselines.
 * @param config Validated policy containing distinct baseline paths.
 * @param currentBaselines Exact baselines from which replacements were derived.
 * @param baselines Complete database and provider replacements.
 * @param fileOperations Filesystem adapter used for staging and rollback.
 * @returns A promise resolved only after all replacements complete.
 * @throws When staging, replacement, cleanup, or rollback fails.
 */
async function writeArchitectureBaselines(
  repoRoot: string,
  config: ArchitectureConfig,
  currentBaselines: ArchitectureBaselines,
  baselines: ArchitectureBaselines,
  fileOperations: ArchitectureBaselineFileOperations,
): Promise<void> {
  const protectedV1Paths = new Set(
    V1_ARTIFACT_BINDINGS.map((artifact) => artifact.path),
  );
  for (const domain of ["database", "provider"] as const) {
    if (protectedV1Paths.has(config.baselineFiles[domain])) {
      throw new Error(
        `Architecture ${domain} baseline writes cannot target protected v1 artifacts`,
      );
    }
  }
  const domains = ["database", "provider"] as const;
  const v2Destinations = new Set<string>(V2_RECONCILIATION_DESTINATION_PATHS);
  const targetsAnyV2 =
    v2Destinations.has(config.baselineFiles.database) ||
    v2Destinations.has(config.baselineFiles.provider);
  const targetsV2Pair =
    config.baselineFiles.database === V2_RECONCILIATION_DESTINATION_PATHS[2] &&
    config.baselineFiles.provider === V2_RECONCILIATION_DESTINATION_PATHS[3];
  if (targetsAnyV2 && !targetsV2Pair) {
    const domain = v2Destinations.has(config.baselineFiles.database)
      ? "database"
      : "provider";
    throw new Error(
      `Architecture ${domain} baseline writes require the complete four-file reconciliation transaction`,
    );
  }
  const serialized: Record<(typeof domains)[number], string> = {
    database: serializeBaseline(baselines.database),
    provider: serializeBaseline(baselines.provider),
  };
  const writesV2Manifest = targetsV2Pair;
  const replacements: {
    id: string;
    repositoryPath: string;
    contents: string;
  }[] = domains.map((domain) => ({
    id: `${domain}-baseline`,
    repositoryPath: config.baselineFiles[domain],
    contents: serialized[domain],
  }));
  let manifestBytes: string | undefined;
  if (writesV2Manifest) {
    const manifestPath = V2_RECONCILIATION_DESTINATION_PATHS[0];
    manifestBytes = await fileOperations.readFile(
      resolve(repoRoot, manifestPath),
    );
    const manifest = JSON.parse(manifestBytes) as Record<string, unknown>;
    const v2Artifacts = manifest.v2Artifacts;
    if (!Array.isArray(v2Artifacts)) {
      throw new Error("v2 reconciliation manifest has no v2Artifacts list");
    }
    manifest.v2Artifacts = (
      v2Artifacts as { path: string; sha256: string }[]
    ).map((reference) => {
      if (reference.path === config.baselineFiles.database) {
        return { ...reference, sha256: textSha256(serialized.database) };
      }
      if (reference.path === config.baselineFiles.provider) {
        return { ...reference, sha256: textSha256(serialized.provider) };
      }
      return reference;
    });
    manifest.reviewSubjectSha256 = computeV2ManifestReviewSubjectSha256(
      manifest,
    );
    replacements.push({
      id: "reconciliation-manifest",
      repositoryPath: manifestPath,
      contents: `${JSON.stringify(manifest, null, 2)}\n`,
    });
  }
  const plan = await previewRepositoryFileTransaction({
    repoRoot,
    replacements,
    fileOperations,
  });
  for (const [index, domain] of domains.entries()) {
    if (
      plan.replacements[index]?.beforeHash !==
      baselineSourceHash(currentBaselines[domain])
    ) {
      throw new Error(
        `Architecture ${domain} baseline changed after analysis; rerun the update preview`,
      );
    }
  }
  if (
    manifestBytes !== undefined &&
    plan.replacements[2]?.beforeHash !== textSha256(manifestBytes)
  ) {
    throw new Error(
      "v2 reconciliation manifest changed after analysis; rerun the update preview",
    );
  }
  const outcome = await applyRepositoryFileTransaction({
    plan,
    acknowledge: true,
    expectedPlanHash: plan.planHash,
    fileOperations,
    validate: (replacement, contents) => {
      if (replacement.id === "reconciliation-manifest") {
        JSON.parse(contents);
        return;
      }
      architectureBaselineSchema.parse(JSON.parse(contents));
    },
  });
  if (outcome.state !== "committed") {
    throw new Error(
      "Architecture baselines committed, but transaction cleanup is incomplete; do not retry",
      { cause: outcome },
    );
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
  const selectedPolicy = options.config
    ? undefined
    : selectArchitecturePolicy(options.policyVersion, options.repoRoot, {
        validateCurrentState: false,
      });
  const report = await checkArchitectureRepository({
    ...options,
    ...(selectedPolicy ? { policyVersion: selectedPolicy.policyVersion } : {}),
  });
  if (
    report.status === "analysis-error" ||
    report.status === "clean" ||
    !options.acknowledge
  ) {
    return { schemaVersion: 1, report, wroteBaselines: false };
  }

  const config = options.config ?? selectedPolicy!.config;
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
    baselines,
    replacements,
    options.fileOperations ?? createNodeRepositoryFileTransactionOperations(),
  );
  return { schemaVersion: 1, report, wroteBaselines: true };
}

import { createHash } from "node:crypto";
import { z } from "zod";
import { computeRulesetHash } from "./baseline.js";
import {
  architectureBaselineSchema,
  architectureConfigSchema,
  architectureFindingSchema,
  baselineEntrySchema,
  exactExceptionSchema,
  type ArchitectureConfig,
  type ArchitectureFinding,
  type BaselineEntry,
  type ExactException,
} from "./contracts.js";
import {
  directViolationCandidateSchema,
  type DirectViolationCandidate,
} from "./inventory.js";
import {
  analyzerReconciliationManifestSchema,
  computeAnalyzerReconciliationReviewSubjectSha256,
  RECONCILIATION_ANALYZER_SHA,
  RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
  RECONCILIATION_DIRECT_REVIEW_PATH,
  RECONCILIATION_EXECUTION_BASE_SHA,
  RECONCILIATION_SOURCE_BASE_SHA,
  validateAnalyzerReconciliation,
  type AnalyzerReconciliationManifest,
  type AnalyzerReconciliationReviewEvidenceSources,
} from "./reconciliation-manifest.js";
import {
  compareArchitectureDebt,
  type ArchitectureBaselines,
  type ArchitectureComparison,
} from "./ratchet.js";
import { compareStableStrings } from "./stable-order.js";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const ownerSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/);
const rationaleSchema = z.string().trim().min(12).max(1_000);

const analyzerErrorSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourcePath: z.string().min(1).max(512),
    line: z.number().int().positive(),
    column: z.number().int().positive(),
    code: z.enum([
      "FILE_READ_ERROR",
      "TYPESCRIPT_PARSE_ERROR",
      "RESOLVER_CONFIG_ERROR",
      "MODULE_RESOLUTION_ERROR",
      "WORKSPACE_RESOLUTION_ERROR",
    ]),
  })
  .strict();

const architectureRenameSchema = z
  .object({
    semanticKey: sha256Schema,
    previousInstanceKey: sha256Schema,
    currentInstanceKey: sha256Schema,
  })
  .strict();

const architectureComparisonSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum([
      "new-debt",
      "baseline-reduction-required",
      "baseline-update-required",
      "clean",
    ]),
    additions: z.array(architectureFindingSchema),
    removals: z.array(architectureFindingSchema),
    renames: z.array(architectureRenameSchema),
  })
  .strict();

const immutableReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(["clean", "debt-change", "analysis-error"]),
    filesScanned: z.number().int().nonnegative(),
    findings: z.array(architectureFindingSchema),
    parseErrors: z.array(analyzerErrorSchema),
    comparison: architectureComparisonSchema.optional(),
  })
  .strict();

const directReviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    candidates: z.array(directViolationCandidateSchema),
  })
  .strict();

const productionReviewSchema = z
  .object({
    instanceKey: sha256Schema,
    owner: ownerSchema,
    rationale: rationaleSchema,
  })
  .strict();

const exceptionReviewSchema = z
  .object({
    ruleId: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    sourcePath: z.string().min(1).max(512),
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    owner: ownerSchema,
    rationale: rationaleSchema,
  })
  .strict();

/** One immutable analyzer report represented as both parsed data and exact bytes. */
export interface ImmutableReconciliationReport {
  /** Untrusted parsed report expected to match the exact source bytes. */
  report: unknown;
  /** Exact canonical report bytes captured from the immutable source-base run. */
  source: string;
}

/** Accountable review metadata for one production finding instance. */
export interface ProductionAdditionReview {
  /** Exact analyzer finding instance receiving the review. */
  instanceKey: string;
  /** Accountable owner stored on the final baseline entry. */
  owner: string;
  /** Actionable reason for temporarily accepting the production debt. */
  rationale: string;
}

/** Accountable review metadata for one exact test rule-and-path pair. */
export interface ExactExceptionAdditionReview {
  /** Exact architecture rule selected by the exception. */
  ruleId: string;
  /** Exact test or fixture source path selected by the exception. */
  sourcePath: string;
  /** Stable unique exception identifier stored in policy. */
  id: string;
  /** Accountable owner stored on the exact exception. */
  owner: string;
  /** Actionable reason for the narrowly scoped test exception. */
  rationale: string;
}

/** Inputs required to compile the one-time analyzer reconciliation manifest. */
export interface BuildAnalyzerReconciliationManifestInput {
  /** Two literal provenance-base reports with the expected self-hosting error. */
  provenanceReports: readonly [
    ImmutableReconciliationReport,
    ImmutableReconciliationReport,
  ];
  /** Two zero-error execution-base reports that must be byte-identical. */
  executionReports: readonly [
    ImmutableReconciliationReport,
    ImmutableReconciliationReport,
  ];
  /** Exact historical architecture policy JSON bytes. */
  historicalConfigSource: string;
  /** Exact historical database baseline JSON bytes. */
  historicalDatabaseBaselineSource: string;
  /** Exact historical provider baseline JSON bytes. */
  historicalProviderBaselineSource: string;
  /** Exact historical direct-review JSON bytes. */
  directReviewSource: string;
  /** Exact accepted 3a-to-d723 denominator diff audit bytes. */
  denominatorDiffAuditSource: string;
  /** SHA-256 of the literal provenance-base source path set. */
  provenanceSourcePathSetSha256: string;
  /** SHA-256 of the zero-error execution-base source path set. */
  executionSourcePathSetSha256: string;
  /** Independently computed hash of the frozen analyzer implementation tree. */
  analyzerImplementationTreeSha256: string;
  /** Independently computed hash of reconciliation implementation and tests. */
  reconciliationImplementationTreeSha256: string;
  /** One explicit metadata record for every production addition instance. */
  productionReviews: readonly ProductionAdditionReview[];
  /** One explicit metadata record for every exact test rule-and-path pair. */
  exactExceptionReviews: readonly ExactExceptionAdditionReview[];
  /** Accepted evidence from all four required independent review roles. */
  reviews: readonly Omit<
    AnalyzerReconciliationManifest["reviews"][number],
    "evidenceSha256" | "reviewSubjectSha256"
  >[];
  /** Exact reviewer evidence, or candidate-only factories receiving the frozen subject. */
  reviewEvidenceSources: {
    [Role in keyof AnalyzerReconciliationReviewEvidenceSources]:
      | string
      | ((reviewSubjectSha256: string) => string);
  };
}

/** Complete deterministic candidate state produced by the reconciliation builder. */
export interface BuiltAnalyzerReconciliationManifest {
  /** Strict accepted reconciliation manifest. */
  manifest: AnalyzerReconciliationManifest;
  /** Final policy derived only by appending reviewed exact exceptions. */
  config: ArchitectureConfig;
  /** Final baselines preserving historical entries and adding reviewed production debt. */
  baselines: ArchitectureBaselines;
  /** Hash of manifest, policy, and baselines excluding review records. */
  reviewSubjectSha256: string;
}

/** Converts JSON-compatible data into key-sorted compact JSON. */
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

/** Hashes canonical JSON-compatible data with SHA-256. */
function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

/** Hashes exact UTF-8 bytes with SHA-256. */
function textSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Builds the stable rule-and-path identity for an exact exception. */
function exceptionKey(
  value: Pick<ExactException, "ruleId" | "sourcePath">,
): string {
  return `${value.ruleId}\0${value.sourcePath}`;
}

/** Determines whether an exact path is eligible for a test/fixture exception. */
function isTestOrFixturePath(sourcePath: string): boolean {
  const segments = sourcePath.split("/");
  const filename = segments.at(-1) ?? "";
  return (
    segments.includes("__tests__") ||
    segments.includes("fixtures") ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filename)
  );
}

/** Builds the stable full-record identity for a direct-review candidate. */
function directFactKey(candidate: DirectViolationCandidate): string {
  return canonicalSha256(directViolationCandidateSchema.parse(candidate));
}

/** Tests whether a historical entry preserves every shared direct-review field. */
function entryMatchesCandidate(
  entry: BaselineEntry,
  candidate: DirectViolationCandidate,
): boolean {
  return (
    entry.ruleId === candidate.ruleId &&
    entry.domain === candidate.domain &&
    entry.sourcePath === candidate.sourcePath &&
    entry.line === candidate.line &&
    entry.column === candidate.column &&
    entry.evidenceKind === candidate.evidenceKind &&
    entry.importSpecifier === candidate.importSpecifier &&
    entry.resource === candidate.resource &&
    entry.owner === candidate.owner &&
    entry.rationale === candidate.rationale
  );
}

/** Parses and domain-checks exact historical baseline bytes. */
function parseHistoricalBaselines(
  databaseSource: string,
  providerSource: string,
): ArchitectureBaselines {
  const database = architectureBaselineSchema.parse(JSON.parse(databaseSource));
  const provider = architectureBaselineSchema.parse(JSON.parse(providerSource));
  if (database.domain !== "database" || provider.domain !== "provider") {
    throw new Error("Historical baseline files declare incorrect domains");
  }
  return { database, provider };
}

/** Parses one immutable report and proves its parsed form matches exact bytes. */
function parseImmutableReport(
  input: ImmutableReconciliationReport,
): z.infer<typeof immutableReportSchema> {
  const fromSource = immutableReportSchema.parse(JSON.parse(input.source));
  const supplied = immutableReportSchema.parse(input.report);
  const canonicalSource = `${JSON.stringify(fromSource, null, 2)}\n`;
  if (input.source !== canonicalSource) {
    throw new Error("Immutable analyzer report bytes are not canonical");
  }
  if (canonicalJson(fromSource) !== canonicalJson(supplied)) {
    throw new Error("Immutable analyzer report bytes and parsed data disagree");
  }
  return fromSource;
}

/** Proves that a captured comparison is exactly reproducible from historical debt. */
function compareReportFindings(
  report: z.infer<typeof immutableReportSchema>,
  baselines: ArchitectureBaselines,
): ArchitectureComparison {
  return compareArchitectureDebt({
    baselines,
    findings: report.findings,
  });
}

/** Proves the literal provenance report has exactly the expected self-hosting error. */
function assertProvenanceReport(
  report: z.infer<typeof immutableReportSchema>,
  baselines: ArchitectureBaselines,
): ArchitectureComparison {
  const error = report.parseErrors[0];
  if (
    report.status !== "analysis-error" ||
    report.comparison !== undefined ||
    report.parseErrors.length !== 1 ||
    !error ||
    error.code !== "MODULE_RESOLUTION_ERROR" ||
    error.sourcePath !==
      "packages/architecture-enforcement/src/__tests__/ratchet.red.test.ts" ||
    error.line !== 49 ||
    error.column !== 10
  ) {
    throw new Error(
      "Provenance report must contain only the exact self-hosting resolver error",
    );
  }
  const expected = compareReportFindings(report, baselines);
  if (
    expected.status !== "new-debt" ||
    expected.additions.length === 0 ||
    expected.removals.length !== 0 ||
    expected.renames.length !== 0
  ) {
    throw new Error(
      "Provenance findings require additions with zero historical removals or renames",
    );
  }
  return expected;
}

/** Proves the execution report is zero-error and exactly re-ratchetable. */
function assertExecutionReport(
  report: z.infer<typeof immutableReportSchema>,
  baselines: ArchitectureBaselines,
): ArchitectureComparison {
  if (
    report.status !== "debt-change" ||
    report.parseErrors.length !== 0 ||
    !report.comparison
  ) {
    throw new Error(
      "Execution report must be a zero-error debt-change with comparison",
    );
  }
  const expected = compareReportFindings(report, baselines);
  if (canonicalJson(expected) !== canonicalJson(report.comparison)) {
    throw new Error("Execution comparison does not match historical baselines");
  }
  if (
    expected.status !== "new-debt" ||
    expected.additions.length === 0 ||
    expected.removals.length !== 0 ||
    expected.renames.length !== 0
  ) {
    throw new Error(
      "Reconciliation requires additions with zero historical removals or renames",
    );
  }
  return expected;
}

/** Creates a unique metadata map and rejects duplicate review keys. */
function uniqueMetadataMap<T>(
  values: readonly T[],
  keyFor: (value: T) => string,
  label: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    const key = keyFor(value);
    if (result.has(key))
      throw new Error(`Duplicate ${label} metadata key: ${key}`);
    result.set(key, value);
  }
  return result;
}

/** Builds all historical direct-fact proofs from immutable reviewed artifacts. */
function buildHistoricalProofs(
  directCandidates: readonly DirectViolationCandidate[],
  config: ArchitectureConfig,
  baselines: ArchitectureBaselines,
): Pick<
  AnalyzerReconciliationManifest["historical"],
  "baselineProofs" | "exceptionProofs"
> {
  const historicalEntries = [
    ...baselines.database.entries,
    ...baselines.provider.entries,
  ];
  const entriesByInstance = new Map(
    historicalEntries.map((entry) => [entry.instanceKey, entry]),
  );
  const exceptionsByKey = new Map(
    config.exactExceptions.map((exception) => [
      exceptionKey(exception),
      exception,
    ]),
  );
  const baselineProofs = directCandidates
    .filter((candidate) => candidate.proposedDisposition === "baseline-review")
    .map((candidate) => {
      const matches = [...entriesByInstance.values()].filter((entry) =>
        entryMatchesCandidate(entry, candidate),
      );
      if (matches.length !== 1 || !matches[0]) {
        throw new Error(
          `Direct baseline candidate has ${matches.length} historical entry matches: ${candidate.ruleId} ${candidate.sourcePath}:${candidate.line}:${candidate.column}`,
        );
      }
      return {
        directFactKey: directFactKey(candidate),
        instanceKey: matches[0].instanceKey,
        entrySha256: canonicalSha256(matches[0]),
      };
    })
    .sort((left, right) =>
      compareStableStrings(left.directFactKey, right.directFactKey),
    );
  if (baselineProofs.length !== historicalEntries.length) {
    throw new Error(
      "Historical baselines do not exactly match direct baseline candidates",
    );
  }
  const exceptionProofs = directCandidates
    .filter(
      (candidate) => candidate.proposedDisposition === "exact-exception-review",
    )
    .map((candidate) => {
      const exception = exceptionsByKey.get(
        `${candidate.ruleId}\0${candidate.sourcePath}`,
      );
      if (!exception) {
        throw new Error(
          `Direct exception candidate has no historical exact exception: ${candidate.ruleId} ${candidate.sourcePath}`,
        );
      }
      return {
        directFactKey: directFactKey(candidate),
        ruleId: candidate.ruleId,
        sourcePath: candidate.sourcePath,
        exceptionId: exception.id,
        exceptionSha256: canonicalSha256(exception),
      };
    })
    .sort((left, right) =>
      compareStableStrings(left.directFactKey, right.directFactKey),
    );
  return { baselineProofs, exceptionProofs };
}

/** Creates final baselines while preserving historical entries byte-for-byte. */
function buildFinalBaselines(
  historical: ArchitectureBaselines,
  config: ArchitectureConfig,
  productionAdditions: readonly BaselineEntry[],
): ArchitectureBaselines {
  const buildDomain = (domain: "database" | "provider") =>
    architectureBaselineSchema.parse({
      schemaVersion: 1,
      domain,
      rulesetHash: computeRulesetHash(config, domain),
      entries: [
        ...historical[domain].entries,
        ...productionAdditions.filter((entry) => entry.domain === domain),
      ].sort((left, right) =>
        compareStableStrings(left.instanceKey, right.instanceKey),
      ),
    });
  return {
    database: buildDomain("database"),
    provider: buildDomain("provider"),
  };
}

/**
 * Compiles immutable analyzer evidence and explicit reviews into a strict manifest.
 * @param input Historical bytes, two analyzer reports, and exact review metadata.
 * @returns Fully validated manifest, final policy/baselines, and review subject hash.
 * @throws When evidence differs, debt is removed/moved, or any review key is missing or unused.
 */
export function buildAnalyzerReconciliationManifest(
  input: BuildAnalyzerReconciliationManifestInput,
): BuiltAnalyzerReconciliationManifest {
  const provenanceSourcePathSetSha256 = sha256Schema.parse(
    input.provenanceSourcePathSetSha256,
  );
  const executionSourcePathSetSha256 = sha256Schema.parse(
    input.executionSourcePathSetSha256,
  );
  const analyzerImplementationTreeSha256 = sha256Schema.parse(
    input.analyzerImplementationTreeSha256,
  );
  const reconciliationImplementationTreeSha256 = sha256Schema.parse(
    input.reconciliationImplementationTreeSha256,
  );
  const provenanceReports = input.provenanceReports.map(
    parseImmutableReport,
  ) as [
    z.infer<typeof immutableReportSchema>,
    z.infer<typeof immutableReportSchema>,
  ];
  const executionReports = input.executionReports.map(parseImmutableReport) as [
    z.infer<typeof immutableReportSchema>,
    z.infer<typeof immutableReportSchema>,
  ];
  if (input.provenanceReports[0].source !== input.provenanceReports[1].source) {
    throw new Error("Provenance analyzer reports are not byte-identical");
  }
  if (input.executionReports[0].source !== input.executionReports[1].source) {
    throw new Error("Execution analyzer reports are not byte-identical");
  }

  const historicalConfig = architectureConfigSchema.parse(
    JSON.parse(input.historicalConfigSource),
  );
  const historicalBaselines = parseHistoricalBaselines(
    input.historicalDatabaseBaselineSource,
    input.historicalProviderBaselineSource,
  );
  const provenanceComparison = assertProvenanceReport(
    provenanceReports[0],
    historicalBaselines,
  );
  assertProvenanceReport(provenanceReports[1], historicalBaselines);
  const comparison = assertExecutionReport(
    executionReports[0],
    historicalBaselines,
  );
  assertExecutionReport(executionReports[1], historicalBaselines);
  if (
    canonicalJson(provenanceReports[0].findings) !==
      canonicalJson(executionReports[0].findings) ||
    canonicalJson(provenanceComparison) !== canonicalJson(comparison)
  ) {
    throw new Error(
      "Provenance and execution finding/addition sets do not match exactly",
    );
  }

  const productionFindings = comparison.additions.filter(
    (finding) => !isTestOrFixturePath(finding.sourcePath),
  );
  const testFindings = comparison.additions.filter((finding) =>
    isTestOrFixturePath(finding.sourcePath),
  );
  const productionReviews = input.productionReviews.map((review) =>
    productionReviewSchema.parse(review),
  );
  const productionMetadata = uniqueMetadataMap(
    productionReviews,
    (review) => review.instanceKey,
    "production review",
  );
  const productionAdditions = productionFindings
    .map((finding) => {
      const review = productionMetadata.get(finding.instanceKey);
      if (!review) {
        throw new Error(
          `Missing production review metadata for ${finding.instanceKey}`,
        );
      }
      productionMetadata.delete(finding.instanceKey);
      return baselineEntrySchema.parse({
        ...finding,
        owner: review.owner,
        rationale: review.rationale,
      });
    })
    .sort((left, right) =>
      compareStableStrings(left.instanceKey, right.instanceKey),
    );
  if (productionMetadata.size > 0) {
    throw new Error(
      `Unused production review metadata: ${[...productionMetadata.keys()].sort(compareStableStrings).join(", ")}`,
    );
  }

  const findingsByException = new Map<string, ArchitectureFinding[]>();
  for (const finding of testFindings) {
    const key = `${finding.ruleId}\0${finding.sourcePath}`;
    const group = findingsByException.get(key) ?? [];
    group.push(finding);
    findingsByException.set(key, group);
  }
  const exceptionReviews = input.exactExceptionReviews.map((review) =>
    exceptionReviewSchema.parse(review),
  );
  const exceptionMetadata = uniqueMetadataMap(
    exceptionReviews,
    (review) => `${review.ruleId}\0${review.sourcePath}`,
    "exact exception review",
  );
  const exactExceptionAdditions = [...findingsByException.entries()]
    .sort(([left], [right]) => compareStableStrings(left, right))
    .map(([key, findings]) => {
      const review = exceptionMetadata.get(key);
      if (!review)
        throw new Error(`Missing exact exception review metadata: ${key}`);
      exceptionMetadata.delete(key);
      const exception = exactExceptionSchema.parse({
        schemaVersion: 1,
        id: review.id,
        ruleId: review.ruleId,
        sourcePath: review.sourcePath,
        owner: review.owner,
        rationale: review.rationale,
      });
      return {
        exception,
        coveredFindings: [...findings].sort((left, right) =>
          compareStableStrings(left.instanceKey, right.instanceKey),
        ),
      };
    });
  if (exceptionMetadata.size > 0) {
    throw new Error(
      `Unused exact exception review metadata: ${[...exceptionMetadata.keys()].sort(compareStableStrings).join(", ")}`,
    );
  }

  const config = architectureConfigSchema.parse({
    ...historicalConfig,
    exactExceptions: [
      ...historicalConfig.exactExceptions,
      ...exactExceptionAdditions.map((addition) => addition.exception),
    ],
  });
  const baselines = buildFinalBaselines(
    historicalBaselines,
    config,
    productionAdditions,
  );
  const directReview = directReviewSchema.parse(
    JSON.parse(input.directReviewSource),
  );
  const historicalProofs = buildHistoricalProofs(
    directReview.candidates,
    historicalConfig,
    historicalBaselines,
  );
  const baselineCandidates = directReview.candidates.filter(
    (candidate) => candidate.proposedDisposition === "baseline-review",
  );
  const exceptionCandidates = directReview.candidates.filter(
    (candidate) => candidate.proposedDisposition === "exact-exception-review",
  );
  const reviews = [...input.reviews].sort((left, right) =>
    compareStableStrings(left.role, right.role),
  );
  const additionInstanceKeys = comparison.additions
    .map((finding) => finding.instanceKey)
    .sort(compareStableStrings);
  const manifestDraft = analyzerReconciliationManifestSchema.parse({
    schemaVersion: 1,
    reconciliationId: "backend-architecture-analyzer-v1",
    sourceBaseSha: RECONCILIATION_SOURCE_BASE_SHA,
    analyzerCommitSha: RECONCILIATION_ANALYZER_SHA,
    analyzerImplementationTreeSha256,
    reconciliationImplementationTreeSha256,
    historical: {
      directReviewPath: RECONCILIATION_DIRECT_REVIEW_PATH,
      directReviewSha256: textSha256(input.directReviewSource),
      directCandidateCount: directReview.candidates.length,
      baselineCandidateCounts: {
        database: baselineCandidates.filter(
          (candidate) => candidate.domain === "database",
        ).length,
        provider: baselineCandidates.filter(
          (candidate) => candidate.domain === "provider",
        ).length,
      },
      exactExceptionCandidateCount: exceptionCandidates.length,
      rulesetHashes: {
        database: computeRulesetHash(historicalConfig, "database"),
        provider: computeRulesetHash(historicalConfig, "provider"),
      },
      baselineFileHashes: {
        database: textSha256(input.historicalDatabaseBaselineSource),
        provider: textSha256(input.historicalProviderBaselineSource),
      },
      baselineEntryCounts: {
        database: historicalBaselines.database.entries.length,
        provider: historicalBaselines.provider.entries.length,
      },
      ...historicalProofs,
    },
    reproduction: {
      policyMode: "historical-policy-before-reconciliation-exceptions",
      provenance: {
        sourcePathSetSha256: provenanceSourcePathSetSha256,
        reportSha256s: input.provenanceReports.map((report) =>
          textSha256(report.source),
        ),
        parseErrors: provenanceReports[0].parseErrors,
      },
      execution: {
        sourceBaseSha: RECONCILIATION_EXECUTION_BASE_SHA,
        sourcePathSetSha256: executionSourcePathSetSha256,
        reportSha256s: input.executionReports.map((report) =>
          textSha256(report.source),
        ),
        parseErrorCount: 0,
      },
      denominatorDiffAudit: {
        path: RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH,
        sha256: textSha256(input.denominatorDiffAuditSource),
        result: "accepted",
        productArchitectureDebtChanges: 0,
      },
      additionInstanceSetSha256: canonicalSha256(additionInstanceKeys),
    },
    productionAdditions,
    exactExceptionAdditions,
    finalState: {
      policySha256: canonicalSha256(config),
      rulesetHashes: {
        database: computeRulesetHash(config, "database"),
        provider: computeRulesetHash(config, "provider"),
      },
      baselineHashes: {
        database: canonicalSha256(baselines.database),
        provider: canonicalSha256(baselines.provider),
      },
      baselineEntryCounts: {
        database: baselines.database.entries.length,
        provider: baselines.provider.entries.length,
      },
      totalExactExceptionCount: config.exactExceptions.length,
      addedExactExceptionCount: exactExceptionAdditions.length,
      coveredTestFindingCount: testFindings.length,
      productionAdditionCount: productionAdditions.length,
      removalCount: 0,
      renameCount: 0,
    },
    safetyAssertions: {
      noWildcardExceptions: true,
      noBroadRoots: true,
      noSourceBodies: true,
      noUnreviewedEntries: true,
    },
    reviews: reviews.map((review) => ({
      ...review,
      reviewSubjectSha256: "0".repeat(64),
      evidenceSha256: "0".repeat(64),
    })),
  });
  const reviewSubjectSha256 = computeAnalyzerReconciliationReviewSubjectSha256(
    manifestDraft,
    config,
    baselines,
  );
  const reviewEvidenceSources = Object.fromEntries(
    Object.entries(input.reviewEvidenceSources).map(([role, source]) => [
      role,
      typeof source === "function" ? source(reviewSubjectSha256) : source,
    ]),
  ) as AnalyzerReconciliationReviewEvidenceSources;
  const manifest = analyzerReconciliationManifestSchema.parse({
    ...manifestDraft,
    reviews: reviews.map((review) => ({
      ...review,
      reviewSubjectSha256,
      evidenceSha256: textSha256(reviewEvidenceSources[review.role]),
    })),
  });
  validateAnalyzerReconciliation({
    manifest,
    config,
    baselines,
    analyzerImplementationTreeSha256,
    reconciliationImplementationTreeSha256,
    directReviewSource: input.directReviewSource,
    historicalDatabaseBaselineSource: input.historicalDatabaseBaselineSource,
    historicalProviderBaselineSource: input.historicalProviderBaselineSource,
    denominatorDiffAuditSource: input.denominatorDiffAuditSource,
    reviewEvidenceSources,
  });
  return {
    manifest,
    config,
    baselines,
    reviewSubjectSha256,
  };
}

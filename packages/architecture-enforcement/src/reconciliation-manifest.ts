import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
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
import { createFindingIdentity } from "./finding-identity.js";
import {
  directViolationCandidateSchema,
  type DirectViolationCandidate,
} from "./inventory.js";
import type { ArchitectureBaselines } from "./ratchet.js";
import { compareStableStrings } from "./stable-order.js";

/** Fixed package-owned location of the accepted analyzer reconciliation manifest. */
export const RECONCILIATION_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v1.json";

/** Immutable source revision approved for the one-time analyzer reconciliation. */
export const RECONCILIATION_SOURCE_BASE_SHA =
  "3a109c879438fd50b369eb2905ddccfb56722d2b";

/** Earliest zero-error execution denominator after the self-hosting Red phase. */
export const RECONCILIATION_EXECUTION_BASE_SHA =
  "d7238d09551e3961cd7234cc25a412a821c68611";

/** Frozen analyzer revision accepted for the one-time reconciliation. */
export const RECONCILIATION_ANALYZER_SHA =
  "19af018669873e59bb8b721017d3d91fc1096f83";

/** Fixed historical direct-review artifact bound by the reconciliation. */
export const RECONCILIATION_DIRECT_REVIEW_PATH =
  "measure/generated/architecture-direct-review.v1.json";

/** Fixed audit proving the zero-error denominator adds no product debt. */
export const RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH =
  "measure/tracks/backend_architecture_enforcement_20260713/reconciliation-denominator-diff-audit.md";

/** Fixed durable evidence paths for all required independent review roles. */
export const RECONCILIATION_REVIEW_EVIDENCE_PATHS = {
  "adversarial-testing":
    "measure/tracks/backend_architecture_enforcement_20260713/reconciliation-adversarial-review.md",
  correctness:
    "measure/tracks/backend_architecture_enforcement_20260713/reconciliation-correctness-review.md",
  "developer-api":
    "measure/tracks/backend_architecture_enforcement_20260713/reconciliation-developer-api-review.md",
  security:
    "measure/tracks/backend_architecture_enforcement_20260713/reconciliation-security-review.md",
} as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const sha256Schema = z.string().regex(SHA256_PATTERN);
const ANALYZER_IMPLEMENTATION_PATHS = [
  "packages/architecture-enforcement/src/analyzer.ts",
  "packages/architecture-enforcement/src/architecture-check.ts",
  "packages/architecture-enforcement/src/finding-identity.ts",
  "packages/architecture-enforcement/src/inventory.ts",
  "packages/architecture-enforcement/src/ownership-map.ts",
  "packages/architecture-enforcement/src/ratchet.ts",
  "packages/architecture-enforcement/src/stable-order.ts",
  "packages/architecture-enforcement/src/workspace-resolution.ts",
] as const;
const RECONCILIATION_IMPLEMENTATION_PATHS = [
  "packages/architecture-enforcement/src/architecture-reconciliation.ts",
  "packages/architecture-enforcement/src/architecture-reconciliation-cli.ts",
  "packages/architecture-enforcement/src/baseline-validation.ts",
  "packages/architecture-enforcement/src/node-file-transaction.ts",
  "packages/architecture-enforcement/src/policy-update-transaction.ts",
  "packages/architecture-enforcement/src/reconciliation-manifest-builder.ts",
  "packages/architecture-enforcement/src/reconciliation-manifest.ts",
  "packages/architecture-enforcement/src/__tests__/architecture-reconciliation.test.ts",
  "packages/architecture-enforcement/src/__tests__/architecture-reconciliation-cli.test.ts",
  "packages/architecture-enforcement/src/__tests__/baseline-validation.test.ts",
  "packages/architecture-enforcement/src/__tests__/node-file-transaction.test.ts",
  "packages/architecture-enforcement/src/__tests__/policy-update-transaction.test.ts",
  "packages/architecture-enforcement/src/__tests__/reconciliation-manifest-builder.test.ts",
  "packages/architecture-enforcement/src/__tests__/reconciliation-manifest.test.ts",
] as const;

const domainCountsSchema = z
  .object({
    database: z.number().int().nonnegative(),
    provider: z.number().int().nonnegative(),
  })
  .strict();

const domainHashesSchema = z
  .object({ database: sha256Schema, provider: sha256Schema })
  .strict();

const analyzerErrorSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourcePath: z.string().min(1).max(512),
    line: z.number().int().positive(),
    column: z.number().int().positive(),
    code: z.enum([
      "FILE_READ_ERROR",
      "TYPESCRIPT_PARSE_ERROR",
      "MODULE_RESOLUTION_ERROR",
      "RESOLVER_CONFIG_ERROR",
      "WORKSPACE_RESOLUTION_ERROR",
    ]),
  })
  .strict();

const historicalBaselineProofSchema = z
  .object({
    directFactKey: sha256Schema,
    instanceKey: sha256Schema,
    entrySha256: sha256Schema,
  })
  .strict();

const historicalExceptionProofSchema = z
  .object({
    directFactKey: sha256Schema,
    ruleId: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    sourcePath: z.string().min(1).max(512),
    exceptionId: z.string().regex(/^[a-z][a-z0-9-]*$/),
    exceptionSha256: sha256Schema,
  })
  .strict();

const exactExceptionAdditionSchema = z
  .object({
    exception: exactExceptionSchema,
    coveredFindings: z.array(architectureFindingSchema).min(1),
  })
  .strict()
  .superRefine((addition, context) => {
    const keys = addition.coveredFindings.map((finding) => finding.instanceKey);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "covered finding instance keys must be unique",
        path: ["coveredFindings"],
      });
    }
    const sortedKeys = [...keys].sort(compareStableStrings);
    if (keys.some((key, index) => key !== sortedKeys[index])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "covered findings must be sorted by instanceKey",
        path: ["coveredFindings"],
      });
    }
    addition.coveredFindings.forEach((finding, index) => {
      if (
        finding.ruleId !== addition.exception.ruleId ||
        finding.sourcePath !== addition.exception.sourcePath
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "covered findings must match the exact exception rule and path",
          path: ["coveredFindings", index],
        });
      }
    });
  });

const reviewRoleSchema = z.enum([
  "adversarial-testing",
  "correctness",
  "developer-api",
  "security",
]);

const reviewEvidenceSchema = z
  .object({
    role: reviewRoleSchema,
    reviewer: z.string().trim().min(1).max(120),
    result: z.literal("accepted"),
    reviewSubjectSha256: sha256Schema,
    evidencePath: z.string().min(1).max(512),
    evidenceSha256: sha256Schema,
  })
  .strict();

/** Strict contract for the one-time analyzer-complete reconciliation manifest. */
export const analyzerReconciliationManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    reconciliationId: z.literal("backend-architecture-analyzer-v1"),
    sourceBaseSha: z.literal(RECONCILIATION_SOURCE_BASE_SHA),
    analyzerCommitSha: z.literal(RECONCILIATION_ANALYZER_SHA),
    analyzerImplementationTreeSha256: sha256Schema,
    reconciliationImplementationTreeSha256: sha256Schema,
    historical: z
      .object({
        directReviewPath: z.literal(RECONCILIATION_DIRECT_REVIEW_PATH),
        directReviewSha256: sha256Schema,
        directCandidateCount: z.number().int().nonnegative(),
        baselineCandidateCounts: domainCountsSchema,
        exactExceptionCandidateCount: z.number().int().nonnegative(),
        rulesetHashes: domainHashesSchema,
        baselineFileHashes: domainHashesSchema,
        baselineEntryCounts: domainCountsSchema,
        baselineProofs: z.array(historicalBaselineProofSchema),
        exceptionProofs: z.array(historicalExceptionProofSchema),
      })
      .strict(),
    reproduction: z
      .object({
        policyMode: z.literal(
          "historical-policy-before-reconciliation-exceptions",
        ),
        provenance: z
          .object({
            sourcePathSetSha256: sha256Schema,
            reportSha256s: z.tuple([sha256Schema, sha256Schema]),
            parseErrors: z.tuple([
              analyzerErrorSchema.refine(
                (error) =>
                  error.code === "MODULE_RESOLUTION_ERROR" &&
                  error.sourcePath ===
                    "packages/architecture-enforcement/src/__tests__/ratchet.red.test.ts" &&
                  error.line === 49 &&
                  error.column === 10,
                "must be the exact pre-analyzer self-hosting resolver error",
              ),
            ]),
          })
          .strict(),
        execution: z
          .object({
            sourceBaseSha: z.literal(RECONCILIATION_EXECUTION_BASE_SHA),
            sourcePathSetSha256: sha256Schema,
            reportSha256s: z.tuple([sha256Schema, sha256Schema]),
            parseErrorCount: z.literal(0),
          })
          .strict(),
        denominatorDiffAudit: z
          .object({
            path: z.literal(RECONCILIATION_DENOMINATOR_DIFF_AUDIT_PATH),
            sha256: sha256Schema,
            result: z.literal("accepted"),
            productArchitectureDebtChanges: z.literal(0),
          })
          .strict(),
        additionInstanceSetSha256: sha256Schema,
      })
      .strict()
      .superRefine((reproduction, context) => {
        if (
          reproduction.provenance.reportSha256s[0] !==
          reproduction.provenance.reportSha256s[1]
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "provenance-base report hashes must be byte-identical",
            path: ["provenance", "reportSha256s"],
          });
        }
        if (
          reproduction.execution.reportSha256s[0] !==
          reproduction.execution.reportSha256s[1]
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "execution-base report hashes must be byte-identical",
            path: ["execution", "reportSha256s"],
          });
        }
      }),
    productionAdditions: z.array(baselineEntrySchema),
    exactExceptionAdditions: z.array(exactExceptionAdditionSchema),
    finalState: z
      .object({
        policySha256: sha256Schema,
        rulesetHashes: domainHashesSchema,
        baselineHashes: domainHashesSchema,
        baselineEntryCounts: domainCountsSchema,
        totalExactExceptionCount: z.number().int().nonnegative(),
        addedExactExceptionCount: z.number().int().nonnegative(),
        coveredTestFindingCount: z.number().int().nonnegative(),
        productionAdditionCount: z.number().int().nonnegative(),
        removalCount: z.literal(0),
        renameCount: z.literal(0),
      })
      .strict(),
    safetyAssertions: z
      .object({
        noWildcardExceptions: z.literal(true),
        noBroadRoots: z.literal(true),
        noSourceBodies: z.literal(true),
        noUnreviewedEntries: z.literal(true),
      })
      .strict(),
    reviews: z.array(reviewEvidenceSchema),
  })
  .strict()
  .superRefine((manifest, context) => {
    validateSortedUnique(
      manifest.historical.baselineProofs,
      (proof) => proof.directFactKey,
      ["historical", "baselineProofs"],
      context,
    );
    const historicalInstances = manifest.historical.baselineProofs.map(
      (proof) => proof.instanceKey,
    );
    if (new Set(historicalInstances).size !== historicalInstances.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "historical baseline proofs must reference unique instances",
        path: ["historical", "baselineProofs"],
      });
    }
    validateSortedUnique(
      manifest.historical.exceptionProofs,
      (proof) => proof.directFactKey,
      ["historical", "exceptionProofs"],
      context,
    );
    validateSortedUnique(
      manifest.productionAdditions,
      (entry) => entry.instanceKey,
      ["productionAdditions"],
      context,
    );
    validateSortedUnique(
      manifest.exactExceptionAdditions,
      (addition) => exceptionKey(addition.exception),
      ["exactExceptionAdditions"],
      context,
    );
    validateSortedUnique(
      manifest.reviews,
      (review) => review.role,
      ["reviews"],
      context,
    );
    const requiredRoles = reviewRoleSchema.options;
    if (
      manifest.reviews.length !== requiredRoles.length ||
      requiredRoles.some(
        (role) => !manifest.reviews.some((review) => review.role === role),
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "all required independent review roles must be present once",
        path: ["reviews"],
      });
    }
    for (const review of manifest.reviews) {
      if (
        review.evidencePath !==
        RECONCILIATION_REVIEW_EVIDENCE_PATHS[review.role]
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "review evidence must use the fixed role-owned path",
          path: ["reviews", review.role, "evidencePath"],
        });
      }
    }
  });

const directReviewSchema = z
  .object({
    schemaVersion: z.literal(1),
    candidates: z.array(directViolationCandidateSchema),
  })
  .strict();

/** Analyzer reconciliation manifest inferred from its runtime contract. */
export type AnalyzerReconciliationManifest = z.infer<
  typeof analyzerReconciliationManifestSchema
>;

/** Required independent reviewer role inferred from the manifest contract. */
export type AnalyzerReconciliationReviewRole = z.infer<typeof reviewRoleSchema>;

/** Exact durable reviewer evidence sources keyed by required role. */
export type AnalyzerReconciliationReviewEvidenceSources = Record<
  AnalyzerReconciliationReviewRole,
  string
>;

/** Pure inputs required to validate an accepted reconciliation state. */
export interface ValidateAnalyzerReconciliationInput {
  /** Untrusted reconciliation manifest data. */
  manifest: unknown;
  /** Final validated architecture policy. */
  config: ArchitectureConfig;
  /** Final database and provider baselines. */
  baselines: ArchitectureBaselines;
  /** Independently computed hash of the frozen analyzer implementation tree. */
  analyzerImplementationTreeSha256: string;
  /** Independently computed hash of reconciliation implementation and tests. */
  reconciliationImplementationTreeSha256: string;
  /** Exact historical direct-review JSON bytes. */
  directReviewSource: string;
  /** Exact historical database baseline JSON bytes. */
  historicalDatabaseBaselineSource: string;
  /** Exact historical provider baseline JSON bytes. */
  historicalProviderBaselineSource: string;
  /** Exact immutable dual-anchor denominator diff audit bytes. */
  denominatorDiffAuditSource: string;
  /** Exact durable evidence bytes for every required independent reviewer. */
  reviewEvidenceSources: AnalyzerReconciliationReviewEvidenceSources;
}

/** Deterministic summary returned after all reconciliation invariants pass. */
export interface AnalyzerReconciliationValidationSummary {
  /** Version of the validation summary contract. */
  schemaVersion: 1;
  /** SHA-256 of the canonical accepted manifest bytes. */
  manifestSha256: string;
  /** Immutable source revision bound by the manifest. */
  sourceBaseSha: string;
  /** Frozen analyzer revision bound by the manifest. */
  analyzerCommitSha: string;
  /** Number of final database baseline entries. */
  databaseEntries: number;
  /** Number of final provider baseline entries. */
  providerEntries: number;
  /** Number of independently accepted production additions. */
  productionAdditions: number;
  /** Number of independently accepted exact test exceptions. */
  exactExceptionAdditions: number;
  /** Number of test findings covered by accepted exact exceptions. */
  coveredTestFindings: number;
}

/**
 * Converts JSON-compatible data into key-sorted compact JSON.
 * @param value JSON-compatible value whose object keys require canonical ordering.
 * @returns Deterministic compact JSON representation.
 */
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

/**
 * Hashes canonical JSON-compatible data with SHA-256.
 * @param value Value to hash after canonical JSON projection.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

/**
 * Hashes exact UTF-8 text bytes with SHA-256.
 * @param value Exact file contents to hash without normalization.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
function textSha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Hashes the exact source files that determine analyzer findings and comparison.
 * @param repoRoot Absolute repository root containing the frozen implementation.
 * @returns Machine-independent SHA-256 over ordered repository paths and bytes.
 */
export async function computeAnalyzerImplementationTreeSha256(
  repoRoot: string,
): Promise<string> {
  const files = await Promise.all(
    ANALYZER_IMPLEMENTATION_PATHS.map(async (path) => ({
      path,
      contents: await readFile(resolve(repoRoot, path), "utf8"),
    })),
  );
  return canonicalSha256(files);
}

/**
 * Hashes the exact reconciliation implementation and hard-gate test tree.
 * @param repoRoot Absolute repository root containing the reviewed tooling.
 * @returns Machine-independent SHA-256 over ordered paths and exact bytes.
 */
export async function computeReconciliationImplementationTreeSha256(
  repoRoot: string,
): Promise<string> {
  const files = await Promise.all(
    RECONCILIATION_IMPLEMENTATION_PATHS.map(async (path) => ({
      path,
      contents: await readFile(resolve(repoRoot, path), "utf8"),
    })),
  );
  return canonicalSha256(files);
}

/**
 * Reports duplicate or non-canonical array keys through a Zod refinement.
 * @param values Values whose semantic order is key-sorted.
 * @param keyFor Stable key selector for one value.
 * @param path Zod issue path that owns the array.
 * @param context Zod refinement context receiving validation issues.
 * @returns Nothing after recording any ordering or uniqueness issue.
 */
function validateSortedUnique<T>(
  values: readonly T[],
  keyFor: (value: T) => string,
  path: (string | number)[],
  context: z.RefinementCtx,
): void {
  const keys = values.map(keyFor);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "entries must have unique stable keys",
      path,
    });
  }
  const sorted = [...keys].sort(compareStableStrings);
  if (keys.some((key, index) => key !== sorted[index])) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "entries must use canonical stable-key ordering",
      path,
    });
  }
}

/**
 * Builds the unique rule-and-file key for an exact exception.
 * @param exception Exact exception whose policy target is selected.
 * @returns NUL-delimited rule and source path identity.
 */
function exceptionKey(
  exception: Pick<ExactException, "ruleId" | "sourcePath">,
): string {
  return `${exception.ruleId}\0${exception.sourcePath}`;
}

/**
 * Builds a stable identity for one historical direct-review candidate.
 * @param candidate Reviewed direct candidate from the immutable artifact.
 * @returns SHA-256 covering its full reviewed direct-fact record.
 */
function directFactKey(candidate: DirectViolationCandidate): string {
  return canonicalSha256(directViolationCandidateSchema.parse(candidate));
}

/**
 * Determines whether a source path is lexically a test or fixture file.
 * @param sourcePath Exact repository-relative source path.
 * @returns True when the path satisfies the same narrow exception classification.
 */
function isTestOrFixturePath(sourcePath: string): boolean {
  const segments = sourcePath.split("/");
  const filename = segments.at(-1) ?? "";
  return (
    segments.includes("__tests__") ||
    segments.includes("fixtures") ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filename)
  );
}

/**
 * Recomputes and verifies one finding's semantic and instance hashes.
 * @param finding Finding or baseline entry whose identity fields are checked.
 * @throws When either supplied identity hash is inconsistent with its evidence.
 */
function assertFindingIdentity(finding: ArchitectureFinding): void {
  const expected = createFindingIdentity({
    ruleId: finding.ruleId,
    domain: finding.domain,
    sourcePath: finding.sourcePath,
    line: finding.line,
    column: finding.column,
    evidenceKind: finding.evidenceKind,
    ...(finding.resource ? { resource: finding.resource } : {}),
    resolvedTarget: finding.resolvedTarget,
  });
  if (
    finding.semanticKey !== expected.semanticKey ||
    finding.instanceKey !== expected.instanceKey
  ) {
    throw new Error(
      `Finding identity mismatch for ${finding.ruleId} ${finding.sourcePath}:${finding.line}:${finding.column}`,
    );
  }
}

/**
 * Tests whether a historical baseline entry preserves a direct candidate fact.
 * @param entry Historical baseline entry containing resolved analyzer identity.
 * @param candidate Historical direct-review candidate without resolved identity.
 * @returns True when all shared evidence and review metadata fields match exactly.
 */
function entryMatchesDirectCandidate(
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

/**
 * Parses exact historical baseline bytes into both required domains.
 * @param databaseSource Historical database baseline JSON bytes.
 * @param providerSource Historical provider baseline JSON bytes.
 * @returns Strict historical baselines keyed by domain.
 * @throws When JSON, schema, or domain declarations are invalid.
 */
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

/**
 * Serializes a strict reconciliation manifest into canonical review bytes.
 * @param manifest Untrusted reconciliation manifest data.
 * @returns Pretty JSON with schema ordering and one trailing newline.
 */
export function serializeAnalyzerReconciliationManifest(
  manifest: unknown,
): string {
  const validated = analyzerReconciliationManifestSchema.parse(manifest);
  return `${JSON.stringify(validated, null, 2)}\n`;
}

/**
 * Hashes the canonical serialized reconciliation manifest.
 * @param manifest Untrusted reconciliation manifest data.
 * @returns Lowercase SHA-256 digest of canonical manifest bytes.
 */
export function hashAnalyzerReconciliationManifest(manifest: unknown): string {
  return textSha256(serializeAnalyzerReconciliationManifest(manifest));
}

/**
 * Computes the review subject without self-referential reviewer receipts.
 * @param manifest Strict candidate manifest whose reviews are excluded.
 * @param config Complete proposed architecture policy.
 * @param baselines Complete proposed database and provider baselines.
 * @returns Canonical SHA-256 examined independently by every reviewer.
 */
export function computeAnalyzerReconciliationReviewSubjectSha256(
  manifest: AnalyzerReconciliationManifest,
  config: ArchitectureConfig,
  baselines: ArchitectureBaselines,
): string {
  const { reviews: _reviews, ...manifestWithoutReviews } = manifest;
  return canonicalSha256({
    manifest: manifestWithoutReviews,
    config: architectureConfigSchema.parse(config),
    baselines: {
      database: architectureBaselineSchema.parse(baselines.database),
      provider: architectureBaselineSchema.parse(baselines.provider),
    },
  });
}

/**
 * Validates historical provenance and the exact accepted analyzer-complete state.
 * @param input Manifest, final policy/baselines, and immutable historical bytes.
 * @returns Deterministic accepted-state counts and immutable revision bindings.
 * @throws When any schema, identity, provenance, policy, baseline, or review invariant fails.
 */
export function validateAnalyzerReconciliation(
  input: ValidateAnalyzerReconciliationInput,
): AnalyzerReconciliationValidationSummary {
  const manifest = analyzerReconciliationManifestSchema.parse(input.manifest);
  const implementationTreeSha256 = sha256Schema.parse(
    input.analyzerImplementationTreeSha256,
  );
  if (implementationTreeSha256 !== manifest.analyzerImplementationTreeSha256) {
    throw new Error(
      "Analyzer implementation tree hash does not match manifest",
    );
  }
  if (
    sha256Schema.parse(input.reconciliationImplementationTreeSha256) !==
    manifest.reconciliationImplementationTreeSha256
  ) {
    throw new Error(
      "Reconciliation implementation tree hash does not match manifest",
    );
  }
  const config = architectureConfigSchema.parse(input.config);
  const baselines: ArchitectureBaselines = {
    database: architectureBaselineSchema.parse(input.baselines.database),
    provider: architectureBaselineSchema.parse(input.baselines.provider),
  };
  if (
    baselines.database.domain !== "database" ||
    baselines.provider.domain !== "provider"
  ) {
    throw new Error("Final baseline files declare incorrect domains");
  }
  if (
    textSha256(input.denominatorDiffAuditSource) !==
    manifest.reproduction.denominatorDiffAudit.sha256
  ) {
    throw new Error("Denominator diff audit hash does not match manifest");
  }
  const reviewSubjectSha256 = computeAnalyzerReconciliationReviewSubjectSha256(
    manifest,
    config,
    baselines,
  );

  const directReview = directReviewSchema.parse(
    JSON.parse(input.directReviewSource),
  );
  if (
    textSha256(input.directReviewSource) !==
    manifest.historical.directReviewSha256
  ) {
    throw new Error(
      "Historical direct-review file hash does not match manifest",
    );
  }
  if (
    directReview.candidates.length !== manifest.historical.directCandidateCount
  ) {
    throw new Error(
      "Historical direct-review candidate count does not match manifest",
    );
  }
  const directCandidateKeys = directReview.candidates.map(directFactKey);
  if (new Set(directCandidateKeys).size !== directCandidateKeys.length) {
    throw new Error(
      "Historical direct-review candidates contain duplicate facts",
    );
  }

  const historicalBaselines = parseHistoricalBaselines(
    input.historicalDatabaseBaselineSource,
    input.historicalProviderBaselineSource,
  );
  if (
    textSha256(input.historicalDatabaseBaselineSource) !==
      manifest.historical.baselineFileHashes.database ||
    textSha256(input.historicalProviderBaselineSource) !==
      manifest.historical.baselineFileHashes.provider
  ) {
    throw new Error("Historical baseline file hash does not match manifest");
  }
  for (const entry of [
    ...historicalBaselines.database.entries,
    ...historicalBaselines.provider.entries,
    ...baselines.database.entries,
    ...baselines.provider.entries,
    ...manifest.productionAdditions,
  ]) {
    assertFindingIdentity(entry);
  }
  for (const addition of manifest.exactExceptionAdditions) {
    addition.coveredFindings.forEach(assertFindingIdentity);
  }

  const additionExceptions = manifest.exactExceptionAdditions.map(
    (addition) => addition.exception,
  );
  const additionExceptionKeys = new Set(additionExceptions.map(exceptionKey));
  for (const exception of additionExceptions) {
    const configured = config.exactExceptions.find(
      (candidate) => exceptionKey(candidate) === exceptionKey(exception),
    );
    if (
      !configured ||
      canonicalSha256(configured) !== canonicalSha256(exception)
    ) {
      throw new Error(
        `Manifest exact exception is absent or changed in final policy: ${exception.ruleId} ${exception.sourcePath}`,
      );
    }
  }
  const historicalConfig = architectureConfigSchema.parse({
    ...config,
    exactExceptions: config.exactExceptions.filter(
      (exception) => !additionExceptionKeys.has(exceptionKey(exception)),
    ),
  });
  for (const domain of ["database", "provider"] as const) {
    if (
      computeRulesetHash(historicalConfig, domain) !==
      manifest.historical.rulesetHashes[domain]
    ) {
      throw new Error(
        `${domain} historical policy cannot be reconstructed by removing only accepted exceptions`,
      );
    }
    if (
      historicalBaselines[domain].rulesetHash !==
      manifest.historical.rulesetHashes[domain]
    ) {
      throw new Error(`${domain} historical baseline ruleset hash drifted`);
    }
    const finalRulesetHash = computeRulesetHash(config, domain);
    if (
      finalRulesetHash !== manifest.finalState.rulesetHashes[domain] ||
      baselines[domain].rulesetHash !== finalRulesetHash
    ) {
      throw new Error(`${domain} final ruleset hash does not match policy`);
    }
  }

  const baselineCandidates = directReview.candidates.filter(
    (candidate) => candidate.proposedDisposition === "baseline-review",
  );
  const exceptionCandidates = directReview.candidates.filter(
    (candidate) => candidate.proposedDisposition === "exact-exception-review",
  );
  const baselineCounts = {
    database: baselineCandidates.filter(
      (candidate) => candidate.domain === "database",
    ).length,
    provider: baselineCandidates.filter(
      (candidate) => candidate.domain === "provider",
    ).length,
  };
  if (
    baselineCounts.database !==
      manifest.historical.baselineCandidateCounts.database ||
    baselineCounts.provider !==
      manifest.historical.baselineCandidateCounts.provider ||
    exceptionCandidates.length !==
      manifest.historical.exactExceptionCandidateCount
  ) {
    throw new Error(
      "Historical direct-review disposition counts do not match manifest",
    );
  }

  const historicalEntries = [
    ...historicalBaselines.database.entries,
    ...historicalBaselines.provider.entries,
  ];
  if (historicalEntries.length !== baselineCandidates.length) {
    throw new Error(
      "Historical baseline entries do not exactly cover direct baseline candidates",
    );
  }
  if (
    historicalBaselines.database.entries.length !==
      manifest.historical.baselineEntryCounts.database ||
    historicalBaselines.provider.entries.length !==
      manifest.historical.baselineEntryCounts.provider
  ) {
    throw new Error("Historical baseline entry counts do not match manifest");
  }
  const historicalByInstance = new Map(
    historicalEntries.map((entry) => [entry.instanceKey, entry]),
  );
  const baselineCandidatesByKey = new Map(
    baselineCandidates.map((candidate) => [
      directFactKey(candidate),
      candidate,
    ]),
  );
  if (manifest.historical.baselineProofs.length !== baselineCandidates.length) {
    throw new Error("Historical baseline proof count is incomplete");
  }
  for (const proof of manifest.historical.baselineProofs) {
    const candidate = baselineCandidatesByKey.get(proof.directFactKey);
    const entry = historicalByInstance.get(proof.instanceKey);
    if (
      !candidate ||
      !entry ||
      !entryMatchesDirectCandidate(entry, candidate)
    ) {
      throw new Error(
        `Invalid historical baseline proof ${proof.directFactKey}`,
      );
    }
    if (canonicalSha256(entry) !== proof.entrySha256) {
      throw new Error(
        `Historical baseline proof hash drifted ${proof.instanceKey}`,
      );
    }
  }

  const historicalExceptionsByKey = new Map(
    historicalConfig.exactExceptions.map((exception) => [
      exceptionKey(exception),
      exception,
    ]),
  );
  const exceptionCandidatesByKey = new Map(
    exceptionCandidates.map((candidate) => [
      directFactKey(candidate),
      candidate,
    ]),
  );
  if (
    manifest.historical.exceptionProofs.length !== exceptionCandidates.length
  ) {
    throw new Error("Historical exception proof count is incomplete");
  }
  for (const proof of manifest.historical.exceptionProofs) {
    const candidate = exceptionCandidatesByKey.get(proof.directFactKey);
    const exception = historicalExceptionsByKey.get(
      `${proof.ruleId}\0${proof.sourcePath}`,
    );
    if (
      !candidate ||
      candidate.ruleId !== proof.ruleId ||
      candidate.sourcePath !== proof.sourcePath ||
      !exception ||
      exception.id !== proof.exceptionId ||
      canonicalSha256(exception) !== proof.exceptionSha256
    ) {
      throw new Error(
        `Invalid historical exception proof ${proof.directFactKey}`,
      );
    }
  }

  const finalEntries = [
    ...baselines.database.entries,
    ...baselines.provider.entries,
  ];
  const finalByInstance = new Map(
    finalEntries.map((entry) => [entry.instanceKey, entry]),
  );
  for (const historicalEntry of historicalEntries) {
    const current = finalByInstance.get(historicalEntry.instanceKey);
    if (
      !current ||
      canonicalSha256(current) !== canonicalSha256(historicalEntry)
    ) {
      throw new Error(
        `Historical baseline entry is not preserved exactly: ${historicalEntry.instanceKey}`,
      );
    }
  }
  const finalAdditions = finalEntries
    .filter((entry) => !historicalByInstance.has(entry.instanceKey))
    .sort((left, right) =>
      compareStableStrings(left.instanceKey, right.instanceKey),
    );
  if (
    canonicalJson(finalAdditions) !==
    canonicalJson(manifest.productionAdditions)
  ) {
    throw new Error(
      "Final baseline additions do not match reconciliation manifest",
    );
  }

  const ruleDomains = new Map(
    config.rules.map((rule) => [rule.id, rule.domain]),
  );
  for (const entry of manifest.productionAdditions) {
    if (isTestOrFixturePath(entry.sourcePath)) {
      throw new Error(
        `Production addition is a test or fixture: ${entry.sourcePath}`,
      );
    }
    if (ruleDomains.get(entry.ruleId) !== entry.domain) {
      throw new Error(
        `Production addition rule/domain mismatch: ${entry.ruleId}`,
      );
    }
  }
  const coveredFindings = manifest.exactExceptionAdditions.flatMap(
    (addition) => addition.coveredFindings,
  );
  const coveredKeys = coveredFindings.map((finding) => finding.instanceKey);
  if (new Set(coveredKeys).size !== coveredKeys.length) {
    throw new Error(
      "A test finding is covered by more than one exact exception",
    );
  }
  for (const finding of coveredFindings) {
    if (!isTestOrFixturePath(finding.sourcePath)) {
      throw new Error(
        `Exact exception covers a production path: ${finding.sourcePath}`,
      );
    }
    if (ruleDomains.get(finding.ruleId) !== finding.domain) {
      throw new Error(
        `Covered finding rule/domain mismatch: ${finding.ruleId}`,
      );
    }
    if (finalByInstance.has(finding.instanceKey)) {
      throw new Error(
        `Exception-covered finding also appears in a baseline: ${finding.instanceKey}`,
      );
    }
  }

  const additionKeys = [
    ...manifest.productionAdditions.map((entry) => entry.instanceKey),
    ...coveredKeys,
  ].sort(compareStableStrings);
  if (
    new Set(additionKeys).size !== additionKeys.length ||
    canonicalSha256(additionKeys) !==
      manifest.reproduction.additionInstanceSetSha256
  ) {
    throw new Error("Reproduced addition instance set does not match manifest");
  }

  if (canonicalSha256(config) !== manifest.finalState.policySha256) {
    throw new Error("Final policy hash does not match manifest");
  }
  if (
    canonicalSha256(baselines.database) !==
      manifest.finalState.baselineHashes.database ||
    canonicalSha256(baselines.provider) !==
      manifest.finalState.baselineHashes.provider
  ) {
    throw new Error("Final baseline hash does not match manifest");
  }
  const finalCounts = {
    database: baselines.database.entries.length,
    provider: baselines.provider.entries.length,
  };
  if (
    finalCounts.database !== manifest.finalState.baselineEntryCounts.database ||
    finalCounts.provider !== manifest.finalState.baselineEntryCounts.provider ||
    config.exactExceptions.length !==
      manifest.finalState.totalExactExceptionCount ||
    additionExceptions.length !==
      manifest.finalState.addedExactExceptionCount ||
    coveredFindings.length !== manifest.finalState.coveredTestFindingCount ||
    manifest.productionAdditions.length !==
      manifest.finalState.productionAdditionCount
  ) {
    throw new Error("Final reconciliation counts do not match manifest");
  }
  for (const review of manifest.reviews) {
    const evidenceSource = input.reviewEvidenceSources[review.role];
    if (
      review.reviewSubjectSha256 !== reviewSubjectSha256 ||
      textSha256(evidenceSource) !== review.evidenceSha256 ||
      !evidenceSource.includes(reviewSubjectSha256) ||
      !/Verdict:\s*(?:\*\*)?ACCEPTED(?:\*\*)?/i.test(evidenceSource)
    ) {
      throw new Error(
        `Independent ${review.role} review evidence is not bound`,
      );
    }
  }

  return {
    schemaVersion: 1,
    manifestSha256: hashAnalyzerReconciliationManifest(manifest),
    sourceBaseSha: manifest.sourceBaseSha,
    analyzerCommitSha: manifest.analyzerCommitSha,
    databaseEntries: finalCounts.database,
    providerEntries: finalCounts.provider,
    productionAdditions: manifest.productionAdditions.length,
    exactExceptionAdditions: additionExceptions.length,
    coveredTestFindings: coveredFindings.length,
  };
}

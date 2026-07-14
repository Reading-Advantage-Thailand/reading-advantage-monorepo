import { z } from "zod";

/** Immutable human-label approval metadata required for one release fixture. */
export const prEvaluationFixtureApprovalSchema = z.strictObject({
  labelledBy: z.string().trim().min(1).max(160),
  labelledAt: z.string().datetime({ offset: true }),
  approvedBy: z.string().trim().min(1).max(160),
  approvedAt: z.string().datetime({ offset: true }),
  approvalReference: z.string().trim().min(1).max(240),
});

/** A frozen human-labelled PR evaluation case used to assess a candidate model. */
export const prEvaluationFixtureSchema = z.strictObject({
  id: z.string().trim().min(1).max(160),
  fixtureSetVersion: z.string().trim().min(1).max(80),
  contentDigest: z.string().regex(/^[0-9a-f]{64}$/),
  approval: prEvaluationFixtureApprovalSchema,
  expectedDisposition: z.enum(["pass", "revise"]),
  expectedObjectiveIds: z.array(z.string().trim().min(1)).min(1),
});

/** One candidate-model result evaluated against a frozen fixture. */
export const prEvaluationFixtureResultSchema = z.strictObject({
  fixtureId: z.string().trim().min(1).max(160),
  schemaValid: z.boolean(),
  disposition: z.enum(["pass", "revise"]),
  objectiveIds: z.array(z.string().trim().min(1)),
  latencyMs: z.number().finite().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});

/** Release thresholds that a candidate must satisfy before a guarded rollout. */
export const prEvaluationReleasePolicySchema = z.strictObject({
  minimumSchemaCompliance: z.number().min(0).max(1),
  minimumDispositionAgreement: z.number().min(0).max(1),
  maximumFalseApprovals: z.number().int().nonnegative(),
  maximumFalseRejections: z.number().int().nonnegative(),
  maximumAverageLatencyMs: z.number().finite().positive(),
  maximumAverageTotalTokens: z.number().finite().positive(),
});

/** Aggregate candidate-model quality report over a frozen human-labelled evaluation set. */
export interface PrEvaluationReleaseReport {
  /** Whether every release threshold passed. */
  eligible: boolean;
  /** Schema-valid result ratio. */
  schemaCompliance: number;
  /** Exact human-disposition agreement ratio. */
  dispositionAgreement: number;
  /** Count of unsafe revise-to-pass errors. */
  falseApprovals: number;
  /** Count of pass-to-revise errors. */
  falseRejections: number;
  /** Ratio of results with the expected objective IDs. */
  objectiveGrounding: number;
  /** Mean completion latency. */
  averageLatencyMs: number;
  /** Mean total-token consumption. */
  averageTotalTokens: number;
  /** Stable failure codes explaining why release is denied. */
  failures: string[];
}

/** Result of comparing a newly resolved model against a release baseline. */
export interface PrEvaluationDriftReport {
  /** Whether the candidate materially drifts from the baseline or policy. */
  drifted: boolean;
  /** Stable drift reasons for alerting and audit. */
  reasons: string[];
}

/** Supported rollout modes for a model-policy change. */
export type PrEvaluationRolloutMode = "disabled" | "shadow" | "canary" | "active" | "fallback";

/** Environment-backed runtime modes governing model execution and learner-visible feedback. */
export const prEvaluationRuntimeRolloutModeSchema = z.enum([
  "disabled",
  "shadow",
  "canary",
  "active",
  "fallback",
]);

/** Fail-closed runtime policy resolved before a durable PR-review job uses a model result. */
export interface PrEvaluationRuntimeRollout {
  /** Effective mode after validation and approval checks. */
  mode: PrEvaluationRolloutMode;
  /** Whether the worker may invoke the candidate model. */
  runModel: boolean;
  /** Whether a candidate result may update learner-visible review feedback. */
  mayPublishFeedback: boolean;
  /** Stable percentage used to select jobs when mode is canary. */
  canaryPercent: number;
  /** Identity of the approving curriculum/assessment owner, if supplied. */
  approvedBy: string | null;
  /** Whether the requested public mode was downgraded because approval is absent. */
  approvalRequired: boolean;
}

/** Guarded rollout decision that callers must honor before a mastery mutation. */
export interface PrEvaluationRolloutDecision {
  /** Resolved mode after policy checks. */
  mode: PrEvaluationRolloutMode;
  /** Whether this mode may create learner/mastery mutations. */
  allowLearnerMutation: boolean;
  /** Stable decision reasons for audit and user-facing operations. */
  reasons: string[];
}

/**
 * Resolves the runtime feedback policy for Codecamp PR-review jobs.
 * @param environment Environment values injected for deterministic configuration tests.
 * @returns A fail-closed execution and publication policy.
 * @throws When rollout mode or canary percentage is malformed.
 */
export function resolvePrEvaluationRuntimeRollout(
  environment: Record<string, string | undefined> = process.env,
): PrEvaluationRuntimeRollout {
  const requestedMode = prEvaluationRuntimeRolloutModeSchema.parse(
    environment.CODECAMP_PR_REVIEW_ROLLOUT_MODE ?? "shadow",
  );
  const approvedBy = environment.CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY?.trim() || null;
  const canaryRaw = environment.CODECAMP_PR_REVIEW_CANARY_PERCENT ?? "10";
  if (!/^\d{1,3}$/.test(canaryRaw)) {
    throw new Error("CODECAMP_PR_REVIEW_CANARY_PERCENT must be an integer from 1 through 100");
  }
  const canaryPercent = Number.parseInt(canaryRaw, 10);
  if (canaryPercent < 1 || canaryPercent > 100) {
    throw new Error("CODECAMP_PR_REVIEW_CANARY_PERCENT must be an integer from 1 through 100");
  }

  if (requestedMode === "disabled" || requestedMode === "fallback") {
    return {
      mode: requestedMode,
      runModel: false,
      mayPublishFeedback: false,
      canaryPercent,
      approvedBy,
      approvalRequired: false,
    };
  }
  if ((requestedMode === "active" || requestedMode === "canary") && approvedBy === null) {
    return {
      mode: "shadow",
      runModel: true,
      mayPublishFeedback: false,
      canaryPercent,
      approvedBy: null,
      approvalRequired: true,
    };
  }
  return {
    mode: requestedMode,
    runModel: true,
    mayPublishFeedback: requestedMode === "active" || requestedMode === "canary",
    canaryPercent,
    approvedBy,
    approvalRequired: false,
  };
}

/**
 * Selects a stable subset of immutable review-job IDs for a canary rollout.
 * @param jobId Durable review-job identifier.
 * @param percent Inclusive percentage from 1 through 100.
 * @returns Whether the job belongs to the canary cohort.
 * @throws When the identifier is blank or the percentage is outside 1 through 100.
 */
export function isPrEvaluationCanarySelected(jobId: string, percent: number): boolean {
  if (!jobId.trim()) throw new Error("Canary selection requires a non-empty job ID");
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    throw new Error("Canary percentage must be an integer from 1 through 100");
  }
  let hash = 2166136261;
  for (const character of jobId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100 < percent;
}

function equalSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && new Set(left).size === left.length && left.every((value) => right.includes(value));
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * Scores candidate PR-review results against frozen human-labelled fixtures.
 * @param input Fixtures, candidate outputs, and release thresholds.
 * @returns Deterministic quality metrics and explicit release failures.
 */
export function assessPrEvaluationRelease(input: {
  fixtures: readonly z.infer<typeof prEvaluationFixtureSchema>[];
  results: readonly z.infer<typeof prEvaluationFixtureResultSchema>[];
  policy: z.infer<typeof prEvaluationReleasePolicySchema>;
}): PrEvaluationReleaseReport {
  const fixtures = z.array(prEvaluationFixtureSchema).min(1).parse(input.fixtures);
  const results = z.array(prEvaluationFixtureResultSchema).parse(input.results);
  const policy = prEvaluationReleasePolicySchema.parse(input.policy);
  const resultsByFixture = new Map(results.map((result) => [result.fixtureId, result]));
  const failures: string[] = [];
  if (resultsByFixture.size !== fixtures.length || results.length !== fixtures.length || fixtures.some((fixture) => !resultsByFixture.has(fixture.id))) {
    failures.push("FIXTURE_RESULT_MISMATCH");
  }
  const matched = fixtures.map((fixture) => ({ fixture, result: resultsByFixture.get(fixture.id) }));
  const schemaCompliance = matched.filter(({ result }) => result?.schemaValid).length / fixtures.length;
  const dispositionAgreement = matched.filter(({ fixture, result }) => result?.disposition === fixture.expectedDisposition).length / fixtures.length;
  const falseApprovals = matched.filter(({ fixture, result }) => fixture.expectedDisposition === "revise" && result?.disposition === "pass").length;
  const falseRejections = matched.filter(({ fixture, result }) => fixture.expectedDisposition === "pass" && result?.disposition === "revise").length;
  const objectiveGrounding = matched.filter(({ fixture, result }) => result != null && equalSet(fixture.expectedObjectiveIds, result.objectiveIds)).length / fixtures.length;
  const measured = matched.flatMap(({ result }) => result == null ? [] : [result]);
  const averageLatencyMs = measured.length > 0 ? average(measured.map((result) => result.latencyMs)) : Number.POSITIVE_INFINITY;
  const averageTotalTokens = measured.length > 0 ? average(measured.map((result) => result.totalTokens)) : Number.POSITIVE_INFINITY;
  if (schemaCompliance < policy.minimumSchemaCompliance) failures.push("SCHEMA_COMPLIANCE_BELOW_THRESHOLD");
  if (dispositionAgreement < policy.minimumDispositionAgreement) failures.push("DISPOSITION_AGREEMENT_BELOW_THRESHOLD");
  if (falseApprovals > policy.maximumFalseApprovals) failures.push("FALSE_APPROVAL_LIMIT_EXCEEDED");
  if (falseRejections > policy.maximumFalseRejections) failures.push("FALSE_REJECTION_LIMIT_EXCEEDED");
  if (averageLatencyMs > policy.maximumAverageLatencyMs) failures.push("LATENCY_LIMIT_EXCEEDED");
  if (averageTotalTokens > policy.maximumAverageTotalTokens) failures.push("TOKEN_LIMIT_EXCEEDED");
  if (objectiveGrounding < 1) failures.push("OBJECTIVE_GROUNDING_INCOMPLETE");
  return { eligible: failures.length === 0, schemaCompliance, dispositionAgreement, falseApprovals, falseRejections, objectiveGrounding, averageLatencyMs, averageTotalTokens, failures };
}

/**
 * Detects model-alias drift that must prevent an automatic release promotion.
 * @param baseline Previously approved quality metrics.
 * @param candidate Metrics for the newly resolved model.
 * @param policy Current release thresholds.
 * @returns A stable drift decision and reasons.
 */
export function detectPrEvaluationModelDrift(
  baseline: Pick<PrEvaluationReleaseReport, "schemaCompliance" | "dispositionAgreement" | "falseApprovals" | "falseRejections" | "averageLatencyMs" | "averageTotalTokens">,
  candidate: Pick<PrEvaluationReleaseReport, "schemaCompliance" | "dispositionAgreement" | "falseApprovals" | "falseRejections" | "averageLatencyMs" | "averageTotalTokens">,
  policy: z.infer<typeof prEvaluationReleasePolicySchema>,
): PrEvaluationDriftReport {
  const parsedPolicy = prEvaluationReleasePolicySchema.parse(policy);
  const reasons: string[] = [];
  if (candidate.schemaCompliance < baseline.schemaCompliance - 0.02 || candidate.schemaCompliance < parsedPolicy.minimumSchemaCompliance) reasons.push("SCHEMA_COMPLIANCE_DRIFT");
  if (candidate.dispositionAgreement < baseline.dispositionAgreement - 0.05 || candidate.dispositionAgreement < parsedPolicy.minimumDispositionAgreement) reasons.push("DISPOSITION_AGREEMENT_DRIFT");
  if (candidate.falseApprovals > baseline.falseApprovals || candidate.falseApprovals > parsedPolicy.maximumFalseApprovals) reasons.push("FALSE_APPROVAL_DRIFT");
  if (candidate.falseRejections > parsedPolicy.maximumFalseRejections) reasons.push("FALSE_REJECTION_DRIFT");
  if (candidate.averageLatencyMs > parsedPolicy.maximumAverageLatencyMs) reasons.push("LATENCY_DRIFT");
  if (candidate.averageTotalTokens > parsedPolicy.maximumAverageTotalTokens) reasons.push("TOKEN_DRIFT");
  return { drifted: reasons.length > 0, reasons };
}

/**
 * Decides whether a rollout mode may affect learner state.
 * @param input Requested rollout mode, quality report, and explicit approver identity.
 * @returns A fail-closed policy decision for caller-side mutation guards.
 */
export function decidePrEvaluationRollout(input: {
  mode: PrEvaluationRolloutMode;
  report: PrEvaluationReleaseReport;
  approvedBy: string | null;
}): PrEvaluationRolloutDecision {
  if (input.mode === "disabled" || input.mode === "shadow" || input.mode === "fallback") {
    return { mode: input.mode, allowLearnerMutation: false, reasons: ["NON_MUTATING_ROLLOUT_MODE"] };
  }
  if (!input.report.eligible) return { mode: "fallback", allowLearnerMutation: false, reasons: ["RELEASE_REPORT_INELIGIBLE", ...input.report.failures] };
  if (input.approvedBy == null || input.approvedBy.trim().length === 0) return { mode: "shadow", allowLearnerMutation: false, reasons: ["EXPLICIT_APPROVAL_REQUIRED"] };
  return { mode: input.mode, allowLearnerMutation: true, reasons: ["ELIGIBLE_REPORT_WITH_EXPLICIT_APPROVAL"] };
}

import { describe, expect, it } from "vitest";
import {
  assessPrEvaluationRelease,
  decidePrEvaluationRollout,
  detectPrEvaluationModelDrift,
  isPrEvaluationCanarySelected,
  resolvePrEvaluationRuntimeRollout,
} from "../codecamp/pr-evaluation-release.js";

const policy = {
  minimumSchemaCompliance: 1,
  minimumDispositionAgreement: 0.9,
  maximumFalseApprovals: 0,
  maximumFalseRejections: 1,
  maximumAverageLatencyMs: 2_000,
  maximumAverageTotalTokens: 3_000,
};

const fixtures = [
  { id: "pass-case", fixtureSetVersion: "pr-eval-v1", contentDigest: "a".repeat(64), approval: { labelledBy: "curriculum-owner", labelledAt: "2026-07-12T00:00:00.000Z", approvedBy: "assessment-owner", approvedAt: "2026-07-12T00:00:00.000Z", approvalReference: "CAL-001" }, expectedDisposition: "pass", expectedObjectiveIds: ["codecamp.apk.stage"] },
  { id: "revise-case", fixtureSetVersion: "pr-eval-v1", contentDigest: "b".repeat(64), approval: { labelledBy: "curriculum-owner", labelledAt: "2026-07-12T00:00:00.000Z", approvedBy: "assessment-owner", approvedAt: "2026-07-12T00:00:00.000Z", approvalReference: "CAL-002" }, expectedDisposition: "revise", expectedObjectiveIds: ["codecamp.apk.stage"] },
] as const;

describe("PR evaluation release policy", () => {
  it("rejects fixtures without a digest and explicit human-label approval", () => {
    expect(() => assessPrEvaluationRelease({
      fixtures: [{ id: "unapproved", expectedDisposition: "pass", expectedObjectiveIds: ["codecamp.apk.stage"] }],
      results: [],
      policy,
    })).toThrow();
  });

  it("blocks a candidate that falsely approves a human-labelled revise case", () => {
    const report = assessPrEvaluationRelease({
      fixtures,
      results: [
        { fixtureId: "pass-case", schemaValid: true, disposition: "pass", objectiveIds: ["codecamp.apk.stage"], latencyMs: 100, totalTokens: 200 },
        { fixtureId: "revise-case", schemaValid: true, disposition: "pass", objectiveIds: ["codecamp.apk.stage"], latencyMs: 100, totalTokens: 200 },
      ],
      policy,
    });

    expect(report.eligible).toBe(false);
    expect(report.falseApprovals).toBe(1);
    expect(report.failures).toContain("FALSE_APPROVAL_LIMIT_EXCEEDED");
  });

  it("permits canary only after an eligible report and explicit approval", () => {
    const report = assessPrEvaluationRelease({
      fixtures,
      results: [
        { fixtureId: "pass-case", schemaValid: true, disposition: "pass", objectiveIds: ["codecamp.apk.stage"], latencyMs: 100, totalTokens: 200 },
        { fixtureId: "revise-case", schemaValid: true, disposition: "revise", objectiveIds: ["codecamp.apk.stage"], latencyMs: 100, totalTokens: 200 },
      ],
      policy,
    });

    expect(decidePrEvaluationRollout({ mode: "canary", report, approvedBy: null }).allowLearnerMutation).toBe(false);
    expect(decidePrEvaluationRollout({ mode: "canary", report, approvedBy: "curriculum-owner" })).toMatchObject({ allowLearnerMutation: true, mode: "canary" });
    expect(decidePrEvaluationRollout({ mode: "shadow", report, approvedBy: "curriculum-owner" }).allowLearnerMutation).toBe(false);
  });

  it("flags a resolved-model redirect when it materially degrades a baseline", () => {
    expect(detectPrEvaluationModelDrift({ schemaCompliance: 1, dispositionAgreement: 0.98, falseApprovals: 0, falseRejections: 0, averageLatencyMs: 100, averageTotalTokens: 200 }, { schemaCompliance: 0.8, dispositionAgreement: 0.7, falseApprovals: 2, falseRejections: 0, averageLatencyMs: 500, averageTotalTokens: 250 }, policy)).toMatchObject({ drifted: true });
  });

  it("defaults to private shadow evaluation and downgrades unapproved active traffic", () => {
    expect(resolvePrEvaluationRuntimeRollout({})).toMatchObject({
      mode: "shadow",
      runModel: true,
      mayPublishFeedback: false,
      approvalRequired: false,
    });
    expect(resolvePrEvaluationRuntimeRollout({ CODECAMP_PR_REVIEW_ROLLOUT_MODE: "active" })).toMatchObject({
      mode: "shadow",
      runModel: true,
      mayPublishFeedback: false,
      approvalRequired: true,
    });
  });

  it("requires explicit approval for active/canary feedback and deterministically samples canary jobs", () => {
    const rollout = resolvePrEvaluationRuntimeRollout({
      CODECAMP_PR_REVIEW_ROLLOUT_MODE: "canary",
      CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY: "assessment-owner",
      CODECAMP_PR_REVIEW_CANARY_PERCENT: "25",
    });
    expect(rollout).toMatchObject({
      mode: "canary",
      runModel: true,
      mayPublishFeedback: true,
      canaryPercent: 25,
      approvedBy: "assessment-owner",
    });
    expect(isPrEvaluationCanarySelected("job-immutable-id", 25)).toBe(
      isPrEvaluationCanarySelected("job-immutable-id", 25),
    );
    expect(() => resolvePrEvaluationRuntimeRollout({
      CODECAMP_PR_REVIEW_ROLLOUT_MODE: "canary",
      CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY: "assessment-owner",
      CODECAMP_PR_REVIEW_CANARY_PERCENT: "101",
    })).toThrow("CODECAMP_PR_REVIEW_CANARY_PERCENT");
  });
});

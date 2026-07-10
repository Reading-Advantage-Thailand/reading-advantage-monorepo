import { describe, expect, it } from "vitest";

import { computeObjectiveProficiency } from "../srs/objective-proficiency.js";
import { processReview } from "../srs/review-processor.js";
import { buildDailyQueue, type QueueItem } from "../srs/queue.js";
import {
  DEFAULT_SCHEDULER_CONFIG,
  resolveRequestRetention,
} from "../srs/scheduler.js";
import {
  InMemorySubmissionSrsAdapter,
} from "../srs/submission-srs-adapter.js";
import { fitFsrsParameters } from "../srs/fsrs-calibration.js";
import { classifyAbilityStratifiedCalibration } from "../srs/edge-calibration.js";
import type {
  ObjectivePracticePolicy,
  PracticeSubmissionEnvelope,
  SrsCardState,
  SrsSessionConfig,
} from "../srs/contract.js";
import type { FsrsCalibrationReview } from "../srs/fsrs-calibration.js";

const NOW = "2026-07-10T00:00:00.000Z";

function card(overrides: Partial<SrsCardState> = {}): SrsCardState {
  return {
    cardId: "card-a",
    studentId: "student-a",
    objectiveId: "objective-a",
    variantKey: "variant-a",
    stability: 10,
    difficulty: 5,
    state: "review",
    dueDate: "2026-07-09T00:00:00.000Z",
    elapsedDays: 10,
    scheduledDays: 10,
    reps: 3,
    lapses: 0,
    lastReview: "2026-06-30T00:00:00.000Z",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
    ...overrides,
  };
}

function submission(
  part: PracticeSubmissionEnvelope["parts"][number],
): PracticeSubmissionEnvelope {
  return {
    contractVersion: "practice.v1",
    activityId: "activity-a",
    mode: "independent_practice",
    status: "submitted",
    attemptNumber: 1,
    submittedAt: NOW,
    answers: {},
    parts: [part],
  };
}

function calibrationReview(index: number): FsrsCalibrationReview {
  return {
    reviewId: `review-${index}`,
    studentId: `student-${index % 100}`,
    domain: "codecamp.web",
    ageBand: "secondary",
    paramsVersion: "fsrs-params.codecamp.web.secondary.v1",
    reviewedAt: new Date(Date.UTC(2026, 0, 1, 0, index % 60)).toISOString(),
    predictedRetention: 0.2 + (index % 7) * 0.1,
    observedRecall: index % 3 !== 0,
  };
}

describe("Phase S2 owning proficiency decisions", () => {
  it("caps objective evidence confidence using the least-supported variant", () => {
    const result = computeObjectiveProficiency({
      objectiveId: "objective-a",
      priority: "extension",
      variantEvidences: [
        {
          variantKey: "variant-a",
          retentionStrength: 0.99,
          practiceCoverage: 1,
          fluencyConfidence: "high",
          baselineSampleCount: 20,
          timingReliable: true,
          attemptCount: 2,
        },
      ],
    });

    expect(result.evidenceConfidence).toBe("low");
  });

  it("uses minimum reviewed-card live retention in the owning proficiency decision", () => {
    const result = computeObjectiveProficiency({
      objectiveId: "objective-a",
      priority: "supporting",
      minVariants: 2,
      minCoverageThreshold: 0.5,
      minRetentionThreshold: 0.7,
      variantEvidences: [
        {
          variantKey: "strong",
          retentionStrength: 0.9,
          practiceCoverage: 1,
          fluencyConfidence: "high",
          baselineSampleCount: 20,
          timingReliable: true,
          attemptCount: 8,
        },
        {
          variantKey: "weak",
          retentionStrength: 0.9,
          practiceCoverage: 1,
          fluencyConfidence: "high",
          baselineSampleCount: 20,
          timingReliable: true,
          attemptCount: 8,
        },
      ],
      liveRetentionCards: [
        { cardId: "strong", variantKey: "strong", stability: 20, elapsedDays: 5, reps: 3 },
        { cardId: "weak", variantKey: "weak", stability: 1, elapsedDays: 30, reps: 2 },
        { cardId: "new", variantKey: "new", stability: 0, elapsedDays: 100, reps: 0 },
      ],
    });

    expect(result.retentionStrength).toBeLessThan(0.7);
    expect(result.isProficient).toBe(false);
    expect(result.reasons).toContain("retention_below_threshold");
  });
});

describe("Phase S2 practice evidence propagation", () => {
  it("processReview forwards totalRevealSteps so revealing every step rates Again", () => {
    const result = processReview({
      card: card(),
      submission: submission({
        partId: "part-a",
        rawAnswer: "answer",
        isCorrect: true,
        hintsUsed: 0,
        revealStepsSeen: 2,
        totalRevealSteps: 2,
      }),
      now: NOW,
    });

    expect(result.rating).toBe("Again");
    expect(result.reviewLog.evidence).toMatchObject({
      reasons: expect.arrayContaining(["all_steps_revealed"]),
    });
  });

  it("SubmissionSrsAdapter forwards severe misconception provenance to the mapper", async () => {
    const adapter = new InMemorySubmissionSrsAdapter();
    adapter.getResolver().register("activity-a", {
      objectiveId: "objective-a",
      variantKey: "variant-a",
    });

    const result = await adapter.processSubmission({
      submission: submission({
        partId: "part-a",
        rawAnswer: "answer",
        isCorrect: true,
        misconceptionTags: ["fabricated-rule"],
        misconceptionSeverityByTag: { "fabricated-rule": "severe" },
      }),
      studentId: "student-a",
      activityId: "activity-a",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reviewLog.rating).toBe("Again");
    expect(result.reviewLog.evidence.reasons).toContain("misconception_severe");
  });
});

describe("Phase S2 FSRS fitting governance", () => {
  it("emits a complete FSRS weight artifact and requires explicit human approval for release", () => {
    const reviews = Array.from({ length: 10_000 }, (_, index) =>
      calibrationReview(index),
    );
    const common = {
      reviews,
      population: { domain: "codecamp.web", ageBand: "secondary" },
      optimizerVersion: "deterministic-fsrs-grid.v1",
      incumbentParamsVersion: "fsrs-params.codecamp.web.secondary.v1",
      candidateParamsVersion: "fsrs-params.codecamp.web.secondary.v2",
      incumbentHoldoutLogLoss: 10,
    };

    const pending = fitFsrsParameters({
      ...common,
      humanReleaseApproved: false,
    });
    const approved = fitFsrsParameters({
      ...common,
      humanReleaseApproved: true,
    });

    expect(approved.fittedParameters.w.length).toBeGreaterThanOrEqual(19);
    expect(approved.fittedParameters.w.every(Number.isFinite)).toBe(true);
    expect(approved).toMatchObject({
      fitObjective: "holdout_log_loss",
      trainingReviewCount: 8_000,
      holdoutReviewCount: 2_000,
      volumeGatePassed: true,
      humanReleaseApproved: true,
      releaseEligible: true,
    });
    expect(pending).toMatchObject({
      humanReleaseApproved: false,
      releaseEligible: false,
    });
  }, 20_000);
});

describe("Phase S2 queue and public numeric boundaries", () => {
  it("interleaves reviews by default and never exceeds the cap after remediation", () => {
    const cards = [
      card({ cardId: "a1", objectiveId: "a" }),
      card({ cardId: "a2", objectiveId: "a", variantKey: "a2" }),
      card({ cardId: "b1", objectiveId: "b", variantKey: "b1" }),
    ];
    const policies = new Map<string, ObjectivePracticePolicy>([
      ["a", { objectiveId: "a", priority: "essential" }],
      ["b", { objectiveId: "b", priority: "essential" }],
      ["r", { objectiveId: "r", priority: "essential" }],
    ]);
    const remediationItems: QueueItem[] = Array.from({ length: 5 }, (_, index) => ({
      card: card({ cardId: `r${index}`, objectiveId: "r", variantKey: `r${index}` }),
      objectivePriority: "essential",
      isOverdue: true,
      daysOverdue: 1,
      kind: "remediation",
    }));
    const config: SrsSessionConfig = {
      newCardsPerDay: 0,
      maxReviewsPerDay: 4,
      prioritizeOverdue: true,
    };

    const queue = buildDailyQueue(cards, policies, config, NOW, {
      remediationItems: remediationItems.slice(0, 1),
    });
    expect(queue.map((item) => item.card.cardId)).toEqual(["r0", "a1", "b1", "a2"]);
    expect(
      buildDailyQueue(cards, policies, config, NOW, { remediationItems }),
    ).toHaveLength(4);
    expect(DEFAULT_SCHEDULER_CONFIG.enableIntervalFuzz).toBe(true);
  });

  it.each([Number.NaN, Infinity, -0.1, 0, 1.01])(
    "rejects invalid request retention %s",
    (requestRetention) => {
      expect(() =>
        resolveRequestRetention("essential", { requestRetention }),
      ).toThrow(/retention/i);
    },
  );
});

describe("Phase S2 ability-stratified pooled verdict", () => {
  it("preserves the pooled full-criteria status after ability bands agree", () => {
    const result = classifyAbilityStratifiedCalibration({
      strata: [
        {
          band: "low",
          table: {
            proficientAProficientB: 8,
            proficientANotProficientB: 2,
            notProficientAProficientB: 1,
            notProficientANotProficientB: 9,
          },
        },
        {
          band: "mid",
          table: {
            proficientAProficientB: 7,
            proficientANotProficientB: 3,
            notProficientAProficientB: 2,
            notProficientANotProficientB: 8,
          },
        },
      ],
      prior: { alpha: 1, beta: 1 },
      pooledStatus: "refuted",
    });

    expect(result.status).toBe("refuted");
    expect(result.reason).toBeNull();
  });
});

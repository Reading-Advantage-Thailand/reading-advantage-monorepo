import { describe, expect, it } from "vitest";

import { buildDailyQueue, type QueueItem } from "../srs/queue.js";
import {
  resolveRequestRetention,
  reviewCard,
  type SchedulerConfig,
} from "../srs/scheduler.js";
import { balanceDueDate } from "../srs/session-composition.js";
import {
  aggregateCardsToEvidence,
  aggregateObjectiveRetention,
  computeCorrectedRetentionStrength,
  stabilityToRetention,
} from "../srs/srs-proficiency.js";
import {
  fitFsrsParameters,
  validateFsrsReviewMetadata,
  type FsrsCalibrationReview,
} from "../srs/fsrs-calibration.js";
import { evaluateFsrsReplay } from "../srs/evaluation-harness.js";
import type {
  ObjectivePracticePolicy,
  SrsCardState,
  SrsSessionConfig,
} from "../srs/contract.js";

const NOW = "2026-07-10T00:00:00.000Z";

function expectedCorrectedStrength(
  attempts: ReadonlyArray<{ isCorrect: boolean; positionsAgo: number }>,
  guessFloor: number,
): number {
  const weights = attempts.map((attempt) =>
    Math.pow(0.5, attempt.positionsAgo / 10),
  );
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const weightedCorrect = attempts.reduce(
    (sum, attempt, index) => sum + (attempt.isCorrect ? weights[index]! : 0),
    0,
  );
  const rate = weightedCorrect / weightSum;
  const effectiveN =
    (weightSum * weightSum) /
    weights.reduce((sum, weight) => sum + weight * weight, 0);
  const z = 1.645;
  const denominator = 1 + (z * z) / effectiveN;
  const center = rate + (z * z) / (2 * effectiveN);
  const margin =
    z *
    Math.sqrt(
      (rate * (1 - rate)) / effectiveN + z ** 2 / (4 * effectiveN ** 2),
    );
  const lower = (center - margin) / denominator;
  return Math.max(0, (lower - guessFloor) / (1 - guessFloor));
}

function card(overrides: Partial<SrsCardState> = {}): SrsCardState {
  return {
    cardId: "card-a",
    studentId: "student-a",
    objectiveId: "code.javascript.functions",
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

describe("Phase S2 SRS evidence wiring", () => {
  it.each([1, 5, 10])(
    "uses half-life-10 recency and guess-floor correction for %i attempts",
    (count) => {
      const attempts = Array.from({ length: count }, (_, index) => ({
        isCorrect: index === 0,
        positionsAgo: index,
      }));
      expect(
        computeCorrectedRetentionStrength(attempts, { guessFloor: 0.25 }),
      ).toBeCloseTo(expectedCorrectedStrength(attempts, 0.25), 12);
    },
  );

  it("feeds corrected attempt evidence through aggregateCardsToEvidence", () => {
    const attempts = [
      { isCorrect: true, positionsAgo: 0 },
      { isCorrect: false, positionsAgo: 1 },
      { isCorrect: false, positionsAgo: 2 },
    ];
    const evidence = aggregateCardsToEvidence(
      [
        {
          ...card(),
          attempts,
          guessFloor: 0.25,
        },
      ],
      {},
    );

    expect(evidence[0]!.retentionStrength).toBeCloseTo(
      expectedCorrectedStrength(attempts, 0.25),
      2,
    );
    expect(evidence[0]).toMatchObject({ attemptCount: 3 });
  });

  it("uses minimum live card retention while excluding unreviewed variants", () => {
    const result = aggregateObjectiveRetention([
      {
        cardId: "strong",
        variantKey: "strong",
        stability: 20,
        elapsedDays: 5,
        reps: 3,
      },
      {
        cardId: "weak",
        variantKey: "weak",
        stability: 8,
        elapsedDays: 12,
        reps: 2,
      },
      {
        cardId: "unreviewed",
        variantKey: "unreviewed",
        stability: 0,
        elapsedDays: 100,
        reps: 0,
      },
    ]);

    expect(result).toBeCloseTo(stabilityToRetention(8, 12), 12);
  });
});

describe("Phase S2 scheduler and queue wiring", () => {
  it("preserves scalar requestRetention when the priority map is absent", () => {
    expect(
      resolveRequestRetention("essential", { requestRetention: 0.85 }),
    ).toBe(0.85);
    expect(
      resolveRequestRetention("extension", { requestRetention: 0.85 }),
    ).toBe(0.85);
  });

  it("places misconception remediation before interleaved due reviews", () => {
    const reviews = [
      card({ cardId: "a1", objectiveId: "a", variantKey: "a1" }),
      card({ cardId: "a2", objectiveId: "a", variantKey: "a2" }),
      card({ cardId: "b1", objectiveId: "b", variantKey: "b1" }),
    ];
    const policies = new Map<string, ObjectivePracticePolicy>([
      ["a", { objectiveId: "a", priority: "essential" }],
      ["b", { objectiveId: "b", priority: "essential" }],
      ["remediation", { objectiveId: "remediation", priority: "essential" }],
    ]);
    const remediation: QueueItem = {
      card: card({ cardId: "misconception", objectiveId: "remediation" }),
      objectivePriority: "essential",
      isOverdue: true,
      daysOverdue: 1,
      kind: "remediation",
    };
    const config: SrsSessionConfig = {
      newCardsPerDay: 0,
      maxReviewsPerDay: 10,
      prioritizeOverdue: true,
    };
    const build = buildDailyQueue as unknown as (
      cards: SrsCardState[],
      policies: Map<string, ObjectivePracticePolicy>,
      config: SrsSessionConfig,
      now: string,
      options: { remediationItems: QueueItem[]; composeSession: boolean },
    ) => QueueItem[];

    expect(
      build(reviews, policies, config, NOW, {
        remediationItems: [remediation],
        composeSession: true,
      }).map((item) => item.card.cardId),
    ).toEqual(["misconception", "a1", "b1", "a2"]);
  });

  it("applies deterministic interval fuzz and load balancing after review scheduling", () => {
    const config = {
      requestRetention: 0.9,
      maximumInterval: 365,
      enableShortTermPreview: false,
      enableIntervalFuzz: true,
      projectedLoadByDate: {},
    } as Partial<SchedulerConfig>;
    const first = reviewCard(card({ cardId: "fuzz-a" }), "Good", NOW, config);
    const repeat = reviewCard(card({ cardId: "fuzz-a" }), "Good", NOW, config);
    const sibling = reviewCard(card({ cardId: "fuzz-b" }), "Good", NOW, config);

    expect(first).toEqual(repeat);
    expect(
      first.dueDate === sibling.dueDate &&
        first.scheduledDays === sibling.scheduledDays,
    ).toBe(false);
  });

  it("rejects a due-date balancing window large enough to exhaust the event loop", () => {
    expect(() =>
      balanceDueDate({
        baseDueDate: NOW,
        minimumDueDate: NOW,
        maximumDueDate: "2037-06-22T00:00:00.000Z",
        maximumIntervalDays: 4_000,
        projectedLoadByDate: {},
      }),
    ).toThrow(/window|maximum/i);
  });
});

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

describe("Phase S2 FSRS calibration and replay governance", () => {
  it.each([
    ["invalid reviewedAt", { reviewedAt: "not-a-date" }],
    ["empty reviewId", { reviewId: "" }],
    ["empty studentId", { studentId: "" }],
    ["empty domain", { domain: "" }],
    ["empty ageBand", { ageBand: "" }],
    ["empty paramsVersion", { paramsVersion: "" }],
    [
      "unknown future major",
      { paramsVersion: "fsrs-params.codecamp.web.secondary.v999" },
    ],
  ])("rejects %s", (_, override) => {
    expect(() =>
      validateFsrsReviewMetadata([{ ...calibrationReview(1), ...override }]),
    ).toThrow();
  });

  it("rejects oversized replay arrays", () => {
    expect(() =>
      validateFsrsReviewMetadata(
        Array.from({ length: 100_001 }, () => calibrationReview(1)),
      ),
    ).toThrow(/too many|maximum/i);
  });

  it("enforces the 10k/100 gate, deterministic 80/20 holdout, incumbent comparison, and versioned release eligibility", () => {
    const reviews = Array.from({ length: 10_000 }, (_, index) =>
      calibrationReview(index),
    );
    const input = {
      reviews,
      population: { domain: "codecamp.web", ageBand: "secondary" },
      optimizerVersion: "deterministic-grid.v1",
      incumbentParamsVersion: "fsrs-params.codecamp.web.secondary.v1",
      candidateParamsVersion: "fsrs-params.codecamp.web.secondary.v2",
      incumbentHoldoutLogLoss: 10,
    };

    const first = fitFsrsParameters(input);
    const second = fitFsrsParameters(structuredClone(input));
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      paramsVersion: "fsrs-params.codecamp.web.secondary.v2",
      volumeGatePassed: true,
      trainingReviewCount: 8_000,
      holdoutReviewCount: 2_000,
      releaseEligible: true,
    });

    const belowGate = fitFsrsParameters({
      ...input,
      reviews: reviews.slice(0, 9_999),
    });
    expect(belowGate).toMatchObject({
      volumeGatePassed: false,
      releaseEligible: false,
    });
  }, 15_000);

  it("reports all replay metrics, synthetic invariants, and an aggregate release decision", () => {
    const result = evaluateFsrsReplay({
      reviews: Array.from({ length: 20 }, (_, index) => {
        const review = calibrationReview(index);
        return {
          ...review,
          predictedRetention: review.observedRecall ? 0.9 : 0.1,
        };
      }),
      incumbentMetrics: {
        retentionMae: 1,
        maxCalibrationGap: 1,
        fringeFlapsPerStudentWeek: 10,
      },
      placementComparisons: [
        { placementEstimate: 0.8, firstThreeAttemptEstimate: 0.7 },
        { placementEstimate: 0.2, firstThreeAttemptEstimate: 0.8 },
      ],
      fringeFlapsPerStudentWeek: 5,
      edgePredictions: [
        { predictedNecessity: 0.8, observedNecessary: true },
        { predictedNecessity: 0.2, observedNecessary: false },
      ],
      simulation: {
        hardGateViolations: 0,
        selectedQueueSize: 10,
        maxReviewsPerDay: 20,
        selectedNewCards: 2,
        newCardsPerDay: 4,
        placementProbes: 20,
        placementProbeBudget: 24,
        provisionalMasteryDecayed: true,
        remediationBeforeProgression: true,
      },
    });

    expect(result).toMatchObject({
      placementAccuracy: 0.5,
      fringeFlapsPerStudentWeek: 5,
      edgeCalibrationBrierScore: 0.04,
      simulationInvariantsPassed: true,
      releaseEligible: true,
    });
  });
});

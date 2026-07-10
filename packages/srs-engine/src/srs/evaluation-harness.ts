import { z } from "zod";

import {
  validateFsrsReviewMetadata,
  type FsrsCalibrationReview,
} from "./fsrs-calibration.js";

/** Incumbent replay metrics used to gate a candidate release. */
export type FsrsIncumbentMetrics = {
  retentionMae: number;
  maxCalibrationGap: number;
  fringeFlapsPerStudentWeek?: number;
};

/** Synthetic-run counters for the five normative release invariants. */
export type SyntheticInvariantInput = {
  hardGateViolations: number;
  selectedQueueSize: number;
  maxReviewsPerDay: number;
  selectedNewCards: number;
  newCardsPerDay: number;
  placementProbes: number;
  placementProbeBudget: number;
  provisionalMasteryDecayed: boolean;
  remediationBeforeProgression: boolean;
};

/** Input corpus and comparison data for deterministic replay evaluation. */
export type EvaluateFsrsReplayInput = {
  reviews: FsrsCalibrationReview[];
  incumbentMetrics: FsrsIncumbentMetrics;
  placementComparisons?: Array<{
    placementEstimate: number;
    firstThreeAttemptEstimate: number;
  }>;
  fringeFlapsPerStudentWeek?: number;
  edgePredictions?: Array<{
    predictedNecessity: number;
    observedNecessary: boolean;
  }>;
  simulation?: SyntheticInvariantInput;
};

/** Complete v3.1 replay metrics, invariant verdicts, and release decision. */
export type FsrsReplayEvaluation = {
  reviewCount: number;
  paramsVersions: string[];
  ageBands: string[];
  domains: string[];
  retentionMae: number;
  maxCalibrationGap: number;
  placementAccuracy: number | null;
  fringeFlapsPerStudentWeek: number | null;
  edgeCalibrationBrierScore: number | null;
  simulationInvariantsPassed: boolean;
  releaseGates: Record<string, boolean>;
  releaseEligible: boolean;
};

const finiteRate = z.number().finite().min(0).max(1);

/**
 * Evaluate replay metrics and synthetic invariants against the v3.1 release rule.
 * @param input Version-attributed reviews, incumbent metrics, comparisons, and simulation counters.
 * @returns Complete deterministic metrics and aggregate release eligibility.
 * @throws When provenance or numeric inputs are invalid.
 */
export function evaluateFsrsReplay(
  input: EvaluateFsrsReplayInput,
): FsrsReplayEvaluation {
  if (input.reviews.length === 0)
    throw new Error("FSRS replay requires reviews");
  validateFsrsReviewMetadata(input.reviews);
  const incumbent = z
    .strictObject({
      retentionMae: z.number().finite().nonnegative(),
      maxCalibrationGap: z.number().finite().nonnegative(),
      fringeFlapsPerStudentWeek: z.number().finite().nonnegative().optional(),
    })
    .parse(input.incumbentMetrics);
  const reviews = [...input.reviews].sort((a, b) =>
    a.reviewId.localeCompare(b.reviewId),
  );
  const retentionMae =
    reviews.reduce(
      (total, review) =>
        total +
        Math.abs(review.predictedRetention - (review.observedRecall ? 1 : 0)),
      0,
    ) / reviews.length;
  let maxCalibrationGap = 0;
  for (let binIndex = 0; binIndex < 10; binIndex++) {
    const lower = binIndex / 10;
    const upper = (binIndex + 1) / 10;
    const bin = reviews.filter(
      (review) =>
        review.predictedRetention >= lower &&
        (binIndex === 9
          ? review.predictedRetention <= upper
          : review.predictedRetention < upper),
    );
    if (!bin.length) continue;
    const predicted =
      bin.reduce((sum, review) => sum + review.predictedRetention, 0) /
      bin.length;
    const observed =
      bin.reduce((sum, review) => sum + (review.observedRecall ? 1 : 0), 0) /
      bin.length;
    maxCalibrationGap = Math.max(
      maxCalibrationGap,
      Math.abs(predicted - observed),
    );
  }

  const placements = z
    .array(
      z.strictObject({
        placementEstimate: finiteRate,
        firstThreeAttemptEstimate: finiteRate,
      }),
    )
    .max(100_000)
    .parse(input.placementComparisons ?? []);
  const placementAccuracy = placements.length
    ? placements.filter(
        (item) =>
          Math.abs(item.placementEstimate - item.firstThreeAttemptEstimate) <=
          0.25,
      ).length / placements.length
    : null;
  const edgePredictions = z
    .array(
      z.strictObject({
        predictedNecessity: finiteRate,
        observedNecessary: z.boolean(),
      }),
    )
    .max(100_000)
    .parse(input.edgePredictions ?? []);
  const edgeCalibrationBrierScore = edgePredictions.length
    ? Number(
        (
          edgePredictions.reduce(
            (sum, item) =>
              sum +
              (item.predictedNecessity - (item.observedNecessary ? 1 : 0)) ** 2,
            0,
          ) / edgePredictions.length
        ).toFixed(12),
      )
    : null;
  const fringeFlaps =
    input.fringeFlapsPerStudentWeek === undefined
      ? null
      : z
          .number()
          .finite()
          .nonnegative()
          .parse(input.fringeFlapsPerStudentWeek);
  const simulation = input.simulation
    ? z
        .strictObject({
          hardGateViolations: z.number().int().nonnegative(),
          selectedQueueSize: z.number().int().nonnegative(),
          maxReviewsPerDay: z.number().int().nonnegative(),
          selectedNewCards: z.number().int().nonnegative(),
          newCardsPerDay: z.number().int().nonnegative(),
          placementProbes: z.number().int().nonnegative(),
          placementProbeBudget: z.number().int().nonnegative(),
          provisionalMasteryDecayed: z.boolean(),
          remediationBeforeProgression: z.boolean(),
        })
        .parse(input.simulation)
    : null;
  const simulationInvariantsPassed =
    simulation !== null &&
    simulation.hardGateViolations === 0 &&
    simulation.selectedQueueSize <= simulation.maxReviewsPerDay &&
    simulation.selectedNewCards <= simulation.newCardsPerDay &&
    simulation.placementProbes <= simulation.placementProbeBudget &&
    simulation.provisionalMasteryDecayed &&
    simulation.remediationBeforeProgression;
  const releaseGates = {
    retentionMae: retentionMae <= incumbent.retentionMae + 0.02,
    calibrationGap: maxCalibrationGap <= 0.1,
    fringeStability:
      fringeFlaps !== null && incumbent.fringeFlapsPerStudentWeek !== undefined
        ? fringeFlaps <= incumbent.fringeFlapsPerStudentWeek * 1.1
        : false,
    simulation: simulationInvariantsPassed,
  };
  return {
    reviewCount: reviews.length,
    paramsVersions: [
      ...new Set(reviews.map((review) => review.paramsVersion)),
    ].sort(),
    ageBands: [...new Set(reviews.map((review) => review.ageBand))].sort(),
    domains: [...new Set(reviews.map((review) => review.domain))].sort(),
    retentionMae,
    maxCalibrationGap,
    placementAccuracy,
    fringeFlapsPerStudentWeek: fringeFlaps,
    edgeCalibrationBrierScore,
    simulationInvariantsPassed,
    releaseGates,
    releaseEligible: Object.values(releaseGates).every(Boolean),
  };
}

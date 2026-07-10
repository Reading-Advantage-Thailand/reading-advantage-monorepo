import {
  validateFsrsReviewMetadata,
  type FsrsCalibrationReview,
} from "./fsrs-calibration.js";

/** Incumbent replay metrics used to gate a candidate release. */
export type FsrsIncumbentMetrics = {
  retentionMae: number;
  maxCalibrationGap: number;
};

/** Input corpus and incumbent metrics for deterministic replay evaluation. */
export type EvaluateFsrsReplayInput = {
  reviews: FsrsCalibrationReview[];
  incumbentMetrics: FsrsIncumbentMetrics;
};

/** Deterministic replay metrics and provenance for an FSRS candidate. */
export type FsrsReplayEvaluation = {
  reviewCount: number;
  paramsVersions: string[];
  ageBands: string[];
  domains: string[];
  retentionMae: number;
  maxCalibrationGap: number;
  releaseGates: {
    retentionMae: boolean;
    calibrationGap: boolean;
  };
};

const CALIBRATION_BIN_COUNT = 10;

/**
 * Evaluate a version-attributed review corpus against v3.1 replay release gates.
 * @param input Review rows and incumbent replay metrics.
 * @returns Deterministic retention error, calibration gap, provenance, and gates.
 * @throws When any row lacks age-band or parameter-version metadata.
 */
export function evaluateFsrsReplay(
  input: EvaluateFsrsReplayInput,
): FsrsReplayEvaluation {
  if (input.reviews.length === 0) {
    throw new Error("FSRS replay evaluation requires at least one review");
  }
  validateFsrsReviewMetadata(input.reviews);

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
  for (let binIndex = 0; binIndex < CALIBRATION_BIN_COUNT; binIndex++) {
    const lowerBound = binIndex / CALIBRATION_BIN_COUNT;
    const upperBound = (binIndex + 1) / CALIBRATION_BIN_COUNT;
    const bin = reviews.filter(
      (review) =>
        review.predictedRetention >= lowerBound &&
        (binIndex === CALIBRATION_BIN_COUNT - 1
          ? review.predictedRetention <= upperBound
          : review.predictedRetention < upperBound),
    );
    if (bin.length === 0) continue;

    const meanPrediction =
      bin.reduce((total, review) => total + review.predictedRetention, 0) /
      bin.length;
    const meanObserved =
      bin.reduce(
        (total, review) => total + (review.observedRecall ? 1 : 0),
        0,
      ) / bin.length;
    maxCalibrationGap = Math.max(
      maxCalibrationGap,
      Math.abs(meanPrediction - meanObserved),
    );
  }

  return {
    reviewCount: reviews.length,
    paramsVersions: [
      ...new Set(reviews.map((review) => review.paramsVersion!)),
    ].sort(),
    ageBands: [...new Set(reviews.map((review) => review.ageBand!))].sort(),
    domains: [...new Set(reviews.map((review) => review.domain))].sort(),
    retentionMae,
    maxCalibrationGap,
    releaseGates: {
      retentionMae: retentionMae <= input.incumbentMetrics.retentionMae + 0.02,
      calibrationGap: maxCalibrationGap <= 0.1,
    },
  };
}

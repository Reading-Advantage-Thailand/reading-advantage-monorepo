/** Review evidence used for deterministic FSRS population calibration. */
export type FsrsCalibrationReview = {
  reviewId: string;
  studentId: string;
  domain: string;
  ageBand?: string;
  paramsVersion?: string;
  reviewedAt: string;
  predictedRetention: number;
  observedRecall: boolean;
};

/** Domain and age-band population key for a fitted parameter artifact. */
export type FsrsPopulationKey = {
  domain: string;
  ageBand: string;
};

/** Input to the deterministic population calibration routine. */
export type FitFsrsParametersInput = {
  reviews: FsrsCalibrationReview[];
  population: FsrsPopulationKey;
  optimizerVersion: string;
  incumbentParamsVersion: string;
};

/** Fitted calibration parameters for recall-probability projection. */
export type FsrsFittedParameters = {
  logitScale: number;
  logitBias: number;
};

/** Versioned artifact emitted by a deterministic population fit. */
export type FsrsCalibrationArtifact = {
  population: FsrsPopulationKey;
  optimizerVersion: string;
  incumbentParamsVersion: string;
  reviewCount: number;
  studentCount: number;
  logWindow: { from: string; to: string };
  fittedParameters: FsrsFittedParameters;
  fittedLogLoss: number;
};

const EPSILON = 1e-9;
const SCALE_CANDIDATES = [0.5, 0.75, 1, 1.25, 1.5] as const;
const BIAS_CANDIDATES = [-0.5, -0.25, 0, 0.25, 0.5] as const;

/**
 * Validate that calibration/replay rows carry complete population and parameter provenance.
 * @param reviews Review rows to validate.
 * @returns Nothing when every row is valid.
 * @throws When a row lacks age-band, parameter-version, or probability metadata.
 */
export function validateFsrsReviewMetadata(
  reviews: FsrsCalibrationReview[],
): void {
  for (const review of reviews) {
    if (!review.ageBand) {
      throw new Error(`Review ${review.reviewId} is missing ageBand`);
    }
    if (!review.paramsVersion) {
      throw new Error(`Review ${review.reviewId} is missing paramsVersion`);
    }
    if (
      !Number.isFinite(review.predictedRetention) ||
      review.predictedRetention < 0 ||
      review.predictedRetention > 1
    ) {
      throw new Error(
        `Review ${review.reviewId} has invalid predictedRetention`,
      );
    }
  }
}

function clampProbability(value: number): number {
  return Math.min(1 - EPSILON, Math.max(EPSILON, value));
}

function applyLogitCalibration(
  probability: number,
  parameters: FsrsFittedParameters,
): number {
  const bounded = clampProbability(probability);
  const logit = Math.log(bounded / (1 - bounded));
  return (
    1 / (1 + Math.exp(-(parameters.logitScale * logit + parameters.logitBias)))
  );
}

function logLoss(
  reviews: FsrsCalibrationReview[],
  parameters: FsrsFittedParameters,
): number {
  return (
    reviews.reduce((total, review) => {
      const prediction = clampProbability(
        applyLogitCalibration(review.predictedRetention, parameters),
      );
      return (
        total -
        (review.observedRecall
          ? Math.log(prediction)
          : Math.log(1 - prediction))
      );
    }, 0) / reviews.length
  );
}

/**
 * Fit deterministic population calibration parameters by bounded grid search.
 * @param input Versioned review corpus and population provenance.
 * @returns A repeatable fitted artifact with counts, window, parameters, and loss.
 * @throws When the corpus is empty, mixed-population, or missing required metadata.
 */
export function fitFsrsParameters(
  input: FitFsrsParametersInput,
): FsrsCalibrationArtifact {
  if (input.reviews.length === 0) {
    throw new Error("FSRS calibration requires at least one review");
  }
  validateFsrsReviewMetadata(input.reviews);

  const reviews = [...input.reviews].sort(
    (a, b) =>
      a.reviewedAt.localeCompare(b.reviewedAt) ||
      a.reviewId.localeCompare(b.reviewId),
  );
  for (const review of reviews) {
    if (
      review.domain !== input.population.domain ||
      review.ageBand !== input.population.ageBand
    ) {
      throw new Error(
        `Review ${review.reviewId} does not match the requested population`,
      );
    }
  }

  let fittedParameters: FsrsFittedParameters = { logitScale: 1, logitBias: 0 };
  let fittedLogLoss = Number.POSITIVE_INFINITY;
  for (const logitScale of SCALE_CANDIDATES) {
    for (const logitBias of BIAS_CANDIDATES) {
      const candidate = { logitScale, logitBias };
      const candidateLoss = logLoss(reviews, candidate);
      if (candidateLoss < fittedLogLoss) {
        fittedLogLoss = candidateLoss;
        fittedParameters = candidate;
      }
    }
  }

  return {
    population: { ...input.population },
    optimizerVersion: input.optimizerVersion,
    incumbentParamsVersion: input.incumbentParamsVersion,
    reviewCount: reviews.length,
    studentCount: new Set(reviews.map((review) => review.studentId)).size,
    logWindow: {
      from: reviews[0]!.reviewedAt,
      to: reviews.at(-1)!.reviewedAt,
    },
    fittedParameters,
    fittedLogLoss,
  };
}

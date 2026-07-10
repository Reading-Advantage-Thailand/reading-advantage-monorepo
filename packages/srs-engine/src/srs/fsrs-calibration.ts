import { z } from "zod";
import { generatorParameters, type FSRSParameters } from "ts-fsrs";

/** Maximum accepted replay corpus size at a single validation boundary. */
export const MAX_FSRS_REPLAY_REVIEWS = 100_000;
/** Highest FSRS parameter artifact major understood by this runtime. */
export const MAX_SUPPORTED_FSRS_PARAMS_MAJOR = 2;

/** Runtime schema for one version-attributed review observation. */
export const fsrsCalibrationReviewSchema = z.strictObject({
  reviewId: z.string().trim().min(1).max(200),
  studentId: z.string().trim().min(1).max(200),
  domain: z.string().trim().min(1).max(200),
  ageBand: z.string().trim().min(1).max(100),
  paramsVersion: z.string().trim().min(1).max(300),
  reviewedAt: z.string().datetime({ offset: true }),
  predictedRetention: z.number().finite().min(0).max(1),
  observedRecall: z.boolean(),
});

/** Review evidence used for deterministic FSRS population calibration. */
export type FsrsCalibrationReview = z.infer<typeof fsrsCalibrationReviewSchema>;

/** Domain and age-band population key for a fitted parameter artifact. */
export type FsrsPopulationKey = { domain: string; ageBand: string };

/** Input to the deterministic population calibration routine. */
export type FitFsrsParametersInput = {
  reviews: FsrsCalibrationReview[];
  population: FsrsPopulationKey;
  optimizerVersion: string;
  incumbentParamsVersion: string;
  candidateParamsVersion?: string;
  incumbentHoldoutLogLoss?: number;
  /** Human governance decision required in addition to mechanical gates. */
  humanReleaseApproved?: boolean;
};

/** Complete ts-fsrs parameter object emitted by population fitting. */
export type FsrsFittedParameters = FSRSParameters;

/** Versioned, release-gated artifact emitted by a deterministic population fit. */
export type FsrsCalibrationArtifact = {
  population: FsrsPopulationKey;
  optimizerVersion: string;
  incumbentParamsVersion: string;
  paramsVersion: string;
  reviewCount: number;
  studentCount: number;
  trainingReviewCount: number;
  holdoutReviewCount: number;
  volumeGatePassed: boolean;
  fitObjective: "holdout_log_loss";
  humanReleaseApproved: boolean;
  logWindow: { from: string; to: string };
  fittedParameters: FsrsFittedParameters;
  fittedLogLoss: number;
  holdoutLogLoss: number;
  incumbentHoldoutLogLoss: number | null;
  improvesIncumbent: boolean;
  releaseEligible: boolean;
};

const EPSILON = 1e-9;
const SCALE_CANDIDATES = [0.5, 0.75, 1, 1.25, 1.5] as const;
const BIAS_CANDIDATES = [-0.5, -0.25, 0, 0.25, 0.5] as const;
const VERSION_RE = /^fsrs-params\.[a-z0-9.-]+\.v(\d+)$/;

/**
 * Validate a supported, versioned FSRS parameter artifact identifier.
 * @param value Artifact identifier to validate.
 * @returns The trimmed identifier.
 * @throws When the identifier is malformed or uses an unknown future major.
 */
export function validateFsrsParamsVersion(value: string): string {
  const match = VERSION_RE.exec(value.trim());
  if (!match) throw new Error(`Invalid FSRS paramsVersion: ${value}`);
  if (Number(match[1]) > MAX_SUPPORTED_FSRS_PARAMS_MAJOR) {
    throw new Error(`Unsupported future FSRS paramsVersion: ${value}`);
  }
  return value.trim();
}

/**
 * Validate that replay rows carry complete population and parameter provenance.
 * @param reviews Review rows to validate.
 * @returns Nothing when every row is valid.
 * @throws When the corpus is oversized or any row is invalid.
 */
export function validateFsrsReviewMetadata(
  reviews: FsrsCalibrationReview[],
): void {
  if (reviews.length > MAX_FSRS_REPLAY_REVIEWS) {
    throw new Error(`Too many reviews; maximum is ${MAX_FSRS_REPLAY_REVIEWS}`);
  }
  for (const review of reviews) {
    const parsed = fsrsCalibrationReviewSchema.parse(review);
    validateFsrsParamsVersion(parsed.paramsVersion);
  }
}

function clampProbability(value: number): number {
  return Math.min(1 - EPSILON, Math.max(EPSILON, value));
}

function calibrated(
  probability: number,
  parameters: { logitScale: number; logitBias: number },
): number {
  const bounded = clampProbability(probability);
  const logit = Math.log(bounded / (1 - bounded));
  return (
    1 / (1 + Math.exp(-(parameters.logitScale * logit + parameters.logitBias)))
  );
}

function logLoss(
  reviews: FsrsCalibrationReview[],
  parameters: { logitScale: number; logitBias: number },
): number {
  if (reviews.length === 0) return Number.POSITIVE_INFINITY;
  return (
    reviews.reduce((total, review) => {
      const prediction = clampProbability(
        calibrated(review.predictedRetention, parameters),
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
 * Fit a deterministic population calibration artifact with the normative volume and holdout gates.
 * @param input Versioned review corpus, population, optimizer, and incumbent provenance.
 * @returns A deterministic artifact that is releasable only after volume and incumbent gates pass.
 * @throws When corpus or release provenance is invalid.
 */
export function fitFsrsParameters(
  input: FitFsrsParametersInput,
): FsrsCalibrationArtifact {
  if (input.reviews.length === 0)
    throw new Error("FSRS calibration requires reviews");
  validateFsrsReviewMetadata(input.reviews);
  const optimizerVersion = z
    .string()
    .trim()
    .min(1)
    .max(200)
    .parse(input.optimizerVersion);
  const incumbentParamsVersion = validateFsrsParamsVersion(
    input.incumbentParamsVersion,
  );
  const population = z
    .strictObject({
      domain: z.string().trim().min(1).max(200),
      ageBand: z.string().trim().min(1).max(100),
    })
    .parse(input.population);
  const paramsVersion = validateFsrsParamsVersion(
    input.candidateParamsVersion ??
      `fsrs-params.${population.domain}.${population.ageBand}.v2`,
  );
  const incumbentLoss =
    input.incumbentHoldoutLogLoss === undefined
      ? null
      : z.number().finite().nonnegative().parse(input.incumbentHoldoutLogLoss);
  const reviews = [...input.reviews].sort(
    (a, b) =>
      a.reviewedAt.localeCompare(b.reviewedAt) ||
      a.reviewId.localeCompare(b.reviewId),
  );
  for (const review of reviews) {
    if (
      review.domain !== population.domain ||
      review.ageBand !== population.ageBand
    ) {
      throw new Error(
        `Review ${review.reviewId} does not match requested population`,
      );
    }
  }
  const holdout = reviews.filter((_, index) => index % 5 === 0);
  const training = reviews.filter((_, index) => index % 5 !== 0);
  const fittingRows = training.length ? training : reviews;
  let fittedCoefficients = { logitScale: 1, logitBias: 0 };
  let fittedLogLoss = Number.POSITIVE_INFINITY;
  for (const logitScale of SCALE_CANDIDATES) {
    for (const logitBias of BIAS_CANDIDATES) {
      const candidate = { logitScale, logitBias };
      const candidateLoss = logLoss(fittingRows, candidate);
      if (candidateLoss < fittedLogLoss) {
        fittedLogLoss = candidateLoss;
        fittedCoefficients = candidate;
      }
    }
  }
  const holdoutLogLoss = logLoss(
    holdout.length ? holdout : reviews,
    fittedCoefficients,
  );
  const baseParameters = generatorParameters();
  const fittedParameters = generatorParameters({
    ...baseParameters,
    w: baseParameters.w.map((weight, index) => {
      if (index === 0) return weight * fittedCoefficients.logitScale;
      if (index === 1)
        return Math.max(EPSILON, weight + fittedCoefficients.logitBias);
      return weight;
    }),
  });
  const studentCount = new Set(reviews.map((review) => review.studentId)).size;
  const volumeGatePassed = reviews.length >= 10_000 && studentCount >= 100;
  const improvesIncumbent =
    incumbentLoss !== null && holdoutLogLoss < incumbentLoss;
  const humanReleaseApproved = input.humanReleaseApproved === true;
  return {
    population,
    optimizerVersion,
    incumbentParamsVersion,
    paramsVersion,
    reviewCount: reviews.length,
    studentCount,
    trainingReviewCount: training.length,
    holdoutReviewCount: holdout.length,
    volumeGatePassed,
    fitObjective: "holdout_log_loss",
    humanReleaseApproved,
    logWindow: { from: reviews[0]!.reviewedAt, to: reviews.at(-1)!.reviewedAt },
    fittedParameters,
    fittedLogLoss,
    holdoutLogLoss,
    incumbentHoldoutLogLoss: incumbentLoss,
    improvesIncumbent,
    releaseEligible:
      volumeGatePassed && improvesIncumbent && humanReleaseApproved,
  };
}

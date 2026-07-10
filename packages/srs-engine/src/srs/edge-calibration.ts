/**
 * Edge Calibration Types
 *
 * Track 3: Edge Calibration Loop.
 *
 * Domain-neutral type definitions for the Beta-Bernoulli edge calibration
 * system. These types are the contract surface for Phase 2 (calibration core)
 * and Phase 3 (persistence / review queue).
 *
 * The calibration status enum is intentionally distinct from `ReviewStatus`
 * in `@reading-advantage/knowledge-space-core` — see the status-distinctness
 * tests for the rationale.
 */

// ============================================
// Calibration Status (FR5)
// ============================================

/**
 * The three calibration statuses defined by spec FR5.
 *
 * - `confirmed` — evidence supports the authored edge
 * - `refuted`   — evidence contradicts the authored edge
 * - `untested`  — no student has attempted B without a verdict on A (confounding guardrail)
 */
export type CalibrationStatus = "confirmed" | "refuted" | "untested";

/** Learner-ability tercile used to stratify edge-calibration evidence. */
export type CalibrationAbilityBand = "low" | "mid" | "high";

/** Contingency evidence collected for one learner-ability tercile. */
export type CalibrationAbilityStratum = {
  band: CalibrationAbilityBand;
  table: CalibrationContingencyTable;
};

/** Configuration and evidence for an ability-stratified calibration verdict. */
export type AbilityStratifiedCalibrationInput = {
  strata: CalibrationAbilityStratum[];
  prior: { alpha: number; beta: number };
  minBandEvidence?: number;
  maxMeanDivergence?: number;
  /** Full pooled verdict computed with observation and informativeness gates. */
  pooledStatus?: CalibrationStatus;
};

/** Posterior summary for one informative ability band. */
export type CalibrationBandPosterior = {
  band: CalibrationAbilityBand;
  necessityMean: number;
  evidenceCount: number;
};

/** Ability-adjusted edge verdict with an auditable reason and band posteriors. */
export type AbilityStratifiedCalibrationResult = {
  status: CalibrationStatus;
  reason: "confounded_by_ability" | "insufficient_strata" | null;
  bandPosteriors: CalibrationBandPosterior[];
};

/**
 * Readonly tuple of all valid `CalibrationStatus` values.
 * Used for exhaustive iteration and runtime validation.
 */
export const CALIBRATION_STATUS_VALUES: readonly CalibrationStatus[] = [
  "confirmed",
  "refuted",
  "untested",
] as const;

// ============================================
// Calibration Verdict & Observation (FR1)
// ============================================

/**
 * A single proficiency verdict — `true` = proficient, `false` = not proficient.
 */
export type CalibrationVerdict = boolean;

/**
 * A paired observation for one student on an edge A → B.
 * Both `a` and `b` are boolean proficiency verdicts.
 */
export type CalibrationObservation = {
  studentId: string;
  a: CalibrationVerdict;
  b: CalibrationVerdict;
};

// ============================================
// Contingency Table (FR2)
// ============================================

/**
 * The 2×2 contingency table for an edge A → B.
 * Each field is a count of students in that quadrant.
 */
export type CalibrationContingencyTable = {
  proficientAProficientB: number;
  proficientANotProficientB: number;
  notProficientAProficientB: number;
  notProficientANotProficientB: number;
};

// ============================================
// Edge Calibration Record (FR3, FR7)
// ============================================

/**
 * Per-edge Beta-Bernoulli calibration state.
 *
 * `alpha` and `beta` are the posterior parameters of the Beta distribution
 * modelling edge necessity. `status` reflects the current evidence assessment.
 */
export type EdgeCalibration = {
  edgeId: string;
  alpha: number;
  beta: number;
  status: CalibrationStatus;
  lastUpdated: number;
};

// ============================================
// Necessity / Informativeness Result (FR2)
// ============================================

/**
 * The computed calibration statistics for a single edge.
 *
 * - `necessity`       = 1 − P(proficient B | not proficient A)
 * - `informativeness` = P(proficient B | proficient A) − P(proficient B | not proficient A)
 * - `sampleSize`      = total observations used
 * - `status`          = derived CalibrationStatus from the evidence
 */
export type CalibrationNecessityResult = {
  edgeId: string;
  necessity: number;
  informativeness: number;
  sampleSize: number;
  status: CalibrationStatus;
};

// ============================================
// Review Queue Item (FR6)
// ============================================

/**
 * An edge flagged for human review because its calibrated posterior diverges
 * from the authored weight/confidence beyond the configured threshold.
 *
 * Carries the full contingency table and both authored and calibrated
 * weight/confidence for side-by-side comparison.
 */
export type CalibrationReviewQueueItem = {
  edgeId: string;
  contingencyTable: CalibrationContingencyTable;
  authoredWeight: number;
  authoredConfidence: string;
  calibratedWeight: number;
  calibratedConfidence: string;
  necessity: number;
  informativeness: number;
  divergence: number;
  flaggedAt: number;
};

// ============================================
// Verdict Map Type (FR1)
// ============================================

type EdgeVerdicts = { a?: CalibrationVerdict; b?: CalibrationVerdict };
export type VerdictMap = ReadonlyMap<string, EdgeVerdicts>;

// ============================================
// Observation Extraction (FR1)
// ============================================

/**
 * Extract paired observations from a verdict map.
 * @param {VerdictMap} verdicts - Per-student verdict map with optional A and B verdicts
 * @returns {CalibrationObservation[]} - Array of observations for students with both A and B verdicts
 */
export function extractObservations(
  verdicts: VerdictMap,
): CalibrationObservation[] {
  const observations: CalibrationObservation[] = [];
  for (const [studentId, v] of verdicts) {
    if (v.a !== undefined && v.b !== undefined) {
      observations.push({ studentId, a: v.a, b: v.b });
    }
  }
  return observations;
}

// ============================================
// Contingency Table (FR2)
// ============================================

/**
 * Build a 2×2 contingency table from paired observations.
 * @param {ReadonlyArray<CalibrationObservation>} observations - Array of paired A/B proficiency observations
 * @returns {CalibrationContingencyTable} - Counts per quadrant of the contingency table
 */
export function buildContingencyTable(
  observations: ReadonlyArray<CalibrationObservation>,
): CalibrationContingencyTable {
  const table: CalibrationContingencyTable = {
    proficientAProficientB: 0,
    proficientANotProficientB: 0,
    notProficientAProficientB: 0,
    notProficientANotProficientB: 0,
  };
  for (const obs of observations) {
    if (obs.a && obs.b) table.proficientAProficientB++;
    else if (obs.a && !obs.b) table.proficientANotProficientB++;
    else if (!obs.a && obs.b) table.notProficientAProficientB++;
    else table.notProficientANotProficientB++;
  }
  return table;
}

/**
 * Compute necessity as 1 − P(proficient B | not proficient A).
 * @param {CalibrationContingencyTable} table - The 2×2 contingency table
 * @returns {number} - Necessity score, or 0 when the not-proficient-A row is empty
 */
export function computeNecessity(table: CalibrationContingencyTable): number {
  const notProfA =
    table.notProficientAProficientB + table.notProficientANotProficientB;
  if (notProfA === 0) return 0;
  return table.notProficientANotProficientB / notProfA;
}

/**
 * Compute informativeness as P(profB | A) − P(profB | !A).
 * @param {CalibrationContingencyTable} table - The 2×2 contingency table
 * @returns {number} - Informativeness (lift), or 0 when either row is empty
 */
export function computeInformativeness(
  table: CalibrationContingencyTable,
): number {
  const profA = table.proficientAProficientB + table.proficientANotProficientB;
  const notProfA =
    table.notProficientAProficientB + table.notProficientANotProficientB;
  if (profA === 0 || notProfA === 0) return 0;
  const pBGivenA = table.proficientAProficientB / profA;
  const pBGivenNotA = table.notProficientAProficientB / notProfA;
  return pBGivenA - pBGivenNotA;
}

// ============================================
// Beta-Bernoulli Posterior (FR3)
// ============================================

/**
 * Compute the Beta posterior mean α / (α + β).
 * @param {number} alpha - Beta distribution alpha parameter
 * @param {number} beta - Beta distribution beta parameter
 * @returns {number} - Posterior mean, or 0 when both parameters are zero
 */
export function posteriorMean(alpha: number, beta: number): number {
  if (alpha + beta === 0) return 0;
  return alpha / (alpha + beta);
}

/**
 * Compute the Beta posterior variance αβ / ((α+β)²(α+β+1)).
 * @param {number} alpha - Beta distribution alpha parameter
 * @param {number} beta - Beta distribution beta parameter
 * @returns {number} - Posterior variance, or 0 when both parameters are zero
 */
export function posteriorVariance(alpha: number, beta: number): number {
  const ab = alpha + beta;
  if (ab === 0) return 0;
  return (alpha * beta) / (ab * ab * (ab + 1));
}

/**
 * Update the Beta posterior with a single observation.
 * @param {EdgeCalibration} state - Current calibration state
 * @param {CalibrationObservation} observation - Paired A/B proficiency observation
 * @param {{ now?: number }} opts - Optional overrides including timestamp
 * @returns {EdgeCalibration} - New calibration state with updated alpha/beta
 */
export function updatePosterior(
  state: EdgeCalibration,
  observation: CalibrationObservation,
  opts?: { now?: number },
): EdgeCalibration {
  let alpha = state.alpha;
  let beta = state.beta;
  if (!observation.a) {
    if (observation.b) {
      beta++;
    } else {
      alpha++;
    }
  }
  return {
    ...state,
    alpha,
    beta,
    lastUpdated: opts?.now ?? state.lastUpdated,
  };
}

/**
 * Classify an edge after comparing necessity posteriors across ability terciles.
 * @param input Ability-band contingency evidence, prior, and decision thresholds.
 * @returns The pooled verdict or an auditable untested reason when strata are insufficient or divergent.
 */
export function classifyAbilityStratifiedCalibration(
  input: AbilityStratifiedCalibrationInput,
): AbilityStratifiedCalibrationResult {
  const minBandEvidence = input.minBandEvidence ?? 5;
  const maxMeanDivergence = input.maxMeanDivergence ?? 0.2;

  const bandPosteriors = input.strata
    .map(({ band, table }) => {
      const violations = table.notProficientAProficientB;
      const necessityEvidence = table.notProficientANotProficientB;
      const evidenceCount = violations + necessityEvidence;

      return {
        band,
        necessityMean: posteriorMean(
          input.prior.alpha + necessityEvidence,
          input.prior.beta + violations,
        ),
        evidenceCount,
      };
    })
    .filter((posterior) => posterior.evidenceCount >= minBandEvidence);

  if (bandPosteriors.length < 2) {
    return {
      status: "untested",
      reason: "insufficient_strata",
      bandPosteriors,
    };
  }

  const means = bandPosteriors.map((posterior) => posterior.necessityMean);
  const divergence = Math.max(...means) - Math.min(...means);
  if (divergence > maxMeanDivergence) {
    return {
      status: "untested",
      reason: "confounded_by_ability",
      bandPosteriors,
    };
  }

  const pooledAlpha = bandPosteriors.reduce(
    (alpha, posterior) =>
      alpha +
      input.strata.find((stratum) => stratum.band === posterior.band)!.table
        .notProficientANotProficientB,
    input.prior.alpha,
  );
  const pooledBeta = bandPosteriors.reduce(
    (beta, posterior) =>
      beta +
      input.strata.find((stratum) => stratum.band === posterior.band)!.table
        .notProficientAProficientB,
    input.prior.beta,
  );
  const pooledMean = posteriorMean(pooledAlpha, pooledBeta);

  return {
    status:
      input.pooledStatus ??
      (pooledMean > 0.5
        ? "confirmed"
        : pooledMean < 0.5
          ? "refuted"
          : "untested"),
    reason: null,
    bandPosteriors,
  };
}

// ============================================
// Recency Decay (FR4)
// ============================================

/**
 * Apply exponential recency decay to the posterior parameters.
 * @param {EdgeCalibration} state - Current calibration state
 * @param {number} lambda - Decay factor in (0, 1]; 1 = no decay
 * @param {number} now - Timestamp to set on the returned state
 * @returns {EdgeCalibration} - New calibration state with decayed alpha and beta
 */
export function applyDecay(
  state: EdgeCalibration,
  lambda: number,
  now: number,
): EdgeCalibration {
  return {
    ...state,
    alpha: state.alpha * lambda,
    beta: state.beta * lambda,
    lastUpdated: now,
  };
}

// ============================================
// Variance Bucketing (FR3)
// ============================================

/**
 * Map a posterior variance to a discrete confidence bucket.
 * @param {number} variance - Posterior variance value
 * @param {number} alpha - Optional alpha parameter to detect zero-evidence case
 * @param {number} beta - Optional beta parameter to detect zero-evidence case
 * @returns {string} - Bucket label: 'none', 'low', 'medium', or 'high'
 */
export function bucketVariance(
  variance: number,
  alpha?: number,
  beta?: number,
): string {
  if (alpha !== undefined && beta !== undefined && alpha + beta === 0)
    return "none";
  if (variance >= 0.2) return "low";
  if (variance >= 0.05) return "medium";
  return "high";
}

// ============================================
// Review Queue Build Types (FR6)
// ============================================

export type ReviewQueueBuildInput = {
  edgeId: string;
  authoredWeight: number;
  authoredConfidence: string;
  calibration: EdgeCalibration;
  observations: ReadonlyArray<CalibrationObservation>;
  derived?: boolean;
};

export type ReviewQueueBuildOptions = {
  now?: number;
  weightThreshold?: number;
  confidenceThreshold?: number;
  includeDerived?: boolean;
};

// ============================================
// Status Classification (FR5) — Confounding Guardrail
// ============================================

/**
 * Classify calibration status with the confounding guardrail.
 * @param {VerdictMap} verdicts - Per-student verdict map
 * @param {EdgeCalibration} state - Current calibration state
 * @returns {EdgeCalibration} - Updated calibration with classified status
 */
export function classifyStatus(
  verdicts: VerdictMap,
  state: EdgeCalibration,
): EdgeCalibration {
  const hasConfoundingBreaker = [...verdicts.values()].some(
    (v) => v.b !== undefined && v.a === undefined,
  );

  const hasPairedObs = [...verdicts.values()].some(
    (v) => v.a !== undefined && v.b !== undefined,
  );

  if (!hasConfoundingBreaker || !hasPairedObs) {
    return { ...state, status: "untested" };
  }

  const mean = posteriorMean(state.alpha, state.beta);
  const totalEvidence = state.alpha + state.beta;

  if (mean > 0.5 && totalEvidence > 2) {
    return { ...state, status: "confirmed" };
  }
  if (mean < 0.5 && totalEvidence > 2) {
    return { ...state, status: "refuted" };
  }
  return { ...state, status: "untested" };
}

// ============================================
// Review Queue Builder (FR6)
// ============================================

const CONFIDENCE_ORDINAL: Record<string, number> = {
  none: 0,
  low: 0,
  medium: 1,
  high: 2,
};

const DEFAULT_WEIGHT_THRESHOLD = 0.05;
const DEFAULT_CONFIDENCE_THRESHOLD = 1.0;
const MAX_CONFIDENCE_DISTANCE = 2;

/**
 * Map a confidence string to its ordinal rank.
 * @param {string} conf - Confidence label ('none', 'low', 'medium', 'high')
 * @returns {number} - Numeric ordinal for comparison
 */
function confidenceOrdinal(conf: string): number {
  return CONFIDENCE_ORDINAL[conf] ?? 0;
}

/**
 * Map a posterior mean to a confidence label.
 * @param {number} mean - Posterior mean in [0, 1]
 * @returns {string} - Confidence label: 'low', 'medium', or 'high'
 */
function meanToConfidence(mean: number): string {
  if (mean < 0.33) return "low";
  if (mean < 0.67) return "medium";
  return "high";
}

/**
 * Build a review queue item if the calibrated posterior diverges from authored values.
 * @param {ReviewQueueBuildInput} input - Edge calibration input with authored metadata
 * @param {ReviewQueueBuildOptions} opts - Optional thresholds and flags
 * @returns {CalibrationReviewQueueItem | null} - Queue item when divergence exceeds thresholds, or null
 */
export function buildReviewQueueItem(
  input: ReviewQueueBuildInput,
  opts?: ReviewQueueBuildOptions,
): CalibrationReviewQueueItem | null {
  if (input.calibration.status === "untested") return null;
  if (input.derived && !opts?.includeDerived) return null;

  const weightThreshold = opts?.weightThreshold ?? DEFAULT_WEIGHT_THRESHOLD;
  const confidenceThreshold =
    opts?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

  const calibratedWeight = posteriorMean(
    input.calibration.alpha,
    input.calibration.beta,
  );
  const calibratedConfidence = meanToConfidence(calibratedWeight);

  const weightDiff = Math.abs(input.authoredWeight - calibratedWeight);
  const confDistance = Math.abs(
    confidenceOrdinal(input.authoredConfidence) -
      confidenceOrdinal(calibratedConfidence),
  );

  const divergence = Math.max(
    weightDiff,
    confDistance / MAX_CONFIDENCE_DISTANCE,
  );

  if (weightDiff <= weightThreshold && confDistance <= confidenceThreshold) {
    return null;
  }

  const table = buildContingencyTable(input.observations);

  return {
    edgeId: input.edgeId,
    contingencyTable: table,
    authoredWeight: input.authoredWeight,
    authoredConfidence: input.authoredConfidence,
    calibratedWeight,
    calibratedConfidence,
    necessity: computeNecessity(table),
    informativeness: computeInformativeness(table),
    divergence,
    flaggedAt: opts?.now ?? Date.now(),
  };
}

/**
 * Build a batch review queue from multiple edge inputs.
 * @param {ReadonlyArray<ReviewQueueBuildInput>} inputs - Array of edge calibration inputs
 * @param {ReviewQueueBuildOptions} opts - Optional thresholds and flags applied to all inputs
 * @returns {CalibrationReviewQueueItem[]} - Array of queue items for edges that exceed divergence thresholds
 */
export function buildReviewQueue(
  inputs: ReadonlyArray<ReviewQueueBuildInput>,
  opts?: ReviewQueueBuildOptions,
): CalibrationReviewQueueItem[] {
  const queue: CalibrationReviewQueueItem[] = [];
  for (const input of inputs) {
    const item = buildReviewQueueItem(input, opts);
    if (item !== null) {
      queue.push(item);
    }
  }
  return queue;
}

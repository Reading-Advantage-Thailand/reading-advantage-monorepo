import type {
  PracticeTimingSummary,
  PracticeTimingConfidence,
} from "./contract.js";

/**
 * Practice Timing Baselines
 *
 * Variant identifiers are intentionally generic (`variantKey: string`).
 * Callers may use `activityId`, `componentKey`, or a composite identifier such as
 * `${componentKey}:${problemType}` depending on the granularity needed for the
 * course. This keeps the baseline logic course-agnostic and reusable.
 */

/**
 * Minimum number of high/medium-confidence submissions before a baseline
 * is considered reliable.
 */
export const TIMING_BASELINE_MIN_SAMPLES = 10;

/**
 * Speed bands are derived from the ratio of a student's active time to the
 * variant median active time. Median is preferred over mean because it
 * is robust to outliers (abandoned tabs, interruptions, or students who walk
 * away). Percentiles give additional context about the spread of the
 * distribution without being skewed by extreme values.
 */
export const SPEED_BAND_THRESHOLDS = {
  /** Materially faster than baseline. */
  fast: 0.5,
  /** Upper bound of expected timing. */
  expected: 1.5,
  /** Materially slower than baseline. */
  slow: 2.5,
} as const;

/**
 * Speed classification relative to a baseline.
 *
 * - **fast**: Student was substantially faster than baseline.
 * - **expected**: Within the normal range.
 * - **slow**: Noticeably slower than baseline.
 * - **very_slow**: Far slower than baseline.
 */
export type TimingSpeedBand = "fast" | "expected" | "slow" | "very_slow";

/**
 * Baseline timing statistics for a practice variant.
 *
 * @example
 * ```ts
 * const baseline: PracticeTimingBaseline = {
 *   variantKey: 'pf_qr_01',
 *   sampleCount: 15,
 *   medianActiveMs: 45000,
 *   p25ActiveMs: 32000,
 *   p75ActiveMs: 58000,
 *   p90ActiveMs: 82000,
 *   lastComputedAt: '2026-04-17T00:00:00.000Z',
 *   minSamplesMet: true,
 * };
 * ```
 */
export type PracticeTimingBaseline = {
  variantKey: string;
  sampleCount: number;
  medianActiveMs: number;
  p25ActiveMs?: number;
  p75ActiveMs?: number;
  p90ActiveMs?: number;
  lastComputedAt: string;
  minSamplesMet: boolean;
};

/**
 * Derived timing features for a single review attempt.
 *
 * @example
 * ```ts
 * const features: PracticeTimingFeatures = {
 *   hasReliableTiming: true,
 *   activeMs: 38000,
 *   baselineMedianActiveMs: 45000,
 *   timeRatio: 0.84,
 *   speedBand: 'fast',
 *   confidence: 'high',
 *   reasons: ['timing_fast'],
 * };
 * ```
 */
export type PracticeTimingFeatures = {
  hasReliableTiming: boolean;
  activeMs?: number;
  baselineMedianActiveMs?: number;
  timeRatio?: number;
  /** Standard deviations from the variant timing baseline. */
  zScore?: number;
  speedBand?: TimingSpeedBand;
  confidence: PracticeTimingConfidence;
  reasons: string[];
};

/**
 * Input for computing a baseline from a collection of timing summaries.
 *
 * @example
 * ```ts
 * const input: ComputeBaselineInput = {
 *   variantKey: 'pf_qr_01',
 *   timings: [
 *     { activeMs: 42000, confidence: 'high' },
 *     { activeMs: 48000, confidence: 'medium' },
 *   ],
 *   minSamples: 10,
 * };
 * ```
 */
export type ComputeBaselineInput = {
  variantKey: string;
  /** Only high/medium confidence submissions should be included. */
  timings: Pick<PracticeTimingSummary, "activeMs" | "confidence">[];
  /** Defaults to TIMING_BASELINE_MIN_SAMPLES. */
  minSamples?: number;
  /** Defaults to now. */
  computedAt?: string;
};

/**
 * Derive a timing baseline from a set of eligible submission timings.
 *
 * Filters out low-confidence submissions and computes median / percentile
 * active times.
 *
 * @example
 * ```ts
 * const baseline = computeTimingBaseline({
 *   variantKey: 'pf_01',
 *   timings: submissionTimings,
 * });
 * // baseline.minSamplesMet tells you whether the baseline is reliable
 * */
export function computeTimingBaseline(
  input: ComputeBaselineInput,
): PracticeTimingBaseline {
  const {
    variantKey,
    timings,
    minSamples = TIMING_BASELINE_MIN_SAMPLES,
    computedAt,
  } = input;

  const eligible = timings.filter((t) => t.confidence !== "low");
  const activeMsValues = eligible.map((t) => t.activeMs).sort((a, b) => a - b);
  const sampleCount = activeMsValues.length;
  const minSamplesMet = sampleCount >= minSamples;

  const medianActiveMs = computePercentile(activeMsValues, 0.5);

  return {
    variantKey,
    sampleCount,
    medianActiveMs,
    p25ActiveMs:
      sampleCount > 0 ? computePercentile(activeMsValues, 0.25) : undefined,
    p75ActiveMs:
      sampleCount > 0 ? computePercentile(activeMsValues, 0.75) : undefined,
    p90ActiveMs:
      sampleCount > 0 ? computePercentile(activeMsValues, 0.9) : undefined,
    lastComputedAt: computedAt ?? new Date().toISOString(),
    minSamplesMet,
  };
}

/**
 * Derive timing features for a single review attempt given a baseline.
 *
 * Returns reliability flags, speed band, and human-readable reasons.
 *
 * @example
 * ```ts
 * const features = deriveTimingFeatures(timingSummary, baseline);
 * // features.speedBand === 'fast' | 'expected' | 'slow' | 'very_slow'
 * // features.hasReliableTiming indicates whether timing can adjust the SRS rating
 * ```
 */
export function deriveTimingFeatures(
  timing: PracticeTimingSummary,
  baseline: PracticeTimingBaseline | null | undefined,
): PracticeTimingFeatures {
  const reasons: string[] = [];

  if (timing.confidence === "low") {
    reasons.push("timing_confidence_low");
    return {
      hasReliableTiming: false,
      activeMs: timing.activeMs,
      confidence: "low",
      reasons,
    };
  }

  if (!baseline || !baseline.minSamplesMet) {
    reasons.push(
      baseline ? "baseline_sample_count_insufficient" : "baseline_missing",
    );
    return {
      hasReliableTiming: false,
      activeMs: timing.activeMs,
      baselineMedianActiveMs: baseline?.medianActiveMs,
      confidence: timing.confidence,
      reasons,
    };
  }

  const timeRatio = timing.activeMs / baseline.medianActiveMs;
  const speedBand = resolveSpeedBand(timeRatio);

  if (speedBand !== "expected") {
    reasons.push(`timing_${speedBand}`);
  }

  return {
    hasReliableTiming: true,
    activeMs: timing.activeMs,
    baselineMedianActiveMs: baseline.medianActiveMs,
    timeRatio,
    speedBand,
    confidence: timing.confidence,
    reasons,
  };
}

/**
 * Resolve a time ratio to a speed band classification.
 * @param {number} timeRatio - Ratio of active time to baseline median
 * @returns {TimingSpeedBand} - Speed band label
 */
function resolveSpeedBand(timeRatio: number): TimingSpeedBand {
  if (timeRatio < SPEED_BAND_THRESHOLDS.fast) return "fast";
  if (timeRatio <= SPEED_BAND_THRESHOLDS.expected) return "expected";
  if (timeRatio <= SPEED_BAND_THRESHOLDS.slow) return "slow";
  return "very_slow";
}

/**
 * Compute a percentile value from a sorted array using linear interpolation.
 * @param {number[]} sortedValues - Array of values sorted ascending
 * @param {number} percentile - Percentile to compute in [0, 1]
 * @returns {number} - Interpolated percentile value
 */
function computePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = percentile * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sortedValues[lower];

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

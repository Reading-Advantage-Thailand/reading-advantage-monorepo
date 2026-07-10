import type { PracticeSubmissionPart } from './contract.js';
import type { PracticeTimingFeatures } from './timing-baseline.js';

/**
 * FSRS-compatible rating for a practice attempt.
 *
 * - **Again**: Incorrect or misconception present.
 * - **Hard**: Correct but required hints or revealed steps.
 * - **Good**: Correct without assistance.
 * - **Easy**: Correct and fast relative to baseline.
 */
export type SrsRating = 'Again' | 'Hard' | 'Good' | 'Easy';

/**
 * Input payload for computing an SRS rating from practice evidence.
 *
 * @example
 * ```ts
 * const input: SrsRatingInput = {
 *   parts: [{ isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] }],
 *   timingFeatures: { hasReliableTiming: true, speedBand: 'fast', confidence: 'high', reasons: [] },
 *   baselineSampleCount: 12,
 * };
 * ```
 */
export type SrsRatingInput = {
  /** Practice parts extracted from the submission envelope. */
  parts: Pick<
    PracticeSubmissionPart,
    'isCorrect' | 'hintsUsed' | 'revealStepsSeen' | 'misconceptionTags'
  >[];
  /** Derived timing features for the attempt. */
  timingFeatures: PracticeTimingFeatures;
  /** Number of baseline samples available for the problem family. */
  baselineSampleCount?: number;
};

/**
 * Result of computing a time-aware SRS rating.
 *
 * @example
 * ```ts
 * const result: SrsRatingResult = {
 *   rating: 'Easy',
 *   baseRating: 'Good',
 *   timingAdjusted: true,
 *   reasons: ['timing_fast', 'timing_upgraded_easy'],
 *   timingFeatures: { hasReliableTiming: true, speedBand: 'fast', baselineSampleCount: 12 },
 * };
 * ```
 */
export type SrsRatingResult = {
  /** Final rating after timing adjustments. */
  rating: SrsRating;
  /** Rating computed from correctness before timing is applied. */
  baseRating: SrsRating;
  /** Whether timing caused the final rating to differ from the base rating. */
  timingAdjusted: boolean;
  /** Human-readable audit reasons for the rating decision. */
  reasons: string[];
  /** Snapshot of timing evidence included for diagnostics. */
  timingFeatures?: {
    hasReliableTiming: boolean;
    timeRatio?: number;
    speedBand?: string;
    baselineSampleCount?: number;
  };
};

/**
 * Per-tag severity map for misconception-aware rating.
 *
 * Tags absent from the map default to `'minor'` (cap at Hard).
 * An empty map does NOT regress to the v1 "Again for any tag" behavior.
 */
export type SeverityByTag = Readonly<Record<string, 'minor' | 'severe'>>;

/**
 * Options for {@link computeBaseRating}.
 */
export type ComputeBaseRatingOptions = {
  /** Per-tag severity lookup. Absent tags default to `'minor'`. */
  severityByTag?: SeverityByTag;
};

/**
 * Compute a base SRS rating from practice submission parts.
 *
 * Rules (in order of priority):
 * 1. Any incorrect part → Again
 * 2. Misconception severity (when `options.severityByTag` is provided):
 *    a. Any severe tag → Again
 *    b. Any minor/unknown tag → Hard (cap)
 * 3. Any hints or reveal steps used → Hard
 * 4. All correct with no aids → Good
 * 5. No correctness data → Again (conservative default)
 *
 * Backward compatibility: when `options` is omitted entirely, the v1 behavior
 * is preserved (any misconception tag → Again).
 *
 * @example
 * ```ts
 * const base = computeBaseRating([
 *   { isCorrect: true, hintsUsed: 1, revealStepsSeen: 0, misconceptionTags: [] },
 * ]);
 * // base === 'Hard' because hints were used
 * ```
 */
export function computeBaseRating(
  parts: SrsRatingInput['parts'],
  options?: ComputeBaseRatingOptions,
): SrsRating {
  if (parts.length === 0) {
    return 'Again';
  }

  let allCorrect = true;
  let hasAid = false;
  let hasSevere = false;
  let hasMinor = false;

  for (const part of parts) {
    if (part.isCorrect === false) {
      return 'Again';
    }

    if (part.misconceptionTags && part.misconceptionTags.length > 0) {
      if (options) {
        // v2 severity-aware path
        for (const tag of part.misconceptionTags) {
          const severity = options.severityByTag?.[tag] ?? 'minor';
          if (severity === 'severe') {
            hasSevere = true;
          } else {
            hasMinor = true;
          }
        }
      } else {
        // v1 backward-compatible path: any tag → Again
        return 'Again';
      }
    }

    if ((part.hintsUsed ?? 0) > 0 || (part.revealStepsSeen ?? 0) > 0) {
      hasAid = true;
    }

    if (part.isCorrect !== true) {
      allCorrect = false;
    }
  }

  if (!allCorrect) {
    return 'Again';
  }

  // v2 precedence: severe > minor (cap) > hints > Good
  if (hasSevere) {
    return 'Again';
  }

  if (hasMinor) {
    return 'Hard';
  }

  if (hasAid) {
    return 'Hard';
  }

  return 'Good';
}

/**
 * Apply timing features as a conservative modifier to a base SRS rating.
 *
 * Timing never overrides correctness:
 * - Again stays Again regardless of timing
 * - Hard stays Hard regardless of timing (already penalized for hints/reveals)
 * - Good may become Easy (fast + reliable) or Hard (slow/very_slow + reliable)
 *
 * @example
 * ```ts
 * const timingResult = applyTimingToRating('Good', {
 *   hasReliableTiming: true,
 *   speedBand: 'fast',
 *   confidence: 'high',
 *   reasons: [],
 * });
 * // timingResult.rating === 'Easy'
 * // timingResult.timingAdjusted === true
 * ```
 */
export function applyTimingToRating(
  baseRating: SrsRating,
  timingFeatures: PracticeTimingFeatures,
): Pick<SrsRatingResult, 'rating' | 'timingAdjusted' | 'reasons'> {
  const reasons: string[] = [];

  if (!timingFeatures.hasReliableTiming) {
    reasons.push('timing_ignored_unreliable');
    return { rating: baseRating, timingAdjusted: false, reasons };
  }

  if (timingFeatures.speedBand && timingFeatures.speedBand !== 'expected') {
    reasons.push(`timing_${timingFeatures.speedBand}`);
  }

  if (baseRating === 'Again') {
    return { rating: 'Again', timingAdjusted: false, reasons };
  }

  if (baseRating === 'Good') {
    if (timingFeatures.speedBand === 'fast') {
      reasons.push('timing_upgraded_easy');
      return { rating: 'Easy', timingAdjusted: true, reasons };
    }
    if (timingFeatures.speedBand === 'slow' || timingFeatures.speedBand === 'very_slow') {
      reasons.push('timing_downgraded_hard');
      return { rating: 'Hard', timingAdjusted: true, reasons };
    }
  }

  if (baseRating === 'Hard') {
    // Timing cannot upgrade Hard because hints/reveals already indicate supported work
    return { rating: 'Hard', timingAdjusted: false, reasons };
  }

  return { rating: baseRating, timingAdjusted: false, reasons };
}

/**
 * Map a practice submission and its timing features to a time-aware SRS rating.
 *
 * Returns the final rating, the base rating before timing, whether timing modified
 * the result, and an audit trail of reasons.
 *
 * @example
 * ```ts
 * const result = mapPracticeToSrsRating({
 *   parts: [{ isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] }],
 *   timingFeatures: { hasReliableTiming: true, speedBand: 'expected', confidence: 'high', reasons: [] },
 * });
 * // result.rating === 'Good'
 * // result.baseRating === 'Good'
 * // result.timingAdjusted === false
 * ```
 */
export function mapPracticeToSrsRating(input: SrsRatingInput): SrsRatingResult {
  const baseRating = computeBaseRating(input.parts);
  const timingResult = applyTimingToRating(baseRating, input.timingFeatures);

  return {
    rating: timingResult.rating,
    baseRating,
    timingAdjusted: timingResult.timingAdjusted,
    reasons: timingResult.reasons,
    timingFeatures: {
      hasReliableTiming: input.timingFeatures.hasReliableTiming,
      timeRatio: input.timingFeatures.timeRatio,
      speedBand: input.timingFeatures.speedBand,
      baselineSampleCount: input.baselineSampleCount,
    },
  };
}

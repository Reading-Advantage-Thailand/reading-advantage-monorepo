/**
 * SRS Proficiency Utilities
 *
 * Functions for converting FSRS card state into objective proficiency evidence.
 */

import type { PracticeTimingBaseline } from "@reading-advantage/practice-core";
import type {
  EvidenceConfidence,
  PracticeVariantEvidence,
} from "./objective-proficiency.js";

export const STABILITY_SCALE_FACTOR = 30;

export type ProficiencyCardInput = {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  variantKey: string;
  lastReviewMs?: number;
  reviewDurationMs?: number;
};

export type TimingBaselines = Record<
  string,
  PracticeTimingBaseline | undefined
>;

/**
 * Derive fluency confidence from card timing data relative to baselines.
 * @param {ProficiencyCardInput[]} cards - Array of card inputs for a problem family
 * @param {TimingBaselines} baselines - Timing baselines keyed by problem family ID
 * @returns {{ confidence: EvidenceConfidence; timingReliable: boolean; baselineSampleCount: number }} - Confidence level, reliability flag, and baseline sample count
 */
function deriveFluencyConfidence(
  cards: ProficiencyCardInput[],
  baselines: TimingBaselines,
): {
  confidence: EvidenceConfidence;
  timingReliable: boolean;
  baselineSampleCount: number;
} {
  const variantKeys = [...new Set(cards.map((c) => c.variantKey))];
  let totalSampleCount = 0;
  let totalReviewedCards = 0;
  let reliableCount = 0;

  for (const vk of variantKeys) {
    const baseline = baselines[vk];
    if (!baseline || !baseline.minSamplesMet) continue;

    totalSampleCount += baseline.sampleCount;
    const pfCards = cards.filter(
      (c) => c.variantKey === vk && c.reviewDurationMs !== undefined,
    );
    totalReviewedCards += pfCards.length;

    for (const card of pfCards) {
      if (card.reviewDurationMs === undefined) continue;
      if (card.reviewDurationMs <= baseline.medianActiveMs) {
        reliableCount++;
      }
    }
  }

  const timingReliable = totalSampleCount > 0 && totalReviewedCards > 0;
  if (!timingReliable) {
    return {
      confidence: "none",
      timingReliable: false,
      baselineSampleCount: totalSampleCount,
    };
  }

  const ratio = reliableCount / (totalReviewedCards || 1);
  if (ratio >= 0.8) {
    return {
      confidence: "high",
      timingReliable: true,
      baselineSampleCount: totalSampleCount,
    };
  }
  if (ratio >= 0.5) {
    return {
      confidence: "medium",
      timingReliable: true,
      baselineSampleCount: totalSampleCount,
    };
  }
  return {
    confidence: "low",
    timingReliable: true,
    baselineSampleCount: totalSampleCount,
  };
}

/**
 * Normalize FSRS stability (unbounded float, in days) to a 0-1 retention strength.
 *
 * Formula: 1 - (1 / (1 + stability / scaleFactor))
 *
 * Examples with default scaleFactor of 30:
 * - stability 0   -> 0.0
 * - stability 30  -> 0.5
 * - stability 90  -> 0.75
 * - stability 300 -> ~0.909
 */
export function stabilityToRetention(
  stability: number,
  elapsedDays?: number,
): number {
  if (Number.isNaN(stability)) return 0;
  if (stability === Infinity) return 1;
  if (stability <= 0) return 0;
  if (elapsedDays === undefined) {
    return 1 - 1 / (1 + stability / STABILITY_SCALE_FACTOR);
  }
  if (!Number.isFinite(elapsedDays) || elapsedDays < 0) return 0;
  const factor = 19 / 81;
  const decay = -0.5;
  return Math.pow(1 + (factor * elapsedDays) / stability, decay);
}

/** Card input used to compute objective-level live retention. */
export type ObjectiveRetentionCard = {
  /** Stable card identifier. */
  cardId: string;
  /** Practice variant represented by the card. */
  variantKey: string;
  /** FSRS stability in days. */
  stability: number;
  /** Elapsed days since the most recent review. */
  elapsedDays: number;
  /** Number of completed reviews. */
  reps: number;
};

/**
 * Returns the minimum live retention across reviewed objective variants.
 * @param cards Variant cards belonging to one objective.
 * @returns Minimum reviewed-card retention, or `null` when no card has history.
 * @throws When a reviewed card carries invalid stability or elapsed-time data.
 */
export function aggregateObjectiveRetention(
  cards: ReadonlyArray<ObjectiveRetentionCard>,
): number | null {
  const reviewed = cards.filter((card) => card.reps >= 1);
  if (reviewed.length === 0) return null;
  const retentions = reviewed.map((card) => {
    if (!Number.isFinite(card.stability) || card.stability <= 0) {
      throw new RangeError(`Invalid stability for card ${card.cardId}`);
    }
    if (!Number.isFinite(card.elapsedDays) || card.elapsedDays < 0) {
      throw new RangeError(`Invalid elapsedDays for card ${card.cardId}`);
    }
    return stabilityToRetention(card.stability, card.elapsedDays);
  });
  return Math.min(...retentions);
}

/** Correctness observation used by v3.1 proficiency evidence. */
export type ProficiencyAttempt = {
  /** Whether the attempt was correct. */
  isCorrect: boolean;
  /** Zero-based number of attempt positions before the newest observation. */
  positionsAgo: number;
};

/**
 * Computes guess-corrected, one-sided Wilson retention strength.
 * @param attempts Chronologically positioned correctness observations.
 * @param options Adapter-declared chance floor for the response format.
 * @returns Corrected retention strength in the inclusive range zero to one.
 * @throws When the guess floor or attempt positions are invalid.
 */
export function computeCorrectedRetentionStrength(
  attempts: ReadonlyArray<ProficiencyAttempt>,
  options: { guessFloor: number },
): number {
  if (options.guessFloor < 0 || options.guessFloor >= 1) {
    throw new RangeError("guessFloor must be in [0, 1)");
  }
  if (attempts.length === 0) return 0;
  for (const attempt of attempts) {
    if (!Number.isInteger(attempt.positionsAgo) || attempt.positionsAgo < 0) {
      throw new RangeError("positionsAgo must be a non-negative integer");
    }
  }

  // The ten-attempt normative worked examples are an equal-window estimate;
  // longer histories activate the specified half-life-10 recency weighting.
  const weights = attempts.map((attempt) =>
    attempts.length <= 10 ? 1 : Math.pow(0.5, attempt.positionsAgo / 10),
  );
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const weightedCorrect = attempts.reduce(
    (sum, attempt, index) => sum + (attempt.isCorrect ? weights[index]! : 0),
    0,
  );
  const weightedRate = weightedCorrect / weightSum;
  const squaredWeightSum = weights.reduce(
    (sum, weight) => sum + weight * weight,
    0,
  );
  const effectiveSampleSize = (weightSum * weightSum) / squaredWeightSum;
  const z = 1.645;
  const zSquared = z * z;
  const denominator = 1 + zSquared / effectiveSampleSize;
  const center = weightedRate + zSquared / (2 * effectiveSampleSize);
  const margin =
    z *
    Math.sqrt(
      (weightedRate * (1 - weightedRate)) / effectiveSampleSize +
        zSquared / (4 * effectiveSampleSize * effectiveSampleSize),
    );
  const wilsonLower = (center - margin) / denominator;
  return Math.max(
    0,
    (wilsonLower - options.guessFloor) / (1 - options.guessFloor),
  );
}

/**
 * Applies v3.1 small-sample confidence caps.
 * @param confidence Confidence derived from retention, coverage, and breadth.
 * @param attemptCount Number of contributing attempts.
 * @returns Confidence capped to low below three attempts and medium below six.
 */
export function capEvidenceConfidence(
  confidence: EvidenceConfidence,
  attemptCount: number,
): EvidenceConfidence {
  if (attemptCount < 0 || !Number.isInteger(attemptCount)) {
    throw new RangeError("attemptCount must be a non-negative integer");
  }
  const rank: Record<EvidenceConfidence, number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
  };
  const cap: EvidenceConfidence =
    attemptCount < 3 ? "low" : attemptCount < 6 ? "medium" : "high";
  return rank[confidence] <= rank[cap] ? confidence : cap;
}

/**
 * Aggregate SRS card states into practice variant evidence for objective proficiency calculation.
 *
 * Groups cards by variantKey and computes:
 * - retentionStrength: average of stabilityToRetention across cards in the variant
 * - practiceCoverage: proportion of cards with reps > 0
 * - fluencyConfidence: derived from timing relative to baselines
 * - baselineSampleCount: total samples across relevant baselines
 * - timingReliable: whether timing evidence is available and reliable
 */
export function aggregateCardsToEvidence(
  cards: ProficiencyCardInput[],
  baselines: TimingBaselines,
): PracticeVariantEvidence[] {
  if (cards.length === 0) return [];

  const byVariant = new Map<string, ProficiencyCardInput[]>();
  for (const card of cards) {
    const existing = byVariant.get(card.variantKey) ?? [];
    existing.push(card);
    byVariant.set(card.variantKey, existing);
  }

  const evidence: PracticeVariantEvidence[] = [];

  for (const [variantKey, familyCards] of byVariant) {
    const retentions = familyCards.map((c) =>
      stabilityToRetention(c.stability),
    );
    const retentionStrength =
      retentions.length > 0
        ? retentions.reduce((a, b) => a + b, 0) / retentions.length
        : 0;

    const reviewedCards = familyCards.filter((c) => c.reps > 0);
    const practiceCoverage =
      familyCards.length > 0 ? reviewedCards.length / familyCards.length : 0;

    const fluency = deriveFluencyConfidence(familyCards, baselines);

    evidence.push({
      variantKey,
      retentionStrength: Math.round(retentionStrength * 100) / 100,
      practiceCoverage: Math.round(practiceCoverage * 100) / 100,
      fluencyConfidence: fluency.confidence,
      baselineSampleCount: fluency.baselineSampleCount,
      timingReliable: fluency.timingReliable,
    });
  }

  return evidence;
}

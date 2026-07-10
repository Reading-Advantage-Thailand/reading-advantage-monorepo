/**
 * SRS Proficiency Utilities
 *
 * Functions for converting FSRS card state into objective proficiency evidence.
 */

import type { PracticeTimingBaseline } from '@reading-advantage/practice-core';
import type { EvidenceConfidence, PracticeVariantEvidence } from './objective-proficiency.js';

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

export type TimingBaselines = Record<string, PracticeTimingBaseline | undefined>;

/**
 * Derive fluency confidence from card timing data relative to baselines.
 * @param {ProficiencyCardInput[]} cards - Array of card inputs for a problem family
 * @param {TimingBaselines} baselines - Timing baselines keyed by problem family ID
 * @returns {{ confidence: EvidenceConfidence; timingReliable: boolean; baselineSampleCount: number }} - Confidence level, reliability flag, and baseline sample count
 */
function deriveFluencyConfidence(
  cards: ProficiencyCardInput[],
  baselines: TimingBaselines
): { confidence: EvidenceConfidence; timingReliable: boolean; baselineSampleCount: number } {
  const variantKeys = [...new Set(cards.map((c) => c.variantKey))];
  let totalSampleCount = 0;
  let totalReviewedCards = 0;
  let reliableCount = 0;

  for (const vk of variantKeys) {
    const baseline = baselines[vk];
    if (!baseline || !baseline.minSamplesMet) continue;

    totalSampleCount += baseline.sampleCount;
    const pfCards = cards.filter((c) => c.variantKey === vk && c.reviewDurationMs !== undefined);
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
    return { confidence: 'none', timingReliable: false, baselineSampleCount: totalSampleCount };
  }

  const ratio = reliableCount / (totalReviewedCards || 1);
  if (ratio >= 0.8) {
    return { confidence: 'high', timingReliable: true, baselineSampleCount: totalSampleCount };
  }
  if (ratio >= 0.5) {
    return { confidence: 'medium', timingReliable: true, baselineSampleCount: totalSampleCount };
  }
  return { confidence: 'low', timingReliable: true, baselineSampleCount: totalSampleCount };
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
export function stabilityToRetention(stability: number, scaleFactor: number = STABILITY_SCALE_FACTOR): number {
  if (Number.isNaN(stability)) return 0;
  if (stability === Infinity) return 1;
  if (stability <= 0) return 0;
  return 1 - 1 / (1 + stability / scaleFactor);
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
  baselines: TimingBaselines
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
    const retentions = familyCards.map((c) => stabilityToRetention(c.stability));
    const retentionStrength = retentions.length > 0
      ? retentions.reduce((a, b) => a + b, 0) / retentions.length
      : 0;

    const reviewedCards = familyCards.filter((c) => c.reps > 0);
    const practiceCoverage = familyCards.length > 0
      ? reviewedCards.length / familyCards.length
      : 0;

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

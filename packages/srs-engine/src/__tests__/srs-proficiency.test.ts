import { describe, it, expect } from 'vitest';
import { aggregateCardsToEvidence, stabilityToRetention, STABILITY_SCALE_FACTOR } from '../srs/srs-proficiency.js';
import type { ProficiencyCardInput, TimingBaselines } from '../srs/srs-proficiency.js';

describe('STABILITY_SCALE_FACTOR', () => {
  it('should default to 30', () => {
    expect(STABILITY_SCALE_FACTOR).toBe(30);
  });
});

describe('stabilityToRetention', () => {
  it('should return 0 for stability 0', () => {
    expect(stabilityToRetention(0)).toBe(0);
  });

  it('should return 0.5 for stability 30 (default scale factor)', () => {
    expect(stabilityToRetention(30)).toBeCloseTo(0.5, 6);
  });

  it('should return ~0.75 for stability 90', () => {
    expect(stabilityToRetention(90)).toBeCloseTo(0.75, 6);
  });

  it('should return ~0.909 for stability 300', () => {
    expect(stabilityToRetention(300)).toBeCloseTo(0.909090, 4);
  });

  it('should return 0 for negative stability', () => {
    expect(stabilityToRetention(-10)).toBe(0);
  });

  it('should approach 1 for very high stability (1000+)', () => {
    const result = stabilityToRetention(1000);
    expect(result).toBeGreaterThan(0.96);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('v3 interprets the second argument as elapsed days, not the v2 scale factor', () => {
    // MIGRATION-v3 §3 changes the signature to (stability, elapsedDays).
    // FSRS defines retention at t=S as exactly 0.9.
    expect(stabilityToRetention(15, 15)).toBeCloseTo(0.9, 6);
    expect(stabilityToRetention(60, 60)).toBeCloseTo(0.9, 6);
  });

  it('should return 0 for NaN input', () => {
    expect(stabilityToRetention(NaN)).toBe(0);
  });

  it('should return 1 for Infinity input', () => {
    expect(stabilityToRetention(Infinity)).toBe(1);
  });
});

describe('aggregateCardsToEvidence', () => {
  const emptyBaselines: TimingBaselines = {};

  const makeCard = (overrides: Partial<ProficiencyCardInput> = {}): ProficiencyCardInput => ({
    stability: 30,
    difficulty: 3,
    reps: 0,
    lapses: 0,
        variantKey: 'pf1',
    ...overrides,
  });

  describe('empty input', () => {
    it('should return empty array for empty cards list', () => {
      const result = aggregateCardsToEvidence([], emptyBaselines);
      expect(result).toEqual([]);
    });
  });

  describe('retentionStrength', () => {
    it('should return high retentionStrength for single card with high stability', () => {
      const cards = [makeCard({ stability: 300 })];
      const result = aggregateCardsToEvidence(cards, emptyBaselines);
      expect(result[0].retentionStrength).toBeGreaterThan(0.9);
    });

    it('should return low retentionStrength for single card with zero stability', () => {
      const cards = [makeCard({ stability: 0 })];
      const result = aggregateCardsToEvidence(cards, emptyBaselines);
      expect(result[0].retentionStrength).toBe(0);
    });

    it('should average retentionStrength across multiple cards', () => {
      const cards = [
        makeCard({ stability: 0 }),
        makeCard({ stability: 300 }),
      ];
      const result = aggregateCardsToEvidence(cards, emptyBaselines);
      const avg = (0 + 0.909) / 2;
      expect(result[0].retentionStrength).toBeCloseTo(avg, 2);
    });
  });

  describe('practiceCoverage', () => {
    it('should return 0 coverage when no cards have been reviewed (reps = 0)', () => {
      const cards = [
        makeCard({ reps: 0 }),
        makeCard({ reps: 0 }),
      ];
      const result = aggregateCardsToEvidence(cards, emptyBaselines);
      expect(result[0].practiceCoverage).toBe(0);
    });

    it('should return 1 coverage when all cards have been reviewed (reps > 0)', () => {
      const cards = [
        makeCard({ reps: 1 }),
        makeCard({ reps: 5 }),
      ];
      const result = aggregateCardsToEvidence(cards, emptyBaselines);
      expect(result[0].practiceCoverage).toBe(1);
    });

    it('should return partial coverage when some cards have been reviewed', () => {
      const cards = [
        makeCard({ reps: 0 }),
        makeCard({ reps: 1 }),
        makeCard({ reps: 0 }),
        makeCard({ reps: 2 }),
      ];
      const result = aggregateCardsToEvidence(cards, emptyBaselines);
      expect(result[0].practiceCoverage).toBe(0.5);
    });
  });

  describe('multiple problem families', () => {
    it('should produce separate evidence entries for each problem family', () => {
      const cards = [
        makeCard({ variantKey: 'pf1' }),
        makeCard({ variantKey: 'pf2' }),
        makeCard({ variantKey: 'pf3' }),
      ];
      const result = aggregateCardsToEvidence(cards, emptyBaselines);
      expect(result).toHaveLength(3);
      expect(result.map((e) => e.variantKey).sort()).toEqual(['pf1', 'pf2', 'pf3']);
    });

    it('should group cards by problem family and compute per-family stats', () => {
      const cards = [
        makeCard({ variantKey: 'pf1', stability: 0, reps: 0 }),
        makeCard({ variantKey: 'pf1', stability: 300, reps: 5 }),
        makeCard({ variantKey: 'pf2', stability: 30, reps: 1 }),
      ];
      const result = aggregateCardsToEvidence(cards, emptyBaselines);
      const pf1 = result.find((e) => e.variantKey === 'pf1')!;
      const pf2 = result.find((e) => e.variantKey === 'pf2')!;
      expect(pf1.retentionStrength).toBeGreaterThan(0.4);
      expect(pf1.practiceCoverage).toBe(0.5);
      expect(pf2.retentionStrength).toBeCloseTo(0.5, 1);
      expect(pf2.practiceCoverage).toBe(1);
    });
  });

  describe('fluencyConfidence', () => {
    const baselinesWithMedian: TimingBaselines = {
      pf1: {
        variantKey: 'pf1',
        sampleCount: 20,
        medianActiveMs: 30000,
        minSamplesMet: true,
        lastComputedAt: new Date().toISOString(),
      },
    };

    it('should return none confidence when no timing data available', () => {
      const cards = [makeCard({ variantKey: 'pf1' })];
      const result = aggregateCardsToEvidence(cards, baselinesWithMedian);
      expect(result[0].fluencyConfidence).toBe('none');
      expect(result[0].timingReliable).toBe(false);
    });

    it('should return low confidence when review duration is slower than baseline', () => {
      const cards = [
        makeCard({
          variantKey: 'pf1',
          reviewDurationMs: 90000,
        }),
      ];
      const result = aggregateCardsToEvidence(cards, baselinesWithMedian);
      expect(result[0].fluencyConfidence).toBe('low');
      expect(result[0].timingReliable).toBe(true);
    });

    it('should return high confidence when review duration is faster than baseline', () => {
      const cards = [
        makeCard({
          variantKey: 'pf1',
          reviewDurationMs: 10000,
        }),
      ];
      const result = aggregateCardsToEvidence(cards, baselinesWithMedian);
      expect(result[0].fluencyConfidence).toBe('high');
      expect(result[0].timingReliable).toBe(true);
    });

    it('should return medium confidence when about half of reviews are fast', () => {
      const cards = [
        makeCard({ variantKey: 'pf1', reviewDurationMs: 10000 }),
        makeCard({ variantKey: 'pf1', reviewDurationMs: 90000 }),
      ];
      const result = aggregateCardsToEvidence(cards, baselinesWithMedian);
      expect(result[0].fluencyConfidence).toBe('medium');
    });

    it('should use baseline sample count from timing baselines', () => {
      const cards = [makeCard({ variantKey: 'pf1', reviewDurationMs: 10000 })];
      const result = aggregateCardsToEvidence(cards, baselinesWithMedian);
      expect(result[0].baselineSampleCount).toBe(20);
    });

    it('should not rely on timing when baseline minSamplesMet is false', () => {
      const baselinesWithoutMinSamples: TimingBaselines = {
        pf1: {
          variantKey: 'pf1',
          sampleCount: 5,
          medianActiveMs: 30000,
          minSamplesMet: false,
          lastComputedAt: new Date().toISOString(),
        },
      };
      const cards = [makeCard({ variantKey: 'pf1', reviewDurationMs: 10000 })];
      const result = aggregateCardsToEvidence(cards, baselinesWithoutMinSamples);
      expect(result[0].fluencyConfidence).toBe('none');
      expect(result[0].timingReliable).toBe(false);
    });
  });
});

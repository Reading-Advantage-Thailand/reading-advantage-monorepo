import { describe, it, expect } from 'vitest';
import type { PracticeTimingFeatures } from '../practice/timing-baseline.js';
import {
  computeBaseRating,
  applyTimingToRating,
  mapPracticeToSrsRating,
  type SrsRatingInput,
} from '../practice/srs-rating.js';

describe('computeBaseRating (package)', () => {
  it('returns Again when any part is incorrect', () => {
    const parts = [
      { isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] },
      { isCorrect: false, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] },
    ];
    expect(computeBaseRating(parts)).toBe('Again');
  });

  it('returns Again when any part has misconception tags', () => {
    const parts = [
      { isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: ['misconception_a'] },
    ];
    expect(computeBaseRating(parts)).toBe('Again');
  });

  it('returns Hard when any part uses hints', () => {
    const parts = [
      { isCorrect: true, hintsUsed: 1, revealStepsSeen: 0, misconceptionTags: [] },
    ];
    expect(computeBaseRating(parts)).toBe('Hard');
  });

  it('returns Hard when any part uses reveal steps', () => {
    const parts = [
      { isCorrect: true, hintsUsed: 0, revealStepsSeen: 2, misconceptionTags: [] },
    ];
    expect(computeBaseRating(parts)).toBe('Hard');
  });

  it('returns Good when all correct with no aids', () => {
    const parts = [
      { isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] },
      { isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] },
    ];
    expect(computeBaseRating(parts)).toBe('Good');
  });

  it('returns Again when no correctness data (all undefined)', () => {
    const parts = [
      { isCorrect: undefined, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] },
    ];
    expect(computeBaseRating(parts)).toBe('Again');
  });

  it('priorities incorrect over hints (returns Again even if also has hints)', () => {
    const parts = [
      { isCorrect: false, hintsUsed: 2, revealStepsSeen: 0, misconceptionTags: [] },
    ];
    expect(computeBaseRating(parts)).toBe('Again');
  });

  it('priorities misconception over hints (returns Again even if also has hints)', () => {
    const parts = [
      { isCorrect: true, hintsUsed: 1, revealStepsSeen: 0, misconceptionTags: ['misconception'] },
    ];
    expect(computeBaseRating(parts)).toBe('Again');
  });

  it('returns Again when parts array is empty (expected: conservative default)', () => {
    // Empty parts means no evidence of correctness — conservative default is 'Again'.
    // This matches the "no correctness data" rule from the function contract.
    expect(computeBaseRating([])).toBe('Again');
  });

  it('treats hintsUsed undefined as 0', () => {
    const parts = [
      { isCorrect: true, hintsUsed: undefined, revealStepsSeen: 0, misconceptionTags: [] },
    ];
    expect(computeBaseRating(parts)).toBe('Good');
  });

  it('treats revealStepsSeen undefined as 0', () => {
    const parts = [
      { isCorrect: true, hintsUsed: 0, revealStepsSeen: undefined, misconceptionTags: [] },
    ];
    expect(computeBaseRating(parts)).toBe('Good');
  });
});

describe('applyTimingToRating (package)', () => {
  const reliableFastFeatures: PracticeTimingFeatures = {
    hasReliableTiming: true,
    speedBand: 'fast',
    confidence: 'high',
    reasons: [],
  };

  const reliableExpectedFeatures: PracticeTimingFeatures = {
    hasReliableTiming: true,
    speedBand: 'expected',
    confidence: 'high',
    reasons: [],
  };

  const reliableSlowFeatures: PracticeTimingFeatures = {
    hasReliableTiming: true,
    speedBand: 'slow',
    confidence: 'high',
    reasons: [],
  };

  const reliableVerySlowFeatures: PracticeTimingFeatures = {
    hasReliableTiming: true,
    speedBand: 'very_slow',
    confidence: 'medium',
    reasons: [],
  };

  const unreliableFeatures: PracticeTimingFeatures = {
    hasReliableTiming: false,
    confidence: 'low',
    reasons: ['timing_confidence_low'],
  };

  it('Again stays Again regardless of timing', () => {
    const result = applyTimingToRating('Again', reliableFastFeatures);
    expect(result.rating).toBe('Again');
    expect(result.timingAdjusted).toBe(false);
  });

  it('Hard stays Hard regardless of timing', () => {
    const result = applyTimingToRating('Hard', reliableSlowFeatures);
    expect(result.rating).toBe('Hard');
    expect(result.timingAdjusted).toBe(false);
  });

  it('Good upgrades to Easy when fast', () => {
    const result = applyTimingToRating('Good', reliableFastFeatures);
    expect(result.rating).toBe('Easy');
    expect(result.timingAdjusted).toBe(true);
    expect(result.reasons).toContain('timing_upgraded_easy');
  });

  it('Good stays Good when expected speed', () => {
    const result = applyTimingToRating('Good', reliableExpectedFeatures);
    expect(result.rating).toBe('Good');
    expect(result.timingAdjusted).toBe(false);
  });

  it('Good downgrades to Hard when slow', () => {
    const result = applyTimingToRating('Good', reliableSlowFeatures);
    expect(result.rating).toBe('Hard');
    expect(result.timingAdjusted).toBe(true);
    expect(result.reasons).toContain('timing_downgraded_hard');
  });

  it('Good downgrades to Hard when very_slow', () => {
    const result = applyTimingToRating('Good', reliableVerySlowFeatures);
    expect(result.rating).toBe('Hard');
    expect(result.timingAdjusted).toBe(true);
    expect(result.reasons).toContain('timing_downgraded_hard');
  });

  it('Easy stays Easy regardless of timing', () => {
    const result = applyTimingToRating('Easy', reliableSlowFeatures);
    expect(result.rating).toBe('Easy');
    expect(result.timingAdjusted).toBe(false);
  });

  it('unreliable timing returns base rating unchanged', () => {
    const result = applyTimingToRating('Good', unreliableFeatures);
    expect(result.rating).toBe('Good');
    expect(result.timingAdjusted).toBe(false);
    expect(result.reasons).toContain('timing_ignored_unreliable');
  });

  it('adds speed band reason when not expected', () => {
    const result = applyTimingToRating('Good', reliableFastFeatures);
    expect(result.reasons).toContain('timing_fast');
  });
});

describe('mapPracticeToSrsRating (package)', () => {
  const createInput = (
    parts: SrsRatingInput['parts'],
    timingFeatures: PracticeTimingFeatures,
  ): SrsRatingInput => ({
    parts,
    timingFeatures,
    baselineSampleCount: 10,
  });

  it('computes base rating and timing adjustment for correct fast answer', () => {
    const input = createInput(
      [{ isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] }],
      { hasReliableTiming: true, speedBand: 'fast', confidence: 'high', reasons: [] },
    );

    const result = mapPracticeToSrsRating(input);

    expect(result.baseRating).toBe('Good');
    expect(result.rating).toBe('Easy');
    expect(result.timingAdjusted).toBe(true);
  });

  it('returns base rating when timing unreliable', () => {
    const input = createInput(
      [{ isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] }],
      { hasReliableTiming: false, confidence: 'low', reasons: ['timing_confidence_low'] },
    );

    const result = mapPracticeToSrsRating(input);

    expect(result.baseRating).toBe('Good');
    expect(result.rating).toBe('Good');
    expect(result.timingAdjusted).toBe(false);
  });

  it('returns Again for incorrect regardless of timing', () => {
    const input = createInput(
      [{ isCorrect: false, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] }],
      { hasReliableTiming: true, speedBand: 'fast', confidence: 'high', reasons: [] },
    );

    const result = mapPracticeToSrsRating(input);

    expect(result.baseRating).toBe('Again');
    expect(result.rating).toBe('Again');
    expect(result.timingAdjusted).toBe(false);
  });

  it('includes timing features in result', () => {
    const input = createInput(
      [{ isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] }],
      { hasReliableTiming: true, speedBand: 'expected', confidence: 'high', reasons: [] },
    );

    const result = mapPracticeToSrsRating(input);

    expect(result.timingFeatures).toBeDefined();
    expect(result.timingFeatures?.hasReliableTiming).toBe(true);
    expect(result.timingFeatures?.speedBand).toBe('expected');
    expect(result.timingFeatures?.baselineSampleCount).toBe(10);
  });

  it('includes reasons for audit trail', () => {
    const input = createInput(
      [{ isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] }],
      { hasReliableTiming: true, speedBand: 'slow', confidence: 'medium', reasons: [] },
    );

    const result = mapPracticeToSrsRating(input);

    expect(result.reasons).toContain('timing_slow');
    expect(result.reasons).toContain('timing_downgraded_hard');
  });
});
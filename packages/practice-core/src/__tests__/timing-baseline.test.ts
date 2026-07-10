import { describe, it, expect } from 'vitest';
import {
  computeTimingBaseline,
  deriveTimingFeatures,
  TIMING_BASELINE_MIN_SAMPLES,
  SPEED_BAND_THRESHOLDS,
  type ComputeBaselineInput,
} from '../practice/timing-baseline.js';
import type { PracticeTimingSummary } from '../practice/contract.js';

describe('computeTimingBaseline (package)', () => {
  const createTiming = (activeMs: number, confidence: 'high' | 'medium' | 'low'): PracticeTimingSummary =>
    ({
      startedAt: '2026-04-17T08:00:00Z',
      submittedAt: '2026-04-17T08:01:00Z',
      wallClockMs: 60000,
      activeMs,
      idleMs: 0,
      pauseCount: 0,
      focusLossCount: 0,
      visibilityHiddenCount: 0,
      confidence,
    });

  it('computes median correctly for odd number of samples', () => {
    const input: ComputeBaselineInput = {
      variantKey: 'pf_01',
      timings: [
        createTiming(30000, 'high'),
        createTiming(40000, 'high'),
        createTiming(50000, 'high'),
      ],
    };

    const baseline = computeTimingBaseline(input);

    expect(baseline.medianActiveMs).toBe(40000);
    expect(baseline.sampleCount).toBe(3);
  });

  it('computes median correctly for even number of samples (interpolation)', () => {
    const input: ComputeBaselineInput = {
      variantKey: 'pf_01',
      timings: [
        createTiming(30000, 'high'),
        createTiming(40000, 'high'),
        createTiming(50000, 'high'),
        createTiming(60000, 'high'),
      ],
    };

    const baseline = computeTimingBaseline(input);

    expect(baseline.medianActiveMs).toBe(45000);
  });

  it('filters out low confidence timings', () => {
    const input: ComputeBaselineInput = {
      variantKey: 'pf_01',
      timings: [
        createTiming(10000, 'low'),
        createTiming(20000, 'low'),
        createTiming(30000, 'high'),
        createTiming(40000, 'high'),
        createTiming(50000, 'high'),
      ],
    };

    const baseline = computeTimingBaseline(input);

    expect(baseline.sampleCount).toBe(3);
  });

  it('sets minSamplesMet false when below threshold', () => {
    const input: ComputeBaselineInput = {
      variantKey: 'pf_01',
      timings: [createTiming(40000, 'high')],
      minSamples: TIMING_BASELINE_MIN_SAMPLES,
    };

    const baseline = computeTimingBaseline(input);

    expect(baseline.minSamplesMet).toBe(false);
    expect(baseline.sampleCount).toBe(1);
  });

  it('sets minSamplesMet true when at threshold', () => {
    const timings = Array(TIMING_BASELINE_MIN_SAMPLES)
      .fill(null)
      .map((_, i) => createTiming(40000 + i * 1000, 'high'));

    const input: ComputeBaselineInput = {
      variantKey: 'pf_01',
      timings,
    };

    const baseline = computeTimingBaseline(input);

    expect(baseline.minSamplesMet).toBe(true);
    expect(baseline.sampleCount).toBe(TIMING_BASELINE_MIN_SAMPLES);
  });

  it('computes percentile values when sampleCount > 0', () => {
    const input: ComputeBaselineInput = {
      variantKey: 'pf_01',
      timings: [
        createTiming(20000, 'high'),
        createTiming(30000, 'high'),
        createTiming(40000, 'high'),
        createTiming(50000, 'high'),
      ],
    };

    const baseline = computeTimingBaseline(input);

    expect(baseline.p25ActiveMs).toBeDefined();
    expect(baseline.p75ActiveMs).toBeDefined();
    expect(baseline.p90ActiveMs).toBeDefined();
  });

  it('uses provided computedAt date', () => {
    const input: ComputeBaselineInput = {
      variantKey: 'pf_01',
      timings: [createTiming(40000, 'high')],
      computedAt: '2026-04-15T12:00:00Z',
    };

    const baseline = computeTimingBaseline(input);

    expect(baseline.lastComputedAt).toBe('2026-04-15T12:00:00Z');
  });

  it('uses default minSamples when not specified', () => {
    const timings = Array(TIMING_BASELINE_MIN_SAMPLES)
      .fill(null)
      .map((_, i) => createTiming(40000 + i * 1000, 'high'));

    const input: ComputeBaselineInput = {
      variantKey: 'pf_01',
      timings,
    };

    const baseline = computeTimingBaseline(input);

    expect(baseline.minSamplesMet).toBe(true);
  });
});

describe('deriveTimingFeatures (package)', () => {
  const createTimingSummary = (confidence: 'high' | 'medium' | 'low', activeMs = 45000): PracticeTimingSummary =>
    ({
      startedAt: '2026-04-17T08:00:00Z',
      submittedAt: '2026-04-17T08:01:00Z',
      wallClockMs: 60000,
      activeMs,
      idleMs: 0,
      pauseCount: 0,
      focusLossCount: 0,
      visibilityHiddenCount: 0,
      confidence,
    });

  const createBaseline = (medianMs = 45000, sampleCount = 15) => ({
    variantKey: 'pf_01',
    sampleCount,
    medianActiveMs: medianMs,
    p25ActiveMs: medianMs * 0.8,
    p75ActiveMs: medianMs * 1.2,
    p90ActiveMs: medianMs * 1.5,
    lastComputedAt: '2026-04-17T00:00:00Z',
    minSamplesMet: true,
  });

  it('returns unreliable when timing confidence is low', () => {
    const timing = createTimingSummary('low', 30000);

    const features = deriveTimingFeatures(timing, null);

    expect(features.hasReliableTiming).toBe(false);
    expect(features.confidence).toBe('low');
    expect(features.reasons).toContain('timing_confidence_low');
  });

  it('returns unreliable when baseline is null', () => {
    const timing = createTimingSummary('high', 30000);

    const features = deriveTimingFeatures(timing, null);

    expect(features.hasReliableTiming).toBe(false);
    expect(features.reasons).toContain('baseline_missing');
  });

  it('returns unreliable when baseline has insufficient samples', () => {
    const timing = createTimingSummary('high', 30000);
    const baseline = { ...createBaseline(45000, 5), minSamplesMet: false };

    const features = deriveTimingFeatures(timing, baseline);

    expect(features.hasReliableTiming).toBe(false);
    expect(features.reasons).toContain('baseline_sample_count_insufficient');
  });

  it('derives fast speed band when timeRatio < 0.5', () => {
    const timing = createTimingSummary('high', 20000);
    const baseline = createBaseline(50000);

    const features = deriveTimingFeatures(timing, baseline);

    expect(features.hasReliableTiming).toBe(true);
    expect(features.speedBand).toBe('fast');
    expect(features.timeRatio).toBeCloseTo(0.4);
    expect(features.reasons).toContain('timing_fast');
  });

  it('derives expected speed band when timeRatio is between thresholds', () => {
    const timing = createTimingSummary('high', 60000);
    const baseline = createBaseline(50000);

    const features = deriveTimingFeatures(timing, baseline);

    expect(features.hasReliableTiming).toBe(true);
    expect(features.speedBand).toBe('expected');
    expect(features.timeRatio).toBeCloseTo(1.2);
  });

  it('derives slow speed band when timeRatio <= 2.5', () => {
    const timing = createTimingSummary('high', 100000);
    const baseline = createBaseline(50000);

    const features = deriveTimingFeatures(timing, baseline);

    expect(features.hasReliableTiming).toBe(true);
    expect(features.speedBand).toBe('slow');
    expect(features.timeRatio).toBeCloseTo(2.0);
    expect(features.reasons).toContain('timing_slow');
  });

  it('derives very_slow speed band when timeRatio > 2.5', () => {
    const timing = createTimingSummary('high', 150000);
    const baseline = createBaseline(50000);

    const features = deriveTimingFeatures(timing, baseline);

    expect(features.hasReliableTiming).toBe(true);
    expect(features.speedBand).toBe('very_slow');
    expect(features.timeRatio).toBeCloseTo(3.0);
    expect(features.reasons).toContain('timing_very_slow');
  });

  it('does not add timing reason when speed is expected', () => {
    const timing = createTimingSummary('high', 50000);
    const baseline = createBaseline(50000);

    const features = deriveTimingFeatures(timing, baseline);

    expect(features.hasReliableTiming).toBe(true);
    expect(features.speedBand).toBe('expected');
    expect(features.reasons).not.toContain('timing_fast');
    expect(features.reasons).not.toContain('timing_slow');
  });
});

describe('SPEED_BAND_THRESHOLDS (package)', () => {
  it('defines correct fast threshold', () => {
    expect(SPEED_BAND_THRESHOLDS.fast).toBe(0.5);
  });

  it('defines correct expected upper bound', () => {
    expect(SPEED_BAND_THRESHOLDS.expected).toBe(1.5);
  });

  it('defines correct slow threshold', () => {
    expect(SPEED_BAND_THRESHOLDS.slow).toBe(2.5);
  });
});

describe('computePercentile edge cases (via computeTimingBaseline)', () => {
  const createTiming = (activeMs: number): PracticeTimingSummary =>
    ({
      startedAt: '2026-04-17T08:00:00Z',
      submittedAt: '2026-04-17T08:01:00Z',
      wallClockMs: 60000,
      activeMs,
      idleMs: 0,
      pauseCount: 0,
      focusLossCount: 0,
      visibilityHiddenCount: 0,
      confidence: 'high' as const,
    });

  it('handles single sample', () => {
    const input: ComputeBaselineInput = {
      variantKey: 'pf_01',
      timings: [createTiming(40000)],
    };

    const baseline = computeTimingBaseline(input);

    expect(baseline.medianActiveMs).toBe(40000);
  });

  it('handles empty timings array', () => {
    const input: ComputeBaselineInput = {
      variantKey: 'pf_01',
      timings: [],
    };

    const baseline = computeTimingBaseline(input);

    expect(baseline.medianActiveMs).toBe(0);
    expect(baseline.p25ActiveMs).toBeUndefined();
    expect(baseline.p75ActiveMs).toBeUndefined();
    expect(baseline.p90ActiveMs).toBeUndefined();
  });
});
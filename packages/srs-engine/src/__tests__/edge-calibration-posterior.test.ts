/**
 * Phase 2 Red Test — Beta-Bernoulli posterior + recency decay (FR3, FR4, AC3, AC4)
 *
 * Track 3: Edge Calibration Loop.
 *
 * Pin the API surface for the pure Beta-Bernoulli math:
 *   - `posteriorMean(alpha, beta)` — alpha / (alpha + beta)
 *   - `posteriorVariance(alpha, beta)` — alpha·beta / ((alpha+beta)^2 · (alpha+beta+1))
 *   - `updatePosterior(state, observation)` — consistent → α++, violation → β++,
 *     !A → no change (not a Bernoulli trial)
 *   - `applyDecay(state, lambda, now)` — multiplies α and β by λ to track recent cohorts
 *   - `bucketVariance(variance, alpha, beta)` — discrete confidence bucket
 *
 * Per test-strategy.md §3 (cross-phase edge cases):
 *   - Beta update commutativity (order-independent within the decay-free regime)
 *   - Recency decay: variance increases monotonically, mean → 0.5
 *   - Incremental ≡ batch (replay N observations one-at-a-time vs. batched
 *     yields identical α, β in the decay-free regime)
 */
import { describe, it, expect } from 'vitest';
import type {
  CalibrationObservation,
  EdgeCalibration,
} from '../srs/edge-calibration.js';
import {
  posteriorMean,
  posteriorVariance,
  updatePosterior,
  applyDecay,
  bucketVariance,
} from '../srs/edge-calibration.js';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Create a default EdgeCalibration with optional overrides.
 * @param {Partial<EdgeCalibration>} overrides - Partial calibration fields to override
 * @returns {EdgeCalibration} - EdgeCalibration with sensible defaults
 */
function makeCalibration(overrides: Partial<EdgeCalibration> = {}): EdgeCalibration {
  return {
    edgeId: 'edge.prereq.a-to-b',
    alpha: 1,
    beta: 1,
    status: 'untested',
    lastUpdated: 1700000000000,
    ...overrides,
  };
}

/**
 * Create a CalibrationObservation with the given verdicts.
 * @param {boolean} a - Proficiency verdict for A
 * @param {boolean} b - Proficiency verdict for B
 * @returns {CalibrationObservation} - CalibrationObservation with a fixed student ID
 */
function makeObservation(a: boolean, b: boolean): CalibrationObservation {
  return { studentId: 's', a, b };
}

// ---------------------------------------------------------------------------
// Task 2.5 — posteriorMean (FR3, AC3)
// ---------------------------------------------------------------------------

describe('posteriorMean (FR3, AC3)', () => {
  it('is 0.5 for the uniform Beta(1, 1) prior', () => {
    expect(posteriorMean(1, 1)).toBeCloseTo(0.5, 10);
  });

  it('is the ratio α / (α + β)', () => {
    expect(posteriorMean(8, 2)).toBeCloseTo(0.8, 10);
    expect(posteriorMean(1, 4)).toBeCloseTo(0.2, 10);
    expect(posteriorMean(50, 50)).toBeCloseTo(0.5, 10);
  });

  it('approaches 0 as β dominates', () => {
    expect(posteriorMean(1, 1000)).toBeCloseTo(0.001, 5);
  });

  it('approaches 1 as α dominates', () => {
    expect(posteriorMean(1000, 1)).toBeCloseTo(0.999, 3);
  });
});

// ---------------------------------------------------------------------------
// Task 2.6 — posteriorVariance (FR3, AC3)
// ---------------------------------------------------------------------------

describe('posteriorVariance (FR3, AC3)', () => {
  it('is 1/12 ≈ 0.0833 for Beta(1, 1) — the prior', () => {
    expect(posteriorVariance(1, 1)).toBeCloseTo(1 / 12, 10);
  });

  it('is maximum at α = β = 1 (uniform prior)', () => {
    const uniformVar = posteriorVariance(1, 1);
    expect(posteriorVariance(2, 2)).toBeLessThan(uniformVar);
    expect(posteriorVariance(10, 10)).toBeLessThan(posteriorVariance(2, 2));
  });

  it('decreases as either parameter grows (more evidence → tighter posterior)', () => {
    const v1 = posteriorVariance(2, 2);
    const v2 = posteriorVariance(10, 10);
    const v3 = posteriorVariance(100, 100);
    expect(v1).toBeGreaterThan(v2);
    expect(v2).toBeGreaterThan(v3);
  });

  it('matches the closed-form alpha*beta / ((α+β)^2 (α+β+1))', () => {
    const a = 7;
    const b = 3;
    const expected = (a * b) / (Math.pow(a + b, 2) * (a + b + 1));
    expect(posteriorVariance(a, b)).toBeCloseTo(expected, 10);
  });
});

// ---------------------------------------------------------------------------
// Task 2.7 — updatePosterior (FR3, AC3)
// ---------------------------------------------------------------------------

describe('updatePosterior (FR3, AC3)', () => {
  it('increments α on a consistent observation (profA, profB)', () => {
    const before = makeCalibration({ alpha: 5, beta: 2 });
    const after = updatePosterior(before, makeObservation(true, true));
    expect(after.alpha).toBe(6);
    expect(after.beta).toBe(2);
  });

  it('increments β on a violation observation (profA, !profB)', () => {
    const before = makeCalibration({ alpha: 5, beta: 2 });
    const after = updatePosterior(before, makeObservation(true, false));
    expect(after.alpha).toBe(5);
    expect(after.beta).toBe(3);
  });

  it('does not change α or β on a !A observation (not a Bernoulli trial)', () => {
    const before = makeCalibration({ alpha: 5, beta: 2 });
    expect(updatePosterior(before, makeObservation(false, true))).toMatchObject({
      alpha: 5,
      beta: 2,
    });
    expect(updatePosterior(before, makeObservation(false, false))).toMatchObject({
      alpha: 5,
      beta: 2,
    });
  });

  it('preserves the edgeId on every update', () => {
    const before = makeCalibration({ edgeId: 'edge.prereq.x-to-y' });
    expect(updatePosterior(before, makeObservation(true, true)).edgeId).toBe(
      'edge.prereq.x-to-y'
    );
  });

  it('updates lastUpdated to the provided timestamp', () => {
    const before = makeCalibration({ lastUpdated: 1000 });
    const after = updatePosterior(before, makeObservation(true, true), { now: 9999 });
    expect(after.lastUpdated).toBe(9999);
  });

  it('does not mutate the input state', () => {
    const before = makeCalibration({ alpha: 5, beta: 2 });
    const snapshot = { ...before };
    updatePosterior(before, makeObservation(true, true));
    expect(before).toEqual(snapshot);
  });

  it('is order-independent across a shuffled stream (commutativity property)', () => {
    // 20 consistent + 5 violations, shuffled — two orderings must yield
    // identical α, β in the decay-free regime.
    const stream: CalibrationObservation[] = [];
    for (let i = 0; i < 20; i++) stream.push(makeObservation(true, true));
    for (let i = 0; i < 5; i++) stream.push(makeObservation(true, false));

    const reverse = [...stream].reverse();
    const interleaved: CalibrationObservation[] = [];
    for (let i = 0; i < 20; i++) {
      interleaved.push(stream[i]!);
      if (i < 5) interleaved.push(stream[20 + i]!);
    }

    const initial = makeCalibration({ alpha: 1, beta: 1 });
    const apply = (s: EdgeCalibration, o: CalibrationObservation) =>
      updatePosterior(s, o);

    const a = stream.reduce(apply, initial);
    const b = reverse.reduce(apply, initial);
    const c = interleaved.reduce(apply, initial);

    expect(a.alpha).toBe(b.alpha);
    expect(a.alpha).toBe(c.alpha);
    expect(a.beta).toBe(b.beta);
    expect(a.beta).toBe(c.beta);
  });

  it('incremental update ≡ batched replay of the same stream', () => {
    const stream: CalibrationObservation[] = [
      makeObservation(true, true),
      makeObservation(true, false),
      makeObservation(false, true),
      makeObservation(true, true),
      makeObservation(false, false),
    ];
    const initial = makeCalibration({ alpha: 1, beta: 1 });
    const incremental = stream.reduce(
      (s, o) => updatePosterior(s, o),
      initial
    );
    // Batched = one observation object with the same counts; verify the
    // counters the batch would produce match the incremental result.
    let aInc = 0;
    let bInc = 0;
    for (const o of stream) {
      if (o.a && o.b) aInc++;
      else if (o.a && !o.b) bInc++;
    }
    expect(incremental.alpha).toBe(initial.alpha + aInc);
    expect(incremental.beta).toBe(initial.beta + bInc);
  });
});

// ---------------------------------------------------------------------------
// Task 2.8 — applyDecay (FR4, AC4)
// ---------------------------------------------------------------------------

describe('applyDecay (FR4, AC4)', () => {
  it('multiplies α and β by λ in a single decay step', () => {
    const before = makeCalibration({ alpha: 10, beta: 5 });
    const after = applyDecay(before, 0.5, 2000);
    expect(after.alpha).toBeCloseTo(5, 10);
    expect(after.beta).toBeCloseTo(2.5, 10);
  });

  it('does not change α or β at λ = 1 (no decay)', () => {
    const before = makeCalibration({ alpha: 10, beta: 5 });
    const after = applyDecay(before, 1, 2000);
    expect(after.alpha).toBe(10);
    expect(after.beta).toBe(5);
  });

  it('does not change α or β at λ = 0 (full reset to 0)', () => {
    const before = makeCalibration({ alpha: 10, beta: 5 });
    const after = applyDecay(before, 0, 2000);
    expect(after.alpha).toBe(0);
    expect(after.beta).toBe(0);
  });

  it('updates lastUpdated to the provided timestamp', () => {
    const before = makeCalibration({ lastUpdated: 1000 });
    const after = applyDecay(before, 0.9, 9999);
    expect(after.lastUpdated).toBe(9999);
  });

  it('does not mutate the input state', () => {
    const before = makeCalibration({ alpha: 10, beta: 5 });
    const snapshot = { ...before };
    applyDecay(before, 0.5, 2000);
    expect(before).toEqual(snapshot);
  });

  it('increases posterior variance when λ < 1 (decay removes evidence → wider posterior)', () => {
    // Decay reduces α+β, moving the posterior back toward the uniform prior.
    // With α = β the mean stays at 0.5 but variance increases.
    const established = makeCalibration({ alpha: 100, beta: 100 });
    const decayed = applyDecay(established, 0.5, 2000);
    expect(posteriorVariance(decayed.alpha, decayed.beta)).toBeGreaterThan(
      posteriorVariance(established.alpha, established.beta)
    );
  });

  it('variance increases monotonically as more decay steps are applied', () => {
    let state = makeCalibration({ alpha: 100, beta: 5 });
    const v0 = posteriorVariance(state.alpha, state.beta);
    const variances: number[] = [v0];
    for (let i = 0; i < 10; i++) {
      state = applyDecay(state, 0.5, 2000 + i);
      variances.push(posteriorVariance(state.alpha, state.beta));
    }
    for (let i = 1; i < variances.length; i++) {
      expect(variances[i]).toBeGreaterThan(variances[i - 1]!);
    }
  });

  it('mean stays at 0.5 when α and β are equal (decay is symmetric)', () => {
    let state = makeCalibration({ alpha: 100, beta: 100 });
    for (let i = 0; i < 5; i++) {
      state = applyDecay(state, 0.7, 2000 + i);
      expect(posteriorMean(state.alpha, state.beta)).toBeCloseTo(0.5, 10);
    }
  });

  it('mean is preserved under symmetric decay (decay scales α and β equally)', () => {
    // Symmetric decay multiplies both α and β by the same λ, so the ratio
    // α/(α+β) — and therefore the posterior mean — is unchanged. The mean
    // only shifts toward 0.5 when new observations arrive at the prior mean.
    let state = makeCalibration({ alpha: 100, beta: 10 });
    const startMean = posteriorMean(state.alpha, state.beta);
    expect(startMean).toBeGreaterThan(0.5);
    for (let i = 0; i < 20; i++) {
      state = applyDecay(state, 0.5, 2000 + i);
    }
    const endMean = posteriorMean(state.alpha, state.beta);
    expect(endMean).toBeCloseTo(startMean, 10);
  });
});

// ---------------------------------------------------------------------------
// Task 2.9 — bucketVariance (FR3, AC3)
// ---------------------------------------------------------------------------

describe('bucketVariance (FR3, AC3)', () => {
  it('returns a string bucket label', () => {
    const bucket = bucketVariance(0.05);
    expect(typeof bucket).toBe('string');
    expect(bucket.length).toBeGreaterThan(0);
  });

  it('returns the lowest-confidence bucket when no evidence (α + β = 0)', () => {
    // With zero evidence, confidence must be the lowest possible bucket
    const bucket = bucketVariance(posteriorVariance(0, 0), 0, 0);
    expect(bucket).toBe('none');
  });

  it('returns a higher-confidence bucket as variance shrinks', () => {
    const order = ['low', 'medium', 'high'];
    const lo = order.indexOf(bucketVariance(0.2, 2, 2));
    const mid = order.indexOf(bucketVariance(0.05, 50, 50));
    const hi = order.indexOf(bucketVariance(0.001, 1000, 1000));
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeGreaterThan(lo);
    expect(mid).toBeGreaterThanOrEqual(lo);
  });

  it('returns one of the four canonical buckets', () => {
    const allowed = new Set(['none', 'low', 'medium', 'high']);
    for (const v of [0, 0.001, 0.05, 0.1, 0.2, 0.3, 1 / 12]) {
      expect(allowed.has(bucketVariance(v))).toBe(true);
    }
  });
});

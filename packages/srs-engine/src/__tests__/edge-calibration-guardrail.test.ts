/**
 * Phase 2 Red Test — Confounding guardrail & status classification (FR5, AC5)
 *
 * Track 3: Edge Calibration Loop.
 *
 * Pin the API surface for `classifyStatus`, which encodes the FR5
 * confounding guardrail:
 *   "If no student has attempted B without a verdict on A, necessity is
 *    *unmeasured*, not *confirmed*. Define a third status `untested`,
 *    distinct from `confirmed` / `refuted`."
 *
 * The function must inspect the *raw* verdict record (not just the
 * observation stream) to know whether some student had a B-verdict without
 * an A-verdict. If no such student exists, the status is `untested`
 * regardless of the posterior mean (per test-strategy.md §3).
 */
import { describe, it, expect } from 'vitest';
import type {
  CalibrationStatus,
  CalibrationVerdict,
  EdgeCalibration,
} from '../srs/edge-calibration.js';
import { classifyStatus } from '../srs/edge-calibration.js';

// ---------------------------------------------------------------------------
// Verdict record shape (mirrors the one pinned in extract.test.ts)
// ---------------------------------------------------------------------------

type EdgeVerdicts = { a?: CalibrationVerdict; b?: CalibrationVerdict };
type VerdictMap = ReadonlyMap<string, EdgeVerdicts>;

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Create a VerdictMap from an array of entries.
 * @param {ReadonlyArray<readonly [string, EdgeVerdicts]>} entries - Array of [studentId, verdicts] tuples
 * @returns {VerdictMap} - Readonly verdict map
 */
function makeVerdicts(
  entries: ReadonlyArray<readonly [string, EdgeVerdicts]>
): VerdictMap {
  return new Map(entries);
}

/**
 * Create a default EdgeCalibration with optional overrides.
 * @param {Partial<EdgeCalibration>} overrides - Partial calibration fields to override
 * @returns {EdgeCalibration} - EdgeCalibration with sensible defaults
 */
function makeCalibration(overrides: Partial<EdgeCalibration> = {}): EdgeCalibration {
  return {
    edgeId: 'edge.prereq.a-to-b',
    alpha: 50,
    beta: 5,
    status: 'untested',
    lastUpdated: 1700000000000,
    ...overrides,
  };
}

/**
 * Create a strong posterior calibration (α=50, β=5, mean≈0.91).
 * @param {Partial<EdgeCalibration>} overrides - Partial calibration fields to override
 * @returns {EdgeCalibration} - EdgeCalibration with a strong posterior
 */
function makeStrongPosterior(overrides: Partial<EdgeCalibration> = {}): EdgeCalibration {
  // α = 50, β = 5  → mean ≈ 0.91 — would be "confirmed" if the guardrail passes
  return makeCalibration({ alpha: 50, beta: 5, ...overrides });
}

/**
 * Create a weak posterior calibration (α=5, β=50, mean≈0.09).
 * @param {Partial<EdgeCalibration>} overrides - Partial calibration fields to override
 * @returns {EdgeCalibration} - EdgeCalibration with a weak posterior
 */
function makeWeakPosterior(overrides: Partial<EdgeCalibration> = {}): EdgeCalibration {
  // α = 5, β = 50 → mean ≈ 0.09 — would be "refuted" if the guardrail passes
  return makeCalibration({ alpha: 5, beta: 50, ...overrides });
}

/**
 * Create a uniform posterior calibration (α=β=5, mean≈0.5).
 * @param {Partial<EdgeCalibration>} overrides - Partial calibration fields to override
 * @returns {EdgeCalibration} - EdgeCalibration with a uniform posterior
 */
function makeUniformPosterior(overrides: Partial<EdgeCalibration> = {}): EdgeCalibration {
  // α = β = 5 → mean ≈ 0.5 — ambiguous, requires guardrail to be informative
  return makeCalibration({ alpha: 5, beta: 5, ...overrides });
}

// ---------------------------------------------------------------------------
// Task 2.10 — classifyStatus — confounding guardrail (FR5, AC5)
// ---------------------------------------------------------------------------

describe('classifyStatus — confounding guardrail (FR5, AC5)', () => {
  it('classifies untested when EVERY student has both A and B verdicts and the posterior is high', () => {
    // Spec FR5 / test-strategy.md: "every student with a verdict on B also
    // has one on A → necessity is `untested`, even if posterior mean looks high."
    const verdicts = makeVerdicts([
      ['s1', { a: true, b: true }],
      ['s2', { a: true, b: true }],
      ['s3', { a: true, b: true }],
    ]);
    const state = makeStrongPosterior();
    const result = classifyStatus(verdicts, state);
    expect(result.status).toBe<CalibrationStatus>('untested');
  });

  it('classifies untested when the verdict record is empty', () => {
    const verdicts = makeVerdicts([]);
    const result = classifyStatus(verdicts, makeStrongPosterior());
    expect(result.status).toBe<CalibrationStatus>('untested');
  });

  it('classifies untested when only A-only and B-only verdicts exist (no pairs)', () => {
    const verdicts = makeVerdicts([
      ['a-only', { a: true }],
      ['b-only', { b: true }],
    ]);
    const result = classifyStatus(verdicts, makeStrongPosterior());
    expect(result.status).toBe<CalibrationStatus>('untested');
  });
});

describe('classifyStatus — confirmed / refuted when guardrail is satisfied', () => {
  it('classifies confirmed when at least one student has B-verdict without A-verdict AND posterior mean is high', () => {
    // At least one student in the raw record has a B-verdict but no A-verdict.
    // That student demonstrates "B can be done without A", which breaks the
    // curriculum-order confounding. The posterior is then authoritative.
    const verdicts = makeVerdicts([
      ['s-without-a', { b: true }],         // confounding-breaker
      ['s1', { a: true, b: true }],
      ['s2', { a: true, b: true }],
      ['s3', { a: true, b: true }],
    ]);
    const result = classifyStatus(verdicts, makeStrongPosterior());
    expect(result.status).toBe<CalibrationStatus>('confirmed');
  });

  it('classifies refuted when guardrail passes AND posterior mean is low', () => {
    const verdicts = makeVerdicts([
      ['s-without-a', { b: true }],
      ['s1', { a: true, b: true }],
      ['s2', { a: true, b: true }],
      ['s3', { a: true, b: true }],
    ]);
    const result = classifyStatus(verdicts, makeWeakPosterior());
    expect(result.status).toBe<CalibrationStatus>('refuted');
  });

  it('classifies untested (low evidence) when guardrail passes AND posterior is uniform', () => {
    // Guardrail is satisfied, but the mean sits in the ambiguous middle.
    // With insufficient evidence to call confirmed or refuted, the safest
    // label is `untested` rather than guessing.
    const verdicts = makeVerdicts([
      ['s-without-a', { b: true }],
      ['s1', { a: true, b: true }],
      ['s2', { a: true, b: true }],
    ]);
    const result = classifyStatus(verdicts, makeUniformPosterior());
    expect(result.status).toBe<CalibrationStatus>('untested');
  });
});

describe('classifyStatus — does not mutate inputs', () => {
  it('returns a new state object without mutating the input', () => {
    const verdicts = makeVerdicts([
      ['s-without-a', { b: true }],
      ['s1', { a: true, b: true }],
    ]);
    const state = makeStrongPosterior();
    const snapshot = { ...state };
    const result = classifyStatus(verdicts, state);
    expect(state).toEqual(snapshot);
    expect(result).not.toBe(state);
  });

  it('does not mutate the verdict record', () => {
    const verdicts = makeVerdicts([
      ['s-without-a', { b: true }],
      ['s1', { a: true, b: true }],
    ]);
    const before = Array.from(verdicts.entries());
    classifyStatus(verdicts, makeStrongPosterior());
    const after = Array.from(verdicts.entries());
    expect(after).toEqual(before);
  });
});

describe('classifyStatus — output is an EdgeCalibration', () => {
  it('preserves edgeId on the returned state', () => {
    const verdicts = makeVerdicts([
      ['s-without-a', { b: true }],
      ['s1', { a: true, b: true }],
    ]);
    const state = makeCalibration({ edgeId: 'edge.prereq.x-to-y' });
    const result = classifyStatus(verdicts, state);
    expect(result.edgeId).toBe('edge.prereq.x-to-y');
  });

  it('returns one of the three valid CalibrationStatus literals', () => {
    const valid = new Set<CalibrationStatus>(['confirmed', 'refuted', 'untested']);
    const samples: ReadonlyArray<{
      label: string;
      verdicts: VerdictMap;
      state: EdgeCalibration;
    }> = [
      {
        label: 'all-pairs + strong',
        verdicts: makeVerdicts([
          ['s1', { a: true, b: true }],
          ['s2', { a: true, b: true }],
        ]),
        state: makeStrongPosterior(),
      },
      {
        label: 'all-pairs + weak',
        verdicts: makeVerdicts([
          ['s1', { a: true, b: true }],
          ['s2', { a: true, b: true }],
        ]),
        state: makeWeakPosterior(),
      },
      {
        label: 'guardrail + strong',
        verdicts: makeVerdicts([
          ['breaker', { b: true }],
          ['s1', { a: true, b: true }],
        ]),
        state: makeStrongPosterior(),
      },
      {
        label: 'guardrail + weak',
        verdicts: makeVerdicts([
          ['breaker', { b: true }],
          ['s1', { a: true, b: true }],
        ]),
        state: makeWeakPosterior(),
      },
      {
        label: 'empty + uniform',
        verdicts: makeVerdicts([]),
        state: makeUniformPosterior(),
      },
    ];
    for (const { label, verdicts, state } of samples) {
      const result = classifyStatus(verdicts, state);
      expect(valid.has(result.status), `${label}: status was ${result.status}`).toBe(true);
    }
  });
});

/**
 * Phase 2 Red Test — Contingency table, necessity, informativeness (FR2, AC2)
 *
 * Track 3: Edge Calibration Loop.
 *
 * Pin the API surface for three pure functions:
 *   - `buildContingencyTable(observations)` — count students per quadrant
 *   - `computeNecessity(table)` — 1 − P(proficient B | not proficient A)
 *   - `computeInformativeness(table)` — P(proficient B | proficient A) − P(proficient B | not proficient A)
 *
 * Per test-strategy.md §3 (cross-phase edge cases):
 *   "Contingency with any zero row/column → necessity & lift must return safe
 *    sentinels (NaN-free); status must be `untested`, never `confirmed`."
 *
 * The safe sentinel for the math layer is `0` (not NaN); the status
 * classification of `untested` is exercised in
 * `edge-calibration-guardrail.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import type {
  CalibrationContingencyTable,
  CalibrationObservation,
} from '../srs/edge-calibration.js';
import {
  buildContingencyTable,
  computeNecessity,
  computeInformativeness,
} from '../srs/edge-calibration.js';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Create a CalibrationObservation with the given student ID and verdicts.
 * @param {string} studentId - Student identifier
 * @param {boolean} a - Proficiency verdict for A
 * @param {boolean} b - Proficiency verdict for B
 * @returns {CalibrationObservation} - CalibrationObservation
 */
function makeObservation(
  studentId: string,
  a: boolean,
  b: boolean
): CalibrationObservation {
  return { studentId, a, b };
}

/**
 * Create a CalibrationContingencyTable with the given quadrant counts.
 * @param {number} pp - Proficient A, proficient B count
 * @param {number} pn - Proficient A, not proficient B count
 * @param {number} np - Not proficient A, proficient B count
 * @param {number} nn - Not proficient A, not proficient B count
 * @returns {CalibrationContingencyTable} - CalibrationContingencyTable
 */
function makeContingency(
  pp: number,
  pn: number,
  np: number,
  nn: number
): CalibrationContingencyTable {
  return {
    proficientAProficientB: pp,
    proficientANotProficientB: pn,
    notProficientAProficientB: np,
    notProficientANotProficientB: nn,
  };
}

// ---------------------------------------------------------------------------
// Task 2.2 — buildContingencyTable (FR2, AC2)
// ---------------------------------------------------------------------------

describe('buildContingencyTable (FR2, AC2)', () => {
  it('returns the all-zero table for an empty observation list', () => {
    const table = buildContingencyTable([]);
    expect(table).toEqual(makeContingency(0, 0, 0, 0));
  });

  it('counts a single observation in the matching quadrant', () => {
    const table = buildContingencyTable([makeObservation('s1', true, true)]);
    expect(table.proficientAProficientB).toBe(1);
    expect(table.proficientANotProficientB).toBe(0);
    expect(table.notProficientAProficientB).toBe(0);
    expect(table.notProficientANotProficientB).toBe(0);
  });

  it('distributes the four observation quadrants correctly', () => {
    const observations = [
      makeObservation('pp1', true, true),
      makeObservation('pp2', true, true),
      makeObservation('pn1', true, false),
      makeObservation('np1', false, true),
      makeObservation('nn1', false, false),
      makeObservation('nn2', false, false),
      makeObservation('nn3', false, false),
    ];
    const table = buildContingencyTable(observations);
    expect(table).toEqual(makeContingency(2, 1, 1, 3));
  });

  it('does not mutate the input observations', () => {
    const observations = [
      makeObservation('s1', true, true),
      makeObservation('s2', false, true),
    ];
    const snapshot = observations.map((o) => ({ ...o }));
    buildContingencyTable(observations);
    expect(observations).toEqual(snapshot);
  });

  it('preserves counts for a 1000-observation synthetic cohort', () => {
    const observations: CalibrationObservation[] = [];
    let expectedPp = 0;
    let expectedPn = 0;
    let expectedNp = 0;
    let expectedNn = 0;
    for (let i = 0; i < 1000; i++) {
      const a = (i & 1) === 0;
      const b = (i & 3) === 0;
      observations.push(makeObservation(`s${i}`, a, b));
      if (a && b) expectedPp++;
      else if (a && !b) expectedPn++;
      else if (!a && b) expectedNp++;
      else expectedNn++;
    }
    const table = buildContingencyTable(observations);
    expect(table.proficientAProficientB).toBe(expectedPp);
    expect(table.proficientANotProficientB).toBe(expectedPn);
    expect(table.notProficientAProficientB).toBe(expectedNp);
    expect(table.notProficientANotProficientB).toBe(expectedNn);
  });
});

// ---------------------------------------------------------------------------
// Task 2.3 — computeNecessity (FR2, AC2)
// ---------------------------------------------------------------------------

describe('computeNecessity (FR2, AC2)', () => {
  it('returns 1 when every not-proficient-A student is proficient in B', () => {
    // need a not-proficient-A row to compute; with only !A=5, profB=5 → P=1
    const table = makeContingency(0, 0, 5, 0);
    expect(computeNecessity(table)).toBe(1);
  });

  it('returns 0 when no not-proficient-A student is proficient in B', () => {
    const table = makeContingency(0, 0, 0, 5);
    expect(computeNecessity(table)).toBe(0);
  });

  it('returns the correct ratio for a mixed table', () => {
    // notProficientA = np + nn = 3 + 7 = 10; P(profB | !A) = 3/10 = 0.3
    const table = makeContingency(5, 2, 3, 7);
    expect(computeNecessity(table)).toBeCloseTo(0.3, 10);
  });

  it('returns the safe sentinel 0 when the not-proficient-A row is empty', () => {
    // No !A students → P(profB | !A) is undefined; spec calls for NaN-free sentinel
    const table = makeContingency(5, 2, 0, 0);
    const result = computeNecessity(table);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(0);
  });

  it('returns the safe sentinel 0 when the entire table is empty', () => {
    const result = computeNecessity(makeContingency(0, 0, 0, 0));
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(0);
  });

  it('clamps the result to [0, 1] when given an inconsistent table', () => {
    // Even if the math is wonky, output must be NaN-free and bounded.
    // 1 − (10 / 0) would be -Infinity without the guard; we expect 0 sentinel.
    const weird = makeContingency(0, 0, 10, 0);
    const result = computeNecessity(weird);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Task 2.4 — computeInformativeness (FR2, AC2)
// ---------------------------------------------------------------------------

describe('computeInformativeness (FR2, AC2)', () => {
  it('returns 0 when both P(profB | A) and P(profB | !A) are 0', () => {
    const table = makeContingency(0, 5, 0, 5);
    expect(computeInformativeness(table)).toBe(0);
  });

  it('returns 0 when both conditionals are 1 (saturated)', () => {
    const table = makeContingency(5, 0, 5, 0);
    expect(computeInformativeness(table)).toBe(0);
  });

  it('returns the lift when A is informative for B', () => {
    // profB | A = 5/5 = 1; profB | !A = 1/5 = 0.2; lift = 0.8
    const table = makeContingency(5, 0, 1, 4);
    expect(computeInformativeness(table)).toBeCloseTo(0.8, 10);
  });

  it('returns a negative lift when A is anti-informative for B', () => {
    // profB | A = 1/5 = 0.2; profB | !A = 4/5 = 0.8; lift = -0.6
    const table = makeContingency(1, 4, 4, 1);
    expect(computeInformativeness(table)).toBeCloseTo(-0.6, 10);
  });

  it('returns 0 sentinel when the A-proficient column is empty', () => {
    const table = makeContingency(0, 0, 5, 5);
    const result = computeInformativeness(table);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(0);
  });

  it('returns 0 sentinel when the entire table is empty', () => {
    const result = computeInformativeness(makeContingency(0, 0, 0, 0));
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cross-phase: necessity & informativeness are NaN-free on every edge case
// ---------------------------------------------------------------------------

describe('contingency helpers — NaN-free on degenerate inputs', () => {
  it('zero rows / zero columns never produce NaN', () => {
    const table = makeContingency(0, 0, 0, 0);
    expect(Number.isNaN(computeNecessity(table))).toBe(false);
    expect(Number.isNaN(computeInformativeness(table))).toBe(false);
  });

  it('single-cell tables never produce NaN', () => {
    const cases = [
      makeContingency(1, 0, 0, 0),
      makeContingency(0, 1, 0, 0),
      makeContingency(0, 0, 1, 0),
      makeContingency(0, 0, 0, 1),
    ];
    for (const table of cases) {
      expect(Number.isNaN(computeNecessity(table))).toBe(false);
      expect(Number.isNaN(computeInformativeness(table))).toBe(false);
    }
  });
});

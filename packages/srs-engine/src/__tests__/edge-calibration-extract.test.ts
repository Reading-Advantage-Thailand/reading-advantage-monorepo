/**
 * Phase 2 Red Test — Observation extraction (FR1, AC1)
 *
 * Track 3: Edge Calibration Loop.
 *
 * Pin the API surface for `extractObservations`: a pure function that
 * consumes a raw per-student verdict record and emits one
 * `CalibrationObservation` for every student who has a verdict on *both* A and
 * B. Students missing either verdict are filtered out (per spec FR1).
 *
 * The verdict record shape is pinned here to keep Phase 2 tests independent of
 * Track 1 internals (test-strategy.md §3).
 */
import { describe, it, expect } from 'vitest';
import type { CalibrationObservation, CalibrationVerdict } from '../srs/edge-calibration.js';
import { extractObservations } from '../srs/edge-calibration.js';

// ---------------------------------------------------------------------------
// Verdict record shape (pinned fixture — do not couple to Track 1 internals)
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

// ---------------------------------------------------------------------------
// Task 2.1 — extractObservations (FR1, AC1)
// ---------------------------------------------------------------------------

describe('extractObservations (FR1, AC1)', () => {
  it('emits one observation per student with verdicts on both A and B', () => {
    const verdicts = makeVerdicts([
      ['s1', { a: true, b: true }],
      ['s2', { a: false, b: true }],
      ['s3', { a: true, b: false }],
      ['s4', { a: false, b: false }],
    ]);
    const observations = extractObservations(verdicts);
    expect(observations).toHaveLength(4);
    const ids = observations.map((o) => o.studentId).sort();
    expect(ids).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('preserves the per-student (a, b) pairing on every observation', () => {
    const verdicts = makeVerdicts([
      ['alpha', { a: true, b: false }],
      ['beta', { a: false, b: true }],
    ]);
    const observations = extractObservations(verdicts);
    const alpha = observations.find((o) => o.studentId === 'alpha');
    const beta = observations.find((o) => o.studentId === 'beta');
    expect(alpha).toBeDefined();
    expect(beta).toBeDefined();
    expect(alpha?.a).toBe(true);
    expect(alpha?.b).toBe(false);
    expect(beta?.a).toBe(false);
    expect(beta?.b).toBe(true);
  });

  it('filters out students missing the A verdict', () => {
    const verdicts = makeVerdicts([
      ['both', { a: true, b: true }],
      ['b-only', { b: true }],
    ]);
    const observations = extractObservations(verdicts);
    expect(observations).toHaveLength(1);
    expect(observations[0]?.studentId).toBe('both');
  });

  it('filters out students missing the B verdict', () => {
    const verdicts = makeVerdicts([
      ['both', { a: true, b: true }],
      ['a-only', { a: true }],
    ]);
    const observations = extractObservations(verdicts);
    expect(observations).toHaveLength(1);
    expect(observations[0]?.studentId).toBe('both');
  });

  it('returns an empty array when the verdict record is empty', () => {
    const observations = extractObservations(makeVerdicts([]));
    expect(observations).toEqual([]);
  });

  it('returns an empty array when no student has both verdicts', () => {
    const verdicts = makeVerdicts([
      ['a-only', { a: true }],
      ['b-only', { b: true }],
    ]);
    const observations = extractObservations(verdicts);
    expect(observations).toEqual([]);
  });

  it('preserves the verdict type (boolean) — does not coerce or widen', () => {
    const verdicts = makeVerdicts([
      ['s1', { a: true, b: true }],
      ['s2', { a: false, b: false }],
    ]);
    const observations: CalibrationObservation[] = extractObservations(verdicts);
    for (const o of observations) {
      expect(typeof o.a).toBe('boolean');
      expect(typeof o.b).toBe('boolean');
    }
  });

  it('does not mutate the input verdict record', () => {
    const verdicts = makeVerdicts([
      ['s1', { a: true, b: true }],
      ['s2', { a: true }],
    ]);
    const before = Array.from(verdicts.entries());
    extractObservations(verdicts);
    const after = Array.from(verdicts.entries());
    expect(after).toEqual(before);
  });

  it('handles a large synthetic cohort reproducibly', () => {
    const entries: Array<readonly [string, EdgeVerdicts]> = [];
    for (let i = 0; i < 1000; i++) {
      entries.push([`s${i}`, { a: i % 2 === 0, b: i % 3 === 0 }]);
    }
    const observations = extractObservations(makeVerdicts(entries));
    expect(observations).toHaveLength(1000);
  });
});

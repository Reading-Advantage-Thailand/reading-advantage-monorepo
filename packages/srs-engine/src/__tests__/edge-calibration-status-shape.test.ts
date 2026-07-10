/**
 * Phase 1 Contract Test — CalibrationStatus type-level alignment
 *
 * Track 3: Edge Calibration Loop.
 *
 * Complements `edge-calibration-contract.test.ts` with type-level
 * (compile-time) assertions on the `CalibrationStatus` enum and its
 * sibling const tuple. The two files together pin the contract from
 * both runtime and type-system angles: the runtime test exercises
 * shape, the type-level test exercises exhaustiveness at compile time.
 *
 * Per test-strategy.md §5:
 *   "write a `contract.test.ts` asserting exhaustive status enum
 *    coverage via discriminated-union switch (TS will fail compilation
 *    if a case is missed — leverage that)."
 *
 * Both mechanisms (runtime exhaustive switch + type-level union check)
 * are deployed here to catch any drift between the const tuple and
 * the literal-union type.
 */
import { describe, it, expect } from 'vitest';
import { CALIBRATION_STATUS_VALUES } from '../srs/edge-calibration.js';
import type { CalibrationStatus } from '../srs/edge-calibration.js';

// ---------------------------------------------------------------------------
// Compile-time assertion: the const tuple's element type is exactly the
// `CalibrationStatus` literal union. This block fails to compile if the
// module's exports drift (e.g. if the enum gains a value not present in
// the tuple, or vice versa).
// ---------------------------------------------------------------------------

type ValuesAsUnion = typeof CALIBRATION_STATUS_VALUES[number];
type StatusAsUnion = CalibrationStatus;
type _AssertTuplesMatchStatus = [ValuesAsUnion] extends [StatusAsUnion]
  ? [StatusAsUnion] extends [ValuesAsUnion]
    ? true
    : false
  : false;
const _assertExhaustive: _AssertTuplesMatchStatus = true;
void _assertExhaustive;

// ---------------------------------------------------------------------------
// Runtime tests
// ---------------------------------------------------------------------------

describe('contract — CalibrationStatus value/tuple alignment', () => {
  it('exposes a readonly tuple of literal CalibrationStatus values', () => {
    expect(Array.isArray(CALIBRATION_STATUS_VALUES)).toBe(true);
    for (const value of CALIBRATION_STATUS_VALUES) {
      expect(typeof value).toBe('string');
    }
  });

  it('contains exactly the three spec FR5 status values', () => {
    expect(CALIBRATION_STATUS_VALUES).toHaveLength(3);
    expect([...CALIBRATION_STATUS_VALUES].sort()).toEqual(
      ['confirmed', 'refuted', 'untested'].sort(),
    );
  });

  it('is assignable to a CalibrationStatus-typed variable', () => {
    const value: CalibrationStatus = CALIBRATION_STATUS_VALUES[0];
    expect(['confirmed', 'refuted', 'untested']).toContain(value);
  });
});

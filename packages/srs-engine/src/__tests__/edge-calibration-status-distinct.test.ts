/**
 * Phase 1 Contract Test — CalibrationStatus distinct from ReviewStatus
 *
 * Track 3: Edge Calibration Loop.
 *
 * Per test-strategy.md §2:
 *   "Reuse `ReviewStatus` from `packages/knowledge-space-core/src/types.ts:31`;
 *    the calibration status enum (`confirmed | refuted | untested`) is
 *    **distinct** and lives in the new calibration types — do not overload
 *    `ReviewStatus`."
 *
 * The companion tests in `edge-calibration-contract.test.ts` and
 * `edge-calibration-status-shape.test.ts` pin the *internal* shape of
 * `CalibrationStatus` (exhaustive switch, value tuple, tuple/union alignment).
 * This file pins the *external* invariant: `CalibrationStatus` is a separate
 * literal union from `ReviewStatus`, with disjoint value sets and different
 * arities. A future refactor that accidentally aliases the two enums (e.g. by
 * re-exporting `ReviewStatus` as `CalibrationStatus`, or by adding a value to
 * one that shadows the other) must be caught here.
 *
 * This test is Red in Phase 1 — `../srs/edge-calibration` does not exist yet.
 * Once Phase 1 Green lands, this guard stays in place to prevent regression.
 */
import { describe, it, expect } from 'vitest';
import type { ReviewStatus } from '@reading-advantage/knowledge-space-core';
import type { CalibrationStatus } from '../srs/edge-calibration.js';
import { CALIBRATION_STATUS_VALUES } from '../srs/edge-calibration.js';

// ReviewStatus is the existing graph-review enum (knowledge-space-core/types.ts:31).
// It is duplicated here as a local const (not imported as a value) to avoid
// forcing a runtime dependency on the new module for the assertion below —
// the disjointness test only needs the *known* value set.
const REVIEW_STATUS_VALUES: readonly ReviewStatus[] = [
  'draft',
  'reviewed',
  'approved',
  'rejected',
] as const;

// ---------------------------------------------------------------------------
// Task 1.7 — CalibrationStatus disjointness from ReviewStatus
// ---------------------------------------------------------------------------

describe('contract — CalibrationStatus is distinct from ReviewStatus', () => {
  it('shares no literal value with ReviewStatus (no accidental aliasing)', () => {
    const calibrationValues: readonly CalibrationStatus[] = CALIBRATION_STATUS_VALUES;
    const reviewValues: readonly string[] = REVIEW_STATUS_VALUES;
    const overlap = calibrationValues.filter((v) => reviewValues.includes(v));
    expect(overlap).toEqual([]);
  });

  it('has a different arity from ReviewStatus (3 vs 4)', () => {
    expect(CALIBRATION_STATUS_VALUES).toHaveLength(3);
    expect(REVIEW_STATUS_VALUES).toHaveLength(4);
    expect(CALIBRATION_STATUS_VALUES.length).not.toBe(REVIEW_STATUS_VALUES.length);
  });

  it('does not name its values with graph-review terminology', () => {
    // Spec FR5 names the three calibration statuses after the *evidence*
    // relationship to the authored edge ("confirmed" / "refuted" / "untested"),
    // not the human-review lifecycle ("draft" / "reviewed" / "approved" / "rejected").
    // This guards against future refactors that swap the enum's vocabulary.
    const calibrationValues = new Set<string>(CALIBRATION_STATUS_VALUES);
    for (const reviewOnly of REVIEW_STATUS_VALUES) {
      expect(calibrationValues.has(reviewOnly)).toBe(false);
    }
  });

  it('is exported as its own type — not aliased to ReviewStatus', () => {
    // Compile-time assertion: a `CalibrationStatus` value is NOT assignable to
    // a `ReviewStatus` variable without an explicit cast. (TypeScript catches
    // the literal-level disjointness; this test renders the same guarantee as
    // a runtime contract that the two type identities are separate.)
    const sample: CalibrationStatus = CALIBRATION_STATUS_VALUES[0];
    const looksLikeReview: ReviewStatus = sample as unknown as ReviewStatus;
    // The cast escapes the type system, but at runtime the value is one of
    // {confirmed, refuted, untested}, which is not a valid ReviewStatus literal.
    expect(REVIEW_STATUS_VALUES).not.toContain(looksLikeReview);
  });
});

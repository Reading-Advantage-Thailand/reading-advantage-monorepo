// Synthetic progress-trend history fixtures for testing only.
// Phase 3 of kst-lesser-holes_20260521: drive `projectParentVisualization` with
// timestamped mastery snapshots to assert the new time-delta trend computation.
//
// Each fixture is a `ProgressTrendHistory` (typed in
// @reading-advantage/knowledge-space-core/progress-trend): an array of
// `MasterySnapshot` records, each carrying a `timestamp` (ms epoch) and a
// `masteredNodeIds: string[]` of skill ids the learner had mastered at that
// moment.
//
// The synthetic node ids below are taken from `syntheticMathFixture` in
// @reading-advantage/knowledge-space-core — they are the skill nodes the test
// graph actually contains, so the test driver can pass the same graph to
// `projectParentVisualization` and the trend logic operates on real ids.

import type {
  MasterySnapshot,
  ProgressTrendHistory,
} from '@reading-advantage/knowledge-space-core';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Trend window in milliseconds — 7 days, the FR3 time-delta horizon. */
export const PROGRESS_TREND_WINDOW_MS = 7 * DAY_MS;

/**
 * A reference epoch for the fixtures. Real production code does not depend on
 * a particular wall-clock; the trend logic compares relative timestamps
 * inside the window. Picking a fixed base makes the fixtures deterministic
 * across CI runs.
 */
const BASE_TIMESTAMP = 1_700_000_000_000;

// ---------------------------------------------------------------------------
// Skill ids from `syntheticMathFixture` (knowledge-space-core/fixtures.ts)
// ---------------------------------------------------------------------------
const SKILL_IDENTIFY_ROOTS = 'math.im3.skill.m1.l2.identify-roots';
const SKILL_SOLVE_FACTORING = 'math.im3.skill.m1.l2.solve-quadratic-by-factoring';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Improving: mastered count grew by +1 over the 7-day window.
 * Expected trend: 'improving'.
 */
export const improvingHistory: ProgressTrendHistory = [
  {
    timestamp: BASE_TIMESTAMP,
    masteredNodeIds: [SKILL_IDENTIFY_ROOTS],
  },
  {
    timestamp: BASE_TIMESTAMP + PROGRESS_TREND_WINDOW_MS,
    masteredNodeIds: [SKILL_IDENTIFY_ROOTS, SKILL_SOLVE_FACTORING],
  },
];

/**
 * Flat: mastered count unchanged over the 7-day window.
 * Expected trend: 'stable'.
 */
export const flatHistory: ProgressTrendHistory = [
  {
    timestamp: BASE_TIMESTAMP,
    masteredNodeIds: [SKILL_IDENTIFY_ROOTS, SKILL_SOLVE_FACTORING],
  },
  {
    timestamp: BASE_TIMESTAMP + PROGRESS_TREND_WINDOW_MS,
    masteredNodeIds: [SKILL_IDENTIFY_ROOTS, SKILL_SOLVE_FACTORING],
  },
];

/**
 * Declining: mastered count shrank by -1 over the 7-day window.
 * This is rare in practice (mastery is normally monotonic), but the trend
 * computation must support it because the underlying data can report a
 * shrinking mastered set (e.g. mastery revoked, snapshot reset, retroactive
 * import correction). Expected trend: 'declining'.
 */
export const decliningHistory: ProgressTrendHistory = [
  {
    timestamp: BASE_TIMESTAMP,
    masteredNodeIds: [SKILL_IDENTIFY_ROOTS, SKILL_SOLVE_FACTORING],
  },
  {
    timestamp: BASE_TIMESTAMP + PROGRESS_TREND_WINDOW_MS,
    masteredNodeIds: [SKILL_IDENTIFY_ROOTS],
  },
];

/**
 * Insufficient history: zero snapshots. The function has nothing to compare,
 * so it cannot compute a delta. Expected trend: 'unknown'.
 */
export const insufficientHistory: ProgressTrendHistory = [];

/**
 * Insufficient history: a single snapshot. The function has only one data
 * point, so it cannot compute a delta over the window. Expected trend:
 * 'unknown' (this is the boundary condition test for "fewer than 2 samples").
 */
export const singleSnapshotHistory: ProgressTrendHistory = [
  {
    timestamp: BASE_TIMESTAMP + PROGRESS_TREND_WINDOW_MS,
    masteredNodeIds: [SKILL_IDENTIFY_ROOTS],
  },
];

// ---------------------------------------------------------------------------
// Convenience: export the snapshot type for the test file
// ---------------------------------------------------------------------------

export type { MasterySnapshot, ProgressTrendHistory };

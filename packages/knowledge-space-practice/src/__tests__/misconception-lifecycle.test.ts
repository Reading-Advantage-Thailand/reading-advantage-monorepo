// Phase 3 (Track 6 misconception-loop_20260521) — pure unit Red tests for the
// real T6 lifecycle transition function.
//
// kst-srs.v2 §9.3 + spec.md FR3: a misconception is `active` on detection and
// becomes `resolved` after N consecutive clean attempts on its affected
// skills. The transition function is the **domain-neutral** state machine
// that lives in `packages/knowledge-space-practice/src/misconception-loop.ts`
// (per `test-strategy.md` §4 + §6: the IM3 smoke test already imports
// `runRealT6Loop` from `@reading-advantage/knowledge-space-practice/
// misconception-loop`, so the export name + module path are fixed).
//
// `test-strategy.md` §3 + §5 P3 enumerates the cross-phase edge cases this
// file must own:
//   - **Resolution flicker**: one clean → one mistake → N cleans must still
//     resolve (explicit fixture).
//   - **Multi-skill misconception**: each affected skill contributes to the
//     clean streak; both must clear before resolved (here modeled as: the
//     slug is the resolution unit, not the skill — a fresh wrong answer on
//     the same slug refreshes the streak regardless of which affected skill
//     the wrong answer came from).
//   - **Stale state migration**: students with no prior misconception row
//     must default to an empty active set, not throw.
//
// Scope (deliberately narrow, per `test-strategy.md` §"Fake harness
// boundary"):
//   - This file tests the **pure** transition function only.
//   - It does NOT test the `injected` (remediation routing) bucket — that
//     is the IM3-wiring layer's responsibility (P4) and the IM3 fake
//     harness already covers the routing shape. Keeping the package-level
//     T6 domain-neutral means injection is layered on top in the caller
//     (see `test-strategy.md` §4 boundary: "Convex persistence stays in
//     `apps/integrated-math-3/convex/` per practice-component-contract").
//   - It does NOT test severity consumption — that is the rating-cap
//     layer's responsibility (Phase 2) via the `getMisconceptionSeverity`
//     accessor. Severity is still read by the planner (P4) for routing
//     decisions, but the lifecycle machine itself is severity-agnostic.
//
// Why this file is Red at HEAD: the planned `runRealT6Loop` function does
// not exist in `../misconception-loop` (only the Phase 1 severity/lifecycle
// types + accessor do). Vite module-resolution fails on the import, so the
// suite reports 0 tests run with a module-resolution error. This is an
// "implementation missing" Red, not a stale-durable Red.
//
// The `as unknown as` casts and the `(... as never)`-style shims in the
// fixtures are deliberate: we want the runtime assertions to surface the
// missing implementation rather than have TS compile errors mask the real
// signal. Green phase removes the casts when the real function is added.

import { describe, it, expect } from 'vitest';
import {
  practiceSubmissionEnvelopeSchema,
  type PracticeSubmissionEnvelope,
  type PracticeSubmissionPart,
} from '@reading-advantage/practice-core/contract';
import { toConvexActivityId } from '@reading-advantage/practice-core';

// ---------------------------------------------------------------------------
// Planned public surface (does not exist at HEAD).
//
// The Green-phase deliverable for this file extends
// `packages/knowledge-space-practice/src/misconception-loop.ts` to export:
//
//   export interface StudentMisconceptionLoopState {
//     readonly active: readonly string[];
//     readonly cleanStreaks: Readonly<Record<string, number>>;
//   }
//
//   export interface RunRealT6LoopInput {
//     readonly submission: PracticeSubmissionEnvelope;
//     readonly state: StudentMisconceptionLoopState;
//     readonly resolutionThreshold: number;
//   }
//
//   export interface RunRealT6LoopOutput {
//     readonly detected: readonly string[];
//     readonly active: readonly string[];
//     readonly resolved: readonly string[];
//     readonly updatedState: StudentMisconceptionLoopState;
//   }
//
//   export function runRealT6Loop(
//     input: RunRealT6LoopInput,
//   ): RunRealT6LoopOutput;
//
// Until then, the import below fails at module resolution and every test
// in this file fails loudly.
// ---------------------------------------------------------------------------

import {
  runRealT6Loop,
  type RunRealT6LoopInput,
  type RunRealT6LoopOutput,
  type StudentMisconceptionLoopState,
} from '../misconception-loop.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const DEFAULT_ACTIVITY_ID = 'math.im3.example.1.1.001';
const RESOLUTION_THRESHOLD = 3;

const KNOWN_SLUG = 'sign-error-in-factored-form';
const KNOWN_SLUG_2 = 'quadratic-formula-sign-flip';

interface AlgebraicPartSpec {
  partId: string;
  isCorrect: boolean;
  misconceptionTags?: readonly string[];
}

function makeAlgebraicSubmission(
  partsSpec: readonly AlgebraicPartSpec[],
): PracticeSubmissionEnvelope {
  const parts: PracticeSubmissionPart[] = partsSpec.map((spec) => ({
    partId: spec.partId,
    rawAnswer: spec.isCorrect ? 'correct' : 'incorrect',
    isCorrect: spec.isCorrect,
    misconceptionTags: spec.misconceptionTags ? [...spec.misconceptionTags] : [],
    hintsUsed: 0,
    revealStepsSeen: 0,
  }));
  return practiceSubmissionEnvelopeSchema.parse({
    contractVersion: 'practice.v1',
    activityId: toConvexActivityId(DEFAULT_ACTIVITY_ID),
    mode: 'independent_practice',
    status: 'submitted',
    attemptNumber: 1,
    submittedAt: '2026-06-15T12:00:00.000Z',
    answers: Object.fromEntries(
      partsSpec.map((s) => [s.partId, s.isCorrect ? 'correct' : 'incorrect']),
    ),
    parts,
  });
}

function emptyState(): StudentMisconceptionLoopState {
  return { active: [], cleanStreaks: {} };
}

function makeInput(
  submission: PracticeSubmissionEnvelope,
  state: StudentMisconceptionLoopState = emptyState(),
  resolutionThreshold: number = RESOLUTION_THRESHOLD,
): RunRealT6LoopInput {
  return { submission, state, resolutionThreshold };
}

// ---------------------------------------------------------------------------
// 1. Export surface — the IM3 smoke test asserts `typeof runRealT6Loop ===
//    'function'` against this module path. Re-asserting it here at the
//    package level keeps the contract pinned.
// ---------------------------------------------------------------------------

describe('runRealT6Loop — export surface (test-strategy §4 + §6)', () => {
  it('is exported as a function from packages/knowledge-space-practice/misconception-loop', () => {
    expect(typeof runRealT6Loop).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 2. Detection step — collects tags from submission, deduped.
// ---------------------------------------------------------------------------

describe('runRealT6Loop — detection step (spec FR3)', () => {
  it('returns an empty `detected` list for a clean submission with no tags', () => {
    const submission = makeAlgebraicSubmission([{ partId: 'p1', isCorrect: true }]);
    const result: RunRealT6LoopOutput = runRealT6Loop(makeInput(submission));
    expect(result.detected).toEqual([]);
  });

  it('collects every distinct tag from parts[*].misconceptionTags, deduped', () => {
    const submission = makeAlgebraicSubmission([
      { partId: 'p1', isCorrect: false, misconceptionTags: [KNOWN_SLUG] },
      { partId: 'p2', isCorrect: false, misconceptionTags: [KNOWN_SLUG, KNOWN_SLUG_2] },
    ]);
    const result = runRealT6Loop(makeInput(submission));
    expect(new Set(result.detected)).toEqual(new Set([KNOWN_SLUG, KNOWN_SLUG_2]));
    expect(result.detected.length).toBe(2);
  });

  it('preserves the order of first appearance in `detected`', () => {
    const submission = makeAlgebraicSubmission([
      { partId: 'p1', isCorrect: false, misconceptionTags: [KNOWN_SLUG_2] },
      { partId: 'p2', isCorrect: false, misconceptionTags: [KNOWN_SLUG] },
      { partId: 'p3', isCorrect: false, misconceptionTags: [KNOWN_SLUG_2] },
    ]);
    const result = runRealT6Loop(makeInput(submission));
    // The first appearance order — KNOWN_SLUG_2 first, then KNOWN_SLUG.
    // Duplicate KNOWN_SLUG_2 in p3 must not change the order.
    expect(result.detected[0]).toBe(KNOWN_SLUG_2);
    expect(result.detected[1]).toBe(KNOWN_SLUG);
    expect(result.detected.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 3. Active-lifecycle transition (newly detected → active).
// ---------------------------------------------------------------------------

describe('runRealT6Loop — active transition (spec FR3, test-strategy §3)', () => {
  it('moves a newly detected slug from inactive to active in updatedState', () => {
    const submission = makeAlgebraicSubmission([
      { partId: 'p1', isCorrect: false, misconceptionTags: [KNOWN_SLUG] },
    ]);
    const result = runRealT6Loop(makeInput(submission));
    expect(result.active).toContain(KNOWN_SLUG);
    expect(result.updatedState.active).toContain(KNOWN_SLUG);
  });

  it('preserves a pre-existing active slug that is not detected in this submission', () => {
    const submission = makeAlgebraicSubmission([
      { partId: 'p1', isCorrect: false, misconceptionTags: [KNOWN_SLUG] },
    ]);
    const prior: StudentMisconceptionLoopState = {
      active: [KNOWN_SLUG_2],
      cleanStreaks: { [KNOWN_SLUG_2]: 0 },
    };
    const result = runRealT6Loop(makeInput(submission, prior));
    expect(new Set(result.active)).toEqual(new Set([KNOWN_SLUG, KNOWN_SLUG_2]));
    expect(new Set(result.updatedState.active)).toEqual(
      new Set([KNOWN_SLUG, KNOWN_SLUG_2]),
    );
  });

  it('resets a re-detected active slug\'s clean streak to 0 (a wrong-answer refreshes the flag)', () => {
    const prior: StudentMisconceptionLoopState = {
      active: [KNOWN_SLUG],
      cleanStreaks: { [KNOWN_SLUG]: 2 },
    };
    const submission = makeAlgebraicSubmission([
      { partId: 'p1', isCorrect: false, misconceptionTags: [KNOWN_SLUG] },
    ]);
    const result = runRealT6Loop(makeInput(submission, prior));
    expect(result.resolved).not.toContain(KNOWN_SLUG);
    expect(result.updatedState.cleanStreaks[KNOWN_SLUG]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Resolution — N consecutive clean attempts on the affected skills.
//
// A "clean attempt" is a submission where the slug does NOT appear in
// detected (i.e., the student did not produce the misconception tag in any
// part of the submission). Per `test-strategy.md` §3, the resolution rule
// is per-slug, not per-skill — but a multi-skill misconception (a slug
// whose `affectedSkills.length > 1`) still resolves as a single unit
// because the slug is the row key in `student_misconception_state`.
// ---------------------------------------------------------------------------

describe('runRealT6Loop — resolution after N clean attempts (kst-srs.v2 §9.3, test-strategy §3)', () => {
  it('does NOT resolve on the first clean attempt after a wrong-answer', () => {
    const prior: StudentMisconceptionLoopState = {
      active: [KNOWN_SLUG],
      cleanStreaks: { [KNOWN_SLUG]: 0 },
    };
    const submission = makeAlgebraicSubmission([{ partId: 'p1', isCorrect: true }]);
    const result = runRealT6Loop(makeInput(submission, prior));
    expect(result.resolved).toEqual([]);
    expect(result.active).toContain(KNOWN_SLUG);
    expect(result.updatedState.cleanStreaks[KNOWN_SLUG]).toBe(1);
  });

  it('does NOT resolve one short of the threshold (N-1 clean attempts)', () => {
    const prior: StudentMisconceptionLoopState = {
      active: [KNOWN_SLUG],
      cleanStreaks: { [KNOWN_SLUG]: RESOLUTION_THRESHOLD - 2 },
    };
    const submission = makeAlgebraicSubmission([{ partId: 'p1', isCorrect: true }]);
    const result = runRealT6Loop(makeInput(submission, prior));
    expect(result.resolved).toEqual([]);
    expect(result.active).toContain(KNOWN_SLUG);
    expect(result.updatedState.cleanStreaks[KNOWN_SLUG]).toBe(
      RESOLUTION_THRESHOLD - 1,
    );
  });

  it('resolves the slug when the clean streak reaches the threshold', () => {
    const prior: StudentMisconceptionLoopState = {
      active: [KNOWN_SLUG],
      cleanStreaks: { [KNOWN_SLUG]: RESOLUTION_THRESHOLD - 1 },
    };
    const submission = makeAlgebraicSubmission([{ partId: 'p1', isCorrect: true }]);
    const result = runRealT6Loop(makeInput(submission, prior));
    expect(result.resolved).toContain(KNOWN_SLUG);
    expect(result.active).not.toContain(KNOWN_SLUG);
    expect(result.updatedState.active).not.toContain(KNOWN_SLUG);
    expect(result.updatedState.cleanStreaks[KNOWN_SLUG]).toBe(0);
  });

  it('resolves each active slug independently based on its own clean streak (multi-skill / multi-slug)', () => {
    const prior: StudentMisconceptionLoopState = {
      active: [KNOWN_SLUG, KNOWN_SLUG_2],
      cleanStreaks: {
        [KNOWN_SLUG]: RESOLUTION_THRESHOLD - 1,
        [KNOWN_SLUG_2]: 0,
      },
    };
    const submission = makeAlgebraicSubmission([{ partId: 'p1', isCorrect: true }]);
    const result = runRealT6Loop(makeInput(submission, prior));
    expect(result.resolved).toEqual([KNOWN_SLUG]);
    expect(result.active).toEqual([KNOWN_SLUG_2]);
  });

  it('resolution flicker: clean → mistake → N cleans must still resolve (test-strategy §3)', () => {
    // Sequence:
    //   1. Detection submission:  streak = 0
    //   2. Clean submission:      streak = 1 (active, not resolved)
    //   3. Wrong-answer submission on the same slug: streak reset to 0
    //   4. Clean submission:      streak = 1 (active, not resolved)
    //   5. Clean submission:      streak = 2 (active, not resolved)
    //   6. Clean submission:      streak = 3 → resolved
    const initial: StudentMisconceptionLoopState = emptyState();
    const wrongSubmission = makeAlgebraicSubmission([
      { partId: 'p1', isCorrect: false, misconceptionTags: [KNOWN_SLUG] },
    ]);
    const cleanSubmission = makeAlgebraicSubmission([
      { partId: 'p1', isCorrect: true },
    ]);

    const step1 = runRealT6Loop(makeInput(wrongSubmission, initial));
    expect(step1.updatedState.cleanStreaks[KNOWN_SLUG]).toBe(0);

    const step2 = runRealT6Loop(makeInput(cleanSubmission, step1.updatedState));
    expect(step2.resolved).toEqual([]);
    expect(step2.updatedState.cleanStreaks[KNOWN_SLUG]).toBe(1);

    // The flicker — a wrong answer after one clean attempt must reset the
    // streak to 0 (the "active flag" refreshes).
    const step3 = runRealT6Loop(makeInput(wrongSubmission, step2.updatedState));
    expect(step3.resolved).toEqual([]);
    expect(step3.updatedState.cleanStreaks[KNOWN_SLUG]).toBe(0);

    const step4 = runRealT6Loop(makeInput(cleanSubmission, step3.updatedState));
    expect(step4.resolved).toEqual([]);
    expect(step4.updatedState.cleanStreaks[KNOWN_SLUG]).toBe(1);

    const step5 = runRealT6Loop(makeInput(cleanSubmission, step4.updatedState));
    expect(step5.resolved).toEqual([]);
    expect(step5.updatedState.cleanStreaks[KNOWN_SLUG]).toBe(2);

    const step6 = runRealT6Loop(makeInput(cleanSubmission, step5.updatedState));
    expect(step6.resolved).toEqual([KNOWN_SLUG]);
    expect(step6.active).not.toContain(KNOWN_SLUG);
    expect(step6.updatedState.cleanStreaks[KNOWN_SLUG]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Purity — the function is a pure transition over state.
// ---------------------------------------------------------------------------

describe('runRealT6Loop — purity (test-strategy §3)', () => {
  it('does not mutate the input state', () => {
    const prior: StudentMisconceptionLoopState = {
      active: [KNOWN_SLUG_2],
      cleanStreaks: { [KNOWN_SLUG_2]: 1 },
    };
    const snapshot = JSON.stringify(prior);
    const submission = makeAlgebraicSubmission([
      { partId: 'p1', isCorrect: false, misconceptionTags: [KNOWN_SLUG] },
    ]);
    runRealT6Loop(makeInput(submission, prior));
    expect(JSON.stringify(prior)).toBe(snapshot);
  });

  it('is referentially transparent — same input yields the same output', () => {
    const prior: StudentMisconceptionLoopState = {
      active: [KNOWN_SLUG],
      cleanStreaks: { [KNOWN_SLUG]: RESOLUTION_THRESHOLD - 1 },
    };
    const submission = makeAlgebraicSubmission([{ partId: 'p1', isCorrect: true }]);
    const a = runRealT6Loop(makeInput(submission, prior));
    const b = runRealT6Loop(makeInput(submission, prior));
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// 6. Stale state migration — old students with no misconception row must
//    default to an empty active set, not throw.
//
// `test-strategy.md` §3: "Stale state migration (Phase 3): old students
// with no misconception row must default to empty active set, not throw."
// This is the package-level guarantee: a `cleanStreaks` map may be empty
// for slugs that were never tracked; a `state.active` list may be empty
// for students with no active misconceptions. The function must handle
// both gracefully.
// ---------------------------------------------------------------------------

describe('runRealT6Loop — stale state default (test-strategy §3)', () => {
  it('handles an empty prior state (no active misconceptions)', () => {
    const submission = makeAlgebraicSubmission([{ partId: 'p1', isCorrect: true }]);
    const result = runRealT6Loop(makeInput(submission, emptyState()));
    expect(result.active).toEqual([]);
    expect(result.resolved).toEqual([]);
    expect(result.detected).toEqual([]);
    expect(result.updatedState.active).toEqual([]);
    expect(result.updatedState.cleanStreaks).toEqual({});
  });

  it('handles a cleanStreaks map with entries for slugs no longer active (slugs that already resolved)', () => {
    // The caller is responsible for evicting resolved slugs from
    // cleanStreaks, but the function must not crash if a stale entry
    // remains — it just ignores non-active slugs during the resolve pass.
    const prior: StudentMisconceptionLoopState = {
      active: [],
      cleanStreaks: { 'some-stale-resolved-slug': 5 },
    };
    const submission = makeAlgebraicSubmission([
      { partId: 'p1', isCorrect: false, misconceptionTags: [KNOWN_SLUG] },
    ]);
    expect(() => runRealT6Loop(makeInput(submission, prior))).not.toThrow();
    const result = runRealT6Loop(makeInput(submission, prior));
    expect(result.active).toEqual([KNOWN_SLUG]);
  });
});

// ---------------------------------------------------------------------------
// 7. Input validation — resolutionThreshold is a positive integer.
// ---------------------------------------------------------------------------

describe('runRealT6Loop — input validation', () => {
  it('throws on a non-positive resolution threshold', () => {
    const submission = makeAlgebraicSubmission([{ partId: 'p1', isCorrect: true }]);
    expect(() => runRealT6Loop(makeInput(submission, emptyState(), 0))).toThrow();
  });

  it('throws on a non-integer resolution threshold', () => {
    const submission = makeAlgebraicSubmission([{ partId: 'p1', isCorrect: true }]);
    expect(() => runRealT6Loop(makeInput(submission, emptyState(), 1.5))).toThrow();
  });
});

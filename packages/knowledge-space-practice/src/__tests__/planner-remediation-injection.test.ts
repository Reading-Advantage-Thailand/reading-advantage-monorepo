/**
 * Phase 4 (Track 6 misconception-loop_20260521) — Red direct unit test
 * for the planner-remediation injection function.
 *
 * Per spec FR4 + kst-srs.v2 §9.4, "while a misconception is `active`, its
 * `remediated_by` activity is injected into the practice queue ahead of
 * normal progression". This module owns the **pure merge** of:
 *
 *   - the planner's next-activities list (output of the Track 4 planner
 *     for the student's current ready set), and
 *   - the T6 loop's `injected: readonly RemediationActivityRef[]` field
 *     (the per-misconception remediation activities to surface first).
 *
 * The injection function is **domain-neutral** (it does not know about
 * the IM3 taxonomy or any app): it consumes two same-shaped activity
 * reference arrays and produces a new list with the injected activities
 * prepended ahead of the normal next list. Dedup policy: if the same
 * `activityId` is in both lists, the injected copy wins (it stays at
 * the front) and the matching entry is removed from the next list.
 *
 * Source under test (does NOT exist at HEAD; this is the Red signal):
 * `packages/knowledge-space-practice/src/planner/injection.ts` exports
 * `planRemediationInjection(args)` (pure function).
 *
 * Test approach: pure unit, no I/O, no app/Convex imports, no fake. Each
 * case uses hand-rolled same-shaped `{activityId, activityKind, label}`
 * fixtures. The dependency that *will* be inserted by the Green
 * Implementer is the new module's exported function — failures here are
 * `TypeError: planRemediationInjection is not a function` from the
 * missing export, not durable-record staleness.
 */

import { describe, expect, it } from 'vitest';

import { planRemediationInjection } from '../planner/injection.js';

interface PlannedActivity {
  readonly activityId: string;
  readonly activityKind: 'worked_example' | 'task_blueprint' | 'skill';
  readonly label: string;
}

const SIGN_ERROR_REM_1: PlannedActivity = {
  activityId: 'math.im3.example.1.4.019',
  activityKind: 'worked_example',
  label: 'Worked example: sign errors when factoring',
};

const SIGN_ERROR_REM_2: PlannedActivity = {
  activityId: 'math.im3.skill.1.4.solve-quadratic-equations-by-factoring',
  activityKind: 'skill',
  label: 'Skill practice: solve quadratic equations by factoring',
};

const QUAD_FORMULA_REM: PlannedActivity = {
  activityId: 'math.im3.example.1.6.036',
  activityKind: 'worked_example',
  label: 'Worked example: tracking the ± sign in the quadratic formula',
};

const NORMAL_NEXT: readonly PlannedActivity[] = [
  {
    activityId: 'math.im3.skill.2.1.solve-systems',
    activityKind: 'skill',
    label: 'Solve systems of equations',
  },
  {
    activityId: 'math.im3.skill.2.2.graph-linear',
    activityKind: 'skill',
    label: 'Graph linear functions',
  },
];

describe('planRemediationInjection — empty-injected baseline', () => {
  it('returns the next list unchanged when the injected list is empty', () => {
    const result = planRemediationInjection({
      nextActivities: NORMAL_NEXT,
      injectedActivities: [],
    });
    expect(result).toEqual(NORMAL_NEXT);
  });

  it('returns an empty list when both next and injected are empty', () => {
    const result = planRemediationInjection({
      nextActivities: [],
      injectedActivities: [],
    });
    expect(result).toEqual([]);
  });
});

describe('planRemediationInjection — prepending injection activities', () => {
  it('prepends a single injected activity to the front of the next list', () => {
    const result = planRemediationInjection({
      nextActivities: NORMAL_NEXT,
      injectedActivities: [SIGN_ERROR_REM_1],
    });
    expect(result[0]).toEqual(SIGN_ERROR_REM_1);
    expect(result).toHaveLength(NORMAL_NEXT.length + 1);
  });

  it('preserves the order of next activities (no shuffling)', () => {
    const result = planRemediationInjection({
      nextActivities: NORMAL_NEXT,
      injectedActivities: [SIGN_ERROR_REM_1],
    });
    expect(result.slice(1)).toEqual(NORMAL_NEXT);
  });

  it('preserves the order of multiple injected activities (T6 injects in registry order)', () => {
    const result = planRemediationInjection({
      nextActivities: NORMAL_NEXT,
      injectedActivities: [SIGN_ERROR_REM_1, SIGN_ERROR_REM_2, QUAD_FORMULA_REM],
    });
    expect(result.slice(0, 3)).toEqual([
      SIGN_ERROR_REM_1,
      SIGN_ERROR_REM_2,
      QUAD_FORMULA_REM,
    ]);
    expect(result.slice(3)).toEqual(NORMAL_NEXT);
    expect(result).toHaveLength(NORMAL_NEXT.length + 3);
  });

  it('returns only the injected activities when the next list is empty', () => {
    const result = planRemediationInjection({
      nextActivities: [],
      injectedActivities: [SIGN_ERROR_REM_1, QUAD_FORMULA_REM],
    });
    expect(result).toEqual([SIGN_ERROR_REM_1, QUAD_FORMULA_REM]);
  });
});

describe('planRemediationInjection — dedup policy (injected wins, ahead of next)', () => {
  it('removes a next-list activity whose activityId also appears in the injected list (injected copy wins at the front)', () => {
    const nextWithDup: readonly PlannedActivity[] = [
      SIGN_ERROR_REM_1,
      NORMAL_NEXT[0],
      NORMAL_NEXT[1],
    ];
    const result = planRemediationInjection({
      nextActivities: nextWithDup,
      injectedActivities: [SIGN_ERROR_REM_1],
    });
    expect(result).toEqual([SIGN_ERROR_REM_1, NORMAL_NEXT[0], NORMAL_NEXT[1]]);
    expect(result).toHaveLength(nextWithDup.length);
  });

  it('removes every duplicate activityId, keeping the front-injected copy', () => {
    const nextWithDups: readonly PlannedActivity[] = [
      SIGN_ERROR_REM_1,
      SIGN_ERROR_REM_2,
      QUAD_FORMULA_REM,
    ];
    const result = planRemediationInjection({
      nextActivities: nextWithDups,
      injectedActivities: [SIGN_ERROR_REM_1],
    });
    expect(result).toEqual([SIGN_ERROR_REM_1, SIGN_ERROR_REM_2, QUAD_FORMULA_REM]);
    expect(result).toHaveLength(3);
  });
});

describe('planRemediationInjection — purity', () => {
  it('does not mutate the input next-activities array or its elements', () => {
    const nextSnap = JSON.stringify(NORMAL_NEXT);
    planRemediationInjection({
      nextActivities: NORMAL_NEXT,
      injectedActivities: [SIGN_ERROR_REM_1],
    });
    expect(JSON.stringify(NORMAL_NEXT)).toBe(nextSnap);
  });

  it('does not mutate the input injected-activities array or its elements', () => {
    const injected: readonly PlannedActivity[] = [SIGN_ERROR_REM_1, SIGN_ERROR_REM_2];
    const injectedSnap = JSON.stringify(injected);
    planRemediationInjection({
      nextActivities: NORMAL_NEXT,
      injectedActivities: injected,
    });
    expect(JSON.stringify(injected)).toBe(injectedSnap);
  });
});

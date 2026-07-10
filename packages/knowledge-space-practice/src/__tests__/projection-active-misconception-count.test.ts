/**
 * Phase 4 (Track 6 misconception-loop_20260521) — Red direct unit test
 * for the active-misconception count field on student and teacher
 * visualization projections.
 *
 * Per spec FR5 + kst-srs.v2 §6.4, the student and teacher views must
 * expose an active-misconception count derived from the per-student
 * misconception lifecycle state. The student view's count is the
 * student's own active-misconception slug list length; the teacher
 * view's count is the number of distinct students in the class with
 * at least one active misconception (a teacher-relevant rollup of
 * "how many students are in remediation right now").
 *
 * Source under test (does NOT exist at HEAD; this is the Red signal):
 *
 *   - `studentVisualizationV1Schema` (in
 *     `packages/knowledge-space-practice/src/projections/schemas.ts`)
 *     must accept a new `activeMisconceptionCount: number` field.
 *   - `teacherVisualizationV1Schema` (same module) must accept a new
 *     `activeMisconceptionStudentCount: number` field.
 *   - `projectStudentVisualization` (in
 *     `packages/knowledge-space-practice/src/projections/visualization.ts`)
 *     must accept an `activeMisconceptionSlugs?: readonly string[]`
 *     arg and populate the count.
 *   - `projectTeacherVisualization` (same module) must accept a
 *     `perStudentActiveMisconceptions?: Record<string, readonly string[]>`
 *     arg and aggregate.
 *
 * Test approach: pure live-behavior — the projection functions and
 * their zod schemas are exercised with hand-rolled inputs. Each
 * assertion proves a runtime output value, not an artifact text.
 *
 * Failure mode: the new field is absent from the existing zod
 * schema, so `safeParse` returns `success: false` for the
 * output-as-typed; and the projection functions ignore the new
 * arg, so the count is always 0 (or the test types fail to compile
 * because the field doesn't exist on the return type).
 *
 * The `loose` casts and `(viz as any).newField` accesses are
 * deliberate: we want the runtime assertions to surface the missing
 * implementation rather than have TS compile errors mask the real
 * signal. The casts are no-ops at runtime (the field is genuinely
 * missing) and become removable in Green when the Implementer adds
 * the new fields.
 */

import { describe, expect, it } from 'vitest';

import { syntheticMathFixture } from '@reading-advantage/knowledge-space-core';

import {
  projectStudentVisualization,
  projectTeacherVisualization,
} from '../projections/visualization.js';

import {
  studentVisualizationV1Schema,
  teacherVisualizationV1Schema,
} from '../projections/schemas.js';

const NODES = syntheticMathFixture.nodes;
const EDGES = syntheticMathFixture.edges;

const LEARNER_STATE: Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'> = {
  'math.im3.skill.m1.l2.identify-roots': 'mastered',
  'math.im3.skill.m1.l2.solve-quadratic-by-factoring': 'ready',
};

type StudentVisualizationWithCount = ReturnType<typeof projectStudentVisualization> & {
  activeMisconceptionCount?: number;
};
type TeacherVisualizationWithCount = ReturnType<typeof projectTeacherVisualization> & {
  activeMisconceptionStudentCount?: number;
};

type StudentProjectionOptions = {
  activeMisconceptionSlugs?: readonly string[];
};
type TeacherProjectionOptions = {
  perStudentActiveMisconceptions?: Record<string, readonly string[]>;
};

const looseProjectStudentVisualization = projectStudentVisualization as unknown as (
  nodes: typeof NODES,
  edges: typeof EDGES,
  learnerState: typeof LEARNER_STATE,
  options?: StudentProjectionOptions,
) => StudentVisualizationWithCount;

const looseProjectTeacherVisualization = projectTeacherVisualization as unknown as (
  nodes: typeof NODES,
  edges: typeof EDGES,
  classStats?: Record<string, { mastered: number; total: number }>,
  options?: TeacherProjectionOptions,
) => TeacherVisualizationWithCount;

describe('Student projection — activeMisconceptionCount field (spec FR5)', () => {
  it('reports the supplied active-misconception slug list length', () => {
    const viz = looseProjectStudentVisualization(NODES, EDGES, LEARNER_STATE, {
      activeMisconceptionSlugs: [
        'sign-error-in-factored-form',
        'quadratic-formula-sign-flip',
      ],
    });
    expect(viz.activeMisconceptionCount).toBe(2);
  });

  it('reports zero when no active-misconception slugs are supplied', () => {
    const viz = looseProjectStudentVisualization(NODES, EDGES, LEARNER_STATE, {
      activeMisconceptionSlugs: [],
    });
    expect(viz.activeMisconceptionCount).toBe(0);
  });

  it('reports zero when the active-misconception arg is omitted (backward compat)', () => {
    const viz = looseProjectStudentVisualization(NODES, EDGES, LEARNER_STATE);
    expect(viz.activeMisconceptionCount).toBe(0);
  });

  it('counts each slug in the supplied list (no implicit dedup)', () => {
    const viz = looseProjectStudentVisualization(NODES, EDGES, LEARNER_STATE, {
      activeMisconceptionSlugs: [
        'sign-error-in-factored-form',
        'sign-error-in-factored-form',
        'quadratic-formula-sign-flip',
      ],
    });
    expect(viz.activeMisconceptionCount).toBe(3);
  });
});

describe('Student projection — schema accepts the new field', () => {
  it('parses an output that carries the new activeMisconceptionCount field', () => {
    const viz = looseProjectStudentVisualization(NODES, EDGES, LEARNER_STATE, {
      activeMisconceptionSlugs: ['sign-error-in-factored-form'],
    });
    const result = studentVisualizationV1Schema.safeParse(viz);
    expect(result.success).toBe(true);
  });
});

describe('Teacher projection — activeMisconceptionStudentCount field (spec FR5)', () => {
  const CLASS_STATS: Record<string, { mastered: number; total: number }> = {
    'math.im3.skill.m1.l2.solve-quadratic-by-factoring': { mastered: 12, total: 20 },
    'math.im3.skill.m1.l2.identify-roots': { mastered: 15, total: 20 },
  };

  it('counts the number of distinct students with at least one active misconception', () => {
    const viz = looseProjectTeacherVisualization(NODES, EDGES, CLASS_STATS, {
      perStudentActiveMisconceptions: {
        'student-a': ['sign-error-in-factored-form'],
        'student-b': ['quadratic-formula-sign-flip', 'vertex-y-as-solution'],
        'student-c': [],
        'student-d': ['inequality-direction-flip'],
      },
    });
    expect(viz.activeMisconceptionStudentCount).toBe(3);
  });

  it('reports zero when no per-student map is supplied (backward compat)', () => {
    const viz = looseProjectTeacherVisualization(NODES, EDGES, CLASS_STATS);
    expect(viz.activeMisconceptionStudentCount).toBe(0);
  });

  it('reports zero when the per-student map is empty', () => {
    const viz = looseProjectTeacherVisualization(NODES, EDGES, CLASS_STATS, {
      perStudentActiveMisconceptions: {},
    });
    expect(viz.activeMisconceptionStudentCount).toBe(0);
  });

  it('reports zero when every supplied student has an empty slug list', () => {
    const viz = looseProjectTeacherVisualization(NODES, EDGES, CLASS_STATS, {
      perStudentActiveMisconceptions: {
        'student-a': [],
        'student-b': [],
      },
    });
    expect(viz.activeMisconceptionStudentCount).toBe(0);
  });
});

describe('Teacher projection — schema accepts the new field', () => {
  it('parses an output that carries the new activeMisconceptionStudentCount field', () => {
    const viz = looseProjectTeacherVisualization(NODES, EDGES, undefined, {
      perStudentActiveMisconceptions: {
        'student-a': ['sign-error-in-factored-form'],
      },
    });
    const result = teacherVisualizationV1Schema.safeParse(viz);
    expect(result.success).toBe(true);
  });
});

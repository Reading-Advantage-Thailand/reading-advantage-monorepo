// Phase 1 (Track 6 misconception-loop_20260521) — misconception lifecycle
// types + severity accessor Red tests.
//
// kst-srs.v2 §9.3 + spec.md FR3: misconceptions transition between `active`
// and `resolved` based on N consecutive clean attempts on affected skills.
// spec.md FR2: the severity of a misconception is what determines whether
// `computeBaseRating` caps at `Hard` (default) or forces `Again` (severe).
//
// `test-strategy.md` §3 says: "Severity source of truth (Phase 1 ↔ Phase 2):
// severity must be readable from a single canonical place (node metadata or
// tag). Decide in Phase 1; Phase 2 must consume the same accessor." This file
// owns that decision for the Red phase. The Phase 2 truth-table test for
// `computeBaseRating` is the live-behavior proof; this Red file is the
// artifact (lifecycle types parse + accessor returns the right severity).
//
// Per `test-strategy.md` §4 + §6, the lifecycle surface lives in
// `packages/knowledge-space-practice/src/misconception-loop.ts` (the IM3
// smoke test already imports `@reading-advantage/knowledge-space-practice/
// misconception-loop` as the planned real T6 module path). The Green-phase
// deliverable for this file extends that planned module to export:
//   - type `MisconceptionSeverity` ('minor' | 'severe')
//   - type `MisconceptionLifecycleStatus` ('active' | 'resolved')
//   - type `StudentMisconceptionState` (domain-neutral state record)
//   - zod schemas: `misconceptionSeveritySchema`,
//     `misconceptionLifecycleStatusSchema`,
//     `studentMisconceptionStateSchema`
//   - function `getMisconceptionSeverity(metadata)` (canonical accessor)
//
// The accessor takes `metadata: Record<string, unknown>` (not a full
// `KnowledgeSpaceNode`) so it stays a pure function with no cross-package
// dependency — the caller passes the node's `metadata` field. The IM3
// misconception remediated_by registry can co-locate `severity` in the same
// metadata record it already authors.
//
// These tests are Red: each currently fails because the implementation does
// not yet include the severity/status enums, the state zod schema, or the
// canonical accessor. The cast escapes (`as never`, `as unknown as` for
// building out-of-surface records) are deliberate: we want the vitest runner
// to surface the runtime failures (zod parse / accessor result) rather than
// TS compile errors masking the real signal.

import { describe, it, expect } from 'vitest';

// We import the planned surface from its planned public path. Green phase
// will create that module; until then, this import fails module resolution
// and every test in this file fails loudly.
import {
  misconceptionSeveritySchema,
  misconceptionLifecycleStatusSchema,
  studentMisconceptionStateSchema,
  getMisconceptionSeverity,
  type MisconceptionSeverity,
  type StudentMisconceptionState,
} from '../misconception-loop.js';

// ---------------------------------------------------------------------------
// 1. MisconceptionSeverity enum — zod parse accept/reject
// ---------------------------------------------------------------------------

describe('zod — MisconceptionSeverity (kst-srs.v2 §9.1, spec FR2)', () => {
  it('accepts the closed severity set (minor, severe)', () => {
    for (const v of ['minor', 'severe'] as const) {
      const result = misconceptionSeveritySchema.safeParse(v);
      expect(result.success, `expected ${v} to parse`).toBe(true);
    }
  });

  it('rejects unknown / typo severity values (regression guard)', () => {
    for (const v of ['critical', 'low', 'SEVERE', '', 0, true, null, undefined]) {
      const result = misconceptionSeveritySchema.safeParse(v);
      expect(result.success, `expected ${JSON.stringify(v)} to reject`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. MisconceptionLifecycleStatus enum — zod parse accept/reject
// ---------------------------------------------------------------------------

describe('zod — MisconceptionLifecycleStatus (kst-srs.v2 §9.3, spec FR3)', () => {
  it('accepts the closed status set (active, resolved)', () => {
    for (const v of ['active', 'resolved'] as const) {
      const result = misconceptionLifecycleStatusSchema.safeParse(v);
      expect(result.success, `expected ${v} to parse`).toBe(true);
    }
  });

  it('rejects unknown / typo status values (regression guard)', () => {
    for (const v of ['pending', 'in_progress', 'ACTIVE', '', 1, false, null]) {
      const result = misconceptionLifecycleStatusSchema.safeParse(v);
      expect(result.success, `expected ${JSON.stringify(v)} to reject`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. StudentMisconceptionState — zod parse accept/reject
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<StudentMisconceptionState> = {}): StudentMisconceptionState {
  return {
    studentId: 'student.test',
    misconceptionId: 'math.im3.misconception.test',
    status: 'active',
    severity: 'minor',
    cleanStreak: 0,
    firstDetectedAt: 1_700_000_000_000,
    lastUpdatedAt: 1_700_000_000_000,
    affectedSkills: ['math.im3.skill.1.4.solve-quadratic-equations-by-factoring'],
    ...overrides,
  };
}

describe('zod — StudentMisconceptionState (spec FR3)', () => {
  it('parses a minimal valid active state', () => {
    const state = makeState();
    const result = studentMisconceptionStateSchema.safeParse(state);
    expect(result.success, result.success ? '' : result.error.message).toBe(true);
  });

  it('parses a resolved state with a non-zero cleanStreak', () => {
    const state = makeState({ status: 'resolved', cleanStreak: 3 });
    const result = studentMisconceptionStateSchema.safeParse(state);
    expect(result.success, result.success ? '' : result.error.message).toBe(true);
  });

  it('parses a severe misconception with affectedSkills as a multi-skill list', () => {
    const state = makeState({
      severity: 'severe',
      affectedSkills: [
        'math.im3.skill.1.1.graph-quadratic-functions',
        'math.im3.skill.1.2.solve-quadratic-equations-by-graphing',
      ],
    });
    const result = studentMisconceptionStateSchema.safeParse(state);
    expect(result.success, result.success ? '' : result.error.message).toBe(true);
  });

  it('rejects an unknown status value', () => {
    const state = { ...makeState(), status: 'pending' };
    const result = studentMisconceptionStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it('rejects an unknown severity value', () => {
    const state = { ...makeState(), severity: 'critical' };
    const result = studentMisconceptionStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it('rejects a negative cleanStreak', () => {
    const state = { ...makeState(), cleanStreak: -1 };
    const result = studentMisconceptionStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it('rejects a missing required field (studentId)', () => {
    const state = { ...makeState() } as Record<string, unknown>;
    delete state.studentId;
    const result = studentMisconceptionStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. getMisconceptionSeverity — canonical accessor
// ---------------------------------------------------------------------------

describe('getMisconceptionSeverity — canonical accessor (kst-srs.v2 §9.1, spec FR2, test-strategy §3)', () => {
  it('returns "severe" when metadata.severity === "severe"', () => {
    expect(getMisconceptionSeverity({ severity: 'severe' })).toBe<MisconceptionSeverity>('severe');
  });

  it('returns "minor" when metadata.severity === "minor"', () => {
    expect(getMisconceptionSeverity({ severity: 'minor' })).toBe<MisconceptionSeverity>('minor');
  });

  it('returns "minor" when metadata has no severity key (default)', () => {
    expect(getMisconceptionSeverity({ unrelatedKey: 'unrelated' })).toBe<MisconceptionSeverity>('minor');
  });

  it('returns "minor" when metadata is the empty record', () => {
    expect(getMisconceptionSeverity({})).toBe<MisconceptionSeverity>('minor');
  });

  it('coerces an unknown / typo severity metadata value to "minor" (closed-set guard)', () => {
    // The accessor MUST always return a valid MisconceptionSeverity — never
    // an unvalidated metadata value. Phase 2's computeBaseRating truth table
    // depends on this invariant.
    expect(getMisconceptionSeverity({ severity: 'critical' })).toBe<MisconceptionSeverity>('minor');
  });
});

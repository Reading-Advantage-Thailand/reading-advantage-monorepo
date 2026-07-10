// Adversarial tests — Teacher Audit View
// Track: transfer-credit-runtime_20260605
//
// Covers AD cases from test-strategy.md §2 (Phase 4 surface).
//
// Coverage map:
//   AD14 Empty-state shape  ............ covered in transfer-teacher-audit.test.ts
//                                       ('returns an empty view for an empty record list');
//                                       THIS file adds the no-undefined-fields
//                                       assertion for every audit-shape field.
//   AD15 Auditable fields completeness . covered in transfer-teacher-audit.test.ts
//                                       ('preserves all auditable fields on each row');
//                                       THIS file adds per-group totals correctness
//                                       when records span multiple students.

import { describe, it, expect } from 'vitest';
import { buildTransferCreditAuditView } from '../transfer-teacher-audit.js';
import type {
  TransferCreditAuditInputRecord,
  TransferCreditAuditView,
} from '../transfer-teacher-audit.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRecord(overrides?: Partial<TransferCreditAuditInputRecord>): TransferCreditAuditInputRecord {
  return {
    skillId: 'math.im3.skill.solve-quadratic',
    sourceCourse: 'math.im2',
    seededMastery: 0.72,
    skippedAt: 1_000_000,
    reversible: true,
    state: 'skipped',
    studentId: 'student-a',
    confirmed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AD14 — Empty-state shape has no undefined fields
// ---------------------------------------------------------------------------

describe('AD14 — empty-state view has well-defined fields (no undefined count rows)', () => {
  it('every counter field is 0 for the empty view (not undefined, not NaN)', () => {
    const view = buildTransferCreditAuditView([]);

    // The five auditable dimensions of the empty view must be 0, not
    // undefined and not NaN. A row with no records must never produce
    // a phantom "undefined" or "NaN" in any of the count fields.
    expect(view.groups).toEqual([]);
    expect(view.totalCredits).toBe(0);
    expect(view.skippedCount).toBe(0);
    expect(view.revertedCount).toBe(0);

    // Explicit type assertions so a future regression that returned
    // `undefined` from a missing branch is caught.
    const _typedView: TransferCreditAuditView = view;
    void _typedView;
    expect(typeof view.totalCredits).toBe('number');
    expect(typeof view.skippedCount).toBe('number');
    expect(typeof view.revertedCount).toBe('number');
    expect(Number.isNaN(view.totalCredits)).toBe(false);
    expect(Number.isNaN(view.skippedCount)).toBe(false);
    expect(Number.isNaN(view.revertedCount)).toBe(false);
  });

  it('does not mutate the input records array on empty input', () => {
    const records: TransferCreditAuditInputRecord[] = [];
    const snapshot = JSON.stringify(records);
    buildTransferCreditAuditView(records);
    expect(JSON.stringify(records)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// AD15 — Per-group totals when records span multiple students
// ---------------------------------------------------------------------------

describe('AD15 — per-group totals and group partitioning are exact (no miscounts)', () => {
  it('totals are exactly correct for a multi-student, multi-record fixture', () => {
    const records: TransferCreditAuditInputRecord[] = [
      // Student A: 2 skipped, 1 reverted
      makeRecord({ skillId: 'math.im3.skill.a1', state: 'skipped', skippedAt: 1_000_000, studentId: 'student-a' }),
      makeRecord({ skillId: 'math.im3.skill.a2', state: 'skipped', skippedAt: 2_000_000, studentId: 'student-a' }),
      makeRecord({ skillId: 'math.im3.skill.a3', state: 'reverted', skippedAt: 3_000_000, revertedAt: 4_000_000, studentId: 'student-a' }),
      // Student B: 1 skipped, 0 reverted
      makeRecord({ skillId: 'math.im3.skill.b1', state: 'skipped', skippedAt: 5_000_000, studentId: 'student-b' }),
      // Student C: 0 records (sanity — does not appear in groups)
    ];

    const view = buildTransferCreditAuditView(records);

    // Global totals
    expect(view.totalCredits).toBe(4); // 3 + 1 + 0
    expect(view.skippedCount).toBe(3); // 2 + 1 + 0
    expect(view.revertedCount).toBe(1); // 1 + 0 + 0

    // Two students → two groups (Student C never appears).
    expect(view.groups).toHaveLength(2);

    // Locate groups deterministically.
    const a = view.groups.find((g) => g.studentId === 'student-a')!;
    const b = view.groups.find((g) => g.studentId === 'student-b')!;

    // Student A group.
    expect(a.totalCredits).toBe(3);
    expect(a.skippedCount).toBe(2);
    expect(a.revertedCount).toBe(1);
    expect(a.rows).toHaveLength(3);
    // Sorted by skippedAt descending.
    expect(a.rows.map((r) => r.skippedAt)).toEqual([3_000_000, 2_000_000, 1_000_000]);

    // Student B group.
    expect(b.totalCredits).toBe(1);
    expect(b.skippedCount).toBe(1);
    expect(b.revertedCount).toBe(0);
    expect(b.rows).toHaveLength(1);
  });

  it('preserves all auditable fields on every row regardless of student partition', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ skillId: 'math.im3.skill.linear-functions', sourceCourse: 'math.precalc', seededMastery: 0.81, skippedAt: 1_000_000, state: 'skipped', confirmed: true, studentId: 'student-a' }),
      makeRecord({ skillId: 'math.im3.skill.factoring', sourceCourse: 'math.im1', seededMastery: 0.65, skippedAt: 2_000_000, state: 'reverted', revertedAt: 3_000_000, confirmed: false, studentId: 'student-b' }),
    ];

    const view = buildTransferCreditAuditView(records);

    for (const group of view.groups) {
      for (const row of group.rows) {
        // Each of the five auditable dimensions must be defined.
        expect(row.studentId).toBeDefined();
        expect(row.skillId).toBeDefined();
        expect(row.sourceCourse).toBeDefined();
        expect(typeof row.seededMastery).toBe('number');
        expect(typeof row.skippedAt).toBe('number');
        // The skipKind / state are explicit enums.
        expect(['skipped', 'reverted']).toContain(row.state);
        expect(['direct', 'confirmed']).toContain(row.skipKind);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases — boundary inputs
// ---------------------------------------------------------------------------

describe('buildTransferCreditAuditView — boundary inputs', () => {
  it('handles a record with skippedAt of 0 (epoch zero)', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ skillId: 'math.im3.skill.a', skippedAt: 0, studentId: 'student-a' }),
      makeRecord({ skillId: 'math.im3.skill.b', skippedAt: 1, studentId: 'student-a' }),
    ];

    const view = buildTransferCreditAuditView(records);
    // Most-recent-first: timestamp 1 then 0.
    expect(view.groups[0].rows.map((r) => r.skippedAt)).toEqual([1, 0]);
  });

  it('handles a record with confirmed=undefined (defaults to direct)', () => {
    // `confirmed` is optional. When undefined, the row must report
    // `skipKind: 'direct'`, not 'confirmed' or undefined.
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ confirmed: undefined, skillId: 'math.im3.skill.a' }),
    ];

    const view = buildTransferCreditAuditView(records);
    expect(view.groups[0].rows[0].skipKind).toBe('direct');
  });

  it('handles a record with confirmed=true (maps to confirmed)', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ confirmed: true, skillId: 'math.im3.skill.a' }),
    ];

    const view = buildTransferCreditAuditView(records);
    expect(view.groups[0].rows[0].skipKind).toBe('confirmed');
  });

  it('does not mutate the input records array or any record object', () => {
    const a = makeRecord({ skillId: 'math.im3.skill.a' });
    const b = makeRecord({ skillId: 'math.im3.skill.b', studentId: 'student-b' });
    const records = [a, b];

    const before = JSON.stringify(records);
    const beforeA = JSON.stringify(a);
    const beforeB = JSON.stringify(b);

    buildTransferCreditAuditView(records);

    expect(JSON.stringify(records)).toBe(before);
    expect(JSON.stringify(a)).toBe(beforeA);
    expect(JSON.stringify(b)).toBe(beforeB);
  });
});

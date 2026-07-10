import { describe, it, expect } from 'vitest';
import {
  buildTransferCreditAuditView,
} from '../transfer-teacher-audit.js';
import type {
  TransferCreditAuditRow,
  TransferCreditStudentGroup,
  TransferCreditAuditView,
  TransferCreditAuditInputRecord,
} from '../transfer-teacher-audit.js';

// ---------------------------------------------------------------------------
// Helpers
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
// Grouping & sorting
// ---------------------------------------------------------------------------

describe('buildTransferCreditAuditView', () => {
  it('groups records by studentId', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ skillId: 'math.im3.skill.a', skippedAt: 1_000_000 }),
      makeRecord({ skillId: 'math.im3.skill.b', skippedAt: 2_000_000 }),
    ];

    const view = buildTransferCreditAuditView(records);

    expect(view.groups).toHaveLength(1);
    expect(view.groups[0].studentId).toBe(records[0].studentId);
    expect(view.groups[0].rows).toHaveLength(2);
  });

  it('creates one group per student', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ skillId: 'math.im3.skill.a', skippedAt: 1_000_000 }),
      makeRecord({ skillId: 'math.im3.skill.b', skippedAt: 2_000_000, studentId: 'student-b' }),
    ];

    const view = buildTransferCreditAuditView(records);

    expect(view.groups).toHaveLength(2);
    const ids = view.groups.map((g) => g.studentId).sort();
    expect(ids).toEqual(['student-b', 'student-a'].sort());
  });

  it('sorts each group rows by skippedAt descending (most recent first)', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ skillId: 'math.im3.skill.a', skippedAt: 1_000_000 }),
      makeRecord({ skillId: 'math.im3.skill.b', skippedAt: 3_000_000 }),
      makeRecord({ skillId: 'math.im3.skill.c', skippedAt: 2_000_000 }),
    ];

    const view = buildTransferCreditAuditView(records);
    const timestamps = view.groups[0].rows.map((r) => r.skippedAt);

    expect(timestamps).toEqual([3_000_000, 2_000_000, 1_000_000]);
  });

  // ---------------------------------------------------------------------------
  // Auditable fields
  // ---------------------------------------------------------------------------

  it('preserves all auditable fields on each row', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({
        skillId: 'math.im3.skill.linear-functions',
        sourceCourse: 'math.im2',
        seededMastery: 0.81,
        skippedAt: 5_000_000,
        state: 'skipped',
        confirmed: true,
      }),
    ];

    const view = buildTransferCreditAuditView(records);
    const row = view.groups[0].rows[0];

    expect(row.studentId).toBe(records[0].studentId);
    expect(row.skillId).toBe('math.im3.skill.linear-functions');
    expect(row.sourceCourse).toBe('math.im2');
    expect(row.seededMastery).toBe(0.81);
    expect(row.skippedAt).toBe(5_000_000);
    expect(row.state).toBe('skipped');
    expect(row.skipKind).toBe('confirmed');
  });

  it('distinguishes direct skips from confirmation-check skips', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ skillId: 'math.im3.skill.a', confirmed: false }),
      makeRecord({ skillId: 'math.im3.skill.b', confirmed: true }),
    ];

    const view = buildTransferCreditAuditView(records);
    const kinds = view.groups[0].rows.map((r) => r.skipKind).sort();

    expect(kinds).toEqual(['confirmed', 'direct']);
  });

  it('surfaces reverted state for reversed skips', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ skillId: 'math.im3.skill.a', state: 'reverted', revertedAt: 9_000_000 }),
    ];

    const view = buildTransferCreditAuditView(records);
    const row = view.groups[0].rows[0];

    expect(row.state).toBe('reverted');
  });

  // ---------------------------------------------------------------------------
  // Totals
  // ---------------------------------------------------------------------------

  it('counts total, skipped, and reverted credits per group and globally', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ skillId: 'math.im3.skill.a', state: 'skipped', studentId: 's1' }),
      makeRecord({ skillId: 'math.im3.skill.b', state: 'reverted', studentId: 's1' }),
      makeRecord({ skillId: 'math.im3.skill.c', state: 'skipped', studentId: 's2' }),
    ];

    const view = buildTransferCreditAuditView(records);

    expect(view.totalCredits).toBe(3);
    expect(view.skippedCount).toBe(2);
    expect(view.revertedCount).toBe(1);

    const group1 = view.groups.find((g) => g.studentId === 's1')!;
    expect(group1.totalCredits).toBe(2);
    expect(group1.skippedCount).toBe(1);
    expect(group1.revertedCount).toBe(1);

    const group2 = view.groups.find((g) => g.studentId === 's2')!;
    expect(group2.totalCredits).toBe(1);
    expect(group2.skippedCount).toBe(1);
    expect(group2.revertedCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('returns an empty view for an empty record list', () => {
    const view = buildTransferCreditAuditView([]);

    expect(view.groups).toEqual([]);
    expect(view.totalCredits).toBe(0);
    expect(view.skippedCount).toBe(0);
    expect(view.revertedCount).toBe(0);
  });

  it('does not mutate the input records array or objects', () => {
    const records: TransferCreditAuditInputRecord[] = [
      makeRecord({ skillId: 'math.im3.skill.a' }),
    ];
    const snapshot = JSON.stringify(records);

    buildTransferCreditAuditView(records);

    expect(JSON.stringify(records)).toBe(snapshot);
  });
});

// ---------------------------------------------------------------------------
// Compile-time type assertions
// ---------------------------------------------------------------------------

function _typeChecks() {
  const _row: TransferCreditAuditRow | undefined = undefined;
  const _group: TransferCreditStudentGroup | undefined = undefined;
  const _view: TransferCreditAuditView | undefined = undefined;
  void _row;
  void _group;
  void _view;
}
void _typeChecks;

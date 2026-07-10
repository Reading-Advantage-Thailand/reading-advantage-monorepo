// Transfer teacher audit view — Phase 4 (FR6, AC5).
//
// Module surface:
//   - buildTransferCreditAuditView(records, students?, courses?)
//       → TransferCreditAuditView
//   - types: TransferCreditAuditRow, TransferCreditStudentGroup,
//            TransferCreditAuditView, TransferSkipKind,
//            TransferCreditAuditInputRecord
//
// Pure + domain-neutral: reuses `./transfer-skip` types and supplies a
// per-student grouped view with skip-kind and totals. No app, convex,
// curriculum, or srs-engine imports — boundary lint enforces it.
//
// The `students` and `courses` parameters are accepted as optional
// `ReadonlyMap`-shaped lookups so a future Convex-backed teacher view can
// pass through student/ course metadata for friendly labels without
// breaking the function signature. The current implementation does not
// dereference them — they are reserved for the persistence follow-up
// (deferred: the function is intentionally inert against missing maps).

import type { TransferSkipRecord } from './transfer-skip.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Distinguishes direct (one-click) skips from confirmation-check skips
 * (FR4 + FR5). The audit row carries this label so a teacher can scan
 * the table and tell at a glance which path the student took.
 */
export type TransferSkipKind = 'direct' | 'confirmed';

/**
 * A single auditable row in the teacher view. The fields mirror the
 * five auditable dimensions called out in the spec (FR6):
 *   - `studentId`         — who received the credit
 *   - `skillId`           — the target skill that was skipped
 *   - `sourceCourse`      — where the seeded mastery came from
 *   - `seededMastery`     — the discounted + capped mastery applied
 *   - `skippedAt`         — epoch-ms when the skip was granted
 *   - `state`             — 'skipped' or 'reverted' (per record)
 *   - `skipKind`          — direct-skip vs confirmation-check
 */
export interface TransferCreditAuditRow {
  /** Student id the row belongs to. */
  studentId: string;
  /** Target skill id the skip applies to. */
  skillId: string;
  /** Cross-course source label (e.g. `math.im2`). */
  sourceCourse: string;
  /** Discounted + capped mastery seeded by the FR2 pipeline. */
  seededMastery: number;
  /** Epoch-ms when the skip was granted. */
  skippedAt: number;
  /** Current state of the record. */
  state: TransferSkipRecord['state'];
  /** Direct-skip vs confirmation-check label. */
  skipKind: TransferSkipKind;
}

/**
 * Per-student grouping in the audit view. Rows are sorted by `skippedAt`
 * descending (most-recent first) so the teacher sees a chronological
 * timeline. `totalCredits`, `skippedCount`, and `revertedCount` mirror
 * the global totals at the group level.
 */
export interface TransferCreditStudentGroup {
  /** Student id the group belongs to. */
  studentId: string;
  /** Auditable rows, sorted by `skippedAt` descending. */
  rows: TransferCreditAuditRow[];
  /** Total count of rows in this group. */
  totalCredits: number;
  /** Count of rows in this group where `state === 'skipped'`. */
  skippedCount: number;
  /** Count of rows in this group where `state === 'reverted'`. */
  revertedCount: number;
}

/**
 * Top-level audit view. `groups` is a flat list of per-student groupings;
 * the three counters (`totalCredits`, `skippedCount`, `revertedCount`)
 * are aggregated across the entire record set.
 */
export interface TransferCreditAuditView {
  /** One group per distinct `studentId` in the input records. */
  groups: TransferCreditStudentGroup[];
  /** Total record count across all groups. */
  totalCredits: number;
  /** Records with `state === 'skipped'`. */
  skippedCount: number;
  /** Records with `state === 'reverted'`. */
  revertedCount: number;
}

/**
 * Input record shape expected by `buildTransferCreditAuditView`.
 *
 * `TransferSkipRecord` (from `./transfer-skip`) carries the skip metadata;
 * `studentId` and the optional `confirmed` flag are attached by the
 * caller (typically the Convex query seam in a follow-up track). `confirmed`
 * distinguishes direct-skip from confirmation-check paths.
 */
export type TransferCreditAuditInputRecord = TransferSkipRecord & {
  /** Student id the record belongs to. */
  studentId: string;
  /** `true` when the skip was granted via a confirmation check (FR5). */
  confirmed?: boolean;
};

/**
 * Optional student-lookup map. Reserved for the persistence follow-up so
 * the Convex query seam can pass through friendly student names without
 * forcing a signature change.
 */
export type TransferCreditStudentMap = ReadonlyMap<
  string,
  { studentId: string; studentName?: string; email?: string }
>;

/**
 * Optional course-lookup map. Reserved for the persistence follow-up so
 * the Convex query seam can pass through friendly course labels.
 */
export type TransferCreditCourseMap = ReadonlyMap<string, string>;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the teacher audit view from a list of transfer-skip records.
 *
 * The function:
 *   1. Buckets records by `studentId`.
 *   2. Sorts each bucket by `skippedAt` descending.
 *   3. Derives a `skipKind` from the record's `confirmed` flag
 *      (`true` → `'confirmed'`, otherwise `'direct'`).
 *   4. Computes `totalCredits`, `skippedCount`, `revertedCount` per
 *      group and globally.
 *
 * The `students` and `courses` parameters are accepted but not consulted
 * by the current implementation. They exist as forward-compatible
 * placeholders so a follow-up Convex seam can pass through friendly
 * names without forcing a signature change.
 *
 * Pure (AD13): the function does not mutate the input array or any of
 * the record objects.
 *
 * @param records - The list of transfer-skip records to render.
 * @param _students - Reserved. Optional student-lookup map.
 * @param _courses - Reserved. Optional course-lookup map.
 * @returns The grouped + sorted + counted audit view.
 */
export function buildTransferCreditAuditView(
  records: readonly TransferCreditAuditInputRecord[],
  _students?: TransferCreditStudentMap,
  _courses?: TransferCreditCourseMap,
): TransferCreditAuditView {
  // Group records by studentId. We do not mutate the input array; we
  // build a new array per group so the caller can keep its own copy.
  const buckets = new Map<string, TransferCreditAuditInputRecord[]>();
  for (const record of records) {
    const bucket = buckets.get(record.studentId);
    if (bucket) {
      bucket.push(record);
    } else {
      buckets.set(record.studentId, [record]);
    }
  }

  // Build per-student groups, sorted by skippedAt descending.
  const groups: TransferCreditStudentGroup[] = [];
  let totalCredits = 0;
  let skippedCount = 0;
  let revertedCount = 0;

  for (const [studentId, groupRecords] of buckets) {
    const rows: TransferCreditAuditRow[] = groupRecords
      .slice() // copy before sort — never mutate caller's array
      .sort((a, b) => b.skippedAt - a.skippedAt)
      .map((record) => ({
        studentId: record.studentId,
        skillId: record.skillId,
        sourceCourse: record.sourceCourse,
        seededMastery: record.seededMastery,
        skippedAt: record.skippedAt,
        state: record.state,
        skipKind: record.confirmed ? 'confirmed' : 'direct',
      }));

    let groupSkipped = 0;
    let groupReverted = 0;
    for (const record of groupRecords) {
      if (record.state === 'reverted') {
        groupReverted += 1;
      } else {
        groupSkipped += 1;
      }
    }

    const groupTotal = rows.length;
    totalCredits += groupTotal;
    skippedCount += groupSkipped;
    revertedCount += groupReverted;

    groups.push({
      studentId,
      rows,
      totalCredits: groupTotal,
      skippedCount: groupSkipped,
      revertedCount: groupReverted,
    });
  }

  return {
    groups,
    totalCredits,
    skippedCount,
    revertedCount,
  };
}

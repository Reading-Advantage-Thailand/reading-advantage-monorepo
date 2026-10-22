import type { PrimaryEvidenceJobPayload } from "@reading-advantage/domain/primary-mastery";

/** The quiz activity types whose `user_activity` rows give mastery evidence. */
export const QUIZ_ACTIVITY_TYPES = ["MC_QUESTION", "SA_QUESTION", "LA_QUESTION"] as const;

/** One source row of the evidence backfill: the job payload, the job tenant, and the practice time. */
export interface EvidenceSourceRow {
  payload: PrimaryEvidenceJobPayload;
  schoolId: string;
  occurredAt: Date;
}

/**
 * Turns the moved activities of lesson attempts into evidence source rows (track
 * primary_mastery_evidence_20261006, cutover 2 fault B). A lesson repeat moves the attempt's
 * `user_activity` rows into `primary_lesson_attempts.activities` and deletes them, so a backfill that
 * reads `user_activity` alone gives those quiz rows no job. The evidence loader reads a moved row by
 * its id, so the job keeps the `user_activity` source and the original row id; the tenant is the
 * attempt's school, which the loader checks against the job.
 * @param attempts The school and the `activities` value of each attempt.
 * @param liveIds The ids of the live `user_activity` quiz rows, which the backfill lists already.
 * @returns One row per moved quiz activity; elements without a string id or a valid time are left out.
 */
export function movedQuizSourceRows(attempts: ReadonlyArray<{ schoolId: string | null; activities: unknown }>, liveIds: ReadonlySet<string>): EvidenceSourceRow[] {
  const rows: EvidenceSourceRow[] = [];
  const seen = new Set<string>();
  for (const attempt of attempts) {
    if (!attempt.schoolId || !Array.isArray(attempt.activities)) continue;
    for (const element of attempt.activities) {
      const item = element as { id?: unknown; activityType?: unknown; createdAt?: unknown } | null;
      if (typeof item?.id !== "string" || !(QUIZ_ACTIVITY_TYPES as readonly unknown[]).includes(item.activityType)) continue;
      if (liveIds.has(item.id) || seen.has(item.id)) continue;
      // The same reading as the loader: a moved row keeps createdAt as the JSON string of its date.
      const occurredAt = item.createdAt instanceof Date ? item.createdAt : new Date(String(item.createdAt));
      if (Number.isNaN(occurredAt.getTime())) continue;
      seen.add(item.id);
      rows.push({ payload: { sourceTable: "user_activity", rowId: item.id }, schoolId: attempt.schoolId, occurredAt });
    }
  }
  return rows;
}

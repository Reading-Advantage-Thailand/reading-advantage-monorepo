import { z } from 'zod';

export const masterySnapshotSchema = z.object({
  timestamp: z.number().int().nonnegative(),
  masteredNodeIds: z.array(z.string().min(1)),
});

/**
 * Progress-trend history: non-empty, chronologically ordered, unique ids per snapshot.
 *
 * Contract: a valid history window must contain at least one snapshot (otherwise
 * there is no window to aggregate), every snapshot's `timestamp` must be ≥
 * the previous snapshot's `timestamp` so `progressTrend` can compute a
 * monotonic window delta, and each snapshot's `masteredNodeIds` must be
 * pairwise unique so per-snapshot mastery counts are well-defined.
 */
export const progressTrendHistorySchema = z.array(masterySnapshotSchema)
  .min(1, 'A progress-trend history must contain at least one snapshot')
  .superRefine((history, ctx) => {
    for (let i = 0; i < history.length; i++) {
      const snapshot = history[i]!;

      const seenIds = new Set<string>();
      for (let j = 0; j < snapshot.masteredNodeIds.length; j++) {
        const id = snapshot.masteredNodeIds[j]!;
        if (seenIds.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Snapshot at index ${i} has duplicate masteredNodeId "${id}" — ids must be unique within a snapshot`,
            path: [i, 'masteredNodeIds', j],
          });
          return;
        }
        seenIds.add(id);
      }

      if (i > 0) {
        const prev = history[i - 1]!;
        if (snapshot.timestamp < prev.timestamp) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Snapshot at index ${i} has timestamp ${snapshot.timestamp} which precedes the previous snapshot at index ${i - 1} with timestamp ${prev.timestamp} — history must be chronologically ordered (non-decreasing)`,
            path: [i, 'timestamp'],
          });
          return;
        }
      }
    }
  });

export type MasterySnapshot = z.infer<typeof masterySnapshotSchema>;
export type ProgressTrendHistory = z.infer<typeof progressTrendHistorySchema>;

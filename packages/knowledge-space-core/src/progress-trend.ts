import { z } from "zod";

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
export const progressTrendHistorySchema = z
  .array(masterySnapshotSchema)
  .min(1, "A progress-trend history must contain at least one snapshot")
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
            path: [i, "masteredNodeIds", j],
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
            path: [i, "timestamp"],
          });
          return;
        }
      }
    }
  });

export type MasterySnapshot = z.infer<typeof masterySnapshotSchema>;
export type ProgressTrendHistory = z.infer<typeof progressTrendHistorySchema>;

/** Progress label computed from the mastered-count delta in a time window. */
export type ProgressTrend = "improving" | "stable" | "declining" | "unknown";

/** Options controlling a deterministic progress-trend projection. */
export interface ComputeProgressTrendOptions {
  /** Inclusive end of the projection window as an epoch timestamp. */
  now: number;
  /** Width of the projection window in milliseconds. */
  windowMs: number;
  /** Symmetric absolute mastered-count delta required for a directional label. */
  trendThreshold: number;
}

/**
 * Computes a symmetric mastered-count trend over the requested history window.
 * @param history Chronological mastery snapshots to compare.
 * @param options Deterministic window and threshold configuration.
 * @returns The directional trend, or `unknown` when fewer than two snapshots qualify.
 * @throws When history or options violate their runtime contracts.
 */
export function computeProgressTrend(
  history: ProgressTrendHistory,
  options: ComputeProgressTrendOptions,
): ProgressTrend {
  const parsed = progressTrendHistorySchema.parse(history);
  const optionsSchema = z.object({
    now: z.number().int().nonnegative(),
    windowMs: z.number().positive(),
    trendThreshold: z.number().positive(),
  });
  const config = optionsSchema.parse(options);
  const windowStart = config.now - config.windowMs;
  const inWindow = parsed.filter(
    (snapshot) =>
      snapshot.timestamp >= windowStart && snapshot.timestamp <= config.now,
  );
  if (inWindow.length < 2) return "unknown";

  const delta =
    inWindow[inWindow.length - 1]!.masteredNodeIds.length -
    inWindow[0]!.masteredNodeIds.length;
  if (delta >= config.trendThreshold) return "improving";
  if (delta <= -config.trendThreshold) return "declining";
  return "stable";
}

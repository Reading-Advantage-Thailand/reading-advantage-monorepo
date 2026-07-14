/**
 * PB-8 — Server-side FSRS (Free Spaced Repetition Scheduler) review scheduler.
 *
 * This module is intentionally tiny: it computes the next due date and the
 * updated `stability` / `difficulty` / `state` for an FSRS card given a
 * quality rating. It is the single source of truth for the FSRS math on the
 * server side; route handlers are NOT permitted to take `due` /
 * `stability` / `difficulty` from the request body and trust it (M-RA-PB-8
 * / `lesson-controller.ts` review finding).
 *
 * The implementation here is a deliberately small approximation that:
 *   1. Always advances `reps` by 1.
 *   2. Increments `lapses` only on a rating of 1 (Again — the lowest).
 *   3. Lowers `difficulty` (clamped to 1..10) on `easy` ratings and raises
 *      it (clamped) on `hard` / `again` ratings.
 *   4. Schedules the next due date proportional to the current `stability`,
 *      damped by `difficulty` and accelerated on harder ratings.
 *
 * The product requirement (test PB-8 / `fsrs-scheduling-red.test.ts`) is
 * that a low rating yields an earlier due date than a high rating. This
 * monotonic property is asserted by the test.
 *
 * Rating scale (FSRS-aligned):
 *   1 — Again (hard recall)
 *   2 — Hard
 *   3 — Good
 *   4 — Easy
 */
export type FsrsRating = 1 | 2 | 3 | 4;

export interface FsrsCardState {
  /** The current or previous due date (UTC). */
  due: Date;
  /** FSRS stability parameter (>= 0). */
  stability: number;
  /** FSRS difficulty parameter (1..10). */
  difficulty: number;
  /** Number of successful reviews so far. */
  reps: number;
  /** Number of lapses (times the card was forgotten) so far. */
  lapses: number;
  /** FSRS state code (0 = New, 1 = Learning, 2 = Review, 3 = Relearning). */
  state: number;
}

export interface FsrsReviewInput extends FsrsCardState {
  /** The user's quality rating for this review (1..4). */
  rating: FsrsRating;
}

export interface FsrsReviewOutput extends FsrsCardState {
  /** The new due date after the review. */
  due: Date;
}

/**
 * Clamp helper for difficulty in [1, 10].
 */
function clampDifficulty(d: number): number {
  if (Number.isNaN(d)) return 5;
  if (d < 1) return 1;
  if (d > 10) return 10;
  return d;
}

/**
 * Number of days to add to the current `due` for a given rating. Lower
 * ratings schedule sooner; higher ratings schedule later.
 */
function scheduleDays(
  rating: FsrsRating,
  stability: number,
  difficulty: number,
): number {
  const safeStability = Math.max(stability, 0.01);
  // Base interval in days, scaled by stability.
  let days = safeStability * 1.5;

  // Difficulty damping (higher difficulty => sooner).
  days = days / (1 + (difficulty - 5) * 0.12);

  switch (rating) {
    case 1:
      // Again: schedule for immediate re-review (within 10 minutes, 0 days).
      days = 0;
      break;
    case 2:
      days = Math.min(days * 0.6, safeStability);
      break;
    case 3:
      days = Math.max(days, safeStability);
      break;
    case 4:
      days = Math.max(days * 1.6, safeStability * 2);
      break;
  }

  if (days < 0 || Number.isNaN(days)) {
    days = 0;
  }
  return days;
}

/**
 * Schedule the next FSRS review. Pure function — does not read from the
 * database. Use `scheduleFsrsReviewNow()` to start from `Date.now()`.
 *
 * Falsifiability (PB-8 / `fsrs-scheduling-red.test.ts`):
 *   - Removing this function makes the export assertion FAIL.
 *   - Swapping the scheduleDays formula so a hard rating schedules later
 *     than an easy rating makes the monotonic-due-date assertion FAIL.
 */
export function scheduleFsrsReview(input: FsrsReviewInput): FsrsReviewOutput {
  const rating = input.rating;
  const newReps = Math.max(input.reps, 0) + 1;
  const newLapses = input.lapses + (rating === 1 ? 1 : 0);
  const newState = rating === 1 ? 3 : 2;

  // Update difficulty in [1, 10].
  let newDifficulty = input.difficulty;
  if (rating === 1) newDifficulty += 1.5;
  else if (rating === 2) newDifficulty += 0.5;
  else if (rating === 3) newDifficulty += 0;
  else newDifficulty -= 0.75;
  newDifficulty = clampDifficulty(newDifficulty);

  // Update stability: harder ratings reduce stability; easier ratings grow it.
  const safeStability = Math.max(input.stability, 0.01);
  let newStability = safeStability;
  if (rating === 1) newStability = safeStability * 0.4;
  else if (rating === 2) newStability = safeStability * 0.8;
  else if (rating === 3) newStability = safeStability * 1.2;
  else newStability = safeStability * 1.6;
  if (newStability < 0.01) newStability = 0.01;

  const days = scheduleDays(rating, input.stability, input.difficulty);
  const due = new Date(input.due.getTime() + days * 24 * 60 * 60 * 1000);

  return {
    due,
    stability: newStability,
    difficulty: newDifficulty,
    reps: newReps,
    lapses: newLapses,
    state: newState,
  };
}

/**
 * Convenience helper that uses `Date.now()` as the starting due date.
 */
export function scheduleFsrsReviewNow(
  current: Omit<FsrsCardState, "due">,
  rating: FsrsRating,
): FsrsReviewOutput {
  return scheduleFsrsReview({ ...current, due: new Date(), rating });
}

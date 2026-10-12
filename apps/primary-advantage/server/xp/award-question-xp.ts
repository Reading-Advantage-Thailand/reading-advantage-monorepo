import {
  db,
  eq,
  and,
  or,
  isNull,
} from '@reading-advantage/db';
import {
  userActivity,
  users,
  xpLogs,
} from '@reading-advantage/db';
import { grantGpForXp } from "@reading-advantage/domain/primary-avatar";
import { calculateLevelAndCefrLevel } from "@/lib/utils";

/** A drizzle transaction of the app database, as passed to `db.transaction`. */
export type QuestionXpTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Input of `awardQuestionXp`: who answered what, with which details and award. */
export type AwardQuestionXpInput = {
  /** The student id. */
  userId: string;
  /** The school scope for the GP grant (null grants no GP). */
  schoolId: string | null;
  /** The activity type (an `ActivityType` value, article or `STORIES_*`). */
  activityType: string;
  /** The article or chapter id. */
  targetId: string;
  /** Seconds on the quiz, when measured. */
  timer?: number;
  /** The activity details (question, answers, score, feedback). */
  details: Record<string, unknown>;
  /** The XP award, derived server-side; the caller cannot set XP. */
  xpEarned: number;
  /**
   * Fresh details when the activity row already exists and is complete. A chapter MCQ
   * retake resubmit shows the new score through this path and pays no second XP.
   * When absent, an existing complete row is left as it is.
   */
  refreshDetails?: Record<string, unknown>;
};

/**
 * Saves one question answer and pays its XP in a single transaction: the activity row
 * (inserted once on the unique key of user, type, and target), the XP log, the GP grant,
 * and the user XP, level, and CEFR. A migrated `completed = false` row becomes complete.
 * An already complete row (a double click) stays as it is and pays no second XP; with
 * `refreshDetails` its details are refreshed (a chapter MCQ retake resubmit shows the new
 * score) still with no second XP.
 * @param tx The drizzle transaction.
 * @param input The user, the activity, the details, and the server-side award.
 * @returns The saved activity row id, `already-complete` for an existing complete row, or
 * null when the user is gone.
 */
export async function awardQuestionXp(
  tx: QuestionXpTx,
  input: AwardQuestionXpInput,
): Promise<{ status: "saved"; activityId: string } | { status: "already-complete" } | null> {
  const [userData] = await tx.select({ xp: users.xp })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!userData) return null;

  const [userActivityRow] = await tx.insert(userActivity).values({
    userId: input.userId,
    activityType: input.activityType,
    targetId: input.targetId,
    timer: input.timer,
    details: input.details,
    completed: true,
  }).onConflictDoUpdate({
    target: [userActivity.userId, userActivity.activityType, userActivity.targetId],
    set: { details: input.details, timer: input.timer, completed: true, updatedAt: new Date() },
    setWhere: or(eq(userActivity.completed, false), isNull(userActivity.completed)),
  }).returning();

  // Already complete (a double click): success, with no second XP log and no XP.
  if (!userActivityRow) {
    if (input.refreshDetails) {
      await tx.update(userActivity)
        .set({ details: input.refreshDetails, timer: input.timer, updatedAt: new Date() })
        .where(
          and(
            eq(userActivity.userId, input.userId),
            eq(userActivity.activityType, input.activityType),
            eq(userActivity.targetId, input.targetId),
          ),
        );
    }
    return { status: "already-complete" };
  }

  const { newXp, raLevel, cefrLevel } = calculateLevelAndCefrLevel(
    input.xpEarned,
    userData.xp as number,
  );

  await tx.insert(xpLogs).values({
    userId: input.userId,
    xpEarned: input.xpEarned,
    activityId: userActivityRow.id,
    activityType: input.activityType,
  });
  await grantGpForXp({ tx, schoolId: input.schoolId, userId: input.userId, sourceKey: `xp:${userActivityRow.id}`, activityType: input.activityType, xpEarned: input.xpEarned });

  await tx.update(users)
    .set({
      xp: newXp,
      level: raLevel,
      cefrLevel: cefrLevel,
    })
    .where(eq(users.id, input.userId));

  return { status: "saved", activityId: userActivityRow.id };
}

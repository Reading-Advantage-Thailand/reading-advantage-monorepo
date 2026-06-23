"use server";

import { currentUser } from "@/lib/session";
import {
  db,
  eq,
  and,
} from '@reading-advantage/db';
import {
  users,
  userActivity,
  articleActivityLogs,
  xpLogs,
} from '@reading-advantage/db';
import { ActivityType } from "@/types/enum";
import { calculateLevelAndCefrLevel } from "@/lib/utils";

export async function updateUserActivity(
  articleId: string,
  type: ActivityType,
  xpEarned: number,
  timer: number,
  data: {
    score?: number;
    details?: Record<string, any>;
  } = {},
) {
  const user = await currentUser();

  if (!user) {
    return { error: "User not found" };
  }

  const [userData] = await db.select({ xp: users.xp })
    .from(users)
    .where(eq(users.id, user.id as string))
    .limit(1);

  if (!userData) {
    return { error: "User not found" };
  }

  let isCompleted = {};

  // Create user activity first
  const [userActivityRow] = await db.insert(userActivity).values({
    userId: user.id as string,
    activityType: type,
    targetId: articleId,
    timer: timer,
    details: data,
    completed: true,
  }).returning();

  const { newXp, raLevel, cefrLevel } = calculateLevelAndCefrLevel(
    xpEarned,
    userData.xp as number,
  );

  const [activityLog] = await db.select({ id: articleActivityLogs.id })
    .from(articleActivityLogs)
    .where(
      and(
        eq(articleActivityLogs.articleId, articleId as string),
        eq(articleActivityLogs.userId, user.id as string),
      ),
    )
    .limit(1);

  if (activityLog) {
    await db.update(articleActivityLogs)
      .set({ ...isCompleted })
      .where(eq(articleActivityLogs.id, activityLog.id));
  } else {
    await db.insert(articleActivityLogs).values({
      articleId: articleId as string,
      userId: user.id as string,
      ...isCompleted,
    });
  }

  // Run the two writes in a Drizzle transaction (replaces Prisma $transaction([...]).
  await db.transaction(async (tx) => {
    await tx.insert(xpLogs).values({
      userId: user.id as string,
      xpEarned: xpEarned,
      activityId: userActivityRow.id,
      activityType: type,
    });

    await tx.update(users)
      .set({
        xp: newXp,
        level: raLevel,
        cefrLevel: cefrLevel,
      })
      .where(eq(users.id, user.id as string));
  });

  return { success: true };
}
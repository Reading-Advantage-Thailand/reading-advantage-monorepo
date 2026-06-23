"use server";

import { currentUser } from "@/lib/session";
import { db } from '@reading-advantage/db';
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

  const userData = await db.user.findUnique({
    where: { id: user.id as string },
    select: {
      xp: true,
    },
  });

  if (!userData) {
    return { error: "User not found" };
  }

  let isCompleted = {};

  // Create user activity first
  const userActivity = await db.userActivity.create({
    data: {
      userId: user.id as string,
      activityType: type,
      targetId: articleId,
      timer: timer,
      details: data,
      completed: true,
    },
  });

  const { newXp, raLevel, cefrLevel } = calculateLevelAndCefrLevel(
    xpEarned,
    userData.xp as number,
  );

  const activityLog = await db.articleActivityLog.findFirst({
    where: { articleId: articleId as string, userId: user.id as string },
    select: {
      id: true,
    },
  });

  if (activityLog) {
    await db.articleActivityLog.update({
      where: { id: activityLog.id },
      data: {
        ...isCompleted,
      },
    });
  } else {
    await db.articleActivityLog.create({
      data: {
        articleId: articleId as string,
        userId: user.id as string,
        ...isCompleted,
      },
    });
  }

  await db.$transaction([
    db.xPLogs.create({
      data: {
        userId: user.id as string,
        xpEarned: xpEarned,
        activityId: userActivity.id,
        activityType: type,
      },
    }),
    db.user.update({
      where: { id: user.id as string },
      data: {
        xp: newXp,
        level: raLevel,
        cefrLevel: cefrLevel,
      },
    }),
  ]);

  return { success: true };
}

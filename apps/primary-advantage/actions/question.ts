"use server";

import {
  db,
  eq,
  and,
} from '@reading-advantage/db';
import {
  userActivity,
  articleActivityLogs,
  xpLogs,
  users,
} from '@reading-advantage/db';
import { currentUser } from "@/lib/session";
import { calculateLevelAndCefrLevel } from "@/lib/utils";
import { getLaqFeedback, getSaqFeedback } from "@/server/utils/assistant";
import { ActivityType, UserXpEarned } from "@/types/enum";

export async function retakeQuiz(articleId: string, type: ActivityType) {
  try {
    const user = await currentUser();

    if (!user) {
      return { error: "User not found" };
    }

    const [userActivityRow] = await db.select({ id: userActivity.id })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.targetId, articleId),
          eq(userActivity.activityType, type),
          eq(userActivity.userId, user.id as string),
        ),
      )
      .limit(1);

    if (!userActivityRow) {
      return { error: "User activity not found" };
    }

    const deletedRows = await db.delete(userActivity)
      .where(eq(userActivity.id, userActivityRow.id))
      .returning();

    if (!deletedRows.length) {
      return { error: "Failed to delete user activity" };
    }

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to retake quiz" };
  }
}

export async function finishQuiz(
  articleId: string,
  data: {
    question?: string;
    suggestedAnswer?: string;
    feedback?: string;
    yourAnswer?: string;
    score?: number;
    responses?: string[];
    timer?: number;
  },
  type: ActivityType,
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

  let xpEarned = 0;
  let isCompleted = {};

  // Create user activity first
  const [userActivityRow] = await db.insert(userActivity).values({
    userId: user.id as string,
    activityType: type,
    targetId: articleId,
    timer: data.timer,
    details: {
      question: data.question,
      suggestedAnswer: data.suggestedAnswer,
      feedback: data.feedback as string,
      yourAnswer: data.yourAnswer,
      score: data.score,
      responses: data.responses,
    },
    completed: true,
  }).returning();

  // Calculate XP based on activity type
  switch (type) {
    case ActivityType.SA_QUESTION:
      xpEarned = data.score ?? 0;
      isCompleted = { isShortAnswerQuestionCompleted: true };
      break;
    case ActivityType.LA_QUESTION:
      xpEarned = data.score ?? 0;
      isCompleted = { isLongAnswerQuestionCompleted: true };
      break;
    case ActivityType.MC_QUESTION:
      xpEarned = data.score ?? 0 * UserXpEarned.MCQuestion;
      isCompleted = { isMultipleChoiceQuestionCompleted: true };
      break;
    default:
      xpEarned = 0;
  }

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

export async function getFeedback(value: {
  data: {
    articleId: string;
    question: string;
    answer: string;
    suggestedResponse?: string;
    preferredLanguage: string;
  };
  activityType: ActivityType;
}) {
  const user = await currentUser();

  if (!user) {
    return { error: "User not found" };
  }

  if (value.activityType === ActivityType.LA_QUESTION) {
    const feedback = await getLaqFeedback(value);
    return feedback;
  }

  if (value.activityType === ActivityType.SA_QUESTION) {
    const feedback = await getSaqFeedback(value);
    return feedback;
  }
}
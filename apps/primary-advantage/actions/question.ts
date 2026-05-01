"use server";

import { prisma } from "@/lib/prisma";
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

    const userActivity = await prisma.userActivity.findFirst({
      where: { targetId: articleId, activityType: type, userId: user.id },
      select: {
        id: true,
      },
    });

    if (!userActivity) {
      return { error: "User activity not found" };
    }

    const deleted = await prisma.userActivity.delete({
      where: { id: userActivity.id },
    });

    if (!deleted) {
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

  const userData = await prisma.user.findUnique({
    where: { id: user.id as string },
    select: {
      xp: true,
    },
  });

  if (!userData) {
    return { error: "User not found" };
  }

  let xpEarned = 0;
  let isCompleted = {};

  // Create user activity first
  const userActivity = await prisma.userActivity.create({
    data: {
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
    },
  });

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

  const activityLog = await prisma.articleActivityLog.findFirst({
    where: { articleId: articleId as string, userId: user.id as string },
    select: {
      id: true,
    },
  });

  if (activityLog) {
    await prisma.articleActivityLog.update({
      where: { id: activityLog.id },
      data: {
        ...isCompleted,
      },
    });
  } else {
    await prisma.articleActivityLog.create({
      data: {
        articleId: articleId as string,
        userId: user.id as string,
        ...isCompleted,
      },
    });
  }

  await prisma.$transaction([
    prisma.xPLogs.create({
      data: {
        userId: user.id as string,
        xpEarned: xpEarned,
        activityId: userActivity.id,
        activityType: type,
      },
    }),
    prisma.user.update({
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

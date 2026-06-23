"use server";

import {
  generateAllArticle,
  generateAllArticleNew,
} from "@/server/controllers/articleController";
import {
  deleteArticleByIdModel,
  getArticleActivity,
} from "@/server/models/articleModel";
import {
  db,
  eq,
  and,
  desc,
  inArray,
} from '@reading-advantage/db';
import {
  userActivity,
  xpLogs,
} from '@reading-advantage/db';
import { currentUser } from "@/lib/session";
import { ActivityType } from "@/types/enum";

export async function generateArticle(amountPerGenre: number) {
  const result = await generateAllArticle(amountPerGenre);
  return result;
}

export async function generateArticleNew(amountPerGenre: number) {
  const result = await generateAllArticleNew(amountPerGenre);
  return result;
}

export async function getDeleteArticleById(articleId: string) {
  return await deleteArticleByIdModel(articleId);
}

export async function fetchArticleActivity(articleId: string) {
  try {
    const result = await getArticleActivity(articleId);

    if (!result.success) {
      return { error: "Article activity not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error tracking article access:", error);
    return { error: "Failed to track article access" };
  }
}

export async function getLessonSummaryData(articleId: string) {
  try {
    const user = await currentUser();

    if (!user) {
      return { error: "User not found" };
    }

    // Fetch user activities for this article (replace Prisma `include: { xpLogs: true }`
    // by stitching xpLogs per activity in memory below).
    const activities = await db.select().from(userActivity)
      .where(
        and(
          eq(userActivity.userId, user.id as string),
          eq(userActivity.targetId, articleId),
          inArray(userActivity.activityType, [
            ActivityType.MC_QUESTION,
            ActivityType.SA_QUESTION,
            ActivityType.LA_QUESTION,
            ActivityType.VOCABULARY_FLASHCARDS,
            ActivityType.SENTENCE_FLASHCARDS,
            ActivityType.VOCABULARY_MATCHING,
            ActivityType.SENTENCE_MATCHING,
            ActivityType.SENTENCE_CLOZE_TEST,
            ActivityType.SENTENCE_ORDERING,
          ]),
          eq(userActivity.completed, true),
        ),
      )
      .orderBy(desc(userActivity.createdAt));

    // Calculate quiz scores
    let mcqScore = 0;
    let saqScore = 0;

    // Get the latest MCQ activity
    const mcqActivity = activities.find(
      (activity) => activity.activityType === ActivityType.MC_QUESTION,
    );
    if (mcqActivity?.details && typeof mcqActivity.details === "object") {
      const details = mcqActivity.details as { score?: number };
      mcqScore = details.score || 0;
    }

    // Get the latest SAQ activity
    const saqActivity = activities.find(
      (activity) => activity.activityType === ActivityType.SA_QUESTION,
    );
    if (saqActivity?.details && typeof saqActivity.details === "object") {
      const details = saqActivity.details as { score?: number };
      saqScore = details.score || 0;
    }

    // Fetch xpLogs for those activities (replaces Prisma's nested `include`).
    const xpLogsRows = await db.select().from(xpLogs)
      .where(
        and(
          eq(xpLogs.userId, user.id as string),
          inArray(
            xpLogs.activityId,
            activities.map((activity) => activity.id),
          ),
        ),
      );

    const totalXp = xpLogsRows.reduce((sum, log) => sum + log.xpEarned, 0);

    return {
      success: true,
      data: {
        totalXp,
        quizScores: {
          mcqScore,
          saqScore,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching lesson summary data:", error);
    return { error: "Failed to fetch lesson summary data" };
  }
}
"use server";

import {
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
import { createTenantDB } from "@reading-advantage/domain";
import { getLessonGameResults } from "@reading-advantage/domain/games";
import { currentUser } from "@/lib/session";
import { logger } from "@/lib/observability/logger";
import { guardStudentAction } from "@/lib/student-view";
import { ActivityType } from "@/types/enum";

/**
 * Tracks one article access for the signed-in user.
 * @param articleId The article identifier.
 * @returns The tracking result.
 */
export async function fetchArticleActivity(articleId: string) {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const preview = guardStudentAction(user, "fetch_article_activity");
  if (preview) return preview;
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

    // A lesson game run saves in `game_completions`, not in `user_activity`: add its XP here.
    let gameXp = 0;
    try {
      const tenant = { schoolId: user.schoolId };
      gameXp = (await getLessonGameResults({ db: createTenantDB(db, tenant), user, tenant, input: { articleId } })).totalXp;
    } catch (error) {
      logger.error("lesson_summary_game_xp_failed", { error, userId: user.id, articleId });
    }
    const totalXp = xpLogsRows.reduce((sum, log) => sum + log.xpEarned, 0) + gameXp;

    return {
      success: true,
      data: {
        totalXp,
        gameXp,
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
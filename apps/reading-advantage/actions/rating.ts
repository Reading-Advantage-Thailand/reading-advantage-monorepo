"use server";

import { db, and, eq } from "@reading-advantage/db";
import { userActivity, xpLogs } from "@reading-advantage/db/schema";
import { ActivityType } from "@/lib/enums";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";

export async function submitRating(userId: string, articleId: string, rating: number, article: any) {
  // Reject unauthenticated callers — server actions must enforce a real session.
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return { success: false, error: "Unauthorized", xpEarned: 0 };
  }

  // The session user must match the supplied userId to prevent arbitrary
  // XP/rating writes to other users' accounts.
  if (sessionUser.id !== userId) {
    return { success: false, error: "Forbidden - cannot rate for another user", xpEarned: 0 };
  }

  // Check if user has already rated
  const [oldRatingActivity] = await db
    .select({ details: userActivity.details })
    .from(userActivity)
    .where(
      and(
        eq(userActivity.userId, userId),
        eq(userActivity.activityType, "ARTICLE_RATING"),
        eq(userActivity.targetId, articleId)
      )
    )
    .limit(1);

  const hasOldRating = (oldRatingActivity?.details as any)?.rating > 0;

  if (!hasOldRating) {
    // Create rating activity
    await db.insert(userActivity).values({
      userId,
      activityType: ActivityType.ARTICLE_RATING,
      targetId: articleId,
      completed: true,
      details: {
        title: article.title,
        raLevel: article.ra_level,
        cefr_level: article.cefr_level,
        rating,
      },
    });

    // Create XP log for rating
    await db.insert(xpLogs).values({
      userId,
      xpEarned: 10,
      activityId: articleId,
      activityType: ActivityType.ARTICLE_RATING,
    });

    // Create read activity
    await db.insert(userActivity).values({
      userId,
      activityType: ActivityType.ARTICLE_READ,
      targetId: articleId,
      completed: true,
      details: {
        title: article.title,
        level: article.ra_level,
        cefr_level: article.cefr_level,
        type: article.type,
        genre: article.genre,
        subgenre: article.subgenre,
      },
    });

    // Revalidate the path to update average rating
    revalidatePath(`/[locale]/student/read/${articleId}`);

    const averageRating = await computeAverageRating(articleId);

    return { success: true, xpEarned: 10, averageRating };
  } else {
    // Update existing rating
    if (!oldRatingActivity) {
      throw new Error("Rating activity not found");
    }
    await db
      .update(userActivity)
      .set({
        details: {
          ...(oldRatingActivity.details as object || {}),
          rating,
        },
      })
      .where(
        and(
          eq(userActivity.userId, userId),
          eq(userActivity.activityType, ActivityType.ARTICLE_RATING),
          eq(userActivity.targetId, articleId)
        )
      );

    const averageRating = await computeAverageRating(articleId);

    return { success: true, xpEarned: 0, averageRating };
  }
}

/**
 * Recomputes the article average from every stored article rating.
 * @param articleId The rated article id.
 * @returns The mean of all positive ratings, or 0 when none exist.
 */
async function computeAverageRating(articleId: string): Promise<number> {
  const rows = await db
    .select({ details: userActivity.details })
    .from(userActivity)
    .where(
      and(
        eq(userActivity.targetId, articleId),
        eq(userActivity.activityType, ActivityType.ARTICLE_RATING)
      )
    );

  const ratings = rows
    .map((row) => (row.details as { rating?: unknown } | null)?.rating)
    .filter(
      (rating): rating is number =>
        typeof rating === "number" && rating > 0
    );

  if (ratings.length === 0) return 0;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}
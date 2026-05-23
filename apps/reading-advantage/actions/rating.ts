"use server";

import { db, and, eq } from "@reading-advantage/db";
import { userActivity, xpLogs } from "@reading-advantage/db/schema";
import { ActivityType } from "@/lib/enums";
import { revalidatePath } from "next/cache";

export async function submitRating(userId: string, articleId: string, rating: number, article: any) {
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

    return { xpEarned: 10 };
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

    return { xpEarned: 0 };
  }
}
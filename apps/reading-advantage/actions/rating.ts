"use server";

import { prisma } from "@/lib/prisma";
import { ActivityType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function submitRating(userId: string, articleId: string, rating: number, article: any) {
  // Check if user has already rated
  const oldRatingActivity = await prisma.userActivity.findUnique({
    where: {
      userId_activityType_targetId: {
        userId,
        activityType: "ARTICLE_RATING",
        targetId: articleId,
      },
    },
    select: { details: true },
  });

  const hasOldRating = (oldRatingActivity?.details as any)?.rating > 0;

  if (!hasOldRating) {
    // Create rating activity
    await prisma.userActivity.create({
      data: {
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
      },
    });

    // Create XP log for rating
    await prisma.xPLog.create({
      data: {
        userId,
        xpEarned: 10,
        activityId: articleId,
        activityType: ActivityType.ARTICLE_RATING,
      },
    });

    // Create read activity
    await prisma.userActivity.create({
      data: {
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
    await prisma.userActivity.update({
      where: {
        userId_activityType_targetId: {
          userId,
          activityType: ActivityType.ARTICLE_RATING,
          targetId: articleId,
        },
      },
      data: {
        details: {
          ...(oldRatingActivity.details as object || {}),
          rating,
        },
      },
    });

    return { xpEarned: 0 };
  }
}
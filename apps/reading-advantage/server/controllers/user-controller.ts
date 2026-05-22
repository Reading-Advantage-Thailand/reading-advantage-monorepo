import { levelCalculation } from "@/lib/utils";
import { ExtendedNextRequest, assertSelfOrAllowedStaff } from "./auth-controller";
import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, inArray, desc, asc, gte, lte, isNotNull, sql } from "@reading-advantage/db";
import {
  users,
  userActivity,
  xpLogs,
  articles,
  lessonRecords,
  userWordRecords,
  userSentenceRecords,
  storyRecords,
  classroomStudents,
  licenses,
  licenseOnUsers,
} from "@reading-advantage/db/schema";
import { ActivityType, LicenseType } from "@/lib/enums";

async function getUserLicenseLevel(userId: string): Promise<LicenseType> {
  try {
    const [user] = await db
      .select({ licenseId: users.licenseId, expiredDate: users.expiredDate })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return LicenseType.BASIC;
    }

    if (user.licenseId) {
      const [license] = await db
        .select({ licenseType: licenses.licenseType })
        .from(licenses)
        .where(eq(licenses.id, user.licenseId))
        .limit(1);
      return (license?.licenseType as LicenseType) || LicenseType.BASIC;
    }

    if (!user.expiredDate) {
      return LicenseType.ENTERPRISE;
    }

    const now = new Date();
    if (user.expiredDate > now) {
      return LicenseType.ENTERPRISE;
    } else {
      return LicenseType.BASIC;
    }
  } catch (error) {
    console.error("Error getting user license level:", error);
    return LicenseType.BASIC;
  }
}

interface RequestContext {
  params: Promise<{
    id: string;
  }>;
}

export async function getUser(req: ExtendedNextRequest, ctx: RequestContext) {
  try {
    const { id: routeId } = await ctx.params;

    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const licenseLevel = await getUserLicenseLevel(id);

    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
        cefr_level: user.cefrLevel,
        display_name: user.name,
        expired_date: user.expiredDate,
        license_id: user.licenseId,
        license_level: licenseLevel,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error getting user", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function updateUser(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  try {
    const { id: routeId } = await ctx.params;

    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;
    const data = await req.json();

    const [user] = await db
      .update(users)
      .set({
        name: data.name,
        email: data.email,
        role: data.role,
        xp: data.xp,
        level: data.level,
        cefrLevel: data.cefr_level,
        expiredDate: data.expired_date,
        licenseId: data.license_id,
      })
      .where(eq(users.id, id))
      .returning();

    if (data.resetXP) {
      await db.transaction(async (tx) => {
        await tx.delete(lessonRecords).where(eq(lessonRecords.userId, id));
        await tx.delete(userActivity).where(eq(userActivity.userId, id));
        await tx.delete(xpLogs).where(eq(xpLogs.userId, id));
        await tx.delete(userWordRecords).where(eq(userWordRecords.userId, id));
        await tx.delete(userSentenceRecords).where(eq(userSentenceRecords.userId, id));
      });
    }

    return NextResponse.json({
      data: user,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function postActivityLog(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  try {
    const { id: routeId } = await ctx.params;

    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;

    const data = await req.json();

    const activityType = data.activityType.toUpperCase() as ActivityType;

    if (!Object.values(ActivityType).includes(activityType)) {
      console.error("Invalid activity type:", activityType);
      return NextResponse.json({
        message: "Invalid activity type",
        status: 400,
      });
    }

    const targetId = data.articleId || data.storyId || data.contentId || "";

    let finalTargetId = targetId;
    if (!finalTargetId && data.details?.articleId) {
      finalTargetId = data.details.articleId;
    }

    if (
      activityType === ActivityType.ARTICLE_RATING &&
      finalTargetId &&
      (finalTargetId.startsWith("cmesn") || finalTargetId.startsWith("cmeu"))
    ) {
      if (data.details?.articleId) {
        finalTargetId = data.details.articleId;
      } else if (data.articleId) {
        finalTargetId = data.articleId;
      }
    }

    let articleMetadata = {};
    if (
      data.articleId &&
      (activityType === ActivityType.ARTICLE_READ ||
        activityType === ActivityType.ARTICLE_RATING)
    ) {
      const [article] = await db
        .select({
          type: articles.type,
          genre: articles.genre,
          subGenre: articles.subGenre,
          title: articles.title,
          cefrLevel: articles.cefrLevel,
          raLevel: articles.raLevel,
        })
        .from(articles)
        .where(eq(articles.id, data.articleId))
        .limit(1);

      if (article) {
        articleMetadata = {
          type: article.type,
          genre: article.genre,
          subgenre: article.subGenre,
          title: article.title,
          cefr_level: article.cefrLevel,
          level: article.raLevel,
        };
      }
    }

    const [existingActivity] = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, id),
          eq(userActivity.activityType, activityType),
          eq(userActivity.targetId, finalTargetId),
        )
      )
      .limit(1);

    const commonData = {
      userId: id,
      activityType: activityType,
      targetId: finalTargetId,
      timer: data.timeTaken || 0,
      details: {
        ...articleMetadata,
        ...data.details,
      },
      completed: data.completed || data.activityStatus === "completed",
    };

    let activity;

    if (!existingActivity) {
      [activity] = await db.insert(userActivity).values(commonData).returning();
    } else if (data.activityStatus === "completed" || data.completed) {
      [activity] = await db
        .update(userActivity)
        .set({ ...commonData, updatedAt: new Date() })
        .where(eq(userActivity.id, existingActivity.id))
        .returning();
    } else {
      activity = existingActivity;
    }

    let hasExistingXpLog = false;
    if (existingActivity) {
      const [existingXpLog] = await db
        .select()
        .from(xpLogs)
        .where(eq(xpLogs.activityId, existingActivity.id))
        .limit(1);
      hasExistingXpLog = !!existingXpLog;
    }

    if (
      !hasExistingXpLog &&
      ((data.xpEarned && data.xpEarned > 0) ||
        (data.isInitialLevelTest && typeof data.xpEarned === "number"))
    ) {
      await db.insert(xpLogs).values({
        userId: id,
        xpEarned: data.xpEarned,
        activityId: activity!.id,
        activityType: activityType,
      });

      const [currentUser] = await db
        .select({ xp: users.xp, level: users.level, cefrLevel: users.cefrLevel })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      const finalXp = data.isInitialLevelTest
        ? data.xpEarned
        : (currentUser?.xp || 0) + data.xpEarned;

      const levelData = levelCalculation(finalXp);

      await db
        .update(users)
        .set({
          xp: finalXp,
          level:
            typeof levelData.raLevel === "number"
              ? levelData.raLevel
              : parseInt(String(levelData.raLevel)),
          cefrLevel: levelData.cefrLevel,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));
    }

    return NextResponse.json({
      message: "Success",
      status: 200,
    });
  } catch (error) {
    console.error("postActivity => ", error);
    return NextResponse.json({
      message: "Error",
      status: 500,
    });
  }
}

export async function putActivityLog(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  try {
    const { id: routeId } = await ctx.params;

    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;
    const data = await req.json();

    const activityType = data.activityType.toUpperCase() as ActivityType;

    if (!Object.values(ActivityType).includes(activityType)) {
      return NextResponse.json({
        message: "Invalid activity type",
        status: 400,
      });
    }

    const targetId = data.articleId || data.storyId || data.contentId || "";

    let finalTargetId = targetId;
    if (!finalTargetId && data.details?.articleId) {
      finalTargetId = data.details.articleId;
    }

    if (
      activityType === ActivityType.ARTICLE_RATING &&
      finalTargetId &&
      (finalTargetId.startsWith("cmesn") || finalTargetId.startsWith("cmeu"))
    ) {
      if (data.details?.articleId) {
        finalTargetId = data.details.articleId;
      } else if (data.articleId) {
        finalTargetId = data.articleId;
      }
    }

    if (!finalTargetId) {
      return NextResponse.json({
        message: "Target ID is required for update",
        status: 400,
      });
    }

    let articleMetadata = {};
    if (
      data.articleId &&
      (activityType === ActivityType.ARTICLE_READ ||
        activityType === ActivityType.ARTICLE_RATING)
    ) {
      const [article] = await db
        .select({
          type: articles.type,
          genre: articles.genre,
          subGenre: articles.subGenre,
          title: articles.title,
          cefrLevel: articles.cefrLevel,
          raLevel: articles.raLevel,
        })
        .from(articles)
        .where(eq(articles.id, data.articleId))
        .limit(1);

      if (article) {
        articleMetadata = {
          type: article.type,
          genre: article.genre,
          subgenre: article.subGenre,
          title: article.title,
          cefr_level: article.cefrLevel,
          level: article.raLevel,
        };
      }
    }

    const [existingActivity] = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, id),
          eq(userActivity.activityType, activityType),
          eq(userActivity.targetId, finalTargetId),
        )
      )
      .limit(1);

    const commonData = {
      userId: id,
      activityType: activityType,
      targetId: finalTargetId,
      timer: data.timeTaken || 0,
      details: {
        ...articleMetadata,
        ...data.details,
      },
      completed: data.activityStatus === "completed",
    };

    let activity;

    if (!existingActivity) {
      [activity] = await db.insert(userActivity).values(commonData).returning();
    } else {
      [activity] = await db
        .update(userActivity)
        .set({ ...commonData, updatedAt: new Date() })
        .where(eq(userActivity.id, existingActivity.id))
        .returning();
    }

    let hasExistingXpLog = false;
    if (existingActivity) {
      const [existingXpLog] = await db
        .select()
        .from(xpLogs)
        .where(eq(xpLogs.activityId, existingActivity.id))
        .limit(1);
      hasExistingXpLog = !!existingXpLog;
    }

    if (!hasExistingXpLog && data.xpEarned && data.xpEarned > 0) {
      await db.insert(xpLogs).values({
        userId: id,
        xpEarned: data.xpEarned,
        activityId: activity!.id,
        activityType: activityType,
      });

      const currentUser = req.session?.user;
      const finalXp = (currentUser?.xp || 0) + data.xpEarned;
      const levelData = levelCalculation(finalXp);

      await db
        .update(users)
        .set({
          xp: finalXp,
          level:
            typeof levelData.raLevel === "number"
              ? levelData.raLevel
              : parseInt(String(levelData.raLevel)),
          cefrLevel: levelData.cefrLevel,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));
    }

    return NextResponse.json({
      message: "Activity log processed successfully",
      status: 200,
    });
  } catch (error) {
    console.error("putActivityLog => ", error);
    return NextResponse.json({
      message: "Error processing activity log",
      status: 500,
    });
  }
}

export async function getActivityLog(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  const { id: routeId } = await ctx.params;

  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;

  try {
    const [user] = await db
      .select({ xp: users.xp, level: users.level })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    const articleId = req.nextUrl.searchParams.get("articleId");
    const activityTypeParam = req.nextUrl.searchParams.get("activityType");
    const isFiltered = !!(articleId || activityTypeParam);

    const conditions = [eq(userActivity.userId, id)];
    if (articleId) conditions.push(eq(userActivity.targetId, articleId));
    if (activityTypeParam) conditions.push(eq(userActivity.activityType, activityTypeParam.toUpperCase()));

    const activities = await db
      .select()
      .from(userActivity)
      .where(and(...conditions))
      .orderBy(asc(userActivity.createdAt));

    const xpWhereConditions = [eq(xpLogs.userId, id)];
    if (isFiltered) {
      const activityIds = activities.map((a) => a.id);
      if (activityIds.length > 0) {
        xpWhereConditions.push(inArray(xpLogs.activityId, activityIds));
      }
    }

    const allXpLogs = await db
      .select()
      .from(xpLogs)
      .where(and(...xpWhereConditions))
      .orderBy(asc(xpLogs.createdAt));

    const xpLogMap = new Map(allXpLogs.map((log) => [log.activityId, log]));

    const articleIds = activities.map((activity) => activity.targetId).filter((id) => id) as string[];

    const articleRows = articleIds.length > 0
      ? await db
          .select({
            id: articles.id,
            title: articles.title,
            type: articles.type,
            genre: articles.genre,
            subGenre: articles.subGenre,
            cefrLevel: articles.cefrLevel,
            raLevel: articles.raLevel,
          })
          .from(articles)
          .where(inArray(articles.id, articleIds))
      : [];

    const articleMap = new Map(articleRows.map((article) => [article.id, article]));

    let cumulativeXp = 0;
    const xpProgressionMap = new Map();

    allXpLogs.forEach((xpLog) => {
      if (!isFiltered) {
        cumulativeXp += xpLog.xpEarned || 0;
      }
      if (xpLog.activityId) {
        xpProgressionMap.set(xpLog.activityId, {
          xpEarned: xpLog.xpEarned || 0,
          cumulativeXp: isFiltered ? 0 : cumulativeXp,
        });
      }
    });

    const formattedResults = activities.map((activity) => {
      const article = articleMap.get(activity.targetId!);
      const xpProgression = xpProgressionMap.get(activity.id);

      const xpEarned = xpProgression?.xpEarned || 0;
      const finalXp = xpProgression?.cumulativeXp || 0;
      const initialXp = finalXp - xpEarned;

      const details = (activity.details as any) || {};

      return {
        id: activity.id,
        userId: activity.userId,
        activityType: activity.activityType.toLowerCase(),
        targetId: activity.targetId,
        timer: activity.timer,
        details: {
          title: article?.title || details.title || "Activity",
          level: article?.raLevel || details.level || user?.level || 1,
          cefr_level: article?.cefrLevel || details.cefr_level || "A1",
          type: article?.type || details.type,
          genre: article?.genre || details.genre,
          subgenre: article?.subGenre || details.subgenre || details.subGenre,
          subGenre: article?.subGenre || details.subgenre || details.subGenre,
          articleId: activity.targetId,
          contentId: activity.targetId,
          ...details,
        },
        completed: activity.completed,
        timestamp: activity.createdAt.toISOString(),
        timeTaken: activity.timer || 0,
        xpEarned: xpEarned,
        initialXp: initialXp,
        finalXp: finalXp,
        createdAt: activity.createdAt.toISOString(),
        updatedAt: activity.updatedAt.toISOString(),
        contentId: activity.targetId,
        articleId: activity.targetId,
      };
    });

    formattedResults.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return NextResponse.json({
      activityLogs: formattedResults,
      message: "success",
    });
  } catch (error) {
    console.error("getActivity => ", error);
    return NextResponse.json({
      message: "Error",
      status: 500,
    });
  }
}

export async function getUserRecords(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  const { id: routeId } = await ctx.params;

  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;

  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");

    const activities = await db
      .select()
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, id),
          eq(userActivity.activityType, ActivityType.ARTICLE_READ),
        )
      )
      .orderBy(desc(userActivity.createdAt));

    const articleMap = new Map();

    activities.forEach((activity) => {
      const articleId =
        (activity.details as any)?.articleId || activity.targetId;

      if (!articleMap.has(articleId)) {
        articleMap.set(articleId, {
          readActivity: null,
          ratingActivity: null,
        });
      }

      const articleData = articleMap.get(articleId);

      if (activity.activityType === ActivityType.ARTICLE_READ) {
        articleData.readActivity = activity;
      } else if (activity.activityType === ActivityType.ARTICLE_RATING) {
        articleData.ratingActivity = activity;
      }
    });

    const articleIds = Array.from(articleMap.keys()).filter((id) => id);
    const articleRows = articleIds.length > 0
      ? await db
          .select({
            id: articles.id,
            title: articles.title,
            type: articles.type,
            genre: articles.genre,
            subGenre: articles.subGenre,
            cefrLevel: articles.cefrLevel,
            raLevel: articles.raLevel,
          })
          .from(articles)
          .where(inArray(articles.id, articleIds))
      : [];

    const articlesById = new Map(articleRows.map((article) => [article.id, article]));

    const results: any[] = [];

    articleMap.forEach((data, articleId) => {
      if (data.readActivity) {
        const readActivity = data.readActivity;
        const ratingActivity = data.ratingActivity;
        const article = articlesById.get(articleId);

        let extractedRating = 0;
        if (ratingActivity?.details) {
          try {
            const detailsObj =
              typeof ratingActivity.details === "string"
                ? JSON.parse(ratingActivity.details)
                : ratingActivity.details;
            extractedRating = detailsObj?.rating || 0;
          } catch (e) {
            extractedRating = 0;
          }
        }

        results.push({
          id: readActivity.id,
          userId: readActivity.userId,
          targetId: articleId,
          activityType: "ARTICLE_READ_WITH_RATING",
          completed: readActivity.completed,
          details: {
            type: article?.type || (readActivity.details as any)?.type || "",
            genre: article?.genre || (readActivity.details as any)?.genre || "",
            subgenre:
              article?.subGenre ||
              (readActivity.details as any)?.subgenre ||
              "",
            level:
              article?.raLevel || (readActivity.details as any)?.level || 0,
            cefr_level:
              article?.cefrLevel ||
              (readActivity.details as any)?.cefr_level ||
              "",
            title:
              article?.title ||
              (readActivity.details as any)?.articleTitle ||
              (readActivity.details as any)?.title ||
              "Unknown Article",
            articleTitle:
              article?.title ||
              (readActivity.details as any)?.articleTitle ||
              (readActivity.details as any)?.title ||
              "Unknown Article",
            rating: extractedRating,
            rated: extractedRating,
            score: (readActivity.details as any)?.score || 0,
            scores: (readActivity.details as any)?.score || 0,
            timer: (readActivity.details as any)?.timer || 0,
            ratingCompleted: ratingActivity?.completed || false,
          },
          created_at: readActivity.createdAt,
          updated_at: ratingActivity?.updatedAt || readActivity.updatedAt,
        });
      }
    });

    results.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      results: limitedResults,
    });
  } catch (error) {
    console.error("Error getting documents", error);
    return NextResponse.json(
      { message: "Internal server error", results: [] },
      { status: 500 },
    );
  }
}

export async function getUserHeatmap(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  const { id } = await ctx.params;
  try {
    const activities = await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, id))
      .orderBy(desc(userActivity.createdAt));

    const heatmapData: { [key: string]: number } = {};

    activities.forEach((activity) => {
      const date = activity.createdAt.toISOString().split("T")[0];
      heatmapData[date] = (heatmapData[date] || 0) + 1;
    });

    return NextResponse.json({
      results: heatmapData,
    });
  } catch (error) {
    console.error("Error getting documents", error);
    return NextResponse.json(
      { message: "Internal server error", results: [] },
      { status: 500 },
    );
  }
}

export async function getAllUsers(req: NextRequest) {
  try {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    const results = allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      xp: user.xp,
      level: user.level,
      cefrLevel: user.cefrLevel,
      expiredDate: user.expiredDate,
      licenseId: user.licenseId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return NextResponse.json({
      results,
    });
  } catch (error) {
    console.error("Error getting documents", error);
    return NextResponse.json(
      { message: "Internal server error", results: [] },
      { status: 500 },
    );
  }
}

export async function updateUserData(req: ExtendedNextRequest) {
  try {
    const data = await req.json();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 },
      );
    }

    const [license] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.id, data.license_id))
      .limit(1);

    if (!license) {
      return NextResponse.json(
        { message: "License not found" },
        { status: 404 },
      );
    }

    const [{ licenseUserCount }] = await db
      .select({ licenseUserCount: sql<number>`count(*)::int` })
      .from(licenseOnUsers)
      .where(eq(licenseOnUsers.licenseId, license.id));

    if (license.maxUsers <= licenseUserCount) {
      return NextResponse.json(
        { message: "License is already used" },
        { status: 404 },
      );
    }

    await db.insert(licenseOnUsers).values({
      userId: user.id,
      licenseId: license.id,
    });

    await db
      .update(users)
      .set({
        role: data.role,
        expiredDate: license.expiresAt,
        licenseId: license.id,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json(
      { message: "Update user successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating documents", error);
    return NextResponse.json(
      { message: "Internal server error", results: [] },
      { status: 500 },
    );
  }
}

export async function getUserActivityData(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  const { id } = await ctx.params;
  try {
    const [user] = await db
      .select({ xp: users.xp, level: users.level })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    const activities = await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, id))
      .orderBy(asc(userActivity.createdAt));

    const allXpLogs = await db
      .select()
      .from(xpLogs)
      .where(eq(xpLogs.userId, id))
      .orderBy(asc(xpLogs.createdAt));

    const xpLogMap = new Map(allXpLogs.map((log) => [log.activityId, log]));

    const articleIds = activities
      .map((activity) => activity.targetId)
      .filter((id) => id) as string[];

    const articleRows = articleIds.length > 0
      ? await db
          .select({
            id: articles.id,
            title: articles.title,
            type: articles.type,
            genre: articles.genre,
            subGenre: articles.subGenre,
            cefrLevel: articles.cefrLevel,
            raLevel: articles.raLevel,
          })
          .from(articles)
          .where(inArray(articles.id, articleIds))
      : [];

    const articleMap = new Map(articleRows.map((article) => [article.id, article]));

    let cumulativeXp = 0;
    const xpProgressionMap = new Map();

    allXpLogs.forEach((xpLog) => {
      cumulativeXp += xpLog.xpEarned || 0;
      if (xpLog.activityId) {
        xpProgressionMap.set(xpLog.activityId, {
          xpEarned: xpLog.xpEarned || 0,
          cumulativeXp: cumulativeXp,
        });
      }
    });

    const formattedResults = activities.map((activity) => {
      const article = articleMap.get(activity.targetId!);
      const xpProgression = xpProgressionMap.get(activity.id);

      const xpEarned = xpProgression?.xpEarned || 0;
      const finalXp = xpProgression?.cumulativeXp || 0;
      const initialXp = finalXp - xpEarned;

      const details = (activity.details as any) || {};

      return {
        id: activity.id,
        contentId: activity.targetId,
        userId: id,
        articleId: activity.targetId,
        activityType: activity.activityType.toLowerCase(),
        targetId: activity.targetId,
        timer: activity.timer,
        activityStatus: activity.completed ? "completed" : "in_progress",
        completed: activity.completed,
        timestamp: activity.createdAt.toISOString(),
        timeTaken: activity.timer || 0,
        xpEarned: xpEarned,
        initialXp: initialXp,
        finalXp: finalXp,
        initialLevel: user?.level || 1,
        finalLevel: user?.level || 1,
        createdAt: activity.createdAt.toISOString(),
        updatedAt: activity.updatedAt.toISOString(),
        details: {
          title: article?.title || details.title || "Activity",
          level: article?.raLevel || details.level || user?.level || 1,
          cefr_level: article?.cefrLevel || details.cefr_level || "A1",
          type: article?.type || details.type,
          genre: article?.genre || details.genre,
          subgenre: article?.subGenre || details.subgenre || details.subGenre,
          subGenre: article?.subGenre || details.subgenre || details.subGenre,
          articleId: activity.targetId,
          contentId: activity.targetId,
          ...details,
        },
      };
    });

    formattedResults.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return NextResponse.json({
      results: formattedResults,
      message: "success",
    });
  } catch (error) {
    console.error("Error fetching user activity data:", error);
    return NextResponse.json({
      message: "Error fetching user activity data",
      status: 500,
    });
  }
}

export async function getStudentData(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  const { id } = await ctx.params;
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        xp: users.xp,
        level: users.level,
        cefrLevel: users.cefrLevel,
        expiredDate: users.expiredDate,
        licenseId: users.licenseId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json({
        message: "Student not found",
        status: 404,
      });
    }

    return NextResponse.json({
      data: {
        ...user,
        cefr_level: user.cefrLevel,
        display_name: user.name,
      },
      message: "success",
    });
  } catch (error) {
    console.error("Error fetching student data:", error);
    return NextResponse.json({
      message: "Error fetching student data",
      status: 500,
    });
  }
}

export async function resetUserProgress(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  const { id } = await ctx.params;
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(lessonRecords).where(eq(lessonRecords.userId, id));
      await tx.delete(userActivity).where(eq(userActivity.userId, id));
      await tx.delete(xpLogs).where(eq(xpLogs.userId, id));
      await tx.delete(storyRecords).where(eq(storyRecords.userId, id));
      await tx.delete(userWordRecords).where(eq(userWordRecords.userId, id));
      await tx.delete(userSentenceRecords).where(eq(userSentenceRecords.userId, id));
      await tx
        .update(users)
        .set({
          xp: 0,
          level: 0,
          cefrLevel: "",
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));
    });

    return NextResponse.json({
      message: "User progress reset successfully - all data cleared",
      status: 200,
    });
  } catch (error) {
    console.error("Error resetting user progress:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function getUserXpLogs(
  req: ExtendedNextRequest,
  ctx: RequestContext,
) {
  const { id } = await ctx.params;
  try {
    const allXpLogs = await db
      .select()
      .from(xpLogs)
      .where(eq(xpLogs.userId, id))
      .orderBy(desc(xpLogs.createdAt));

    const activityIds = allXpLogs.map((log) => log.activityId);
    const activities = activityIds.length > 0
      ? await db.select().from(userActivity).where(inArray(userActivity.id, activityIds))
      : [];

    const activityMap = new Map(activities.map((activity) => [activity.id, activity]));

    const formattedResults = allXpLogs.map((xpLog) => {
      const activity = activityMap.get(xpLog.activityId);

      return {
        id: xpLog.activityId,
        userId: xpLog.userId,
        activityType: xpLog.activityType,
        targetId: activity?.targetId || "",
        timer: activity?.timer,
        details: activity?.details || {},
        completed: activity?.completed || true,
        timestamp: xpLog.createdAt,
        timeTaken: activity?.timer || 0,
        xpEarned: xpLog.xpEarned,
        createdAt: xpLog.createdAt,
        updatedAt: xpLog.updatedAt,
        contentId: activity?.targetId || "",
        articleId: activity?.targetId || "",
      };
    });

    return NextResponse.json({
      results: formattedResults,
      message: "success",
    });
  } catch (error) {
    console.error("getUserXpLogs => ", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function deleteUser(req: ExtendedNextRequest) {
  try {
    const { id } = await req.json();

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(classroomStudents).where(eq(classroomStudents.studentId, id));
      await tx.delete(users).where(eq(users.id, id));
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function deleteAllUsers(req: ExtendedNextRequest) {
  try {
    const batchSize = 100;

    let batch;
    do {
      batch = await db.select().from(classroomStudents).limit(batchSize);
      if (batch.length > 0) {
        await db.delete(classroomStudents).where(
          inArray(classroomStudents.id, batch.map((s) => s.id))
        );
      }
    } while (batch.length > 0);

    let userBatch;
    do {
      userBatch = await db.select().from(users).limit(batchSize);
      if (userBatch.length > 0) {
        await db.delete(users).where(
          inArray(users.id, userBatch.map((u) => u.id))
        );
      }
    } while (userBatch.length > 0);

    return NextResponse.json({ message: "All users deleted successfully" });
  } catch (error) {
    console.error("Error deleting all users:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function getLessonXp(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> }
) {
  const { userId } = await ctx.params;
  try {
    const articleId = req.nextUrl.searchParams.get("articleId");

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: "articleId is required" },
        { status: 400 }
      );
    }

    const decodedArticleId = decodeURIComponent(articleId);
    const cleanArticleId = decodedArticleId.split("/")[0];

    const allUserActivities = await db
      .select({
        id: userActivity.id,
        activityType: userActivity.activityType,
        targetId: userActivity.targetId,
        details: userActivity.details,
        createdAt: userActivity.createdAt,
      })
      .from(userActivity)
      .where(eq(userActivity.userId, userId));

    const articleRelatedActivities = allUserActivities.filter((activity) => {
      if (activity.targetId === cleanArticleId) {
        return true;
      }
      if (activity.activityType === "MC_QUESTION") {
        const details = activity.details as any;
        return details?.articleId === cleanArticleId;
      }
      return false;
    });

    let allRelatedActivities = [...articleRelatedActivities];

    if (articleRelatedActivities.length > 0) {
      const earliestTime = new Date(
        Math.min(...articleRelatedActivities.map((a) => a.createdAt.getTime()))
      );
      const latestTime = new Date(
        Math.max(...articleRelatedActivities.map((a) => a.createdAt.getTime()))
      );
      earliestTime.setHours(earliestTime.getHours() - 1);
      latestTime.setHours(latestTime.getHours() + 1);

      const vocabularyActivities = await db
        .select({
          id: userActivity.id,
          activityType: userActivity.activityType,
          targetId: userActivity.targetId,
          details: userActivity.details,
          createdAt: userActivity.createdAt,
        })
        .from(userActivity)
        .where(
          and(
            eq(userActivity.userId, userId),
            inArray(userActivity.activityType, [
              "VOCABULARY_FLASHCARDS",
              "VOCABULARY_MATCHING",
              "ARTICLE_RATING",
            ]),
            gte(userActivity.createdAt, earliestTime),
            lte(userActivity.createdAt, latestTime),
          )
        );

      allRelatedActivities = [...articleRelatedActivities, ...vocabularyActivities];
    }

    if (articleRelatedActivities.length === 0) {
      return NextResponse.json({
        success: true,
        total_xp: 0,
        breakdown: {},
        activities_count: 0,
      });
    }

    const activityIds = allRelatedActivities.map((activity) => activity.id);
    const allXpLogs = activityIds.length > 0
      ? await db
          .select({
            xpEarned: xpLogs.xpEarned,
            activityType: xpLogs.activityType,
            activityId: xpLogs.activityId,
          })
          .from(xpLogs)
          .where(
            and(
              eq(xpLogs.userId, userId),
              inArray(xpLogs.activityId, activityIds),
            )
          )
      : [];

    if (allXpLogs.length === 0) {
      return NextResponse.json({
        success: true,
        total_xp: 0,
        breakdown: {},
        activities_count: 0,
      });
    }

    const totalXp = allXpLogs.reduce(
      (total: number, log) => total + (log.xpEarned || 0),
      0
    );

    const xpByActivityType = allXpLogs.reduce(
      (acc, log) => {
        const at = log.activityType;
        if (!acc[at]) acc[at] = { totalXp: 0, count: 0 };
        acc[at].totalXp += log.xpEarned || 0;
        acc[at].count += 1;
        return acc;
      },
      {} as Record<string, { totalXp: number; count: number }>
    );

    return NextResponse.json({
      success: true,
      total_xp: totalXp,
      breakdown: xpByActivityType,
      activities_count: allXpLogs.length,
      article_id: cleanArticleId,
    });
  } catch (error) {
    console.error("Error fetching lesson XP:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// --- License helper functions exported from user-controller ---

export const calculateXpForLast30Days = async () => {
  try {
    const now = new Date();
    const past30Days = new Date();
    past30Days.setDate(now.getDate() - 30);

    const xpLogRows = await db
      .select({
        xpEarned: xpLogs.xpEarned,
        createdAt: xpLogs.createdAt,
        userId: xpLogs.userId,
      })
      .from(xpLogs)
      .where(
        and(
          gte(xpLogs.createdAt, past30Days),
          lte(xpLogs.createdAt, now),
        )
      );

    const userIds = [...new Set(xpLogRows.map((l) => l.userId))];
    const userRows = userIds.length > 0
      ? await db
          .select({ id: users.id, licenseId: users.licenseId })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
    const userLicenseMap = new Map(userRows.map((u) => [u.id, u.licenseId]));

    const xpByDateAndLicense: Record<string, Record<string, number>> = {};

    xpLogRows.forEach((log) => {
      const dateStr = log.createdAt.toISOString().slice(0, 10);
      const licenseId = userLicenseMap.get(log.userId);
      if (!licenseId) return;
      if (!xpByDateAndLicense[dateStr]) xpByDateAndLicense[dateStr] = {};
      if (!xpByDateAndLicense[dateStr][licenseId]) xpByDateAndLicense[dateStr][licenseId] = 0;
      xpByDateAndLicense[dateStr][licenseId] += log.xpEarned;
    });

    return NextResponse.json({
      success: true,
      data: xpByDateAndLicense,
      message: "XP calculation completed successfully",
    });
  } catch (error) {
    console.error("Error calculating XP:", error);
    return NextResponse.json({
      success: false,
      error: "Internal Server Error",
    });
  }
};

export const getXp30days = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const license_id = searchParams.get("license_id");

    const now = new Date();
    const past30Days = new Date();
    past30Days.setDate(now.getDate() - 30);

    let totalXp = 0;

    if (license_id) {
      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.licenseId, license_id));
      const userIds = userRows.map((u) => u.id);

      if (userIds.length > 0) {
        const xpLogRows = await db
          .select({ xpEarned: xpLogs.xpEarned })
          .from(xpLogs)
          .where(
            and(
              inArray(xpLogs.userId, userIds),
              gte(xpLogs.createdAt, past30Days),
              lte(xpLogs.createdAt, now),
            )
          );
        totalXp = xpLogRows.reduce((sum, log) => sum + log.xpEarned, 0);
      }
    } else {
      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .where(isNotNull(users.licenseId));
      const userIds = userRows.map((u) => u.id);

      if (userIds.length > 0) {
        const xpLogRows = await db
          .select({ xpEarned: xpLogs.xpEarned })
          .from(xpLogs)
          .where(
            and(
              inArray(xpLogs.userId, userIds),
              gte(xpLogs.createdAt, past30Days),
              lte(xpLogs.createdAt, now),
            )
          );
        totalXp = xpLogRows.reduce((sum, log) => sum + log.xpEarned, 0);
      }
    }

    return NextResponse.json({
      success: true,
      license_id: license_id || "all",
      total_xp: totalXp,
    });
  } catch (error) {
    console.error("Error fetching XP logs:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
};

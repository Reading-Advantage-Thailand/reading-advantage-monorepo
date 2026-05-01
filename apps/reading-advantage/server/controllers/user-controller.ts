import { getOne, updateOne } from "../handlers/handler-factory";
import { DBCollection } from "../models/enum";
import { levelCalculation } from "@/lib/utils";
import { ExtendedNextRequest, assertSelfOrAllowedStaff } from "./auth-controller";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivityType, LicenseType } from "@prisma/client";

async function getUserLicenseLevel(userId: string): Promise<LicenseType> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        licenseId: true,
        expiredDate: true,
      },
    });

    if (!user) {
      return LicenseType.BASIC;
    }

    if (user.licenseId) {
      const license = await prisma.license.findUnique({
        where: { id: user.licenseId },
        select: { licenseType: true },
      });
      return license?.licenseType || LicenseType.BASIC;
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
    
    // Auth check
    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userActivities: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        xpLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

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
    
    // Auth check
    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;
    const data = await req.json();

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        xp: data.xp,
        level: data.level,
        cefrLevel: data.cefr_level,
        expiredDate: data.expired_date,
        licenseId: data.license_id,
      },
    });
    if (data.resetXP) {
      await prisma.$transaction(async (tx) => {
        // Delete lesson records
        await tx.lessonRecord.deleteMany({
          where: { userId: id },
        });

        // Delete user activities
        await tx.userActivity.deleteMany({
          where: { userId: id },
        });

        // Delete XP logs
        await tx.xPLog.deleteMany({
          where: { userId: id },
        });

        // Delete user activities (replaces MCQ, SAQ, LAQ records)
        await tx.userActivity.deleteMany({
          where: { userId: id },
        });

        // Delete user word records (flashcard-related)
        await tx.userWordRecord.deleteMany({
          where: { userId: id },
        });

        // Delete user sentence records (flashcard-related)
        await tx.userSentenceRecord.deleteMany({
          where: { userId: id },
        });
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
    
    // Auth check
    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;

    // Data from frontend
    const data = await req.json();

    // Convert activity type to enum format
    const activityType = data.activityType.toUpperCase() as ActivityType;

    // Validate activity type
    if (!Object.values(ActivityType).includes(activityType)) {
      console.error("Invalid activity type:", activityType);
      return NextResponse.json({
        message: "Invalid activity type",
        status: 400,
      });
    }

    const targetId = data.articleId || data.storyId || data.contentId || "";

    // Special handling for vocabulary and article rating activities
    // If targetId is empty but we have articleId in details, use that
    let finalTargetId = targetId;
    if (!finalTargetId && data.details?.articleId) {
      finalTargetId = data.details.articleId;
    }

    // For article rating, if targetId is a userId (starts with 'cmesn' or similar),
    // try to get articleId from details
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

    // Get article metadata if this is an article-related activity
    let articleMetadata = {};
    if (
      data.articleId &&
      (activityType === ActivityType.ARTICLE_READ ||
        activityType === ActivityType.ARTICLE_RATING)
    ) {
      const article = await prisma.article.findUnique({
        where: { id: data.articleId },
        select: {
          type: true,
          genre: true,
          subGenre: true,
          title: true,
          cefrLevel: true,
          raLevel: true,
        },
      });

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

    // Check if activity already exists
    const existingActivity = await prisma.userActivity.findUnique({
      where: {
        userId_activityType_targetId: {
          userId: id,
          activityType: activityType,
          targetId: finalTargetId,
        },
      },
    });

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
      // Create new activity
      activity = await prisma.userActivity.create({
        data: commonData,
      });
    } else if (data.activityStatus === "completed" || data.completed) {
      // Update existing activity
      activity = await prisma.userActivity.update({
        where: { id: existingActivity.id },
        data: {
          ...commonData,
          updatedAt: new Date(),
        },
      });
    } else {
      activity = existingActivity;
    }

    let hasExistingXpLog = false;
    if (existingActivity) {
      const existingXpLog = await prisma.xPLog.findFirst({
        where: { activityId: existingActivity.id },
      });
      hasExistingXpLog = !!existingXpLog;
    }

    // Create XP log if XP is earned or if it's an initial level test (even with 0 XP)
    if (
      !hasExistingXpLog &&
      ((data.xpEarned && data.xpEarned > 0) ||
        (data.isInitialLevelTest && typeof data.xpEarned === "number"))
    ) {
      await prisma.xPLog.create({
        data: {
          userId: id,
          xpEarned: data.xpEarned,
          activityId: activity.id,
          activityType: activityType,
        },
      });

      // Get current user data from database to ensure we have the latest XP
      const currentUser = await prisma.user.findUnique({
        where: { id },
        select: { xp: true, level: true, cefrLevel: true },
      });

      // For initial level test, set XP directly instead of adding to existing XP
      const finalXp = data.isInitialLevelTest
        ? data.xpEarned
        : (currentUser?.xp || 0) + data.xpEarned;

      const levelData = levelCalculation(finalXp);

      await prisma.user.update({
        where: { id },
        data: {
          xp: finalXp,
          level:
            typeof levelData.raLevel === "number"
              ? levelData.raLevel
              : parseInt(String(levelData.raLevel)),
          cefrLevel: levelData.cefrLevel,
          updatedAt: new Date(),
        },
      });
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
    
    // Auth check
    if (!assertSelfOrAllowedStaff(req, routeId)) {
      return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
    }
    const id = routeId;
    // Data from frontend
    const data = await req.json();

    // Convert activity type to enum format
    const activityType = data.activityType.toUpperCase() as ActivityType;

    // Validate activity type
    if (!Object.values(ActivityType).includes(activityType)) {
      return NextResponse.json({
        message: "Invalid activity type",
        status: 400,
      });
    }

    const targetId = data.articleId || data.storyId || data.contentId || "";

    // Special handling for vocabulary and article rating activities (same as postActivityLog)
    let finalTargetId = targetId;
    if (!finalTargetId && data.details?.articleId) {
      finalTargetId = data.details.articleId;
    }

    // For article rating, if targetId is a userId, try to get articleId from details
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

    // Get article metadata if this is an article-related activity
    let articleMetadata = {};
    if (
      data.articleId &&
      (activityType === ActivityType.ARTICLE_READ ||
        activityType === ActivityType.ARTICLE_RATING)
    ) {
      const article = await prisma.article.findUnique({
        where: { id: data.articleId },
        select: {
          type: true,
          genre: true,
          subGenre: true,
          title: true,
          cefrLevel: true,
          raLevel: true,
        },
      });

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

    // Find existing activity
    const existingActivity = await prisma.userActivity.findUnique({
      where: {
        userId_activityType_targetId: {
          userId: id,
          activityType: activityType,
          targetId: finalTargetId,
        },
      },
    });

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
      // Create new activity if it doesn't exist
      activity = await prisma.userActivity.create({
        data: commonData,
      });
    } else {
      // Update existing activity
      activity = await prisma.userActivity.update({
        where: { id: existingActivity.id },
        data: {
          ...commonData,
          updatedAt: new Date(),
        },
      });
    }

    let hasExistingXpLog = false;
    if (existingActivity) {
      const existingXpLog = await prisma.xPLog.findFirst({
        where: { activityId: existingActivity.id },
      });
      hasExistingXpLog = !!existingXpLog;
    }

    // Create XP log if XP is earned
    if (!hasExistingXpLog && data.xpEarned && data.xpEarned > 0) {
      await prisma.xPLog.create({
        data: {
          userId: id,
          xpEarned: data.xpEarned,
          activityId: activity.id,
          activityType: activityType,
        },
      });

      // Update user XP and level
      const currentUser = req.session?.user;
      const finalXp = (currentUser?.xp || 0) + data.xpEarned;
      const levelData = levelCalculation(finalXp);

      await prisma.user.update({
        where: { id },
        data: {
          xp: finalXp,
          level:
            typeof levelData.raLevel === "number"
              ? levelData.raLevel
              : parseInt(String(levelData.raLevel)),
          cefrLevel: levelData.cefrLevel,
          updatedAt: new Date(),
        },
      });
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
  
  // Auth check
  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { xp: true, level: true },
    });

    // Get query parameters
    const articleId = req.nextUrl.searchParams.get("articleId");
    const activityType = req.nextUrl.searchParams.get("activityType");
    const isFiltered = !!(articleId || activityType);

    // Build where condition
    const whereCondition: any = {
      userId: id,
    };

    if (articleId) {
      whereCondition.targetId = articleId;
    }

    if (activityType) {
      whereCondition.activityType = activityType.toUpperCase();
    }

    const activities = await prisma.userActivity.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: "asc",
      },
    });

    const xpWhereCondition: any = {
      userId: id,
    };

    if (isFiltered) {
      const activityIds = activities.map((a) => a.id);
      xpWhereCondition.activityId = { in: activityIds };
    }

    const allXpLogs = await prisma.xPLog.findMany({
      where: xpWhereCondition,
      orderBy: {
        createdAt: "asc",
      },
    });

    const xpLogMap = new Map(allXpLogs.map((log) => [log.activityId, log]));

    const articleIds = activities
      .map((activity) => activity.targetId)
      .filter((id) => id);

    const articles = await prisma.article.findMany({
      where: {
        id: { in: articleIds },
      },
      select: {
        id: true,
        title: true,
        type: true,
        genre: true,
        subGenre: true,
        cefrLevel: true,
        raLevel: true,
      },
    });

    const articleMap = new Map(
      articles.map((article) => [article.id, article]),
    );

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
      const article = articleMap.get(activity.targetId);
      const xpLog = xpLogMap.get(activity.id);
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
  
  // Auth check
  if (!assertSelfOrAllowedStaff(req, routeId)) {
    return NextResponse.json({ message: "Forbidden - Access denied to this resource" }, { status: 403 });
  }
  const id = routeId;
  
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
    const nextPage = req.nextUrl.searchParams.get("nextPage");
    const activities = await prisma.userActivity.findMany({
      where: {
        userId: id,
        activityType: ActivityType.ARTICLE_READ,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

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

    // Get article IDs and fetch article details from database
    const articleIds = Array.from(articleMap.keys()).filter((id) => id);
    const articles = await prisma.article.findMany({
      where: {
        id: { in: articleIds },
      },
      select: {
        id: true,
        title: true,
        type: true,
        genre: true,
        subGenre: true,
        cefrLevel: true,
        raLevel: true,
      },
    });

    const articlesById = new Map(
      articles.map((article) => [article.id, article]),
    );

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

        const resultItem = {
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
        };

        results.push(resultItem);
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
    // Get user activities and group by date for heatmap
    const activities = await prisma.userActivity.findMany({
      where: {
        userId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Process activities to create heatmap data
    const heatmapData: { [key: string]: number } = {};

    activities.forEach((activity) => {
      const date = activity.createdAt.toISOString().split("T")[0]; // Get YYYY-MM-DD format
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
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const results = users.map((user) => ({
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          message: "User not found",
        },
        { status: 404 },
      );
    }

    // Find license
    const license = await prisma.license.findUnique({
      where: {
        id: data.license_id,
      },
      include: {
        licenseUsers: true,
      },
    });

    if (!license) {
      return NextResponse.json(
        {
          message: "License not found",
        },
        { status: 404 },
      );
    }

    const usedLicenses = license.licenseUsers.length;

    if (license.maxUsers <= usedLicenses) {
      return NextResponse.json(
        {
          message: "License is already used",
        },
        { status: 404 },
      );
    }

    // Create license-user relationship
    await prisma.licenseOnUser.create({
      data: {
        userId: user.id,
        licenseId: license.id,
      },
    });

    // Update user data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: data.role,
        expiredDate: license.expiresAt,
        licenseId: license.id,
      },
    });

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
    const user = await prisma.user.findUnique({
      where: { id },
      select: { xp: true, level: true },
    });

    // Get user activities
    const activities = await prisma.userActivity.findMany({
      where: {
        userId: id,
      },
      orderBy: {
        createdAt: "asc", // Sort by ascending to calculate cumulative XP correctly
      },
    });

    // Get ALL XP logs for this user to calculate cumulative progression
    const allXpLogs = await prisma.xPLog.findMany({
      where: {
        userId: id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Create a map of activity ID to XP log
    const xpLogMap = new Map(allXpLogs.map((log) => [log.activityId, log]));

    // Get article details for activities that reference articles
    const articleIds = activities
      .map((activity) => activity.targetId)
      .filter((id) => id);

    const articles = await prisma.article.findMany({
      where: {
        id: { in: articleIds },
      },
      select: {
        id: true,
        title: true,
        type: true,
        genre: true,
        subGenre: true,
        cefrLevel: true,
        raLevel: true,
      },
    });

    const articleMap = new Map(
      articles.map((article) => [article.id, article]),
    );

    // Calculate cumulative XP progression from all XP logs chronologically
    let cumulativeXp = 0;
    const xpProgressionMap = new Map();

    // Build XP progression map from all XP logs
    allXpLogs.forEach((xpLog) => {
      cumulativeXp += xpLog.xpEarned || 0;
      if (xpLog.activityId) {
        xpProgressionMap.set(xpLog.activityId, {
          xpEarned: xpLog.xpEarned || 0,
          cumulativeXp: cumulativeXp,
        });
      }
    });

    const formattedResults = activities.map((activity, index) => {
      const article = articleMap.get(activity.targetId);
      const xpLog = xpLogMap.get(activity.id);
      const xpProgression = xpProgressionMap.get(activity.id);

      const xpEarned = xpProgression?.xpEarned || 0;
      const finalXp = xpProgression?.cumulativeXp || 0;
      const initialXp = finalXp - xpEarned;

      // Safely extract details
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

    // Sort results by timestamp descending for display (newest first)
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
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        xp: true,
        level: true,
        cefrLevel: true,
        expiredDate: true,
        licenseId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        message: "Student not found",
        status: 404,
      });
    }

    const studentData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      xp: user.xp,
      level: user.level,
      cefrLevel: user.cefrLevel,
      cefr_level: user.cefrLevel,
      expiredDate: user.expiredDate,
      licenseId: user.licenseId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      display_name: user.name,
    };

    return NextResponse.json({
      data: studentData,
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
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Delete all related records using transaction for data consistency
    await prisma.$transaction(async (tx) => {
      // Delete lesson records
      await tx.lessonRecord.deleteMany({
        where: { userId: id },
      });

      // Delete user activities
      await tx.userActivity.deleteMany({
        where: { userId: id },
      });

      // Delete XP logs
      await tx.xPLog.deleteMany({
        where: { userId: id },
      });

      // Delete user activities (replaces MCQ, SAQ, LAQ records)
      await tx.userActivity.deleteMany({
        where: { userId: id },
      });

      // Delete story records
      await tx.storyRecord.deleteMany({
        where: { userId: id },
      });

      // Delete user word records (flashcard-related)
      await tx.userWordRecord.deleteMany({
        where: { userId: id },
      });

      // Delete user sentence records (flashcard-related)
      await tx.userSentenceRecord.deleteMany({
        where: { userId: id },
      });

      // Reset user progress
      await tx.user.update({
        where: { id },
        data: {
          xp: 0,
          level: 0,
          cefrLevel: "", // Reset to default CEFR level
          updatedAt: new Date(),
        },
      });
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
    const xpLogs = await prisma.xPLog.findMany({
      where: {
        userId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const activityIds = xpLogs.map((log) => log.activityId);
    const activities = await prisma.userActivity.findMany({
      where: {
        id: { in: activityIds },
      },
    });

    const activityMap = new Map(
      activities.map((activity) => [activity.id, activity]),
    );
    const formattedResults = xpLogs.map((xpLog) => {
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

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // ลบข้อมูลที่เกี่ยวข้องในตารางอื่นก่อน
    await prisma.$transaction(async (tx) => {
      // ลบข้อมูลในตาราง classroomStudent
      await tx.classroomStudent.deleteMany({
        where: { studentId: id },
      });

      // ลบผู้ใช้
      await tx.user.delete({
        where: { id },
      });
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

    // Delete classroom-student relationships in batches
    let classroomStudents;
    do {
      classroomStudents = await prisma.classroomStudent.findMany({
        take: batchSize,
      });

      await Promise.all(
        classroomStudents.map((student) =>
          prisma.classroomStudent.delete({
            where: { id: student.id },
          }),
        ),
      );
    } while (classroomStudents.length > 0);

    // Delete users in batches
    let users;
    do {
      users = await prisma.user.findMany({
        take: batchSize,
      });

      await Promise.all(
        users.map((user) =>
          prisma.user.delete({
            where: { id: user.id },
          }),
        ),
      );
    } while (users.length > 0);

    return NextResponse.json({ message: "All users deleted successfully" });
  } catch (error) {
    console.error("Error deleting all users:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

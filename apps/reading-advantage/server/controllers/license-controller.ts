import { NextRequest, NextResponse } from "next/server";
import catchAsync from "../utils/catch-async";
import { ExtendedNextRequest } from "./auth-controller";
import { prisma } from "@/lib/prisma";
import { LicenseType } from "@prisma/client";
import { randomUUID } from "crypto";

interface RequestContext {
  params: Promise<{
    id: string;
  }>;
}

export interface Context {
  params: Promise<{
    userId: string;
  }>;
}

export const createLicenseKey = catchAsync(async (req: ExtendedNextRequest) => {
  const {
    total_licenses,
    subscription_level,
    school_name,
    admin_id,
    expiration_date,
  } = await req.json();

  // Map subscription_level to LicenseType enum
  const licenseTypeMap: { [key: string]: LicenseType } = {
    'basic': LicenseType.BASIC,
    'premium': LicenseType.PREMIUM,
    'enterprise': LicenseType.ENTERPRISE,
  };

  const licenseType = licenseTypeMap[subscription_level?.toLowerCase()] || LicenseType.BASIC;

  // Calculate expiration date from number of days
  let expiresAt: Date | null = null;
  if (expiration_date) {
    const daysToAdd = typeof expiration_date === 'number' ? expiration_date : parseInt(expiration_date);
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);
  }

  const license = await prisma.license.create({
    data: {
      key: randomUUID(),
      schoolName: school_name,
      maxUsers: total_licenses,
      licenseType: licenseType,
      ownerUserId: admin_id || req.session?.user.id,
      expiresAt: expiresAt,
      usedLicenses: 0,
    },
  });

  return NextResponse.json({
    message: "License key created successfully",
    license,
  });
});

export const getAllLicenses = catchAsync(async (req: ExtendedNextRequest) => {
  const licenses = await prisma.license.findMany({
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      licenseUsers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          licenseUsers: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json({
    message: "Licenses fetched successfully",
    data: licenses,
  });
});

export const deleteLicense = catchAsync(async (req: ExtendedNextRequest, ctx: RequestContext) => {
  const { id } = await ctx.params;
  // Check if license exists
  const license = await prisma.license.findUnique({
    where: { id },
    include: {
      licenseUsers: true,
    },
  });

  if (!license) {
    return NextResponse.json(
      { message: "License not found" },
      { status: 404 }
    );
  }

  // If license has users, we might want to handle this case
  if (license.licenseUsers.length > 0) {
    return NextResponse.json(
      { message: "Cannot delete license with active users" },
      { status: 400 }
    );
  }

  await prisma.license.delete({
    where: { id },
  });

  return NextResponse.json({
    message: "License deleted successfully",
  });
});

export const activateLicense = async (
  req: ExtendedNextRequest,
  context?: RequestContext
) => {
  try {
    const { key, userId } = await req.json();
    
    // Use userId from context (URL parameter) if available, otherwise from body
    const targetUserId = context ? (await context.params).id : userId;
    
    // Authorization check: users can only activate license for themselves
    // unless they are ADMIN or TEACHER
    const currentUser = req.session?.user;
    if (
      currentUser?.role !== 'ADMIN' &&
      currentUser?.role !== 'TEACHER' &&
      currentUser?.id !== targetUserId
    ) {
      return NextResponse.json(
        { message: "You can only activate license for yourself" },
        { status: 403 }
      );
    }
    
    // Find license by key
    const license = await prisma.license.findUnique({
      where: { key },
      include: {
        licenseUsers: true,
      },
    });

    if (!license) {
      return NextResponse.json(
        { message: "License not found" },
        { status: 404 }
      );
    }

    // Check if license has available slots
    if (license.licenseUsers.length >= license.maxUsers) {
      return NextResponse.json(
        { message: "License is already fully used" },
        { status: 400 }
      );
    }

    // Check if license is expired
    if (license.expiresAt && license.expiresAt < new Date()) {
      return NextResponse.json(
        { message: "License has expired" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        licenseOnUsers: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Check if user already has this license
    const existingLicenseUser = await prisma.licenseOnUser.findUnique({
      where: {
        userId_licenseId: {
          userId: targetUserId,
          licenseId: license.id,
        },
      },
    });

    if (existingLicenseUser) {
      return NextResponse.json(
        { message: "License already activated for this user" },
        { status: 400 }
      );
    }

    // Activate the license for the user
    await prisma.$transaction([
      // Create license-user relationship
      prisma.licenseOnUser.create({
        data: {
          userId: targetUserId,
          licenseId: license.id,
        },
      }),
      // Update user's license and expiration date
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          licenseId: license.id,
          expiredDate: license.expiresAt,
        },
      }),
      // Update license used count
      prisma.license.update({
        where: { id: license.id },
        data: {
          usedLicenses: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json(
      { message: "License activated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error activating license:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
};

export const getLicense = async (
  req: ExtendedNextRequest,
  ctx: RequestContext
) => {
  const { id } = await ctx.params;
  try {
    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        licenseUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            licenseUsers: true,
          },
        },
      },
    });

    if (!license) {
      return NextResponse.json(
        { message: "License not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "License fetched successfully",
      license,
    });
  } catch (error) {
    console.error("Error fetching license:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
};

export const deactivateLicense = async (
  req: ExtendedNextRequest,
  context?: RequestContext
) => {
  try {
    const { userId, licenseId } = await req.json();
    
    // Use userId from context (URL parameter) if available, otherwise from body
    const targetUserId = context ? (await context.params).id : userId;
    
    // Authorization check
    const currentUser = req.session?.user;
    if (
      currentUser?.role !== 'ADMIN' &&
      currentUser?.role !== 'TEACHER' &&
      currentUser?.id !== targetUserId
    ) {
      return NextResponse.json(
        { message: "You can only deactivate license for yourself" },
        { status: 403 }
      );
    }

    // Check if license-user relationship exists
    const licenseUser = await prisma.licenseOnUser.findUnique({
      where: {
        userId_licenseId: {
          userId: targetUserId,
          licenseId: licenseId,
        },
      },
    });

    if (!licenseUser) {
      return NextResponse.json(
        { message: "License not found for this user" },
        { status: 404 }
      );
    }

    // Remove license from user
    await prisma.$transaction([
      // Delete license-user relationship
      prisma.licenseOnUser.delete({
        where: {
          userId_licenseId: {
            userId: targetUserId,
            licenseId: licenseId,
          },
        },
      }),
      // Update user's license to null
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          licenseId: null,
          expiredDate: null,
        },
      }),
      // Decrement license used count
      prisma.license.update({
        where: { id: licenseId },
        data: {
          usedLicenses: {
            decrement: 1,
          },
        },
      }),
    ]);

    return NextResponse.json(
      { message: "License deactivated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deactivating license:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
};

export const updateUserLicense = async (
  req: ExtendedNextRequest,
  context?: RequestContext
) => {
  try {
    const { userId, oldLicenseId, newLicenseKey } = await req.json();
    
    // Use userId from context (URL parameter) if available, otherwise from body
    const targetUserId = context ? (await context.params).id : userId;
    
    // Authorization check
    const currentUser = req.session?.user;
    if (
      currentUser?.role !== 'ADMIN' &&
      currentUser?.role !== 'TEACHER'
    ) {
      return NextResponse.json(
        { message: "Only admins and teachers can update user licenses" },
        { status: 403 }
      );
    }

    // Find new license by key
    const newLicense = await prisma.license.findUnique({
      where: { key: newLicenseKey },
      include: {
        licenseUsers: true,
      },
    });

    if (!newLicense) {
      return NextResponse.json(
        { message: "New license not found" },
        { status: 404 }
      );
    }

    // Check if new license has available slots
    if (newLicense.licenseUsers.length >= newLicense.maxUsers) {
      return NextResponse.json(
        { message: "New license is already fully used" },
        { status: 400 }
      );
    }

    // Check if new license is expired
    if (newLicense.expiresAt && newLicense.expiresAt < new Date()) {
      return NextResponse.json(
        { message: "New license has expired" },
        { status: 400 }
      );
    }

    // Check if user already has the new license
    const existingNewLicenseUser = await prisma.licenseOnUser.findUnique({
      where: {
        userId_licenseId: {
          userId: targetUserId,
          licenseId: newLicense.id,
        },
      },
    });

    if (existingNewLicenseUser) {
      return NextResponse.json(
        { message: "User already has this license" },
        { status: 400 }
      );
    }

    // Update license
    await prisma.$transaction([
      // Remove old license-user relationship if exists
      ...(oldLicenseId ? [
        prisma.licenseOnUser.deleteMany({
          where: {
            userId: targetUserId,
            licenseId: oldLicenseId,
          },
        }),
        // Decrement old license used count
        prisma.license.update({
          where: { id: oldLicenseId },
          data: {
            usedLicenses: {
              decrement: 1,
            },
          },
        }),
      ] : []),
      // Create new license-user relationship
      prisma.licenseOnUser.create({
        data: {
          userId: targetUserId,
          licenseId: newLicense.id,
        },
      }),
      // Update user's license and expiration date
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          licenseId: newLicense.id,
          expiredDate: newLicense.expiresAt,
        },
      }),
      // Increment new license used count
      prisma.license.update({
        where: { id: newLicense.id },
        data: {
          usedLicenses: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json(
      { message: "License updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user license:", error);
    return NextResponse.json({
      message: "Internal server error",
      status: 500,
    });
  }
};

export const getFilteredLicenses = catchAsync(async (req: ExtendedNextRequest) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const schoolName = searchParams.get("schoolName");
  const licenseType = searchParams.get("licenseType");
  const ownerId = searchParams.get("ownerId");

  const skip = (page - 1) * limit;

  // Build where condition
  const where: any = {};
  
  if (schoolName) {
    where.schoolName = {
      contains: schoolName,
      mode: 'insensitive',
    };
  }
  
  if (licenseType) {
    where.licenseType = licenseType;
  }
  
  if (ownerId) {
    where.ownerUserId = ownerId;
  }

  const [licenses, total] = await Promise.all([
    prisma.license.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            licenseUsers: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.license.count({ where }),
  ]);

  return NextResponse.json({
    message: "Licenses fetched successfully",
    data: licenses,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const calculateXpForLast30Days = async () => {
  try {
    const now = new Date();
    const past30Days = new Date();
    past30Days.setDate(now.getDate() - 30);

    // Get all XP logs from the last 30 days
    const xpLogs = await prisma.xPLog.findMany({
      where: {
        createdAt: {
          gte: past30Days,
          lt: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            licenseId: true,
          },
        },
      },
    });

    // Group XP by date and license
    const xpByDateAndLicense: Record<string, Record<string, number>> = {};

    xpLogs.forEach((log) => {
      const dateStr = log.createdAt.toISOString().slice(0, 10);
      const licenseId = log.user.licenseId;

      if (!licenseId) return; // Skip users without licenses

      if (!xpByDateAndLicense[dateStr]) {
        xpByDateAndLicense[dateStr] = {};
      }

      if (!xpByDateAndLicense[dateStr][licenseId]) {
        xpByDateAndLicense[dateStr][licenseId] = 0;
      }

      xpByDateAndLicense[dateStr][licenseId] += log.xpEarned;
    });

    // Save aggregated data (you might want to create a separate table for this)
    // For now, we'll just return the data since there's no xp-gained-log table in Prisma schema
    
    return NextResponse.json({ 
      success: true, 
      data: xpByDateAndLicense,
      message: "XP calculation completed successfully"
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
      // Get XP for specific license
      const xpLogs = await prisma.xPLog.findMany({
        where: {
          createdAt: {
            gte: past30Days,
            lt: now,
          },
          user: {
            licenseId: license_id,
          },
        },
        select: {
          xpEarned: true,
        },
      });

      totalXp = xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);
    } else {
      // Get XP for all licenses
      const xpLogs = await prisma.xPLog.findMany({
        where: {
          createdAt: {
            gte: past30Days,
            lt: now,
          },
          user: {
            licenseId: {
              not: null,
            },
          },
        },
        select: {
          xpEarned: true,
        },
      });

      totalXp = xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);
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

export const getLessonXp = async (
  req: NextRequest,
  ctx: Context
) => {
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

    // Get ALL UserActivities for this user
    const allUserActivities = await prisma.userActivity.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        activityType: true,
        targetId: true,
        details: true,
        createdAt: true,
      },
    });

    // Filter activities based on articleId:
    // 1. For activities with targetId = articleId (SA_QUESTION, LA_QUESTION, ARTICLE_READ, etc.)
    // 2. For MCQ activities, check articleId in details
    const articleRelatedActivities = allUserActivities.filter((activity) => {
      // Direct match with targetId (for SA, LA, ARTICLE_READ, etc.)
      if (activity.targetId === cleanArticleId) {
        return true;
      }

      // For MCQ activities, check articleId in details
      if (activity.activityType === "MC_QUESTION") {
        const details = activity.details as any;
        return details?.articleId === cleanArticleId;
      }

      return false;
    });

    // Also get vocabulary activities and article rating that might be related
    // Get activities from the same time period (within 1 hour of article activities)
    let allRelatedActivities = [...articleRelatedActivities];

    if (articleRelatedActivities.length > 0) {
      const earliestTime = new Date(
        Math.min(...articleRelatedActivities.map((a) => a.createdAt.getTime()))
      );
      const latestTime = new Date(
        Math.max(...articleRelatedActivities.map((a) => a.createdAt.getTime()))
      );

      // Extend time range by 1 hour before and after
      earliestTime.setHours(earliestTime.getHours() - 1);
      latestTime.setHours(latestTime.getHours() + 1);

      const vocabularyActivities = await prisma.userActivity.findMany({
        where: {
          userId: userId,
          activityType: {
            in: [
              "VOCABULARY_FLASHCARDS",
              "VOCABULARY_MATCHING",
              "ARTICLE_RATING",
            ],
          },
          createdAt: {
            gte: earliestTime,
            lte: latestTime,
          },
        },
        select: {
          id: true,
          activityType: true,
          targetId: true,
          details: true,
          createdAt: true,
        },
      });
      allRelatedActivities = [
        ...articleRelatedActivities,
        ...vocabularyActivities,
      ];
    }

    if (articleRelatedActivities.length === 0) {
      return NextResponse.json({
        success: true,
        total_xp: 0,
        breakdown: {},
        activities_count: 0,
      });
    }

    // Get ALL XP logs for these activities (including related vocabulary/rating activities)
    const activityIds = allRelatedActivities.map((activity) => activity.id);
    const allXpLogs = await prisma.xPLog.findMany({
      where: {
        userId: userId,
        activityId: { in: activityIds },
      },
      select: {
        xpEarned: true,
        activityType: true,
        activityId: true,
      },
    });

    if (allXpLogs.length === 0) {
      return NextResponse.json({
        success: true,
        total_xp: 0,
        breakdown: {},
        activities_count: 0,
      });
    }

    // Calculate total XP from all article-related activities
    const totalXp = allXpLogs.reduce(
      (total: number, log) => total + (log.xpEarned || 0),
      0
    );

    // Break down XP by activity type
    const xpByActivityType = allXpLogs.reduce(
      (acc, log) => {
        const activityType = log.activityType;
        if (!acc[activityType]) {
          acc[activityType] = {
            totalXp: 0,
            count: 0,
          };
        }
        acc[activityType].totalXp += log.xpEarned || 0;
        acc[activityType].count += 1;
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
};

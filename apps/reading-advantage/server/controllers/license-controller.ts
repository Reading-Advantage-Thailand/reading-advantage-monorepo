import { NextRequest, NextResponse } from "next/server";
import catchAsync from "../utils/catch-async";
import { ExtendedNextRequest } from "./auth-controller";
import { db, eq, and, gte, lt, lte, inArray, isNotNull, ilike, sql } from "@reading-advantage/db";
import { licenses, licenseOnUsers, users, xpLogs, userActivity } from "@reading-advantage/db/schema";
import { LicenseType } from "@/lib/enums";
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

  const licenseTypeMap: { [key: string]: string } = {
    basic: LicenseType.BASIC,
    premium: LicenseType.PREMIUM,
    enterprise: LicenseType.ENTERPRISE,
  };

  const licenseType = licenseTypeMap[subscription_level?.toLowerCase()] ?? LicenseType.BASIC;

  let expiresAt: Date | null = null;
  if (expiration_date) {
    const daysToAdd = typeof expiration_date === "number" ? expiration_date : parseInt(expiration_date);
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);
  }

  const [license] = await db
    .insert(licenses)
    .values({
      key: randomUUID(),
      schoolName: school_name,
      maxUsers: total_licenses,
      licenseType,
      ownerUserId: admin_id || req.session?.user.id,
      expiresAt,
      usedLicenses: 0,
    })
    .returning();

  return NextResponse.json({
    message: "License key created successfully",
    license,
  });
});

export const getAllLicenses = catchAsync(async (req: ExtendedNextRequest) => {
  const allLicenses = await db.select().from(licenses).orderBy(sql`${licenses.createdAt} desc`);

  const enriched = await Promise.all(
    allLicenses.map(async (license) => {
      const ownerRow = license.ownerUserId
        ? await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, license.ownerUserId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : null;

      const licenseUserRows = await db
        .select({
          userId: licenseOnUsers.userId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(licenseOnUsers)
        .leftJoin(users, eq(licenseOnUsers.userId, users.id))
        .where(eq(licenseOnUsers.licenseId, license.id));

      return {
        ...license,
        owner: ownerRow,
        licenseUsers: licenseUserRows.map((r) => ({
          user: { id: r.userId, name: r.userName, email: r.userEmail },
        })),
        _count: { licenseUsers: licenseUserRows.length },
      };
    })
  );

  return NextResponse.json({
    message: "Licenses fetched successfully",
    data: enriched,
  });
});

export const deleteLicense = catchAsync(async (req: ExtendedNextRequest, ctx: RequestContext) => {
  const { id } = await ctx.params;

  const [license] = await db.select().from(licenses).where(eq(licenses.id, id)).limit(1);

  if (!license) {
    return NextResponse.json({ message: "License not found" }, { status: 404 });
  }

  const licenseUserRows = await db
    .select()
    .from(licenseOnUsers)
    .where(eq(licenseOnUsers.licenseId, id));

  if (licenseUserRows.length > 0) {
    return NextResponse.json(
      { message: "Cannot delete license with active users" },
      { status: 400 }
    );
  }

  await db.delete(licenses).where(eq(licenses.id, id));

  return NextResponse.json({ message: "License deleted successfully" });
});

export const activateLicense = async (
  req: ExtendedNextRequest,
  context?: RequestContext
) => {
  try {
    const { key, userId } = await req.json();

    const targetUserId = context ? (await context.params).id : userId;

    const currentUser = req.session?.user;
    if (
      currentUser?.role !== "ADMIN" &&
      currentUser?.role !== "TEACHER" &&
      currentUser?.id !== targetUserId
    ) {
      return NextResponse.json(
        { message: "You can only activate license for yourself" },
        { status: 403 }
      );
    }

    const [license] = await db.select().from(licenses).where(eq(licenses.key, key)).limit(1);

    if (!license) {
      return NextResponse.json({ message: "License not found" }, { status: 404 });
    }

    const licenseUserRows = await db
      .select()
      .from(licenseOnUsers)
      .where(eq(licenseOnUsers.licenseId, license.id));

    if (licenseUserRows.length >= license.maxUsers) {
      return NextResponse.json({ message: "License is already fully used" }, { status: 400 });
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      return NextResponse.json({ message: "License has expired" }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const [existingLicenseUser] = await db
      .select()
      .from(licenseOnUsers)
      .where(and(eq(licenseOnUsers.userId, targetUserId), eq(licenseOnUsers.licenseId, license.id)))
      .limit(1);

    if (existingLicenseUser) {
      return NextResponse.json(
        { message: "License already activated for this user" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.insert(licenseOnUsers).values({ userId: targetUserId, licenseId: license.id });
      await tx
        .update(users)
        .set({ licenseId: license.id, expiredDate: license.expiresAt, updatedAt: new Date() })
        .where(eq(users.id, targetUserId));
      await tx
        .update(licenses)
        .set({ usedLicenses: (license.usedLicenses ?? 0) + 1, updatedAt: new Date() })
        .where(eq(licenses.id, license.id));
    });

    return NextResponse.json({ message: "License activated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error activating license:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
};

export const getLicense = async (req: ExtendedNextRequest, ctx: RequestContext) => {
  const { id } = await ctx.params;
  try {
    const [license] = await db.select().from(licenses).where(eq(licenses.id, id)).limit(1);

    if (!license) {
      return NextResponse.json({ message: "License not found" }, { status: 404 });
    }

    const ownerRow = license.ownerUserId
      ? await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, license.ownerUserId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : null;

    const licenseUserRows = await db
      .select({
        userId: licenseOnUsers.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(licenseOnUsers)
      .leftJoin(users, eq(licenseOnUsers.userId, users.id))
      .where(eq(licenseOnUsers.licenseId, id));

    return NextResponse.json({
      message: "License fetched successfully",
      license: {
        ...license,
        owner: ownerRow,
        licenseUsers: licenseUserRows.map((r) => ({
          user: { id: r.userId, name: r.userName, email: r.userEmail },
        })),
        _count: { licenseUsers: licenseUserRows.length },
      },
    });
  } catch (error) {
    console.error("Error fetching license:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
};

export const deactivateLicense = async (
  req: ExtendedNextRequest,
  context?: RequestContext
) => {
  try {
    const { userId, licenseId } = await req.json();

    const targetUserId = context ? (await context.params).id : userId;

    const currentUser = req.session?.user;
    if (
      currentUser?.role !== "ADMIN" &&
      currentUser?.role !== "TEACHER" &&
      currentUser?.id !== targetUserId
    ) {
      return NextResponse.json(
        { message: "You can only deactivate license for yourself" },
        { status: 403 }
      );
    }

    const [licenseUser] = await db
      .select()
      .from(licenseOnUsers)
      .where(and(eq(licenseOnUsers.userId, targetUserId), eq(licenseOnUsers.licenseId, licenseId)))
      .limit(1);

    if (!licenseUser) {
      return NextResponse.json(
        { message: "License not found for this user" },
        { status: 404 }
      );
    }

    const [license] = await db.select().from(licenses).where(eq(licenses.id, licenseId)).limit(1);

    await db.transaction(async (tx) => {
      await tx
        .delete(licenseOnUsers)
        .where(
          and(eq(licenseOnUsers.userId, targetUserId), eq(licenseOnUsers.licenseId, licenseId))
        );
      await tx
        .update(users)
        .set({ licenseId: null, expiredDate: null, updatedAt: new Date() })
        .where(eq(users.id, targetUserId));
      if (license) {
        await tx
          .update(licenses)
          .set({ usedLicenses: Math.max(0, (license.usedLicenses ?? 1) - 1), updatedAt: new Date() })
          .where(eq(licenses.id, licenseId));
      }
    });

    return NextResponse.json({ message: "License deactivated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deactivating license:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
};

export const updateUserLicense = async (
  req: ExtendedNextRequest,
  context?: RequestContext
) => {
  try {
    const { userId, oldLicenseId, newLicenseKey } = await req.json();

    const targetUserId = context ? (await context.params).id : userId;

    const currentUser = req.session?.user;
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "TEACHER") {
      return NextResponse.json(
        { message: "Only admins and teachers can update user licenses" },
        { status: 403 }
      );
    }

    const [newLicense] = await db
      .select()
      .from(licenses)
      .where(eq(licenses.key, newLicenseKey))
      .limit(1);

    if (!newLicense) {
      return NextResponse.json({ message: "New license not found" }, { status: 404 });
    }

    const newLicenseUserRows = await db
      .select()
      .from(licenseOnUsers)
      .where(eq(licenseOnUsers.licenseId, newLicense.id));

    if (newLicenseUserRows.length >= newLicense.maxUsers) {
      return NextResponse.json({ message: "New license is already fully used" }, { status: 400 });
    }

    if (newLicense.expiresAt && newLicense.expiresAt < new Date()) {
      return NextResponse.json({ message: "New license has expired" }, { status: 400 });
    }

    const [existingNewLicenseUser] = await db
      .select()
      .from(licenseOnUsers)
      .where(and(eq(licenseOnUsers.userId, targetUserId), eq(licenseOnUsers.licenseId, newLicense.id)))
      .limit(1);

    if (existingNewLicenseUser) {
      return NextResponse.json({ message: "User already has this license" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      if (oldLicenseId) {
        await tx
          .delete(licenseOnUsers)
          .where(
            and(eq(licenseOnUsers.userId, targetUserId), eq(licenseOnUsers.licenseId, oldLicenseId))
          );
        const [oldLicense] = await tx
          .select()
          .from(licenses)
          .where(eq(licenses.id, oldLicenseId))
          .limit(1);
        if (oldLicense) {
          await tx
            .update(licenses)
            .set({ usedLicenses: Math.max(0, (oldLicense.usedLicenses ?? 1) - 1), updatedAt: new Date() })
            .where(eq(licenses.id, oldLicenseId));
        }
      }

      await tx.insert(licenseOnUsers).values({ userId: targetUserId, licenseId: newLicense.id });
      await tx
        .update(users)
        .set({ licenseId: newLicense.id, expiredDate: newLicense.expiresAt, updatedAt: new Date() })
        .where(eq(users.id, targetUserId));
      await tx
        .update(licenses)
        .set({ usedLicenses: (newLicense.usedLicenses ?? 0) + 1, updatedAt: new Date() })
        .where(eq(licenses.id, newLicense.id));
    });

    return NextResponse.json({ message: "License updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating user license:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
};

export const getFilteredLicenses = catchAsync(async (req: ExtendedNextRequest) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const schoolName = searchParams.get("schoolName");
  const licenseType = searchParams.get("licenseType");
  const ownerId = searchParams.get("ownerId");

  const offset = (page - 1) * limit;

  const conditions = [];
  if (schoolName) conditions.push(ilike(licenses.schoolName, `%${schoolName}%`));
  if (licenseType) conditions.push(eq(licenses.licenseType, licenseType));
  if (ownerId) conditions.push(eq(licenses.ownerUserId, ownerId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(licenses)
      .where(whereClause)
      .orderBy(sql`${licenses.createdAt} desc`)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(licenses).where(whereClause),
  ]);

  const enriched = await Promise.all(
    rows.map(async (license) => {
      const ownerRow = license.ownerUserId
        ? await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, license.ownerUserId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : null;

      const [{ licenseUserCount }] = await db
        .select({ licenseUserCount: sql<number>`count(*)::int` })
        .from(licenseOnUsers)
        .where(eq(licenseOnUsers.licenseId, license.id));

      return {
        ...license,
        owner: ownerRow,
        _count: { licenseUsers: licenseUserCount },
      };
    })
  );

  return NextResponse.json({
    message: "Licenses fetched successfully",
    data: enriched,
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

    const logs = await db
      .select({
        xpEarned: xpLogs.xpEarned,
        createdAt: xpLogs.createdAt,
        licenseId: users.licenseId,
      })
      .from(xpLogs)
      .leftJoin(users, eq(xpLogs.userId, users.id))
      .where(and(gte(xpLogs.createdAt, past30Days), lt(xpLogs.createdAt, now)));

    const xpByDateAndLicense: Record<string, Record<string, number>> = {};

    for (const log of logs) {
      const dateStr = log.createdAt.toISOString().slice(0, 10);
      const licenseId = log.licenseId;
      if (!licenseId) continue;

      if (!xpByDateAndLicense[dateStr]) xpByDateAndLicense[dateStr] = {};
      if (!xpByDateAndLicense[dateStr][licenseId]) xpByDateAndLicense[dateStr][licenseId] = 0;
      xpByDateAndLicense[dateStr][licenseId] += log.xpEarned;
    }

    return NextResponse.json({
      success: true,
      data: xpByDateAndLicense,
      message: "XP calculation completed successfully",
    });
  } catch (error) {
    console.error("Error calculating XP:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" });
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
      // Two-step: get userIds with this license, then sum their xpLogs
      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.licenseId, license_id));
      const userIds = userRows.map((r) => r.id);

      if (userIds.length > 0) {
        const logs = await db
          .select({ xpEarned: xpLogs.xpEarned })
          .from(xpLogs)
          .where(
            and(
              inArray(xpLogs.userId, userIds),
              gte(xpLogs.createdAt, past30Days),
              lt(xpLogs.createdAt, now)
            )
          );
        totalXp = logs.reduce((sum, l) => sum + l.xpEarned, 0);
      }
    } else {
      // All users with any license
      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .where(isNotNull(users.licenseId));
      const userIds = userRows.map((r) => r.id);

      if (userIds.length > 0) {
        const logs = await db
          .select({ xpEarned: xpLogs.xpEarned })
          .from(xpLogs)
          .where(
            and(
              inArray(xpLogs.userId, userIds),
              gte(xpLogs.createdAt, past30Days),
              lt(xpLogs.createdAt, now)
            )
          );
        totalXp = logs.reduce((sum, l) => sum + l.xpEarned, 0);
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

export const getLessonXp = async (req: NextRequest, ctx: Context) => {
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
      if (activity.targetId === cleanArticleId) return true;
      if (activity.activityType === "MC_QUESTION") {
        const details = activity.details as any;
        return details?.articleId === cleanArticleId;
      }
      return false;
    });

    if (articleRelatedActivities.length === 0) {
      return NextResponse.json({
        success: true,
        total_xp: 0,
        breakdown: {},
        activities_count: 0,
      });
    }

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
          lte(userActivity.createdAt, latestTime)
        )
      );

    const allRelatedActivities = [...articleRelatedActivities, ...vocabularyActivities];
    const activityIds = allRelatedActivities.map((a) => a.id);

    const allXpLogs = await db
      .select({
        xpEarned: xpLogs.xpEarned,
        activityType: xpLogs.activityType,
        activityId: xpLogs.activityId,
      })
      .from(xpLogs)
      .where(and(eq(xpLogs.userId, userId), inArray(xpLogs.activityId, activityIds)));

    if (allXpLogs.length === 0) {
      return NextResponse.json({
        success: true,
        total_xp: 0,
        breakdown: {},
        activities_count: 0,
      });
    }

    const totalXp = allXpLogs.reduce((total, log) => total + (log.xpEarned || 0), 0);

    const xpByActivityType = allXpLogs.reduce(
      (acc, log) => {
        const type = log.activityType;
        if (!acc[type]) acc[type] = { totalXp: 0, count: 0 };
        acc[type].totalXp += log.xpEarned || 0;
        acc[type].count += 1;
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

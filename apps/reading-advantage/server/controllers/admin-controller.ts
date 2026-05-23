import { NextRequest, NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { getCurrentUser } from "@/lib/session";
import {
  db,
  eq,
  and,
  gte,
  lte,
  inArray,
  desc,
  sql,
  isNotNull,
} from "@reading-advantage/db";
import {
  users,
  schools,
  licenses,
  licenseOnUsers,
  xpLogs,
  userActivity,
  articles,
  classrooms,
  classroomStudents,
  classroomTeachers,
  lessonRecords,
} from "@reading-advantage/db/schema";
import {
  AdminAlertsResponse,
  Alert,
  AdminOverviewResponse,
  AdminSegmentsResponse,
  SchoolSegment,
  TeacherEffectivenessResponse,
  TeacherMetric,
} from "@/types/dashboard";

// Map CEFR levels to numerical values
const cefrToNumber: Record<string, number> = {
  "A0-": 0,
  A0: 1,
  "A0+": 2,
  A1: 3,
  "A1+": 4,
  "A2-": 5,
  A2: 6,
  "A2+": 7,
  "B1-": 8,
  B1: 9,
  "B1+": 10,
  "B2-": 11,
  B2: 12,
  "B2+": 13,
  "C1-": 14,
  C1: 15,
  "C1+": 16,
  "C2-": 17,
  C2: 18,
};

export async function getAdminDashboard(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.license_id) {
      return NextResponse.json(
        { message: "User has no License" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedLicenseId = searchParams.get("licenseId");
    const timeframe = searchParams.get("timeframe") || "30d";

    let targetLicenseId = user.license_id;

    if (user.role === "SYSTEM" && requestedLicenseId) {
      targetLicenseId = requestedLicenseId;
    }

    const [licenseRow] = await db
      .select({
        id: licenses.id,
        schoolName: licenses.schoolName,
        maxUsers: licenses.maxUsers,
        expiresAt: licenses.expiresAt,
      })
      .from(licenses)
      .where(eq(licenses.id, targetLicenseId))
      .limit(1);

    if (!licenseRow) {
      return NextResponse.json(
        { message: "License not found" },
        { status: 404 }
      );
    }

    // Get all users in this license
    const licenseUserRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        cefrLevel: users.cefrLevel,
        xp: users.xp,
        level: users.level,
        licenseId: users.licenseId,
      })
      .from(licenseOnUsers)
      .innerJoin(users, eq(licenseOnUsers.userId, users.id))
      .where(eq(licenseOnUsers.licenseId, targetLicenseId));

    const licenseUsers = licenseUserRows;
    const userIds = licenseUsers.map((u) => u.id);

    const teacherCount = licenseUsers.filter((u) => u.role === "TEACHER").length;

    const cefrValues = licenseUsers
      .map((u) => cefrToNumber[u.cefrLevel])
      .filter((value) => value !== undefined);

    let averageCefrLevel = "A1";
    if (cefrValues.length > 0) {
      const averageCefrValue =
        cefrValues.reduce((sum, value) => sum + value, 0) / cefrValues.length;
      const numberToCefr = Object.fromEntries(
        Object.entries(cefrToNumber).map(([k, v]) => [v, k])
      );
      averageCefrLevel = numberToCefr[Math.round(averageCefrValue)] || "A1";
    }

    const daysAgo = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
    const activityStartDate = new Date();
    activityStartDate.setDate(activityStartDate.getDate() - daysAgo);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const xpLogRows =
      userIds.length > 0
        ? await db
            .select({ xpEarned: xpLogs.xpEarned })
            .from(xpLogs)
            .where(
              and(
                inArray(xpLogs.userId, userIds),
                gte(xpLogs.createdAt, activityStartDate)
              )
            )
        : [];

    const totalXp = xpLogRows.reduce((sum, log) => sum + log.xpEarned, 0);

    const activityRows =
      userIds.length > 0
        ? await db
            .select({
              id: userActivity.id,
              userId: userActivity.userId,
              activityType: userActivity.activityType,
              targetId: userActivity.targetId,
              completed: userActivity.completed,
              createdAt: userActivity.createdAt,
              details: userActivity.details,
              userName: users.name,
              userEmail: users.email,
            })
            .from(userActivity)
            .innerJoin(users, eq(userActivity.userId, users.id))
            .where(
              and(
                inArray(userActivity.userId, userIds),
                gte(userActivity.createdAt, sixMonthsAgo)
              )
            )
            .orderBy(desc(userActivity.createdAt))
            .limit(5000)
        : [];

    const articleIdSet = new Set<string>();
    activityRows.forEach((activity) => {
      if (
        (activity.activityType === "ARTICLE_READ" ||
          activity.activityType === "ARTICLE_RATING") &&
        activity.targetId
      ) {
        articleIdSet.add(activity.targetId);
      }
    });

    const articleRows =
      articleIdSet.size > 0
        ? await db
            .select({
              id: articles.id,
              cefrLevel: articles.cefrLevel,
              title: articles.title,
              raLevel: articles.raLevel,
            })
            .from(articles)
            .where(inArray(articles.id, Array.from(articleIdSet)))
        : [];

    const articleMap = new Map(articleRows.map((a) => [a.id, a]));

    const filteredActivityLog = activityRows.map((activity) => {
      let details: any = activity.details || {};

      const article = articleMap.get(activity.targetId ?? "");
      if (article) {
        details = {
          ...details,
          cefr_level: article.cefrLevel,
          title: article.title,
          level: article.raLevel,
        };
      }

      return {
        id: activity.id,
        userId: activity.userId,
        activityType: activity.activityType,
        targetId: activity.targetId,
        completed: activity.completed,
        timestamp: activity.createdAt,
        details,
        user: {
          id: activity.userId,
          name: activity.userName,
          email: activity.userEmail,
        },
      };
    });

    const licenseData = [
      {
        id: licenseRow.id,
        school_name: licenseRow.schoolName,
        total_licenses: licenseRow.maxUsers,
        used_licenses: licenseUsers.length,
        expires_at: licenseRow.expiresAt,
      },
    ];

    return NextResponse.json(
      {
        data: {
          license: licenseData,
          userData: licenseUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            cefr_level: u.cefrLevel,
            xp: u.xp,
            level: u.level,
            license_id: u.licenseId,
          })),
          xpEarned: totalXp,
          filteredActivityLog,
          averageCefrLevel,
          teacherCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in getAdminDashboard:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getAdminAlerts(req: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    let licenseId: string | null = null;

    if (user.role === "SYSTEM") {
      licenseId = searchParams.get("licenseId");
    } else if (user.role === "ADMIN") {
      licenseId = user.license_id || null;

      if (!licenseId) {
        return NextResponse.json(
          { code: "FORBIDDEN", message: "Admin user has no license assigned" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const alerts: Alert[] = [];

    let targetSchoolId: string | null = null;

    if (licenseId) {
      const [lr] = await db
        .select({ schoolId: licenses.schoolId })
        .from(licenses)
        .where(eq(licenses.id, licenseId))
        .limit(1);

      if (!lr?.schoolId) {
        return NextResponse.json({
          alerts: [],
          summary: { total: 0, critical: 0, unacknowledged: 0 },
          cache: { cached: false, generatedAt: new Date().toISOString() },
        });
      }
      targetSchoolId = lr.schoolId;
    }

    const schoolRows = targetSchoolId
      ? await db
          .select({ id: schools.id, name: schools.name })
          .from(schools)
          .where(eq(schools.id, targetSchoolId))
      : await db.select({ id: schools.id, name: schools.name }).from(schools);

    if (schoolRows.length === 0) {
      return NextResponse.json({
        alerts: [],
        summary: { total: 0, critical: 0, unacknowledged: 0 },
        cache: { cached: false, generatedAt: new Date().toISOString() },
      });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const schoolIds = schoolRows.map((s) => s.id);

    // Get users per school
    const schoolUserRows = await db
      .select({ id: users.id, role: users.role, schoolId: users.schoolId })
      .from(users)
      .where(inArray(users.schoolId, schoolIds));

    const studentIds = schoolUserRows
      .filter((u) => u.role === "STUDENT")
      .map((u) => u.id);

    // Get recently active students
    const recentActivityRows =
      studentIds.length > 0
        ? await db
            .selectDistinct({ userId: userActivity.userId })
            .from(userActivity)
            .where(
              and(
                inArray(userActivity.userId, studentIds),
                gte(userActivity.createdAt, thirtyDaysAgo)
              )
            )
        : [];
    const activeStudentSet = new Set(recentActivityRows.map((r) => r.userId));

    // Get licenses per school
    const schoolLicenses = await db
      .select({
        id: licenses.id,
        schoolId: licenses.schoolId,
        maxUsers: licenses.maxUsers,
        expiresAt: licenses.expiresAt,
      })
      .from(licenses)
      .where(inArray(licenses.schoolId, schoolIds));

    const licenseIds = schoolLicenses.map((l) => l.id);
    const licenseUserCountRows =
      licenseIds.length > 0
        ? await db
            .select({
              licenseId: licenseOnUsers.licenseId,
              count: sql<number>`count(*)::int`,
            })
            .from(licenseOnUsers)
            .where(inArray(licenseOnUsers.licenseId, licenseIds))
            .groupBy(licenseOnUsers.licenseId)
        : [];
    const licenseUserCountMap = new Map(
      licenseUserCountRows.map((r) => [r.licenseId, r.count])
    );

    // Build school → data maps
    const schoolUsersMap = new Map<string, string[]>();
    schoolUserRows.forEach((u) => {
      if (!u.schoolId) return;
      if (!schoolUsersMap.has(u.schoolId))
        schoolUsersMap.set(u.schoolId, []);
      if (u.role === "STUDENT") schoolUsersMap.get(u.schoolId)!.push(u.id);
    });

    const schoolLicensesMap = new Map<
      string,
      typeof schoolLicenses
    >();
    schoolLicenses.forEach((l) => {
      if (!l.schoolId) return;
      if (!schoolLicensesMap.has(l.schoolId))
        schoolLicensesMap.set(l.schoolId, []);
      schoolLicensesMap.get(l.schoolId)!.push(l);
    });

    schoolRows.forEach((school) => {
      const schoolStudentIds = schoolUsersMap.get(school.id) || [];
      const activeCount = schoolStudentIds.filter((id) =>
        activeStudentSet.has(id)
      ).length;

      if (schoolStudentIds.length > 0) {
        const activeRate = (activeCount / schoolStudentIds.length) * 100;
        if (activeRate < 30) {
          alerts.push({
            id: `low-activity-${school.id}`,
            type: "warning",
            severity: activeRate < 10 ? "high" : "medium",
            title: "Low Student Activity",
            message: `Only ${Math.round(activeRate)}% of students in ${school.name} were active in the last 30 days.`,
            schoolId: school.id,
            schoolName: school.name,
            createdAt: new Date().toISOString(),
            acknowledged: false,
          });
        }
      }

      const lics = schoolLicensesMap.get(school.id) || [];
      lics.forEach((license) => {
        const expiryDate = license.expiresAt;
        if (expiryDate && new Date(expiryDate) <= sevenDaysFromNow) {
          const daysUntilExpiry = Math.ceil(
            (new Date(expiryDate).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          alerts.push({
            id: `expiring-license-${license.id}`,
            type: "warning",
            severity: daysUntilExpiry <= 3 ? "critical" : "high",
            title: "License Expiring Soon",
            message: `A license for ${school.name} expires in ${daysUntilExpiry} day(s).`,
            schoolId: school.id,
            schoolName: school.name,
            createdAt: new Date().toISOString(),
            acknowledged: false,
          });
        }
      });

      const licensesUsed = lics.reduce(
        (sum, l) => sum + (licenseUserCountMap.get(l.id) || 0),
        0
      );
      const totalSeats = lics.reduce((sum, l) => sum + (l.maxUsers || 0), 0);

      if (totalSeats > 0 && licensesUsed >= totalSeats * 0.9) {
        alerts.push({
          id: `license-capacity-${school.id}`,
          type: "warning",
          severity: licensesUsed >= totalSeats ? "critical" : "high",
          title: "License Capacity Warning",
          message: `${school.name} is using ${licensesUsed} of ${totalSeats} available license seats (${Math.round((licensesUsed / totalSeats) * 100)}%).`,
          schoolId: school.id,
          schoolName: school.name,
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    });

    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    alerts.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    const response: AdminAlertsResponse = {
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        unacknowledged: alerts.filter((a) => !a.acknowledged).length,
      },
      cache: { cached: false, generatedAt: new Date().toISOString() },
    };

    const duration = Date.now() - startTime;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[Controller] getAdminAlerts - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch alerts",
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: { "X-Response-Time": `${Date.now() - startTime}ms` },
      }
    );
  }
}

export async function getAdminOverview(req: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "30d";
    const requestedLicenseId = searchParams.get("licenseId");

    let targetLicenseId: string | null = null;

    if (user.role === "SYSTEM") {
      targetLicenseId = requestedLicenseId;
    } else if (user.role === "ADMIN") {
      targetLicenseId = user.license_id || null;
    }

    const now = new Date();
    const daysAgo = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get license user IDs if filtered
    let licenseUserIds: string[] = [];
    if (targetLicenseId) {
      const rows = await db
        .select({ userId: licenseOnUsers.userId })
        .from(licenseOnUsers)
        .where(eq(licenseOnUsers.licenseId, targetLicenseId));
      licenseUserIds = rows.map((r) => r.userId);
    }

    const licenseFilter =
      licenseUserIds.length > 0
        ? inArray(users.id, licenseUserIds)
        : undefined;

    const [
      totalSchools,
      totalStudents,
      totalTeachers,
      totalReadingSessions,
      averageReadingLevelResult,
      newUsersToday,
    ] = await Promise.all([
      // Total schools / licenses
      targetLicenseId
        ? db
            .select({ count: sql<number>`count(*)::int` })
            .from(licenses)
            .where(eq(licenses.id, targetLicenseId))
            .then((r) => r[0]?.count ?? 0)
        : db
            .select({ count: sql<number>`count(*)::int` })
            .from(schools)
            .then((r) => r[0]?.count ?? 0),

      // Total students
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "STUDENT"), licenseFilter))
        .then((r) => r[0]?.count ?? 0),

      // Total teachers
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            inArray(users.role, ["TEACHER", "ADMIN"] as any),
            licenseFilter
          )
        )
        .then((r) => r[0]?.count ?? 0),

      // Total reading sessions
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(lessonRecords)
        .where(
          and(
            gte(lessonRecords.createdAt, startDate),
            licenseUserIds.length > 0
              ? inArray(lessonRecords.userId, licenseUserIds)
              : undefined
          )
        )
        .then((r) => r[0]?.count ?? 0),

      // Average reading level
      db
        .select({ avgLevel: sql<number>`avg(${users.level})::float` })
        .from(users)
        .where(and(eq(users.role, "STUDENT"), licenseFilter))
        .then((r) => r[0]?.avgLevel ?? 0),

      // New users today
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(gte(users.createdAt, todayStart), licenseFilter))
        .then((r) => r[0]?.count ?? 0),
    ]);

    // Active users/teachers require activity subquery — compute after license user IDs are known
    const activeUserIds =
      licenseUserIds.length > 0
        ? await db
            .selectDistinct({ userId: userActivity.userId })
            .from(userActivity)
            .where(
              and(
                gte(userActivity.createdAt, startDate),
                inArray(userActivity.userId, licenseUserIds)
              )
            )
            .then((r) => r.map((x) => x.userId))
        : await db
            .selectDistinct({ userId: userActivity.userId })
            .from(userActivity)
            .where(gte(userActivity.createdAt, startDate))
            .then((r) => r.map((x) => x.userId));

    const [activeTeachers, activeUsers, activeClassrooms] = await Promise.all([
      // Active teachers
      activeUserIds.length > 0
        ? db
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(
              and(
                inArray(users.role, ["TEACHER", "ADMIN"] as any),
                inArray(users.id, activeUserIds)
              )
            )
            .then((r) => r[0]?.count ?? 0)
        : Promise.resolve(0),

      // Active users
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            licenseFilter,
            activeUserIds.length > 0
              ? inArray(users.id, activeUserIds)
              : sql`false`
          )
        )
        .then((r) => r[0]?.count ?? 0),

      // Active classrooms (distinct classroom IDs from classroomStudents where student is active)
      (async () => {
        const filteredActive = licenseUserIds.length > 0
          ? activeUserIds.filter((id) =>
              licenseUserIds.includes(id)
            )
          : activeUserIds;

        if (filteredActive.length === 0) return 0;

        const [{ count }] = await db
          .select({
            count: sql<number>`count(DISTINCT ${classroomStudents.classroomId})::int`,
          })
          .from(classroomStudents)
          .where(inArray(classroomStudents.studentId, filteredActive));

        return count;
      })(),
    ]);

    const activeUsersToday =
      licenseUserIds.length > 0
        ? await db
            .selectDistinct({ userId: userActivity.userId })
            .from(userActivity)
            .where(
              and(
                gte(userActivity.createdAt, todayStart),
                inArray(userActivity.userId, licenseUserIds)
              )
            )
            .then((r) => r.length)
        : await db
            .selectDistinct({ userId: userActivity.userId })
            .from(userActivity)
            .where(gte(userActivity.createdAt, todayStart))
            .then((r) => r.length);

    const readingSessionsToday = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessonRecords)
      .where(
        and(
          gte(lessonRecords.createdAt, todayStart),
          licenseUserIds.length > 0
            ? inArray(lessonRecords.userId, licenseUserIds)
            : undefined
        )
      )
      .then((r) => r[0]?.count ?? 0);

    const response: AdminOverviewResponse = {
      summary: {
        totalSchools,
        totalStudents,
        totalTeachers,
        activeTeachers,
        activeUsers30d: activeUsers,
        activeClassrooms,
        totalReadingSessions,
        averageReadingLevel:
          Math.round((averageReadingLevelResult || 0) * 10) / 10,
      },
      recentActivity: {
        newUsersToday,
        activeUsersToday,
        readingSessionsToday,
      },
      systemHealth: {
        status: "healthy",
        lastChecked: new Date().toISOString(),
      },
      cache: { cached: false, generatedAt: new Date().toISOString() },
    };

    const duration = Date.now() - startTime;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[Controller] getAdminOverview - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch admin overview",
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: { "X-Response-Time": `${Date.now() - startTime}ms` },
      }
    );
  }
}

export async function getSchoolSegments(req: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    let licenseId: string | null = null;

    if (user.role === "SYSTEM") {
      licenseId = searchParams.get("licenseId");
    } else if (user.role === "ADMIN") {
      licenseId = user.license_id || null;

      if (!licenseId) {
        return NextResponse.json(
          { code: "FORBIDDEN", message: "Admin user has no license assigned" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    let targetSchoolId: string | null = null;

    if (licenseId) {
      const [lr] = await db
        .select({ schoolId: licenses.schoolId })
        .from(licenses)
        .where(eq(licenses.id, licenseId))
        .limit(1);

      if (lr?.schoolId) {
        targetSchoolId = lr.schoolId;
      }
    }

    const schoolRows = targetSchoolId
      ? await db
          .select({ id: schools.id, name: schools.name })
          .from(schools)
          .where(eq(schools.id, targetSchoolId))
      : await db.select({ id: schools.id, name: schools.name }).from(schools);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const schoolIds = schoolRows.map((s) => s.id);

    if (schoolIds.length === 0) {
      const response: AdminSegmentsResponse = {
        segments: [],
        summary: { totalSchools: 0, averageActiveRate: 0, totalLicensesUsed: 0 },
        cache: { cached: false, generatedAt: new Date().toISOString() },
      };
      return NextResponse.json(response, {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      });
    }

    // Get users per school
    const schoolUserRows = await db
      .select({
        id: users.id,
        role: users.role,
        level: users.level,
        xp: users.xp,
        schoolId: users.schoolId,
      })
      .from(users)
      .where(inArray(users.schoolId, schoolIds));

    const allUserIds = schoolUserRows.map((u) => u.id);

    // Recently active users
    const recentActivityRows =
      allUserIds.length > 0
        ? await db
            .selectDistinct({ userId: userActivity.userId })
            .from(userActivity)
            .where(
              and(
                inArray(userActivity.userId, allUserIds),
                gte(userActivity.createdAt, thirtyDaysAgo)
              )
            )
        : [];
    const activeUserSet = new Set(recentActivityRows.map((r) => r.userId));

    // Get licenses per school
    const schoolLicenses = await db
      .select({
        id: licenses.id,
        schoolId: licenses.schoolId,
        maxUsers: licenses.maxUsers,
      })
      .from(licenses)
      .where(inArray(licenses.schoolId, schoolIds));

    const licenseIds = schoolLicenses.map((l) => l.id);
    const licenseUserCountRows =
      licenseIds.length > 0
        ? await db
            .select({
              licenseId: licenseOnUsers.licenseId,
              count: sql<number>`count(*)::int`,
            })
            .from(licenseOnUsers)
            .where(inArray(licenseOnUsers.licenseId, licenseIds))
            .groupBy(licenseOnUsers.licenseId)
        : [];
    const licenseUserCountMap = new Map(
      licenseUserCountRows.map((r) => [r.licenseId, r.count])
    );

    // Build maps
    const schoolUsersMap = new Map<string, typeof schoolUserRows>();
    schoolUserRows.forEach((u) => {
      if (!u.schoolId) return;
      if (!schoolUsersMap.has(u.schoolId)) schoolUsersMap.set(u.schoolId, []);
      schoolUsersMap.get(u.schoolId)!.push(u);
    });

    const schoolLicensesMap = new Map<string, typeof schoolLicenses>();
    schoolLicenses.forEach((l) => {
      if (!l.schoolId) return;
      if (!schoolLicensesMap.has(l.schoolId))
        schoolLicensesMap.set(l.schoolId, []);
      schoolLicensesMap.get(l.schoolId)!.push(l);
    });

    const segments: SchoolSegment[] = schoolRows.map((school) => {
      const schoolUserList = schoolUsersMap.get(school.id) || [];
      const students = schoolUserList.filter((u) => u.role === "STUDENT");
      const teachers = schoolUserList.filter(
        (u) => u.role === "TEACHER" || u.role === "ADMIN"
      );

      const activeUsers = schoolUserList.filter((u) =>
        activeUserSet.has(u.id)
      ).length;
      const totalUsers = schoolUserList.length;
      const activeRate =
        totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

      const avgLevel =
        students.length > 0
          ? students.reduce((sum, s) => sum + s.level, 0) / students.length
          : 0;

      const totalXp = students.reduce((sum, s) => sum + s.xp, 0);

      const lics = schoolLicensesMap.get(school.id) || [];
      const licensesUsed = lics.reduce(
        (sum, l) => sum + (licenseUserCountMap.get(l.id) || 0),
        0
      );
      const licensesTotal = lics.reduce(
        (sum, l) => sum + (l.maxUsers || 0),
        0
      );

      return {
        schoolId: school.id,
        schoolName: school.name,
        studentCount: students.length,
        teacherCount: teachers.length,
        activeRate,
        averageLevel: Math.round(avgLevel * 10) / 10,
        totalXp,
        licensesUsed,
        licensesTotal,
      };
    });

    const summary = {
      totalSchools: segments.length,
      averageActiveRate:
        segments.length > 0
          ? Math.round(
              segments.reduce((sum, s) => sum + s.activeRate, 0) /
                segments.length
            )
          : 0,
      totalLicensesUsed: segments.reduce((sum, s) => sum + s.licensesUsed, 0),
    };

    const response: AdminSegmentsResponse = {
      segments,
      summary,
      cache: { cached: false, generatedAt: new Date().toISOString() },
    };

    const duration = Date.now() - startTime;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[Controller] getSchoolSegments - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch school segments",
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: { "X-Response-Time": `${Date.now() - startTime}ms` },
      }
    );
  }
}

export async function getTeacherEffectiveness(req: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedLicenseId = searchParams.get("licenseId");
    const timeframe = searchParams.get("timeframe") || "30d";

    let targetLicenseId: string | null = null;

    if (user.role === "SYSTEM") {
      targetLicenseId = requestedLicenseId;
    } else if (user.role === "ADMIN") {
      targetLicenseId = user.license_id || null;
    }

    const daysAgo = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get license user IDs if filtered
    let licenseUserIds: string[] = [];
    if (targetLicenseId) {
      const rows = await db
        .select({ userId: licenseOnUsers.userId })
        .from(licenseOnUsers)
        .where(eq(licenseOnUsers.licenseId, targetLicenseId));
      licenseUserIds = rows.map((r) => r.userId);
    }

    // Get teachers
    const teacherRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(
        and(
          inArray(users.role, ["TEACHER", "ADMIN"] as any),
          licenseUserIds.length > 0
            ? inArray(users.id, licenseUserIds)
            : undefined
        )
      );

    if (teacherRows.length === 0) {
      const response: TeacherEffectivenessResponse = {
        teachers: [],
        summary: {
          totalTeachers: 0,
          averageEngagement: 0,
          totalStudents: 0,
          totalActiveStudents: 0,
        },
        cache: { cached: false, generatedAt: new Date().toISOString() },
      };
      return NextResponse.json(response, {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      });
    }

    const teacherIds = teacherRows.map((t) => t.id);

    // Get classroom assignments for teachers
    const ctRows = await db
      .select({
        teacherId: classroomTeachers.teacherId,
        classroomId: classroomTeachers.classroomId,
      })
      .from(classroomTeachers)
      .where(inArray(classroomTeachers.teacherId, teacherIds));

    const classroomIds = [...new Set(ctRows.map((r) => r.classroomId))];

    const [classroomRows, csRows] = classroomIds.length > 0
      ? await Promise.all([
          db
            .select({ id: classrooms.id, name: classrooms.name })
            .from(classrooms)
            .where(inArray(classrooms.id, classroomIds)),
          db
            .select({
              classroomId: classroomStudents.classroomId,
              studentId: classroomStudents.studentId,
            })
            .from(classroomStudents)
            .where(inArray(classroomStudents.classroomId, classroomIds)),
        ])
      : [[], []];

    const allStudentIds = [...new Set(csRows.map((r) => r.studentId))];

    // Get active students
    const activeStudentRows =
      allStudentIds.length > 0
        ? await db
            .selectDistinct({ userId: userActivity.userId })
            .from(userActivity)
            .where(
              and(
                inArray(userActivity.userId, allStudentIds),
                gte(userActivity.createdAt, startDate)
              )
            )
        : [];
    const activeStudentSet = new Set(activeStudentRows.map((r) => r.userId));

    // Build maps
    const classroomMap = new Map(classroomRows.map((c) => [c.id, c]));
    const csMap = new Map<string, string[]>();
    csRows.forEach((r) => {
      if (!csMap.has(r.classroomId)) csMap.set(r.classroomId, []);
      csMap.get(r.classroomId)!.push(r.studentId);
    });

    const ctMap = new Map<string, string[]>();
    ctRows.forEach((r) => {
      if (!ctMap.has(r.teacherId)) ctMap.set(r.teacherId, []);
      ctMap.get(r.teacherId)!.push(r.classroomId);
    });

    const teacherMetrics: TeacherMetric[] = teacherRows.map((teacher) => {
      const tcClassroomIds = ctMap.get(teacher.id) || [];
      const classroomList = tcClassroomIds.map((cid) => {
        const classroom = classroomMap.get(cid);
        const studentIds = csMap.get(cid) || [];
        const activeCount = studentIds.filter((sid) =>
          activeStudentSet.has(sid)
        ).length;
        return {
          id: cid,
          name: classroom?.name || "Unnamed Classroom",
          studentCount: studentIds.length,
          activeCount,
        };
      });

      const totalStudents = classroomList.reduce(
        (sum, c) => sum + c.studentCount,
        0
      );
      const totalActive = classroomList.reduce(
        (sum, c) => sum + c.activeCount,
        0
      );
      const engagementRate =
        totalStudents > 0
          ? Math.round((totalActive / totalStudents) * 100)
          : 0;

      return {
        teacherId: teacher.id,
        teacherName: teacher.name || "Unknown",
        email: teacher.email || "",
        studentCount: totalStudents,
        activeStudents: totalActive,
        engagementRate,
        classroomCount: classroomList.length,
        classrooms: classroomList,
      };
    });

    const filteredTeachers = teacherMetrics
      .filter((t) => t.studentCount > 0)
      .sort((a, b) => b.engagementRate - a.engagementRate);

    const totalStudents = filteredTeachers.reduce(
      (sum, t) => sum + t.studentCount,
      0
    );
    const totalActive = filteredTeachers.reduce(
      (sum, t) => sum + t.activeStudents,
      0
    );
    const averageEngagement =
      filteredTeachers.length > 0
        ? Math.round(
            filteredTeachers.reduce((sum, t) => sum + t.engagementRate, 0) /
              filteredTeachers.length
          )
        : 0;

    const response: TeacherEffectivenessResponse = {
      teachers: filteredTeachers,
      summary: {
        totalTeachers: filteredTeachers.length,
        averageEngagement,
        totalStudents,
        totalActiveStudents: totalActive,
      },
      cache: { cached: false, generatedAt: new Date().toISOString() },
    };

    const duration = Date.now() - startTime;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[Controller] getTeacherEffectiveness - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch teacher effectiveness data",
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: { "X-Response-Time": `${Date.now() - startTime}ms` },
      }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExtendedNextRequest } from "./auth-controller";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@prisma/client";
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

    // Get licenseId from query params (for SYSTEM role) or use user's license (for ADMIN role)
    const { searchParams } = new URL(req.url);
    const requestedLicenseId = searchParams.get("licenseId");
    const timeframe = searchParams.get("timeframe") || "30d";

    let targetLicenseId = user.license_id;

    // If user is SYSTEM and provided a licenseId, use that instead
    if (user.role === Role.SYSTEM && requestedLicenseId) {
      targetLicenseId = requestedLicenseId;
    }

    const license = await prisma.license.findUnique({
      where: { id: targetLicenseId },
      include: {
        licenseUsers: {
          include: {
            user: true,
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

    const licenseUsers = license.licenseUsers.map((lu) => lu.user);

    const teacherCount = licenseUsers.filter(
      (user) => user.role === Role.TEACHER
    ).length;

    const cefrValues = licenseUsers
      .map((user) => cefrToNumber[user.cefrLevel])
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

    // Calculate date range based on timeframe
    const daysAgo = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
    const activityStartDate = new Date();
    activityStartDate.setDate(activityStartDate.getDate() - daysAgo);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userIds = licenseUsers.map((user) => user.id);

    const xpLogs = await prisma.xPLog.findMany({
      where: {
        userId: { in: userIds },
        createdAt: { gte: activityStartDate },
      },
    });

    const totalXp = xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);

    // Get user activities for the last 6 months
    const userActivities = await prisma.userActivity.findMany({
      where: {
        userId: { in: userIds },
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        id: true,
        userId: true,
        activityType: true,
        targetId: true,
        completed: true,
        createdAt: true,
        details: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    // Get article data for activities that reference articles
    const articleIds = new Set<string>();
    userActivities.forEach((activity) => {
      // Only get article IDs from ARTICLE_READ and ARTICLE_RATING activities
      if (
        (activity.activityType === "ARTICLE_READ" ||
          activity.activityType === "ARTICLE_RATING") &&
        activity.targetId
      ) {
        articleIds.add(activity.targetId);
      }
    });

    // Fetch article data for CEFR levels
    const articles = await prisma.article.findMany({
      where: {
        id: { in: Array.from(articleIds) },
      },
      select: {
        id: true,
        cefrLevel: true,
        title: true,
        raLevel: true,
      },
    });

    const articleMap = new Map(
      articles.map((article) => [article.id, article])
    );

    const filteredActivityLog = userActivities.map((activity) => {
      let details: any = activity.details || {};

      // Add CEFR level to details if this activity references an article
      const article = articleMap.get(activity.targetId);
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
        details: details,
        user: activity.user,
      };
    });

    // Count how many activities have CEFR levels
    const activitiesWithCEFR = filteredActivityLog.filter(
      (a) => a.details?.cefr_level
    ).length;

    const licenseData = [
      {
        id: license.id,
        school_name: license.schoolName,
        total_licenses: license.maxUsers,
        used_licenses: license.licenseUsers.length,
        expires_at: license.expiresAt,
      },
    ];

    return NextResponse.json(
      {
        data: {
          license: licenseData,
          userData: licenseUsers.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            cefr_level: user.cefrLevel,
            xp: user.xp,
            level: user.level,
            license_id: user.licenseId,
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

/**
 * Get admin alerts
 * @param req - Next request
 * @returns Admin alerts response
 */
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

    // SYSTEM role can select any license via query parameter
    // ADMIN role must use their own license from session
    if (user.role === Role.SYSTEM) {
      licenseId = searchParams.get("licenseId");
    } else if (user.role === Role.ADMIN) {
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

    // Build where clause for schools
    let schoolWhere: any = {};

    // If licenseId is provided, only get the school associated with that license
    if (licenseId) {
      const license = await prisma.license.findUnique({
        where: { id: licenseId },
        select: { schoolId: true },
      });

      if (license?.schoolId) {
        schoolWhere = { id: license.schoolId };
      } else {
        // If license not found or has no school, return empty alerts
        return NextResponse.json({
          alerts: [],
          summary: {
            total: 0,
            critical: 0,
            unacknowledged: 0,
          },
          cache: {
            cached: false,
            generatedAt: new Date().toISOString(),
          },
        });
      }
    }

    // Get schools to check for issues (filtered by licenseId if provided)
    const schools = await prisma.school.findMany({
      where: schoolWhere,
      include: {
        users: {
          select: {
            id: true,
            role: true,
            userActivities: {
              select: {
                createdAt: true,
              },
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        licenses: {
          select: {
            id: true,
            maxUsers: true,
            expiresAt: true,
            licenseUsers: true,
          },
        },
      },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Check each school for potential issues
    schools.forEach((school) => {
      const students = school.users.filter((u) => u.role === Role.STUDENT);
      const activeStudents = students.filter((u) =>
        u.userActivities.some((a) => new Date(a.createdAt) >= thirtyDaysAgo)
      );

      // Alert: Low student activity
      if (students.length > 0) {
        const activeRate = (activeStudents.length / students.length) * 100;
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

      // Alert: Expiring licenses
      school.licenses.forEach((license) => {
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

      // Alert: License capacity issues
      const licensesUsed = school.licenses.reduce(
        (sum, lic) => sum + (lic.licenseUsers?.length || 0),
        0
      );
      const totalSeats = school.licenses.reduce(
        (sum, lic) => sum + (lic.maxUsers || 0),
        0
      );

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

    // Sort alerts by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
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
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
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
        headers: {
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}

/**
 * Get admin overview
 * @param req - Next request
 * @returns Admin overview response
 */
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "30d";
    const requestedLicenseId = searchParams.get("licenseId");

    // Determine which license to query
    let targetLicenseId: string | null = null;

    if (user.role === Role.SYSTEM) {
      // SYSTEM users can query any license or all licenses
      targetLicenseId = requestedLicenseId;
    } else if (user.role === Role.ADMIN) {
      // ADMIN users can only query their own license
      targetLicenseId = user.license_id || null;
    }

    // Calculate date range
    const now = new Date();
    const daysAgo = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);

    // Build where clause for license filtering
    const licenseFilter = targetLicenseId
      ? {
          licenseOnUsers: {
            some: {
              licenseId: targetLicenseId,
            },
          },
        }
      : {};

    // Get summary data (parallel queries)
    const [
      totalSchools,
      totalStudents,
      totalTeachers,
      activeTeachers,
      activeUsers,
      activeClassrooms,
      totalReadingSessions,
      averageReadingLevel,
      newUsersToday,
      activeUsersToday,
      readingSessionsToday,
    ] = await Promise.all([
      // Total schools
      targetLicenseId
        ? prisma.license.count({ where: { id: targetLicenseId } })
        : prisma.school.count(),

      // Total students
      prisma.user.count({
        where: {
          role: Role.STUDENT,
          ...licenseFilter,
        },
      }),

      // Total teachers
      prisma.user.count({
        where: {
          role: { in: [Role.TEACHER, Role.ADMIN] },
          ...licenseFilter,
        },
      }),

      // Active teachers (with activity in timeframe)
      prisma.user.count({
        where: {
          role: { in: [Role.TEACHER, Role.ADMIN] },
          ...licenseFilter,
          userActivities: {
            some: {
              createdAt: {
                gte: startDate,
              },
            },
          },
        },
      }),

      // Active users in timeframe
      prisma.user.count({
        where: {
          ...licenseFilter,
          userActivities: {
            some: {
              createdAt: {
                gte: startDate,
              },
            },
          },
        },
      }),

      // Active classrooms (classrooms with at least one active student)
      (async () => {
        // Get unique classroom IDs from ClassroomStudent where student has activity
        const activeClassrooms = await prisma.classroomStudent.findMany({
          where: {
            student: {
              ...licenseFilter,
              userActivities: {
                some: {
                  createdAt: {
                    gte: startDate,
                  },
                },
              },
            },
          },
          select: {
            classroomId: true,
          },
          distinct: ["classroomId"],
        });

        return activeClassrooms.length;
      })(),

      // Total reading sessions
      prisma.lessonRecord.count({
        where: {
          createdAt: {
            gte: startDate,
          },
          ...(targetLicenseId
            ? {
                user: {
                  licenseOnUsers: {
                    some: {
                      licenseId: targetLicenseId,
                    },
                  },
                },
              }
            : {}),
        },
      }),

      // Average reading level
      prisma.user.aggregate({
        where: {
          role: Role.STUDENT,
          ...licenseFilter,
        },
        _avg: { level: true },
      }),

      // New users today
      prisma.user.count({
        where: {
          ...licenseFilter,
          createdAt: {
            gte: new Date(now.setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Active users today
      prisma.user.count({
        where: {
          ...licenseFilter,
          userActivities: {
            some: {
              createdAt: {
                gte: new Date(now.setHours(0, 0, 0, 0)),
              },
            },
          },
        },
      }),

      // Reading sessions today
      prisma.lessonRecord.count({
        where: {
          createdAt: {
            gte: new Date(now.setHours(0, 0, 0, 0)),
          },
          ...(targetLicenseId
            ? {
                user: {
                  licenseOnUsers: {
                    some: {
                      licenseId: targetLicenseId,
                    },
                  },
                },
              }
            : {}),
        },
      }),
    ]);

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
          Math.round((averageReadingLevel._avg.level || 0) * 10) / 10,
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
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
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
        headers: {
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}

/**
 * Get school segments
 * @param req - Next request
 * @returns School segments response
 */
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

    // SYSTEM role can select any license via query parameter
    // ADMIN role must use their own license from session
    if (user.role === Role.SYSTEM) {
      licenseId = searchParams.get("licenseId");
    } else if (user.role === Role.ADMIN) {
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

    // Build where clause for schools
    let schoolWhere: any = {};

    if (licenseId) {
      const license = await prisma.license.findUnique({
        where: { id: licenseId },
        select: { schoolId: true },
      });

      if (license?.schoolId) {
        schoolWhere = { id: license.schoolId };
      }
    }

    // Get schools with their statistics (filtered by license if provided)
    const schools = await prisma.school.findMany({
      where: schoolWhere,
      include: {
        users: {
          select: {
            id: true,
            role: true,
            level: true,
            xp: true,
            userActivities: {
              select: {
                createdAt: true,
              },
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        licenses: {
          include: {
            licenseUsers: true,
          },
        },
      },
    });

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Process schools into segments
    const segments: SchoolSegment[] = schools.map((school) => {
      const students = school.users.filter((u) => u.role === Role.STUDENT);
      const teachers = school.users.filter(
        (u) => u.role === Role.TEACHER || u.role === Role.ADMIN
      );

      // Count active users (had activity in last 30 days)
      const activeUsers = school.users.filter((u) =>
        u.userActivities.some((a) => new Date(a.createdAt) >= thirtyDaysAgo)
      ).length;

      const totalUsers = school.users.length;
      const activeRate =
        totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

      // Calculate average level
      const avgLevel =
        students.length > 0
          ? students.reduce((sum, s) => sum + s.level, 0) / students.length
          : 0;

      // Calculate total XP
      const totalXp = students.reduce((sum, s) => sum + s.xp, 0);

      // Calculate licenses
      const licensesUsed = school.licenses.reduce(
        (sum, lic) => sum + (lic.licenseUsers?.length || 0),
        0
      );
      const licensesTotal = school.licenses.reduce(
        (sum, lic) => sum + (lic.maxUsers || 0),
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

    // Calculate summary statistics
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
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
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
        headers: {
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}

/**
 * Get teacher effectiveness metrics
 * @param req - Next request
 * @returns Teacher effectiveness response with real classroom data
 */
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

    // Determine which license to query
    let targetLicenseId: string | null = null;

    if (user.role === Role.SYSTEM) {
      targetLicenseId = requestedLicenseId;
    } else if (user.role === Role.ADMIN) {
      targetLicenseId = user.license_id || null;
    }

    // Calculate date range
    const daysAgo = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Build license filter
    const licenseFilter = targetLicenseId
      ? {
          licenseOnUsers: {
            some: {
              licenseId: targetLicenseId,
            },
          },
        }
      : {};

    // Get all teachers with their classrooms and students
    const teachers = await prisma.user.findMany({
      where: {
        role: { in: [Role.TEACHER, Role.ADMIN] },
        ...licenseFilter,
      },
      select: {
        id: true,
        name: true,
        email: true,
        teacherClassrooms: {
          select: {
            classroom: {
              select: {
                id: true,
                classroomName: true,
                students: {
                  select: {
                    student: {
                      select: {
                        id: true,
                        name: true,
                        userActivities: {
                          select: {
                            createdAt: true,
                          },
                          where: {
                            createdAt: {
                              gte: startDate,
                            },
                          },
                          take: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate metrics for each teacher
    const teacherMetrics: TeacherMetric[] = teachers.map((teacher) => {
      const classrooms = teacher.teacherClassrooms.map((tc) => {
        const students = tc.classroom.students;
        const activeStudents = students.filter(
          (cs) => cs.student.userActivities.length > 0
        );

        return {
          id: tc.classroom.id,
          name: tc.classroom.classroomName || "Unnamed Classroom",
          studentCount: students.length,
          activeCount: activeStudents.length,
        };
      });

      const totalStudents = classrooms.reduce(
        (sum, c) => sum + c.studentCount,
        0
      );
      const totalActive = classrooms.reduce((sum, c) => sum + c.activeCount, 0);
      const engagementRate =
        totalStudents > 0 ? Math.round((totalActive / totalStudents) * 100) : 0;

      return {
        teacherId: teacher.id,
        teacherName: teacher.name || "Unknown",
        email: teacher.email || "",
        studentCount: totalStudents,
        activeStudents: totalActive,
        engagementRate,
        classroomCount: classrooms.length,
        classrooms,
      };
    });

    // Filter out teachers with no students and sort by engagement rate
    const filteredTeachers = teacherMetrics
      .filter((t) => t.studentCount > 0)
      .sort((a, b) => b.engagementRate - a.engagementRate);

    // Calculate summary
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
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
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
        headers: {
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}

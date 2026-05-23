import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, gte, inArray, desc, asc, sql } from "@reading-advantage/db";
import {
  userActivity,
  users,
  licenseOnUsers,
  licenses,
  articles,
  classroomStudents,
  lessonRecords,
  studentAssignments,
  assignments,
  userSentenceRecords,
} from "@reading-advantage/db/schema";
import { smartPaginator } from "@/lib/pagination/smart-paginator";
import { ExtendedNextRequest } from "./auth-controller";
import { ActivityDataPoint, MetricsActivityResponse } from "@/types/dashboard";
import { getCachedMetrics } from "@/lib/cache/metrics";

// Enhanced types for activity heatmap
interface ActivityHeatmapBucket {
  date: string;
  hour: number;
  dayOfWeek: number;
  activityType: string;
  activityCount: number;
  completedCount: number;
  uniqueStudents: number;
  totalDurationMinutes: number;
  avgDurationMinutes: number;
}

interface ActivityHeatmapResponse {
  scope: "student" | "class" | "school" | "license";
  entityId: string;
  timeframe: string;
  granularity: "hour" | "day";
  timezone: string;
  activityTypes: string[];
  buckets: ActivityHeatmapBucket[];
  metadata: {
    totalActivities: number;
    uniqueStudents: number;
    dateRange: {
      start: string;
      end: string;
    };
    availableActivityTypes: string[];
  };
  cache: {
    cached: boolean;
    generatedAt: string;
  };
}

// Timeline data types
interface TimelineEvent {
  id: string;
  type: "assignment" | "srs" | "reading" | "practice";
  title: string;
  description?: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, any>;
}

interface TimelineResponse {
  scope: "student";
  entityId: string;
  timeframe: string;
  timezone: string;
  events: TimelineEvent[];
  metadata: {
    totalEvents: number;
    eventTypes: Record<string, number>;
    dateRange: {
      start: string;
      end: string;
    };
  };
  cache: {
    cached: boolean;
    generatedAt: string;
  };
}

// Types for activity creation
interface CreateActivityData {
  userId: string;
  activityType: string;
  targetId: string;
  completed?: boolean;
  details?: any;
}

/**
 * Get activity metrics with enhanced heatmap support
 *
 * Query Parameters:
 * - scope: 'student' | 'class' | 'school' (default: based on user role)
 * - entityId: specific student/class/school ID (default: current user context)
 * - timeframe: '7d' | '30d' | '90d' | '6m' (default: '30d')
 * - granularity: 'hour' | 'day' (default: 'day')
 * - activityTypes: comma-separated list of activity types to filter
 * - format: 'heatmap' | 'timeline' | 'summary' (default: 'summary')
 *
 * @param req - Extended Next request with session
 * @returns Activity metrics response
 */
export async function getActivityMetrics(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "summary";

    // Route to specific handlers based on format
    if (format === "heatmap") {
      return getActivityHeatmap(req);
    } else if (format === "timeline") {
      return getActivityTimeline(req);
    }

    // Fallback to original summary format for backward compatibility
    return getActivitySummary(req);
  } catch (error) {
    console.error("[Controller] getActivityMetrics - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch activity metrics",
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
 * Get activity heatmap data
 */
async function getActivityHeatmap(
  req: ExtendedNextRequest
): Promise<NextResponse<ActivityHeatmapResponse>> {
  const startTime = Date.now();
  const session = req.session!;
  const { searchParams } = new URL(req.url);

  const scope =
    (searchParams.get("scope") as "student" | "class" | "school" | "license") ||
    (session.user.role === "STUDENT"
      ? "student"
      : session.user.role === "TEACHER"
        ? "class"
        : "school");

  let entityId = searchParams.get("entityId") || searchParams.get("licenseId");

  if (!entityId) {
    if (scope === "student") {
      entityId = session.user.id;
    } else if (scope === "school") {
      const [userRow] = await db
        .select({ schoolId: users.schoolId })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      entityId = userRow?.schoolId || session.user.id;
    } else {
      entityId = session.user.id;
    }
  }

  const timeframe = searchParams.get("timeframe") || "30d";
  const granularity =
    (searchParams.get("granularity") as "hour" | "day") || "day";
  const activityTypesFilter =
    searchParams.get("activityTypes")?.split(",").filter(Boolean) || [];

  const now = new Date();
  const daysAgo =
    timeframe === "7d"
      ? 7
      : timeframe === "30d"
        ? 30
        : timeframe === "90d"
          ? 90
          : timeframe === "120d"
            ? 120
            : timeframe === "6m"
              ? 180
              : timeframe === "365d"
                ? 365
                : timeframe === "1y"
                  ? 365
                  : timeframe === "all"
                    ? 3650
                    : 30;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysAgo);

  const cacheKey = `activity-heatmap:${scope}:${entityId}:${timeframe}:${granularity}:${activityTypesFilter.join(",")}`;

  const fetchHeatmapData = async () => {
    let userIds: string[] = [];

    if (scope === "student") {
      userIds = [entityId!];
    } else if (scope === "school") {
      const schoolUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.schoolId, entityId!))
        .limit(1000);

      if (schoolUsers.length === 0) return null;
      userIds = schoolUsers.map((u) => u.id);
    } else if (scope === "license") {
      const licenseUsers = await db
        .select({ userId: licenseOnUsers.userId })
        .from(licenseOnUsers)
        .where(eq(licenseOnUsers.licenseId, entityId!))
        .limit(1000);

      if (licenseUsers.length === 0) return null;
      userIds = licenseUsers.map((lu) => lu.userId);
    }

    // Build activity conditions
    const activityConditions: any[] = [gte(userActivity.createdAt, startDate)];
    if (scope === "student") {
      activityConditions.push(eq(userActivity.userId, entityId!));
    } else if (userIds.length > 0) {
      activityConditions.push(inArray(userActivity.userId, userIds));
    }
    if (activityTypesFilter.length > 0) {
      activityConditions.push(inArray(userActivity.activityType, activityTypesFilter));
    }

    const typesCondition =
      scope === "student"
        ? eq(userActivity.userId, entityId!)
        : userIds.length > 0
          ? inArray(userActivity.userId, userIds)
          : undefined;

    const [activities, availableTypesRows] = await Promise.all([
      db
        .select({
          id: userActivity.id,
          userId: userActivity.userId,
          activityType: userActivity.activityType,
          completed: userActivity.completed,
          timer: userActivity.timer,
          createdAt: userActivity.createdAt,
        })
        .from(userActivity)
        .where(and(...activityConditions))
        .orderBy(asc(userActivity.createdAt))
        .limit(10000),
      db
        .selectDistinct({ activityType: userActivity.activityType })
        .from(userActivity)
        .where(typesCondition),
    ]);

    // Process activities into buckets by date
    const bucketMap = new Map<
      string,
      {
        date: string;
        hour: number;
        dayOfWeek: number;
        activityType: string;
        activityCount: number;
        completedCount: number;
        uniqueStudents: Set<string>;
        totalDurationMinutes: number;
      }
    >();

    activities.forEach((activity) => {
      const date = activity.createdAt.toISOString().split("T")[0];
      const hour = granularity === "hour" ? activity.createdAt.getHours() : 0;
      const dayOfWeek = activity.createdAt.getDay();
      const key = `${date}-${hour}-${activity.activityType}`;

      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          date,
          hour,
          dayOfWeek,
          activityType: activity.activityType,
          activityCount: 0,
          completedCount: 0,
          uniqueStudents: new Set(),
          totalDurationMinutes: 0,
        });
      }

      const bucket = bucketMap.get(key)!;
      bucket.activityCount++;
      if (activity.completed) bucket.completedCount++;
      bucket.uniqueStudents.add(activity.userId);
      if (activity.timer) bucket.totalDurationMinutes += activity.timer / 60;
    });

    const buckets = Array.from(bucketMap.values()).map((bucket) => ({
      date: bucket.date,
      hour: bucket.hour,
      dayOfWeek: bucket.dayOfWeek,
      activityType: bucket.activityType,
      activityCount: bucket.activityCount,
      completedCount: bucket.completedCount,
      uniqueStudents: bucket.uniqueStudents.size,
      totalDurationMinutes: Math.round(bucket.totalDurationMinutes * 100) / 100,
      avgDurationMinutes:
        bucket.activityCount > 0
          ? Math.round(
              (bucket.totalDurationMinutes / bucket.activityCount) * 100
            ) / 100
          : 0,
    }));

    const totalActivities = buckets.reduce(
      (sum, bucket) => sum + bucket.activityCount,
      0
    );
    const allUniqueStudents = new Set<string>();
    buckets.forEach((bucket) => {
      activities.forEach((activity) => {
        const date = activity.createdAt.toISOString().split("T")[0];
        const hour = granularity === "hour" ? activity.createdAt.getHours() : 0;
        if (
          bucket.date === date &&
          bucket.hour === hour &&
          bucket.activityType === activity.activityType
        ) {
          allUniqueStudents.add(activity.userId);
        }
      });
    });

    return {
      scope,
      entityId: entityId!,
      timeframe,
      granularity,
      timezone: "UTC",
      activityTypes: activityTypesFilter,
      buckets,
      metadata: {
        totalActivities,
        uniqueStudents: allUniqueStudents.size,
        dateRange: {
          start: startDate.toISOString().split("T")[0],
          end: now.toISOString().split("T")[0],
        },
        availableActivityTypes: availableTypesRows.map((t) => t.activityType),
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };
  };

  const rawData = await getCachedMetrics(cacheKey, fetchHeatmapData, {
    ttl: 30000,
    staleTime: 15000,
  });

  // Handle empty school/license case (fetchHeatmapData returned null)
  const data = rawData ?? {
    scope,
    entityId: entityId!,
    timeframe,
    granularity,
    timezone: "UTC",
    activityTypes: activityTypesFilter,
    buckets: [],
    metadata: {
      totalActivities: 0,
      uniqueStudents: 0,
      dateRange: {
        start: startDate.toISOString().split("T")[0],
        end: now.toISOString().split("T")[0],
      },
      availableActivityTypes: [],
    },
    cache: {
      cached: false,
      generatedAt: new Date().toISOString(),
    },
  };

  const duration = Date.now() - startTime;

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      "X-Response-Time": `${duration}ms`,
    },
  });
}

/**
 * Get activity timeline data for student dashboard
 */
async function getActivityTimeline(
  req: ExtendedNextRequest
): Promise<NextResponse> {
  const startTime = Date.now();
  const session = req.session!;
  const { searchParams } = new URL(req.url);

  const requestedScope = searchParams.get("scope") as "student" | "class" | "school" | "license" | null;
  const scope = requestedScope ||
    (session.user.role === "STUDENT" ? "student" :
     session.user.role === "TEACHER" ? "class" : "school");

  let entityId = searchParams.get("entityId");

  if (!entityId) {
    if (scope === "student") {
      entityId = session.user.id;
    } else if (scope === "school") {
      const [userRow] = await db
        .select({ schoolId: users.schoolId })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      entityId = userRow?.schoolId || session.user.id;
    } else {
      entityId = session.user.id;
    }
  }

  const timeframe = searchParams.get("timeframe") || "30d";

  if (session.user.role === "STUDENT" && (scope !== "student" || entityId !== session.user.id)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Cannot access other student data" },
      { status: 403 }
    );
  }

  const now = new Date();
  const daysAgo =
    timeframe === "7d"
      ? 7
      : timeframe === "30d"
        ? 30
        : timeframe === "90d"
          ? 90
          : timeframe === "120d"
            ? 120
            : timeframe === "365d"
              ? 365
              : timeframe === "1y"
                ? 365
                : timeframe === "all"
                  ? 3650
                  : 30;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysAgo);

  const cacheKey = `activity-timeline:${scope}:${entityId}:${timeframe}`;

  const fetchTimelineData = async (): Promise<TimelineResponse> => {
    let userIds: string[] = [];

    if (scope === "student") {
      userIds = [entityId!];
    } else if (scope === "school") {
      if (entityId === session.user.id && !entityId.startsWith("cmgj0")) {
        const allStudents = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, "STUDENT"))
          .limit(1000);
        userIds = allStudents.map((u) => u.id);
      } else {
        const schoolUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.schoolId, entityId!), eq(users.role, "STUDENT")))
          .limit(1000);
        userIds = schoolUsers.map((u) => u.id);
      }
    } else if (scope === "class") {
      const classUsers = await db
        .select({ studentId: classroomStudents.studentId })
        .from(classroomStudents)
        .where(eq(classroomStudents.classroomId, entityId!));
      userIds = classUsers.map((u) => u.studentId);
    } else if (scope === "license") {
      const licenseUsers = await db
        .select({ userId: licenseOnUsers.userId })
        .from(licenseOnUsers)
        .where(eq(licenseOnUsers.licenseId, entityId!))
        .limit(1000);
      userIds = licenseUsers.map((lu) => lu.userId);
    }

    if (userIds.length === 0) {
      return {
        scope: scope as any,
        entityId: entityId!,
        timeframe,
        timezone: "UTC",
        events: [],
        metadata: {
          totalEvents: 0,
          eventTypes: {},
          dateRange: {
            start: startDate.toISOString().split("T")[0],
            end: now.toISOString().split("T")[0],
          },
        },
        cache: {
          cached: false,
          generatedAt: new Date().toISOString(),
        },
      };
    }

    // Get assignments with article and student info
    const assignmentRows = await db
      .select({
        id: studentAssignments.id,
        studentId: studentAssignments.studentId,
        status: studentAssignments.status,
        completedAt: studentAssignments.completedAt,
        createdAt: studentAssignments.createdAt,
        articleId: assignments.articleId,
        articleTitle: articles.title,
        articleCefrLevel: articles.cefrLevel,
        studentName: users.name,
      })
      .from(studentAssignments)
      .leftJoin(assignments, eq(studentAssignments.assignmentId, assignments.id))
      .leftJoin(articles, eq(assignments.articleId, articles.id))
      .leftJoin(users, eq(studentAssignments.studentId, users.id))
      .where(
        and(
          inArray(studentAssignments.studentId, userIds),
          gte(studentAssignments.createdAt, startDate)
        )
      )
      .orderBy(desc(studentAssignments.createdAt))
      .limit(100);

    // Get SRS practice sessions
    const srsRows = await db
      .select({
        id: userSentenceRecords.id,
        userId: userSentenceRecords.userId,
        sentence: userSentenceRecords.sentence,
        state: userSentenceRecords.state,
        updatedAt: userSentenceRecords.updatedAt,
        userName: users.name,
      })
      .from(userSentenceRecords)
      .leftJoin(users, eq(userSentenceRecords.userId, users.id))
      .where(
        and(
          inArray(userSentenceRecords.userId, userIds),
          gte(userSentenceRecords.updatedAt, startDate)
        )
      )
      .orderBy(desc(userSentenceRecords.updatedAt))
      .limit(100);

    // Get reading sessions from lesson records
    const readingRows = await db
      .select({
        id: lessonRecords.id,
        userId: lessonRecords.userId,
        articleId: lessonRecords.articleId,
        phase1: lessonRecords.phase1,
        phase2: lessonRecords.phase2,
        phase3: lessonRecords.phase3,
        phase4: lessonRecords.phase4,
        phase5: lessonRecords.phase5,
        phase6: lessonRecords.phase6,
        phase7: lessonRecords.phase7,
        phase8: lessonRecords.phase8,
        phase9: lessonRecords.phase9,
        phase10: lessonRecords.phase10,
        phase11: lessonRecords.phase11,
        phase12: lessonRecords.phase12,
        phase13: lessonRecords.phase13,
        phase14: lessonRecords.phase14,
        createdAt: lessonRecords.createdAt,
        articleTitle: articles.title,
        articleCefrLevel: articles.cefrLevel,
        articleGenre: articles.genre,
        userName: users.name,
      })
      .from(lessonRecords)
      .leftJoin(articles, eq(lessonRecords.articleId, articles.id))
      .leftJoin(users, eq(lessonRecords.userId, users.id))
      .where(
        and(
          inArray(lessonRecords.userId, userIds),
          gte(lessonRecords.createdAt, startDate)
        )
      )
      .orderBy(desc(lessonRecords.createdAt))
      .limit(100);

    const events: TimelineEvent[] = [];

    assignmentRows.forEach((row) => {
      events.push({
        id: `assignment-${row.id}`,
        type: "assignment",
        title: `Assignment: ${row.articleTitle || "Article"}`,
        description: `Assigned reading (${row.articleCefrLevel || "Unknown level"})`,
        timestamp: row.createdAt.toISOString(),
        metadata: {
          status: row.status,
          articleId: row.articleId,
          completedAt: row.completedAt?.toISOString(),
          userId: row.studentId,
          username: row.studentName,
        },
      });
    });

    srsRows.forEach((row) => {
      events.push({
        id: `srs-${row.id}`,
        type: "srs",
        title: "SRS Practice",
        description: `Practiced sentence: "${row.sentence.substring(0, 50)}..."`,
        timestamp: row.updatedAt.toISOString(),
        metadata: {
          state: row.state,
          sentence: row.sentence,
          userId: row.userId,
          username: row.userName,
        },
      });
    });

    readingRows.forEach((row) => {
      const phases = [
        row.phase1, row.phase2, row.phase3, row.phase4, row.phase5,
        row.phase6, row.phase7, row.phase8, row.phase9, row.phase10,
        row.phase11, row.phase12, row.phase13, row.phase14,
      ];

      let totalTime = 0;
      phases.forEach((phase) => {
        if (phase && typeof phase === "object") {
          const phaseData = phase as any;
          if (typeof phaseData.elapsedTime === "number") {
            totalTime += phaseData.elapsedTime;
          }
        }
      });

      events.push({
        id: `reading-${row.id}`,
        type: "reading",
        title: `Read: ${row.articleTitle || "Article"}`,
        description: `Reading session (${row.articleGenre || "Unknown genre"})`,
        timestamp: row.createdAt.toISOString(),
        duration: totalTime > 0 ? totalTime / 1000 : undefined,
        metadata: {
          articleId: row.articleId,
          cefrLevel: row.articleCefrLevel,
          genre: row.articleGenre,
          completed: (row.phase14 as any)?.status === 2,
          userId: row.userId,
          username: row.userName,
        },
      });
    });

    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const eventTypes = events.reduce(
      (types, event) => {
        types[event.type] = (types[event.type] || 0) + 1;
        return types;
      },
      {} as Record<string, number>
    );

    return {
      scope: scope as any,
      entityId: entityId!,
      timeframe,
      timezone: "UTC",
      events,
      metadata: {
        totalEvents: events.length,
        eventTypes,
        dateRange: {
          start: startDate.toISOString().split("T")[0],
          end: now.toISOString().split("T")[0],
        },
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };
  };

  const data = await getCachedMetrics(cacheKey, fetchTimelineData, {
    ttl: 180000,
    staleTime: 60000,
  });

  const duration = Date.now() - startTime;

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=180, stale-while-revalidate=600",
      "X-Response-Time": `${duration}ms`,
    },
  });
}

/**
 * Original activity summary implementation for backward compatibility
 */
async function getActivitySummary(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "30d";
    const schoolId = searchParams.get("schoolId");
    const classId = searchParams.get("classId");

    const now = new Date();
    const daysAgo = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : timeframe === "120d" ? 120 : timeframe === "365d" ? 365 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);

    // Build conditions
    const conditions: any[] = [gte(userActivity.createdAt, startDate)];
    if (schoolId) {
      conditions.push(eq(users.schoolId, schoolId));
    }

    const activityRows = await db
      .select({
        userId: userActivity.userId,
        createdAt: userActivity.createdAt,
        timer: userActivity.timer,
        userCreatedAt: users.createdAt,
      })
      .from(userActivity)
      .leftJoin(users, eq(userActivity.userId, users.id))
      .where(and(...conditions))
      .limit(5000);

    // Filter by class if specified
    let filteredActivities = activityRows;
    if (classId) {
      const classStudentRows = await db
        .select({ studentId: classroomStudents.studentId })
        .from(classroomStudents)
        .where(eq(classroomStudents.classroomId, classId));
      const classStudentIds = new Set(classStudentRows.map((r) => r.studentId));
      filteredActivities = activityRows.filter((a) => classStudentIds.has(a.userId));
    }

    // Group by date
    const dateMap = new Map<
      string,
      {
        activeUsers: Set<string>;
        newUsers: Set<string>;
        sessions: number;
        totalTime: number;
      }
    >();

    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dateMap.set(dateKey, {
        activeUsers: new Set(),
        newUsers: new Set(),
        sessions: 0,
        totalTime: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    filteredActivities.forEach((activity) => {
      const dateKey = new Date(activity.createdAt).toISOString().split("T")[0];
      const data = dateMap.get(dateKey);

      if (data) {
        data.activeUsers.add(activity.userId);
        data.sessions += 1;
        if (activity.timer) {
          data.totalTime += activity.timer;
        }

        if (activity.userCreatedAt) {
          const userCreatedDate = new Date(activity.userCreatedAt)
            .toISOString()
            .split("T")[0];
          if (userCreatedDate === dateKey) {
            data.newUsers.add(activity.userId);
          }
        }
      }
    });

    const dataPoints: ActivityDataPoint[] = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        activeUsers: data.activeUsers.size,
        newUsers: data.newUsers.size,
        readingSessions: data.sessions,
        averageSessionLength:
          data.sessions > 0
            ? Math.round((data.totalTime / data.sessions / 60) * 10) / 10
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalActiveUsers = new Set(filteredActivities.map((a) => a.userId)).size;
    const totalSessions = filteredActivities.length;
    const totalTime = filteredActivities
      .filter((a) => a.timer)
      .reduce((sum, a) => sum + (a.timer ?? 0), 0);
    const averageSessionLength =
      totalSessions > 0
        ? Math.round((totalTime / totalSessions / 60) * 10) / 10
        : 0;

    const peakDay = dataPoints.reduce(
      (peak, current) =>
        current.activeUsers > peak.activeUsers ? current : peak,
      dataPoints[0] || {
        date: "",
        activeUsers: 0,
        newUsers: 0,
        readingSessions: 0,
        averageSessionLength: 0,
      }
    ).date;

    const response: MetricsActivityResponse = {
      timeframe,
      dataPoints,
      summary: {
        totalActiveUsers,
        totalSessions,
        averageSessionLength,
        peakDay,
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
    console.error("[Controller] getActivityMetrics - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch activity metrics",
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

// GET user activity logs
// GET /api/activity

export async function getAllUserActivity() {
  try {
    const activityCounts = await db
      .select({
        activityType: userActivity.activityType,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivity)
      .groupBy(userActivity.activityType);

    const [{ totalUsers }] = await db
      .select({ totalUsers: sql<number>`count(*)::int` })
      .from(users);

    const userActivityData = {
      totalUsers,
      totalRatingCount: 0,
      totalReadingCount: 0,
      totalLaQuestionCount: 0,
      totalLevelTestCount: 0,
      totalMcQuestionCount: 0,
      totalSaQuestionCount: 0,
      totalSentenceFlashcardsCount: 0,
      totalVocabularyFlashcardsCount: 0,
      totalVocabularyActivityCount: 0,
      totalSentenceActivityCount: 0,
      totalLessonFlashcardCount: 0,
      totalLessonSentenceFlashcardsCount: 0,
    };

    activityCounts.forEach((activity) => {
      switch (activity.activityType) {
        case "ARTICLE_RATING":
        case "STORIES_RATING":
        case "CHAPTER_RATING":
          userActivityData.totalRatingCount += activity.count;
          break;
        case "ARTICLE_READ":
        case "STORIES_READ":
        case "CHAPTER_READ":
          userActivityData.totalReadingCount += activity.count;
          break;
        case "LA_QUESTION":
          userActivityData.totalLaQuestionCount += activity.count;
          break;
        case "LEVEL_TEST":
          userActivityData.totalLevelTestCount += activity.count;
          break;
        case "MC_QUESTION":
          userActivityData.totalMcQuestionCount += activity.count;
          break;
        case "SA_QUESTION":
          userActivityData.totalSaQuestionCount += activity.count;
          break;
        case "SENTENCE_FLASHCARDS":
          userActivityData.totalSentenceFlashcardsCount += activity.count;
          break;
        case "VOCABULARY_FLASHCARDS":
          userActivityData.totalVocabularyFlashcardsCount += activity.count;
          break;
        case "VOCABULARY_MATCHING":
          userActivityData.totalVocabularyActivityCount += activity.count;
          break;
        case "SENTENCE_MATCHING":
        case "SENTENCE_ORDERING":
        case "SENTENCE_WORD_ORDERING":
        case "SENTENCE_CLOZE_TEST":
          userActivityData.totalSentenceActivityCount += activity.count;
          break;
        case "LESSON_FLASHCARD":
          userActivityData.totalLessonFlashcardCount += activity.count;
          break;
        case "LESSON_SENTENCE_FLASHCARDS":
          userActivityData.totalLessonSentenceFlashcardsCount += activity.count;
          break;
      }
    });

    return NextResponse.json({ userActivityData }, { status: 200 });
  } catch (err) {
    console.error("Error fetching user activities from database:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getAllUsersActivity() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [recentActivities, activityCounts] = await Promise.all([
      db
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
          userIdJoined: users.id,
        })
        .from(userActivity)
        .leftJoin(users, eq(userActivity.userId, users.id))
        .where(gte(userActivity.createdAt, thirtyDaysAgo))
        .orderBy(desc(userActivity.createdAt))
        .limit(1000),
      db
        .select({
          activityType: userActivity.activityType,
          userId: userActivity.userId,
          count: sql<number>`count(*)::int`,
        })
        .from(userActivity)
        .where(gte(userActivity.createdAt, thirtyDaysAgo))
        .groupBy(userActivity.activityType, userActivity.userId)
        .orderBy(desc(sql`count(*)`))
        .limit(100),
    ]);

    // Collect article IDs from ARTICLE_READ and ARTICLE_RATING activities
    const articleIds = new Set<string>();
    recentActivities.forEach((activity) => {
      if (
        (activity.activityType === "ARTICLE_READ" ||
          activity.activityType === "ARTICLE_RATING") &&
        activity.targetId
      ) {
        articleIds.add(activity.targetId);
      }
    });

    const articleRows =
      articleIds.size > 0
        ? await db
            .select({
              id: articles.id,
              cefrLevel: articles.cefrLevel,
              title: articles.title,
              raLevel: articles.raLevel,
            })
            .from(articles)
            .where(inArray(articles.id, Array.from(articleIds)))
        : [];

    const articleMap = new Map(articleRows.map((a) => [a.id, a]));

    const data = recentActivities.map((activity) => {
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
          id: activity.userIdJoined,
          name: activity.userName,
          email: activity.userEmail,
        },
      };
    });

    return NextResponse.json({ data, summary: activityCounts }, { status: 200 });
  } catch (err) {
    console.error("Error fetching user activities from database:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getActiveUsers(
  licenseId?: string,
  dateRange: string = "30d"
) {
  try {
    let startDate: Date | undefined;

    if (dateRange === "7d") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateRange === "30d") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    } else if (dateRange === "90d") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
    } else if (dateRange === "all") {
      startDate = undefined;
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    if (licenseId) {
      const [license] = await db
        .select({ id: licenses.id })
        .from(licenses)
        .where(eq(licenses.id, licenseId))
        .limit(1);

      if (!license) {
        return { total: [], licenses: { [licenseId]: [] } };
      }

      const licenseUserRows = await db
        .select({ userId: licenseOnUsers.userId })
        .from(licenseOnUsers)
        .where(eq(licenseOnUsers.licenseId, licenseId))
        .limit(100);

      const userIds = licenseUserRows.map((lu) => lu.userId);

      if (userIds.length === 0) {
        return { total: [], licenses: { [licenseId]: [] } };
      }

      const actConditions: any[] = [inArray(userActivity.userId, userIds)];
      if (startDate) actConditions.push(gte(userActivity.createdAt, startDate));

      const activities = await db
        .select({ userId: userActivity.userId, createdAt: userActivity.createdAt })
        .from(userActivity)
        .where(and(...actConditions))
        .limit(dateRange === "all" ? 20000 : 5000);

      const dateMap: { [date: string]: Set<string> } = {};
      activities.forEach((activity) => {
        const date = activity.createdAt.toISOString().split("T")[0];
        if (!dateMap[date]) dateMap[date] = new Set();
        dateMap[date].add(activity.userId);
      });

      const licenseData = Object.keys(dateMap)
        .sort()
        .map((date) => ({ date, noOfUsers: dateMap[date].size }));

      return { total: licenseData, licenses: { [licenseId]: licenseData } };
    }

    // All licenses
    const allConditions: any[] = [];
    if (startDate) allConditions.push(gte(userActivity.createdAt, startDate));

    const activities = await db
      .select({
        userId: userActivity.userId,
        createdAt: userActivity.createdAt,
        userLicenseId: users.licenseId,
      })
      .from(userActivity)
      .leftJoin(users, eq(userActivity.userId, users.id))
      .where(allConditions.length > 0 ? and(...allConditions) : undefined)
      .orderBy(desc(userActivity.createdAt))
      .limit(dateRange === "all" ? 50000 : 10000);

    const totalDateMap: { [date: string]: Set<string> } = {};
    const licenseDateMap: { [licenseId: string]: { [date: string]: Set<string> } } = {};

    activities.forEach((activity) => {
      const date = activity.createdAt.toISOString().split("T")[0];
      const userId = activity.userId;
      const userLicenseId = activity.userLicenseId;

      if (!totalDateMap[date]) totalDateMap[date] = new Set();
      totalDateMap[date].add(userId);

      if (userLicenseId) {
        if (!licenseDateMap[userLicenseId]) licenseDateMap[userLicenseId] = {};
        if (!licenseDateMap[userLicenseId][date]) licenseDateMap[userLicenseId][date] = new Set();
        licenseDateMap[userLicenseId][date].add(userId);
      }
    });

    const totalData = Object.keys(totalDateMap)
      .sort()
      .map((date) => ({ date, noOfUsers: totalDateMap[date].size }));

    const licensesData: Record<string, { date: string; noOfUsers: number }[]> = {};
    Object.keys(licenseDateMap).forEach((lid) => {
      licensesData[lid] = Object.keys(licenseDateMap[lid])
        .sort()
        .map((date) => ({ date, noOfUsers: licenseDateMap[lid][date].size }));
    });

    return { total: totalData, licenses: licensesData };
  } catch (error) {
    console.error("Error fetching active user activities from database:", error);
    return { message: "Internal server error" };
  }
}

export async function getDailyActiveUsers(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const licenseId = searchParams.get("licenseId") || undefined;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let userIdFilter: string[] = [];

    if (licenseId) {
      const [license] = await db
        .select({ id: licenses.id })
        .from(licenses)
        .where(eq(licenses.id, licenseId))
        .limit(1);

      if (!license) {
        return NextResponse.json(
          { total: [], licenses: { [licenseId]: [] } },
          { status: 200 }
        );
      }

      const licenseUserRows = await db
        .select({ userId: licenseOnUsers.userId })
        .from(licenseOnUsers)
        .where(eq(licenseOnUsers.licenseId, licenseId));

      userIdFilter = licenseUserRows.map((lu) => lu.userId);
    }

    const conditions: any[] = [gte(userActivity.createdAt, thirtyDaysAgo)];
    if (licenseId && userIdFilter.length > 0) {
      conditions.push(inArray(userActivity.userId, userIdFilter));
    }

    const activityRows = await db
      .select({
        userId: userActivity.userId,
        createdAt: userActivity.createdAt,
        userLicenseId: users.licenseId,
        userIdJoined: users.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(userActivity)
      .leftJoin(users, eq(userActivity.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(userActivity.createdAt));

    const totalDateMap: { [date: string]: Map<string, any> } = {};
    const licenseDateMap: { [licenseId: string]: { [date: string]: Map<string, any> } } = {};

    activityRows.forEach((activity) => {
      const date = activity.createdAt.toISOString().split("T")[0];
      const userId = activity.userId;
      const userObj = {
        id: activity.userIdJoined,
        name: activity.userName,
        email: activity.userEmail,
        image: activity.userImage,
        licenseId: activity.userLicenseId,
      };
      const userLicenseId = activity.userLicenseId;

      if (!totalDateMap[date]) totalDateMap[date] = new Map();
      totalDateMap[date].set(userId, userObj);

      if (userLicenseId) {
        if (!licenseDateMap[userLicenseId]) licenseDateMap[userLicenseId] = {};
        if (!licenseDateMap[userLicenseId][date]) licenseDateMap[userLicenseId][date] = new Map();
        licenseDateMap[userLicenseId][date].set(userId, userObj);
      }
    });

    const totalData = Object.keys(totalDateMap)
      .sort()
      .map((date) => ({ date, users: Array.from(totalDateMap[date].values()) }));

    const licensesData: Record<string, { date: string; users: any[] }[]> = {};
    Object.keys(licenseDateMap).forEach((lid) => {
      licensesData[lid] = Object.keys(licenseDateMap[lid])
        .sort()
        .map((date) => ({ date, users: Array.from(licenseDateMap[lid][date].values()) }));
    });

    return NextResponse.json({ total: totalData, licenses: licensesData }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/v1/activity/daily-active-users:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getActiveUser(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const licenseId = searchParams.get("licenseId") || undefined;
    const dateRange = searchParams.get("dateRange") || "30d";

    const response = await getActiveUsers(licenseId, dateRange);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/v1/activity/active-users:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function updateAllUserActivity() {
  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const [{ totalUsers }] = await db
      .select({ totalUsers: sql<number>`count(*)::int` })
      .from(users);

    const activityCounts = await db
      .select({
        activityType: userActivity.activityType,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivity)
      .where(gte(userActivity.createdAt, startOfDay))
      .groupBy(userActivity.activityType);

    const totalCounts = {
      totalRatingCount: 0,
      totalReadingCount: 0,
      totalLaQuestionCount: 0,
      totalLevelTestCount: 0,
      totalMcQuestionCount: 0,
      totalSaQuestionCount: 0,
      totalSentenceFlashcardsCount: 0,
      totalVocabularyFlashcardsCount: 0,
      totalVocabularyActivityCount: 0,
      totalSentenceActivityCount: 0,
      totalLessonFlashcardCount: 0,
      totalLessonSentenceFlashcardsCount: 0,
    };

    activityCounts.forEach((activity) => {
      switch (activity.activityType) {
        case "ARTICLE_RATING":
        case "STORIES_RATING":
        case "CHAPTER_RATING":
          totalCounts.totalRatingCount += activity.count;
          break;
        case "ARTICLE_READ":
        case "STORIES_READ":
        case "CHAPTER_READ":
          totalCounts.totalReadingCount += activity.count;
          break;
        case "LA_QUESTION":
          totalCounts.totalLaQuestionCount += activity.count;
          break;
        case "LEVEL_TEST":
          totalCounts.totalLevelTestCount += activity.count;
          break;
        case "MC_QUESTION":
          totalCounts.totalMcQuestionCount += activity.count;
          break;
        case "SA_QUESTION":
          totalCounts.totalSaQuestionCount += activity.count;
          break;
        case "SENTENCE_FLASHCARDS":
          totalCounts.totalSentenceFlashcardsCount += activity.count;
          break;
        case "VOCABULARY_FLASHCARDS":
          totalCounts.totalVocabularyFlashcardsCount += activity.count;
          break;
        case "VOCABULARY_MATCHING":
          totalCounts.totalVocabularyActivityCount += activity.count;
          break;
        case "SENTENCE_MATCHING":
        case "SENTENCE_ORDERING":
        case "SENTENCE_WORD_ORDERING":
        case "SENTENCE_CLOZE_TEST":
          totalCounts.totalSentenceActivityCount += activity.count;
          break;
        case "LESSON_FLASHCARD":
          totalCounts.totalLessonFlashcardCount += activity.count;
          break;
        case "LESSON_SENTENCE_FLASHCARDS":
          totalCounts.totalLessonSentenceFlashcardsCount += activity.count;
          break;
      }
    });

    return NextResponse.json(
      {
        updateUserActivity: "success",
        data: { totalUsers, ...totalCounts },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error calculating user activity from database:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a new user activity record
export async function createUserActivity(activityData: CreateActivityData) {
  try {
    const [activity] = await db
      .insert(userActivity)
      .values({
        userId: activityData.userId,
        activityType: activityData.activityType,
        targetId: activityData.targetId,
        completed: activityData.completed ?? false,
        details: activityData.details || null,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      { message: "Activity created successfully", data: activity },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating user activity:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get user activities by user ID
export async function getUserActivities(userId: string, limit?: number) {
  try {
    const activities = await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.createdAt))
      .limit(limit || 100);

    return NextResponse.json({ data: activities }, { status: 200 });
  } catch (err) {
    console.error("Error fetching user activities:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete user activity by ID
export async function deleteUserActivity(activityId: string) {
  try {
    const deleted = await db
      .delete(userActivity)
      .where(eq(userActivity.id, activityId))
      .returning({ id: userActivity.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { message: "Activity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Activity deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error deleting user activity:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update user activity
export async function updateUserActivity(
  activityId: string,
  updateData: Partial<Omit<CreateActivityData, "userId">>
) {
  try {
    const updateValues: Record<string, any> = { updatedAt: new Date() };
    if (updateData.activityType !== undefined) updateValues.activityType = updateData.activityType;
    if (updateData.targetId !== undefined) updateValues.targetId = updateData.targetId;
    if (updateData.completed !== undefined) updateValues.completed = updateData.completed;
    if (updateData.details !== undefined) updateValues.details = updateData.details || null;

    const [activity] = await db
      .update(userActivity)
      .set(updateValues)
      .where(eq(userActivity.id, activityId))
      .returning();

    if (!activity) {
      return NextResponse.json(
        { message: "Activity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Activity updated successfully", data: activity },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating user activity:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

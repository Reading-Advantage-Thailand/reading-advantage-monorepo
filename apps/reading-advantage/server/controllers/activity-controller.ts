import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ActivityType } from "@prisma/client";
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
  activityType: ActivityType;
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
 * Get activity heatmap data from materialized views
 */
async function getActivityHeatmap(
  req: ExtendedNextRequest
): Promise<NextResponse<ActivityHeatmapResponse>> {
  const startTime = Date.now();
  const session = req.session!;
  const { searchParams } = new URL(req.url);

  // Parse parameters
  const scope =
    (searchParams.get("scope") as "student" | "class" | "school" | "license") ||
    (session.user.role === "STUDENT"
      ? "student"
      : session.user.role === "TEACHER"
        ? "class"
        : "school");

  // Determine entityId based on scope and params
  let entityId = searchParams.get("entityId") || searchParams.get("licenseId");

  if (!entityId) {
    if (scope === "student") {
      entityId = session.user.id;
    } else if (scope === "school") {
      // For school scope, use user's schoolId if available
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { schoolId: true },
      });
      entityId = user?.schoolId || session.user.id;
    } else {
      entityId = session.user.id;
    }
  }

  const timeframe = searchParams.get("timeframe") || "30d";
  const granularity =
    (searchParams.get("granularity") as "hour" | "day") || "day";
  const activityTypesFilter =
    searchParams.get("activityTypes")?.split(",").filter(Boolean) || [];

  // Calculate date range
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
                    ? 3650 // 10 years for "all time"
                    : 30; // default to 30 days
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysAgo);

  const cacheKey = `activity-heatmap:${scope}:${entityId}:${timeframe}:${granularity}:${activityTypesFilter.join(",")}`;

  const fetchHeatmapData = async () => {
    // Use transaction for all database operations to optimize connection usage
    const result = await prisma.$transaction(async (tx) => {
      // Build where clause for Prisma query
      const whereClause: any = {
        createdAt: {
          gte: startDate,
        },
      };

      let userIds: string[] = [];

      // Scope-specific filters
      if (scope === "student") {
        whereClause.userId = entityId;
        userIds = [entityId];
      } else if (scope === "school") {
        // Get users from the school in transaction
        const schoolUsers = await tx.user.findMany({
          where: { schoolId: entityId },
          select: { id: true },
          take: 1000, // Limit to prevent huge result sets
        });

        if (schoolUsers.length === 0) {
          return null; // Will handle empty case outside transaction
        }

        userIds = schoolUsers.map((u) => u.id);
        whereClause.userId = {
          in: userIds,
        };
      } else if (scope === "license") {
        // Get users from the license in transaction
        const licenseUsers = await tx.licenseOnUser.findMany({
          where: { licenseId: entityId },
          select: { userId: true },
          take: 1000, // Limit to prevent huge result sets
        });

        if (licenseUsers.length === 0) {
          return null; // Will handle empty case outside transaction
        }

        userIds = licenseUsers.map((lu) => lu.userId);
        whereClause.userId = {
          in: userIds,
        };
      }

      // Activity type filter
      if (activityTypesFilter.length > 0) {
        whereClause.activityType = {
          in: activityTypesFilter as ActivityType[],
        };
      }

      // Fetch activities and available types in parallel within transaction
      const [activities, availableTypes] = await Promise.all([
        tx.userActivity.findMany({
          where: whereClause,
          select: {
            id: true,
            userId: true,
            activityType: true,
            completed: true,
            timer: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 10000, // Prevent excessive memory usage
        }),
        tx.userActivity.findMany({
          where: scope === "student"
            ? { userId: entityId }
            : scope === "school"
              ? { userId: { in: userIds } }
              : {},
          select: {
            activityType: true,
          },
          distinct: ["activityType"],
        }),
      ]);

      return { activities, availableTypes, userIds };
    });

    // Handle empty school case
    if (!result) {
      console.warn(
        `[Activity Heatmap] No users found for school: ${entityId}`
      );
      return {
        scope,
        entityId,
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
    }

    const { activities, availableTypes } = result;

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

    // Convert map to array
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

    // Calculate summary metadata
    const totalActivities = buckets.reduce(
      (sum, bucket) => sum + bucket.activityCount,
      0
    );
    const allUniqueStudents = new Set<string>();
    buckets.forEach((bucket) => {
      // We need to re-count from activities since we lost the Set
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
      entityId,
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
        availableActivityTypes: availableTypes.map((t) => t.activityType),
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };
  };

  // Use caching for performance
  const data = await getCachedMetrics(cacheKey, fetchHeatmapData, {
    ttl: 30000, // 30 seconds in milliseconds
    staleTime: 15000, // 15 seconds stale time
  });

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

  // Determine scope based on role and parameters
  const requestedScope = searchParams.get("scope") as "student" | "class" | "school" | "license" | null;
  const scope = requestedScope || 
    (session.user.role === "STUDENT" ? "student" :
     session.user.role === "TEACHER" ? "class" : "school");
  
  let entityId = searchParams.get("entityId");
  
  // Determine entityId based on scope and user context
  if (!entityId) {
    if (scope === "student") {
      entityId = session.user.id;
    } else if (scope === "school") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { schoolId: true },
      });
      entityId = user?.schoolId || session.user.id;
    } else {
      entityId = session.user.id;
    }
  }
  
  const timeframe = searchParams.get("timeframe") || "30d";

  // Access control
  if (session.user.role === "STUDENT" && (scope !== "student" || entityId !== session.user.id)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Cannot access other student data" },
      { status: 403 }
    );
  }

  // Calculate date range
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
                  ? 3650 // 10 years for "all time"
                  : 30; // default to 30 days
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysAgo);

  const cacheKey = `activity-timeline:${scope}:${entityId}:${timeframe}`;

  const fetchTimelineData = async (): Promise<TimelineResponse> => {
    // Determine which users to query based on scope
    let userIds: string[] = [];
    
    if (scope === "student") {
      userIds = [entityId];
    } else if (scope === "school") {
      // For SYSTEM/ADMIN users without schoolId, get all students
      if (entityId === session.user.id && !entityId.startsWith('cmgj0')) {
        // Get all students from all schools
        const allStudents = await prisma.user.findMany({
          where: { 
            role: "STUDENT"
          },
          select: { id: true },
          take: 1000, // Limit to prevent excessive queries
        });
        userIds = allStudents.map(u => u.id);
      } else {
        // Get students from specific school
        const schoolUsers = await prisma.user.findMany({
          where: { 
            schoolId: entityId,
            role: "STUDENT"
          },
          select: { id: true },
          take: 1000, // Limit to prevent excessive queries
        });
        userIds = schoolUsers.map(u => u.id);
      }
    } else if (scope === "class") {
      const classUsers = await prisma.classroomStudent.findMany({
        where: { classroomId: entityId },
        select: { studentId: true },
      });
      userIds = classUsers.map(u => u.studentId);
    } else if (scope === "license") {
      // Get users from the license
      const licenseUsers = await prisma.licenseOnUser.findMany({
        where: { licenseId: entityId },
        select: { userId: true },
        take: 1000, // Limit to prevent excessive queries
      });
      userIds = licenseUsers.map(lu => lu.userId);
    }
    
    if (userIds.length === 0) {
      return {
        scope: scope as any,
        entityId,
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
    
    // Get assignments (due dates and completion)
    const assignments = await prisma.studentAssignment.findMany({
      where: {
        studentId: { in: userIds },
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        assignment: {
          include: {
            article: {
              select: {
                title: true,
                cefrLevel: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limit results
    });

    // Get SRS practice sessions - using correct field names
    const srsEvents = await prisma.userSentenceRecord.findMany({
      where: {
        userId: { in: userIds },
        updatedAt: {
          gte: startDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 100,
    });

    // Get reading sessions from lesson records
    const readingSessions = await prisma.lessonRecord.findMany({
      where: {
        userId: { in: userIds },
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        article: {
          select: {
            title: true,
            cefrLevel: true,
            genre: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limit results
    });

    // For now, use UTC timezone since it's not in the schema yet
    const timezone = "UTC";

    // Convert to timeline events
    const events: TimelineEvent[] = [];

    // Add assignment events
    assignments.forEach((assignment) => {
      events.push({
        id: `assignment-${assignment.id}`,
        type: "assignment",
        title: `Assignment: ${assignment.assignment.article?.title || "Article"}`,
        description: `Assigned reading (${assignment.assignment.article?.cefrLevel || "Unknown level"})`,
        timestamp: assignment.createdAt.toISOString(),
        metadata: {
          status: assignment.status,
          articleId: assignment.assignment.articleId,
          completedAt: assignment.completedAt?.toISOString(),
          userId: assignment.student.id,
          username: assignment.student.name,
        },
      });
    });

    // Add SRS events - using correct field names
    srsEvents.forEach((srsEvent) => {
      events.push({
        id: `srs-${srsEvent.id}`,
        type: "srs",
        title: "SRS Practice",
        description: `Practiced sentence: "${srsEvent.sentence.substring(0, 50)}..."`,
        timestamp: srsEvent.updatedAt.toISOString(),
        metadata: {
          state: srsEvent.state,
          sentence: srsEvent.sentence,
          userId: srsEvent.user.id,
          username: srsEvent.user.name,
        },
      });
    });

    // Add reading sessions
    readingSessions.forEach((session) => {
      const phases = [
        session.phase1,
        session.phase2,
        session.phase3,
        session.phase4,
        session.phase5,
        session.phase6,
        session.phase7,
        session.phase8,
        session.phase9,
        session.phase10,
        session.phase11,
        session.phase12,
        session.phase13,
        session.phase14,
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
        id: `reading-${session.id}`,
        type: "reading",
        title: `Read: ${session.article?.title || "Article"}`,
        description: `Reading session (${session.article?.genre || "Unknown genre"})`,
        timestamp: session.createdAt.toISOString(),
        duration: totalTime > 0 ? totalTime / 1000 : undefined, // Convert to seconds
        metadata: {
          articleId: session.articleId,
          cefrLevel: session.article?.cefrLevel,
          genre: session.article?.genre,
          completed: (session.phase14 as any)?.status === 2,
          userId: session.user.id,
          username: session.user.name,
        },
      });
    });

    // Sort by timestamp (newest first)
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Calculate metadata
    const eventTypes = events.reduce(
      (types, event) => {
        types[event.type] = (types[event.type] || 0) + 1;
        return types;
      },
      {} as Record<string, number>
    );

    return {
      scope: scope as any,
      entityId,
      timeframe,
      timezone,
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

  // Use caching for performance
  const data = await getCachedMetrics(cacheKey, fetchTimelineData, {
    ttl: 180000, // 3 minutes in milliseconds
    staleTime: 60000, // 1 minute stale time
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

    // Calculate date range
    const now = new Date();
    const daysAgo = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : timeframe === "120d" ? 120 : timeframe === "365d" ? 365 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);

    // Build where clause based on filters
    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    // Get daily activity data
    const activities = (await prisma.userActivity.findMany({
      where: whereClause,
      select: {
        userId: true,
        createdAt: true,
        timer: true,
        user: {
          select: {
            createdAt: true,
            studentClassrooms: classId
              ? {
                  where: {
                    classroomId: classId,
                  },
                  select: {
                    id: true,
                  },
                }
              : undefined,
          },
        },
      },
    })) as any;

    // Filter by class if specified
    const filteredActivities = classId
      ? activities.filter((a: any) => a.user.studentClassrooms?.length > 0)
      : activities;

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

    // Initialize all dates in range
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

    // Process activities
    filteredActivities.forEach((activity: any) => {
      const dateKey = new Date(activity.createdAt).toISOString().split("T")[0];
      const data = dateMap.get(dateKey);

      if (data) {
        data.activeUsers.add(activity.userId);
        data.sessions += 1;
        if (activity.timer) {
          data.totalTime += activity.timer;
        }

        // Check if user is new (created on this day)
        const userCreatedDate = new Date(activity.user.createdAt)
          .toISOString()
          .split("T")[0];
        if (userCreatedDate === dateKey) {
          data.newUsers.add(activity.userId);
        }
      }
    });

    // Convert to response format
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

    // Calculate summary
    const totalActiveUsers = new Set(
      filteredActivities.map((a: any) => a.userId)
    ).size;

    const totalSessions = filteredActivities.length;

    const totalTime = filteredActivities
      .filter((a: any) => a.timer)
      .reduce((sum: number, a: any) => sum + a.timer, 0);

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
    // Get all activities without date filter
    const activityCounts = await prisma.userActivity.groupBy({
      by: ["activityType"],
      _count: {
        id: true,
      },
    });

    const totalUsers = await prisma.user.count();

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
          userActivityData.totalRatingCount += activity._count.id;
          break;
        case "ARTICLE_READ":
        case "STORIES_READ":
        case "CHAPTER_READ":
          userActivityData.totalReadingCount += activity._count.id;
          break;
        case "LA_QUESTION":
          userActivityData.totalLaQuestionCount += activity._count.id;
          break;
        case "LEVEL_TEST":
          userActivityData.totalLevelTestCount += activity._count.id;
          break;
        case "MC_QUESTION":
          userActivityData.totalMcQuestionCount += activity._count.id;
          break;
        case "SA_QUESTION":
          userActivityData.totalSaQuestionCount += activity._count.id;
          break;
        case "SENTENCE_FLASHCARDS":
          userActivityData.totalSentenceFlashcardsCount += activity._count.id;
          break;
        case "VOCABULARY_FLASHCARDS":
          userActivityData.totalVocabularyFlashcardsCount += activity._count.id;
          break;
        case "VOCABULARY_MATCHING":
          userActivityData.totalVocabularyActivityCount += activity._count.id;
          break;
        case "SENTENCE_MATCHING":
        case "SENTENCE_ORDERING":
        case "SENTENCE_WORD_ORDERING":
        case "SENTENCE_CLOZE_TEST":
          userActivityData.totalSentenceActivityCount += activity._count.id;
          break;
        case "LESSON_FLASHCARD":
          userActivityData.totalLessonFlashcardCount += activity._count.id;
          break;
        case "LESSON_SENTENCE_FLASHCARDS":
          userActivityData.totalLessonSentenceFlashcardsCount +=
            activity._count.id;
          break;
      }
    });

    return NextResponse.json(
      {
        userActivityData,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching user activities from database:", err);

    if (err instanceof PrismaClientKnownRequestError) {
      return NextResponse.json(
        { message: "Database operation failed", code: err.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getAllUsersActivity() {
  try {
    // Use transaction to optimize connection usage and add pagination
    const result = await prisma.$transaction(async (tx) => {
      // First get a reasonable amount of recent activities (reduced from 5000 to 1000)
      const recentActivities = await tx.userActivity.findMany({
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
        orderBy: {
          createdAt: "desc",
        },
        take: 1000, // Reduced from 5000 to prevent connection issues
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days instead of 6 months
          },
        },
      });

      // Get article data for activities that reference articles
      const articleIds = new Set<string>();
      recentActivities.forEach((activity) => {
        // Only get article IDs from ARTICLE_READ and ARTICLE_RATING activities
        if (
          (activity.activityType === "ARTICLE_READ" ||
            activity.activityType === "ARTICLE_RATING") &&
          activity.targetId
        ) {
          articleIds.add(activity.targetId);
        }
      });

      // Fetch article data in the same transaction
      const articles = articleIds.size > 0 ? await tx.article.findMany({
        where: {
          id: { in: Array.from(articleIds) },
        },
        select: {
          id: true,
          cefrLevel: true,
          title: true,
          raLevel: true,
        },
      }) : [];

      // Get aggregated activity data for summary in the same transaction
      const activityCounts = await tx.userActivity.groupBy({
        by: ["activityType", "userId"],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 100, // Limit to top 100 most active users
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Same timeframe
          },
        },
      });

      return { recentActivities, articles, activityCounts };
    });

    const { recentActivities, articles, activityCounts } = result;

    const articleMap = new Map(
      articles.map((article: any) => [article.id, article])
    );

    const data = recentActivities.map((activity) => {
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

    return NextResponse.json(
      {
        data,
        summary: activityCounts,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching user activities from database:", err);

    if (err instanceof PrismaClientKnownRequestError) {
      return NextResponse.json(
        { message: "Database operation failed", code: err.code },
        { status: 400 }
      );
    }

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
    // Calculate date threshold based on dateRange parameter
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
      // For 'all time', don't set a start date filter
      startDate = undefined;
    } else {
      // Default to 30 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    if (licenseId) {
      // For specific license, get limited data to avoid timeout
      const license = await prisma.license.findUnique({
        where: { id: licenseId },
        select: {
          id: true,
          licenseUsers: {
            select: {
              userId: true,
            },
            take: 100, // Limit users to reduce query size
          },
        },
      });

      if (!license) {
        return {
          total: [],
          licenses: { [licenseId]: [] },
        };
      }

      const userIds = license.licenseUsers.map((lu) => lu.userId);

      if (userIds.length === 0) {
        return {
          total: [],
          licenses: { [licenseId]: [] },
        };
      }

      // Limit activities query to prevent timeout
      const whereClause: any = {
        userId: { in: userIds },
      };

      if (startDate) {
        whereClause.createdAt = { gte: startDate };
      }

      const activities = await prisma.userActivity.findMany({
        where: whereClause,
        select: {
          userId: true,
          createdAt: true,
        },
        take: dateRange === "all" ? 20000 : 5000, // Increase limit for 'all time'
      });

      const dateMap: { [date: string]: Set<string> } = {};

      activities.forEach((activity) => {
        const date = activity.createdAt.toISOString().split("T")[0];
        if (!dateMap[date]) {
          dateMap[date] = new Set();
        }
        dateMap[date].add(activity.userId);
      });

      const licenseData = Object.keys(dateMap)
        .sort()
        .map((date) => ({
          date,
          noOfUsers: dateMap[date].size,
        }));

      return {
        total: licenseData,
        licenses: { [licenseId]: licenseData },
      };
    }

    // For all licenses query - use more aggressive limiting
    const whereClauseAll: any = {};

    if (startDate) {
      whereClauseAll.createdAt = { gte: startDate };
    }

    const activities = await prisma.userActivity.findMany({
      where: whereClauseAll,
      select: {
        userId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            licenseId: true,
          },
        },
      },
      take: dateRange === "all" ? 50000 : 10000, // Increase limit for 'all time'
      orderBy: {
        createdAt: "desc", // Get most recent activities
      },
    });

    const totalDateMap: { [date: string]: Set<string> } = {};
    const licenseDateMap: {
      [licenseId: string]: { [date: string]: Set<string> };
    } = {};

    activities.forEach((activity) => {
      const date = activity.createdAt.toISOString().split("T")[0];
      const userId = activity.userId;
      const userLicenseId = activity.user.licenseId;

      if (!totalDateMap[date]) {
        totalDateMap[date] = new Set();
      }
      totalDateMap[date].add(userId);

      if (userLicenseId) {
        if (!licenseDateMap[userLicenseId]) {
          licenseDateMap[userLicenseId] = {};
        }
        if (!licenseDateMap[userLicenseId][date]) {
          licenseDateMap[userLicenseId][date] = new Set();
        }
        licenseDateMap[userLicenseId][date].add(userId);
      }
    });

    const totalData = Object.keys(totalDateMap)
      .sort()
      .map((date) => ({
        date,
        noOfUsers: totalDateMap[date].size,
      }));

    const licensesData: Record<string, { date: string; noOfUsers: number }[]> =
      {};

    Object.keys(licenseDateMap).forEach((licenseId) => {
      licensesData[licenseId] = Object.keys(licenseDateMap[licenseId])
        .sort()
        .map((date) => ({
          date,
          noOfUsers: licenseDateMap[licenseId][date].size,
        }));
    });

    return {
      total: totalData,
      licenses: licensesData,
    };
  } catch (error) {
    console.error(
      "Error fetching active user activities from database:",
      error
    );

    if (error instanceof PrismaClientKnownRequestError) {
      // If it's a connection timeout, return minimal data
      if (error.code === "P2024") {
        return {
          message: "Database connection timeout - returning cached data",
          total: [],
          licenses: {},
        };
      }
      return {
        message: "Database operation failed",
        code: error.code,
      };
    }

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
      const license = await prisma.license.findUnique({
        where: { id: licenseId },
        include: {
          licenseUsers: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!license) {
        return NextResponse.json(
          {
            total: [],
            licenses: { [licenseId]: [] },
          },
          { status: 200 }
        );
      }

      userIdFilter = license.licenseUsers.map((lu) => lu.userId);
    }

    const whereCondition: any = {
      createdAt: { gte: thirtyDaysAgo },
    };

    if (licenseId && userIdFilter.length > 0) {
      whereCondition.userId = { in: userIdFilter };
    }

    const activities = await prisma.userActivity.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            licenseId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalDateMap: { [date: string]: Map<string, any> } = {};
    const licenseDateMap: {
      [licenseId: string]: { [date: string]: Map<string, any> };
    } = {};

    activities.forEach((activity) => {
      const date = activity.createdAt.toISOString().split("T")[0];
      const userId = activity.userId;
      const user = activity.user;
      const userLicenseId = activity.user.licenseId;

      // Total data
      if (!totalDateMap[date]) {
        totalDateMap[date] = new Map();
      }
      totalDateMap[date].set(userId, user);

      // License data
      if (userLicenseId) {
        if (!licenseDateMap[userLicenseId]) {
          licenseDateMap[userLicenseId] = {};
        }
        if (!licenseDateMap[userLicenseId][date]) {
          licenseDateMap[userLicenseId][date] = new Map();
        }
        licenseDateMap[userLicenseId][date].set(userId, user);
      }
    });

    const totalData = Object.keys(totalDateMap)
      .sort()
      .map((date) => ({
        date,
        users: Array.from(totalDateMap[date].values()),
      }));

    const licensesData: Record<string, { date: string; users: any[] }[]> = {};

    Object.keys(licenseDateMap).forEach((licenseId) => {
      licensesData[licenseId] = Object.keys(licenseDateMap[licenseId])
        .sort()
        .map((date) => ({
          date,
          users: Array.from(licenseDateMap[licenseId][date].values()),
        }));
    });

    return NextResponse.json(
      {
        total: totalData,
        licenses: licensesData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/v1/activity/daily-active-users:", error);

    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json(
        { message: "Database operation failed", code: error.code },
        { status: 400 }
      );
    }

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

    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json(
        { message: "Database operation failed", code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function updateAllUserActivity() {
  try {
    // Get today's date for activity calculation
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    // Get total users count
    const totalUsers = await prisma.user.count();

    // Get activity counts by type for today
    const activityCounts = await prisma.userActivity.groupBy({
      by: ["activityType"],
      where: {
        createdAt: {
          gte: startOfDay,
        },
      },
      _count: {
        id: true,
      },
    });

    // Initialize total counts
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

    // Map activity types to counts
    activityCounts.forEach((activity) => {
      switch (activity.activityType) {
        case "ARTICLE_RATING":
        case "STORIES_RATING":
        case "CHAPTER_RATING":
          totalCounts.totalRatingCount += activity._count.id;
          break;
        case "ARTICLE_READ":
        case "STORIES_READ":
        case "CHAPTER_READ":
          totalCounts.totalReadingCount += activity._count.id;
          break;
        case "LA_QUESTION":
          totalCounts.totalLaQuestionCount += activity._count.id;
          break;
        case "LEVEL_TEST":
          totalCounts.totalLevelTestCount += activity._count.id;
          break;
        case "MC_QUESTION":
          totalCounts.totalMcQuestionCount += activity._count.id;
          break;
        case "SA_QUESTION":
          totalCounts.totalSaQuestionCount += activity._count.id;
          break;
        case "SENTENCE_FLASHCARDS":
          totalCounts.totalSentenceFlashcardsCount += activity._count.id;
          break;
        case "VOCABULARY_FLASHCARDS":
          totalCounts.totalVocabularyFlashcardsCount += activity._count.id;
          break;
        case "VOCABULARY_MATCHING":
          totalCounts.totalVocabularyActivityCount += activity._count.id;
          break;
        case "SENTENCE_MATCHING":
        case "SENTENCE_ORDERING":
        case "SENTENCE_WORD_ORDERING":
        case "SENTENCE_CLOZE_TEST":
          totalCounts.totalSentenceActivityCount += activity._count.id;
          break;
        case "LESSON_FLASHCARD":
          totalCounts.totalLessonFlashcardCount += activity._count.id;
          break;
        case "LESSON_SENTENCE_FLASHCARDS":
          totalCounts.totalLessonSentenceFlashcardsCount += activity._count.id;
          break;
      }
    });

    const userActivityData = {
      totalUsers,
      ...totalCounts,
    };

    return NextResponse.json(
      {
        updateUserActivity: "success",
        data: userActivityData,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error calculating user activity from database:", err);

    if (err instanceof PrismaClientKnownRequestError) {
      return NextResponse.json(
        { message: "Database operation failed", code: err.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a new user activity record
export async function createUserActivity(activityData: CreateActivityData) {
  try {
    const activity = await prisma.userActivity.create({
      data: {
        userId: activityData.userId,
        activityType: activityData.activityType,
        targetId: activityData.targetId,
        completed: activityData.completed ?? false,
        details: activityData.details || null,
        createdAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: "Activity created successfully",
        data: activity,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating user activity:", err);

    if (err instanceof PrismaClientKnownRequestError) {
      return NextResponse.json(
        { message: "Database operation failed", code: err.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get user activities by user ID
export async function getUserActivities(userId: string, limit?: number) {
  try {
    const activities = await prisma.userActivity.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit || 100,
    });

    return NextResponse.json(
      {
        data: activities,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching user activities:", err);

    if (err instanceof PrismaClientKnownRequestError) {
      return NextResponse.json(
        { message: "Database operation failed", code: err.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete user activity by ID
export async function deleteUserActivity(activityId: string) {
  try {
    await prisma.userActivity.delete({
      where: {
        id: activityId,
      },
    });

    return NextResponse.json(
      {
        message: "Activity deleted successfully",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error deleting user activity:", err);

    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json(
          { message: "Activity not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { message: "Database operation failed", code: err.code },
        { status: 400 }
      );
    }

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
    const activity = await prisma.userActivity.update({
      where: {
        id: activityId,
      },
      data: {
        activityType: updateData.activityType,
        targetId: updateData.targetId,
        completed: updateData.completed,
        details: updateData.details || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: "Activity updated successfully",
        data: activity,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating user activity:", err);

    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json(
          { message: "Activity not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { message: "Database operation failed", code: err.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

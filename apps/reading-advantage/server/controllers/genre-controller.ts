import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { MetricsGenresResponse, GenreMetrics } from "@/types/dashboard";
import { db, eq, and, gte, inArray } from "@reading-advantage/db";
import {
  users,
  lessonRecords,
  articles,
  classroomStudents,
  classroomTeachers,
  userActivity,
  xpLogs,
} from "@reading-advantage/db/schema";
import {
  getGenreMetrics as getEnhancedGenreMetrics,
  GenreMetricsResponse,
  GenreEngagementData,
  GenreRecommendation,
} from "@/server/services/metrics/genre-engagement-service";

/**
 * Get genre metrics with enhanced analytics and recommendations
 * @param req - Extended Next request with session
 * @returns Genre metrics response
 */
export async function getGenreMetrics(req: ExtendedNextRequest) {
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
    const studentId = searchParams.get("studentId");
    const enhanced = searchParams.get("enhanced") === "true";
    const includeRecommendations =
      searchParams.get("includeRecommendations") !== "false";

    // If enhanced mode is requested, use the new service
    if (enhanced) {
      return getEnhancedGenreMetricsResponse(
        req,
        studentId,
        classId,
        schoolId,
        timeframe as "7d" | "30d" | "90d" | "6m",
        includeRecommendations
      );
    }

    // Legacy implementation for backward compatibility
    const now = new Date();
    const daysAgo = timeframe === "7d" ? 7 : timeframe === "90d" ? 90 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);

    // Build conditions for lesson records
    const conditions: any[] = [gte(lessonRecords.createdAt, startDate)];
    if (schoolId) {
      conditions.push(eq(users.schoolId, schoolId));
    }

    const recordRows = await db
      .select({
        id: lessonRecords.id,
        userId: lessonRecords.userId,
        articleId: articles.id,
        articleGenre: articles.genre,
        articleRaLevel: articles.raLevel,
      })
      .from(lessonRecords)
      .leftJoin(articles, eq(lessonRecords.articleId, articles.id))
      .leftJoin(users, eq(lessonRecords.userId, users.id))
      .where(and(...conditions));

    // Filter by class if specified
    let filteredRecords = recordRows;
    if (classId) {
      const classStudentRows = await db
        .select({ studentId: classroomStudents.studentId })
        .from(classroomStudents)
        .where(eq(classroomStudents.classroomId, classId));
      const classStudentIds = new Set(classStudentRows.map((r) => r.studentId));
      filteredRecords = recordRows.filter((r) => classStudentIds.has(r.userId));
    }

    const articleIds = filteredRecords
      .map((r) => r.articleId)
      .filter((id): id is string => !!id);

    const userIds = [...new Set(filteredRecords.map((r) => r.userId))];

    // Get XP data from userActivity + xpLogs
    const xpMap = new Map<string, number>();

    if (userIds.length > 0 && articleIds.length > 0) {
      const articleIdSet = new Set(articleIds);

      // Fetch matching userActivity rows for these users in date range
      const activityRows = await db
        .select({
          id: userActivity.id,
          userId: userActivity.userId,
          targetId: userActivity.targetId,
          details: userActivity.details,
        })
        .from(userActivity)
        .where(
          and(
            inArray(userActivity.userId, userIds),
            gte(userActivity.createdAt, startDate)
          )
        );

      // Filter to activities referencing one of our articleIds (targetId or details.articleId)
      const relevantActivities = activityRows.filter((act) => {
        const detailsArticleId = (act.details as any)?.articleId;
        return (
          articleIdSet.has(act.targetId ?? "") ||
          articleIdSet.has(detailsArticleId)
        );
      });

      // Get XP logs for these activity IDs
      const activityIds = relevantActivities.map((a) => a.id);
      const xpRows =
        activityIds.length > 0
          ? await db
              .select({
                activityId: xpLogs.activityId,
                xpEarned: xpLogs.xpEarned,
              })
              .from(xpLogs)
              .where(
                and(
                  inArray(xpLogs.activityId, activityIds),
                  gte(xpLogs.createdAt, startDate)
                )
              )
          : [];

      const activityXpMap = new Map<string, number>();
      xpRows.forEach((row) => {
        activityXpMap.set(
          row.activityId,
          (activityXpMap.get(row.activityId) ?? 0) + row.xpEarned
        );
      });

      // Build user:article → xp map
      relevantActivities.forEach((act) => {
        const articleId =
          (act.details as any)?.articleId ?? act.targetId ?? "";
        const key = `${act.userId}:${articleId}`;
        const xp = activityXpMap.get(act.id) ?? 0;
        xpMap.set(key, (xpMap.get(key) ?? 0) + xp);
      });
    }

    const genreMap = new Map<
      string,
      {
        count: number;
        totalLevel: number;
        totalXp: number;
        userSet: Set<string>;
      }
    >();

    filteredRecords.forEach((record) => {
      const genre = record.articleGenre || "Unknown";

      if (!genreMap.has(genre)) {
        genreMap.set(genre, {
          count: 0,
          totalLevel: 0,
          totalXp: 0,
          userSet: new Set(),
        });
      }

      const data = genreMap.get(genre)!;
      data.count += 1;
      data.totalLevel += record.articleRaLevel || 0;

      const xpKey = `${record.userId}:${record.articleId}`;
      data.totalXp += xpMap.get(xpKey) ?? 0;
      data.userSet.add(record.userId);
    });

    const totalReads = filteredRecords.length;

    const genres: GenreMetrics[] = Array.from(genreMap.entries())
      .map(([genre, data]) => ({
        genre,
        count: data.count,
        percentage:
          totalReads > 0
            ? Math.round((data.count / totalReads) * 100 * 10) / 10
            : 0,
        averageLevel:
          data.count > 0
            ? Math.round((data.totalLevel / data.count) * 10) / 10
            : 0,
        totalXp: data.totalXp,
      }))
      .sort((a, b) => b.count - a.count);

    let diversity = 0;
    if (totalReads > 0) {
      genres.forEach((g) => {
        const p = g.count / totalReads;
        if (p > 0) {
          diversity -= p * Math.log2(p);
        }
      });
      const maxEntropy = Math.log2(Math.min(genres.length, 10));
      diversity = maxEntropy > 0 ? diversity / maxEntropy : 0;
    }

    const response: MetricsGenresResponse = {
      timeframe,
      genres,
      summary: {
        totalGenres: genres.length,
        mostPopular: genres.length > 0 ? genres[0].genre : "N/A",
        diversity: Math.round(diversity * 100) / 100,
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
    console.error("[Controller] getGenreMetrics - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch genre metrics",
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
 * Enhanced genre metrics with recommendations using new service
 */
async function getEnhancedGenreMetricsResponse(
  req: ExtendedNextRequest,
  studentId?: string | null,
  classId?: string | null,
  schoolId?: string | null,
  timeframe: "7d" | "30d" | "90d" | "6m" = "30d",
  includeRecommendations: boolean = true
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    let scope: "student" | "class" | "school";
    let scopeId: string;

    if (studentId) {
      scope = "student";
      scopeId = studentId;
    } else if (classId) {
      scope = "class";
      scopeId = classId;
    } else if (schoolId) {
      scope = "school";
      scopeId = schoolId;
    } else {
      scope = "student";
      scopeId = req.session!.user.id;
    }

    const authCheck = await checkEnhancedAuthorization(
      req.session,
      scope,
      scopeId
    );
    if (!authCheck.authorized) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: authCheck.error },
        { status: 403 }
      );
    }

    const metrics = await getEnhancedGenreMetrics(scope, scopeId, timeframe);

    if (!includeRecommendations) {
      metrics.recommendations = [];
    }

    const duration = Date.now() - startTime;

    return NextResponse.json(metrics, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[Controller] getEnhancedGenreMetrics - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch enhanced genre metrics",
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
 * Check authorization for enhanced genre metrics
 */
async function checkEnhancedAuthorization(
  session: any,
  scope: string,
  scopeId: string
): Promise<{ authorized: boolean; error?: string }> {
  if (!session?.user?.id) {
    return { authorized: false, error: "Authentication required" };
  }

  const [userRow] = await db
    .select({ id: users.id, role: users.role, schoolId: users.schoolId })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!userRow) return { authorized: false, error: "User not found" };

  switch (scope) {
    case "student":
      if (userRow.role === "STUDENT" || userRow.role === "USER") {
        if (userRow.id !== scopeId) {
          return {
            authorized: false,
            error: "Students can only access their own metrics",
          };
        }
      } else if (userRow.role === "TEACHER") {
        const teacherClassroomRows = await db
          .select({ classroomId: classroomTeachers.classroomId })
          .from(classroomTeachers)
          .where(eq(classroomTeachers.teacherId, userRow.id));
        const teacherClassroomIds = teacherClassroomRows.map((r) => r.classroomId);

        if (teacherClassroomIds.length === 0) {
          return {
            authorized: false,
            error: "Teacher does not have access to this student",
          };
        }

        const [studentAccess] = await db
          .select({ studentId: classroomStudents.studentId })
          .from(classroomStudents)
          .where(
            and(
              eq(classroomStudents.studentId, scopeId),
              inArray(classroomStudents.classroomId, teacherClassroomIds)
            )
          )
          .limit(1);

        if (!studentAccess) {
          return {
            authorized: false,
            error: "Teacher does not have access to this student",
          };
        }
      } else if (userRow.role === "ADMIN" || userRow.role === "SYSTEM") {
        // Full access
      } else {
        return { authorized: false, error: "Insufficient permissions" };
      }
      break;

    case "class": {
      if (userRow.role === "ADMIN" || userRow.role === "SYSTEM") break;

      const [teacherAccess] = await db
        .select({ classroomId: classroomTeachers.classroomId })
        .from(classroomTeachers)
        .where(
          and(
            eq(classroomTeachers.classroomId, scopeId),
            eq(classroomTeachers.teacherId, userRow.id)
          )
        )
        .limit(1);

      const [studentAccess] = await db
        .select({ classroomId: classroomStudents.classroomId })
        .from(classroomStudents)
        .where(
          and(
            eq(classroomStudents.classroomId, scopeId),
            eq(classroomStudents.studentId, userRow.id)
          )
        )
        .limit(1);

      if (!teacherAccess && !studentAccess) {
        return { authorized: false, error: "No access to this classroom" };
      }
      break;
    }

    case "school":
      if (userRow.role === "ADMIN" || userRow.role === "SYSTEM") {
        // Full access
      } else if (userRow.schoolId === scopeId) {
        // User belongs to this school
      } else {
        return { authorized: false, error: "No access to this school" };
      }
      break;

    default:
      return { authorized: false, error: "Invalid scope" };
  }

  return { authorized: true };
}

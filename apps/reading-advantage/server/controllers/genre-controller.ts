import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { MetricsGenresResponse, GenreMetrics } from "@/types/dashboard";
import { prisma } from "@/lib/prisma";
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

    const whereClause: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (schoolId) {
      whereClause.user = {
        schoolId,
      };
    }

    const lessonRecords = (await prisma.lessonRecord.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        article: {
          select: {
            id: true,
            genre: true,
            raLevel: true,
          },
        },
        user: {
          select: {
            id: true,
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

    const filteredRecords = classId
      ? lessonRecords.filter((lr: any) => lr.user.studentClassrooms?.length > 0)
      : lessonRecords;

    // Get XP for each article from UserActivity and XPLogs
    const articleIds = filteredRecords
      .map((r: any) => r.article?.id)
      .filter((id: any) => id);

    const userIds = [...new Set(filteredRecords.map((r: any) => r.userId))];

    // Get XP data from UserActivity + XPLogs
    // Include both direct article activities and MC_QUESTION activities (which use question_id as targetId)
    const xpData = await prisma.$queryRaw<
      Array<{
        user_id: string;
        article_id: string;
        total_xp: bigint;
      }>
    >`
      SELECT 
        ua.user_id,
        COALESCE(
          ua.details->>'articleId',
          ua.target_id
        ) as article_id,
        COALESCE(SUM(xp.xp_earned), 0) as total_xp
      FROM "UserActivity" ua
      LEFT JOIN "XPLogs" xp ON ua.id = xp.activity_id
        AND xp."createdAt" >= ${startDate}
      WHERE ua.user_id = ANY(${userIds}::text[])
        AND ua."createdAt" >= ${startDate}
        AND (
          ua.target_id = ANY(${articleIds}::text[])
          OR ua.details->>'articleId' = ANY(${articleIds}::text[])
        )
      GROUP BY ua.user_id, article_id
    `;

    // Create XP lookup map
    const xpMap = new Map<string, number>();
    xpData.forEach((row) => {
      const key = `${row.user_id}:${row.article_id}`;
      const currentXp = xpMap.get(key) || 0;
      xpMap.set(key, currentXp + Number(row.total_xp));
    });

    const genreMap = new Map<
      string,
      {
        count: number;
        totalLevel: number;
        totalXp: number;
        userSet: Set<string>;
      }
    >();

    filteredRecords.forEach((record: any) => {
      const genre = record.article?.genre || "Unknown";

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
      data.totalLevel += record.article?.raLevel || 0;

      // Get XP from the lookup map instead of user.xp
      const xpKey = `${record.userId}:${record.article?.id}`;
      const articleXp = xpMap.get(xpKey) || 0;
      data.totalXp += articleXp;

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
    // Determine scope and scope ID
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
      // Default to requesting user's data
      scope = "student";
      scopeId = req.session!.user.id;
    }

    // Check authorization
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

    // Get enhanced metrics
    const metrics = await getEnhancedGenreMetrics(scope, scopeId, timeframe);

    // Filter recommendations if not requested
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      schoolId: true,
      studentClassrooms: {
        select: { classroomId: true },
      },
      teacherClassrooms: {
        select: { classroomId: true },
      },
      createdClassrooms: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    return { authorized: false, error: "User not found" };
  }

  switch (scope) {
    case "student":
      // Students can only access their own data
      // Teachers/admins can access students in their scope
      if (user.role === "STUDENT" || user.role === "USER") {
        if (user.id !== scopeId) {
          return {
            authorized: false,
            error: "Students can only access their own metrics",
          };
        }
      } else if (user.role === "TEACHER") {
        // Check if teacher has access to this student
        const studentAccess = await prisma.classroomStudent.findFirst({
          where: {
            studentId: scopeId,
            classroom: {
              OR: [
                { teacherId: user.id },
                { teachers: { some: { teacherId: user.id } } },
              ],
            },
          },
        });
        if (!studentAccess) {
          return {
            authorized: false,
            error: "Teacher does not have access to this student",
          };
        }
      } else if (user.role === "ADMIN" || user.role === "SYSTEM") {
        // System admins and system users can access any student
      } else {
        return { authorized: false, error: "Insufficient permissions" };
      }
      break;

    case "class":
      // Check if user has access to this classroom
      const classroomAccess = await prisma.classroom.findFirst({
        where: {
          id: scopeId,
          OR: [
            // Teacher owns the classroom
            { teacherId: user.id },
            // Teacher is added as co-teacher
            { teachers: { some: { teacherId: user.id } } },
            // Student is in the classroom
            { students: { some: { studentId: user.id } } },
            // System admin access
            ...(user.role === "ADMIN" || user.role === "SYSTEM" ? [{}] : []),
          ],
        },
      });

      if (!classroomAccess) {
        return { authorized: false, error: "No access to this classroom" };
      }
      break;

    case "school":
      // Check school access
      if (user.role === "ADMIN" || user.role === "SYSTEM") {
        // System admins and system users can access any school
      } else if (user.schoolId === scopeId) {
        // Users can access their own school's data
      } else {
        return { authorized: false, error: "No access to this school" };
      }
      break;

    default:
      return { authorized: false, error: "Invalid scope" };
  }

  return { authorized: true };
}

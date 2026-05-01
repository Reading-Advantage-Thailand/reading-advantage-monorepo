import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import {
  MetricsGenresResponse,
  GenreMetrics,
  MetricsSRSResponse,
  SRSMetrics,
  MetricsVelocityResponse,
  VelocityDataPoint,
} from "@/types/dashboard";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getStudentVelocity } from "@/server/services/metrics/velocity-service";
import { getStudentSRSHealth } from "@/server/services/metrics/srs-health-service";

/**
 * Get genre metrics
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
    const timeframe = searchParams.get("timeframe") || "365d";
    const schoolId = searchParams.get("schoolId");
    const classId = searchParams.get("classId");

    const now = new Date();
    const daysAgo =
      timeframe === "7d"
        ? 7
        : timeframe === "30d"
          ? 30
          : timeframe === "90d"
            ? 90
            : 365;
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
            genre: true,
            raLevel: true,
          },
        },
        user: {
          select: {
            xp: true,
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
      data.totalXp += record.user?.xp || 0;
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
 * Get SRS metrics (Enhanced Health Metrics)
 * @param req - Extended Next request with session
 * @returns Enhanced SRS health metrics response
 */
export async function getSRSMetrics(req: ExtendedNextRequest) {
  // Delegate to the enhanced SRS health controller
  const { getSRSHealthMetrics } = await import("./srs-health-controller");
  return getSRSHealthMetrics(req);
}

/**
 * Get velocity metrics
 * @param req - Extended Next request with session
 * @returns Velocity metrics response
 */
export async function getVelocityMetrics(req: ExtendedNextRequest) {
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
    const timeframe = searchParams.get("timeframe") || "365d";
    const studentId = searchParams.get("studentId");
    const schoolId = searchParams.get("schoolId");
    const classId = searchParams.get("classId");

    // If studentId is provided, return student-scoped metrics
    if (studentId) {
      const studentMetrics = await getStudentVelocity(studentId, true);
      
      if (!studentMetrics) {
        return NextResponse.json(
          { code: "NOT_FOUND", message: "Student velocity metrics not found" },
          { status: 404 }
        );
      }

      const duration = Date.now() - startTime;

      return NextResponse.json(
        {
          scope: "student",
          student: studentMetrics,
          cache: {
            cached: false,
            generatedAt: new Date().toISOString(),
          },
        },
        {
          headers: {
            "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
            "X-Response-Time": `${duration}ms`,
          },
        }
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
            : 365;
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
        createdAt: true,
        userId: true,
        article: {
          select: {
            raLevel: true,
            passage: true,
          },
        },
        user: {
          select: {
            level: true,
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

    const dateMap = new Map<
      string,
      {
        articlesRead: number;
        wordsRead: number;
        timeSpent: number;
        totalLevel: number;
        count: number;
      }
    >();

    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split("T")[0];
      dateMap.set(dateKey, {
        articlesRead: 0,
        wordsRead: 0,
        timeSpent: 0,
        totalLevel: 0,
        count: 0,
      });
    }

    filteredRecords.forEach((record: any) => {
      const dateKey = new Date(record.createdAt).toISOString().split("T")[0];
      const data = dateMap.get(dateKey);

      if (data) {
        data.articlesRead += 1;

        if (record.article?.passage) {
          const wordCount = record.article.passage.split(/\s+/).length;
          data.wordsRead += wordCount;
          data.timeSpent += Math.ceil(wordCount / 200);
        }

        data.totalLevel += record.user?.level || 0;
        data.count += 1;
      }
    });

    const dataPoints: VelocityDataPoint[] = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        articlesRead: data.articlesRead,
        wordsRead: data.wordsRead,
        timeSpent: data.timeSpent,
        averageLevel:
          data.count > 0
            ? Math.round((data.totalLevel / data.count) * 10) / 10
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalArticles = filteredRecords.length;
    const totalWords = dataPoints.reduce((sum, dp) => sum + dp.wordsRead, 0);
    const totalTime = dataPoints.reduce((sum, dp) => sum + dp.timeSpent, 0);
    const averagePerDay = Math.round((totalArticles / daysAgo) * 10) / 10;

    const midPoint = Math.floor(dataPoints.length / 2);
    const firstHalf = dataPoints.slice(0, midPoint);
    const secondHalf = dataPoints.slice(midPoint);

    const firstHalfAvg =
      firstHalf.length > 0
        ? firstHalf.reduce((sum, dp) => sum + dp.articlesRead, 0) /
          firstHalf.length
        : 0;

    const secondHalfAvg =
      secondHalf.length > 0
        ? secondHalf.reduce((sum, dp) => sum + dp.articlesRead, 0) /
          secondHalf.length
        : 0;

    let trend: "up" | "down" | "stable" = "stable";
    if (secondHalfAvg > firstHalfAvg * 1.1) trend = "up";
    else if (secondHalfAvg < firstHalfAvg * 0.9) trend = "down";

    const response: MetricsVelocityResponse = {
      timeframe,
      dataPoints,
      summary: {
        totalArticles,
        totalWords,
        totalTime,
        averagePerDay,
        trend,
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
    console.error("[Controller] getVelocityMetrics - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch velocity metrics",
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

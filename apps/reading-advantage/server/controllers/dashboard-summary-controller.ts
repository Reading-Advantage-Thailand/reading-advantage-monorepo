/**
 * Dashboard Summary Controller
 *
 * Optimized endpoint that combines activity, alignment, and velocity metrics
 * into a single request to reduce connection pool usage.
 */

import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { db, sql } from "@reading-advantage/db";
import { getCachedMetrics } from "@/lib/cache/metrics";

interface DashboardSummaryResponse {
  activity: {
    totalSessions: number;
    totalActiveUsers: number;
    averageSessionLength: number;
  };
  alignment: {
    alignmentScore: number;
  };
  velocity: {
    avgXpPerStudent7d: number;
    avgXpPerStudent30d: number;
  };
  trends: {
    sessionsGrowth: number;
    usersGrowth: number;
    sessionTimeGrowth: number;
    velocityGrowth: number;
    alignmentGrowth: number;
  };
  cache: {
    cached: boolean;
    generatedAt: string;
  };
}

/**
 * Get dashboard summary metrics in a single optimized query
 *
 * Query Parameters:
 * - dateRange: '7d' | '30d' | '90d' | 'all' (default: '30d')
 */
export async function getDashboardSummary(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get timeframe from query parameters
    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("dateRange") || "30d";

    // Calculate days based on dateRange
    const daysMap: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      all: 36500, // 100 years - effectively all time
    };
    const days = daysMap[dateRange] || 30;

    // Include dateRange in cache key
    const cacheKey = `dashboard-summary:${session.user.id}:${dateRange}`;

    const fetchSummaryData = async (): Promise<DashboardSummaryResponse> => {
      const now = new Date();

      // Current period: now - days to now
      const currentPeriodStart = new Date(now);
      currentPeriodStart.setDate(currentPeriodStart.getDate() - days);

      // Previous period: (now - 2*days) to (now - days)
      const previousPeriodStart = new Date(now);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);
      const previousPeriodEnd = new Date(now);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Use Drizzle's parameterized `sql` template directly. Each query is
      // independently issued via Promise.all to keep behavior equivalent to
      // the previous batched helper, but with safe binding (no manual $n
      // interpolation) and unified Drizzle/Postgres table/column names.
      const [
        activityRows,
        activityPreviousRows,
        alignmentRows,
        velocityRows,
        velocityPreviousRows,
      ] = (await Promise.all([
        db.execute(sql`
          SELECT
            COUNT(*)::int AS total_sessions,
            COUNT(DISTINCT user_id)::int AS total_users,
            COALESCE(AVG(NULLIF(timer, 0) / 60.0), 0)::numeric AS avg_session_length
          FROM user_activity
          WHERE created_at >= ${currentPeriodStart}
        `),
        db.execute(sql`
          SELECT
            COUNT(*)::int AS total_sessions,
            COUNT(DISTINCT user_id)::int AS total_users,
            COALESCE(AVG(NULLIF(timer, 0) / 60.0), 0)::numeric AS avg_session_length
          FROM user_activity
          WHERE created_at >= ${previousPeriodStart} AND created_at < ${previousPeriodEnd}
        `),
        db.execute(sql`
          WITH student_readings AS (
            SELECT
              u.id AS user_id,
              u.level AS student_ra_level,
              a.ra_level AS article_ra_level,
              lr.created_at
            FROM users u
            INNER JOIN lesson_records lr ON u.id = lr.user_id
            INNER JOIN articles a ON lr.article_id = a.id
            WHERE u.role = 'STUDENT'
              AND lr.created_at >= ${currentPeriodStart}
              AND a.ra_level IS NOT NULL
          )
          SELECT
            COUNT(*)::int AS total_readings,
            COUNT(CASE
              WHEN article_ra_level BETWEEN student_ra_level - 1 AND student_ra_level + 1
              THEN 1
            END)::int AS aligned_count
          FROM student_readings
        `),
        // IMPORTANT: Velocity must include ALL students (even inactive ones)
        // to avoid inflated growth percentages when comparing periods
        // with different numbers of active students.
        db.execute(sql`
          WITH all_students AS (
            SELECT id FROM users WHERE role = 'STUDENT'
          ),
          student_xp_7d AS (
            SELECT
              s.id,
              COALESCE(SUM(x.xp_earned), 0) AS xp_7d
            FROM all_students s
            LEFT JOIN xp_logs x ON s.id = x.user_id
              AND x.created_at >= ${sevenDaysAgo}
            GROUP BY s.id
          ),
          student_xp_30d AS (
            SELECT
              s.id,
              COALESCE(SUM(x.xp_earned), 0) AS xp_30d
            FROM all_students s
            LEFT JOIN xp_logs x ON s.id = x.user_id
              AND x.created_at >= ${currentPeriodStart}
            GROUP BY s.id
          )
          SELECT
            COALESCE(AVG(x7.xp_7d), 0)::numeric AS avg_xp_7d,
            COALESCE(AVG(x30.xp_30d), 0)::numeric AS avg_xp_30d
          FROM student_xp_7d x7
          INNER JOIN student_xp_30d x30 ON x7.id = x30.id
        `),
        db.execute(sql`
          WITH all_students AS (
            SELECT id FROM users WHERE role = 'STUDENT'
          ),
          student_xp AS (
            SELECT
              s.id AS user_id,
              COALESCE(SUM(x.xp_earned), 0) AS total_xp
            FROM all_students s
            LEFT JOIN xp_logs x ON s.id = x.user_id
              AND x.created_at >= ${previousPeriodStart}
              AND x.created_at < ${previousPeriodEnd}
            GROUP BY s.id
          )
          SELECT
            COALESCE(AVG(total_xp), 0)::numeric AS avg_xp_previous
          FROM student_xp
        `),
      ])) as unknown as [
        Array<{ total_sessions: number; total_users: number; avg_session_length: number }>,
        Array<{ total_sessions: number; total_users: number; avg_session_length: number }>,
        Array<{ total_readings: number; aligned_count: number }>,
        Array<{ avg_xp_7d: number; avg_xp_30d: number }>,
        Array<{ avg_xp_previous: number }>,
      ];

      // Process results
      const activityData = activityRows[0] || {
        total_sessions: 0,
        total_users: 0,
        avg_session_length: 0,
      };

      const activityPreviousData = activityPreviousRows[0] || {
        total_sessions: 0,
        total_users: 0,
        avg_session_length: 0,
      };

      const alignmentData = alignmentRows[0] || {
        total_readings: 0,
        aligned_count: 0,
      };

      const velocityData = velocityRows[0] || {
        avg_xp_7d: 0,
        avg_xp_30d: 0,
      };

      const velocityPreviousData = velocityPreviousRows[0] || {
        avg_xp_previous: 0,
      };

      // Calculate alignment score
      const alignmentScore =
        alignmentData.total_readings > 0
          ? Math.round(
              (alignmentData.aligned_count / alignmentData.total_readings) * 100
            )
          : 0;

      // Calculate growth percentages (comparing current period vs previous period)
      const calculateGrowth = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const trends = {
        sessionsGrowth: calculateGrowth(
          Number(activityData.total_sessions),
          Number(activityPreviousData.total_sessions)
        ),
        usersGrowth: calculateGrowth(
          Number(activityData.total_users),
          Number(activityPreviousData.total_users)
        ),
        sessionTimeGrowth: calculateGrowth(
          Number(activityData.avg_session_length),
          Number(activityPreviousData.avg_session_length)
        ),
        velocityGrowth: calculateGrowth(
          Number(velocityData.avg_xp_30d),
          Number(velocityPreviousData.avg_xp_previous)
        ),
        alignmentGrowth: 0, // Alignment is aggregated data, trend not applicable
      };

      return {
        activity: {
          totalSessions: Number(activityData.total_sessions),
          totalActiveUsers: Number(activityData.total_users),
          averageSessionLength: Number(activityData.avg_session_length).toFixed(
            1
          ) as any,
        },
        alignment: {
          alignmentScore,
        },
        velocity: {
          avgXpPerStudent7d: Number(velocityData.avg_xp_7d),
          avgXpPerStudent30d: Number(velocityData.avg_xp_30d),
        },
        trends,
        cache: {
          cached: false,
          generatedAt: new Date().toISOString(),
        },
      };
    };

    // Use caching with 5-minute TTL
    const data = await getCachedMetrics(cacheKey, fetchSummaryData, {
      ttl: 300000, // 5 minutes
      staleTime: 60000, // 1 minute stale time
    });

    const duration = Date.now() - startTime;

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=900",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[Controller] getDashboardSummary - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch dashboard summary",
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

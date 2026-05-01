/**
 * Fallback query helpers for materialized views
 * 
 * This module provides fallback queries that run directly against
 * transactional tables when materialized views are unavailable.
 */

import { prisma } from '@/lib/prisma';

export interface FallbackOptions {
  /** Log fallback usage for monitoring */
  logFallback?: boolean;
  /** Timeout for fallback queries (ms) */
  timeout?: number;
}

/**
 * Safely query a materialized view with fallback
 */
export async function queryWithFallback<T>(
  viewName: string,
  viewQuery: () => Promise<T>,
  fallbackQuery: (() => Promise<T>) | null,
  options: FallbackOptions = {}
): Promise<T> {
  const { logFallback = true, timeout = 30000 } = options;

  try {
    // Try querying the materialized view first
    const result = await Promise.race([
      viewQuery(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      ),
    ]);

    return result;
  } catch (error: any) {
    if (logFallback) {
      console.warn(
        `[FALLBACK] Materialized view ${viewName} query failed:`,
        error.message
      );
    }

    // Check if materialized view exists
    const viewExists = await checkMatviewExists(viewName);

    if (!viewExists) {
      if (logFallback) {
        console.error(`[FALLBACK] Materialized view ${viewName} does not exist`);
      }
    }

    // Use fallback query if available
    if (fallbackQuery) {
      if (logFallback) {
        console.log(`[FALLBACK] Using direct query for ${viewName}`);
      }

      try {
        const fallbackResult = await Promise.race([
          fallbackQuery(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Fallback query timeout')), timeout)
          ),
        ]);

        return fallbackResult;
      } catch (fallbackError: any) {
        if (logFallback) {
          console.error(
            `[FALLBACK] Fallback query failed for ${viewName}:`,
            fallbackError.message
          );
        }
        throw fallbackError;
      }
    }

    // No fallback available, rethrow original error
    throw error;
  }
}

/**
 * Check if a materialized view exists
 */
async function checkMatviewExists(viewName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM pg_matviews
        WHERE schemaname = 'public'
        AND matviewname = $1
      ) as exists
      `,
      viewName
    );

    return result[0]?.exists || false;
  } catch (error) {
    console.error('[FALLBACK] Error checking matview existence:', error);
    return false;
  }
}

/**
 * Get student velocity metrics with fallback (Enhanced for Phase 2.1)
 */
export async function getStudentVelocity(
  userId: string,
  options?: FallbackOptions
): Promise<any> {
  return queryWithFallback(
    'mv_student_velocity',
    // Materialized view query
    async () => {
      return prisma.$queryRaw`
        SELECT *
        FROM mv_student_velocity
        WHERE user_id = ${userId}
      `;
    },
    // Fallback query
    async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          schoolId: true,
          xp: true,
          level: true,
          cefrLevel: true,
        },
      });

      if (!user) return null;

      // Get XP logs for time windows
      const xpLogs = await prisma.xPLog.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          xpEarned: true,
          createdAt: true,
        },
      });

      const xpLast7d = xpLogs
        .filter(log => log.createdAt >= sevenDaysAgo)
        .reduce((sum, log) => sum + log.xpEarned, 0);

      const xpLast30d = xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);

      const activeDays7d = new Set(
        xpLogs
          .filter(log => log.createdAt >= sevenDaysAgo)
          .map(log => log.createdAt.toISOString().split('T')[0])
      ).size;

      const activeDays30d = new Set(
        xpLogs.map(log => log.createdAt.toISOString().split('T')[0])
      ).size;

      const lastActivity = xpLogs.length > 0
        ? xpLogs.reduce((latest, log) => 
            log.createdAt > latest ? log.createdAt : latest,
            xpLogs[0].createdAt
          )
        : null;

      // Calculate XP to next level (simplified)
      const levelThresholds = [0, 5000, 11000, 18000, 26000, 35000, 45000, 56000, 68000, 81000, 95000, 110000, 126000, 143000, 161000, 180000, 200000, 221000, 243000];
      const nextLevelXp = levelThresholds[user.level + 1] || 243000;
      const xpToNextLevel = Math.max(0, nextLevelXp - user.xp);

      return [{
        user_id: user.id,
        email: user.email,
        display_name: user.name,
        school_id: user.schoolId,
        current_xp: user.xp,
        current_level: user.level,
        cefr_level: user.cefrLevel,
        xp_last_7d: xpLast7d,
        active_days_7d: activeDays7d,
        xp_per_active_day_7d: activeDays7d > 0 ? (xpLast7d / activeDays7d).toFixed(2) : 0,
        xp_per_calendar_day_7d: (xpLast7d / 7).toFixed(2),
        xp_last_30d: xpLast30d,
        active_days_30d: activeDays30d,
        xp_per_active_day_30d: activeDays30d > 0 ? (xpLast30d / activeDays30d).toFixed(2) : 0,
        xp_per_calendar_day_30d: (xpLast30d / 30).toFixed(2),
        xp_to_next_level: xpToNextLevel,
        next_level_xp: nextLevelXp,
        last_activity_at: lastActivity,
        is_low_signal: activeDays30d < 3 || (xpLast30d / activeDays30d) < 0.5,
      }];
    },
    options
  );
}

/**
 * Get assignment funnel metrics with fallback
 */
export async function getAssignmentFunnel(
  assignmentId: string,
  options?: FallbackOptions
): Promise<any> {
  return queryWithFallback(
    'mv_assignment_funnel',
    // Materialized view query
    async () => {
      return prisma.$queryRaw`
        SELECT *
        FROM mv_assignment_funnel
        WHERE assignment_id = ${assignmentId}
      `;
    },
    // Fallback query
    async () => {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          classroom: {
            select: { schoolId: true },
          },
          studentAssignments: {
            select: {
              studentId: true,
              status: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      });

      if (!assignment) return null;

      const totalStudents = assignment.studentAssignments.length;
      const startedCount = assignment.studentAssignments.filter(
        (sa) => sa.status === 'IN_PROGRESS' || sa.status === 'COMPLETED'
      ).length;
      const completedCount = assignment.studentAssignments.filter(
        (sa) => sa.status === 'COMPLETED'
      ).length;

      const completedAssignments = assignment.studentAssignments.filter(
        (sa) => sa.status === 'COMPLETED' && sa.startedAt && sa.completedAt
      );

      const avgCompletionHours =
        completedAssignments.length > 0
          ? completedAssignments.reduce((sum, sa) => {
              const hours =
                (sa.completedAt!.getTime() - sa.startedAt!.getTime()) /
                (1000 * 60 * 60);
              return sum + hours;
            }, 0) / completedAssignments.length
          : null;

      return [{
        assignment_id: assignment.id,
        classroom_id: assignment.classroomId,
        school_id: assignment.classroom.schoolId,
        article_id: assignment.articleId,
        assigned_at: assignment.createdAt,
        total_students: totalStudents,
        started_count: startedCount,
        completed_count: completedCount,
        started_pct: totalStudents > 0 ? (startedCount / totalStudents) * 100 : 0,
        completed_pct: totalStudents > 0 ? (completedCount / totalStudents) * 100 : 0,
        avg_completion_hours: avgCompletionHours,
      }];
    },
    options
  );
}

/**
 * Get daily activity rollups with fallback
 */
export async function getDailyActivityRollups(
  schoolId: string,
  startDate: Date,
  endDate: Date,
  options?: FallbackOptions
): Promise<any> {
  return queryWithFallback(
    'mv_daily_activity_rollups',
    // Materialized view query
    async () => {
      return prisma.$queryRaw`
        SELECT *
        FROM mv_daily_activity_rollups
        WHERE school_id = ${schoolId}
          AND activity_date >= ${startDate}
          AND activity_date <= ${endDate}
        ORDER BY activity_date DESC
      `;
    },
    // Fallback query
    async () => {
      const activities = await prisma.userActivity.groupBy({
        by: ['createdAt'],
        where: {
          user: {
            schoolId,
            role: 'STUDENT',
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
          userId: true,
        },
        _sum: {
          timer: true,
        },
      });

      // Group by date
      const dailyStats = new Map<string, any>();

      for (const activity of activities) {
        const dateKey = activity.createdAt.toISOString().split('T')[0];
        
        if (!dailyStats.has(dateKey)) {
          dailyStats.set(dateKey, {
            school_id: schoolId,
            activity_date: new Date(dateKey),
            total_activities: 0,
            active_students: new Set(),
            completed_activities: 0,
            total_time_minutes: 0,
          });
        }

        const stats = dailyStats.get(dateKey);
        stats.total_activities += activity._count.id;
        stats.total_time_minutes += (activity._sum.timer || 0) / 1000 / 60;
      }

      return Array.from(dailyStats.values()).map((stats) => ({
        ...stats,
        active_students: stats.active_students.size,
        avg_time_per_activity: stats.total_activities > 0
          ? stats.total_time_minutes / stats.total_activities
          : 0,
      }));
    },
    options
  );
}

/**
 * Health check for all materialized views
 */
export async function checkMatviewsHealth(): Promise<{
  healthy: boolean;
  views: Array<{
    name: string;
    exists: boolean;
    lastRefresh: Date | null;
    rowCount: number | null;
  }>;
}> {
  const viewNames = [
    'mv_student_velocity',
    'mv_class_velocity',
    'mv_school_velocity',
    'mv_assignment_funnel',
    'mv_class_assignment_funnel',
    'mv_school_assignment_funnel',
    'mv_srs_health',
    'mv_genre_engagement',
    'mv_activity_heatmap',
    'mv_alignment_metrics',
    'mv_daily_activity_rollups',
  ];

  // Use single transaction for all health checks to optimize connections
  const results = await prisma.$transaction(async (tx) => {
    const viewChecks = [];
    
    for (const viewName of viewNames) {
      try {
        console.log(`[HEALTH] Checking materialized view: ${viewName}`);
        
        const [existsResult, statsResult] = await Promise.all([
          tx.$queryRawUnsafe<Array<{ exists: boolean }>>(
            `
            SELECT EXISTS (
              SELECT 1 FROM pg_matviews
              WHERE schemaname = 'public' AND matviewname = $1
            ) as exists
            `,
            viewName
          ),
          tx.$queryRawUnsafe<Array<{ last_refresh: Date | null; row_count: bigint | null }>>(
            `
            SELECT
              pg_stat_get_last_analyze_time(c.oid) as last_refresh,
              (SELECT count(*) FROM ${viewName}) as row_count
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = $1 AND n.nspname = 'public'
            `,
            viewName
          ).catch(() => [{ last_refresh: null, row_count: null }]), // Handle potential table doesn't exist error
        ]);

        const exists = existsResult[0]?.exists || false;
        const lastRefresh = statsResult[0]?.last_refresh || null;
        const rowCount = statsResult[0]?.row_count ? Number(statsResult[0].row_count) : null;

        viewChecks.push({
          name: viewName,
          exists,
          lastRefresh,
          rowCount,
        });
      } catch (error) {
        console.error(`[HEALTH] Error checking ${viewName}:`, error);
        viewChecks.push({
          name: viewName,
          exists: false,
          lastRefresh: null,
          rowCount: null,
        });
      }
      
      // Small delay between checks to prevent overwhelming the connection
      if (viewNames.indexOf(viewName) < viewNames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    return viewChecks;
  });

  const healthy = results.every((r) => r.exists && r.rowCount !== null);

  return { healthy, views: results };
}

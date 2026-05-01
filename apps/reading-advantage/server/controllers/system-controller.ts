import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/middleware/guards";
import { buildSchoolFilter } from "@/server/utils/authorization";

export async function getSystemLicenses(req: NextRequest) {
  try {
    // Use the new guard system
    const authResult = await requireRole([Role.SYSTEM])(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Get all licenses with their users
    const licenses = await prisma.license.findMany({
      include: {
        licenseUsers: {
          select: {
            userId: true, // Only fetch userId
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Collect all userIds from licenses
    const allUserIds = licenses.flatMap((license) =>
      license.licenseUsers.map((licenseUser) => licenseUser.userId)
    );

    // Fetch XP logs for all userIds
    const xpLogs = await prisma.xPLog.findMany({
      where: {
        userId: {
          in: allUserIds,
        },
      },
      select: {
        userId: true,
        xpEarned: true,
      },
    });

    // Group XP logs by userId
    const userXpMap = new Map<string, number>();
    xpLogs.forEach((log: { userId: string; xpEarned: number | null }) => {
      const currentXp = userXpMap.get(log.userId) || 0;
      userXpMap.set(log.userId, currentXp + (log.xpEarned || 0));
    });

    // Process licenses to include XP totals
    const processedLicenses = licenses.map((license) => {
      let totalXp = 0;

      license.licenseUsers.forEach((licenseUser) => {
        totalXp += userXpMap.get(licenseUser.userId) || 0;
      });

      return {
        id: license.id,
        key: license.key,
        schoolName: license.schoolName,
        expiresAt: license.expiresAt,
        maxUsers: license.maxUsers,
        licenseType: license.licenseType,
        currentUsers: license.licenseUsers.length,
        totalXp,
        isActive: license.expiresAt
          ? new Date(license.expiresAt) > new Date()
          : false,
        createdAt: license.createdAt,
        updatedAt: license.updatedAt,
        owner: license.owner,
      };
    });

    return NextResponse.json({
      data: processedLicenses,
      total: processedLicenses.length,
    });
  } catch (error) {
    console.error("Error fetching licenses:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getSchoolXpData(req: NextRequest) {
  try {
    // Use the new guard system
    const authResult = await requireRole([Role.SYSTEM])(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const period = searchParams.get("period"); // 'day', 'week', 'month', 'all'

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
    } else if (period && period !== "all") {
      endDate = new Date();

      switch (period) {
        case "day":
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
      }
    }

    // Build where condition for XP logs
    const whereCondition: any = {};
    if (startDate && endDate) {
      whereCondition.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get all licenses with school XP data
    const licensesWithXp = await prisma.license.findMany({
      where: {
        schoolName: {
          not: "",
        },
      },
      include: {
        licenseUsers: {
          include: {
            user: {
              include: {
                xpLogs: {
                  where: whereCondition,
                  select: {
                    xpEarned: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Process data to get school XP totals
    const schoolXpMap = new Map<string, number>();

    licensesWithXp.forEach((license) => {
      if (license.schoolName) {
        let schoolXp = 0;

        license.licenseUsers.forEach((licenseUser) => {
          const userXp = licenseUser.user.xpLogs.reduce(
            (sum, log) => sum + log.xpEarned,
            0
          );
          schoolXp += userXp;
        });

        const currentXp = schoolXpMap.get(license.schoolName) || 0;
        schoolXpMap.set(license.schoolName, currentXp + schoolXp);
      }
    });

    // Convert to array and sort by XP
    const schoolXpData = Array.from(schoolXpMap.entries())
      .map(([school, xp]) => ({ school, xp }))
      .sort((a, b) => b.xp - a.xp);

    return NextResponse.json({
      data: schoolXpData,
      total: schoolXpData.length,
      period: period || "all",
      dateRange: startDate && endDate ? { from: startDate, to: endDate } : null,
    });
  } catch (error) {
    console.error("Error fetching school XP data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Materialized views in dependency order:
 * - Level 1: Student-level views (no dependencies)
 * - Level 2: Class-level views (depend on student data)
 * - Level 3: School-level rollups
 */
const MATERIALIZED_VIEWS = [
  // Level 1: Student-level metrics (base data, no dependencies)
  { name: "mv_student_velocity", level: 1 },
  { name: "mv_srs_health", level: 1 },
  { name: "mv_genre_engagement_metrics", level: 1 },
  { name: "mv_activity_heatmap", level: 1 },
  { name: "mv_assignment_funnel", level: 1 },
  { name: "mv_alignment_metrics", level: 1 },

  // Level 2: Class-level metrics (aggregate student data)
  { name: "mv_class_velocity", level: 2 },
  { name: "mv_srs_health_class", level: 2 },
  { name: "mv_class_genre_engagement", level: 2 },
  { name: "mv_class_activity_heatmap", level: 2 },
  { name: "mv_class_assignment_funnel", level: 2 },

  // Level 3: School-level rollups (aggregate class data)
  { name: "mv_school_velocity", level: 3 },
  { name: "mv_srs_health_school", level: 3 },
  { name: "mv_school_genre_engagement", level: 3 },
  { name: "mv_school_assignment_funnel", level: 3 },
  { name: "mv_daily_activity_rollups", level: 3 },
] as const;

interface RefreshResult {
  view: string;
  level: number;
  status: "success" | "success_concurrent" | "failed" | "skipped";
  duration: number;
  error?: string;
}

/**
 * Send NOTIFY to Postgres for cache invalidation
 */
async function notifyMetricsUpdate(
  viewNames: string[],
  metadata: {
    timestamp: string;
    success: number;
    failed: number;
  }
): Promise<void> {
  try {
    const payload = JSON.stringify({
      views: viewNames,
      timestamp: metadata.timestamp,
      success: metadata.success,
      failed: metadata.failed,
    });

    // Send NOTIFY to trigger cache invalidation
    // Escape single quotes in payload
    const escapedPayload = payload.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(
      `NOTIFY metrics_update, '${escapedPayload}'`
    );
  } catch (error: any) {
    console.error(
      "[NOTIFY] Failed to send metrics_update notification:",
      error.message
    );
  }
}

/**
 * Get status of all materialized views
 * 
 * Returns information about each materialized view including:
 * - Existence status
 * - Last refresh time
 * - Row count
 * - Index status
 */
export async function getMaterializedViewsStatus(req: NextRequest) {
  try {
    // Use the new guard system - only SYSTEM admins can view status
    const authResult = await requireRole([Role.SYSTEM])(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const statusResults = await Promise.all(
      MATERIALIZED_VIEWS.map(async (view) => {
        try {
          // Get view metadata from pg_matviews
          const viewInfo = await prisma.$queryRawUnsafe<any[]>(
            `SELECT 
              schemaname,
              matviewname,
              hasindexes,
              ispopulated,
              definition
            FROM pg_matviews 
            WHERE schemaname = 'public' 
            AND matviewname = $1`,
            view.name
          );

          if (!viewInfo || viewInfo.length === 0) {
            return {
              view: view.name,
              level: view.level,
              exists: false,
              status: 'missing',
            };
          }

          const info = viewInfo[0];

          // Get row count
          const countResult = await prisma.$queryRawUnsafe<any[]>(
            `SELECT COUNT(*) as count FROM ${view.name}`
          );
          const rowCount = Number(countResult[0]?.count || 0);

          // Get last refresh time from pg_stat_user_tables
          const statsResult = await prisma.$queryRawUnsafe<any[]>(
            `SELECT 
              n_tup_ins + n_tup_upd + n_tup_del as modifications,
              last_vacuum,
              last_autovacuum,
              last_analyze,
              last_autoanalyze
            FROM pg_stat_user_tables 
            WHERE schemaname = 'public' 
            AND relname = $1`,
            view.name
          );

          const stats = statsResult[0] || {};

          return {
            view: view.name,
            level: view.level,
            exists: true,
            status: info.ispopulated ? 'populated' : 'unpopulated',
            hasIndexes: info.hasindexes,
            rowCount,
            lastAnalyze: stats.last_analyze || stats.last_autoanalyze || null,
            modifications: Number(stats.modifications || 0),
          };
        } catch (error: any) {
          console.error(`Error getting status for ${view.name}:`, error.message);
          return {
            view: view.name,
            level: view.level,
            exists: false,
            status: 'error',
            error: error.message,
          };
        }
      })
    );

    // Group by level
    const byLevel = statusResults.reduce((acc, result) => {
      if (!acc[result.level]) acc[result.level] = [];
      acc[result.level].push(result);
      return acc;
    }, {} as Record<number, typeof statusResults>);

    // Calculate summary
    const summary = {
      total: MATERIALIZED_VIEWS.length,
      populated: statusResults.filter(r => r.status === 'populated').length,
      missing: statusResults.filter(r => r.status === 'missing').length,
      error: statusResults.filter(r => r.status === 'error').length,
      totalRows: statusResults.reduce((sum, r) => sum + (r.rowCount || 0), 0),
    };

    return NextResponse.json({
      summary,
      byLevel,
      views: statusResults,
      queriedAt: new Date().toISOString(),
      queriedBy: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[STATUS] Error getting materialized views status:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: String(error),
      },
      { status: 500 }
    );
  }
}


/**
 * Check if a materialized view exists in the database
 */
async function viewExists(viewName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT 1 
        FROM pg_matviews 
        WHERE schemaname = 'public' 
        AND matviewname = $1
      ) as exists`,
      viewName
    );
    return result[0]?.exists ?? false;
  } catch (error: any) {
    console.error(`[CHECK] Error checking if ${viewName} exists:`, error.message);
    return false;
  }
}

/**
 * Refresh a single materialized view with CONCURRENTLY fallback
 */
async function refreshView(
  viewName: string,
  level: number
): Promise<RefreshResult> {
  const startTime = Date.now();

  // Check if view exists before attempting to refresh
  const exists = await viewExists(viewName);
  if (!exists) {
    const duration = Date.now() - startTime;
    console.warn(`[REFRESH] ⊘ ${viewName} does not exist, skipping`);
    return {
      view: viewName,
      level,
      status: "skipped",
      duration,
      error: "Materialized view does not exist",
    };
  }

  try {
    // Try CONCURRENTLY first (allows reads during refresh)
    await prisma.$executeRawUnsafe(
      `REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`
    );

    const duration = Date.now() - startTime;

    return {
      view: viewName,
      level,
      status: "success_concurrent",
      duration,
    };
  } catch (error: any) {
    // Check if error is due to missing unique index
    const isMissingIndex = error.message?.includes('cannot refresh materialized view') && 
                           error.message?.includes('concurrently');
    
    if (isMissingIndex) {
      console.warn(
        `[REFRESH] ⚠ ${viewName} missing unique index for CONCURRENTLY, using regular refresh`
      );
    } else {
      console.warn(
        `[REFRESH] CONCURRENTLY failed for ${viewName}, trying regular refresh`
      );
    }

    // Fall back to regular refresh if CONCURRENTLY fails
    try {
      await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW ${viewName}`);

      const duration = Date.now() - startTime;

      return {
        view: viewName,
        level,
        status: "success",
        duration,
      };
    } catch (fallbackError: any) {
      const duration = Date.now() - startTime;
      console.error(`[REFRESH] ✗ ${viewName} failed:`, fallbackError.message);

      return {
        view: viewName,
        level,
        status: "failed",
        duration,
        error: fallbackError.message || String(fallbackError),
      };
    }
  }
}

export async function refreshMaterializedViews(req: NextRequest) {
  const requestStartTime = Date.now();

  try {
    // Use the new guard system - only SYSTEM admins can refresh materialized views
    const authResult = await requireRole([Role.SYSTEM])(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const results: RefreshResult[] = [];

    // Group views by level for better observability
    const viewsByLevel = MATERIALIZED_VIEWS.reduce(
      (acc, view) => {
        if (!acc[view.level]) acc[view.level] = [];
        acc[view.level].push(view);
        return acc;
      },
      {} as Record<number, (typeof MATERIALIZED_VIEWS)[number][]>
    );

    // Refresh each level in order
    for (const level of [1, 2, 3]) {
      const views = viewsByLevel[level] || [];
      if (views.length === 0) continue;

      const levelStartTime = Date.now();

      // Refresh views at the same level in parallel
      const levelResults = await Promise.all(
        views.map((view) => refreshView(view.name, view.level))
      );

      const levelDuration = Date.now() - levelStartTime;
      const levelSuccess = levelResults.filter(
        (r) => r.status !== "failed"
      ).length;
      const levelFailed = levelResults.filter(
        (r) => r.status === "failed"
      ).length;

      results.push(...levelResults);
    }

    const duration = Date.now() - requestStartTime;
    const successCount = results.filter(
      (r) => r.status === "success" || r.status === "success_concurrent"
    ).length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;
    const refreshedAt = new Date().toISOString();

    // Send notification for cache invalidation (only for successfully refreshed views)
    const successfulViews = results
      .filter((r) => r.status === "success" || r.status === "success_concurrent")
      .map((r) => r.view);

    if (successfulViews.length > 0) {
      await notifyMetricsUpdate(successfulViews, {
        timestamp: refreshedAt,
        success: successCount,
        failed: failedCount,
      });
    }

    return NextResponse.json({
      message: "Materialized views refresh completed",
      summary: {
        total: MATERIALIZED_VIEWS.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        duration: `${duration}ms`,
      },
      results,
      refreshedAt,
      refreshedBy: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    const duration = Date.now() - requestStartTime;
    console.error("[REFRESH] Error refreshing materialized views:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: String(error),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * Refresh materialized views (automated via Cloud Scheduler)
 *
 * This version does NOT require user authentication - uses access key only
 * Designed to be called by Google Cloud Scheduler every 15 minutes
 */
export async function refreshMaterializedViewsAutomated(req: NextRequest) {
  const requestStartTime = Date.now();

  console.log(`[CLOUD_SCHEDULER] Starting automated refresh of ${MATERIALIZED_VIEWS.length} materialized views`);

  try {
    // No user authentication - this is called by Cloud Scheduler with access key

    const results: RefreshResult[] = [];

    // Group views by level for better observability
    const viewsByLevel = MATERIALIZED_VIEWS.reduce(
      (acc, view) => {
        if (!acc[view.level]) acc[view.level] = [];
        acc[view.level].push(view);
        return acc;
      },
      {} as Record<number, (typeof MATERIALIZED_VIEWS)[number][]>
    );

    // Refresh each level in order
    for (const level of [1, 2, 3]) {
      const views = viewsByLevel[level] || [];
      if (views.length === 0) continue;

      const levelStartTime = Date.now();
      console.log(`[CLOUD_SCHEDULER] Refreshing Level ${level}: ${views.length} views`);

      // Refresh views at the same level in parallel
      const levelResults = await Promise.all(
        views.map((view) => refreshView(view.name, view.level))
      );

      const levelDuration = Date.now() - levelStartTime;
      const levelSuccess = levelResults.filter(
        (r) => r.status !== "failed"
      ).length;
      const levelFailed = levelResults.filter(
        (r) => r.status === "failed"
      ).length;

      console.log(
        `[CLOUD_SCHEDULER] Level ${level} completed: ${levelSuccess} success, ${levelFailed} failed (${levelDuration}ms)`
      );

      results.push(...levelResults);
    }

    const duration = Date.now() - requestStartTime;
    const successCount = results.filter(
      (r) => r.status === "success" || r.status === "success_concurrent"
    ).length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;
    const refreshedAt = new Date().toISOString();

    console.log(
      `[CLOUD_SCHEDULER] Refresh completed: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped (${duration}ms)`
    );

    // Log any failures for monitoring
    if (failedCount > 0) {
      const failures = results.filter(r => r.status === "failed");
      console.error("[CLOUD_SCHEDULER] Failed views:", failures.map(f => f.view).join(", "));
      failures.forEach(f => {
        console.error(`  - ${f.view}: ${f.error}`);
      });
    }

    // Send notification for cache invalidation (only for successfully refreshed views)
    const successfulViews = results
      .filter((r) => r.status === "success" || r.status === "success_concurrent")
      .map((r) => r.view);

    if (successfulViews.length > 0) {
      await notifyMetricsUpdate(successfulViews, {
        timestamp: refreshedAt,
        success: successCount,
        failed: failedCount,
      });
    }

    return NextResponse.json({
      message: "Materialized views refresh completed (automated)",
      summary: {
        total: MATERIALIZED_VIEWS.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        duration: `${duration}ms`,
      },
      results,
      refreshedAt,
      refreshedBy: "Cloud Scheduler",
    });
  } catch (error) {
    const duration = Date.now() - requestStartTime;
    console.error("[CLOUD_SCHEDULER] ❌ Error in automated refresh:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: String(error),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * Get automated refresh status (health check for Cloud Scheduler)
 * 
 * Returns basic information about the refresh endpoint and materialized views
 * No authentication required (same as refresh endpoint - uses access key)
 */
export async function getAutomatedRefreshStatus(req: NextRequest) {
  try {
    // Quick health check - count views by status
    const viewChecks = await Promise.all(
      MATERIALIZED_VIEWS.map(async (view) => {
        const exists = await viewExists(view.name);
        return {
          name: view.name,
          level: view.level,
          exists,
        };
      })
    );

    const summary = {
      totalViews: MATERIALIZED_VIEWS.length,
      existing: viewChecks.filter(v => v.exists).length,
      missing: viewChecks.filter(v => !v.exists).length,
      byLevel: {
        level1: MATERIALIZED_VIEWS.filter(v => v.level === 1).length,
        level2: MATERIALIZED_VIEWS.filter(v => v.level === 2).length,
        level3: MATERIALIZED_VIEWS.filter(v => v.level === 3).length,
      },
    };

    return NextResponse.json({
      status: "healthy",
      endpoint: "/api/v1/system/refresh-views",
      purpose: "Automated materialized view refresh for Cloud Scheduler",
      schedule: "Every 15 minutes",
      summary,
      views: MATERIALIZED_VIEWS.map(v => ({
        name: v.name,
        level: v.level,
        exists: viewChecks.find(vc => vc.name === v.name)?.exists || false,
      })),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[STATUS] Error getting automated refresh status:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to get status",
        error: String(error),
      },
      { status: 500 }
    );
  }
}

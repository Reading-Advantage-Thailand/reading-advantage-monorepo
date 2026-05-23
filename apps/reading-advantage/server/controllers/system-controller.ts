import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/middleware/guards";
import { buildSchoolFilter } from "@/server/utils/authorization";
import {
  db,
  eq,
  and,
  gte,
  lte,
  ne,
  inArray,
  desc,
  sql,
} from "@reading-advantage/db";
import {
  licenses,
  licenseOnUsers,
  users,
  xpLogs,
} from "@reading-advantage/db/schema";

export async function getSystemLicenses(req: NextRequest) {
  try {
    const authResult = await requireRole(["SYSTEM"] as any)(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const licenseRows = await db
      .select({
        id: licenses.id,
        key: licenses.key,
        schoolName: licenses.schoolName,
        expiresAt: licenses.expiresAt,
        maxUsers: licenses.maxUsers,
        licenseType: licenses.licenseType,
        createdAt: licenses.createdAt,
        updatedAt: licenses.updatedAt,
        ownerUserId: licenses.ownerUserId,
        ownerName: users.name,
      })
      .from(licenses)
      .leftJoin(users, eq(licenses.ownerUserId, users.id))
      .orderBy(desc(licenses.createdAt));

    const licenseIds = licenseRows.map((l) => l.id);
    const licenseUserRows =
      licenseIds.length > 0
        ? await db
            .select({
              licenseId: licenseOnUsers.licenseId,
              userId: licenseOnUsers.userId,
            })
            .from(licenseOnUsers)
            .where(inArray(licenseOnUsers.licenseId, licenseIds))
        : [];

    // Group licenseUsers by licenseId
    const licenseToUsers = new Map<string, string[]>();
    licenseUserRows.forEach((r) => {
      if (!licenseToUsers.has(r.licenseId))
        licenseToUsers.set(r.licenseId, []);
      licenseToUsers.get(r.licenseId)!.push(r.userId);
    });

    const allUserIds = licenseUserRows.map((r) => r.userId);
    const xpLogRows =
      allUserIds.length > 0
        ? await db
            .select({ userId: xpLogs.userId, xpEarned: xpLogs.xpEarned })
            .from(xpLogs)
            .where(inArray(xpLogs.userId, allUserIds))
        : [];

    const userXpMap = new Map<string, number>();
    xpLogRows.forEach((log) => {
      userXpMap.set(
        log.userId,
        (userXpMap.get(log.userId) || 0) + (log.xpEarned || 0)
      );
    });

    const processedLicenses = licenseRows.map((license) => {
      const licenseUserIds = licenseToUsers.get(license.id) || [];
      const totalXp = licenseUserIds.reduce(
        (sum, uid) => sum + (userXpMap.get(uid) || 0),
        0
      );

      return {
        id: license.id,
        key: license.key,
        schoolName: license.schoolName,
        expiresAt: license.expiresAt,
        maxUsers: license.maxUsers,
        licenseType: license.licenseType,
        currentUsers: licenseUserIds.length,
        totalXp,
        isActive: license.expiresAt
          ? new Date(license.expiresAt) > new Date()
          : false,
        createdAt: license.createdAt,
        updatedAt: license.updatedAt,
        owner: license.ownerUserId
          ? { id: license.ownerUserId, name: license.ownerName }
          : null,
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
    const authResult = await requireRole(["SYSTEM"] as any)(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const period = searchParams.get("period");

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

    const licenseRows = await db
      .select({ id: licenses.id, schoolName: licenses.schoolName })
      .from(licenses)
      .where(ne(licenses.schoolName, ""));

    const licenseIds = licenseRows.map((l) => l.id);
    const licenseUserRows =
      licenseIds.length > 0
        ? await db
            .select({
              licenseId: licenseOnUsers.licenseId,
              userId: licenseOnUsers.userId,
            })
            .from(licenseOnUsers)
            .where(inArray(licenseOnUsers.licenseId, licenseIds))
        : [];

    const allUserIds = [...new Set(licenseUserRows.map((r) => r.userId))];
    const xpLogRows =
      allUserIds.length > 0
        ? await db
            .select({ userId: xpLogs.userId, xpEarned: xpLogs.xpEarned })
            .from(xpLogs)
            .where(
              and(
                inArray(xpLogs.userId, allUserIds),
                startDate ? gte(xpLogs.createdAt, startDate) : undefined,
                endDate ? lte(xpLogs.createdAt, endDate) : undefined
              )
            )
        : [];

    const userXpMap = new Map<string, number>();
    xpLogRows.forEach((log) => {
      userXpMap.set(
        log.userId,
        (userXpMap.get(log.userId) || 0) + log.xpEarned
      );
    });

    const licenseToUsers = new Map<string, string[]>();
    licenseUserRows.forEach((r) => {
      if (!licenseToUsers.has(r.licenseId))
        licenseToUsers.set(r.licenseId, []);
      licenseToUsers.get(r.licenseId)!.push(r.userId);
    });

    const schoolXpMap = new Map<string, number>();
    licenseRows.forEach((license) => {
      if (license.schoolName) {
        const userIds = licenseToUsers.get(license.id) || [];
        const schoolXp = userIds.reduce(
          (sum, uid) => sum + (userXpMap.get(uid) || 0),
          0
        );
        schoolXpMap.set(
          license.schoolName,
          (schoolXpMap.get(license.schoolName) || 0) + schoolXp
        );
      }
    });

    const schoolXpData = Array.from(schoolXpMap.entries())
      .map(([school, xp]) => ({ school, xp }))
      .sort((a, b) => b.xp - a.xp);

    return NextResponse.json({
      data: schoolXpData,
      total: schoolXpData.length,
      period: period || "all",
      dateRange:
        startDate && endDate ? { from: startDate, to: endDate } : null,
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
  { name: "mv_student_velocity", level: 1 },
  { name: "mv_srs_health", level: 1 },
  { name: "mv_genre_engagement_metrics", level: 1 },
  { name: "mv_activity_heatmap", level: 1 },
  { name: "mv_assignment_funnel", level: 1 },
  { name: "mv_alignment_metrics", level: 1 },
  { name: "mv_class_velocity", level: 2 },
  { name: "mv_srs_health_class", level: 2 },
  { name: "mv_class_genre_engagement", level: 2 },
  { name: "mv_class_activity_heatmap", level: 2 },
  { name: "mv_class_assignment_funnel", level: 2 },
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

async function notifyMetricsUpdate(
  viewNames: string[],
  metadata: { timestamp: string; success: number; failed: number }
): Promise<void> {
  try {
    const payload = JSON.stringify({
      views: viewNames,
      timestamp: metadata.timestamp,
      success: metadata.success,
      failed: metadata.failed,
    });
    const escapedPayload = payload.replace(/'/g, "''");
    await db.execute(sql.raw(`NOTIFY metrics_update, '${escapedPayload}'`));
  } catch (error: any) {
    console.error(
      "[NOTIFY] Failed to send metrics_update notification:",
      error.message
    );
  }
}

export async function getMaterializedViewsStatus(req: NextRequest) {
  try {
    const authResult = await requireRole(["SYSTEM"] as any)(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const statusResults = await Promise.all(
      MATERIALIZED_VIEWS.map(async (view) => {
        try {
          const viewInfo = await db.execute(sql`
            SELECT
              schemaname,
              matviewname,
              hasindexes,
              ispopulated,
              definition
            FROM pg_matviews
            WHERE schemaname = 'public'
            AND matviewname = ${view.name}
          `) as any[];

          if (!viewInfo || viewInfo.length === 0) {
            return {
              view: view.name,
              level: view.level,
              exists: false,
              status: "missing",
            };
          }

          const info = viewInfo[0];

          const countResult = await db.execute(
            sql.raw(`SELECT COUNT(*) as count FROM ${view.name}`)
          ) as any[];
          const rowCount = Number(countResult[0]?.count || 0);

          const statsResult = await db.execute(sql`
            SELECT
              n_tup_ins + n_tup_upd + n_tup_del as modifications,
              last_vacuum,
              last_autovacuum,
              last_analyze,
              last_autoanalyze
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
            AND relname = ${view.name}
          `) as any[];

          const stats = statsResult[0] || {};

          return {
            view: view.name,
            level: view.level,
            exists: true,
            status: info.ispopulated ? "populated" : "unpopulated",
            hasIndexes: info.hasindexes,
            rowCount,
            lastAnalyze:
              stats.last_analyze || stats.last_autoanalyze || null,
            modifications: Number(stats.modifications || 0),
          };
        } catch (error: any) {
          console.error(
            `Error getting status for ${view.name}:`,
            error.message
          );
          return {
            view: view.name,
            level: view.level,
            exists: false,
            status: "error",
            error: error.message,
          };
        }
      })
    );

    const byLevel = statusResults.reduce(
      (acc, result) => {
        if (!acc[result.level]) acc[result.level] = [];
        acc[result.level].push(result);
        return acc;
      },
      {} as Record<number, typeof statusResults>
    );

    const summary = {
      total: MATERIALIZED_VIEWS.length,
      populated: statusResults.filter((r) => r.status === "populated").length,
      missing: statusResults.filter((r) => r.status === "missing").length,
      error: statusResults.filter((r) => r.status === "error").length,
      totalRows: statusResults.reduce(
        (sum, r) => sum + ((r as any).rowCount || 0),
        0
      ),
    };

    return NextResponse.json({
      summary,
      byLevel,
      views: statusResults,
      queriedAt: new Date().toISOString(),
      queriedBy: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("[STATUS] Error getting materialized views status:", error);
    return NextResponse.json(
      { message: "Internal server error", error: String(error) },
      { status: 500 }
    );
  }
}

async function viewExists(viewName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_matviews
        WHERE schemaname = 'public'
        AND matviewname = ${viewName}
      ) as exists
    `) as any[];
    return result[0]?.exists ?? false;
  } catch (error: any) {
    console.error(
      `[CHECK] Error checking if ${viewName} exists:`,
      error.message
    );
    return false;
  }
}

async function refreshView(
  viewName: string,
  level: number
): Promise<RefreshResult> {
  const startTime = Date.now();

  const exists = await viewExists(viewName);
  if (!exists) {
    return {
      view: viewName,
      level,
      status: "skipped",
      duration: Date.now() - startTime,
      error: "Materialized view does not exist",
    };
  }

  try {
    await db.execute(
      sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`)
    );

    return {
      view: viewName,
      level,
      status: "success_concurrent",
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    const isMissingIndex =
      error.message?.includes("cannot refresh materialized view") &&
      error.message?.includes("concurrently");

    if (!isMissingIndex) {
      console.warn(
        `[REFRESH] CONCURRENTLY failed for ${viewName}, trying regular refresh`
      );
    }

    try {
      await db.execute(
        sql.raw(`REFRESH MATERIALIZED VIEW ${viewName}`)
      );

      return {
        view: viewName,
        level,
        status: "success",
        duration: Date.now() - startTime,
      };
    } catch (fallbackError: any) {
      console.error(
        `[REFRESH] ✗ ${viewName} failed:`,
        fallbackError.message
      );

      return {
        view: viewName,
        level,
        status: "failed",
        duration: Date.now() - startTime,
        error: fallbackError.message || String(fallbackError),
      };
    }
  }
}

export async function refreshMaterializedViews(req: NextRequest) {
  const requestStartTime = Date.now();

  try {
    const authResult = await requireRole(["SYSTEM"] as any)(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const results: RefreshResult[] = [];

    const viewsByLevel = MATERIALIZED_VIEWS.reduce(
      (acc, view) => {
        if (!acc[view.level]) acc[view.level] = [];
        acc[view.level].push(view);
        return acc;
      },
      {} as Record<number, (typeof MATERIALIZED_VIEWS)[number][]>
    );

    for (const level of [1, 2, 3]) {
      const views = viewsByLevel[level] || [];
      if (views.length === 0) continue;

      const levelResults = await Promise.all(
        views.map((view) => refreshView(view.name, view.level))
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

    const successfulViews = results
      .filter(
        (r) => r.status === "success" || r.status === "success_concurrent"
      )
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
      refreshedBy: { id: user.id, email: user.email },
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

export async function refreshMaterializedViewsAutomated(req: NextRequest) {
  const requestStartTime = Date.now();

  console.log(
    `[CLOUD_SCHEDULER] Starting automated refresh of ${MATERIALIZED_VIEWS.length} materialized views`
  );

  try {
    const results: RefreshResult[] = [];

    const viewsByLevel = MATERIALIZED_VIEWS.reduce(
      (acc, view) => {
        if (!acc[view.level]) acc[view.level] = [];
        acc[view.level].push(view);
        return acc;
      },
      {} as Record<number, (typeof MATERIALIZED_VIEWS)[number][]>
    );

    for (const level of [1, 2, 3]) {
      const views = viewsByLevel[level] || [];
      if (views.length === 0) continue;

      const levelStartTime = Date.now();
      console.log(
        `[CLOUD_SCHEDULER] Refreshing Level ${level}: ${views.length} views`
      );

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

    if (failedCount > 0) {
      const failures = results.filter((r) => r.status === "failed");
      console.error(
        "[CLOUD_SCHEDULER] Failed views:",
        failures.map((f) => f.view).join(", ")
      );
      failures.forEach((f) => {
        console.error(`  - ${f.view}: ${f.error}`);
      });
    }

    const successfulViews = results
      .filter(
        (r) => r.status === "success" || r.status === "success_concurrent"
      )
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
    console.error("[CLOUD_SCHEDULER] Error in automated refresh:", error);
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

export async function getAutomatedRefreshStatus(req: NextRequest) {
  try {
    const viewChecks = await Promise.all(
      MATERIALIZED_VIEWS.map(async (view) => {
        const exists = await viewExists(view.name);
        return { name: view.name, level: view.level, exists };
      })
    );

    const summary = {
      totalViews: MATERIALIZED_VIEWS.length,
      existing: viewChecks.filter((v) => v.exists).length,
      missing: viewChecks.filter((v) => !v.exists).length,
      byLevel: {
        level1: MATERIALIZED_VIEWS.filter((v) => v.level === 1).length,
        level2: MATERIALIZED_VIEWS.filter((v) => v.level === 2).length,
        level3: MATERIALIZED_VIEWS.filter((v) => v.level === 3).length,
      },
    };

    return NextResponse.json({
      status: "healthy",
      endpoint: "/api/v1/system/refresh-views",
      purpose: "Automated materialized view refresh for Cloud Scheduler",
      schedule: "Every 15 minutes",
      summary,
      views: MATERIALIZED_VIEWS.map((v) => ({
        name: v.name,
        level: v.level,
        exists:
          viewChecks.find((vc) => vc.name === v.name)?.exists || false,
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

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Materialized views in dependency order
 */
const MATERIALIZED_VIEWS = [
  // Level 1: Student-level metrics
  { name: "mv_student_velocity", level: 1 },
  { name: "mv_srs_health", level: 1 },
  { name: "mv_genre_engagement_metrics", level: 1 },
  { name: "mv_activity_heatmap", level: 1 },
  { name: "mv_assignment_funnel", level: 1 },
  { name: "mv_alignment_metrics", level: 1 },

  // Level 2: Class-level metrics
  { name: "mv_class_velocity", level: 2 },
  { name: "mv_srs_health_class", level: 2 },
  { name: "mv_class_genre_engagement", level: 2 },
  { name: "mv_class_activity_heatmap", level: 2 },
  { name: "mv_class_assignment_funnel", level: 2 },

  // Level 3: School-level rollups
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
 * Check if a materialized view exists
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
    console.error(`Error checking if ${viewName} exists:`, error.message);
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

  // Check if view exists
  const exists = await viewExists(viewName);
  if (!exists) {
    const duration = Date.now() - startTime;
    return {
      view: viewName,
      level,
      status: "skipped",
      duration,
      error: "Materialized view does not exist",
    };
  }

  try {
    // Try CONCURRENTLY first
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
    // Fall back to regular refresh
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

/**
 * Refresh all materialized views (standalone function for scripts)
 */
export async function refreshAllMaterializedViews(): Promise<{
  success: number;
  failed: number;
  skipped: number;
  duration: number;
  results: RefreshResult[];
}> {
  const startTime = Date.now();
  const results: RefreshResult[] = [];

  // Group views by level
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

    // Refresh views at the same level in parallel
    const levelResults = await Promise.all(
      views.map((view) => refreshView(view.name, view.level))
    );

    results.push(...levelResults);
  }

  const duration = Date.now() - startTime;
  const successCount = results.filter(
    (r) => r.status === "success" || r.status === "success_concurrent"
  ).length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const skippedCount = results.filter((r) => r.status === "skipped").length;

  return {
    success: successCount,
    failed: failedCount,
    skipped: skippedCount,
    duration,
    results,
  };
}

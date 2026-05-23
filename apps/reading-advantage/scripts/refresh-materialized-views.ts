import { db, sql } from "@reading-advantage/db";

const MATERIALIZED_VIEWS = [
  'mv_student_velocity',
  'mv_assignment_funnel',
  'mv_srs_health',
  'mv_genre_engagement',
  'mv_activity_heatmap',
  'mv_alignment_metrics',
  'mv_daily_activity_rollups',
];

async function refreshMaterializedViews() {
  console.log('🔄 Refreshing materialized views...\n');

  for (const viewName of MATERIALIZED_VIEWS) {
    try {
      // Try CONCURRENTLY first (faster, allows reads during refresh)
      await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`));
      console.log(`✅ Refreshed (CONCURRENTLY): ${viewName}`);
    } catch {
      // Fall back to regular refresh if CONCURRENTLY fails (needs unique index)
      try {
        await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW ${viewName}`));
        console.log(`✅ Refreshed: ${viewName}`);
      } catch (fallbackError: unknown) {
        const message =
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        console.error(`❌ Failed to refresh ${viewName}:`, message);
      }
    }
  }

  console.log('\n✨ All materialized views refreshed!');
}

refreshMaterializedViews();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`);
      console.log(`✅ Refreshed (CONCURRENTLY): ${viewName}`);
    } catch (error: any) {
      // Fall back to regular refresh if CONCURRENTLY fails (needs unique index)
      try {
        await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW ${viewName}`);
        console.log(`✅ Refreshed: ${viewName}`);
      } catch (fallbackError: any) {
        console.error(`❌ Failed to refresh ${viewName}:`, fallbackError?.message || fallbackError);
      }
    }
  }

  console.log('\n✨ All materialized views refreshed!');
  await prisma.$disconnect();
}

refreshMaterializedViews();

#!/usr/bin/env tsx

/**
 * Refresh Activity Heatmap Materialized Views
 * 
 * Run this script to manually refresh activity heatmap matviews or set it up as a cron job.
 * 
 * Usage:
 *   npm run refresh-activity-heatmap-matviews
 *   or
 *   tsx scripts/refresh-activity-heatmap-matviews.ts
 */

import { db, sql } from "@reading-advantage/db";

type StudentStatsRow = {
  unique_students: bigint | number | string | null;
  unique_schools: bigint | number | string | null;
  total_buckets: bigint | number | string | null;
  latest_date: Date | string | null;
};

type ClassStatsRow = {
  unique_classrooms: bigint | number | string | null;
  total_buckets: bigint | number | string | null;
};

async function refreshActivityHeatmapMatviews() {
  console.log('🔄 Refreshing activity heatmap materialized views...');
  
  try {
    const startTime = Date.now();
    
    // Call the PostgreSQL function to refresh all activity heatmap views
    await db.execute(sql`SELECT refresh_activity_heatmap_matviews()`);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Activity heatmap materialized views refreshed successfully in ${duration}ms`);
    
    // Get some basic stats to verify
    const [studentStatsRaw, classStatsRaw] = await Promise.all([
      db.execute(sql`
        SELECT 
          COUNT(DISTINCT user_id) as unique_students,
          COUNT(DISTINCT school_id) as unique_schools,
          COUNT(*) as total_buckets,
          MAX(activity_date) as latest_date
        FROM mv_activity_heatmap
      `),
      db.execute(sql`
        SELECT 
          COUNT(DISTINCT classroom_id) as unique_classrooms,
          COUNT(*) as total_buckets
        FROM mv_class_activity_heatmap
      `),
    ]);

    const studentStats = studentStatsRaw as unknown as StudentStatsRow[];
    const classStats = classStatsRaw as unknown as ClassStatsRow[];
    
    console.log('📊 Refresh stats:');
    console.log('  Student view:', {
      unique_students: Number(studentStats[0]?.unique_students || 0),
      unique_schools: Number(studentStats[0]?.unique_schools || 0),
      total_buckets: Number(studentStats[0]?.total_buckets || 0),
      latest_date: studentStats[0]?.latest_date,
    });
    console.log('  Class view:', {
      unique_classrooms: Number(classStats[0]?.unique_classrooms || 0),
      total_buckets: Number(classStats[0]?.total_buckets || 0),
    });
    
  } catch (error) {
    console.error('❌ Failed to refresh activity heatmap materialized views:', error);
    throw error;
  }
}

async function main() {
  try {
    await refreshActivityHeatmapMatviews();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

export { refreshActivityHeatmapMatviews };

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

import { prisma } from '../lib/prisma';

async function refreshActivityHeatmapMatviews() {
  console.log('🔄 Refreshing activity heatmap materialized views...');
  
  try {
    const startTime = Date.now();
    
    // Call the PostgreSQL function to refresh all activity heatmap views
    await prisma.$executeRaw`SELECT refresh_activity_heatmap_matviews()`;
    
    const duration = Date.now() - startTime;
    console.log(`✅ Activity heatmap materialized views refreshed successfully in ${duration}ms`);
    
    // Get some basic stats to verify
    const [studentStats, classStats] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          COUNT(DISTINCT user_id) as unique_students,
          COUNT(DISTINCT school_id) as unique_schools,
          COUNT(*) as total_buckets,
          MAX(activity_date) as latest_date
        FROM mv_activity_heatmap
      ` as Promise<Array<{
        unique_students: bigint;
        unique_schools: bigint;
        total_buckets: bigint;
        latest_date: Date | null;
      }>>,
      prisma.$queryRaw`
        SELECT 
          COUNT(DISTINCT classroom_id) as unique_classrooms,
          COUNT(*) as total_buckets
        FROM mv_class_activity_heatmap
      ` as Promise<Array<{
        unique_classrooms: bigint;
        total_buckets: bigint;
      }>>
    ]);
    
    console.log('📊 Refresh stats:');
    console.log('  Student view:', {
      unique_students: Number(studentStats[0]?.unique_students || 0),
      unique_schools: Number(studentStats[0]?.unique_schools || 0),
      total_buckets: Number(studentStats[0]?.total_buckets || 0),
      latest_date: studentStats[0]?.latest_date
    });
    console.log('  Class view:', {
      unique_classrooms: Number(classStats[0]?.unique_classrooms || 0),
      total_buckets: Number(classStats[0]?.total_buckets || 0)
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
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

export { refreshActivityHeatmapMatviews };
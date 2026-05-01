#!/usr/bin/env tsx

/**
 * Refresh Velocity Materialized Views
 * 
 * Run this script to manually refresh velocity matviews or set it up as a cron job.
 * 
 * Usage:
 *   npm run refresh-velocity-matviews
 *   or
 *   tsx scripts/refresh-velocity-matviews.ts
 */

import { prisma } from '../lib/prisma';
import { refreshVelocityMatviews } from '../server/services/metrics/velocity-service';

async function main() {
  console.log('[Refresh] Starting velocity matviews refresh...');
  const startTime = Date.now();

  try {
    await refreshVelocityMatviews();

    const duration = Date.now() - startTime;
    console.log(`[Refresh] ✅ Completed in ${duration}ms`);

    // Check row counts
    const studentCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      'SELECT COUNT(*) as count FROM mv_student_velocity'
    );
    const classCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      'SELECT COUNT(*) as count FROM mv_class_velocity'
    );
    const schoolCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      'SELECT COUNT(*) as count FROM mv_school_velocity'
    );

    console.log('[Refresh] Matview stats:');
    console.log(`  - mv_student_velocity: ${studentCount[0].count} rows`);
    console.log(`  - mv_class_velocity: ${classCount[0].count} rows`);
    console.log(`  - mv_school_velocity: ${schoolCount[0].count} rows`);

    process.exit(0);
  } catch (error) {
    console.error('[Refresh] ❌ Failed:', error);
    process.exit(1);
  }
}

main();

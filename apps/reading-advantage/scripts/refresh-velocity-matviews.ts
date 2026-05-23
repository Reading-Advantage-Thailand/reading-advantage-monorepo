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

import { db, sql } from "@reading-advantage/db";
import { refreshVelocityMatviews } from '../server/services/metrics/velocity-service';

async function main() {
  console.log('[Refresh] Starting velocity matviews refresh...');
  const startTime = Date.now();

  try {
    await refreshVelocityMatviews();

    const duration = Date.now() - startTime;
    console.log(`[Refresh] ✅ Completed in ${duration}ms`);

    // Check row counts
    const studentCount = (await db.execute(
      sql`SELECT COUNT(*)::bigint as count FROM mv_student_velocity`
    )) as unknown as Array<{ count: bigint | number | string }>;
    const classCount = (await db.execute(
      sql`SELECT COUNT(*)::bigint as count FROM mv_class_velocity`
    )) as unknown as Array<{ count: bigint | number | string }>;
    const schoolCount = (await db.execute(
      sql`SELECT COUNT(*)::bigint as count FROM mv_school_velocity`
    )) as unknown as Array<{ count: bigint | number | string }>;

    console.log('[Refresh] Matview stats:');
    console.log(`  - mv_student_velocity: ${studentCount[0]?.count ?? 0} rows`);
    console.log(`  - mv_class_velocity: ${classCount[0]?.count ?? 0} rows`);
    console.log(`  - mv_school_velocity: ${schoolCount[0]?.count ?? 0} rows`);

    process.exit(0);
  } catch (error) {
    console.error('[Refresh] ❌ Failed:', error);
    process.exit(1);
  }
}

main();

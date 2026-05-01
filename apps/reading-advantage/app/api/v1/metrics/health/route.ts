/**
 * Metrics cache statistics and health check endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMetricsCacheStats } from '@/lib/cache/metrics';
import { checkMatviewsHealth } from '@/lib/cache/fallback-queries';
import { requireRole } from '@/server/middleware/guards';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/metrics/health
 * 
 * Returns cache statistics and materialized view health status
 */
export async function GET(req: NextRequest) {
  try {
    // Require SYSTEM or ADMIN role
    const authResult = await requireRole([Role.SYSTEM, Role.ADMIN])(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const [cacheStats, matviewHealth] = await Promise.all([
      Promise.resolve(getMetricsCacheStats()),
      checkMatviewsHealth(),
    ]);

    return NextResponse.json({
      cache: cacheStats,
      materialized_views: matviewHealth,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[HEALTH] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}

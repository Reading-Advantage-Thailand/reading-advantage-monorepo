/**
 * Metrics cache statistics and health check endpoint
 *
 * SEC-10: hard-gated to authenticated ADMIN/SYSTEM callers OR callers
 * presenting the SYSTEM access key. Returns only a coarse `status` summary;
 * detailed cache/matview internals are intentionally stripped.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMetricsCacheStats } from '@/lib/cache/metrics';
import { checkMatviewsHealth } from '@/lib/cache/fallback-queries';
import { requireRole } from '@/server/middleware/guards';
import { assertSystemAccess } from '@/server/middleware/system-key';
import { Role } from '@/lib/enums';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/metrics/health
 *
 * Returns a minimal, non-sensitive status summary.
 */
export async function GET(req: NextRequest) {
  try {
    const accessGuard = assertSystemAccess(req);
    if (!accessGuard) {
      const authResult = await requireRole([Role.SYSTEM, Role.ADMIN])(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
    }

    const [cacheStats, matviewHealth] = await Promise.all([
      Promise.resolve(getMetricsCacheStats()),
      checkMatviewsHealth(),
    ]);

    // SECURITY (SEC-10): do not expose detailed cache/matview internals on
    // the public status surface. Only a boolean health summary leaks.
    const isHealthy =
      cacheStats.hitRate >= 0 && matviewHealth.healthy === true;

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
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
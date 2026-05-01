/**
 * Cache management endpoint for manual invalidation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  invalidateMetrics,
  invalidateMetricsByPrefix,
  clearMetricsCache,
  getMetricsCacheStats,
} from '@/lib/cache/metrics';
import { requireRole } from '@/server/middleware/guards';
import { Role } from '@prisma/client';

/**
 * POST /api/v1/metrics/cache/invalidate
 * 
 * Invalidate cache entries
 * 
 * Body:
 * - { key: string } - Invalidate specific key
 * - { prefix: string } - Invalidate by prefix
 * - { clear: true } - Clear all cache
 */
export async function POST(req: NextRequest) {
  try {
    // Require SYSTEM role
    const authResult = await requireRole([Role.SYSTEM])(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const body = await req.json();

    let action = '';
    let affected = 0;

    if (body.clear) {
      clearMetricsCache();
      action = 'clear_all';
      affected = getMetricsCacheStats().size;
    } else if (body.prefix) {
      invalidateMetricsByPrefix(body.prefix);
      action = 'invalidate_prefix';
      affected = 1; // Can't count before invalidation
    } else if (body.key) {
      invalidateMetrics(body.key);
      action = 'invalidate_key';
      affected = 1;
    } else {
      return NextResponse.json(
        { message: 'Missing invalidation parameter (key, prefix, or clear)' },
        { status: 400 }
      );
    }

    const stats = getMetricsCacheStats();

    return NextResponse.json({
      message: 'Cache invalidated successfully',
      action,
      affected,
      stats,
      invalidatedBy: {
        id: user.id,
        email: user.email,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CACHE] Invalidation error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}

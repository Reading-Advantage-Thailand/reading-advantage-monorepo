/**
 * Database Connection Health Dashboard API
 * Provides comprehensive monitoring endpoint for database health
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectionMonitor } from '@/lib/cache/connection-monitor';
import { advancedCache } from '@/lib/cache/advanced-cache';
import { matViewManager } from '@/lib/cache/matview-manager';
import { requireRole } from '@/server/middleware/guards';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/v1/health/database
 * 
 * Comprehensive database health endpoint
 */
export async function GET(req: NextRequest) {
  try {
    // Require SYSTEM or ADMIN role
    const authResult = await requireRole([Role.SYSTEM, Role.ADMIN])(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const startTime = Date.now();

    // Get comprehensive health data
    const [
      connectionHealth,
      cacheStats,
      matViewStats,
      dbPerformance
    ] = await Promise.all([
      connectionMonitor.performHealthCheck(),
      advancedCache.getStats(),
      matViewManager.getRefreshStats(),
      getDbPerformanceMetrics(),
    ]);

    const responseTime = Date.now() - startTime;

    // Calculate overall health score
    const healthScore = calculateHealthScore({
      connectionHealth,
      cacheStats,
      matViewStats,
      dbPerformance,
    });

    const response = {
      timestamp: new Date().toISOString(),
      responseTime,
      healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
      
      // Connection metrics
      connections: {
        health: connectionHealth,
        utilization: connectionHealth.metrics?.connectionUtilization || 0,
        activeConnections: connectionHealth.metrics?.activeConnections || 0,
        totalConnections: connectionHealth.metrics?.totalConnections || 0,
        maxConnections: connectionHealth.metrics?.maxConnections || 0,
      },

      // Cache performance
      cache: {
        stats: cacheStats,
        hitRate: cacheStats.hitRate * 100,
        totalEntries: cacheStats.totalEntries,
        performance: cacheStats.hitRate > 0.7 ? 'good' : cacheStats.hitRate > 0.5 ? 'fair' : 'poor',
      },

      // Materialized views
      materializedViews: {
        stats: matViewStats,
        health: matViewStats.currentlyRefreshing === 0 ? 'stable' : 'refreshing',
        refreshQueue: matViewStats.queueLength,
      },

      // Database performance
      performance: dbPerformance,

      // Recommendations
      recommendations: generateRecommendations({
        connectionHealth,
        cacheStats,
        matViewStats,
        dbPerformance,
      }),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
      },
    });

  } catch (error) {
    console.error('[HEALTH] Database health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Health check failed',
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/health/database/refresh
 * 
 * Force refresh materialized views and clear cache
 */
export async function POST(req: NextRequest) {
  try {
    // Require SYSTEM role for refresh operations
    const authResult = await requireRole([Role.SYSTEM])(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    let results: any = {};

    switch (action) {
      case 'cache':
        advancedCache.clear();
        results.cache = 'cleared';
        break;

      case 'matviews':
        await matViewManager.forceRefreshAll();
        results.materializedViews = 'refresh_started';
        break;

      case 'all':
        advancedCache.clear();
        await matViewManager.forceRefreshAll();
        results.cache = 'cleared';
        results.materializedViews = 'refresh_started';
        break;

      default:
        return NextResponse.json(
          { message: 'Invalid action. Use: cache, matviews, or all' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      message: 'Refresh initiated successfully',
      action,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[HEALTH] Refresh operation failed:', error);
    return NextResponse.json(
      {
        message: 'Refresh operation failed',
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Get database performance metrics
 */
async function getDbPerformanceMetrics() {
  try {
    const [
      slowQueries,
      indexUsage,
      tableStats,
      lockStats
    ] = await Promise.all([
      getSlowQueries(),
      getIndexUsage(),
      getTableStats(),
      getLockStats(),
    ]);

    return {
      slowQueries,
      indexUsage,
      tableStats,
      lockStats,
    };
  } catch (error) {
    console.error('[HEALTH] Failed to get performance metrics:', error);
    return {
      slowQueries: [],
      indexUsage: [],
      tableStats: [],
      lockStats: {},
    };
  }
}

/**
 * Get slow queries from PostgreSQL
 */
async function getSlowQueries() {
  try {
    const result = await prisma.$queryRaw<Array<{
      query: string;
      calls: number;
      mean_time: number;
      total_time: number;
    }>>`
      SELECT 
        query,
        calls,
        mean_time,
        total_time
      FROM pg_stat_statements 
      WHERE mean_time > 1000
      ORDER BY mean_time DESC 
      LIMIT 10
    `;

    return result.map(row => ({
      query: row.query.substring(0, 100) + '...',
      calls: Number(row.calls),
      meanTime: Number(row.mean_time),
      totalTime: Number(row.total_time),
    }));
  } catch (error) {
    // pg_stat_statements extension might not be available
    return [];
  }
}

/**
 * Get index usage statistics
 */
async function getIndexUsage() {
  try {
    const result = await prisma.$queryRaw<Array<{
      schemaname: string;
      tablename: string;
      indexname: string;
      idx_tup_read: number;
      idx_tup_fetch: number;
    }>>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_tup_read DESC 
      LIMIT 20
    `;

    return result.map(row => ({
      table: row.tablename,
      index: row.indexname,
      reads: Number(row.idx_tup_read),
      fetches: Number(row.idx_tup_fetch),
      efficiency: Number(row.idx_tup_fetch) / Math.max(Number(row.idx_tup_read), 1),
    }));
  } catch (error) {
    console.warn('[HEALTH] Could not get index usage:', error);
    return [];
  }
}

/**
 * Get table statistics
 */
async function getTableStats() {
  try {
    const result = await prisma.$queryRaw<Array<{
      schemaname: string;
      tablename: string;
      n_tup_ins: number;
      n_tup_upd: number;
      n_tup_del: number;
      n_live_tup: number;
    }>>`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        n_live_tup
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC 
      LIMIT 10
    `;

    return result.map(row => ({
      table: row.tablename,
      inserts: Number(row.n_tup_ins),
      updates: Number(row.n_tup_upd),
      deletes: Number(row.n_tup_del),
      liveTuples: Number(row.n_live_tup),
    }));
  } catch (error) {
    console.warn('[HEALTH] Could not get table stats:', error);
    return [];
  }
}

/**
 * Get lock statistics
 */
async function getLockStats() {
  try {
    const result = await prisma.$queryRaw<Array<{
      mode: string;
      count: number;
    }>>`
      SELECT 
        mode,
        count(*) as count
      FROM pg_locks 
      GROUP BY mode
      ORDER BY count DESC
    `;

    return result.reduce((acc, row) => {
      acc[row.mode] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);
  } catch (error) {
    console.warn('[HEALTH] Could not get lock stats:', error);
    return {};
  }
}

/**
 * Calculate overall health score
 */
function calculateHealthScore(data: any): number {
  let score = 100;

  // Connection health (30% weight)
  if (!data.connectionHealth.healthy) score -= 30;
  else if (data.connectionHealth.metrics?.connectionUtilization > 80) score -= 15;
  else if (data.connectionHealth.metrics?.connectionUtilization > 60) score -= 5;

  // Cache performance (25% weight)
  if (data.cacheStats.hitRate < 0.3) score -= 25;
  else if (data.cacheStats.hitRate < 0.5) score -= 15;
  else if (data.cacheStats.hitRate < 0.7) score -= 10;

  // Materialized views (20% weight)
  if (data.matViewStats.queueLength > 5) score -= 20;
  else if (data.matViewStats.queueLength > 2) score -= 10;

  // Performance metrics (25% weight)
  if (data.dbPerformance.slowQueries.length > 5) score -= 25;
  else if (data.dbPerformance.slowQueries.length > 2) score -= 15;
  else if (data.dbPerformance.slowQueries.length > 0) score -= 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate recommendations based on health data
 */
function generateRecommendations(data: any): string[] {
  const recommendations: string[] = [];

  // Connection recommendations
  if (data.connectionHealth.metrics?.connectionUtilization > 80) {
    recommendations.push('High connection utilization detected. Consider increasing connection pool size or optimizing queries.');
  }

  // Cache recommendations
  if (data.cacheStats.hitRate < 0.5) {
    recommendations.push('Low cache hit rate. Consider increasing cache TTL or reviewing caching strategy.');
  }

  // Materialized view recommendations
  if (data.matViewStats.queueLength > 3) {
    recommendations.push('High materialized view refresh queue. Consider adjusting refresh intervals or priorities.');
  }

  // Performance recommendations
  if (data.dbPerformance.slowQueries.length > 0) {
    recommendations.push(`Found ${data.dbPerformance.slowQueries.length} slow queries. Review and optimize query performance.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Database health is optimal. Continue monitoring.');
  }

  return recommendations;
}
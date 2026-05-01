/**
 * Metrics Aggregation Layer - Phase 1.3
 * 
 * Central exports for metrics caching, invalidation, and fallback queries.
 */

// Cache helpers
export {
  getCachedMetrics,
  invalidateMetrics,
  invalidateMetricsByPrefix,
  clearMetricsCache,
  getMetricsCacheStats,
  getMetricsCacheMetrics,
  metricsCache,
} from './metrics';

export type {
  CacheEntry,
  CacheOptions,
  CacheMetrics,
} from './metrics';

// Metrics update types (moved inline due to build compatibility)
export interface MetricsUpdatePayload {
  views: string[];
  timestamp: string;
  success: number;
  failed: number;
}

// Fallback queries
export {
  queryWithFallback,
  getStudentVelocity,
  getAssignmentFunnel,
  getDailyActivityRollups,
  checkMatviewsHealth,
} from './fallback-queries';

export type {
  FallbackOptions,
} from './fallback-queries';

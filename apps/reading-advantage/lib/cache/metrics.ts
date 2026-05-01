/**
 * Centralized metrics cache with stale-while-revalidate behavior
 *
 * This module provides cache helpers for materialized view queries with:
 * - Stale-while-revalidate (SWR) pattern
 * - Automatic invalidation on metrics:update events
 * - Fallback to direct queries when cache is unavailable
 * - Observability hooks for monitoring
 */

// Remove postgres listener dependency for build compatibility
export interface MetricsUpdatePayload {
  views: string[];
  timestamp: string;
  success: number;
  failed: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleAt: number;
}

export interface CacheOptions {
  /** Cache TTL in milliseconds (default: 15 minutes) */
  ttl?: number;
  /** Stale time in milliseconds (default: 5 minutes) */
  staleTime?: number;
  /** Enable automatic invalidation on metrics:update (default: true) */
  autoInvalidate?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  staleHits: number;
  invalidations: number;
  errors: number;
  lastError?: string;
}

class MetricsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private metrics = new Map<string, CacheMetrics>();
  private pendingRefresh = new Map<string, Promise<any>>();
  private listenerInitialized = false;

  constructor() {
    this.initializeListener();
  }

  /**
   * Initialize PostgreSQL listener for cache invalidation
   */
  private initializeListener(): void {
    if (this.listenerInitialized || typeof window !== "undefined") {
      return;
    }

    // Disable PG-LISTENER temporarily to reduce connection pool usage
    return;

    /* Commented out to reduce connection pool usage
    try {
      const listener = getPostgresListener();
      
      listener.on('metrics:update', (payload: MetricsUpdatePayload) => {
        this.handleMetricsUpdate(payload);
      });

      this.listenerInitialized = true;
      console.log('[CACHE] Initialized metrics cache with auto-invalidation');
    } catch (error) {
      console.error('[CACHE] Failed to initialize listener:', error);
    }
    */
  }

  /**
   * Handle metrics update notifications
   */
  private handleMetricsUpdate(payload: MetricsUpdatePayload): void {
    // Invalidate caches for updated views
    for (const viewName of payload.views) {
      this.invalidateByPrefix(viewName);
    }

    // Also invalidate aggregated caches
    this.invalidateByPrefix("metrics:");
  }

  /**
   * Get or create metrics tracker for a key
   */
  private getMetricsTracker(key: string): CacheMetrics {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        hits: 0,
        misses: 0,
        staleHits: 0,
        invalidations: 0,
        errors: 0,
      });
    }
    return this.metrics.get(key)!;
  }

  /**
   * Get cached data with stale-while-revalidate
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = 15 * 60 * 1000, // 15 minutes
      staleTime = 5 * 60 * 1000, // 5 minutes
    } = options;

    const now = Date.now();
    const cached = this.cache.get(key);
    const metrics = this.getMetricsTracker(key);

    // Cache hit - fresh data
    if (cached && now < cached.staleAt) {
      metrics.hits++;
      return cached.data;
    }

    // Cache hit - stale data (trigger background refresh)
    if (cached && now < cached.timestamp + ttl) {
      metrics.staleHits++;

      // Trigger background refresh (fire-and-forget)
      this.refreshInBackground(key, fetcher, options);

      return cached.data;
    }

    // Cache miss - fetch fresh data
    metrics.misses++;

    return this.fetchAndCache(key, fetcher, options);
  }

  /**
   * Fetch and cache data
   */
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const { ttl = 15 * 60 * 1000, staleTime = 5 * 60 * 1000 } = options;

    // Check if refresh is already pending
    if (this.pendingRefresh.has(key)) {
      return this.pendingRefresh.get(key)!;
    }

    const refreshPromise = (async () => {
      try {
        const data = await fetcher();
        const now = Date.now();

        this.cache.set(key, {
          data,
          timestamp: now,
          staleAt: now + staleTime,
        });

        return data;
      } catch (error) {
        const metrics = this.getMetricsTracker(key);
        metrics.errors++;
        metrics.lastError = String(error);

        console.error(`[CACHE] Error fetching ${key}:`, error);
        throw error;
      } finally {
        this.pendingRefresh.delete(key);
      }
    })();

    this.pendingRefresh.set(key, refreshPromise);
    return refreshPromise;
  }

  /**
   * Refresh cache in background
   */
  private refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): void {
    // Don't refresh if already pending
    if (this.pendingRefresh.has(key)) {
      return;
    }

    this.fetchAndCache(key, fetcher, options).catch((error) => {
      console.error(`[CACHE] Background refresh failed for ${key}:`, error);
    });
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      const metrics = this.getMetricsTracker(key);
      metrics.invalidations++;
    }
  }

  /**
   * Invalidate all entries matching prefix
   */
  invalidateByPrefix(prefix: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        const metrics = this.getMetricsTracker(key);
        metrics.invalidations++;
        count++;
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
  }

  /**
   * Get cache metrics for a key or all metrics
   */
  getCacheMetrics(key?: string): CacheMetrics | Map<string, CacheMetrics> {
    if (key) {
      return (
        this.metrics.get(key) || {
          hits: 0,
          misses: 0,
          staleHits: 0,
          invalidations: 0,
          errors: 0,
        }
      );
    }
    return this.metrics;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    pendingRefreshes: number;
    totalHits: number;
    totalMisses: number;
    totalStaleHits: number;
    totalInvalidations: number;
    totalErrors: number;
    hitRate: number;
  } {
    let totalHits = 0;
    let totalMisses = 0;
    let totalStaleHits = 0;
    let totalInvalidations = 0;
    let totalErrors = 0;

    for (const metrics of this.metrics.values()) {
      totalHits += metrics.hits;
      totalMisses += metrics.misses;
      totalStaleHits += metrics.staleHits;
      totalInvalidations += metrics.invalidations;
      totalErrors += metrics.errors;
    }

    const totalRequests = totalHits + totalMisses + totalStaleHits;
    const hitRate =
      totalRequests > 0 ? (totalHits + totalStaleHits) / totalRequests : 0;

    return {
      size: this.cache.size,
      pendingRefreshes: this.pendingRefresh.size,
      totalHits,
      totalMisses,
      totalStaleHits,
      totalInvalidations,
      totalErrors,
      hitRate,
    };
  }
}

// Singleton instance
const metricsCache = new MetricsCache();

/**
 * Get cached metrics with stale-while-revalidate
 */
export async function getCachedMetrics<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  return metricsCache.get(key, fetcher, options);
}

/**
 * Invalidate cached metrics
 */
export function invalidateMetrics(key: string): void {
  metricsCache.invalidate(key);
}

/**
 * Invalidate metrics by prefix
 */
export function invalidateMetricsByPrefix(prefix: string): void {
  metricsCache.invalidateByPrefix(prefix);
}

/**
 * Clear all cached metrics
 */
export function clearMetricsCache(): void {
  metricsCache.clear();
}

/**
 * Get cache statistics
 */
export function getMetricsCacheStats() {
  return metricsCache.getStats();
}

/**
 * Get cache metrics for a specific key
 */
export function getMetricsCacheMetrics(key?: string) {
  return metricsCache.getCacheMetrics(key);
}

export { metricsCache };

/**
 * Advanced Caching System for Database Queries
 * Reduces connection pool usage by caching expensive operations
 */

import { prisma } from "@/lib/prisma";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  staleTime: number;
  hits: number;
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

class AdvancedCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxEntries = 1000;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  /**
   * Get cached data or execute query function
   */
  async get<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: {
      ttl: number; // Time to live in milliseconds
      staleTime?: number; // Time before data is considered stale
      tags?: string[]; // Cache tags for invalidation
    }
  ): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    // Check if we have valid cached data
    if (entry) {
      const isExpired = now - entry.timestamp > entry.ttl;
      const isStale = options.staleTime && now - entry.timestamp > options.staleTime;

      if (!isExpired) {
        entry.hits++;
        this.stats.hits++;

        // Return cached data, but refresh in background if stale
        if (isStale) {
          this.refreshInBackground(key, queryFn, options);
        }

        return entry.data;
      }
    }

    // Cache miss - execute query
    this.stats.misses++;
    const data = await queryFn();

    // Store in cache
    this.set(key, data, options);

    return data;
  }

  /**
   * Set cache entry
   */
  private set<T>(
    key: string,
    data: T,
    options: {
      ttl: number;
      staleTime?: number;
      tags?: string[];
    }
  ): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: options.ttl,
      staleTime: options.staleTime || options.ttl * 0.8,
      hits: 0,
    });
  }

  /**
   * Refresh data in background without blocking
   */
  private async refreshInBackground<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: any
  ): Promise<void> {
    try {
      const data = await queryFn();
      this.set(key, data, options);
      console.log(`[Cache] Background refresh completed for: ${key}`);
    } catch (error) {
      console.error(`[Cache] Background refresh failed for: ${key}`, error);
    }
  }

  /**
   * Evict oldest entries
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Invalidate cache by key pattern or tags
   */
  invalidate(pattern: string | RegExp): number {
    let deleted = 0;
    const keys = Array.from(this.cache.keys());

    for (const key of keys) {
      const shouldDelete = typeof pattern === 'string'
        ? key.includes(pattern)
        : pattern.test(key);

      if (shouldDelete) {
        this.cache.delete(key);
        deleted++;
      }
    }

    console.log(`[Cache] Invalidated ${deleted} entries with pattern: ${pattern}`);
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & typeof this.stats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);

    return {
      ...this.stats,
      totalEntries: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      memoryUsage: this.cache.size * 1024, // Rough estimate
      oldestEntry: Math.min(...timestamps) || 0,
      newestEntry: Math.max(...timestamps) || 0,
    };
  }

  /**
   * Warm up cache with common queries
   */
  async warmup(): Promise<void> {
    console.log('[Cache] Starting cache warmup...');

    try {
      // Warm up activity summary
      await this.get(
        'activity-summary:30d',
        () => this.getActivitySummary(),
        { ttl: 300000 }
      );

      // Warm up user count
      await this.get(
        'user-count:total',
        async () => await prisma.user.count(),
        { ttl: 600000 }
      );

      // Warm up activity types
      await this.get(
        'activity-types:all',
        async () => await prisma.userActivity.findMany({
          select: { activityType: true },
          distinct: ['activityType'],
        }),
        { ttl: 3600000 }
      );

      console.log('[Cache] Cache warmup completed');
    } catch (error) {
      console.error('[Cache] Cache warmup failed:', error);
    }
  }

  /**
   * Get activity summary for warmup
   */
  private async getActivitySummary() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return prisma.userActivity.groupBy({
      by: ['activityType'],
      _count: { id: true },
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });
  }
}

// Export singleton instance
export const advancedCache = new AdvancedCache();

/**
 * Middleware for automatic cache warmup on application start
 */
export async function initializeCache(): Promise<void> {
  try {
    await advancedCache.warmup();
  } catch (error) {
    console.error('[Cache] Warmup failed:', error);
  }
}

/**
 * Helper function to create cached queries
 */
export function createCachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: { ttl: number; staleTime?: number }
): () => Promise<T> {
  return () => advancedCache.get(key, queryFn, options);
}
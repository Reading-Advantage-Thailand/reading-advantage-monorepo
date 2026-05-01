/**
 * Metrics Cache and Notification System
 * 
 * Provides caching for velocity metrics and pub/sub notifications
 * for real-time dashboard updates.
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export type MetricsUpdateEvent = {
  type: 'velocity' | 'assignment' | 'srs' | 'genre' | 'activity';
  scope: 'student' | 'class' | 'school' | 'system';
  scopeId: string;
  timestamp: string;
  data?: any;
};

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

// ============================================================================
// In-Memory Cache
// ============================================================================

class MetricsCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key
   */
  private generateKey(
    type: string,
    scope: string,
    id: string,
    params?: Record<string, any>
  ): string {
    const paramStr = params
      ? Object.keys(params)
          .sort()
          .map(k => `${k}=${params[k]}`)
          .join('&')
      : '';
    return `${type}:${scope}:${id}${paramStr ? ':' + paramStr : ''}`;
  }

  /**
   * Get cached data
   */
  get<T>(
    type: string,
    scope: string,
    id: string,
    params?: Record<string, any>
  ): T | null {
    const key = this.generateKey(type, scope, id, params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(
    type: string,
    scope: string,
    id: string,
    data: T,
    params?: Record<string, any>,
    ttl?: number
  ): void {
    const key = this.generateKey(type, scope, id, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(type: string, scope: string, id: string, params?: Record<string, any>): void {
    const key = this.generateKey(type, scope, id, params);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): {
    size: number;
    keys: string[];
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    let count = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }
}

// ============================================================================
// Event Emitter for Notifications
// ============================================================================

class MetricsNotifier extends EventEmitter {
  /**
   * Emit metrics update event
   */
  emitUpdate(event: MetricsUpdateEvent): void {
    this.emit('metrics:update', event);
    this.emit(`metrics:update:${event.type}`, event);
    this.emit(`metrics:update:${event.scope}`, event);
    this.emit(`metrics:update:${event.type}:${event.scope}`, event);
  }

  /**
   * Subscribe to metrics updates
   */
  onUpdate(
    callback: (event: MetricsUpdateEvent) => void,
    filter?: {
      type?: MetricsUpdateEvent['type'];
      scope?: MetricsUpdateEvent['scope'];
    }
  ): () => void {
    let eventName = 'metrics:update';

    if (filter?.type && filter?.scope) {
      eventName = `metrics:update:${filter.type}:${filter.scope}`;
    } else if (filter?.type) {
      eventName = `metrics:update:${filter.type}`;
    } else if (filter?.scope) {
      eventName = `metrics:update:${filter.scope}`;
    }

    this.on(eventName, callback);

    // Return unsubscribe function
    return () => {
      this.off(eventName, callback);
    };
  }

  /**
   * Get subscriber count for an event
   */
  getSubscriberCount(eventName: string): number {
    return this.listenerCount(eventName);
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const metricsCache = new MetricsCache();
export const metricsNotifier = new MetricsNotifier();

// ============================================================================
// Cache Helpers
// ============================================================================

/**
 * Get velocity metrics with caching
 */
export async function getCachedVelocity<T>(
  scope: 'student' | 'class' | 'school',
  id: string,
  fetcher: () => Promise<T>,
  params?: Record<string, any>,
  ttl?: number
): Promise<{ data: T; cached: boolean }> {
  // Try cache first
  const cached = metricsCache.get<T>('velocity', scope, id, params);
  if (cached) {
    return { data: cached, cached: true };
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache the result
  metricsCache.set('velocity', scope, id, data, params, ttl);

  return { data, cached: false };
}

/**
 * Invalidate velocity cache and notify subscribers
 */
export function invalidateVelocityCache(
  scope: 'student' | 'class' | 'school',
  id: string
): void {
  // Invalidate cache
  metricsCache.invalidatePattern(new RegExp(`^velocity:${scope}:${id}`));

  // Emit notification
  metricsNotifier.emitUpdate({
    type: 'velocity',
    scope,
    scopeId: id,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Start periodic cache cleanup
 */
export function startCacheCleanup(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
  return setInterval(() => {
    const cleaned = metricsCache.cleanExpired();
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }
  }, intervalMs);
}

/**
 * Health check for cache and notifications
 */
export function getMetricsCacheHealth(): {
  cache: {
    size: number;
    keys: string[];
  };
  notifications: {
    subscribers: Record<string, number>;
  };
} {
  const eventNames = [
    'metrics:update',
    'metrics:update:velocity',
    'metrics:update:student',
    'metrics:update:class',
    'metrics:update:school',
  ];

  const subscribers: Record<string, number> = {};
  for (const eventName of eventNames) {
    subscribers[eventName] = metricsNotifier.getSubscriberCount(eventName);
  }

  return {
    cache: metricsCache.getStats(),
    notifications: {
      subscribers,
    },
  };
}

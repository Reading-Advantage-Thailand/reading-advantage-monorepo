import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedisCacheAdapter } from './cache-adapter';
import { RedisRateLimitStore } from './rate-limit-store';
import type { CacheAdapter } from './cache-adapter';
import type { RateLimitStore } from './rate-limit-store';
import { createCleanupTask } from './session-cleanup';

const mockNow = 1700000000000;

describe('RedisCacheAdapter', () => {
  let adapter: CacheAdapter;
  let mockRedis: ReturnType<typeof createMockRedis>;

  function createMockRedis(available: boolean) {
    const store = new Map<string, { value: string; expiresAt: number }>();

    return {
      available,
      store,
      async get(key: string): Promise<string | null> {
        if (!available) throw new Error('Redis unavailable');
        const entry = store.get(key);
        if (!entry) return null;
        if (entry.expiresAt < Date.now()) {
          store.delete(key);
          return null;
        }
        return entry.value;
      },
      async set(key: string, value: string, ttlMs: number): Promise<void> {
        if (!available) throw new Error('Redis unavailable');
        store.set(key, { value, expiresAt: Date.now() + ttlMs });
      },
      async del(key: string): Promise<void> {
        if (!available) throw new Error('Redis unavailable');
        store.delete(key);
      },
      async keys(pattern: string): Promise<string[]> {
        if (!available) throw new Error('Redis unavailable');
        const prefix = pattern.replace('*', '');
        return Array.from(store.keys()).filter((k) => k.startsWith(prefix));
      },
    };
  }

  describe('when Redis is available', () => {
    beforeEach(() => {
      mockRedis = createMockRedis(true);
      adapter = new RedisCacheAdapter(mockRedis as any, {
        prefix: 'test:',
        defaultTtlMs: 5000,
      });
      vi.setSystemTime(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should store and retrieve values from Redis', async () => {
      await adapter.set('key1', 'value1');
      const result = await adapter.get('key1');
      expect(result).toBe('value1');
    });

    it('should return null for missing keys', async () => {
      const result = await adapter.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.delete('key1');
      const result = await adapter.get('key1');
      expect(result).toBeNull();
    });

    it('should find keys by pattern', async () => {
      await adapter.set('user:1', 'data1');
      await adapter.set('user:2', 'data2');
      await adapter.set('session:1', 'sess1');

      const userKeys = await adapter.keys('user:*');
      expect(userKeys).toContain('test:user:1');
      expect(userKeys).toContain('test:user:2');
      expect(userKeys).not.toContain('test:session:1');
    });

    it('should set TTL on entries', async () => {
      await adapter.set('key1', 'value1', 1000);
      const entry = mockRedis.store.get('test:key1');
      expect(entry?.expiresAt).toBe(mockNow + 1000);
    });
  });

  describe('when Redis is unavailable', () => {
    let inMemoryStore: Map<string, { value: string; expiresAt: number }>;

    beforeEach(() => {
      mockRedis = createMockRedis(false);
      inMemoryStore = new Map();
      adapter = new RedisCacheAdapter(mockRedis as any, {
        prefix: 'test:',
        defaultTtlMs: 5000,
        fallbackStore: inMemoryStore,
      });
      vi.setSystemTime(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should fall back to in-memory store when Redis is down', async () => {
      await adapter.set('fallback-key', 'fallback-value');
      const result = await adapter.get('fallback-key');
      expect(result).toBe('fallback-value');
    });

    it('should persist in fallback store when Redis fails', async () => {
      await adapter.set('key1', 'value1');
      const entry = inMemoryStore.get('test:key1');
      expect(entry?.value).toBe('value1');
    });

    it('should return null from fallback after TTL expires', async () => {
      vi.setSystemTime(mockNow);
      await adapter.set('key1', 'value1', 1000);

      vi.setSystemTime(mockNow + 2000);
      const result = await adapter.get('key1');
      expect(result).toBeNull();
    });

    it('should delete from both Redis and fallback store', async () => {
      await adapter.set('key1', 'value1');
      await adapter.delete('key1');

      expect(inMemoryStore.has('test:key1')).toBe(false);
    });
  });
});

describe('RedisRateLimitStore', () => {
  let store: RateLimitStore;

  function createMockRedis(available: boolean) {
    const store = new Map<string, Record<string, string>>();

    return {
      available,
      store,
      async hGet(key: string, field: string): Promise<string | null> {
        if (!available) throw new Error('Redis unavailable');
        const entry = store.get(key);
        return entry ? (entry[field] ?? null) : null;
      },
      async hSet(key: string, field: string, value: string): Promise<void> {
        if (!available) throw new Error('Redis unavailable');
        if (!store.has(key)) {
          store.set(key, {});
        }
        store.get(key)![field] = value;
      },
      async expire(_key: string, _seconds: number): Promise<void> {
        if (!available) throw new Error('Redis unavailable');
      },
      async del(key: string): Promise<void> {
        if (!available) throw new Error('Redis unavailable');
        store.delete(key);
      },
      async ttl(_key: string): Promise<number> {
        if (!available) throw new Error('Redis unavailable');
        return -1;
      },
    };
  }

  describe('when Redis is available', () => {
    beforeEach(() => {
      const mockRedis = createMockRedis(true);
      store = new RedisRateLimitStore(mockRedis as any, {
        maxAttempts: 5,
        windowMs: 900000,
      });
    });

    it('should record failures and check limits', async () => {
      const id = 'user:test1';

      for (let i = 0; i < 5; i++) {
        const allowed = await store.checkLimit(id);
        expect(allowed).toBe(true);
        await store.recordFailure(id);
      }

      const blocked = await store.checkLimit(id);
      expect(blocked).toBe(false);
    });

    it('should reset on success', async () => {
      const id = 'user:test2';

      await store.recordFailure(id);
      await store.recordFailure(id);
      await store.recordSuccess(id);

      const allowed = await store.checkLimit(id);
      expect(allowed).toBe(true);
    });
  });

  describe('when Redis is unavailable with fallback', () => {
    beforeEach(() => {
      const mockRedis = createMockRedis(false);
      store = new RedisRateLimitStore(mockRedis as any, {
        maxAttempts: 5,
        windowMs: 900000,
        fallbackEnabled: true,
      });
    });

    it('should use in-memory fallback when Redis is down', async () => {
      const id = 'user:fallback1';

      for (let i = 0; i < 5; i++) {
        const allowed = await store.checkLimit(id);
        expect(allowed).toBe(true);
        await store.recordFailure(id);
      }

      const blocked = await store.checkLimit(id);
      expect(blocked).toBe(false);
    });
  });
});

describe('StaleSessionCleanup', () => {
  it('should clean up sessions older than maxAge even when not accessed', async () => {
    const mockPrisma = {
      session: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'sess1',
            expiresAt: new Date(mockNow - 8 * 24 * 60 * 60 * 1000),
          },
          {
            id: 'sess2',
            expiresAt: new Date(mockNow - 9 * 24 * 60 * 60 * 1000),
          },
          {
            id: 'sess3',
            expiresAt: new Date(mockNow - 10 * 24 * 60 * 60 * 1000),
          },
        ]),
      },
    };

    const cleanup = createCleanupTask(mockPrisma as any, {
      maxAgeMs: 7 * 24 * 60 * 60 * 1000,
      batchSize: 100,
    });

    vi.setSystemTime(mockNow);
    await cleanup.run();

    expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      })
    );
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['sess1', 'sess2', 'sess3'] },
      },
    });
  });

  it('should handle empty result when no stale sessions exist', async () => {
    const mockPrisma = {
      session: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const cleanup = createCleanupTask(mockPrisma as any, {
      maxAgeMs: 7 * 24 * 60 * 60 * 1000,
      batchSize: 100,
    });

    vi.setSystemTime(mockNow);
    await cleanup.run();

    expect(mockPrisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it('should respect batch size when many stale sessions exist', async () => {
    const staleSessions = Array.from({ length: 250 }, (_, i) => ({
      id: `sess${i}`,
      expiresAt: new Date(mockNow - (8 + i) * 24 * 60 * 60 * 1000),
    }));

    const mockPrisma = {
      session: {
        deleteMany: vi.fn().mockResolvedValue({ count: 100 }),
        findMany: vi
          .fn()
          .mockResolvedValueOnce(staleSessions.slice(0, 100))
          .mockResolvedValueOnce(staleSessions.slice(100, 200))
          .mockResolvedValueOnce(staleSessions.slice(200, 250)),
      },
    };

    const cleanup = createCleanupTask(mockPrisma as any, {
      maxAgeMs: 7 * 24 * 60 * 60 * 1000,
      batchSize: 100,
    });

    vi.setSystemTime(mockNow);
    await cleanup.run();

    expect(mockPrisma.session.findMany).toHaveBeenCalledTimes(3);
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledTimes(3);
  });

  it('should support scheduling periodic cleanup', async () => {
    const mockPrisma = {
      session: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const cleanup = createCleanupTask(mockPrisma as any, {
      maxAgeMs: 7 * 24 * 60 * 60 * 1000,
      batchSize: 100,
      intervalMs: 60 * 60 * 1000,
    });

    expect(() => cleanup.start()).not.toThrow();
    cleanup.stop();
  });
});

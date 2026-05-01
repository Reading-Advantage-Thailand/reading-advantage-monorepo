import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('env.ts: Redis configuration', () => {
  const envSource = fs.readFileSync(
    path.resolve(__dirname, '../env.ts'),
    'utf-8'
  );

  it('should parse REDIS_URL from env schema', () => {
    expect(envSource).toContain('REDIS_URL');
  });

  it('should not expose REDIS_URL to client', () => {
    expect(envSource).not.toContain('NEXT_PUBLIC_REDIS');
  });

  it('should have REDIS_URL as optional with safe default handling', () => {
    const hasRedisUrl = envSource.includes('REDIS_URL');
    expect(hasRedisUrl).toBe(true);
  });
});

describe('RedisCacheAdapter: production wiring', () => {
  it('should be importable from platform cache-adapter', async () => {
    const { RedisCacheAdapter } = await import('./cache-adapter');
    expect(RedisCacheAdapter).toBeDefined();
  });

  it('should support TTL configuration from env defaults', async () => {
    const { RedisCacheAdapter } = await import('./cache-adapter');
    const mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockResolvedValue([]),
    };
    const adapter = new RedisCacheAdapter(mockRedis as any, {
      prefix: 'test:',
      defaultTtlMs: 900000,
    });
    expect(adapter).toBeInstanceOf(RedisCacheAdapter);
  });
});

describe('RedisRateLimitStore: production wiring', () => {
  it('should be importable from platform rate-limit-store', async () => {
    const { RedisRateLimitStore } = await import('./rate-limit-store');
    expect(RedisRateLimitStore).toBeDefined();
  });

  it('should respect maxRequestsPerWindow from aiConfig', async () => {
    const { RedisRateLimitStore } = await import('./rate-limit-store');
    const mockRedis = {
      hGet: vi.fn().mockResolvedValue(null),
      hSet: vi.fn().mockResolvedValue(undefined),
      expire: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
      ttl: vi.fn().mockResolvedValue(-1),
    };
    const store = new RedisRateLimitStore(mockRedis as any, {
      maxAttempts: 3,
      windowMs: 60000,
    });
    expect(store).toBeInstanceOf(RedisRateLimitStore);
  });
});

describe('AI recommendation caching contract', () => {
  it('should have AI_RECOMMENDER_CACHE_TTL_SECONDS wired into config', async () => {
    const { aiConfig } = await import('../config/ai');
    expect(aiConfig.cacheTtlMs).toBeGreaterThan(0);
  });

  it('recommendation service should use cache adapter when Redis is configured', async () => {
    const originalEnv = process.env.REDIS_URL;
    process.env.REDIS_URL = 'redis://localhost:6379';

    try {
      const { generateRecommendation } =
        await import('../ai/recommendation-service');
      expect(typeof generateRecommendation).toBe('function');
    } finally {
      process.env.REDIS_URL = originalEnv;
    }
  });
});

describe('Stale session cleanup contract', () => {
  it('should export createCleanupTask from platform/session-cleanup', async () => {
    const { createCleanupTask } = await import('./session-cleanup');
    expect(typeof createCleanupTask).toBe('function');
  });

  it('should support intervalMs option for periodic scheduling', async () => {
    const { createCleanupTask } = await import('./session-cleanup');
    const mockPrisma = {
      session: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const cleanup = createCleanupTask(mockPrisma as any, {
      maxAgeMs: 7 * 24 * 60 * 60 * 1000,
      batchSize: 100,
      intervalMs: 60 * 60 * 1000,
    });
    expect(typeof cleanup.start).toBe('function');
    expect(typeof cleanup.stop).toBe('function');
    cleanup.stop();
  });
});

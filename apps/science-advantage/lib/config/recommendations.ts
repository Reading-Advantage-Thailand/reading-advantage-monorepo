import { z } from 'zod';
import { aiConfig } from '@/lib/config/ai';
import { getRedisClient } from '@/lib/platform/redis-client';
import { RedisRateLimitStore } from '@/lib/platform/rate-limit-store';

export const requestSchema = z.object({ attemptId: z.string().min(1) });
export const recommendationCache = new Map<string, { expiresAt: number; response: unknown }>();

export const rateLimitStore = new RedisRateLimitStore(getRedisClient(), {
  maxAttempts: aiConfig.maxRequestsPerWindow,
  windowMs: aiConfig.rateLimitWindowMs,
  fallbackEnabled: true,
});

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) { super('rate-limit'); this.retryAfter = Math.max(1, Math.ceil(retryAfter / 1000)); }
}

export function resetTestkit() {
  recommendationCache.clear();
  rateLimitStore.reset();
}

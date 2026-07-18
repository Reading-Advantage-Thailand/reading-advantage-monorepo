import {
  consumeRateLimit,
  createPostgresRateLimitStore,
} from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";

// Chat remains a best-effort UX throttle. Roleplay submissions use the shared
// PostgreSQL adapter below and are enforced across Cloud Run instances.

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_MAX_ENTRIES = 10000;

const rateLimits = new Map<string, RateLimitEntry>();

/**
 * Per-key rate limiter (in-memory, single-process). Returns `allowed: false`
 * with a `retryAfter` (seconds) when the key has hit `max` in the current
 * window.
 *
 * **FR-7 note:** this is a best-effort soft guard; it is NOT durable across
 * serverless/horizontally-scaled instances. See the banner at the top of
 * this file for the durability decision and the migration path to the
 * Postgres-backed limiter in `rate_limiter_v2_20260603`.
 * @param key The rate-limit bucket key (e.g. user ID + endpoint).
 * @param max Maximum requests allowed per window.
 * @param windowMs Window size in milliseconds.
 * @returns Object indicating whether the request is allowed.
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  if (rateLimits.size > RATE_LIMIT_MAX_ENTRIES) {
    for (const [k, entry] of rateLimits) {
      if (now - entry.windowStart > windowMs) {
        rateLimits.delete(k);
      }
    }
    if (rateLimits.size > RATE_LIMIT_MAX_ENTRIES) {
      const entries = Array.from(rateLimits.entries());
      entries.sort((a, b) => a[1].windowStart - b[1].windowStart);
      const toEvict = entries.slice(0, entries.length - RATE_LIMIT_MAX_ENTRIES);
      for (const [k] of toEvict) {
        rateLimits.delete(k);
      }
    }
  }

  const entry = rateLimits.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimits.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= max) {
    const retryAfter = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

/** Chat-tutor rate limit: 30 messages per user per minute. */
export function checkChatRateLimit(userId: string) {
  return checkRateLimit(`chat:${userId}`, 30, 60_000);
}

/** Roleplay submission rate limit: 10 audio uploads per user per hour. */
export async function checkRoleplayRateLimit(userId: string) {
  const config = { maxAttempts: 10, windowMs: 60 * 60_000 };
  const store = createPostgresRateLimitStore(db, config);
  const result = await consumeRateLimit(
    store,
    `username:sales:roleplay:${userId}`,
    config,
  );
  return { allowed: result.allowed, retryAfter: result.retriesAfter };
}

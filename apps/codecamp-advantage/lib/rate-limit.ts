interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;      // 30 requests per minute
const MAX_RATE_LIMIT_ENTRIES = 10000;    // Prevent unbounded memory growth

const rateLimits = new Map<string, RateLimitEntry>();

export function checkChatRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  // Periodic cleanup: evict stale entries when Map gets large
  if (rateLimits.size > MAX_RATE_LIMIT_ENTRIES) {
    for (const [key, entry] of rateLimits) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimits.delete(key);
      }
    }

    // If still over limit after stale cleanup, evict oldest entries
    if (rateLimits.size > MAX_RATE_LIMIT_ENTRIES) {
      const entries = Array.from(rateLimits.entries());
      entries.sort((a, b) => a[1].windowStart - b[1].windowStart);
      const toEvict = entries.slice(0, entries.length - MAX_RATE_LIMIT_ENTRIES);
      for (const [key] of toEvict) {
        rateLimits.delete(key);
      }
    }
  }

  const entry = rateLimits.get(userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

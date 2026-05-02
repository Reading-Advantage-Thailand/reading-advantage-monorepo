interface RateLimitEntry {
  failedCount: number;
  windowStart: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const rateLimits = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  username: string
): { allowed: boolean; retriesAfter?: number } {
  const entry = rateLimits.get(username);
  if (!entry) {
    return { allowed: true };
  }

  const now = Date.now();
  const elapsed = now - entry.windowStart;

  if (elapsed > WINDOW_MS) {
    // Window expired, reset
    rateLimits.delete(username);
    return { allowed: true };
  }

  if (entry.failedCount >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retriesAfter: Math.ceil((WINDOW_MS - elapsed) / 1000),
    };
  }

  return { allowed: true };
}

export function recordFailure(username: string): void {
  const now = Date.now();
  const entry = rateLimits.get(username);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimits.set(username, { failedCount: 1, windowStart: now });
  } else {
    entry.failedCount++;
  }
}

export function resetLimit(username: string): void {
  rateLimits.delete(username);
}

export const _testkit = {
  resetRateLimiter() {
    rateLimits.clear();
  },
};

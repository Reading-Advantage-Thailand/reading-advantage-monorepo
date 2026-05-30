interface RateLimitEntry {
  failedCount: number;
  windowStart: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

const rateLimits = new Map<string, RateLimitEntry>();

/**
 * Checks the rate limit for a given identifier (username).
 * @param username - The identifier to check rate limit for
 * @returns Object with allowed boolean and optional retriesAfter seconds
 */
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

/**
 * Records a failed authentication attempt for rate limiting.
 * @param username - The identifier to record failure for
 */
export function recordFailure(username: string): void {
  const now = Date.now();
  const entry = rateLimits.get(username);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimits.set(username, { failedCount: 1, windowStart: now });
  } else {
    entry.failedCount++;
  }
}

/**
 * Resets the rate limit for a given identifier.
 * @param username - The identifier to reset rate limit for
 */
export function resetLimit(username: string): void {
  rateLimits.delete(username);
}

export const _testkit = {
  resetRateLimiter() {
    rateLimits.clear();
  },
};

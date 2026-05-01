interface RateLimitEntry {
  failedCount: number;
  windowStart: number;
}

interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
}

interface CheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export class LoginRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private maxAttempts: number;
  private windowMs: number;

  constructor(options: RateLimitOptions) {
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
  }

  checkLimit(username: string): CheckResult {
    const now = Date.now();
    const entry = this.store.get(username);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      return { allowed: true };
    }

    if (entry.failedCount >= this.maxAttempts) {
      const retryAfterMs = this.windowMs - (now - entry.windowStart);
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      };
    }

    return { allowed: true };
  }

  recordFailure(username: string): void {
    const now = Date.now();
    const entry = this.store.get(username);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.store.set(username, { failedCount: 1, windowStart: now });
      return;
    }

    entry.failedCount += 1;
  }

  recordSuccess(username: string): void {
    this.store.delete(username);
  }
}

export interface RateLimitStore {
  checkLimit(id: string): Promise<boolean>;
  recordFailure(id: string): Promise<void>;
  recordSuccess(id: string): Promise<void>;
}

interface RedisHash {
  hGet(key: string, field: string): Promise<string | null>;
  hSet(key: string, field: string, value: string): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
  ttl(key: string): Promise<number>;
}

interface RateLimitStoreOptions {
  maxAttempts: number;
  windowMs: number;
  fallbackEnabled?: boolean;
}

export class RedisRateLimitStore implements RateLimitStore {
  private redis: RedisHash;
  private maxAttempts: number;
  private windowMs: number;
  private fallbackEnabled: boolean;
  private fallbackData: Map<string, { count: number; windowStart: number }>;

  constructor(redis: RedisHash, options: RateLimitStoreOptions) {
    this.redis = redis;
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.fallbackEnabled = options.fallbackEnabled ?? false;
    this.fallbackData = new Map();
  }

  private buildKey(id: string): string {
    return `ratelimit:${id}`;
  }

  private now(): number {
    return Date.now();
  }

  async checkLimit(id: string): Promise<boolean> {
    const key = this.buildKey(id);

    try {
      const countStr = await this.redis.hGet(key, 'count');
      const windowStartStr = await this.redis.hGet(key, 'windowStart');

      if (!countStr || !windowStartStr) {
        return true;
      }

      const count = parseInt(countStr, 10);
      const windowStart = parseInt(windowStartStr, 10);

      if (isNaN(count) || isNaN(windowStart)) {
        return true;
      }

      if (this.now() - windowStart >= this.windowMs) {
        return true;
      }

      return count < this.maxAttempts;
    } catch {
      if (this.fallbackEnabled) {
        const entry = this.fallbackData.get(key);
        if (!entry) return true;
        if (this.now() - entry.windowStart >= this.windowMs) {
          return true;
        }
        return entry.count < this.maxAttempts;
      }
      return true;
    }
  }

  async recordFailure(id: string): Promise<void> {
    const key = this.buildKey(id);

    try {
      const countStr = await this.redis.hGet(key, 'count');
      const windowStartStr = await this.redis.hGet(key, 'windowStart');

      let count = countStr ? parseInt(countStr, 10) : 0;
      let windowStart = windowStartStr
        ? parseInt(windowStartStr, 10)
        : this.now();

      if (this.now() - windowStart >= this.windowMs) {
        count = 0;
        windowStart = this.now();
      }

      count += 1;

      await this.redis.hSet(key, 'count', count.toString());
      await this.redis.hSet(key, 'windowStart', windowStart.toString());
      await this.redis.expire(key, Math.ceil(this.windowMs / 1000));
    } catch {
      if (this.fallbackEnabled) {
        const entry = this.fallbackData.get(key);
        if (!entry || this.now() - entry.windowStart >= this.windowMs) {
          this.fallbackData.set(key, { count: 1, windowStart: this.now() });
        } else {
          entry.count += 1;
        }
      }
    }
  }

  async recordSuccess(id: string): Promise<void> {
    const key = this.buildKey(id);

    try {
      await this.redis.del(key);
    } catch {
      // Redis failed, try fallback
    }

    if (this.fallbackEnabled) {
      this.fallbackData.delete(key);
    }
  }

  reset(): void {
    this.fallbackData.clear();
  }
}

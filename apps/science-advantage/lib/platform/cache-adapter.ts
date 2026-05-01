export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

export interface CacheAdapterOptions {
  prefix: string;
  defaultTtlMs: number;
  fallbackStore?: Map<string, { value: string; expiresAt: number }>;
}

export interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

export class RedisCacheAdapter {
  private redis: RedisLike;
  private prefix: string;
  private defaultTtlMs: number;
  private fallbackStore?: Map<string, { value: string; expiresAt: number }>;

  constructor(redis: RedisLike, options: CacheAdapterOptions) {
    this.redis = redis;
    this.prefix = options.prefix;
    this.defaultTtlMs = options.defaultTtlMs;
    this.fallbackStore = options.fallbackStore;
  }

  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isFallbackEntry(
    entry: { value: string; expiresAt: number } | undefined
  ): boolean {
    return entry !== undefined && entry.expiresAt < Date.now();
  }

  async get(key: string): Promise<string | null> {
    const fullKey = this.buildKey(key);

    try {
      const value = await this.redis.get(fullKey);
      return value;
    } catch {
      if (this.fallbackStore) {
        const entry = this.fallbackStore.get(fullKey);
        if (!entry) return null;
        if (this.isFallbackEntry(entry)) {
          this.fallbackStore.delete(fullKey);
          return null;
        }
        return entry.value;
      }
      return null;
    }
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttl = ttlMs ?? this.defaultTtlMs;

    try {
      await this.redis.set(fullKey, value, ttl);
    } catch {
      if (this.fallbackStore) {
        this.fallbackStore.set(fullKey, {
          value,
          expiresAt: Date.now() + ttl,
        });
      }
    }
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);

    try {
      await this.redis.del(fullKey);
    } catch {
      // Redis failed, try fallback
    }

    if (this.fallbackStore) {
      this.fallbackStore.delete(fullKey);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const fullPattern = this.buildKey(pattern);

    try {
      return await this.redis.keys(fullPattern);
    } catch {
      if (this.fallbackStore) {
        const prefix = fullPattern.replace('*', '');
        return Array.from(this.fallbackStore.keys())
          .filter((k) => k.startsWith(prefix))
          .map((k) => k.slice(this.prefix.length));
      }
      return [];
    }
  }
}

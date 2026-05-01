import { env } from '@/lib/env';

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  hGet(key: string, field: string): Promise<string | null>;
  hSet(key: string, field: string, value: string): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
}

function createInMemoryClient(): RedisClient {
  const store = new Map<string, { value: string; expiresAt?: number }>();
  const hashStore = new Map<string, Record<string, string>>();

  return {
    async get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key: string, value: string, ttlMs: number): Promise<void> {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    async del(key: string): Promise<void> {
      store.delete(key);
      hashStore.delete(key);
    },
    async keys(pattern: string): Promise<string[]> {
      const prefix = pattern.replace('*', '');
      return Array.from(store.keys()).filter((k) => k.startsWith(prefix));
    },
    async hGet(key: string, field: string): Promise<string | null> {
      const entry = hashStore.get(key);
      return entry ? (entry[field] ?? null) : null;
    },
    async hSet(key: string, field: string, value: string): Promise<void> {
      if (!hashStore.has(key)) {
        hashStore.set(key, {});
      }
      hashStore.get(key)![field] = value;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async expire(_key: string, _seconds: number): Promise<void> {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async ttl(_key: string): Promise<number> {
      return -1;
    },
  };
}

let redisClient: RedisClient | null = null;
let connectionFailed = false;

export function getRedisClient(): RedisClient {
  if (connectionFailed || !env.REDIS_URL) {
    return createInMemoryClient();
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    const redisUrl = new URL(env.REDIS_URL);
    const isUpstash = env.REDIS_URL.includes('upstash');

    if (isUpstash) {
      redisClient = createUpstashClient(env.REDIS_URL);
    } else if (redisUrl.protocol === 'redis:') {
      redisClient = createNodeRedisClient(env.REDIS_URL);
    } else {
      connectionFailed = true;
      return createInMemoryClient();
    }

    return redisClient;
  } catch {
    connectionFailed = true;
    return createInMemoryClient();
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createUpstashClient(_url: string): RedisClient {
  return createInMemoryClient();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createNodeRedisClient(_url: string): RedisClient {
  return createInMemoryClient();
}

export function resetRedisClient(): void {
  redisClient = null;
  connectionFailed = false;
}

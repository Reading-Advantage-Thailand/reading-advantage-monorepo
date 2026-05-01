import type { AlertPayload } from './detect-alerts';
import { interventionConfig } from './config';

type CacheValue = {
  classId: string;
  generatedAt: string;
  alerts: AlertPayload[];
  cacheKey: string;
};

type InternalCacheEntry = {
  expiresAt: number;
  value: CacheValue;
};

const store = new Map<string, InternalCacheEntry>();

function buildKey(classId: string) {
  return `interventions:${classId}`;
}

function isExpired(entry: InternalCacheEntry) {
  return entry.expiresAt < Date.now();
}

export const interventionCache = {
  get(classId: string): CacheValue | null {
    const key = buildKey(classId);
    const entry = store.get(key);
    if (!entry) {
      return null;
    }

    if (isExpired(entry)) {
      store.delete(key);
      return null;
    }

    return entry.value;
  },
  set(classId: string, value: Omit<CacheValue, 'cacheKey'>) {
    const key = buildKey(classId);
    const expiresAt = Date.now() + interventionConfig.cacheTtlMs;
    store.set(key, {
      expiresAt,
      value: {
        ...value,
        cacheKey: key,
      },
    });
  },
  invalidate(classId: string) {
    const key = buildKey(classId);
    store.delete(key);
  },
  clear() {
    store.clear();
  },
};

export type { CacheValue as InterventionCacheValue };

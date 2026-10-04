import type { RateLimitStore, RateLimitStoreEntry } from "@reading-advantage/auth";

/**
 * Builds an isolated in-memory rate-limit store with atomic `consume`.
 * @returns A store and its backing map.
 */
export function makeStore(): RateLimitStore & { map: Map<string, RateLimitStoreEntry> } {
  const map = new Map<string, RateLimitStoreEntry>();
  return {
    map,
    get: async (key) => map.get(key),
    set: async (key, entry) => void map.set(key, entry),
    delete: async (key) => void map.delete(key),
    consume: async (key, now, windowMs) => {
      const prev = map.get(key);
      const entry =
        !prev || now - prev.windowStart > windowMs
          ? { failedCount: 1, windowStart: now }
          : { failedCount: prev.failedCount + 1, windowStart: prev.windowStart };
      map.set(key, entry);
      return entry;
    },
  };
}

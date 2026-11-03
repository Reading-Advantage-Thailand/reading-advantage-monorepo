import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  _testkit,
  consumeRateLimit,
  createInMemoryRateLimitStore,
  type RateLimitStore,
  type RateLimitStoreEntry,
} from "../rate-limit.js";

const CONFIG = { windowMs: 60_000, maxAttempts: 2 };
const T0 = new Date("2026-07-15T00:00:00Z").getTime();

/** Builds a store with only get/set/delete backed by a Map. */
function basicStore(map = new Map<string, RateLimitStoreEntry>()): RateLimitStore {
  return {
    get: vi.fn(async (k: string) => map.get(k)),
    set: vi.fn(async (k: string, e: RateLimitStoreEntry) => {
      map.set(k, e);
    }),
    delete: vi.fn(async (k: string) => {
      map.delete(k);
    }),
  };
}

beforeEach(() => {
  _testkit.resetRateLimiter();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("consumeRateLimit with the in-memory consume path", () => {
  it("allows up to maxAttempts requests, then blocks with a retry delay", async () => {
    const store = createInMemoryRateLimitStore();

    await expect(consumeRateLimit(store, "c:a", CONFIG)).resolves.toEqual({ allowed: true });
    await expect(consumeRateLimit(store, "c:a", CONFIG)).resolves.toEqual({ allowed: true });
    vi.setSystemTime(T0 + 10_000);
    await expect(consumeRateLimit(store, "c:a", CONFIG)).resolves.toEqual({
      allowed: false,
      retriesAfter: 50,
    });
  });

  it("keeps the first window start while counting", async () => {
    const store = createInMemoryRateLimitStore();
    await consumeRateLimit(store, "c:b", CONFIG);
    vi.setSystemTime(T0 + 5_000);
    await consumeRateLimit(store, "c:b", CONFIG);

    await expect(store.get("c:b")).resolves.toEqual({ failedCount: 2, windowStart: T0 });
  });

  it("starts a new window after the old one expires", async () => {
    const store = createInMemoryRateLimitStore();
    for (let i = 0; i < 3; i++) await consumeRateLimit(store, "c:c", CONFIG);

    vi.setSystemTime(T0 + CONFIG.windowMs + 1);
    await expect(consumeRateLimit(store, "c:c", CONFIG)).resolves.toEqual({ allowed: true });
    await expect(store.get("c:c")).resolves.toEqual({
      failedCount: 1,
      windowStart: T0 + CONFIG.windowMs + 1,
    });
  });

  it("still counts in the window at exactly windowMs elapsed", async () => {
    const store = createInMemoryRateLimitStore();
    await consumeRateLimit(store, "c:d", CONFIG);
    vi.setSystemTime(T0 + CONFIG.windowMs);
    await consumeRateLimit(store, "c:d", CONFIG);

    await expect(store.get("c:d")).resolves.toEqual({ failedCount: 2, windowStart: T0 });
  });

  it("reports a retry delay of at least one second at the window edge", async () => {
    const store = createInMemoryRateLimitStore();
    for (let i = 0; i < 2; i++) await consumeRateLimit(store, "c:e", CONFIG);
    vi.setSystemTime(T0 + CONFIG.windowMs);

    await expect(consumeRateLimit(store, "c:e", CONFIG)).resolves.toEqual({
      allowed: false,
      retriesAfter: 1,
    });
  });
});

describe("consumeRateLimit fallbacks", () => {
  it("uses increment then get when the store has no consume", async () => {
    const map = new Map<string, RateLimitStoreEntry>();
    const store = basicStore(map);
    store.increment = vi.fn(async (k: string, now: number) => {
      const e = map.get(k);
      map.set(k, { failedCount: (e?.failedCount ?? 0) + 1, windowStart: e?.windowStart ?? now });
    });

    await consumeRateLimit(store, "i:a", CONFIG);
    await consumeRateLimit(store, "i:a", CONFIG);
    const third = await consumeRateLimit(store, "i:a", CONFIG);

    expect(store.increment).toHaveBeenCalledWith("i:a", T0, CONFIG.windowMs);
    expect(store.get).toHaveBeenCalledTimes(3);
    expect(third).toEqual({ allowed: false, retriesAfter: 60 });
  });

  it("treats a store with neither consume nor increment as a first request", async () => {
    const store = basicStore();

    await expect(consumeRateLimit(store, "n:a", CONFIG)).resolves.toEqual({ allowed: true });
    expect(store.set).not.toHaveBeenCalled();
  });

  it("blocks from a stored entry when the store has neither consume nor increment", async () => {
    const map = new Map([["n:b", { failedCount: 9, windowStart: T0 - 30_000 }]]);
    const store = basicStore(map);

    await expect(consumeRateLimit(store, "n:b", CONFIG)).resolves.toEqual({
      allowed: false,
      retriesAfter: 30,
    });
  });
});

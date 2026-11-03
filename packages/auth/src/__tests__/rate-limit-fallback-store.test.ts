import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  _testkit,
  checkRateLimit,
  checkRateLimitByIp,
  configureRateLimiter,
  DEFAULT_IP_RATE_LIMIT_CONFIG,
  getIpRateLimitConfig,
  getRateLimitConfig,
  recordFailure,
  type RateLimitStore,
  type RateLimitStoreEntry,
} from "../rate-limit.js";

const T0 = new Date("2026-06-03T00:00:00Z").getTime();

/** Builds a store without increment, so recordFailure takes the get/set fallback. */
function legacyStore() {
  const map = new Map<string, RateLimitStoreEntry>();
  const store: RateLimitStore = {
    get: vi.fn(async (k: string) => {
      const e = map.get(k);
      return e ? { ...e } : undefined;
    }),
    set: vi.fn(async (k: string, e: RateLimitStoreEntry) => {
      map.set(k, { ...e });
    }),
    delete: vi.fn(async (k: string) => {
      map.delete(k);
    }),
  };
  return { map, store };
}

beforeEach(() => {
  _testkit.resetRateLimiter();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  _testkit.resetRateLimiter();
  vi.useRealTimers();
});

describe("recordFailure on a store without increment", () => {
  it("creates a bucket at one failure for username and ip", async () => {
    const { map, store } = legacyStore();
    configureRateLimiter({ store });

    await recordFailure("alice", "10.0.0.1");

    expect(map.get("username:alice")).toEqual({ failedCount: 1, windowStart: T0 });
    expect(map.get("ip:10.0.0.1")).toEqual({ failedCount: 1, windowStart: T0 });
  });

  it("increments inside the window and keeps the window start", async () => {
    const { map, store } = legacyStore();
    configureRateLimiter({ store });

    await recordFailure("bob");
    vi.setSystemTime(T0 + 1000);
    await recordFailure("bob");

    expect(map.get("username:bob")).toEqual({ failedCount: 2, windowStart: T0 });
    expect(map.has("ip:undefined")).toBe(false);
  });

  it("resets the bucket after the window expires", async () => {
    const { map, store } = legacyStore();
    configureRateLimiter({ store, config: { windowMs: 1000 } });

    await recordFailure("carol");
    await recordFailure("carol");
    vi.setSystemTime(T0 + 1001);
    await recordFailure("carol");

    expect(map.get("username:carol")).toEqual({ failedCount: 1, windowStart: T0 + 1001 });
  });

  it("blocks the username after maxAttempts fallback failures", async () => {
    const { store } = legacyStore();
    configureRateLimiter({ store, config: { maxAttempts: 2 } });

    await recordFailure("dave");
    await expect(checkRateLimit("dave")).resolves.toMatchObject({ allowed: true });
    await recordFailure("dave");
    await expect(checkRateLimit("dave")).resolves.toMatchObject({ allowed: false });
  });
});

describe("IP config overrides", () => {
  it("merges a partial ipConfig onto the IP defaults", () => {
    configureRateLimiter({ ipConfig: { maxAttempts: 3 } });

    expect(getIpRateLimitConfig()).toEqual({
      windowMs: DEFAULT_IP_RATE_LIMIT_CONFIG.windowMs,
      maxAttempts: 3,
    });
    expect(getRateLimitConfig().maxAttempts).toBe(5);
  });

  it("keeps the current store when configure gets no store", async () => {
    const { map, store } = legacyStore();
    configureRateLimiter({ store });
    configureRateLimiter({ config: { maxAttempts: 9 } });

    await recordFailure("erin");
    expect(map.has("username:erin")).toBe(true);
  });

  it("blocks an IP on the configured IP maximum", async () => {
    configureRateLimiter({ ipConfig: { maxAttempts: 2 } });
    await recordFailure("u1", "1.1.1.1");
    await recordFailure("u2", "1.1.1.1");

    const result = await checkRateLimit("u3", "1.1.1.1");
    expect(result.allowed).toBe(false);
    expect(result.retriesAfter).toBe(900);
  });
});

describe("checkRateLimitByIp", () => {
  it("allows an IP with no bucket", async () => {
    await expect(checkRateLimitByIp("9.9.9.9")).resolves.toEqual({ allowed: true });
  });

  it("uses the configured IP limits without overrides", async () => {
    configureRateLimiter({ ipConfig: { maxAttempts: 1 } });
    await recordFailure("x", "2.2.2.2");

    await expect(checkRateLimitByIp("2.2.2.2")).resolves.toMatchObject({ allowed: false });
  });

  it("applies per-call overrides on top of the configured IP limits", async () => {
    await recordFailure("x", "3.3.3.3");
    await recordFailure("y", "3.3.3.3");

    await expect(checkRateLimitByIp("3.3.3.3")).resolves.toMatchObject({ allowed: true });
    await expect(checkRateLimitByIp("3.3.3.3", { maxAttempts: 2 })).resolves.toMatchObject({
      allowed: false,
      retriesAfter: 900,
    });
    expect(getIpRateLimitConfig().maxAttempts).toBe(30);
  });

  it("clears an expired IP bucket on check", async () => {
    await recordFailure("x", "4.4.4.4");
    vi.setSystemTime(T0 + 5000);

    await expect(checkRateLimitByIp("4.4.4.4", { windowMs: 1000 })).resolves.toEqual({
      allowed: true,
    });
    await expect(checkRateLimitByIp("4.4.4.4")).resolves.toEqual({ allowed: true });
  });
});

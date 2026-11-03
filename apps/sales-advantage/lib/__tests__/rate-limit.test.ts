// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  createPostgresRateLimitStore: vi.fn(),
  db: { marker: "db" },
}));

vi.mock("@reading-advantage/auth", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  createPostgresRateLimitStore: mocks.createPostgresRateLimitStore,
}));

vi.mock("@reading-advantage/db", () => ({ db: mocks.db }));

/**
 * Loads a fresh copy of the rate-limit module so the in-memory map starts empty.
 * @returns The freshly imported module.
 */
async function loadModule() {
  vi.resetModules();
  return import("../rate-limit");
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to max requests in one window, then blocks", async () => {
    const { checkRateLimit } = await loadModule();
    expect(checkRateLimit("k", 3, 60_000)).toEqual({ allowed: true });
    expect(checkRateLimit("k", 3, 60_000)).toEqual({ allowed: true });
    expect(checkRateLimit("k", 3, 60_000)).toEqual({ allowed: true });
    expect(checkRateLimit("k", 3, 60_000)).toEqual({
      allowed: false,
      retryAfter: 60,
    });
  });

  it("rounds retryAfter up to whole seconds of the remaining window", async () => {
    const { checkRateLimit } = await loadModule();
    checkRateLimit("k", 1, 60_000);
    vi.advanceTimersByTime(10_500);
    expect(checkRateLimit("k", 1, 60_000)).toEqual({
      allowed: false,
      retryAfter: 50,
    });
  });

  it("keeps the window closed at exactly windowMs and reopens after it", async () => {
    const { checkRateLimit } = await loadModule();
    checkRateLimit("k", 1, 1_000);
    vi.advanceTimersByTime(1_000);
    expect(checkRateLimit("k", 1, 1_000)).toEqual({
      allowed: false,
      retryAfter: 0,
    });
    vi.advanceTimersByTime(1);
    expect(checkRateLimit("k", 1, 1_000)).toEqual({ allowed: true });
  });

  it("counts each key separately", async () => {
    const { checkRateLimit } = await loadModule();
    expect(checkRateLimit("a", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit("a", 1, 60_000).allowed).toBe(false);
    expect(checkRateLimit("b", 1, 60_000).allowed).toBe(true);
  });

  it("drops expired entries once the map exceeds its cap", async () => {
    const { checkRateLimit } = await loadModule();
    checkRateLimit("victim", 1, 1_000);
    expect(checkRateLimit("victim", 1, 1_000).allowed).toBe(false);
    vi.advanceTimersByTime(2_000);
    // Victim plus 10_000 fills exceeds the cap; the next call sweeps the victim.
    for (let i = 0; i < 10_001; i++) checkRateLimit(`fill-${i}`, 1, 1_000);
    expect(checkRateLimit("fill-10000", 1, 1_000).allowed).toBe(false);
    expect(checkRateLimit("victim", 1, 1_000).allowed).toBe(true);
  });

  it("evicts the oldest live entries when none have expired", async () => {
    const { checkRateLimit } = await loadModule();
    checkRateLimit("oldest", 1, 60_000);
    vi.advanceTimersByTime(1);
    for (let i = 0; i < 10_000; i++) checkRateLimit(`fill-${i}`, 1, 60_000);
    // Map holds 10_001 live entries; this call evicts "oldest".
    checkRateLimit("trigger", 1, 60_000);
    expect(checkRateLimit("oldest", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit("fill-9999", 1, 60_000).allowed).toBe(false);
  });
});

describe("checkChatRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows 30 messages per user per minute", async () => {
    const { checkChatRateLimit } = await loadModule();
    for (let i = 0; i < 30; i++) {
      expect(checkChatRateLimit("rep-1").allowed).toBe(true);
    }
    expect(checkChatRateLimit("rep-1")).toEqual({
      allowed: false,
      retryAfter: 60,
    });
    expect(checkChatRateLimit("rep-2").allowed).toBe(true);
    vi.advanceTimersByTime(60_001);
    expect(checkChatRateLimit("rep-1").allowed).toBe(true);
  });

  it("does not share buckets with other key namespaces", async () => {
    const { checkChatRateLimit, checkRateLimit } = await loadModule();
    expect(checkRateLimit("chat:rep-1", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit("chat:rep-1", 1, 60_000).allowed).toBe(false);
    // Same key prefix: the chat limiter sees the existing bucket (count 1 < 30).
    expect(checkChatRateLimit("rep-1").allowed).toBe(true);
  });
});

describe("checkRoleplayRateLimit", () => {
  beforeEach(() => {
    mocks.consumeRateLimit.mockReset();
    mocks.createPostgresRateLimitStore.mockReset();
  });

  it("consumes the shared PostgreSQL limiter with 10 attempts per hour", async () => {
    const store = { kind: "store" };
    mocks.createPostgresRateLimitStore.mockReturnValue(store);
    mocks.consumeRateLimit.mockResolvedValue({ allowed: true });
    const { checkRoleplayRateLimit } = await loadModule();

    await expect(checkRoleplayRateLimit("rep-1")).resolves.toEqual({
      allowed: true,
      retryAfter: undefined,
    });

    const config = { maxAttempts: 10, windowMs: 3_600_000 };
    expect(mocks.createPostgresRateLimitStore).toHaveBeenCalledWith(
      mocks.db,
      config,
    );
    expect(mocks.consumeRateLimit).toHaveBeenCalledWith(
      store,
      "username:sales:roleplay:rep-1",
      config,
    );
  });

  it("maps retriesAfter to retryAfter when blocked", async () => {
    mocks.createPostgresRateLimitStore.mockReturnValue({});
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      retriesAfter: 1_234,
    });
    const { checkRoleplayRateLimit } = await loadModule();

    await expect(checkRoleplayRateLimit("rep-2")).resolves.toEqual({
      allowed: false,
      retryAfter: 1_234,
    });
  });

  it("propagates a store failure instead of allowing the upload", async () => {
    mocks.createPostgresRateLimitStore.mockReturnValue({});
    mocks.consumeRateLimit.mockRejectedValue(new Error("db down"));
    const { checkRoleplayRateLimit } = await loadModule();

    await expect(checkRoleplayRateLimit("rep-3")).rejects.toThrow("db down");
  });
});

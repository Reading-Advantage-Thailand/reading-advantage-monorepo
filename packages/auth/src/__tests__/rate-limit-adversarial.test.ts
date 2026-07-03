/**
 * Adversarial boundary probes for the rate-limit public API
 * (`checkRateLimit`, `recordFailure`, `resetLimit`).
 *
 * The shipped API uses `{ allowed, retriesAfter, captchaRequired }` —
 * NOT `{ allowed, remaining, retryAfterMs }` as the spec proposed. The
 * CR-1 changed-contract note in `test-strategy.md` documents this; the
 * adversarial assertions here pin the SHIPPED contract.
 *
 * Probes:
 *   1. Exactly at the boundary (5th attempt after 4 failures) → still allowed
 *   2. Just past the boundary (6th attempt after 5 failures) → blocked
 *   3. Window expiry at the millisecond boundary (strict > windowMs)
 *   4. Empty-string and very-long username/IP keys
 *   5. Concurrent recordFailure calls use the atomic increment path
 *   6. resetLimit on a non-existent record is a no-op
 *   7. captchaRequired threshold (3) and reset semantics
 *   8. captchaRequired independence across username and IP buckets
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkRateLimit,
  checkRateLimitByIp,
  recordFailure,
  resetLimit,
  createInMemoryRateLimitStore,
  configureRateLimiter,
  _testkit,
  CAPTCHA_THRESHOLD,
  DEFAULT_RATE_LIMIT_CONFIG,
} from "../rate-limit.js";

describe("rate-limit — adversarial boundary probes", () => {
  beforeEach(() => {
    _testkit.resetRateLimiter();
  });

  // ───────────────────────────────────────────────────────────────────
  // 1. Exactly at the boundary (5th attempt after 4 failures)
  // ───────────────────────────────────────────────────────────────────

  it("allows the 5th attempt when 4 failures are already recorded (boundary)", async () => {
    for (let i = 0; i < 4; i++) {
      await recordFailure("alice");
    }
    // The 5th attempt's check (before any further recordFailure) is
    // the boundary case: count=4, maxAttempts=5 → allowed.
    const result = await checkRateLimit("alice");
    expect(result.allowed).toBe(true);
    // 4 >= CAPTCHA_THRESHOLD (3), so the captcha flag must also be on.
    expect(result.captchaRequired).toBe(true);
    // retriesAfter must NOT be set when allowed is true.
    expect(result.retriesAfter).toBeUndefined();
  });

  // ───────────────────────────────────────────────────────────────────
  // 2. Just past the boundary (6th attempt after 5 failures)
  // ───────────────────────────────────────────────────────────────────

  it("blocks the 6th attempt when 5 failures are already recorded (past boundary)", async () => {
    for (let i = 0; i < 5; i++) {
      await recordFailure("alice");
    }
    const result = await checkRateLimit("alice");
    expect(result.allowed).toBe(false);
    // retriesAfter must be present and positive.
    expect(typeof result.retriesAfter).toBe("number");
    expect(result.retriesAfter!).toBeGreaterThan(0);
    // retriesAfter in seconds — must be <= windowMs/1000 (rounded up).
    const windowSec = Math.ceil(DEFAULT_RATE_LIMIT_CONFIG.windowMs / 1000);
    expect(result.retriesAfter!).toBeLessThanOrEqual(windowSec);
  });

  // ───────────────────────────────────────────────────────────────────
  // 3. Window expiry at the millisecond boundary
  // ───────────────────────────────────────────────────────────────────

  describe("window-expiry boundary (strict greater-than)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("treats elapsed == windowMs as still-in-window (strict greater-than)", () => {
      const store = createInMemoryRateLimitStore();
      const baseTime = new Date("2026-07-03T12:00:00Z").getTime();
      vi.setSystemTime(baseTime);
      configureRateLimiter({
        store,
        config: { windowMs: 10_000, maxAttempts: 5 },
      });
      // windowStart = baseTime, then advance by exactly windowMs.
      // elapsed at check = (baseTime + windowMs) - baseTime = windowMs.
      store.set("username:bob", { failedCount: 5, windowStart: baseTime });
      vi.advanceTimersByTime(10_000); // elapsed = 10_000ms = windowMs
      return checkRateLimit("bob").then((result) => {
        // Strict greater-than: elapsed == windowMs is STILL in window.
        expect(result.allowed).toBe(false);
      });
    });

    it("treats elapsed == windowMs + 1ms as expired (allowed)", () => {
      const store = createInMemoryRateLimitStore();
      const baseTime = new Date("2026-07-03T12:00:00Z").getTime();
      vi.setSystemTime(baseTime);
      configureRateLimiter({
        store,
        config: { windowMs: 10_000, maxAttempts: 5 },
      });
      store.set("username:carol", { failedCount: 5, windowStart: baseTime });
      vi.advanceTimersByTime(10_001); // elapsed = windowMs + 1
      return checkRateLimit("carol").then((result) => {
        expect(result.allowed).toBe(true);
      });
    });

    it("treats elapsed == windowMs - 1ms as still-in-window (blocked)", () => {
      const store = createInMemoryRateLimitStore();
      const baseTime = new Date("2026-07-03T12:00:00Z").getTime();
      vi.setSystemTime(baseTime);
      configureRateLimiter({
        store,
        config: { windowMs: 10_000, maxAttempts: 5 },
      });
      store.set("username:dave", { failedCount: 5, windowStart: baseTime });
      vi.advanceTimersByTime(9_999); // elapsed = windowMs - 1
      return checkRateLimit("dave").then((result) => {
        expect(result.allowed).toBe(false);
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 4. Edge-case identifiers — empty string, very long
  // ───────────────────────────────────────────────────────────────────

  it("does not throw on an empty-string username and rate-limits it normally", async () => {
    expect(() => recordFailure("", "1.2.3.4")).not.toThrow();
    expect(() => recordFailure("", "1.2.3.4")).not.toThrow();
    const result = await checkRateLimit("", "1.2.3.4");
    expect(result.allowed).toBe(true);
  });

  it("does not throw on a 1000-character username and tracks it independently", async () => {
    const longUsername = "u".repeat(1000);
    await recordFailure(longUsername);
    await recordFailure(longUsername);

    const result = await checkRateLimit(longUsername);
    expect(result.allowed).toBe(true);
    expect(result.captchaRequired).toBe(false);

    // A different (shorter) username is independent.
    const other = await checkRateLimit("alice");
    expect(other.allowed).toBe(true);
    expect(other.captchaRequired).toBeUndefined();
  });

  it("does not throw on a 1000-character IP address and rate-limits it", async () => {
    const longIp = "10.0.0.1:" + "x".repeat(1000);
    await recordFailure("alice", longIp);
    await recordFailure("alice", longIp);

    const ipResult = await checkRateLimitByIp(longIp);
    expect(ipResult.allowed).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. Concurrent recordFailure uses the atomic increment path
  // ───────────────────────────────────────────────────────────────────

  it("uses the store's atomic increment() path for concurrent failures (no lost updates)", async () => {
    const store = createInMemoryRateLimitStore();
    const incrementSpy = vi.spyOn(store, "increment");
    configureRateLimiter({ store });

    // Fire 10 concurrent recordFailure calls. With the atomic
    // increment path (in-memory Map), the final count MUST be exactly
    // 10 — a get→set cycle would be non-atomic and could lose updates.
    await Promise.all(
      Array.from({ length: 10 }, () => recordFailure("alice")),
    );

    // Verify the atomic path was taken.
    expect(incrementSpy).toHaveBeenCalledTimes(10);

    // Verify the count is accurate.
    const entry = await store.get("username:alice");
    expect(entry?.failedCount).toBe(10);
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. resetLimit when no record exists — no-op
  // ───────────────────────────────────────────────────────────────────

  it("resetLimit does not throw when there is no existing record", async () => {
    expect(() => resetLimit("ghost-user")).not.toThrow();
    // The next check must still report allowed (no entry).
    const result = await checkRateLimit("ghost-user");
    expect(result.allowed).toBe(true);
  });

  it("resetLimit does not throw for both an unknown username and unknown IP", async () => {
    expect(() => resetLimit("nobody", "203.0.113.99")).not.toThrow();
    const result = await checkRateLimit("nobody", "203.0.113.99");
    expect(result.allowed).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────
  // 7. captchaRequired semantics — threshold, reset, partial reset
  // ───────────────────────────────────────────────────────────────────

  it("does not require captcha below CAPTCHA_THRESHOLD failures", async () => {
    for (let i = 0; i < CAPTCHA_THRESHOLD - 1; i++) {
      await recordFailure("alice");
    }
    const result = await checkRateLimit("alice");
    expect(result.allowed).toBe(true);
    expect(result.captchaRequired).not.toBe(true);
  });

  it("requires captcha exactly at CAPTCHA_THRESHOLD failures", async () => {
    for (let i = 0; i < CAPTCHA_THRESHOLD; i++) {
      await recordFailure("alice");
    }
    const result = await checkRateLimit("alice");
    expect(result.captchaRequired).toBe(true);
  });

  it("clears captchaRequired when resetLimit is called (single 3-then-reset cycle)", async () => {
    for (let i = 0; i < 3; i++) {
      await recordFailure("alice");
    }
    expect((await checkRateLimit("alice")).captchaRequired).toBe(true);
    await resetLimit("alice");
    expect((await checkRateLimit("alice")).captchaRequired).not.toBe(true);
  });

  it("does NOT set captchaRequired when count is reset mid-cycle (2 → reset → 2)", async () => {
    // 2 failures → below threshold.
    await recordFailure("alice");
    await recordFailure("alice");
    // Reset clears the count.
    await resetLimit("alice");
    // 2 more failures → still below threshold, so no captcha.
    await recordFailure("alice");
    await recordFailure("alice");

    const result = await checkRateLimit("alice");
    expect(result.allowed).toBe(true);
    expect(result.captchaRequired).not.toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────
  // 8. captchaRequired independence — username and IP buckets
  // ───────────────────────────────────────────────────────────────────

  it("captchaRequired is per-username: alice gets captcha, bob does not", async () => {
    for (let i = 0; i < 3; i++) {
      await recordFailure("alice", "1.2.3.4");
    }
    const aliceResult = await checkRateLimit("alice", "1.2.3.4");
    expect(aliceResult.captchaRequired).toBe(true);

    const bobResult = await checkRateLimit("bob", "1.2.3.4");
    expect(bobResult.captchaRequired).not.toBe(true);
    expect(bobResult.allowed).toBe(true);
  });

  it("captchaRequired for IP bucket does not leak to a fresh username bucket", async () => {
    // 3 IP-only failures for a brand-new IP → IP bucket has captcha
    // but no username bucket exists.
    for (let i = 0; i < 3; i++) {
      await recordFailure("never-seen-user", "203.0.113.50");
    }
    // Check just the IP bucket alone.
    const ipOnly = await checkRateLimitByIp("203.0.113.50");
    expect(ipOnly.captchaRequired).toBe(true);

    // A fresh username attempting from the same IP — username bucket
    // is empty so captchaRequired must NOT be set.
    const fresh = await checkRateLimit("brand-new-user", "203.0.113.50");
    // Username check is the first gate; fresh username bucket is
    // empty → allowed=true and no captcha flag from the username
    // bucket.
    expect(fresh.allowed).toBe(true);
    expect(fresh.captchaRequired).not.toBe(true);
  });

  it("3 IP failures from a username that has 0 failures: username bucket captcha is false", async () => {
    // The username "alice" has no failures yet; the IP "5.6.7.8" has
    // 3. The username check must report no captcha.
    for (let i = 0; i < 3; i++) {
      await recordFailure("alice", "5.6.7.8");
    }
    // Force a different username to query (no recordFailure recorded
    // against this username yet).
    const result = await checkRateLimit("fresh-user", "5.6.7.8");
    expect(result.allowed).toBe(true);
    expect(result.captchaRequired).not.toBe(true);
  });

  it("captchaRequired for username does not depend on which IP recorded the failures", async () => {
    // 3 failures recorded against "alice" from IP "1.1.1.1".
    for (let i = 0; i < 3; i++) {
      await recordFailure("alice", "1.1.1.1");
    }
    // Querying alice from a DIFFERENT IP still surfaces the
    // captcha-required flag from the username bucket.
    const result = await checkRateLimit("alice", "2.2.2.2");
    expect(result.captchaRequired).toBe(true);
  });
});
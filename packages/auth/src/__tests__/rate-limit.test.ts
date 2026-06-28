import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  recordFailure,
  resetLimit,
  _testkit,
} from "../rate-limit.js";

describe("rate-limit", () => {
  beforeEach(() => {
    _testkit.resetRateLimiter();
  });

  it("allows login when no previous failures", async () => {
    const result = await checkRateLimit("user1");
    expect(result.allowed).toBe(true);
  });

  it("allows login within the limit", async () => {
    for (let i = 0; i < 4; i++) {
      await recordFailure("user1");
    }
    const result = await checkRateLimit("user1");
    expect(result.allowed).toBe(true);
  });

  it("blocks login after exceeding the limit", async () => {
    for (let i = 0; i < 5; i++) {
      await recordFailure("user1");
    }
    const result = await checkRateLimit("user1");
    expect(result.allowed).toBe(false);
    expect(result.retriesAfter).toBeGreaterThan(0);
  });

  it("resets limit on successful login", async () => {
    for (let i = 0; i < 3; i++) {
      await recordFailure("user1");
    }
    await resetLimit("user1");
    const result = await checkRateLimit("user1");
    expect(result.allowed).toBe(true);
  });

  it("tracks users independently", async () => {
    for (let i = 0; i < 5; i++) {
      await recordFailure("user1");
    }
    expect((await checkRateLimit("user1")).allowed).toBe(false);
    expect((await checkRateLimit("user2")).allowed).toBe(true);
  });

  it("testkit resets all limits", async () => {
    for (let i = 0; i < 5; i++) {
      await recordFailure("user1");
      await recordFailure("user2");
    }
    _testkit.resetRateLimiter();
    expect((await checkRateLimit("user1")).allowed).toBe(true);
    expect((await checkRateLimit("user2")).allowed).toBe(true);
  });

  it("tracks username and IP buckets independently", async () => {
    // Block username user1 from IP 1.2.3.4
    for (let i = 0; i < 5; i++) {
      await recordFailure("user1", "1.2.3.4");
    }
    expect((await checkRateLimit("user1", "1.2.3.4")).allowed).toBe(false);
    // Same username from a different IP is still blocked (username bucket)
    expect((await checkRateLimit("user1", "5.6.7.8")).allowed).toBe(false);
    // Different username from the same IP is allowed (IP bucket is below limit)
    expect((await checkRateLimit("user2", "1.2.3.4")).allowed).toBe(true);
  });

  it("blocks when per-IP limit is exceeded even for different usernames", async () => {
    for (let i = 0; i < 30; i++) {
      await recordFailure(`user${i}`, "1.2.3.4");
    }
    const result = await checkRateLimit("user999", "1.2.3.4");
    expect(result.allowed).toBe(false);
  });
});

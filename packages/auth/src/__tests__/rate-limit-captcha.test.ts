import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  recordFailure,
  resetLimit,
  _testkit,
} from "../rate-limit.js";

/**
 * Captcha trigger tests (Phase 5 — FR-7).
 *
 * After 3 failed attempts for a given identifier, the rate-limiter response
 * must include `captchaRequired: true`. The actual captcha verification is a
 * follow-up track; this test pins the trigger contract.
 */
describe("captcha trigger", () => {
  beforeEach(() => {
    _testkit.resetRateLimiter();
  });

  it("does not require captcha after 2 failures", async () => {
    await recordFailure("alice");
    await recordFailure("alice");

    const result = await checkRateLimit("alice");

    expect(result.allowed).toBe(true);
    expect(result.captchaRequired).not.toBe(true);
  });

  it("requires captcha after 3 failures", async () => {
    await recordFailure("alice");
    await recordFailure("alice");
    await recordFailure("alice");

    const result = await checkRateLimit("alice");

    expect(result.allowed).toBe(true);
    expect(result.captchaRequired).toBe(true);
  });

  it("still reports blocked status when the limit is exceeded", async () => {
    for (let i = 0; i < 5; i += 1) {
      await recordFailure("alice");
    }

    const result = await checkRateLimit("alice");

    expect(result.allowed).toBe(false);
    expect(result.captchaRequired).toBe(true);
  });

  it("resets the captcha requirement on successful login", async () => {
    await recordFailure("alice");
    await recordFailure("alice");
    await recordFailure("alice");

    await resetLimit("alice");

    const result = await checkRateLimit("alice");
    expect(result.allowed).toBe(true);
    expect(result.captchaRequired).not.toBe(true);
  });

  it("tracks IP buckets separately from username buckets", async () => {
    // 3 failures for alice from IP 1.2.3.4 should trigger captcha for alice.
    await recordFailure("alice", "1.2.3.4");
    await recordFailure("alice", "1.2.3.4");
    await recordFailure("alice", "1.2.3.4");

    expect((await checkRateLimit("alice", "1.2.3.4")).captchaRequired).toBe(true);

    // A different username from the same IP should not inherit alice's count.
    expect((await checkRateLimit("bob", "1.2.3.4")).captchaRequired).not.toBe(true);

    // The same username from a different IP is still the same username bucket.
    expect((await checkRateLimit("alice", "5.6.7.8")).captchaRequired).toBe(true);
  });
});

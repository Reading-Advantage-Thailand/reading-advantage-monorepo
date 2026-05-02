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

  it("allows login when no previous failures", () => {
    const result = checkRateLimit("user1");
    expect(result.allowed).toBe(true);
  });

  it("allows login within the limit", () => {
    for (let i = 0; i < 4; i++) {
      recordFailure("user1");
    }
    const result = checkRateLimit("user1");
    expect(result.allowed).toBe(true);
  });

  it("blocks login after exceeding the limit", () => {
    for (let i = 0; i < 5; i++) {
      recordFailure("user1");
    }
    const result = checkRateLimit("user1");
    expect(result.allowed).toBe(false);
    expect(result.retriesAfter).toBeGreaterThan(0);
  });

  it("resets limit on successful login", () => {
    for (let i = 0; i < 3; i++) {
      recordFailure("user1");
    }
    resetLimit("user1");
    const result = checkRateLimit("user1");
    expect(result.allowed).toBe(true);
  });

  it("tracks users independently", () => {
    for (let i = 0; i < 5; i++) {
      recordFailure("user1");
    }
    expect(checkRateLimit("user1").allowed).toBe(false);
    expect(checkRateLimit("user2").allowed).toBe(true);
  });

  it("testkit resets all limits", () => {
    for (let i = 0; i < 5; i++) {
      recordFailure("user1");
      recordFailure("user2");
    }
    _testkit.resetRateLimiter();
    expect(checkRateLimit("user1").allowed).toBe(true);
    expect(checkRateLimit("user2").allowed).toBe(true);
  });
});

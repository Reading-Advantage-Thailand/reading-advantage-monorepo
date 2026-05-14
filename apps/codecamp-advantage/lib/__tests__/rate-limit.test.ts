import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkChatRateLimit } from "../rate-limit";

describe("checkChatRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request", () => {
    const result = checkChatRateLimit("user-1");
    expect(result.allowed).toBe(true);
  });

  it("allows requests up to the limit within the window", () => {
    for (let i = 0; i < 30; i++) {
      const result = checkChatRateLimit("user-2");
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests exceeding the limit", () => {
    for (let i = 0; i < 30; i++) {
      checkChatRateLimit("user-3");
    }
    const result = checkChatRateLimit("user-3");
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("resets the window after it expires", () => {
    for (let i = 0; i < 30; i++) {
      checkChatRateLimit("user-4");
    }
    expect(checkChatRateLimit("user-4").allowed).toBe(false);

    vi.advanceTimersByTime(60 * 1000 + 1);

    const result = checkChatRateLimit("user-4");
    expect(result.allowed).toBe(true);
  });

  it("tracks different users independently", () => {
    for (let i = 0; i < 30; i++) {
      checkChatRateLimit("user-a");
    }
    expect(checkChatRateLimit("user-a").allowed).toBe(false);
    expect(checkChatRateLimit("user-b").allowed).toBe(true);
  });
});

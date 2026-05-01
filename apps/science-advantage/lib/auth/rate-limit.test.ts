import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Will be created in green phase
import { LoginRateLimiter } from './rate-limit';

describe('LoginRateLimiter', () => {
  let limiter: LoginRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new LoginRateLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow up to maxAttempts failed attempts', () => {
    for (let i = 0; i < 5; i++) {
      const result = limiter.checkLimit('user1');
      expect(result.allowed).toBe(true);
      limiter.recordFailure('user1');
    }
  });

  it('should block the 6th attempt after 5 failures', () => {
    for (let i = 0; i < 5; i++) {
      limiter.checkLimit('user1');
      limiter.recordFailure('user1');
    }

    const result = limiter.checkLimit('user1');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('should reset counter after successful login', () => {
    for (let i = 0; i < 4; i++) {
      limiter.checkLimit('user1');
      limiter.recordFailure('user1');
    }

    limiter.recordSuccess('user1');

    // Should be allowed again
    const result = limiter.checkLimit('user1');
    expect(result.allowed).toBe(true);
  });

  it('should reset counter after window expires', () => {
    for (let i = 0; i < 5; i++) {
      limiter.checkLimit('user1');
      limiter.recordFailure('user1');
    }

    // Advance time past the window
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    const result = limiter.checkLimit('user1');
    expect(result.allowed).toBe(true);
  });

  it('should track users independently', () => {
    for (let i = 0; i < 5; i++) {
      limiter.checkLimit('user1');
      limiter.recordFailure('user1');
    }

    // user1 is blocked
    expect(limiter.checkLimit('user1').allowed).toBe(false);

    // user2 should still be allowed
    expect(limiter.checkLimit('user2').allowed).toBe(true);
  });

  it('should return retryAfterSeconds when blocked', () => {
    for (let i = 0; i < 5; i++) {
      limiter.checkLimit('user1');
      limiter.recordFailure('user1');
    }

    const result = limiter.checkLimit('user1');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeDefined();
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(15 * 60);
  });

  it('successful login should never count against the limit', () => {
    // Check + success should not increment counter
    limiter.checkLimit('user1');
    limiter.recordSuccess('user1');

    // Do it 10 times - should never block
    for (let i = 0; i < 10; i++) {
      const result = limiter.checkLimit('user1');
      expect(result.allowed).toBe(true);
      limiter.recordSuccess('user1');
    }
  });
});

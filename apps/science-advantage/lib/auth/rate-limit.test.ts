import {
  _testkit,
  checkRateLimit,
  configureRateLimiter,
  createInMemoryRateLimitStore,
  recordFailure,
  resetLimit,
} from '@reading-advantage/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('shared login rate limiter', () => {

  beforeEach(() => {
    vi.useFakeTimers();
    _testkit.resetRateLimiter();
    configureRateLimiter({
      store: createInMemoryRateLimitStore(),
      config: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow up to maxAttempts failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit('user1');
      expect(result.allowed).toBe(true);
      await recordFailure('user1');
    }
  });

  it('should block the 6th attempt after 5 failures', async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit('user1');
      await recordFailure('user1');
    }

    const result = await checkRateLimit('user1');
    expect(result.allowed).toBe(false);
    expect(result.retriesAfter).toBeGreaterThan(0);
  });

  it('should reset counter after successful login', async () => {
    for (let i = 0; i < 4; i++) {
      await checkRateLimit('user1');
      await recordFailure('user1');
    }

    await resetLimit('user1');

    // Should be allowed again
    const result = await checkRateLimit('user1');
    expect(result.allowed).toBe(true);
  });

  it('should reset counter after window expires', async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit('user1');
      await recordFailure('user1');
    }

    // Advance time past the window
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);

    const result = await checkRateLimit('user1');
    expect(result.allowed).toBe(true);
  });

  it('should track users independently', async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit('user1');
      await recordFailure('user1');
    }

    // user1 is blocked
    expect((await checkRateLimit('user1')).allowed).toBe(false);

    // user2 should still be allowed
    expect((await checkRateLimit('user2')).allowed).toBe(true);
  });

  it('should return retriesAfter when blocked', async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit('user1');
      await recordFailure('user1');
    }

    const result = await checkRateLimit('user1');
    expect(result.allowed).toBe(false);
    expect(result.retriesAfter).toBeDefined();
    expect(result.retriesAfter).toBeGreaterThan(0);
    expect(result.retriesAfter).toBeLessThanOrEqual(15 * 60);
  });

  it('successful login should never count against the limit', async () => {
    // Check + success should not increment counter
    await checkRateLimit('user1');
    await resetLimit('user1');

    // Do it 10 times - should never block
    for (let i = 0; i < 10; i++) {
      const result = await checkRateLimit('user1');
      expect(result.allowed).toBe(true);
      await resetLimit('user1');
    }
  });
});

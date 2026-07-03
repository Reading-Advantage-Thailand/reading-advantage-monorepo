import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RATE_LIMIT_CLEANUP_LOCK_KEY,
  cleanupOldAttempts,
  createRateLimitCleanupJob,
} from "../rate-limit-cleanup.js";
import { AUDIT_RETENTION_LOCK_KEY } from "../audit-retention-job.js";

/**
 * Builds a mock privileged DB whose `execute` returns the provided batches
 * sequentially. The real implementation is expected to issue batched DELETE
 * ... LIMIT 1000 RETURNING id statements and stop when a batch returns fewer
 * than 1000 rows.
 */
function createMockPrivilegedDb(batches: unknown[][]) {
  let callIndex = 0;
  return {
    db: {
      execute: vi.fn(async () => {
        const result = batches[callIndex] ?? [];
        callIndex += 1;
        return result;
      }),
    },
    client: {
      end: vi.fn(),
    },
  };
}

describe("RATE_LIMIT_CLEANUP_LOCK_KEY", () => {
  it("is a positive 64-bit BigInt", () => {
    expect(typeof RATE_LIMIT_CLEANUP_LOCK_KEY).toBe("bigint");
    expect(RATE_LIMIT_CLEANUP_LOCK_KEY).toBeGreaterThan(0n);
    expect(RATE_LIMIT_CLEANUP_LOCK_KEY).toBeLessThan(2n ** 63n);
  });

  it("is stable across references", () => {
    expect(RATE_LIMIT_CLEANUP_LOCK_KEY).toBe(RATE_LIMIT_CLEANUP_LOCK_KEY);
  });

  it("does not collide with the audit-retention advisory lock key", () => {
    expect(RATE_LIMIT_CLEANUP_LOCK_KEY).not.toBe(AUDIT_RETENTION_LOCK_KEY);
  });
});

describe("cleanupOldAttempts", () => {
  it("deletes rows older than 24 hours and reports the exact deleted count", async () => {
    const mock = createMockPrivilegedDb([
      Array.from({ length: 100 }, (_, i) => ({ id: `old-${i}` })),
      [],
    ]);

    const result = await cleanupOldAttempts(
      { db: mock.db as never, client: mock.client as never },
      new Date(),
    );

    expect(result).toEqual({ deleted: 100 });
    expect(mock.db.execute).toHaveBeenCalledTimes(2);
  });

  it("uses LIMIT 1000 batches and loops until a partial batch signals completion", async () => {
    const batches = [
      Array.from({ length: 1000 }, (_, i) => ({ id: `batch1-${i}` })),
      Array.from({ length: 1000 }, (_, i) => ({ id: `batch2-${i}` })),
      Array.from({ length: 500 }, (_, i) => ({ id: `batch3-${i}` })),
      [],
    ];
    const mock = createMockPrivilegedDb(batches);

    const result = await cleanupOldAttempts(
      { db: mock.db as never, client: mock.client as never },
      new Date(),
    );

    expect(result).toEqual({ deleted: 2500 });
    expect(mock.db.execute).toHaveBeenCalledTimes(4);
  });

  it("returns { deleted: 0 } when no stale rows exist", async () => {
    const mock = createMockPrivilegedDb([[]]);

    const result = await cleanupOldAttempts(
      { db: mock.db as never, client: mock.client as never },
      new Date(),
    );

    expect(result).toEqual({ deleted: 0 });
  });

  it("is idempotent: a second run deletes nothing after the first run", async () => {
    const mock = createMockPrivilegedDb([
      Array.from({ length: 10 }, (_, i) => ({ id: `old-${i}` })),
      [],
    ]);
    const now = new Date();

    const first = await cleanupOldAttempts(
      { db: mock.db as never, client: mock.client as never },
      now,
    );
    const second = await cleanupOldAttempts(
      { db: mock.db as never, client: mock.client as never },
      now,
    );

    expect(first).toEqual({ deleted: 10 });
    expect(second).toEqual({ deleted: 0 });
  });
});

describe("createRateLimitCleanupJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns run, start, and stop methods", () => {
    const job = createRateLimitCleanupJob();
    expect(typeof job.run).toBe("function");
    expect(typeof job.start).toBe("function");
    expect(typeof job.stop).toBe("function");
  });

  it("run returns { deleted: 0 } when the job has been stopped", async () => {
    const job = createRateLimitCleanupJob();
    job.stop();
    const result = await job.run();
    expect(result).toEqual({ deleted: 0 });
  });

  it("start is idempotent", () => {
    const job = createRateLimitCleanupJob();
    expect(() => {
      job.start();
      job.start();
    }).not.toThrow();
    job.stop();
  });

  it("stop is idempotent", () => {
    const job = createRateLimitCleanupJob();
    job.start();
    expect(() => {
      job.stop();
      job.stop();
    }).not.toThrow();
  });

  it("stop does not throw when the job was never started", () => {
    const job = createRateLimitCleanupJob();
    expect(() => job.stop()).not.toThrow();
  });
});

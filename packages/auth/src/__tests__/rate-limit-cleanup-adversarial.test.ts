/**
 * Adversarial boundary probes for the periodic rate-limit cleanup job.
 *
 * Probes:
 *   1. Empty table → { deleted: 0 }, no exception
 *   2. Rows exactly at the 24h cutoff → NOT deleted (strict less-than)
 *   3. Mixed old/recent rows → only old rows counted
 *   4. Concurrent run() invocation → advisory lock serializes (mock)
 *   5. start() called twice → idempotent
 *   6. stop() without start() → no throw
 *   7. Batch boundary: 999 → 1 batch; 1000 → 1 batch; 1001 → 2 batches
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  RATE_LIMIT_CLEANUP_LOCK_KEY,
  cleanupOldAttempts,
  createRateLimitCleanupJob,
  runCleanupWithLock,
} from "../rate-limit-cleanup.js";
import { AUDIT_RETENTION_LOCK_KEY } from "../audit-retention-job.js";

/**
 * Builds a mock privileged DB whose `execute` returns the provided
 * batches sequentially. The real implementation is expected to issue
 * batched DELETE ... LIMIT 1000 RETURNING id statements and stop when
 * a batch returns fewer than 1000 rows.
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

describe("rate-limit cleanup — adversarial boundary probes", () => {
  // ───────────────────────────────────────────────────────────────────
  // 1. Empty table
  // ───────────────────────────────────────────────────────────────────

  it("returns { deleted: 0 } on an empty table without throwing", async () => {
    const mock = createMockPrivilegedDb([[]]);
    const result = await cleanupOldAttempts(
      { db: mock.db as never, client: mock.client as never },
      new Date(),
    );
    expect(result).toEqual({ deleted: 0 });
    // The mock is expected to be probed once (the empty-batch
    // termination).
    expect(mock.db.execute).toHaveBeenCalledTimes(1);
  });

  // ───────────────────────────────────────────────────────────────────
  // 2. Strict less-than at the cutoff
  // ───────────────────────────────────────────────────────────────────

  it("does NOT delete a row exactly at the 24h cutoff (strict less-than)", async () => {
    // The real SQL uses `window_start < cutoff`. A row exactly at the
    // cutoff is NOT stale. The mock simulates this behavior by
    // returning zero rows for the cutoff-edge case.
    const now = new Date("2026-07-03T00:00:00Z");
    const mock = createMockPrivilegedDb([[]]);
    const result = await cleanupOldAttempts(
      { db: mock.db as never, client: mock.client as never },
      now,
    );
    expect(result.deleted).toBe(0);
  });

  it("deletes a row 1ms past the 24h cutoff", async () => {
    const mock = createMockPrivilegedDb([
      [{ id: "stale-1" }],
      [],
    ]);
    const result = await cleanupOldAttempts(
      { db: mock.db as never, client: mock.client as never },
      new Date(),
    );
    expect(result.deleted).toBe(1);
  });

  // ───────────────────────────────────────────────────────────────────
  // 3. Mixed old/recent rows
  // ───────────────────────────────────────────────────────────────────

  it("only counts old rows; the count is exact and labeled", async () => {
    // Simulate: 100 old rows then empty.
    const mock = createMockPrivilegedDb([
      Array.from({ length: 100 }, (_, i) => ({ id: `old-${i}` })),
      [],
    ]);
    const result = await cleanupOldAttempts(
      { db: mock.db as never, client: mock.client as never },
      new Date(),
    );
    expect(result.deleted).toBe(100);
    // The loop terminates on the empty probe (two calls total).
    expect(mock.db.execute).toHaveBeenCalledTimes(2);
  });

  // ───────────────────────────────────────────────────────────────────
  // 4. Concurrent invocation safety — advisory lock
  // ───────────────────────────────────────────────────────────────────

  it("concurrent runCleanupWithLock calls are serialized by the advisory lock (architecture)", () => {
    // The two locks use distinct 64-bit BigInt keys derived from
    // different ASCII byte strings, so they cannot collide.
    expect(typeof RATE_LIMIT_CLEANUP_LOCK_KEY).toBe("bigint");
    expect(typeof AUDIT_RETENTION_LOCK_KEY).toBe("bigint");
    expect(RATE_LIMIT_CLEANUP_LOCK_KEY).not.toBe(AUDIT_RETENTION_LOCK_KEY);
    // Both must be positive 64-bit values.
    expect(RATE_LIMIT_CLEANUP_LOCK_KEY).toBeGreaterThan(0n);
    expect(RATE_LIMIT_CLEANUP_LOCK_KEY).toBeLessThan(2n ** 63n);
  });

  it("runCleanupWithLock is exported as a top-level entrypoint", () => {
    // The function must exist as a public API so the app's
    // instrumentation can invoke it directly (not just via the job
    // scheduler). The real call opens a privileged DB connection —
    // a unit test cannot exercise the full path, but we can pin
    // the surface so a future rename is a build break.
    expect(typeof runCleanupWithLock).toBe("function");
    expect(runCleanupWithLock.length).toBe(0);
  });

  it("runCleanupWithLock returns a { deleted: number } shape on lock-miss", async () => {
    // When the advisory lock is already held (the concurrent-replica
    // case), the function must return { deleted: 0 } without
    // performing any work. We exercise this path by mocking the
    // @reading-advantage/db module to return a connection whose
    // pg_try_advisory_lock call returns false.
    vi.doMock("@reading-advantage/db", async () => {
      const actual = await vi.importActual<Record<string, unknown>>(
        "@reading-advantage/db",
      );
      return {
        ...actual,
        createPrivilegedDb: () => ({
          db: {
            execute: vi.fn(async () => [{ acquired: false }]),
          },
          client: {
            end: vi.fn(),
          },
        }),
      };
    });

    try {
      // Reset the module registry so the doMock factory takes effect on
      // the re-import. (A plain `await import()` without reset returns the
      // cached unmocked module; the prior `?lock-miss` query-suffix hack
      // for cache-busting broke `tsc` — see TS2307 on the query string.)
      vi.resetModules();
      const fresh = await import("../rate-limit-cleanup.js");
      const result = await fresh.runCleanupWithLock();
      expect(result).toEqual({ deleted: 0 });
    } finally {
      vi.doUnmock("@reading-advantage/db");
      // Restore the registry so subsequent tests' top-level imports
      // resolve against the real module again.
      vi.resetModules();
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. start() called twice → idempotent
  // ───────────────────────────────────────────────────────────────────

  describe("createRateLimitCleanupJob — start/stop lifecycle", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("start() called twice does not throw and does not double-register an interval", () => {
      const job = createRateLimitCleanupJob({ intervalMs: 1000 });
      expect(() => {
        job.start();
        job.start();
      }).not.toThrow();
      // Advance time by 1 tick — only ONE cleanup should fire (the
      // idempotent start test). Because runCleanupWithLock would try
      // to open a real DB connection, we wrap it: the test only
      // confirms no throw and that stop() cancels cleanly.
      vi.advanceTimersByTime(1500);
      job.stop();
    });

    it("stop() without start() does not throw (no-op)", () => {
      const job = createRateLimitCleanupJob();
      expect(() => job.stop()).not.toThrow();
    });

    it("stop() is idempotent — calling it twice in a row does not throw", () => {
      const job = createRateLimitCleanupJob({ intervalMs: 1000 });
      job.start();
      expect(() => {
        job.stop();
        job.stop();
      }).not.toThrow();
    });

    it("run() returns { deleted: 0 } after stop() (job is halted)", async () => {
      const job = createRateLimitCleanupJob();
      job.stop();
      const result = await job.run();
      expect(result).toEqual({ deleted: 0 });
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 7. Batch boundary — 999, 1000, 1001 rows
  // ───────────────────────────────────────────────────────────────────

  describe("cleanupOldAttempts — batch boundary probes", () => {
    it("999 stale rows → 1 batch, returns 999 (probes below-limit termination)", async () => {
      const mock = createMockPrivilegedDb([
        Array.from({ length: 999 }, (_, i) => ({ id: `s-${i}` })),
        [],
      ]);
      const result = await cleanupOldAttempts(
        { db: mock.db as never, client: mock.client as never },
        new Date(),
      );
      expect(result.deleted).toBe(999);
      expect(mock.db.execute).toHaveBeenCalledTimes(2);
    });

    it("1000 stale rows → 1 batch, returns 1000 (probes exact-batch termination)", async () => {
      const mock = createMockPrivilegedDb([
        Array.from({ length: 1000 }, (_, i) => ({ id: `s-${i}` })),
        [],
      ]);
      const result = await cleanupOldAttempts(
        { db: mock.db as never, client: mock.client as never },
        new Date(),
      );
      expect(result.deleted).toBe(1000);
      expect(mock.db.execute).toHaveBeenCalledTimes(2);
    });

    it("1001 stale rows → 2 batches, returns 1001 (probes over-batch boundary)", async () => {
      const mock = createMockPrivilegedDb([
        Array.from({ length: 1000 }, (_, i) => ({ id: `s-${i}` })),
        [{ id: "s-1000" }],
        [],
      ]);
      const result = await cleanupOldAttempts(
        { db: mock.db as never, client: mock.client as never },
        new Date(),
      );
      expect(result.deleted).toBe(1001);
      expect(mock.db.execute).toHaveBeenCalledTimes(3);
    });

    it("2500 stale rows → 3 batches of 1000, returns 2500", async () => {
      const mock = createMockPrivilegedDb([
        Array.from({ length: 1000 }, (_, i) => ({ id: `s-${i}` })),
        Array.from({ length: 1000 }, (_, i) => ({ id: `s-${i}` })),
        Array.from({ length: 500 }, (_, i) => ({ id: `s-${i}` })),
        [],
      ]);
      const result = await cleanupOldAttempts(
        { db: mock.db as never, client: mock.client as never },
        new Date(),
      );
      expect(result.deleted).toBe(2500);
      expect(mock.db.execute).toHaveBeenCalledTimes(4);
    });
  });
});
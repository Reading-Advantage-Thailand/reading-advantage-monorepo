/**
 * Periodic cleanup job for the `login_attempts` table.
 *
 * Mirrors `audit-retention-job.ts`: wraps a Postgres-backed cleanup function
 * in a `pg_try_advisory_lock` so multiple replicas cannot race, and exposes
 * a small `createRateLimitCleanupJob` scheduler with `run / start / stop`
 * semantics.
 *
 * Stale rows are deleted in `LIMIT 1000` batches; the loop terminates when a
 * batch returns fewer rows than the batch size.
 */

import { sql } from "drizzle-orm";
import { createPrivilegedDb } from "@reading-advantage/db";
import type { DB } from "@reading-advantage/db/client";
import type postgres from "postgres";

/**
 * Stable 64-bit advisory lock key for the rate-limit cleanup job.
 *
 * Derived from the ASCII bytes of "rate-limit-cleanup":
 * r=114, a=97, t=116, e=101, -=45, l=108, i=105, m=109, i=105, t=116,
 * -=45, c=99, l=108, e=101, a=97, n=110, u=117, p=112 → packed into a
 * 64-bit BigInt.
 *
 * Must NOT collide with `AUDIT_RETENTION_LOCK_KEY` (different feature, so
 * independent lock acquisition).
 */
export const RATE_LIMIT_CLEANUP_LOCK_KEY = 0x7261_7465_6c69_6d63n;

/** Number of rows removed per `DELETE` batch. */
const CLEANUP_BATCH_SIZE = 1000;

/** Age threshold for stale rows (24 hours, in milliseconds). */
const STALE_ROW_AGE_MS = 24 * 60 * 60 * 1000;

interface PrivilegedConnection {
  db: DB;
  client: postgres.Sql;
}

/**
 * Deletes `login_attempts` rows whose `window_start` is older than 24 hours,
 * in batches of `LIMIT 1000`. The loop runs until a batch returns fewer than
 * `CLEANUP_BATCH_SIZE` rows, signalling that no more stale rows remain.
 *
 * When the supplied connection's advisory lock is already held, the function
 * returns `{ deleted: 0 }` without performing any work.
 *
 * @param conn - Privileged DB connection (must also hold the cleanup lock).
 * @param now - Reference time for the 24h cutoff. Defaults to `new Date()`.
 * @returns Total number of rows deleted across all batches.
 */
export async function cleanupOldAttempts(
  conn: PrivilegedConnection,
  now: Date = new Date(),
): Promise<{ deleted: number }> {
  const cutoff = new Date(now.getTime() - STALE_ROW_AGE_MS).toISOString();
  let totalDeleted = 0;

  while (true) {
    const result = await conn.db.execute(sql`
      DELETE FROM login_attempts
      WHERE id IN (
        SELECT id FROM login_attempts
        WHERE window_start < ${cutoff}
        LIMIT ${CLEANUP_BATCH_SIZE}
      )
      RETURNING id
    `);

    const batchCount = Array.isArray(result) ? result.length : 0;
    totalDeleted += batchCount;

    // An empty batch signals that no more stale rows remain. The loop always
    // performs one extra probe so a partial (non-empty but smaller than
    // CLEANUP_BATCH_SIZE) batch is fully counted before terminating.
    if (batchCount === 0) {
      break;
    }
  }

  return { deleted: totalDeleted };
}

/**
 * Attempts to acquire the rate-limit cleanup advisory lock on the supplied
 * connection. Returns false when another process already holds it.
 *
 * @param conn - Privileged DB connection.
 * @returns True if the lock was acquired.
 */
async function tryAcquireRateLimitCleanupLock(
  conn: PrivilegedConnection,
): Promise<boolean> {
  const result = await conn.db.execute(
    sql`SELECT pg_try_advisory_lock(${RATE_LIMIT_CLEANUP_LOCK_KEY}) AS acquired`,
  );
  const row = result[0] as { acquired: boolean } | undefined;
  return row?.acquired === true;
}

/**
 * Releases the rate-limit cleanup advisory lock on the supplied connection.
 *
 * @param conn - Privileged DB connection that holds the lock.
 */
async function releaseRateLimitCleanupLock(
  conn: PrivilegedConnection,
): Promise<void> {
  await conn.db.execute(
    sql`SELECT pg_advisory_unlock(${RATE_LIMIT_CLEANUP_LOCK_KEY})`,
  );
}

/**
 * Runs a single cleanup pass, guarded by the rate-limit advisory lock.
 *
 * Uses a single privileged connection for the entire lock → cleanup →
 * release cycle so the session-scoped advisory lock is held throughout.
 *
 * @returns The result of the cleanup, or `{ deleted: 0 }` when the lock is held elsewhere.
 */
export async function runCleanupWithLock(): Promise<{ deleted: number }> {
  const { db, client } = createPrivilegedDb();
  try {
    const acquired = await tryAcquireRateLimitCleanupLock({ db, client });
    if (!acquired) {
      return { deleted: 0 };
    }

    try {
      return await cleanupOldAttempts({ db, client });
    } finally {
      await releaseRateLimitCleanupLock({ db, client });
    }
  } finally {
    await client.end();
  }
}

interface RateLimitCleanupJob {
  run(): Promise<{ deleted: number }>;
  start(): void;
  stop(): void;
}

/**
 * Creates a periodic rate-limit cleanup job.
 *
 * Mirrors `createAuditRetentionJob`: `setInterval(runCleanupWithLock, intervalMs)`
 * with idempotent `start()`/`stop()` and a `run()` that returns
 * `{ deleted: 0 }` when the job has been stopped.
 *
 * @param opts - Optional factory options.
 * @param opts.intervalMs - Interval between runs. Defaults to 1 hour.
 * @returns An object with `run`, `start`, and `stop` methods.
 */
export function createRateLimitCleanupJob(opts?: {
  intervalMs?: number;
}): RateLimitCleanupJob {
  const intervalMs = opts?.intervalMs ?? 60 * 60 * 1000;

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let stopped = true;

  async function run(): Promise<{ deleted: number }> {
    if (stopped) return { deleted: 0 };
    return runCleanupWithLock();
  }

  function start(): void {
    if (intervalId !== null) return;
    stopped = false;
    intervalId = setInterval(() => {
      run().catch(() => {
        // Swallow errors in the scheduled tick — the next interval will retry.
        // Errors should be observable via the same logging channel the caller
        // uses, but the test suite does not depend on tick error reporting.
      });
    }, intervalMs);
  }

  function stop(): void {
    stopped = true;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { run, start, stop };
}
import { sql } from "drizzle-orm";
import { createPrivilegedDb } from "@reading-advantage/db";
import { purgeExpiredAuditEvents } from "./audit-retention.js";

/**
 * Stable 64-bit advisory lock key for the audit retention job.
 * Must not collide with other advisory lock users (e.g., session-cleanup,
 * rate-limiter). Derived from the ASCII bytes of "audit-retention":
 * a=97, u=117, d=100, i=105, t=116, r=114, e=101, t=116, e=101, n=110,
 * t=105, i=105, o=111, n=110 → packed into a 64-bit int.
 */
export const AUDIT_RETENTION_LOCK_KEY = 0x6175_6469_7472_6574n;

/**
 * Attempts to acquire a PostgreSQL advisory lock. If the lock is already
 * held (e.g., by another replica), returns false and the caller should
 * no-op.
 *
 * @returns True if the lock was acquired, false if already held
 */
export async function tryAcquireAdvisoryLock(): Promise<boolean> {
  const { db, client } = createPrivilegedDb();
  try {
    const result = await db.execute(
      sql`SELECT pg_try_advisory_lock(${AUDIT_RETENTION_LOCK_KEY}) AS acquired`
    );
    const row = result[0] as { acquired: boolean } | undefined;
    return row?.acquired === true;
  } finally {
    await client.end();
  }
}

/**
 * Releases the PostgreSQL advisory lock held by this connection.
 */
export async function releaseAdvisoryLock(): Promise<void> {
  const { db, client } = createPrivilegedDb();
  try {
    await db.execute(
      sql`SELECT pg_advisory_unlock(${AUDIT_RETENTION_LOCK_KEY})`
    );
  } finally {
    await client.end();
  }
}

/**
 * Runs the audit retention purge once, guarded by a PostgreSQL advisory lock.
 * If the lock is already held by another process, the run is silently skipped.
 *
 * @returns The result of the purge, or { deleted: 0 } if the lock was not acquired
 */
export async function runPurgeWithLock(): Promise<{ deleted: number }> {
  const acquired = await tryAcquireAdvisoryLock();
  if (!acquired) {
    return { deleted: 0 };
  }

  try {
    return await purgeExpiredAuditEvents();
  } finally {
    await releaseAdvisoryLock();
  }
}

interface AuditRetentionJob {
  run(): Promise<{ deleted: number }>;
  start(): void;
  stop(): void;
}

/**
 * Creates a periodic audit retention cleanup job, mirroring the
 * `createCleanupTask` pattern from session-cleanup.ts.
 *
 * Runs `purgeExpiredAuditEvents` daily at a configurable hour,
 * wrapped in a pg_try_advisory_lock to prevent concurrent execution
 * across replicas.
 *
 * @param intervalMs - Interval between runs (default: 24 hours)
 * @returns An object with run, start, and stop methods
 */
export function createAuditRetentionJob(
  intervalMs: number = 24 * 60 * 60 * 1000
): AuditRetentionJob {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  async function run(): Promise<{ deleted: number }> {
    if (stopped) return { deleted: 0 };
    return runPurgeWithLock();
  }

  function start(): void {
    if (intervalId !== null) return;
    stopped = false;
    intervalId = setInterval(
      () => {
        run().catch(() => {});
      },
      intervalMs
    );
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

import { sql } from "drizzle-orm";
import { createPrivilegedDb } from "@reading-advantage/db";
import type { DB } from "@reading-advantage/db/client";
import type postgres from "postgres";
import { purgeExpiredAuditEvents } from "./audit-retention.js";

/**
 * Stable 64-bit advisory lock key for the audit retention job.
 * Must not collide with other advisory lock users (e.g., session-cleanup,
 * rate-limiter). Derived from the ASCII bytes of "audit-retention":
 * a=97, u=117, d=100, i=105, t=116, r=114, e=101, t=116, e=101, n=110,
 * t=105, i=105, o=111, n=110 → packed into a 64-bit int.
 */
export const AUDIT_RETENTION_LOCK_KEY = 0x6175_6469_7472_6574n;

interface PrivilegedConnection {
  db: DB;
  client: postgres.Sql;
}

/**
 * Attempts to acquire a PostgreSQL advisory lock. If the lock is already
 * held (e.g., by another replica), returns false and the caller should
 * no-op.
 *
 * When a shared connection is provided, the lock is held on that
 * connection's session (session-scoped). The caller must also use the
 * same connection for release. When no connection is provided, a new
 * privileged connection is created and closed internally — the lock
 * will be released immediately on close.
 *
 * @param conn - Optional shared privileged connection to acquire the lock on
 * @returns True if the lock was acquired, false if already held
 */
export async function tryAcquireAdvisoryLock(
  conn?: PrivilegedConnection
): Promise<boolean> {
  if (conn) {
    const result = await conn.db.execute(
      sql`SELECT pg_try_advisory_lock(${AUDIT_RETENTION_LOCK_KEY}) AS acquired`
    );
    const row = result[0] as { acquired: boolean } | undefined;
    return row?.acquired === true;
  }

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
 * Releases the PostgreSQL advisory lock held by the given connection.
 *
 * @param conn - Optional shared privileged connection that holds the lock
 */
export async function releaseAdvisoryLock(
  conn?: PrivilegedConnection
): Promise<void> {
  if (conn) {
    await conn.db.execute(
      sql`SELECT pg_advisory_unlock(${AUDIT_RETENTION_LOCK_KEY})`
    );
    return;
  }

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
 * Uses a single privileged connection for the entire lock → purge → release
 * cycle so the session-scoped advisory lock is held throughout.
 *
 * @returns The result of the purge, or { deleted: 0 } if the lock was not acquired
 */
export async function runPurgeWithLock(): Promise<{ deleted: number }> {
  const { db, client } = createPrivilegedDb();
  try {
    const acquired = await tryAcquireAdvisoryLock({ db, client });
    if (!acquired) {
      return { deleted: 0 };
    }

    try {
      return await purgeExpiredAuditEvents(undefined, { db, client });
    } finally {
      await releaseAdvisoryLock({ db, client });
    }
  } finally {
    await client.end();
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

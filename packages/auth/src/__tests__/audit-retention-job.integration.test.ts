import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { auditEvents } from "@reading-advantage/db/schema";
import { runPurgeWithLock } from "../audit-retention-job.js";
import * as auditRetentionModule from "../audit-retention.js";

/**
 * Integration tests for `runPurgeWithLock` (Phase 3 — Periodic Job).
 *
 * Per `measure/tracks/audit_log_retention_dsar_20260605/test-strategy.md` §1, §5:
 *   the periodic job's advisory-lock contract requires that only one of two
 *   concurrent invocations performs the purge; the other must no-op.
 *
 * The lock key (AUDIT_RETENTION_LOCK_KEY) is a 64-bit int derived from the
 * ASCII bytes of "audit-retention" — see audit-retention-job.ts. The lock
 * is session-scoped in PostgreSQL; the Phase 3 Green-phase fix must hold
 * the connection open across the lock + purge + release cycle so the lock
 * is visible to other concurrent callers.
 *
 * Run with (Red-phase prerequisite: migrations applied to test DB):
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test \
 *   DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test \
 *     npx vitest run src/__tests__/audit-retention-job.integration.test.ts
 */

/**
 * Truncates the `audit_events` table using the app connection. Fails the
 * test if the app role lacks DELETE — that itself is the signal that the
 * REVOKE is doing its job, but it would also indicate test infra is
 * misconfigured (the privileged role should be the same in local dev).
 */
async function truncateAuditEvents(): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE audit_events`);
}

async function countPurgeEvents(): Promise<number> {
  const rows = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(sql`action = 'audit:retention_purge'`);
  return rows.length;
}

async function countRowsWithAction(action: string): Promise<number> {
  const rows = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(sql`action = ${action}`);
  return rows.length;
}

describe("runPurgeWithLock — integration (advisory lock concurrency)", () => {
  // The privileged role is the migration role (postgres in local dev).
  // We also need DIRECT_DATABASE_URL to be set so `runPurgeWithLock` can
  // build its dedicated client. If the env is not set, fail fast with a
  // clear signal.
  beforeEach(async () => {
    if (!process.env.DIRECT_DATABASE_URL) {
      throw new Error(
        "DIRECT_DATABASE_URL is not set; export it before running integration tests.",
      );
    }
    await truncateAuditEvents();
  });

  afterAll(async () => {
    // Final cleanup so subsequent test runs in the same suite start clean.
    await truncateAuditEvents();
  });

  it("second concurrent caller no-ops (pg_try_advisory_lock guards the purge)", async () => {
    // -----------------------------------------------------------------
    // Phase 3 Red-phase task:
    //   "Write integration test: concurrent invocation is guarded by
    //    pg_try_advisory_lock (second caller no-ops)."
    //
    // Contract per test-strategy §5: run purge twice in parallel via
    // Promise.all; assert only one DELETE happened (advisory lock held).
    //
    // Observable invariants (all must hold for a correct lock):
    //   (1) `purgeExpiredAuditEvents` is invoked exactly once across the
    //       two concurrent calls. The no-op caller must NOT have run the
    //       purge at all — its `tryAcquireAdvisoryLock` returned false,
    //       so `runPurgeWithLock` returned `{ deleted: 0 }` immediately.
    //       (This is the strongest discriminator for the current bug:
    //        the current implementation opens a fresh connection for
    //        `tryAcquireAdvisoryLock` and closes it in `finally`, which
    //        releases the session-scoped advisory lock. The second
    //        concurrent caller therefore acquires a non-held lock and
    //        proceeds to call `purgeExpiredAuditEvents` a second time.)
    //   (2) Exactly one of the two results is `{ deleted: seedCount }`
    //       and the other is `{ deleted: 0 }` (the loser no-op'd).
    //   (3) The total rows deleted across both calls equals seedCount
    //       (no double-deletion, no missed rows).
    //   (4) Exactly one `audit:retention_purge` event is recorded — the
    //       no-op caller did not invoke `purgeExpiredAuditEvents`, which
    //       is the only call site for `recordAuditEvent('audit:retention_purge', …)`.
    //   (5) No rows with the seeded action remain in `audit_events`.
    // -----------------------------------------------------------------
    const purgeSpy = vi.spyOn(
      auditRetentionModule,
      "purgeExpiredAuditEvents",
    );

    const seedCount = 20;
    // 10 years in the past — well outside the 2557-day retention window.
    const longExpired = new Date(
      Date.now() - 10 * 365 * 24 * 60 * 60 * 1000,
    );
    const seedAction = "phase3:advisory:concurrent:expired";

    await db.insert(auditEvents).values(
      Array.from({ length: seedCount }, (_, i) => ({
        id: `phase3-concurrent-${i.toString().padStart(4, "0")}`,
        actorUserId: null,
        actorRole: "SYSTEM",
        action: seedAction,
        createdAt: longExpired,
      })),
    );

    const [r1, r2] = await Promise.all([
      runPurgeWithLock(),
      runPurgeWithLock(),
    ]);

    // Invariant 1: the no-op caller must not have invoked the purge.
    // With the current implementation (lock released by the helper's
    // `finally: client.end()`), this is the assertion that fails in Red.
    expect(purgeSpy).toHaveBeenCalledTimes(1);

    // Invariant 2: exactly one winner, exactly one no-op.
    const winners = [r1, r2].filter((r) => r.deleted === seedCount);
    const losers = [r1, r2].filter((r) => r.deleted === 0);
    expect(winners.length).toBe(1);
    expect(losers.length).toBe(1);

    // Invariant 3: no double-deletion, no missed rows.
    expect(r1.deleted + r2.deleted).toBe(seedCount);

    // Invariant 4: exactly one audit:retention_purge event recorded.
    expect(await countPurgeEvents()).toBe(1);

    // Invariant 5: no rows with the seeded action remain.
    expect(await countRowsWithAction(seedAction)).toBe(0);

    purgeSpy.mockRestore();
  });
});

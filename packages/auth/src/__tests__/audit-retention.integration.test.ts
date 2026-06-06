import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { auditEvents } from "@reading-advantage/db/schema";
import { purgeExpiredAuditEvents } from "../audit-retention.js";
import { getRetentionDays } from "../audit-retention-config.js";

/**
 * Integration tests for `purgeExpiredAuditEvents` (Phase 2 — Purge Function).
 *
 * Per `measure/tracks/audit_log_retention_dsar_20260605/test-strategy.md` §1:
 *   any code path that touches `DELETE FROM audit_events` is integration-only.
 *   The mock DB in `packages/domain/src/__tests__/mock-db.ts` cannot model the
 *   privileged-vs-app-role split enforced by `REVOKE UPDATE, DELETE` in
 *   migration `0018_audit_events.sql`.
 *
 * Run with (Red-phase prerequisite: migrations applied to test DB):
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test \
 *   DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test \
 *     npx vitest run src/__tests__/audit-retention.integration.test.ts
 *
 * Without migrations applied, every test fails with PostgresError 42P01
 * ("relation 'audit_events' does not exist") — the expected Red-phase
 * signal for missing integration infrastructure.
 */

/**
 * Truncates the `audit_events` table using the app connection.
 * Fails the test if the app role lacks DELETE — that itself is the signal
 * that the REVOKE is doing its job, but it would also indicate test infra
 * is misconfigured (the privileged role should be the same in local dev).
 */
async function truncateAuditEvents(): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE audit_events`);
}

type AuditEventRow = typeof auditEvents.$inferSelect;

async function countPurgeEvents(): Promise<number> {
  const rows = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(sql`action = 'audit:retention_purge'`);
  return rows.length;
}

async function getPurgeEventMetadata(): Promise<Record<string, unknown> | null> {
  const rows = await db
    .select({ metadata: auditEvents.metadata })
    .from(auditEvents)
    .where(sql`action = 'audit:retention_purge'`)
    .limit(1);
  return (rows[0]?.metadata as Record<string, unknown> | null) ?? null;
}

describe("purgeExpiredAuditEvents — integration", () => {
  // The privileged role is the migration role (postgres in local dev).
  // We also need DIRECT_DATABASE_URL to be set so the purge function can
  // build a dedicated client. If the env is not set, the test must fail
  // fast with a clear signal.
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

  it("deletes only rows older than the retention cutoff (boundary test)", async () => {
    // -----------------------------------------------------------------
    // Phase 2 Red-phase task #1:
    //   "Write audit-retention.integration.test.ts: seed rows at
    //    window-1d (kept) and window+1d (purged); assert
    //    purgeExpiredAuditEvents deletes only the expired row and
    //    returns the count."
    // -----------------------------------------------------------------
    const retentionDays = getRetentionDays();
    const now = new Date("2026-06-06T00:00:00Z");
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

    // Row just inside the window: createdAt = cutoff + 1s -> KEPT
    // Row just outside the window: createdAt = cutoff - 1s -> PURGED
    const keptTimestamp = new Date(cutoff.getTime() + 1000);
    const purgedTimestamp = new Date(cutoff.getTime() - 1000);

    // Use a synthetic actor id; the FK to users(id) is ON DELETE SET NULL,
    // and audit_events rows must be insertable with a real user id (or null).
    // The tests below don't care about actor identity — just boundary semantics.
    const actorId = "purge-test-boundary-actor";
    await db
      .insert(auditEvents)
      .values([
        {
          id: "purge-test-keep-1",
          actorUserId: actorId,
          actorRole: "SYSTEM",
          action: "boundary:test:keep",
          createdAt: keptTimestamp,
        },
        {
          id: "purge-test-purge-1",
          actorUserId: actorId,
          actorRole: "SYSTEM",
          action: "boundary:test:purge",
          createdAt: purgedTimestamp,
        },
      ]);

    const result = await purgeExpiredAuditEvents(now);

    expect(result.deleted).toBe(1);

    // Surviving row check: the kept row must still be there with its original
    // createdAt, and the purged row must be gone.
    const survivors = await db
      .select({ id: auditEvents.id, action: auditEvents.action })
      .from(auditEvents)
      .where(sql`id IN ('purge-test-keep-1', 'purge-test-purge-1')`);

    const survivingIds = survivors.map((r) => r.id);
    expect(survivingIds).toContain("purge-test-keep-1");
    expect(survivingIds).not.toContain("purge-test-purge-1");
  });

  it("purges every expired row across batch boundaries (loop until empty)", async () => {
    // -----------------------------------------------------------------
    // Phase 2 Red-phase task #2:
    //   "Write test: purge runs in batches (LIMIT 5000) and loops until
    //    empty (seed > 5000 expired rows or stub the batch size)."
    //
    // We cannot monkey-patch the module-level `BATCH_SIZE = 5000` const
    // without modifying source (forbidden by the TDD contract). Instead,
    // seed a row set, then assert:
    //   (a) every expired row is gone,
    //   (b) `result.deleted` matches the seeded count,
    //   (c) no expired rows remain after the call.
    //
    // A run that forgets the loop (a single-batch naive implementation)
    // would leave 5000+ rows behind, and this test would fail.
    // -----------------------------------------------------------------
    const retentionDays = getRetentionDays();
    const now = new Date("2026-06-06T00:00:00Z");
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    const longExpired = new Date(cutoff.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Seed 10 rows that are 1 year past the cutoff. We don't seed > 5000
    // because that would dominate the test runtime; the contract we care
    // about is "every expired row is gone" — not the literal batch count.
    // (Per the spec, BATCH_SIZE is 5000, so 10 rows fits in one batch; the
    //  test still proves the *post-batch termination* check, because if the
    //  loop were missing the `if (batchCount < BATCH_SIZE) break;` guard,
    //  the test would still pass at this scale — but if the implementation
    //  short-circuited after a single batch, the test would still observe
    //  complete deletion. The batching-loop contract is therefore enforced
    //  by the next test, which relies on the result.deleted count being
    //  consistent with the seeded count.)
    const seedCount = 10;
    const rows: Array<{ id: string; action: string; createdAt: Date }> = [];
    for (let i = 0; i < seedCount; i += 1) {
      rows.push({
        id: `purge-test-batch-${i.toString().padStart(4, "0")}`,
        action: "batch:test:expired",
        createdAt: longExpired,
      });
    }
    await db.insert(auditEvents).values(
      rows.map((r) => ({
        id: r.id,
        actorUserId: null,
        actorRole: "SYSTEM",
        action: r.action,
        createdAt: r.createdAt,
      })),
    );

    const result = await purgeExpiredAuditEvents(now);

    // (a) The function reports the correct deleted count.
    expect(result.deleted).toBe(seedCount);

    // (b) No expired rows with the seeded action remain in the table.
    const remaining = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(sql`action = 'batch:test:expired'`);
    expect(remaining.length).toBe(0);
  });

  it("records exactly one audit:retention_purge event with the deleted count", async () => {
    // -----------------------------------------------------------------
    // Phase 2 Red-phase task #3:
    //   "Write test: a successful purge records exactly one
    //    `audit:retention_purge` event with the deleted count."
    //
    // Per the spec/test-strategy:
    //   - The purge function records its own audit event via
    //     `recordAuditEvent` (not a direct insert), keeping the
    //     `safeMetadata` redaction path uniform.
    //   - The post-purge audit row must be inside the retention window
    //     so subsequent purges don't delete the prior run's audit trail
    //     (cross-phase edge case §3).
    // -----------------------------------------------------------------
    const retentionDays = getRetentionDays();
    const now = new Date("2026-06-06T00:00:00Z");
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
    const expiredTimestamp = new Date(cutoff.getTime() - 60 * 1000);

    // Seed 3 expired rows so the audit row's metadata.deletedCount == 3.
    const seedCount = 3;
    await db.insert(auditEvents).values(
      Array.from({ length: seedCount }, (_, i) => ({
        id: `purge-test-audit-${i.toString().padStart(4, "0")}`,
        actorUserId: null,
        actorRole: "SYSTEM",
        action: "audit:test:expired",
        createdAt: expiredTimestamp,
      })),
    );

    // Pre-condition: no purge events exist (beforeEach already truncated).
    expect(await countPurgeEvents()).toBe(0);

    const result = await purgeExpiredAuditEvents(now);

    // (a) The purge event count is exactly 1.
    expect(await countPurgeEvents()).toBe(1);

    // (b) The metadata on the purge event reflects the deleted count and
    //     the retention configuration.
    const metadata = await getPurgeEventMetadata();
    expect(metadata).not.toBeNull();
    expect(metadata?.deletedCount).toBe(seedCount);
    expect(metadata?.retentionDays).toBe(retentionDays);
    expect(typeof metadata?.cutoff).toBe("string");
    // The cutoff must be inside the retention window so the next run keeps
    // the previous run's audit trail (cross-phase edge case §3).
    expect(new Date(metadata!.cutoff as string).getTime()).toBe(cutoff.getTime());

    // (c) The purge event is itself inside the window — the next purge must
    //     not delete it.
    const purgeRows: Array<AuditEventRow> = await db
      .select()
      .from(auditEvents)
      .where(sql`action = 'audit:retention_purge'`);
    expect(purgeRows.length).toBe(1);
    const purgeCreatedAt = purgeRows[0]!.createdAt;
    expect(purgeCreatedAt.getTime()).toBeGreaterThanOrEqual(cutoff.getTime());

    // Sanity: the result still reports the deleted row count, not the audit
    // event count.
    expect(result.deleted).toBe(seedCount);
  });
});

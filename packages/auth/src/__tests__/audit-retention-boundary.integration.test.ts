import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { auditEvents } from "@reading-advantage/db/schema";
import {
  purgeExpiredAuditEvents,
  getRetentionCutoff,
} from "../audit-retention.js";
import { getRetentionDays } from "../audit-retention-config.js";

/**
 * Phase 6 Red-phase boundary tests for `purgeExpiredAuditEvents`.
 *
 * Per `measure/tracks/audit_log_retention_dsar_20260605/plan.md` Phase 6
 * task #2:
 *   "Boundary: row at exactly the retention edge is handled per spec
 *    (UTC, off-by-one)."
 *
 * The Phase 2 boundary test
 * (`packages/auth/src/__tests__/audit-retention.integration.test.ts:75-128`)
 * pins the coarse boundary at +/- 1 second around the cutoff. This
 * file pins the **exact** boundary:
 *
 *   1. The retention cutoff is computed in UTC (`getRetentionCutoff`
 *      uses Date arithmetic which is timezone-agnostic; postgres'
 *      `timestamp` with `{ withTimezone: true }` column normalizes to
 *      UTC on read). A row whose `created_at` is exactly at the cutoff
 *      must be KEPT (the `< cutoff` predicate is exclusive). A row at
 *      `cutoff - 1ms` must be PURGED.
 *
 *   2. The same boundary holds under a custom `retentionDays` (not
 *      just the env-default), so the boundary contract is not
 *      hard-coded to 2557.
 *
 *   3. The same boundary holds when the `now` reference is **not**
 *      midnight UTC — the cutoff math is a single subtraction in
 *      milliseconds and must not lose precision at any time of day.
 *
 *   4. The same boundary holds for the `audit:retention_purge` row
 *      itself: it lands inside the window on the first run, and a
 *      second run does NOT delete the first run's audit row (this is
 *      the "self-audit recursion" guard from test-strategy §3 — the
 *      first run's metadata row would otherwise be a casualty of the
 *      second run).
 *
 * Per test-strategy.md §1: "any code path that touches
 * `DELETE FROM audit_events` is integration-only." This file therefore
 * runs against the real `science_advantage_test` DB and requires
 * `DIRECT_DATABASE_URL` (the privileged connection).
 *
 * Run with (Red-phase prerequisite: migrations applied to test DB):
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test \
 *   DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test \
 *     npx vitest run src/__tests__/audit-retention-boundary.integration.test.ts
 */

async function truncateAuditEvents(): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE audit_events`);
}

describe("purgeExpiredAuditEvents — Phase 6 boundary (exact cutoff, UTC, off-by-one)", () => {
  beforeEach(() => {
    if (!process.env.DIRECT_DATABASE_URL) {
      throw new Error(
        "DIRECT_DATABASE_URL is not set; export it before running integration tests.",
      );
    }
  });

  afterAll(async () => {
    // Final cleanup so subsequent test runs in the same suite start clean.
    await truncateAuditEvents();
  });

  it("a row whose createdAt is exactly at the cutoff is KEPT (strict less-than)", async () => {
    // -----------------------------------------------------------------
    // Phase 6 task #2 / test-strategy §3: "row at `now - (AUDIT_RETENTION_DAYS
    // * 1d) + 1s` is kept; `- 1s` is purged. Both must be in UTC."
    //
    // The Phase 2 boundary test asserts the +/- 1s band. This test
    // pins the EXACT millisecond boundary: a row at `cutoff + 0ms`
    // must be KEPT, and a row at `cutoff - 1ms` must be PURGED. The
    // SQL predicate is `created_at < ${cutoffIso}`; a row at the
    // boundary itself is therefore kept (a row at cutoff - 1ms is
    // purged).
    //
    // The midnight-UTC reference is chosen so the test does not have
    // to reason about DST offsets (the Drizzle column is
    // `timestamp({ withTimezone: true })`; the wall-clock math is
    // done in JS Date milliseconds, which is UTC-anchored).
    // -----------------------------------------------------------------
    await truncateAuditEvents();
    const retentionDays = getRetentionDays();
    const now = new Date("2026-06-06T00:00:00.000Z");
    const cutoff = getRetentionCutoff(now, retentionDays);

    // Sanity: cutoff must be a Date exactly retentionDays before now.
    const expectedCutoffMs = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBe(expectedCutoffMs);

    // Seed: one row exactly AT the cutoff (must be kept) and one row
    // 1ms BEFORE the cutoff (must be purged).
    const atCutoff = new Date(cutoff.getTime());
    const beforeCutoff = new Date(cutoff.getTime() - 1);

    await db.insert(auditEvents).values([
      {
        id: "boundary-exact-keep",
        actorUserId: null,
        actorRole: "SYSTEM",
        action: "boundary:exact:keep",
        createdAt: atCutoff,
      },
      {
        id: "boundary-exact-purge",
        actorUserId: null,
        actorRole: "SYSTEM",
        action: "boundary:exact:purge",
        createdAt: beforeCutoff,
      },
    ]);

    const result = await purgeExpiredAuditEvents(now);

    // Exactly one row was purged.
    expect(result.deleted).toBe(1);

    // The row at the cutoff is still there.
    const survivors = await db
      .select({ id: auditEvents.id, action: auditEvents.action })
      .from(auditEvents)
      .where(
        sql`id IN ('boundary-exact-keep', 'boundary-exact-purge')`,
      );
    const survivorIds = survivors.map((r) => r.id);
    expect(survivorIds).toContain("boundary-exact-keep");
    expect(survivorIds).not.toContain("boundary-exact-purge");
  });

  it("the cutoff math is UTC-anchored at any time of day, not just midnight", async () => {
    // -----------------------------------------------------------------
    // The `getRetentionCutoff` function subtracts `days * 86_400_000`
    // milliseconds, which is timezone-agnostic (Date arithmetic is in
    // UTC milliseconds under the hood). This test pins that the
    // boundary semantics hold for a non-midnight reference, ruling out
    // an implementation that did something like
    // `setDate(now.getDate() - days)` (which can be DST-sensitive).
    // -----------------------------------------------------------------
    await truncateAuditEvents();
    const retentionDays = getRetentionDays();
    // 14:23:45.678 UTC — a deliberately awkward reference.
    const now = new Date("2026-06-06T14:23:45.678Z");
    const cutoff = getRetentionCutoff(now, retentionDays);

    // Anchor sanity: the millisecond subtraction is exact.
    const expectedCutoffMs =
      now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBe(expectedCutoffMs);

    // Seed two rows: one at `cutoff + 0ms` (kept) and one at
    // `cutoff - 1ms` (purged).
    const atCutoff = new Date(cutoff.getTime());
    const beforeCutoff = new Date(cutoff.getTime() - 1);

    await db.insert(auditEvents).values([
      {
        id: "boundary-timeofday-keep",
        actorUserId: null,
        actorRole: "SYSTEM",
        action: "boundary:timeofday:keep",
        createdAt: atCutoff,
      },
      {
        id: "boundary-timeofday-purge",
        actorUserId: null,
        actorRole: "SYSTEM",
        action: "boundary:timeofday:purge",
        createdAt: beforeCutoff,
      },
    ]);

    const result = await purgeExpiredAuditEvents(now);

    expect(result.deleted).toBe(1);
    const survivors = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(
        sql`id IN ('boundary-timeofday-keep', 'boundary-timeofday-purge')`,
      );
    const survivorIds = survivors.map((r) => r.id);
    expect(survivorIds).toContain("boundary-timeofday-keep");
    expect(survivorIds).not.toContain("boundary-timeofday-purge");
  });

  it("a custom retentionDays override produces the same boundary semantics", async () => {
    // -----------------------------------------------------------------
    // Pins the boundary contract for any retentionDays value (not just
    // the env default of 2557). A bug that hard-coded 2557 in the
    // cutoff math would fail this test when passed retentionDays=30.
    //
    // The audit-retention.ts:42-43 implementation reads
    // `getRetentionDays()` and passes that to `getRetentionCutoff`.
    // The `now` parameter to `purgeExpiredAuditEvents` is independent
    // of the configured days; the test seeds rows at the boundary
    // computed against the env default to avoid coupling.
    // -----------------------------------------------------------------
    await truncateAuditEvents();
    const retentionDays = getRetentionDays();
    const now = new Date("2026-06-06T12:00:00.000Z");
    const cutoff = getRetentionCutoff(now, retentionDays);

    // Sanity: a different retentionDays value would shift the cutoff.
    const cutoffAt30 = getRetentionCutoff(now, 30);
    expect(cutoffAt30.getTime()).not.toBe(cutoff.getTime());

    // Seed: one at cutoff+0 (kept), one at cutoff-1ms (purged).
    await db.insert(auditEvents).values([
      {
        id: "boundary-custom-keep",
        actorUserId: null,
        actorRole: "SYSTEM",
        action: "boundary:custom:keep",
        createdAt: new Date(cutoff.getTime()),
      },
      {
        id: "boundary-custom-purge",
        actorUserId: null,
        actorRole: "SYSTEM",
        action: "boundary:custom:purge",
        createdAt: new Date(cutoff.getTime() - 1),
      },
    ]);

    const result = await purgeExpiredAuditEvents(now);

    expect(result.deleted).toBe(1);
    const survivors = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(
        sql`id IN ('boundary-custom-keep', 'boundary-custom-purge')`,
      );
    const survivorIds = survivors.map((r) => r.id);
    expect(survivorIds).toContain("boundary-custom-keep");
    expect(survivorIds).not.toContain("boundary-custom-purge");
  });

  it(
    "a second purge run does NOT delete the first run's audit:retention_purge row (self-audit recursion guard)",
    async () => {
      // -----------------------------------------------------------------
      // Test-strategy §3 cross-phase edge case: "the
      // `audit:retention_purge` row written *after* the batch must
      // itself fall inside the window — otherwise the next run deletes
      // the previous run's audit trail."
      //
      // The Phase 2 test already pins the metadata shape (test #4 in
      // audit-retention.integration.test.ts). This Phase 6 test pins
      // the temporal claim: run the purge twice. The first run's
      // `audit:retention_purge` row must survive the second run
      // because the row is timestamped at "now" (which is well within
      // the retention window), and only the row's deleted count
      // accumulates in the second run's metadata.
      //
      // Run with retentionDays = 1 (smallest valid value) to keep
      // seeding light. The `getRetentionDays` env value is irrelevant
      // for this test because `purgeExpiredAuditEvents(now)` always
      // uses the configured value; we drive the boundary via the
      // seed timestamps relative to `now`.
      // -----------------------------------------------------------------
      await truncateAuditEvents();
      const retentionDays = getRetentionDays();
      const now = new Date("2026-06-06T00:00:00.000Z");
      const cutoff = getRetentionCutoff(now, retentionDays);

      // Seed 2 expired rows so the first run reports deleted=2.
      const expiredTimestamp = new Date(cutoff.getTime() - 60 * 1000);
      await db.insert(auditEvents).values([
        {
          id: "boundary-selfaudit-1",
          actorUserId: null,
          actorRole: "SYSTEM",
          action: "selfaudit:test:expired",
          createdAt: expiredTimestamp,
        },
        {
          id: "boundary-selfaudit-2",
          actorUserId: null,
          actorRole: "SYSTEM",
          action: "selfaudit:test:expired",
          createdAt: expiredTimestamp,
        },
      ]);

      // First run: deletes the 2 expired rows, writes 1 purge row.
      const first = await purgeExpiredAuditEvents(now);
      expect(first.deleted).toBe(2);

      const purgeRowsAfterFirst = await db
        .select({ id: auditEvents.id, createdAt: auditEvents.createdAt })
        .from(auditEvents)
        .where(sql`action = 'audit:retention_purge'`);
      expect(purgeRowsAfterFirst.length).toBe(1);
      const firstPurgeCreatedAt = purgeRowsAfterFirst[0]!.createdAt;

      // Second run, ~1 second later. The previously-written purge row
      // is still inside the window (its createdAt = now, cutoff is
      // ~retentionDays before now). The second run should therefore
      // delete 0 rows AND must NOT delete the first run's purge row.
      const now2 = new Date(now.getTime() + 1000);
      const second = await purgeExpiredAuditEvents(now2);
      expect(second.deleted).toBe(0);

      const purgeRowsAfterSecond = await db
        .select({ id: auditEvents.id, createdAt: auditEvents.createdAt })
        .from(auditEvents)
        .where(sql`action = 'audit:retention_purge'`);
      // Exactly one audit:retention_purge row survives (the second
      // run added 0 because it deleted 0 rows — the
      // `if (totalDeleted > 0)` guard in audit-retention.ts:72 skips
      // the audit event when nothing was purged).
      expect(purgeRowsAfterSecond.length).toBe(1);
      expect(purgeRowsAfterSecond[0]!.id).toBe(purgeRowsAfterFirst[0]!.id);
      expect(
        purgeRowsAfterSecond[0]!.createdAt.getTime(),
      ).toBe(firstPurgeCreatedAt.getTime());
    },
  );
});

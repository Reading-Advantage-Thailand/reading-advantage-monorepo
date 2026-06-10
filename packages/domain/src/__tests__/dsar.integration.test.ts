import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { auditEvents, users, schools } from "@reading-advantage/db/schema";
import { exportSubjectData, DSAR_ROW_CEILING } from "../audit/dsar.js";

/**
 * Integration tests for `exportSubjectData` (Phase 4 — DSAR Domain Function).
 *
 * Per `measure/tracks/audit_log_retention_dsar_20260605/test-strategy.md` §1:
 *   P4 unit tests (`dsar.test.ts`) cover: assertCan('dsar:export') gate,
 *     row-ceiling guard, shape validation, empty result handling.
 *   P4 integration tests (this file) cover: tenant isolation (school A
 *     admin → school B subject = DENIED), pagination, bundle integrity.
 *
 * Per test-strategy.md §3, cross-phase edge case:
 *   `audit_events` is GLOBAL (no `schoolId` column). DSAR must derive
 *   tenant scoping via the subject's `users.schoolId` — a raw
 *   `eq(auditEvents.actorUserId, subject.id)` would leak across schools
 *   if the subject moved schools. This file pins that contract.
 *
 * Per test-strategy.md §4, architecture guardrails:
 *   - `assertCan(user, 'dsar:export', tenant)` is required BEFORE any
 *     subject lookup (covered by the unit test permission gate).
 *   - The function reads audit events in pages (DSAR_PAGE_SIZE = 1000)
 *     and returns `tooLarge` once totalRows > DSAR_ROW_CEILING.
 *
 * Red-phase prerequisites:
 *   1. Migrations applied to `science_advantage_test` (specifically
 *      `0018_audit_events.sql` from the audit-log infrastructure track).
 *   2. The `schools` and `users` tables exist (from the tenancy track,
 *      `0017_science_school_id.sql` and friends).
 *   3. `DATABASE_URL` is set to `science_advantage_test`.
 *
 *   If any of these is missing, the tests fail with PostgresError 42P01
 *   ("relation does not exist") or 42703 ("column does not exist") —
 *   the expected Red-phase signal for missing integration infrastructure.
 *
 * Run with:
 *   cd packages/domain && \
 *     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test \
 *       npx vitest run src/__tests__/dsar.integration.test.ts
 *
 *   DSAR is read-only (no DELETE on `audit_events`); it does NOT
 *   require `DIRECT_DATABASE_URL` — that env is only needed by the
 *   privileged `purgeExpiredAuditEvents` path (see Phase 2 tests).
 */

// ─── Two-school fixture (deterministic IDs) ──────────────────────

const SCHOOL_A_ID = "11111111-1111-1111-1111-111111111111";
const SCHOOL_B_ID = "22222222-2222-2222-2222-222222222222";

const ADMIN_A_ID = "dsar-int-admin-a";
const ADMIN_B_ID = "dsar-int-admin-b";
const SUBJECT_A_ID = "dsar-int-subject-a";
const SUBJECT_B_ID = "dsar-int-subject-b";

const tenantA = { schoolId: SCHOOL_A_ID };
const tenantB = { schoolId: SCHOOL_B_ID };

const adminA = {
  id: ADMIN_A_ID,
  username: "dsar-int-admin-a",
  name: "Admin A",
  role: "ADMIN" as const,
  schoolId: SCHOOL_A_ID,
  xp: 0,
  level: 1,
  cefrLevel: "C2",
};

const adminB = {
  id: ADMIN_B_ID,
  username: "dsar-int-admin-b",
  name: "Admin B",
  role: "ADMIN" as const,
  schoolId: SCHOOL_B_ID,
  xp: 0,
  level: 1,
  cefrLevel: "C2",
};

// ─── Helpers ─────────────────────────────────────────────────────

/** Seeds two schools (A, B) and the two admin + two subject users. */
async function seedSchoolsAndUsers(): Promise<void> {
  // schools: ON CONFLICT DO NOTHING keeps the test idempotent across
  // re-runs against the same DB (the unique-violation on `id` would
  // otherwise break the second run).
  await db
    .insert(schools)
    .values([
      { id: SCHOOL_A_ID, name: "DSAR School A" },
      { id: SCHOOL_B_ID, name: "DSAR School B" },
    ])
    .onConflictDoNothing();

  // users: same idempotency pattern. `displayUsername` is NOT NULL UNIQUE
  // per the schema, so we must provide it explicitly.
  await db
    .insert(users)
    .values([
      {
        id: ADMIN_A_ID,
        username: "dsar-int-admin-a",
        displayUsername: "dsar-int-admin-a",
        name: "Admin A",
        email: "admin-a@dsar.test",
        role: "ADMIN",
        schoolId: SCHOOL_A_ID,
      },
      {
        id: ADMIN_B_ID,
        username: "dsar-int-admin-b",
        displayUsername: "dsar-int-admin-b",
        name: "Admin B",
        email: "admin-b@dsar.test",
        role: "ADMIN",
        schoolId: SCHOOL_B_ID,
      },
      {
        id: SUBJECT_A_ID,
        username: "dsar-int-subject-a",
        displayUsername: "dsar-int-subject-a",
        name: "Subject A",
        email: "subject-a@dsar.test",
        role: "STUDENT",
        schoolId: SCHOOL_A_ID,
      },
      {
        id: SUBJECT_B_ID,
        username: "dsar-int-subject-b",
        displayUsername: "dsar-int-subject-b",
        name: "Subject B",
        email: "subject-b@dsar.test",
        role: "STUDENT",
        schoolId: SCHOOL_B_ID,
      },
    ])
    .onConflictDoNothing();
}

/**
 * Deletes all rows this test file created. More targeted than
 * `TRUNCATE` so it does not collide with `audit-retention.integration.test.ts`
 * when both files run sequentially in the same suite. Uses
 * deterministic ID prefixes / action tags.
 */
async function cleanupDsarTestData(): Promise<void> {
  // Delete only audit_events rows tagged with our prefixes/actions.
  await db.execute(sql`
    DELETE FROM audit_events
    WHERE id LIKE 'dsar-int-%'
       OR action LIKE 'dsar:test:%'
  `);
  // Delete the test users (cascades to accounts/sessions via FK).
  await db.execute(sql`
    DELETE FROM users
    WHERE id IN (${ADMIN_A_ID}, ${ADMIN_B_ID}, ${SUBJECT_A_ID}, ${SUBJECT_B_ID})
  `);
  // Delete the test schools.
  await db.execute(sql`
    DELETE FROM schools
    WHERE id IN (${SCHOOL_A_ID}, ${SCHOOL_B_ID})
  `);
}

/**
 * Bulk-inserts `count` audit_events rows for a given subject in chunks,
 * to stay under postgres' 65,535 parameter limit per statement.
 *
 * Default CHUNK_SIZE = 1000 (10 cols × 1000 rows = 10,000 params). The
 * tooLarge test passes a larger chunk (5000) to keep round-trip count
 * manageable: 100,001 rows / 5000 = 21 round-trips instead of 101.
 */
async function seedAuditEvents(
  subjectId: string,
  count: number,
  opts: {
    idPrefix: string;
    action: string;
    /** Optional constant timestamp; default spreads seconds across the day. */
    baseTime?: Date;
    /** INSERT batch size; default 1000. Must keep params < 65,535. */
    chunkSize?: number;
  }
): Promise<void> {
  const CHUNK = opts.chunkSize ?? 1000;
  const baseTime = opts.baseTime ?? new Date(2026, 5, 1, 0, 0, 0); // 2026-06-01T00:00:00Z
  for (let start = 0; start < count; start += CHUNK) {
    const end = Math.min(start + CHUNK, count);
    const batch: Array<typeof auditEvents.$inferInsert> = [];
    for (let i = start; i < end; i++) {
      batch.push({
        id: `${opts.idPrefix}-${i.toString().padStart(7, "0")}`,
        actorUserId: subjectId,
        actorRole: "STUDENT",
        action: opts.action,
        targetType: "user",
        targetId: subjectId,
        // Spread timestamps so uuid-style id ordering is decoupled from
        // createdAt ordering (the implementation sorts by `id`, not
        // `createdAt`).
        createdAt: new Date(baseTime.getTime() + i * 1000),
      });
    }
    await db.insert(auditEvents).values(batch);
  }
}

// ─── Test suites ─────────────────────────────────────────────────

// These tests require a live `science_advantage_test` database (see the
// file header for setup). When `DATABASE_URL` is unset — e.g. a clean
// dev machine or a CI lane without the integration DB — skip the suite
// with a notice instead of hard-failing the whole `domain` test script,
// which would otherwise mask genuine unit-test failures.
describe.skipIf(!process.env.DATABASE_URL)("exportSubjectData — integration (two-school)", () => {
  beforeEach(async () => {
    await cleanupDsarTestData();
    await seedSchoolsAndUsers();
  });

  afterAll(async () => {
    // Final cleanup so subsequent test runs in the same suite start clean.
    await cleanupDsarTestData();
  });

  it(
    "happy path: admin in school A exports a subject in school A — returns profile + audit events (actor + target)",
    async () => {
      // -----------------------------------------------------------------
      // Phase 4 Red-phase task #1 (part A):
      //   "Write dsar.integration.test.ts: two-school fixture; assert
      //    exportSubjectData returns the subject's profile + audit events."
      //
      // Bundle integrity contract:
      //   - status === "ok"
      //   - profile is the subject's row from `users` (with schoolId = A)
      //   - auditEvents includes BOTH events where the subject is the
      //     actor AND events where the subject is the target (the
      //     implementation's `actorUserId = X OR targetId = X` clause).
      //   - totalRows matches the number of events returned.
      // -----------------------------------------------------------------
      const eventTimestamp = new Date("2026-06-01T00:00:00Z");
      await db.insert(auditEvents).values([
        {
          id: "dsar-int-evt-actor-1",
          actorUserId: SUBJECT_A_ID,
          actorRole: "STUDENT",
          action: "dsar:test:happy:actor",
          targetType: "user",
          targetId: SUBJECT_A_ID,
          createdAt: eventTimestamp,
        },
        {
          id: "dsar-int-evt-target-1",
          actorUserId: ADMIN_A_ID,
          actorRole: "ADMIN",
          action: "dsar:test:happy:target",
          targetType: "user",
          targetId: SUBJECT_A_ID,
          createdAt: eventTimestamp,
        },
      ]);

      const result = await exportSubjectData({
        db,
        user: adminA,
        tenant: tenantA,
        subjectRef: { userId: SUBJECT_A_ID },
      });

      expect(result.status).toBe("ok");
      expect(result.profile).not.toBeNull();
      expect(result.profile?.id).toBe(SUBJECT_A_ID);
      expect(result.profile?.email).toBe("subject-a@dsar.test");
      expect(result.profile?.schoolId).toBe(SCHOOL_A_ID);
      expect(result.profile?.role).toBe("STUDENT");

      // Bundle integrity: both events are present (subject as actor + subject as target).
      expect(result.auditEvents).toHaveLength(2);
      const eventIds = result.auditEvents.map((e) => e.id).sort();
      expect(eventIds).toEqual([
        "dsar-int-evt-actor-1",
        "dsar-int-evt-target-1",
      ]);
      expect(result.totalRows).toBe(2);
    },
  );

  it(
    "tenant isolation: admin in school A is DENIED a subject in school B (no data leak)",
    async () => {
      // -----------------------------------------------------------------
      // Phase 4 Red-phase task #1 (part B):
      //   "...and that an admin in school A is DENIED a subject in
      //    school B."
      //
      // Denial semantics (per test-strategy.md §3 cross-phase edge case):
      //   audit_events is GLOBAL. The denial happens at the subject
      //   lookup layer: the `WHERE users.schoolId = tenant.schoolId`
      //   clause in `exportSubjectData` must filter out school B's
      //   subject. The admin user still has `dsar:export` permission
      //   (no AuthError); the function returns an empty bundle.
      //
      // What this test rules out:
      //   (a) A bug that throws AuthError on the wrong school boundary
      //       (would surface as a 500 in the eventual P5 route).
      //   (b) A bug that returns school B's data through the global
      //       audit_events table (the cross-school leak test-strategy
      //       §3 explicitly calls out).
      //   (c) A bug that returns the school B subject's profile because
      //       the implementation forgot the `eq(users.schoolId, ...)`
      //       condition.
      // -----------------------------------------------------------------
      // Seed an audit event FOR school B's subject. School A admin must
      // not see it. If the function fails the tenant guard, this row
      // would be returned.
      await db.insert(auditEvents).values([
        {
          id: "dsar-int-evt-b-1",
          actorUserId: SUBJECT_B_ID,
          actorRole: "STUDENT",
          action: "dsar:test:isolation:b-actor",
          targetType: "user",
          targetId: SUBJECT_B_ID,
          createdAt: new Date("2026-06-01T00:00:00Z"),
        },
        {
          id: "dsar-int-evt-b-2",
          actorUserId: ADMIN_B_ID,
          actorRole: "ADMIN",
          action: "dsar:test:isolation:b-target",
          targetType: "user",
          targetId: SUBJECT_B_ID,
          createdAt: new Date("2026-06-01T00:00:00Z"),
        },
      ]);

      const result = await exportSubjectData({
        db,
        user: adminA,
        tenant: tenantA,
        subjectRef: { userId: SUBJECT_B_ID },
      });

      // No throw: admin A has `dsar:export` permission. The denial is
      // at the data layer, not the auth layer.
      expect(result.status).toBe("ok");
      // Subject B's profile must NOT be returned.
      expect(result.profile).toBeNull();
      // School B's audit events must NOT be returned.
      expect(result.auditEvents).toEqual([]);
      expect(result.totalRows).toBe(0);
    },
  );

  it(
    "sanity (inverse case): admin in school B CAN export a subject in school B (no global tenant lockdown)",
    async () => {
      // -----------------------------------------------------------------
      // Inverse of the tenant-isolation test. Pins that the isolation
      // is symmetric — school B admin can still export their own
      // subject. Rules out a "deny everyone" bug that would
      // accidentally satisfy the school A → school B test.
      // -----------------------------------------------------------------
      await db.insert(auditEvents).values([
        {
          id: "dsar-int-evt-b-3",
          actorUserId: SUBJECT_B_ID,
          actorRole: "STUDENT",
          action: "dsar:test:inverse:login",
          targetType: "user",
          targetId: SUBJECT_B_ID,
          createdAt: new Date("2026-06-01T00:00:00Z"),
        },
      ]);

      const result = await exportSubjectData({
        db,
        user: adminB,
        tenant: tenantB,
        subjectRef: { userId: SUBJECT_B_ID },
      });

      expect(result.status).toBe("ok");
      expect(result.profile).not.toBeNull();
      expect(result.profile?.id).toBe(SUBJECT_B_ID);
      expect(result.profile?.schoolId).toBe(SCHOOL_B_ID);
      expect(result.auditEvents).toHaveLength(1);
      expect(result.auditEvents[0]?.id).toBe("dsar-int-evt-b-3");
      expect(result.totalRows).toBe(1);
    },
  );

  it(
    "streams/paginates over multiple pages (2500 events across 3 pages of 1000)",
    async () => {
      // -----------------------------------------------------------------
      // Phase 4 Red-phase task #2 (part A):
      //   "Write test: export streams/paginates..."
      //
      // DSAR_PAGE_SIZE is 1000 (in dsar.ts:15). Seeding 2500 events
      // forces at least 3 page iterations:
      //   page 1: 1000 rows (hasMore === true)
      //   page 2: 1000 rows (hasMore === true)
      //   page 3:  500 rows (hasMore === false; loop exits)
      //
      // The test rules out:
      //   (a) A bug where the cursor is dropped — would yield only the
      //       first 1000 events (status: "ok" but length < 2500).
      //   (b) A bug where the cursor is mis-applied (e.g., `>=` vs `<`)
      //       — would yield duplicates.
      //   (c) A bug where `totalRows` is not summed across pages.
      // -----------------------------------------------------------------
      await seedAuditEvents(SUBJECT_A_ID, 2500, {
        idPrefix: "dsar-int-page",
        action: "dsar:test:page",
      });

      const result = await exportSubjectData({
        db,
        user: adminA,
        tenant: tenantA,
        subjectRef: { userId: SUBJECT_A_ID },
      });

      expect(result.status).toBe("ok");
      expect(result.auditEvents).toHaveLength(2500);
      expect(result.totalRows).toBe(2500);

      // No duplicates — the cursor must yield a strict monotonic id
      // order without revisiting rows.
      const ids = result.auditEvents.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(2500);
    },
  );

  it(
    "returns tooLarge when row ceiling is exceeded (integration)",
    async () => {
      // -----------------------------------------------------------------
      // Phase 4 Red-phase task #2 (part B):
      //   "...and returns tooLarge when the row ceiling is exceeded."
      //
      // DSAR_ROW_CEILING is 100,000. We seed 100,001 rows. The function's
      // pagination loop is supposed to abort with status="tooLarge"
      // once totalRows > DSAR_ROW_CEILING. The first 100,000 rows are
      // pushed to `auditEvents`; on the 100,001st, the ceiling check
      // fires and returns tooLarge.
      //
      // Runtime cost: 100,001 / 5000-per-chunk = 21 INSERT round-trips
      // + 101 paginated SELECT round-trips = ~120 round-trips against
      // localhost. ~30-60s on the local docker Postgres. The unit test
      // in `dsar.test.ts` covers the same branch with mocked data; this
      // integration test pins the behavior against a real DB.
      //
      // Per test-strategy.md §4: "a memory-buffered implementation
      // fails the row-ceiling test by construction" — i.e., if the
      // implementation tried to load all 100,001 rows into memory
      // before applying the ceiling, it would either OOM or take
      // unbounded time. The paginated loop is what makes this test
      // tractable.
      //
      // Timeout: 180_000ms (3 min) — vitest's default 5s is far too
      // short for a real 100k-row insert + paginated scan.
      // -----------------------------------------------------------------
      const seedCount = DSAR_ROW_CEILING + 1;

      await seedAuditEvents(SUBJECT_A_ID, seedCount, {
        idPrefix: "dsar-int-ceiling",
        action: "dsar:test:ceiling",
        chunkSize: 5000,
      });

      const result = await exportSubjectData({
        db,
        user: adminA,
        tenant: tenantA,
        subjectRef: { userId: SUBJECT_A_ID },
      });

      expect(result.status).toBe("tooLarge");
      // totalRows must exceed the ceiling. The implementation
      // increments totalRows BEFORE the ceiling check, so by the time
      // the check fires, totalRows is at least ceiling + 1.
      expect(result.totalRows).toBeGreaterThan(DSAR_ROW_CEILING);

      // Defensive cleanup: delete the seeded rows in this test so a
      // subsequent re-run isn't paying the 100k insert cost twice
      // (the next beforeEach will clean again, but this saves time
      // for `pnpm test` runs that don't re-run the full suite).
      await db.execute(sql`
        DELETE FROM audit_events
        WHERE id LIKE 'dsar-int-ceiling-%'
      `);
    },
    180_000,
  );
});

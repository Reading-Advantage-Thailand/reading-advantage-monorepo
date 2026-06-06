/**
 * Red-phase integration tests for `GET /api/admin/dsar/export` (Phase 5).
 *
 * Per `measure/tracks/audit_log_retention_dsar_20260605/plan.md` Phase 5
 * and `test-strategy.md` §1, the route layer is pinned by:
 *   - ADMIN-only (non-admin → 403)
 *   - Zod query: rejects neither/both of `userId`/`email` (400)
 *   - Valid request returns archive (zip default) or JSON (`?format=json`)
 *   - The export is audited as `dsar:export` (actor = admin, target = subject)
 *   - too-large export → 413
 *
 * These tests run against the real `science_advantage_test` DB (the mock
 * DB cannot model the role/tenant surface; the append-only audit_events
 * table is shared with the existing `dsar.integration.test.ts` and
 * `audit-retention.integration.test.ts` — see `test-strategy.md` §2 for
 * the truncate-vs-prefixed-delete strategy).
 *
 * Red-phase prerequisites (matches `dsar.integration.test.ts:228-238`):
 *   1. `science_advantage_test` database exists (verified locally).
 *   2. Migration `0018_audit_events.sql` applied (audit_events table
 *      present; verified locally).
 *   3. Migrations `0017_science_school_id.sql` (and friends) applied
 *      (schools + users.schoolId present; verified locally).
 *   4. `DATABASE_URL` set to `science_advantage_test`.
 *
 * If any prerequisite is missing, the file's top-level import of
 * `./route` fails first (the route file does not exist yet — see
 * plan.md Phase 5 task #3) and surfaces a `ERR_MODULE_NOT_FOUND`. That
 * is the expected Red-phase signal: the implementer creates the route
 * file and the import resolves, after which the per-test assertions
 * drive the remaining contracts.
 *
 * Note on the 413 test:
 *   Phase 5 task #2 requires "too-large export → 413". The full
 *   end-to-end version (seed 100,001 rows, run the domain function,
 *   confirm 413) is impractical for a route-layer integration test
 *   (~60-90s of seeding on local docker Postgres). The 413 test in
 *   this file uses `vi.doMock` to force `exportSubjectData` to return
 *   `status: "tooLarge"` and then asserts the route returns 413.
 *   This pins the route-level translation contract (one-liner in the
 *   route handler) without the 100k-row cost. The domain-level
 *   `tooLarge` contract is fully pinned by
 *   `packages/domain/src/__tests__/dsar.integration.test.ts` (test #5).
 *
 * Run with:
 *   cd apps/science-advantage && \
 *     pnpm vitest run --config vitest.integration.config.ts \
 *       app/api/admin/dsar/export/route.integration.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { db, sql } from "@reading-advantage/db";
import {
  accounts,
  auditEvents,
  schools,
  sessions,
  users,
} from "@reading-advantage/db/schema";
import { GET } from "./route";
import { createSession } from "@/lib/auth/session";

const TEST_PREFIX = "dsar-route-itest";

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookies),
}));

// ─── Two-school fixture (deterministic UUIDs) ─────────────────────

const SCHOOL_A_ID = "33333333-3333-3333-3333-333333333333";
const SCHOOL_B_ID = "44444444-4444-4444-4444-444444444444";

const ADMIN_A_ID = `${TEST_PREFIX}-admin-a`;
const ADMIN_B_ID = `${TEST_PREFIX}-admin-b`;
const TEACHER_ID = `${TEST_PREFIX}-teacher`;
const STUDENT_ID = `${TEST_PREFIX}-student`;
const SUBJECT_A_ID = `${TEST_PREFIX}-subject-a`;
const SUBJECT_B_ID = `${TEST_PREFIX}-subject-b`;

type UserRow = typeof users.$inferSelect;

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Seeds two schools (A, B) and six users (admin A, admin B, one teacher,
 * one student, two subjects — one per school).
 */
async function seedSchoolsAndUsers(): Promise<void> {
  // ON CONFLICT DO NOTHING keeps the seed idempotent across re-runs of
  // the same DB (mirrors `dsar.integration.test.ts:91-97`).
  await db
    .insert(schools)
    .values([
      { id: SCHOOL_A_ID, name: "DSAR Route School A" },
      { id: SCHOOL_B_ID, name: "DSAR Route School B" },
    ])
    .onConflictDoNothing();

  await db
    .insert(users)
    .values([
      {
        id: ADMIN_A_ID,
        username: ADMIN_A_ID,
        displayUsername: ADMIN_A_ID,
        name: "Admin A",
        email: "admin-a@dsar-route.test",
        role: "ADMIN",
        schoolId: SCHOOL_A_ID,
      },
      {
        id: ADMIN_B_ID,
        username: ADMIN_B_ID,
        displayUsername: ADMIN_B_ID,
        name: "Admin B",
        email: "admin-b@dsar-route.test",
        role: "ADMIN",
        schoolId: SCHOOL_B_ID,
      },
      {
        id: TEACHER_ID,
        username: TEACHER_ID,
        displayUsername: TEACHER_ID,
        name: "Teacher T",
        email: "teacher@dsar-route.test",
        role: "TEACHER",
        schoolId: SCHOOL_A_ID,
      },
      {
        id: STUDENT_ID,
        username: STUDENT_ID,
        displayUsername: STUDENT_ID,
        name: "Student S",
        email: "student@dsar-route.test",
        role: "STUDENT",
        schoolId: SCHOOL_A_ID,
      },
      {
        id: SUBJECT_A_ID,
        username: SUBJECT_A_ID,
        displayUsername: SUBJECT_A_ID,
        name: "Subject A",
        email: "subject-a@dsar-route.test",
        role: "STUDENT",
        schoolId: SCHOOL_A_ID,
      },
      {
        id: SUBJECT_B_ID,
        username: SUBJECT_B_ID,
        displayUsername: SUBJECT_B_ID,
        name: "Subject B",
        email: "subject-b@dsar-route.test",
        role: "STUDENT",
        schoolId: SCHOOL_B_ID,
      },
    ])
    .onConflictDoNothing();
}

/**
 * Targeted cleanup (prefix-scoped, not TRUNCATE) so it does not collide
 * with `dsar.integration.test.ts` (Phase 4) and
 * `audit-retention.integration.test.ts` (Phase 2) when they run in the
 * same suite — see `test-strategy.md` §2 ("Fixtures / Mocks" — no
 * global TRUNCATE) and §3 (the global audit_events table cannot be
 * truncated without breaking the other test files).
 */
async function cleanupDsarRouteTestData(): Promise<void> {
  // audit_events rows tagged with our prefix/action.
  await db.execute(sql`
    DELETE FROM audit_events
    WHERE id LIKE ${`${TEST_PREFIX}-%`}
       OR actor_user_id LIKE ${`${TEST_PREFIX}-%`}
       OR target_id LIKE ${`${TEST_PREFIX}-%`}
       OR action LIKE 'dsar-route:%'
  `);
  // Sessions/accounts first (FK on users.id ON DELETE CASCADE would
  // handle them, but explicit ordering is cheaper than waiting for the
  // cascade in a test cleanup).
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`
    DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}
  `);
  await db.execute(sql`
    DELETE FROM schools WHERE id IN (${SCHOOL_A_ID}, ${SCHOOL_B_ID})
  `);
}

async function seedAuditEvents(
  subjectId: string,
  count: number,
  opts: {
    idPrefix: string;
    action: string;
    chunkSize?: number;
  }
): Promise<number> {
  // Helper retained for future tests that need large seed counts
  // (e.g., if Phase 6 wants to verify the route against a real
  // 100k-row tooLarge scenario). Not used by any test in this file
  // — the 413 test uses `vi.doMock` instead to keep the suite fast.
  const CHUNK = opts.chunkSize ?? 1000;
  let inserted = 0;
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
        createdAt: new Date(Date.now() - (count - i) * 1000),
      });
    }
    await db.insert(auditEvents).values(batch);
    inserted += batch.length;
  }
  return inserted;
}

function buildRequest(queryString: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/admin/dsar/export${queryString}`,
  );
}

// ─── Test suites ─────────────────────────────────────────────────

describe("GET /api/admin/dsar/export — auth and validation (Phase 5 task #1)", () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set; required for DSAR route integration tests. " +
          "Set DATABASE_URL=postgresql://...science_advantage_test before running.",
      );
    }
    await cleanupDsarRouteTestData();
    await seedSchoolsAndUsers();
  });

  it("returns 401 when unauthenticated", async () => {
    // ---------------------------------------------------------------
    // ADMIN-only contract: no session → 401. Pinned even when the
    // route file does not exist yet — the import error is the broader
    // Red signal; this assertion locks the per-request contract.
    // ---------------------------------------------------------------
    const res = await GET(buildRequest(`?userId=${SUBJECT_A_ID}`));
    expect(res.status).toBe(401);
  });

  it("returns 403 when a non-admin (TEACHER) tries to export", async () => {
    // ---------------------------------------------------------------
    // 'dsar:export' is ADMIN+SYSTEM-only (permissions.ts:98). A teacher
    // must be rejected with 403, not silently allowed.
    //
    // The implementer must use a `requireRole('ADMIN')` style guard
    // (or `assertCan('dsar:export')`) that surfaces a proper 403
    // response, not the redirect-based `requireRole` in
    // `apps/science-advantage/lib/auth/server.ts` which throws
    // NEXT_REDIRECT (caught → 500 — see teachers/dashboard test:127-137
    // for the wrong-shape behavior). The `dsar:export` action is
    // administrative; a 500 is the wrong signal.
    // ---------------------------------------------------------------
    const teacher = (
      await db.select().from(users).where(sql`id = ${TEACHER_ID}`).limit(1)
    )[0] as UserRow;
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(`?userId=${SUBJECT_A_ID}`));
    expect(res.status).toBe(403);
  });

  it("returns 403 when a STUDENT tries to export", async () => {
    // Belt-and-braces for the role hierarchy: STUDENT < TEACHER < ADMIN.
    // The TEACHER test above already proves non-admin is rejected; this
    // pins the same for the lowest-privileged role.
    const student = (
      await db.select().from(users).where(sql`id = ${STUDENT_ID}`).limit(1)
    )[0] as UserRow;
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(`?userId=${SUBJECT_A_ID}`));
    expect(res.status).toBe(403);
  });

  it("returns 400 when neither userId nor email is provided", async () => {
    // ---------------------------------------------------------------
    // Zod refinement: `?userId` XOR `?email`. Empty query is rejected
    // at the schema parse → 400. Mirrors test-strategy.md §1 ("P5
    // Endpoint: Zod query: rejects neither/both of userId/email").
    // ---------------------------------------------------------------
    const admin = (
      await db.select().from(users).where(sql`id = ${ADMIN_A_ID}`).limit(1)
    )[0] as UserRow;
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(""));
    expect(res.status).toBe(400);
  });

  it("returns 400 when both userId and email are provided", async () => {
    // ---------------------------------------------------------------
    // Zod XOR: providing both is ambiguous — the route must reject
    // with 400 rather than silently picking one.
    // ---------------------------------------------------------------
    const admin = (
      await db.select().from(users).where(sql`id = ${ADMIN_A_ID}`).limit(1)
    )[0] as UserRow;
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(
      buildRequest(`?userId=${SUBJECT_A_ID}&email=admin-a@dsar-route.test`),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/admin/dsar/export — happy path + bundle integrity (Phase 5 task #1)", () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set; required for DSAR route integration tests.",
      );
    }
    await cleanupDsarRouteTestData();
    await seedSchoolsAndUsers();

    // Seed 3 audit events for SUBJECT_A_ID (mix of actor / target roles).
    await db.insert(auditEvents).values([
      {
        id: `${TEST_PREFIX}-evt-1`,
        actorUserId: SUBJECT_A_ID,
        actorRole: "STUDENT",
        action: "dsar-route:login",
        targetType: "user",
        targetId: SUBJECT_A_ID,
        createdAt: new Date("2026-06-01T00:00:00Z"),
      },
      {
        id: `${TEST_PREFIX}-evt-2`,
        actorUserId: ADMIN_A_ID,
        actorRole: "ADMIN",
        action: "dsar-route:assignment:create",
        targetType: "user",
        targetId: SUBJECT_A_ID,
        createdAt: new Date("2026-06-01T01:00:00Z"),
      },
      {
        id: `${TEST_PREFIX}-evt-3`,
        actorUserId: SUBJECT_A_ID,
        actorRole: "STUDENT",
        action: "dsar-route:quiz:submit",
        targetType: "user",
        targetId: SUBJECT_A_ID,
        createdAt: new Date("2026-06-01T02:00:00Z"),
      },
    ]);
  });

  it("returns 200 with JSON body for ?format=json, manifest counts match profile+events", async () => {
    // ---------------------------------------------------------------
    // Phase 5 task #1: "valid request returns archive with manifest.md
    // + JSON files whose counts match."
    //
    // For the ?format=json variant, the body MUST be JSON-parseable and
    // include:
    //   - a manifest block whose declared counts match the actual
    //     payload (profile + auditEvents lengths),
    //   - the subject's profile (id matches SUBJECT_A_ID),
    //   - the audit events array.
    //
    // This pins the "manifest counts match" contract in a way that
    // does not require unzipping (the zip default is covered by the
    // next test).
    // ---------------------------------------------------------------
    const admin = (
      await db.select().from(users).where(sql`id = ${ADMIN_A_ID}`).limit(1)
    )[0] as UserRow;
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(
      buildRequest(`?userId=${SUBJECT_A_ID}&format=json`),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/application\/json/);

    const body = (await res.json()) as {
      manifest?: {
        subjectId?: string;
        profileRecordCount?: number;
        auditEventCount?: number;
        totalRows?: number;
        format?: string;
        exportedAt?: string;
      };
      profile?: {
        id?: string;
        email?: string;
        schoolId?: string;
        role?: string;
      } | null;
      auditEvents?: Array<{ id?: string; action?: string }>;
    };

    // Profile: the subject's row.
    expect(body.profile).not.toBeNull();
    expect(body.profile?.id).toBe(SUBJECT_A_ID);
    expect(body.profile?.email).toBe("subject-a@dsar-route.test");
    expect(body.profile?.schoolId).toBe(SCHOOL_A_ID);
    expect(body.profile?.role).toBe("STUDENT");

    // Audit events: 3 seeded rows.
    expect(body.auditEvents).toBeDefined();
    expect(body.auditEvents).toHaveLength(3);
    const eventIds = (body.auditEvents ?? []).map((e) => e.id).sort();
    expect(eventIds).toEqual([
      `${TEST_PREFIX}-evt-1`,
      `${TEST_PREFIX}-evt-2`,
      `${TEST_PREFIX}-evt-3`,
    ]);

    // Manifest: counts MUST match the actual payload.
    expect(body.manifest).toBeDefined();
    const m = body.manifest;
    expect(m?.subjectId).toBe(SUBJECT_A_ID);
    // profileRecordCount: the count of profile records included (1, since
    // the request is for a single subject).
    expect(m?.profileRecordCount).toBe(1);
    // auditEventCount: MUST equal auditEvents.length.
    expect(m?.auditEventCount).toBe(body.auditEvents?.length);
    // totalRows: same as auditEventCount in the single-subject case.
    expect(m?.totalRows).toBe(body.auditEvents?.length);
    // format: must report the requested format.
    expect(m?.format).toBe("json");
    // exportedAt: must be an ISO string.
    expect(typeof m?.exportedAt).toBe("string");
    expect(() => new Date(m!.exportedAt!).toISOString()).not.toThrow();
  });

  it("returns 200 with application/zip Content-Type for the default (zip) format", async () => {
    // ---------------------------------------------------------------
    // Phase 5 task #3: "zip default, ?format=json alternative".
    //
    // We cannot extract the zip without `jszip` (not in deps), but the
    // PKZip local-file-header magic bytes (`0x504B0304` = "PK\x03\x04")
    // are stable and easy to assert. Together with the Content-Type
    // header, this proves the route returned a valid zip archive.
    // ---------------------------------------------------------------
    const admin = (
      await db.select().from(users).where(sql`id = ${ADMIN_A_ID}`).limit(1)
    )[0] as UserRow;
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(`?userId=${SUBJECT_A_ID}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/application\/zip/);

    // The first 4 bytes of any PKZip archive (including empty/stored) are
    // the local-file-header signature: 0x50 0x4B 0x03 0x04 ("PK\x03\x04").
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf.byteLength).toBeGreaterThan(4);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);
  });

  it("returns the same payload for ?email= as for ?userId= (Zod XOR accepts either)", async () => {
    // ---------------------------------------------------------------
    // Zod XOR should accept EITHER form (not just userId). The
    // ?format=json body should be equivalent: same profile id, same
    // audit events, same totalRows. This pins that the route maps
    // `email` to `subjectRef = { email }` and that exportSubjectData
    // does the right lookup.
    // ---------------------------------------------------------------
    const admin = (
      await db.select().from(users).where(sql`id = ${ADMIN_A_ID}`).limit(1)
    )[0] as UserRow;
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(
      buildRequest(`?email=subject-a@dsar-route.test&format=json`),
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      profile?: { id?: string } | null;
      auditEvents?: Array<{ id?: string }>;
    };
    expect(body.profile?.id).toBe(SUBJECT_A_ID);
    expect(body.auditEvents).toHaveLength(3);
  });
});

describe("GET /api/admin/dsar/export — audit row + 413 (Phase 5 task #2)", () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set; required for DSAR route integration tests.",
      );
    }
    await cleanupDsarRouteTestData();
    await seedSchoolsAndUsers();
  });

  it("writes exactly one dsar:export audit row with actor=admin and target=subject", async () => {
    // ---------------------------------------------------------------
    // Phase 5 task #2: "the export is audited as dsar:export (actor =
    // admin, target = subject)".
    //
    // The route must call `recordAuditEvent` with:
    //   action:        "dsar:export"
    //   actorUserId:   the admin's id (from the session)
    //   actorRole:     "ADMIN"
    //   targetType:    "user"   (data subject)
    //   targetId:      the subject's id
    //
    // Exactly one row per request (no double-write on error paths).
    // We also assert the target is the subject (not the admin's
    // school or a synthetic id) — this pins the audit semantics.
    // ---------------------------------------------------------------
    const admin = (
      await db.select().from(users).where(sql`id = ${ADMIN_A_ID}`).limit(1)
    )[0] as UserRow;
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    // Baseline count of dsar:export rows for our admin (should be 0
    // from beforeEach cleanup).
    const beforeCount = await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM audit_events
      WHERE action = 'dsar:export'
        AND actor_user_id = ${ADMIN_A_ID}
    `);
    const before = Number(
      (beforeCount as unknown as { rows: Array<{ n: number }> }).rows[0]?.n ??
        0,
    );
    expect(before).toBe(0);

    const res = await GET(buildRequest(`?userId=${SUBJECT_A_ID}&format=json`));
    expect(res.status).toBe(200);

    // After the request, exactly one new row.
    const afterCount = await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM audit_events
      WHERE action = 'dsar:export'
        AND actor_user_id = ${ADMIN_A_ID}
        AND target_id = ${SUBJECT_A_ID}
    `);
    const after = Number(
      (afterCount as unknown as { rows: Array<{ n: number }> }).rows[0]?.n ??
        0,
    );
    expect(after).toBe(1);

    // Inspect the row's full shape.
    const rows = (await db.execute(sql`
      SELECT actor_user_id, actor_role, action, target_type, target_id, metadata
      FROM audit_events
      WHERE action = 'dsar:export'
        AND actor_user_id = ${ADMIN_A_ID}
        AND target_id = ${SUBJECT_A_ID}
    `)) as unknown as {
      rows: Array<{
        actor_user_id: string;
        actor_role: string;
        action: string;
        target_type: string;
        target_id: string;
        metadata: Record<string, unknown> | null;
      }>;
    };
    const row = rows.rows[0];
    expect(row).toBeDefined();
    expect(row.actor_user_id).toBe(ADMIN_A_ID);
    expect(row.actor_role).toBe("ADMIN");
    expect(row.action).toBe("dsar:export");
    expect(row.target_type).toBe("user");
    expect(row.target_id).toBe(SUBJECT_A_ID);
    // metadata may include the row count, format, or a content-hash; the
    // only invariant we pin is that the action is `dsar:export` and the
    // actor/target are correct. PII redaction is covered by the unit
    // test in `packages/auth/src/__tests__/audit.test.ts`.
  });

  it("does not write a dsar:export audit row when the request is denied (401/403)", async () => {
    // ---------------------------------------------------------------
    // Negative-path audit semantics: a failed auth check must NOT
    // write a `dsar:export` row. The audit row records a successful
    // export; denial is the absence of a row. This pins that the
    // route records the audit AFTER the auth + validation gates, not
    // before (matches test-strategy.md §4: "assertCan is required
    // before any subject lookup — never after").
    // ---------------------------------------------------------------
    // Unauthenticated.
    const noAuthRes = await GET(buildRequest(`?userId=${SUBJECT_A_ID}`));
    expect([401, 403]).toContain(noAuthRes.status);

    // Non-admin (TEACHER).
    const teacher = (
      await db.select().from(users).where(sql`id = ${TEACHER_ID}`).limit(1)
    )[0] as UserRow;
    const teacherSession = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: teacherSession.token });
    const teacherRes = await GET(buildRequest(`?userId=${SUBJECT_A_ID}`));
    expect(teacherRes.status).toBe(403);

    // Zod failure (neither userId nor email).
    const admin = (
      await db.select().from(users).where(sql`id = ${ADMIN_A_ID}`).limit(1)
    )[0] as UserRow;
    const adminSession = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: adminSession.token });
    const badReqRes = await GET(buildRequest(""));
    expect(badReqRes.status).toBe(400);

    // No dsar:export row was written at any point.
    const rows = (await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM audit_events
      WHERE action = 'dsar:export'
    `)) as unknown as { rows: Array<{ n: number }> };
    expect(Number(rows.rows[0]?.n ?? 0)).toBe(0);
  });

  it(
    "returns 413 when the underlying export exceeds the row ceiling",
    async () => {
      // ---------------------------------------------------------------
      // Phase 5 task #2: "too-large export → 413".
      //
      // The route MUST surface the *domain* `tooLarge` signal as 413,
      // not a generic 500. `exportSubjectData` returns
      // `{ status: "tooLarge", totalRows, profile, auditEvents }` once
      // the row ceiling (100,000) is exceeded; the route's job is to
      // translate that into a 413 response.
      //
      // Implementation note (Red-phase optimization):
      //   We do NOT seed 100,001 rows here — that would take ~60-90s
      //   and is impractical for a route-layer integration test. The
      //   domain-level `tooLarge` contract is fully pinned by
      //   `packages/domain/src/__tests__/dsar.integration.test.ts`
      //   (test #5 — "returns tooLarge when row ceiling is exceeded").
      //   This test pins the *route-level* translation only: when the
      //   domain function returns `status: "tooLarge"`, the route
      //   returns 413, not 500 or 200.
      //
      //   The translate-tooLarge-to-413 logic is a one-liner in the
      //   route handler; verifying it once via this mock-based test
      //   is sufficient regression coverage at the route layer.
      // ---------------------------------------------------------------
      // Dynamic mock: force exportSubjectData to return tooLarge.
      // vi.doMock is NOT hoisted (unlike vi.mock), so it can be applied
      // per-test without affecting the other tests in this file.
      // After vi.resetModules(), the route module is re-imported with
      // the mock active.
      vi.doMock("@reading-advantage/domain/audit/dsar", () => ({
        exportSubjectData: vi.fn().mockResolvedValue({
          status: "tooLarge",
          profile: {
            id: SUBJECT_A_ID,
            username: SUBJECT_A_ID,
            name: "Subject A",
            email: "subject-a@dsar-route.test",
            role: "STUDENT",
            schoolId: SCHOOL_A_ID,
            createdAt: new Date("2026-06-01T00:00:00Z"),
          },
          auditEvents: [],
          totalRows: 100_001,
        }),
        DSAR_ROW_CEILING: 100_000,
      }));

      vi.resetModules();
      const { GET: MockedGET } = await import("./route");

      try {
        const admin = (
          await db.select().from(users).where(sql`id = ${ADMIN_A_ID}`).limit(1)
        )[0] as UserRow;
        const session = await createSession(admin.id);
        mockCookies.get.mockReturnValue({ value: session.token });

        const res = await MockedGET(buildRequest(`?userId=${SUBJECT_A_ID}`));
        expect(res.status).toBe(413);
      } finally {
        vi.doUnmock("@reading-advantage/domain/audit/dsar");
        vi.resetModules();
      }
    },
  );
});

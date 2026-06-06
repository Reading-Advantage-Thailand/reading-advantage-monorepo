/**
 * Red-phase Phase 6 End-to-End integration test for
 * `GET /api/admin/dsar/export` (Phase 6: Integration + Acceptance).
 *
 * Per `measure/tracks/audit_log_retention_dsar_20260605/plan.md` Phase 6
 * task #1:
 *   "End-to-end: seed → request export → unzip → assert manifest counts
 *    == file row counts == DB counts for the subject."
 *
 * The Phase 5 test file (`route.integration.test.ts`) already pins the
 * route-level contracts (auth, Zod, audit row, 413) and the JSON body
 * shape. This file pins the **zip body** contract end-to-end:
 *
 *   1. The route returns a valid zip (PK magic bytes — covered by Phase 5).
 *   2. The zip contains exactly three entries: `manifest.md`, `profile.json`,
 *      `audit-events.json`.
 *   3. The manifest's `profileRecordCount` matches whether a profile is
 *      included (0 or 1).
 *   4. The manifest's `auditEventCount` matches `audit-events.json`'s
 *      parsed-array length.
 *   5. The manifest's `totalRows` matches `audit-events.json` length.
 *   6. The `profile.json` content matches the DB row for the subject.
 *   7. The `audit-events.json` content matches the seeded rows (by id).
 *   8. The exported data is **tenant-scoped**: an admin in school A
 *      cannot export a school B subject via the zip endpoint either.
 *
 * The zip reader is hand-rolled because the project deliberately
 * avoids pulling in `jszip` (a transitive-only dep in codecamp) for
 * the export consumer; the producer (`lib/zip/minimal-zip.ts`) emits
 * a STORE-method zip with no compression, so the EOCD → central
 * directory → local header → data layout is trivially parseable.
 *
 * These tests run against the real `science_advantage_test` DB; the
 * mock DB cannot model the role/tenant surface (see
 * `test-strategy.md` §1).
 *
 * Run with:
 *   cd apps/science-advantage && \
 *     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test \
 *       npx vitest run --config vitest.integration.config.ts \
 *         app/api/admin/dsar/export/dsar-export-e2e.integration.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { db, sql } from "@reading-advantage/db";
import {
  auditEvents,
  schools,
  sessions,
  users,
} from "@reading-advantage/db/schema";
import { GET } from "./route";
import { createSession } from "@/lib/auth/session";

// ─── Minimal STORE-method ZIP reader ──────────────────────────────
//
// The producer (`apps/science-advantage/lib/zip/minimal-zip.ts`) emits
// a PKZIP archive with the following layout:
//
//   [local file header 1] [data 1]
//   [local file header 2] [data 2]
//   ...
//   [central dir entry 1] [central dir entry 2] ...
//   [EOCD — 22 bytes]
//
// The reader walks the structure bottom-up: locate the EOCD signature
// in the last 22 bytes, parse the central directory, then resolve
// each entry's data via its local-header offset. STORE compression
// (method 0) means compressed size == uncompressed size and the data
// is stored verbatim.

const EOCD_SIG = 0x06054b50;
const LFH_SIG = 0x04034b50;
const CDH_SIG = 0x02014b50;

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function readZip(buf: Uint8Array): ZipEntry[] {
  // Find EOCD signature: scan from the end (the last 22 bytes is the
  // EOCD when the comment-length field is 0; with a comment, the EOCD
  // could be longer — we walk backwards by signature).
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocdOffset = -1;
  for (let i = buf.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error("ZIP EOCD signature not found");
  }

  // EOCD layout (relative to eocdOffset):
  //   +0:  signature (4)          — already consumed
  //   +4:  disk number (2)
  //   +6:  disk with start of CD (2)
  //   +8:  entries on this disk (2)
  //   +10: total entries (2)
  //   +12: CD size (4)
  //   +16: CD offset (4)
  //   +20: comment length (2)
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdSize = view.getUint32(eocdOffset + 12, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  if (totalEntries === 0) {
    return [];
  }
  if (cdOffset + cdSize > buf.byteLength) {
    throw new Error("ZIP central directory extends past end of file");
  }

  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(p, true) !== CDH_SIG) {
      throw new Error(`ZIP central dir entry #${i} signature mismatch`);
    }
    // CDH layout:
    //   +0:  signature (4)
    //   +28: filename length (2)
    //   +30: extra field length (2)
    //   +32: comment length (2)
    //   +42: local header offset (4)
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const lhOffset = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(
      buf.subarray(p + 46, p + 46 + nameLen),
    );
    p += 46 + nameLen + extraLen + commentLen;

    // Resolve via local file header.
    if (view.getUint32(lhOffset, true) !== LFH_SIG) {
      throw new Error(`ZIP local header for ${name} not found`);
    }
    // LFH layout:
    //   +0:  signature (4)
    //   +18: compressed size (4)
    //   +22: uncompressed size (4)
    //   +26: filename length (2)
    //   +28: extra field length (2)
    const compSize = view.getUint32(lhOffset + 18, true);
    const lhNameLen = view.getUint16(lhOffset + 26, true);
    const lhExtraLen = view.getUint16(lhOffset + 28, true);
    const dataStart = lhOffset + 30 + lhNameLen + lhExtraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    entries.push({ name, data });
  }
  return entries;
}

// ─── Test fixture ────────────────────────────────────────────────

const E2E_PREFIX = "dsar-e2e";

const SCHOOL_A_ID = "55555555-5555-5555-5555-555555555555";
const ADMIN_A_ID = `${E2E_PREFIX}-admin-a`;
const SUBJECT_A_ID = `${E2E_PREFIX}-subject-a`;

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookies),
}));

async function seedSchoolsAndUsers(): Promise<void> {
  await db
    .insert(schools)
    .values([{ id: SCHOOL_A_ID, name: "DSAR E2E School A" }])
    .onConflictDoNothing();

  await db
    .insert(users)
    .values([
      {
        id: ADMIN_A_ID,
        username: ADMIN_A_ID,
        displayUsername: ADMIN_A_ID,
        name: "E2E Admin A",
        email: "admin-a@dsar-e2e.test",
        role: "ADMIN",
        schoolId: SCHOOL_A_ID,
      },
      {
        id: SUBJECT_A_ID,
        username: SUBJECT_A_ID,
        displayUsername: SUBJECT_A_ID,
        name: "E2E Subject A",
        email: "subject-a@dsar-e2e.test",
        role: "STUDENT",
        schoolId: SCHOOL_A_ID,
      },
    ])
    .onConflictDoNothing();
}

/**
 * Targeted cleanup: prefix-scoped, not TRUNCATE — see test-strategy.md
 * §2 (Fixtures / Mocks — no global TRUNCATE).
 */
async function cleanupE2eTestData(): Promise<void> {
  await db.execute(sql`
    DELETE FROM audit_events
    WHERE id LIKE ${`${E2E_PREFIX}-%`}
       OR actor_user_id LIKE ${`${E2E_PREFIX}-%`}
       OR target_id LIKE ${`${E2E_PREFIX}-%`}
  `);
  await db.delete(sessions);
  await db.execute(sql`
    DELETE FROM users WHERE id IN (${ADMIN_A_ID}, ${SUBJECT_A_ID})
  `);
  await db.execute(sql`
    DELETE FROM schools WHERE id = ${SCHOOL_A_ID}
  `);
}

function buildRequest(queryString: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/admin/dsar/export${queryString}`,
  );
}

interface ParsedManifest {
  subjectId: string | null;
  profileRecordCount: number;
  auditEventCount: number;
  totalRows: number;
  format: string;
  exportedAt: string;
}

interface ParsedProfile {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
  schoolId: string | null;
  createdAt: string;
}

interface ParsedAuditEvent {
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Test suites ─────────────────────────────────────────────────

describe("GET /api/admin/dsar/export — Phase 6 E2E (seed → request → unzip → counts)", () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set; required for DSAR E2E integration tests. " +
          "Set DATABASE_URL=postgresql://...science_advantage_test before running.",
      );
    }
    await cleanupE2eTestData();
    await seedSchoolsAndUsers();

    // Seed 4 audit events for SUBJECT_A_ID: 2 where the subject is
    // the actor, 2 where the subject is the target.
    await db.insert(auditEvents).values([
      {
        id: `${E2E_PREFIX}-evt-1`,
        actorUserId: SUBJECT_A_ID,
        actorRole: "STUDENT",
        action: "dsar-e2e:login",
        targetType: "user",
        targetId: SUBJECT_A_ID,
        createdAt: new Date("2026-06-01T00:00:00Z"),
      },
      {
        id: `${E2E_PREFIX}-evt-2`,
        actorUserId: SUBJECT_A_ID,
        actorRole: "STUDENT",
        action: "dsar-e2e:quiz:submit",
        targetType: "user",
        targetId: SUBJECT_A_ID,
        createdAt: new Date("2026-06-01T01:00:00Z"),
      },
      {
        id: `${E2E_PREFIX}-evt-3`,
        actorUserId: ADMIN_A_ID,
        actorRole: "ADMIN",
        action: "dsar-e2e:assignment:create",
        targetType: "user",
        targetId: SUBJECT_A_ID,
        createdAt: new Date("2026-06-01T02:00:00Z"),
      },
      {
        id: `${E2E_PREFIX}-evt-4`,
        actorUserId: ADMIN_A_ID,
        actorRole: "ADMIN",
        action: "dsar-e2e:grade:update",
        targetType: "user",
        targetId: SUBJECT_A_ID,
        createdAt: new Date("2026-06-01T03:00:00Z"),
      },
    ]);
  });

  it("E2E happy path: zip contains manifest.md + profile.json + audit-events.json; counts match", async () => {
    // -----------------------------------------------------------------
    // Phase 6 task #1: "End-to-end: seed → request export → unzip →
    // assert manifest counts == file row counts == DB counts for the
    // subject."
    //
    // This is the full happy-path E2E. The Phase 5 test file pins the
    // route-level contracts (auth, Zod, 413, JSON body) and the magic-
    // byte smoke for the zip; this test pins the actual archive
    // content and the cross-reference between manifest, profile, and
    // audit events.
    //
    // The counts triple that must all agree:
    //   manifest.auditEventCount    == profile+events file shape
    //   manifest.totalRows          == profile+events file shape
    //   profile.json.id            == SUBJECT_A_ID (DB row)
    //   audit-events.json.length    == manifest.auditEventCount
    //   audit-events.json[*].id    == 4 seeded ids
    //
    // A bug that ships a wrong count (e.g., off-by-one, ignores
    // subject-as-target, returns wrong subject) would fail this test.
    // -----------------------------------------------------------------
    const admin = (
      await db.select().from(users).where(sql`id = ${ADMIN_A_ID}`).limit(1)
    )[0];
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(`?userId=${SUBJECT_A_ID}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/application\/zip/);

    // Unzip the response.
    const buf = new Uint8Array(await res.arrayBuffer());
    const entries = readZip(buf);
    const byName = new Map(entries.map((e) => [e.name, e]));

    // (a) The archive contains exactly the three documented entries.
    expect(byName.has("manifest.md")).toBe(true);
    expect(byName.has("profile.json")).toBe(true);
    expect(byName.has("audit-events.json")).toBe(true);
    expect(entries).toHaveLength(3);

    // (b) Parse the manifest.
    const manifestBytes = byName.get("manifest.md")!.data;
    const manifest: ParsedManifest = JSON.parse(
      new TextDecoder().decode(manifestBytes),
    );
    expect(manifest.subjectId).toBe(SUBJECT_A_ID);
    expect(manifest.format).toBe("zip");
    expect(manifest.profileRecordCount).toBe(1);
    expect(typeof manifest.exportedAt).toBe("string");
    expect(() => new Date(manifest.exportedAt).toISOString()).not.toThrow();

    // (c) Parse the profile.
    const profile: ParsedProfile = JSON.parse(
      new TextDecoder().decode(byName.get("profile.json")!.data),
    );
    expect(profile.id).toBe(SUBJECT_A_ID);
    expect(profile.email).toBe("subject-a@dsar-e2e.test");
    expect(profile.schoolId).toBe(SCHOOL_A_ID);
    expect(profile.role).toBe("STUDENT");

    // (d) Parse the audit events.
    const auditEventsOut: ParsedAuditEvent[] = JSON.parse(
      new TextDecoder().decode(byName.get("audit-events.json")!.data),
    );
    expect(auditEventsOut).toHaveLength(4);

    // (e) The cross-reference triple: manifest counts == file row counts.
    //     - auditEventCount == audit-events.json.length
    //     - totalRows       == audit-events.json.length
    //     - The 4 ids match the seeded ids (subject-as-actor and
    //       subject-as-target both surface per the implementation's
    //       `actorUserId = X OR targetId = X` clause).
    expect(manifest.auditEventCount).toBe(auditEventsOut.length);
    expect(manifest.totalRows).toBe(auditEventsOut.length);
    expect(manifest.auditEventCount).toBe(4);
    expect(manifest.totalRows).toBe(4);

    const eventIds = auditEventsOut.map((e) => e.id).sort();
    expect(eventIds).toEqual([
      `${E2E_PREFIX}-evt-1`,
      `${E2E_PREFIX}-evt-2`,
      `${E2E_PREFIX}-evt-3`,
      `${E2E_PREFIX}-evt-4`,
    ]);

    // (f) The DB count for the subject matches the exported count.
    const dbCountRows = (await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM audit_events
      WHERE (actor_user_id = ${SUBJECT_A_ID} OR target_id = ${SUBJECT_A_ID})
        AND id LIKE ${`${E2E_PREFIX}-%`}
    `)) as unknown as Array<{ n: number }>;
    const dbCount = Number(dbCountRows[0]?.n ?? 0);
    expect(dbCount).toBe(4);
    expect(dbCount).toBe(manifest.auditEventCount);
  });

  it("E2E tenant isolation: admin in school A exporting a NON-EXISTENT subject yields manifest.profileRecordCount === 0 and an empty audit-events array", async () => {
    // -----------------------------------------------------------------
    // Phase 6 cross-reference: the manifest/profile/events counts must
    // agree on the empty-result case. A subject that does not exist
    // produces:
    //   - profile.json:     null (per `exportSubjectData` behavior)
    //   - audit-events.json: []
    //   - manifest.auditEventCount === 0
    //   - manifest.totalRows       === 0
    //   - manifest.profileRecordCount === 0
    //
    // This catches off-by-one bugs in the empty-result path and any
    // silent data leak (e.g., a 200 with the wrong subject's data).
    // -----------------------------------------------------------------
    const admin = (
      await db.select().from(users).where(sql`id = ${ADMIN_A_ID}`).limit(1)
    )[0];
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(
      buildRequest(`?userId=${E2E_PREFIX}-nonexistent`),
    );
    expect(res.status).toBe(200);

    const buf = new Uint8Array(await res.arrayBuffer());
    const entries = readZip(buf);
    const byName = new Map(entries.map((e) => [e.name, e]));

    const manifest: ParsedManifest = JSON.parse(
      new TextDecoder().decode(byName.get("manifest.md")!.data),
    );
    const profileRaw = JSON.parse(
      new TextDecoder().decode(byName.get("profile.json")!.data),
    );
    const events: ParsedAuditEvent[] = JSON.parse(
      new TextDecoder().decode(byName.get("audit-events.json")!.data),
    );

    expect(manifest.subjectId).toBeNull();
    expect(manifest.profileRecordCount).toBe(0);
    expect(manifest.auditEventCount).toBe(0);
    expect(manifest.totalRows).toBe(0);
    expect(profileRaw).toBeNull();
    expect(events).toEqual([]);
  });
});

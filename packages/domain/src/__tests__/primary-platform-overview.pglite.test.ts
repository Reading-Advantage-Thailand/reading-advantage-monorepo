import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { NOW, SCHOOL_A, SCHOOL_B, seedDashboard, seedLicenses } from "./helpers/dashboardSeed.js";
import { getPlatformOverview } from "../primary-dashboards/platform.js";
import { platformOverviewSchema } from "../primary-dashboards/platform-contracts.js";

const SCHOOL_Q = "10000000-0000-4000-8000-0000000000d1"; // students, all events older than 7 days
const SCHOOL_E = "10000000-0000-4000-8000-0000000000e1"; // no students
const system: UserContext = { id: "sys", username: "sys", name: "sys", role: "SYSTEM", schoolId: null, xp: 0, level: 1, cefrLevel: "A1-" };

describe("getPlatformOverview (PGlite: one active, one quiet, one without students)", () => {
  let h: TestDb;
  let db: DB;

  beforeAll(async () => {
    h = await createTestDb();
    db = h.db as unknown as DB;
    await seedDashboard(h);
    for (const statement of [
      "set session_replication_role = replica",
      `insert into schools (id, name) values ('${SCHOOL_Q}', 'A Quiet School'), ('${SCHOOL_E}', 'Empty School')`,
      `insert into users (id, username, display_username, name, role, school_id, created_at) values
        ('q1', 'q1', 'q1', 'q1', 'STUDENT', '${SCHOOL_Q}', '2026-01-01T00:00:00'),
        ('q2', 'q2', 'q2', 'q2', 'STUDENT', '${SCHOOL_Q}', '2026-01-01T00:00:00'),
        ('nos', 'nos', 'nos', 'nos', 'STUDENT', null, '2026-01-01T00:00:00')`,
      // The last event of the quiet school is 7 days ago in Bangkok (5 Oct 10:00): outside the window.
      `insert into user_activity (user_id, activity_type, created_at, target_id) values ('q1', 'ARTICLE_READ', '2026-10-05T03:00:00', 'q-a1'), ('nos', 'ARTICLE_READ', '2026-10-12T02:00:00', 'n-a1')`,
      "set session_replication_role = origin",
    ]) await h.db.execute(sql.raw(statement));
  }, 120_000);
  beforeEach(async () => {
    await h.db.execute(sql.raw("delete from licenses"));
  });
  afterAll(async () => h?.close());

  it("returns the totals and one row for each school; quiet schools come first", async () => {
    await seedLicenses(h, [{ maxUsers: 100, status: "active", expiry: null }]);
    const out = await getPlatformOverview({ db, user: system, now: NOW });
    expect(platformOverviewSchema.parse(out)).toEqual(out);
    expect(out.startDay).toBe("2026-10-06");
    expect(out.endDay).toBe("2026-10-12");
    const named = out.schools.filter((s) => s.name !== "Default School" && [SCHOOL_A, SCHOOL_B, SCHOOL_Q, SCHOOL_E].includes(s.id));
    expect(named.map((s) => [s.name, s.status])).toEqual([
      ["A Quiet School", "quiet"],
      ["School A", "active"],
      ["School B", "active"],
      ["Empty School", "no_students"],
    ]);
    const byId = new Map(out.schools.map((s) => [s.id, s]));
    expect(byId.get(SCHOOL_A)).toMatchObject({
      students: 5, activeStudents: 3, activePercent: 60, articlesOpened: 1, seatsUsed: 5, seats: 100,
      lastActivityAt: "2026-10-12T17:00:00.000Z", lastActivityDay: "2026-10-13",
    });
    expect(byId.get(SCHOOL_Q)).toMatchObject({
      students: 2, activeStudents: 0, activePercent: 0, articlesOpened: 0, seats: null,
      lastActivityAt: "2026-10-05T03:00:00.000Z", lastActivityDay: "2026-10-05",
    });
    expect(byId.get(SCHOOL_E)).toMatchObject({ students: 0, activePercent: null, seats: null, lastActivityAt: null, lastActivityDay: null });
    // Totals: the student without a school is counted apart; seats count only the school with a license.
    expect(out.totals).toMatchObject({
      students: 8, teachers: 4, activeStudents: 4, articlesOpened: 2, seatsUsed: 5, seats: 100, studentsWithoutSchool: 1,
    });
    expect(out.totals.schools).toBe(out.schools.length);
  });

  it("counts the rows of a school in that school only", async () => {
    const out = await getPlatformOverview({ db, user: system, now: NOW });
    const b = out.schools.find((s) => s.id === SCHOOL_B);
    expect(b).toMatchObject({ students: 1, activeStudents: 1, articlesOpened: 1 });
  });

  it("gives ADMIN, TEACHER, and STUDENT FORBIDDEN", async () => {
    for (const role of ["ADMIN", "TEACHER", "STUDENT"] as const) {
      await expect(getPlatformOverview({ db, user: { ...system, role, schoolId: SCHOOL_A }, now: NOW })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });
});

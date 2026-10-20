import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { NOW, SCHOOL_A, SCHOOL_B, seedDashboard, seedLicenses } from "./helpers/dashboardSeed.js";
import { getSchoolDashboard } from "../primary-dashboards/school.js";
import { schoolDashboardSchema } from "../primary-dashboards/school-contracts.js";

const user = (role: UserContext["role"], schoolId: string | null): UserContext => ({
  id: `${role}-user`,
  username: role,
  name: role,
  role,
  schoolId,
  xp: 0,
  level: 1,
  cefrLevel: "A1-",
});

describe("getSchoolDashboard (PGlite, two schools)", () => {
  let h: TestDb;
  let db: DB;
  const admin = user("ADMIN", SCHOOL_A);

  beforeAll(async () => {
    h = await createTestDb();
    db = h.db as unknown as DB;
    await seedDashboard(h);
  }, 120_000);
  beforeEach(async () => {
    await h.db.execute(sql.raw("delete from licenses"));
  });
  afterAll(async () => h?.close());

  it("returns the key numbers of FR-3 for the 7-day range", async () => {
    const out = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range: 7 }, now: NOW });
    expect(schoolDashboardSchema.parse(out)).toEqual(out);
    expect(out.startDay).toBe("2026-10-06");
    expect(out.endDay).toBe("2026-10-12");
    expect(out.kpis).toEqual({
      activeStudents: { active: 3, total: 5, percent: 60 },
      activeTeachers: { active: 2, total: 3 },
      classesWithActivity: { active: 2, total: 3 },
      articlesOpened: 1,
      xpEarned: 77,
      newStudents: 1,
    });
  });

  it("defaults to 30 days and gives 30 for an unknown range", async () => {
    const a = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A }, now: NOW });
    const b = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range: 14 as never }, now: NOW });
    expect(a.range).toBe(30);
    expect(b.range).toBe(30);
    expect(a.kpis.activeStudents).toEqual({ active: 4, total: 5, percent: 80 });
    expect(a.activityByDay.days).toHaveLength(30);
  });

  it("groups adoption by CEFR main level and hides a level with no students", async () => {
    const out = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range: 7 }, now: NOW });
    expect(out.adoptionByCefr).toEqual([
      { key: "A0", students: 1, active: 0, percent: 0, averageXp: 0 },
      { key: "A1", students: 2, active: 2, percent: 100, averageXp: 35 },
      { key: "A2", students: 1, active: 1, percent: 100, averageXp: 7 },
      { key: "B1", students: 1, active: 0, percent: 0, averageXp: 0 },
    ]);
  });

  it("groups adoption by class grade; a student counts in each grade and the no-class row is last", async () => {
    const out = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range: 7 }, now: NOW });
    expect(out.adoptionByGrade).toEqual([
      { key: "4", students: 3, active: 2, percent: 67, averageXp: 23 },
      { key: "5", students: 1, active: 0, percent: 0, averageXp: 0 },
      { key: "none", students: 2, active: 1, percent: 50, averageXp: 4 },
    ]);
  });

  it("builds the teachers table with distinct students, sorted by engagement, no students last", async () => {
    const out = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range: 7 }, now: NOW });
    expect(out.teachers).toEqual([
      { teacherId: "tA1", name: "Name tA1", classes: 2, students: 3, active: 2, engagementPercent: 67 },
      { teacherId: "tA2", name: "Name tA2", classes: 2, students: 2, active: 1, engagementPercent: 50 },
      { teacherId: "tA3", name: "Name tA3", classes: 0, students: 0, active: 0, engagementPercent: null },
    ]);
  });

  it("builds activity by day with the total, the peak day, and the daily average", async () => {
    const out = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range: 7 }, now: NOW });
    expect(out.activityByDay.days.map((d) => d.activeStudents)).toEqual([1, 0, 1, 0, 0, 1, 1]);
    expect(out.activityByDay.totalEvents).toBe(5);
    expect(out.activityByDay.peakDay).toEqual({ day: "2026-10-06", activeStudents: 1 });
    expect(out.activityByDay.dailyAverage).toBe(0.6);
  });

  it("gives no alert when activity is fine and the school has no license (seats 0)", async () => {
    const out = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range: 7 }, now: NOW });
    expect(out.alerts).toEqual([]);
  });

  it("raises the license and seat alerts, sorted critical first", async () => {
    await seedLicenses(h, [{ maxUsers: 5, status: "active", expiry: "2026-10-20T05:00:00" }]);
    const out = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range: 7 }, now: NOW });
    expect(out.alerts).toEqual([
      { code: "seats-nearly-full", severity: "critical", values: { seatsUsed: 5, seats: 5, percent: 100 } },
      { code: "license-ends-soon", severity: "medium", values: { days: 8 } },
    ]);
  });

  it("raises the license ended alert", async () => {
    await seedLicenses(h, [{ maxUsers: 5, status: "active", expiry: "2026-10-01T05:00:00" }]);
    const out = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range: 7 }, now: NOW });
    expect(out.alerts).toEqual([{ code: "license-ended", severity: "critical", values: {} }]);
  });

  it("judges low activity on the last 30 days whatever the range (alert ignores the range)", async () => {
    // Move now forward 40 days: nobody is active in the last 30 days.
    const later = new Date(NOW.getTime() + 40 * 86_400_000);
    for (const range of [7, 30, 90] as const) {
      const out = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range }, now: later });
      expect(out.alerts.find((a) => a.code === "low-activity")).toEqual({
        code: "low-activity",
        severity: "high",
        values: { active: 0, total: 5, percent: 0 },
      });
    }
    // In the 7-day range of NOW, 60 percent are active; the 30-day figure (80 percent) gives no alert.
    const out7 = await getSchoolDashboard({ db, user: admin, input: { schoolId: SCHOOL_A, range: 7 }, now: NOW });
    expect(out7.alerts.some((a) => a.code === "low-activity")).toBe(false);
  });

  it("returns the data of school B only for school B and never mixes the schools", async () => {
    const out = await getSchoolDashboard({ db, user: user("SYSTEM", null), input: { schoolId: SCHOOL_B, range: 7 }, now: NOW });
    expect(out.kpis.activeStudents).toEqual({ active: 1, total: 1, percent: 100 });
    expect(out.kpis.xpEarned).toBe(1000);
    expect(out.kpis.activeTeachers).toEqual({ active: 1, total: 1 });
    expect(out.adoptionByGrade).toEqual([{ key: "4", students: 1, active: 1, percent: 100, averageXp: 1000 }]);
    expect(out.teachers.map((t) => t.teacherId)).toEqual(["tB"]);
  });

  it("returns empty-but-valid data for a school with no rows", async () => {
    const empty = "10000000-0000-4000-8000-0000000000cc";
    const out = await getSchoolDashboard({ db, user: user("SYSTEM", null), input: { schoolId: empty, range: 7 }, now: NOW });
    expect(out.kpis.activeStudents).toEqual({ active: 0, total: 0, percent: null });
    expect(out.adoptionByCefr).toEqual([]);
    expect(out.adoptionByGrade).toEqual([]);
    expect(out.teachers).toEqual([]);
    expect(out.alerts).toEqual([]);
    expect(out.activityByDay.peakDay).toBeNull();
  });

  describe("permissions", () => {
    it.each(["STUDENT", "TEACHER"] as const)("gives %s FORBIDDEN and runs no query", async (role) => {
      const execute = vi.fn();
      const stub = { execute } as unknown as DB;
      await expect(
        getSchoolDashboard({ db: stub, user: user(role, SCHOOL_A), input: { schoolId: SCHOOL_A }, now: NOW }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(execute).not.toHaveBeenCalled();
    });

    it("gives an ADMIN of school A FORBIDDEN for school B and runs no query", async () => {
      const execute = vi.fn();
      await expect(
        getSchoolDashboard({ db: { execute } as unknown as DB, user: admin, input: { schoolId: SCHOOL_B }, now: NOW }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(execute).not.toHaveBeenCalled();
    });

    it("gives an ADMIN with no school FORBIDDEN", async () => {
      const execute = vi.fn();
      await expect(
        getSchoolDashboard({ db: { execute } as unknown as DB, user: user("ADMIN", null), input: { schoolId: SCHOOL_A }, now: NOW }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("lets SYSTEM read any school", async () => {
      const out = await getSchoolDashboard({ db, user: user("SYSTEM", null), input: { schoolId: SCHOOL_A, range: 7 }, now: NOW });
      expect(out.schoolId).toBe(SCHOOL_A);
    });

    it("rejects a school id that is not a UUID", async () => {
      await expect(
        getSchoolDashboard({ db, user: user("SYSTEM", null), input: { schoolId: "not-a-uuid" }, now: NOW }),
      ).rejects.toThrow();
    });
  });
});

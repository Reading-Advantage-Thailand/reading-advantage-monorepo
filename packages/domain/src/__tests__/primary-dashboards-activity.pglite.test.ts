import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { NOW, SCHOOL_A, SCHOOL_B, seedDashboard } from "./helpers/dashboardSeed.js";
import {
  countActiveStudents,
  countActiveStudentsByClass,
  countActiveStudentsByDay,
  countActivityEvents,
  countArticlesOpened,
  countNewStudents,
  getAverageLevel,
  getClassStudentStats,
  getLastActivityAt,
  getLastActivityByStudent,
  sumXpEarned,
  sumXpEarnedByClass,
} from "../primary-dashboards/activity.js";
import { dashboardWindow } from "../primary-dashboards/window.js";

describe("shared activity counts (PGlite, two schools)", () => {
  let h: TestDb;
  let db: DB;
  const scopeA = { kind: "school" as const, schoolId: SCHOOL_A };
  const scopeB = { kind: "school" as const, schoolId: SCHOOL_B };
  const w7 = dashboardWindow(7, NOW);
  const w30 = dashboardWindow(30, NOW);

  beforeAll(async () => {
    h = await createTestDb();
    db = h.db as unknown as DB;
    await seedDashboard(h);
  }, 120_000);
  afterAll(async () => h?.close());

  it("counts a student active with any of the three event sources, in [start, end)", async () => {
    // s1: user_activity + xp; s2: xp + lesson step; s5: xp exactly at the start. s4: user_activity exactly at the end (excluded).
    expect(await countActiveStudents({ db, scope: scopeA, window: w7 })).toEqual({ active: 3, total: 5, percent: 60 });
    // 30 days adds s3 (user_activity on 20 September).
    expect(await countActiveStudents({ db, scope: scopeA, window: w30 })).toEqual({ active: 4, total: 5, percent: 80 });
  });

  it("counts only lesson steps with the status done", async () => {
    // s2 has an in_progress step with a done_at value on 9 October: it is not an event.
    expect(await countActivityEvents({ db, scope: scopeA, window: w7 })).toBe(5);
  });

  it("counts active students by Bangkok day (23:30 and 01:00 count on the Bangkok day)", async () => {
    const days = await countActiveStudentsByDay({ db, scope: scopeA, window: w7 });
    expect(days).toHaveLength(7);
    expect(days.at(-1)?.day).toBe("2026-10-12");
    const nonZero = days.filter((d) => d.activeStudents > 0);
    // 6 Oct 00:00 (s5), 8 Oct (s2 step), 11 Oct 23:30 (s2 xp), 12 Oct 01:00 and 09:00 (s1, one student).
    expect(nonZero).toEqual([
      { day: "2026-10-06", activeStudents: 1 },
      { day: "2026-10-08", activeStudents: 1 },
      { day: "2026-10-11", activeStudents: 1 },
      { day: "2026-10-12", activeStudents: 1 },
    ]);
  });

  it("counts articles opened, XP earned, and new students in the window", async () => {
    expect(await countArticlesOpened({ db, scope: scopeA, window: w7 })).toBe(1);
    expect(await countArticlesOpened({ db, scope: scopeA, window: w30 })).toBe(2);
    expect(await sumXpEarned({ db, scope: scopeA, window: w7 })).toBe(77);
    expect(await countNewStudents({ db, scope: scopeA, window: w7 })).toBe(1);
  });

  it("finds the last activity event of the scope", async () => {
    // The last event of school A is the user_activity row at exactly 2026-10-12T17:00:00Z.
    expect((await getLastActivityAt({ db, scope: scopeA }))?.toISOString()).toBe("2026-10-12T17:00:00.000Z");
  });

  it("never counts the rows of the other school", async () => {
    expect(await countActiveStudents({ db, scope: scopeB, window: w7 })).toEqual({ active: 1, total: 1, percent: 100 });
    expect(await sumXpEarned({ db, scope: scopeB, window: w7 })).toBe(1000);
    expect(await countArticlesOpened({ db, scope: scopeB, window: w7 })).toBe(1);
    expect(await countActivityEvents({ db, scope: scopeB, window: w7 })).toBe(4);
    expect(await countNewStudents({ db, scope: scopeB, window: w7 })).toBe(0);
  });

  it("returns zeros and a null percent for a school with no students", async () => {
    const none = { kind: "school" as const, schoolId: "10000000-0000-4000-8000-0000000000cc" };
    expect(await countActiveStudents({ db, scope: none, window: w7 })).toEqual({ active: 0, total: 0, percent: null });
    expect(await getLastActivityAt({ db, scope: none })).toBeNull();
  });

  describe("classes scope (teacher home)", () => {
    // C1: s1 s2. C2: s1 s3. C3: s3. C4 (archived): s4. CB belongs to school B. s5 has no class.
    const C1 = "20000000-0000-4000-8000-000000000001";
    const C2 = "20000000-0000-4000-8000-000000000002";
    const C3 = "20000000-0000-4000-8000-000000000003";
    const C4 = "20000000-0000-4000-8000-000000000004";
    const CB = "20000000-0000-4000-8000-0000000000bb";
    const classes = { kind: "classes" as const, schoolId: SCHOOL_A, classIds: [C1, C2, C3] };

    beforeAll(async () => {
      await h.db.execute(sql.raw(`update users set level = 2 where id = 's1'`));
      await h.db.execute(sql.raw(`update users set level = 3 where id = 's2'`));
      await h.db.execute(sql.raw(`update users set level = 4 where id = 's3'`));
    });

    it("counts a student in two classes one time in the totals and one time in each class", async () => {
      // s1 and s2 are active in 7 days; s3 is not. s1 is in C1 and C2.
      expect(await countActiveStudents({ db, scope: classes, window: w7 })).toEqual({ active: 2, total: 3, percent: 67 });
      expect(await countActiveStudents({ db, scope: classes, window: w30 })).toEqual({ active: 3, total: 3, percent: 100 });
      const byClass = await countActiveStudentsByClass({ db, scope: classes, window: w7 });
      expect([...byClass]).toEqual([[C1, 2], [C2, 1], [C3, 0]]);
    });

    it("counts students, the mean level, and the XP of each class", async () => {
      expect(await getClassStudentStats({ db, scope: classes })).toEqual([
        { classId: C1, students: 2, averageLevel: 2.5 },
        { classId: C2, students: 2, averageLevel: 3 },
        { classId: C3, students: 1, averageLevel: 4 },
      ]);
      expect(await getAverageLevel({ db, scope: classes })).toBe(3);
      // s1 earned 50 and s2 earned 20 in the last 7 days.
      expect([...(await sumXpEarnedByClass({ db, scope: classes, window: w7 }))]).toEqual([[C1, 70], [C2, 50], [C3, 0]]);
      expect(await sumXpEarned({ db, scope: classes, window: w7 })).toBe(70);
    });

    it("finds the last activity of each student with the shared event rule", async () => {
      const last = await getLastActivityByStudent({ db, scope: classes });
      expect(last.get("s1")?.toISOString()).toBe("2026-10-12T02:00:00.000Z");
      // The newest event of s2 is the XP row, which is newer than its lesson step.
      expect(last.get("s2")?.toISOString()).toBe("2026-10-11T16:30:00.000Z");
      expect(last.get("s3")?.toISOString()).toBe("2026-09-20T05:00:00.000Z");
      expect(last.has("s4")).toBe(false);
    });

    it("ignores the classes that the scope does not list, an archived class, and a class of school B", async () => {
      const one = { kind: "classes" as const, schoolId: SCHOOL_A, classIds: [C1] };
      expect(await countActiveStudents({ db, scope: one, window: w30 })).toEqual({ active: 2, total: 2, percent: 100 });
      // C4 lists s4, who has an event in the window end only; school B class CB is named with school A.
      const other = { kind: "classes" as const, schoolId: SCHOOL_A, classIds: [C4, CB] };
      expect(await countActiveStudents({ db, scope: other, window: w30 })).toEqual({ active: 0, total: 1, percent: 0 });
      expect(await sumXpEarned({ db, scope: other, window: w30 })).toBe(0);
      expect([...(await sumXpEarnedByClass({ db, scope: other, window: w30 }))]).toEqual([[C4, 0], [CB, 0]]);
    });

    it("gives zeros for a scope with no class", async () => {
      const none = { kind: "classes" as const, schoolId: SCHOOL_A, classIds: [] };
      expect(await countActiveStudents({ db, scope: none, window: w7 })).toEqual({ active: 0, total: 0, percent: null });
      expect(await getAverageLevel({ db, scope: none })).toBeNull();
      expect(await getClassStudentStats({ db, scope: none })).toEqual([]);
    });

    it("refuses a count by class for a school scope", async () => {
      await expect(countActiveStudentsByClass({ db, scope: scopeA, window: w7 })).rejects.toThrow(/kind classes/);
    });
  });
});

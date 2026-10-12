import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { NOW, SCHOOL_A, SCHOOL_B, seedDashboard } from "./helpers/dashboardSeed.js";
import {
  countActiveStudents,
  countActiveStudentsByDay,
  countActivityEvents,
  countArticlesOpened,
  countNewStudents,
  getLastActivityAt,
  sumXpEarned,
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
});

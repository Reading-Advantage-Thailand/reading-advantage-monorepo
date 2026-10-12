import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { NOW, SCHOOL_A, SCHOOL_B, seedDashboard } from "./helpers/dashboardSeed.js";
import { getTeacherHome } from "../primary-home/teacher-home.js";
import { teacherHomeOutput } from "../primary-home/teacher-contracts.js";

const C1 = "20000000-0000-4000-8000-000000000001";
const C2 = "20000000-0000-4000-8000-000000000002";
const C3 = "20000000-0000-4000-8000-000000000003";
const A1 = "40000000-0000-4000-8000-000000000001";
const A2 = "40000000-0000-4000-8000-000000000002";
const A3 = "40000000-0000-4000-8000-000000000003";

const teacher = (id: string, schoolId: string) => ({ id, username: id, name: id, role: "TEACHER" as const, schoolId, xp: 0, level: 1, cefrLevel: null });

describe("getTeacherHome numbers and class rows (PGlite, two schools)", () => {
  let h: TestDb;
  let db: DB;

  /** Runs raw statements with foreign keys off, as the dashboard seed does. */
  const run = async (statements: string[]) => {
    await h.db.execute(sql.raw("set session_replication_role = replica"));
    for (const statement of statements) await h.db.execute(sql.raw(statement));
    await h.db.execute(sql.raw("set session_replication_role = origin"));
  };

  beforeAll(async () => {
    h = await createTestDb();
    db = h.db as unknown as DB;
    await seedDashboard(h);
    await run([
      "update users set level = 2 where id = 's1'",
      "update users set level = 3 where id = 's2'",
      "update users set level = 4 where id = 's3'",
      // s6: STUDENT of C1 whose only event is a done lesson step two days ago.
      `insert into users (id, username, display_username, name, role, school_id, cefr_level) values ('s6', 's6', 's6', 'Name s6', 'STUDENT', '${SCHOOL_A}', 'A1-')`,
      `insert into classroom_students (classroom_id, student_id) values ('${C1}', 's6'), ('${C1}', 'tA3'), ('${C2}', 'sb1')`,
      `insert into primary_student_lesson_steps (class_book_id, student_id, lesson_number, app_step, status, done_at) values
        ('30000000-0000-4000-8000-000000000001', 's6', 1, 1, 'done', '2026-10-10T05:00:00')`,
      // Assignments: A1 in C1, A2 in C3, A3 in C2.
      `insert into assignments (id, title, classroom_id, teacher_id, type) values
        ('${A1}', 'One', '${C1}', 'tA1', 'READING'), ('${A2}', 'Two', '${C3}', 'tA2', 'READING'), ('${A3}', 'Three', '${C2}', 'tA1', 'READING')`,
      // s1 finished today (completed_at) and updated long ago: counts.
      // s2 finished 23:30 on 11 October in Bangkok but was updated today: does not count (completed_at, not updated_at).
      // C3: s3 finished today. C2: s3 is completed with no completed_at: does not count.
      `insert into student_assignments (assignment_id, student_id, completed, status, completed_at, updated_at) values
        ('${A1}', 's1', true, null, '2026-10-12T02:00:00', '2026-10-01T00:00:00'),
        ('${A1}', 's2', false, 'COMPLETED', '2026-10-11T16:30:00', '2026-10-12T02:00:00'),
        ('${A2}', 's3', true, null, '2026-10-12T03:00:00', '2026-10-12T03:00:00'),
        ('${A3}', 's3', true, null, null, '2026-10-12T03:00:00')`,
    ]);
  }, 120_000);
  afterAll(async () => h?.close());

  it("returns the summary numbers of the teacher's classes", async () => {
    const out = await getTeacherHome({ db, user: teacher("tA1", SCHOOL_A), now: NOW });

    // Students: s1 s2 s3 s6. The teacher tA3 in C1 and the school B student sb1 in C2 are not students of this home.
    expect(out.studentCount).toBe(4);
    expect(out).toMatchObject({
      activeStudents30d: 4,
      engagementRate30d: 100,
      averageLevel: 2.5,
      // Only s1 has an event on 12 October (Bangkok).
      activeToday: 1,
      completedToday: 1,
    });
    expect(() => teacherHomeOutput.parse(out)).not.toThrow();
  });

  it("returns one row for each class with the 7-day numbers, the trend, and the status", async () => {
    const out = await getTeacherHome({ db, user: teacher("tA1", SCHOOL_A), now: NOW });

    expect(out.classRows).toEqual([
      { id: C1, name: "C1", grade: 4, students: 3, active7d: 3, activeRate7d: 100, averageLevel: 2, xp7d: 70, xpPrevious7d: 0, trend: "up", status: "onTrack" },
      { id: C2, name: "C2", grade: 4, students: 2, active7d: 1, activeRate7d: 50, averageLevel: 3, xp7d: 50, xpPrevious7d: 0, trend: "up", status: "someQuiet" },
    ]);
    expect(out.classes.map((row) => row.studentCount)).toEqual([3, 2]);
  });

  it("sees a lesson step as activity in the list of students who need help", async () => {
    const out = await getTeacherHome({ db, user: teacher("tA1", SCHOOL_A), now: NOW });

    // s6 has only a lesson step (2 days ago): active. s3 has no event for 22 days: needs help.
    expect(out.needsHelp.map((student) => student.studentId)).toEqual(["s3"]);
  });

  it("reads only the classes that the teacher owns or co-teaches", async () => {
    const out = await getTeacherHome({ db, user: teacher("tA2", SCHOOL_A), now: NOW });

    // tA2 owns C3 and co-teaches C2: students s1 s3 (sb1 is school B).
    expect(out.classRows.map((row) => row.id)).toEqual([C2, C3]);
    expect(out.studentCount).toBe(2);
    // The finished work of C3 counts; the finished work of C1 (a class of tA1) does not.
    expect(out.completedToday).toBe(1);
  });

  it("never reads the classes or the activity of the other school", async () => {
    const out = await getTeacherHome({ db, user: teacher("tB", SCHOOL_B), now: NOW });

    expect(out.classRows.map((row) => row.name)).toEqual(["CB"]);
    expect(out).toMatchObject({ studentCount: 1, activeStudents30d: 1, activeToday: 1, completedToday: 0 });
    expect(out.classRows[0]).toMatchObject({ students: 1, xp7d: 1000, status: "onTrack" });
  });
});

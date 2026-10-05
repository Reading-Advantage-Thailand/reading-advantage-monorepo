import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { teacherHomeOutput } from "../primary-home/teacher-contracts.js";
import { getTeacherHome } from "../primary-home/teacher-home.js";

const SCHOOL = "22222222-2222-4222-8222-222222222222";
const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const C2 = "c2c2c2c2-0000-4000-8000-000000000002";
const teacher = { id: "t1", username: "t1", name: "Kru Ann", role: "TEACHER" as const, schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: null };
/** 5 October 2026, 15:00 in Bangkok. */
const NOW = new Date("2026-10-05T15:00:00+07:00");
const at = (s: string) => new Date(s);
const dialect = new PgDialect();

/** One query the function ran: its where clause. */
interface RecordedQuery {
  where?: SQL;
}

/**
 * A database stub: each select returns the next result in order and records its where clause, so a
 * test can render the SQL with the real Postgres dialect.
 * @param results The rows of each query, in query order.
 * @returns The stub (as DB) and the recorded queries.
 */
function recordingDb(results: unknown[][]) {
  const queries: RecordedQuery[] = [];
  let next = 0;
  const select = vi.fn(() => {
    const rows = results[next++] ?? [];
    const query: RecordedQuery = {};
    queries.push(query);
    const builder: Record<string, unknown> = {};
    for (const method of ["from", "innerJoin", "leftJoin", "orderBy", "limit", "groupBy"]) builder[method] = () => builder;
    builder.where = (condition: SQL) => {
      query.where = condition;
      return builder;
    };
    builder.then = (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject);
    return builder;
  });
  return { db: { select } as unknown as DB, queries };
}

/**
 * Builds the select results in query order: co-taught classes, classes, roster, assignments,
 * assignment progress, last activity, overdue work per student.
 */
function sequence(parts: {
  coTaught?: unknown[];
  classes?: unknown[];
  roster?: unknown[];
  assignments?: unknown[];
  progress?: unknown[];
  activity?: unknown[];
  overdue?: unknown[];
}): unknown[][] {
  return [
    parts.coTaught ?? [],
    parts.classes ?? [
      { id: C1, name: "P3A", grade: 3 },
      { id: C2, name: "P4B", grade: 4 },
    ],
    parts.roster ?? [],
    parts.assignments ?? [],
    parts.progress ?? [],
    parts.activity ?? [],
    parts.overdue ?? [],
  ];
}

const roster = [
  { classroomId: C1, studentId: "s1", name: "Ann", username: "p3a1" },
  { classroomId: C1, studentId: "s2", name: null, username: "p3a2" },
  { classroomId: C2, studentId: "s3", name: "Cy", username: "p4b1" },
  // s1 is in both classes: counted once in the student total.
  { classroomId: C2, studentId: "s1", name: "Ann", username: "p3a1" },
];

describe("getTeacherHome", () => {
  it("returns the classes with student counts, open assignments, and students who need help", async () => {
    const { db } = recordingDb(
      sequence({
        roster,
        assignments: [
          { id: "a-late", title: "Frogs", classroomId: C1, dueDate: at("2026-10-03T00:00:00+07:00"), createdAt: at("2026-09-30T00:00:00Z") },
          { id: "a-none", title: "Rain", classroomId: C2, dueDate: null, createdAt: at("2026-10-01T00:00:00Z") },
          { id: "a-today", title: "Moon", classroomId: C2, dueDate: at("2026-10-05T00:00:00+07:00"), createdAt: at("2026-10-01T00:00:00Z") },
          { id: "a-done", title: "Sun", classroomId: C1, dueDate: at("2026-10-01T00:00:00+07:00"), createdAt: at("2026-09-20T00:00:00Z") },
        ],
        progress: [
          { assignmentId: "a-late", assigned: 2, completed: 1 },
          { assignmentId: "a-none", assigned: 2, completed: 0 },
          { assignmentId: "a-today", assigned: 2, completed: 1 },
          { assignmentId: "a-done", assigned: 2, completed: 2 },
        ],
        activity: [
          { studentId: "s1", lastActiveAt: at("2026-10-05T01:00:00Z") },
          { studentId: "s3", lastActiveAt: at("2026-09-20T01:00:00Z") },
        ],
        overdue: [{ studentId: "s1", count: 1 }],
      }),
    );

    const out = await getTeacherHome({ db, user: teacher, now: NOW });

    expect(out.classes).toEqual([
      { id: C1, name: "P3A", grade: 3, studentCount: 2 },
      { id: C2, name: "P4B", grade: 4, studentCount: 2 },
    ]);
    expect(out.studentCount).toBe(3);
    // Open = at least one student not done. Earliest due date first, no due date last.
    expect(out.openAssignments.map((a) => a.id)).toEqual(["a-late", "a-today", "a-none"]);
    expect(out.openAssignments[0]).toEqual({
      id: "a-late",
      title: "Frogs",
      classroomId: C1,
      classroomName: "P3A",
      dueDate: at("2026-10-03T00:00:00+07:00"),
      assigned: 2,
      completed: 1,
    });
    expect(out.openAssignmentCount).toBe(3);
    // s1 has late work; s2 never had activity; s3 has had no activity for 15 days.
    expect(out.needsHelp).toEqual([
      { studentId: "s1", name: "Ann", username: "p3a1", classroomId: C1, classroomName: "P3A", overdueCount: 1, lastActiveAt: at("2026-10-05T01:00:00Z") },
      { studentId: "s2", name: "p3a2", username: "p3a2", classroomId: C1, classroomName: "P3A", overdueCount: 0, lastActiveAt: null },
      { studentId: "s3", name: "Cy", username: "p4b1", classroomId: C2, classroomName: "P4B", overdueCount: 0, lastActiveAt: at("2026-09-20T01:00:00Z") },
    ]);
    expect(out.needsHelpCount).toBe(3);
    expect(() => teacherHomeOutput.parse(out)).not.toThrow();
  });

  it("scopes the classes to the teacher's school and to the classes the teacher owns or co-teaches", async () => {
    const { db, queries } = recordingDb(sequence({ coTaught: [{ classroomId: C2 }] }));

    await getTeacherHome({ db, user: teacher, now: NOW });

    const [coTaught, classes] = queries.map((query) => dialect.sqlToQuery(query.where!));
    expect(coTaught.sql).toBe(`"classroom_teachers"."teacher_id" = $1`);
    expect(coTaught.params).toEqual(["t1"]);
    expect(classes.sql).toBe(
      `("classrooms"."school_id" = $1 and "classrooms"."archived" = $2 and ("classrooms"."teacher_id" = $3 or "classrooms"."id" in ($4)))`,
    );
    expect(classes.params).toEqual([SCHOOL, false, "t1", C2]);
  });

  it("reads rosters, assignments, and activity only for the teacher's classes", async () => {
    const { db, queries } = recordingDb(
      sequence({
        roster,
        assignments: [{ id: "a-late", title: "Frogs", classroomId: C1, dueDate: at("2026-10-03T00:00:00+07:00"), createdAt: NOW }],
        progress: [{ assignmentId: "a-late", assigned: 2, completed: 0 }],
      }),
    );

    await getTeacherHome({ db, user: teacher, now: NOW });

    const rendered = queries.slice(2).map((query) => dialect.sqlToQuery(query.where!));
    expect(rendered).toHaveLength(5);
    const [rosterQuery, assignmentQuery, progressQuery, activityQuery, overdueQuery] = rendered;
    expect(rosterQuery.sql).toBe(`"classroom_students"."classroom_id" in ($1, $2)`);
    expect(assignmentQuery.sql).toBe(`"assignments"."classroom_id" in ($1, $2)`);
    expect(progressQuery.sql).toBe(`"assignments"."classroom_id" in ($1, $2)`);
    expect(activityQuery.sql).toBe(`"classroom_students"."classroom_id" in ($1, $2)`);
    for (const query of [rosterQuery, assignmentQuery, progressQuery, activityQuery]) expect(query.params).toEqual([C1, C2]);
    // Late work counts only the overdue assignments of these classes and only unfinished rows.
    expect(overdueQuery.sql).toMatch(/^\("student_assignments"\."assignment_id" in \(\$1\) and "student_assignments"\."completed" = \$2 and /);
    expect(overdueQuery.params.slice(0, 2)).toEqual(["a-late", false]);
  });

  it("counts a due day as late only after the day ends in Bangkok", async () => {
    // Due 5 October (today in Bangkok): not late yet, so the late-work query does not run.
    const { db, queries } = recordingDb(
      sequence({
        roster,
        assignments: [{ id: "a-today", title: "Moon", classroomId: C1, dueDate: at("2026-10-05T00:00:00+07:00"), createdAt: NOW }],
        progress: [{ assignmentId: "a-today", assigned: 2, completed: 0 }],
        activity: [
          { studentId: "s1", lastActiveAt: NOW },
          { studentId: "s2", lastActiveAt: NOW },
          { studentId: "s3", lastActiveAt: NOW },
        ],
      }),
    );

    const out = await getTeacherHome({ db, user: teacher, now: NOW });

    expect(queries).toHaveLength(6);
    expect(out.needsHelp).toEqual([]);
  });

  it("counts inactivity in Bangkok calendar days: 6 days ago is fine, 7 days ago needs help", async () => {
    const { db } = recordingDb(
      sequence({
        roster: roster.slice(0, 3),
        activity: [
          // 29 September 23:30 in Bangkok is 6 calendar days before 5 October.
          { studentId: "s1", lastActiveAt: at("2026-09-29T23:30:00+07:00") },
          // 28 September 23:30 in Bangkok is 7 calendar days before.
          { studentId: "s2", lastActiveAt: at("2026-09-28T23:30:00+07:00") },
          { studentId: "s3", lastActiveAt: NOW },
        ],
      }),
    );

    const out = await getTeacherHome({ db, user: teacher, now: NOW });

    expect(out.needsHelp.map((student) => student.studentId)).toEqual(["s2"]);
  });

  it("limits the lists and keeps the full counts", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ classroomId: C1, studentId: `s${i}`, name: `Kid ${i}`, username: `k${i}` }));
    const tasks = Array.from({ length: 9 }, (_, i) => ({ id: `a${i}`, title: `Task ${i}`, classroomId: C1, dueDate: null, createdAt: NOW }));
    const { db } = recordingDb(
      sequence({ roster: many, assignments: tasks, progress: tasks.map((task) => ({ assignmentId: task.id, assigned: 1, completed: 0 })) }),
    );

    const out = await getTeacherHome({ db, user: teacher, now: NOW });

    expect(out.openAssignments).toHaveLength(6);
    expect(out.openAssignmentCount).toBe(9);
    expect(out.needsHelp).toHaveLength(8);
    expect(out.needsHelpCount).toBe(12);
  });

  it("returns empty lists without more queries when the teacher has no classes", async () => {
    const { db, queries } = recordingDb(sequence({ classes: [] }));
    const out = await getTeacherHome({ db, user: teacher, now: NOW });
    expect(out).toEqual({ classes: [], studentCount: 0, openAssignments: [], openAssignmentCount: 0, needsHelp: [], needsHelpCount: 0 });
    expect(queries).toHaveLength(2);
  });

  it("returns empty lists for a user with no school (SYSTEM) without a query", async () => {
    const { db, queries } = recordingDb(sequence({}));
    const out = await getTeacherHome({ db, user: { ...teacher, role: "SYSTEM", schoolId: null }, now: NOW });
    expect(out.classes).toEqual([]);
    expect(queries).toHaveLength(0);
  });

  it("rejects a student", async () => {
    const { db, queries } = recordingDb(sequence({}));
    await expect(getTeacherHome({ db, user: { ...teacher, role: "STUDENT" }, now: NOW })).rejects.toThrow(/lacks permission/);
    expect(queries).toHaveLength(0);
  });
});

import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { teacherHomeOutput } from "../primary-home/teacher-contracts.js";
import { getTeacherHome } from "../primary-home/teacher-home.js";
import { activeRatePercent, classStatus, classTrend } from "../primary-home/teacher-class-rules.js";

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
function recordingDb(results: unknown[][], onExecute: (rendered: { sql: string; params: unknown[] }) => unknown[] = () => []) {
  const queries: RecordedQuery[] = [];
  const executed: { sql: string; params: unknown[] }[] = [];
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
  // Raw SQL (the shared dashboard counts): the handler picks the rows from the rendered text.
  const execute = vi.fn(async (query: SQL) => {
    const rendered = dialect.sqlToQuery(query);
    executed.push(rendered);
    return onExecute(rendered);
  });
  return { db: { select, execute } as unknown as DB, queries, executed };
}

/**
 * Builds the select results in query order: co-taught classes, classes, roster, assignments,
 * assignment progress, overdue work per student. The shared counts run as raw SQL (see `sharedRows`).
 */
function sequence(parts: {
  coTaught?: unknown[];
  classes?: unknown[];
  roster?: unknown[];
  assignments?: unknown[];
  progress?: unknown[];
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
    parts.overdue ?? [],
  ];
}

/**
 * Rows for the raw SQL of the shared counts, picked by the text of the query.
 * @param parts.lastActive The last activity of each student, as [studentId, ISO instant].
 * @returns The handler for `recordingDb`.
 */
function sharedRows(parts: { lastActive?: [string, string][]; completedToday?: number } = {}) {
  return ({ sql: text }: { sql: string }): unknown[] => {
    if (text.includes("group by e.sid")) return (parts.lastActive ?? []).map(([sid, last]) => ({ sid, last }));
    if (text.includes("from student_assignments sa")) return [{ n: parts.completedToday ?? 0 }];
    return [];
  };
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
        overdue: [{ studentId: "s1", count: 1 }],
      }),
      sharedRows({ lastActive: [["s1", "2026-10-05T01:00:00.000Z"], ["s3", "2026-09-20T01:00:00.000Z"]] }),
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
    const { db, queries, executed } = recordingDb(
      sequence({
        roster,
        assignments: [{ id: "a-late", title: "Frogs", classroomId: C1, dueDate: at("2026-10-03T00:00:00+07:00"), createdAt: NOW }],
        progress: [{ assignmentId: "a-late", assigned: 2, completed: 0 }],
      }),
    );

    await getTeacherHome({ db, user: teacher, now: NOW });

    const rendered = queries.slice(2).map((query) => dialect.sqlToQuery(query.where!));
    expect(rendered).toHaveLength(4);
    const [rosterQuery, assignmentQuery, progressQuery, overdueQuery] = rendered;
    // The roster counts only STUDENT users of the teacher's school.
    expect(rosterQuery.sql).toBe(`("classroom_students"."classroom_id" in ($1, $2) and "users"."role" = $3 and "users"."school_id" = $4)`);
    expect(rosterQuery.params).toEqual([C1, C2, "STUDENT", SCHOOL]);
    expect(assignmentQuery.sql).toBe(`"assignments"."classroom_id" in ($1, $2)`);
    expect(progressQuery.sql).toBe(`"assignments"."classroom_id" in ($1, $2)`);
    for (const query of [assignmentQuery, progressQuery]) expect(query.params).toEqual([C1, C2]);
    // Late work counts only the overdue assignments of these classes and only unfinished rows.
    expect(overdueQuery.sql).toMatch(/^\("student_assignments"\."assignment_id" in \(\$1\) and "student_assignments"\."completed" = \$2 and /);
    expect(overdueQuery.params.slice(0, 2)).toEqual(["a-late", false]);
    // Each count names the class ids of the teacher, and no other id.
    expect(executed).toHaveLength(9);
    for (const query of executed) {
      const uuids = query.params.filter((param) => typeof param === "string" && /^[0-9a-f]{8}-/.test(param));
      for (const id of uuids) expect([SCHOOL, C1, C2]).toContain(id);
      expect(uuids).toEqual(expect.arrayContaining([C1, C2]));
    }
  });

  it("counts a due day as late only after the day ends in Bangkok", async () => {
    // Due 5 October (today in Bangkok): not late yet, so the late-work query does not run.
    const { db, queries } = recordingDb(
      sequence({
        roster,
        assignments: [{ id: "a-today", title: "Moon", classroomId: C1, dueDate: at("2026-10-05T00:00:00+07:00"), createdAt: NOW }],
        progress: [{ assignmentId: "a-today", assigned: 2, completed: 0 }],
      }),
      sharedRows({ lastActive: ["s1", "s2", "s3"].map((id): [string, string] => [id, NOW.toISOString()]) }),
    );

    const out = await getTeacherHome({ db, user: teacher, now: NOW });

    expect(queries).toHaveLength(5);
    expect(out.needsHelp).toEqual([]);
  });

  it("counts inactivity in Bangkok calendar days: 6 days ago is fine, 7 days ago needs help", async () => {
    const { db } = recordingDb(
      sequence({
        roster: roster.slice(0, 3),
      }),
      sharedRows({
        lastActive: [
          // 29 September 23:30 in Bangkok is 6 calendar days before 5 October.
          ["s1", at("2026-09-29T23:30:00+07:00").toISOString()],
          // 28 September 23:30 in Bangkok is 7 calendar days before.
          ["s2", at("2026-09-28T23:30:00+07:00").toISOString()],
          ["s3", NOW.toISOString()],
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
    expect(out).toEqual({
      classes: [],
      studentCount: 0,
      openAssignments: [],
      openAssignmentCount: 0,
      needsHelp: [],
      needsHelpCount: 0,
      activeStudents30d: 0,
      engagementRate30d: 0,
      averageLevel: null,
      activeToday: 0,
      completedToday: 0,
      classRows: [],
    });
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

  it("builds the summary and the class rows from the shared counts, with the rounded rate in the status", async () => {
    // 7-day window: 29 September to 5 October (starts 2026-09-29T00:00+07:00). Previous 7 days start 22 September.
    const last7 = "2026-09-28T17:00:00.000Z";
    const previous7 = "2026-09-21T17:00:00.000Z";
    const { db } = recordingDb(
      sequence({ roster }),
      ({ sql: text, params }) => {
        if (text.includes("round(avg(s.level)::numeric, 1)::text as avg from (")) return [{ avg: "3.4" }];
        if (text.includes("group by m.cid") && text.includes("avg(u.level)")) {
          return [{ cid: C1, students: 23, avg: "2.5" }, { cid: C2, students: 0, avg: null }];
        }
        if (text.includes("as active from")) return [{ cid: C1, active: 16 }];
        if (text.includes("sum(x.xp)")) {
          // The previous window ends where the last window starts, so test it first.
          if (params.includes(previous7)) return [{ cid: C1, xp: 100 }];
          return params.includes(last7) ? [{ cid: C1, xp: 105 }] : [];
        }
        if (text.includes("as active") && text.includes("as total")) {
          // 30-day window starts 6 September (2026-09-05T17:00Z); the "today" window starts 4 October 17:00Z.
          return params.includes("2026-09-05T17:00:00.000Z") ? [{ active: 6, total: 7 }] : [{ active: 2, total: 7 }];
        }
        if (text.includes("from student_assignments sa")) return [{ n: 4 }];
        return [];
      },
    );

    const out = await getTeacherHome({ db, user: teacher, now: NOW });

    expect(out).toMatchObject({ activeStudents30d: 6, engagementRate30d: 86, averageLevel: 3.4, activeToday: 2, completedToday: 4 });
    // 16 of 23 is 69.57 %: the row shows 70 and the status is onTrack. +5 % exactly is flat.
    expect(out.classRows).toEqual([
      { id: C1, name: "P3A", grade: 3, students: 23, active7d: 16, activeRate7d: 70, averageLevel: 2.5, xp7d: 105, xpPrevious7d: 100, trend: "flat", status: "onTrack" },
      { id: C2, name: "P4B", grade: 4, students: 0, active7d: 0, activeRate7d: 0, averageLevel: null, xp7d: 0, xpPrevious7d: 0, trend: "flat", status: "noStudents" },
    ]);
    expect(() => teacherHomeOutput.parse(out)).not.toThrow();
  });

  it("counts today on the Bangkok day: 23:30 in Bangkok is still the same day", async () => {
    const lateNow = new Date("2026-10-05T23:30:00+07:00");
    const { db, executed } = recordingDb(sequence({ roster }));

    await getTeacherHome({ db, user: teacher, now: lateNow });

    const completed = executed.find((query) => query.sql.includes("from student_assignments sa"))!;
    // The day runs from 5 October 00:00 to 6 October 00:00 in Bangkok (UTC+7).
    expect(completed.params).toContain("2026-10-04T17:00:00.000Z");
    expect(completed.params).toContain("2026-10-05T17:00:00.000Z");
    expect(completed.sql).toContain(`sa.completed_at >=`);
    expect(completed.sql).not.toContain("updated_at");
  });

  it("does not list a student with activity today as quiet (the last activity uses the shared rule)", async () => {
    // s1 has only a lesson step today: the shared rule returns it as the last activity.
    const { db } = recordingDb(sequence({ roster: roster.slice(0, 1) }), sharedRows({ lastActive: [["s1", NOW.toISOString()]] }));
    const out = await getTeacherHome({ db, user: teacher, now: NOW });
    expect(out.needsHelp).toEqual([]);
  });
});

describe("class trend rule (FR-3)", () => {
  it("is up when there was no XP before and there is XP now", () => {
    expect(classTrend(1, 0)).toBe("up");
    expect(classTrend(0, 0)).toBe("flat");
  });

  it("is flat at exactly +5 % and -5 %, and moves past the limit", () => {
    expect(classTrend(105, 100)).toBe("flat");
    expect(classTrend(1051, 1000)).toBe("up");
    expect(classTrend(106, 100)).toBe("up");
    expect(classTrend(95, 100)).toBe("flat");
    expect(classTrend(949, 1000)).toBe("down");
    expect(classTrend(0, 100)).toBe("down");
  });
});

describe("class status rule (FR-4)", () => {
  it("reads the whole percent that the row shows", () => {
    // 16 of 23 is 69.57 %: the row shows 70 %, so the status is onTrack.
    expect(activeRatePercent(16, 23)).toBe(70);
    expect(classStatus(23, activeRatePercent(16, 23))).toBe("onTrack");
    // 7 of 10 is exactly 70 %.
    expect(classStatus(10, activeRatePercent(7, 10))).toBe("onTrack");
    // 69 of 100 stays someQuiet.
    expect(classStatus(100, activeRatePercent(69, 100))).toBe("someQuiet");
  });

  it("moves from needsAttention to someQuiet at 40 %, rounded", () => {
    expect(classStatus(100, activeRatePercent(39, 100))).toBe("needsAttention");
    expect(classStatus(100, activeRatePercent(40, 100))).toBe("someQuiet");
    // 2 of 5 is 40 %; 39.6 % (99 of 250) shows as 40 %.
    expect(classStatus(250, activeRatePercent(99, 250))).toBe("someQuiet");
    expect(classStatus(250, activeRatePercent(98, 250))).toBe("needsAttention");
  });

  it("gives noStudents for an empty class and a rate of 0", () => {
    expect(activeRatePercent(0, 0)).toBe(0);
    expect(classStatus(0, 0)).toBe("noStudents");
  });
});

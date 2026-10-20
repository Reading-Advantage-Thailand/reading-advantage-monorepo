import { and, asc, count, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { assignments, classroomStudents, classroomTeachers, classrooms, studentAssignments, users } from "@reading-advantage/db/schema";
import { assertCan, type UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { calendarDayNumber } from "../calendar-day.js";
import { getDueDateStatus } from "../assignments/due-date.js";
import {
  countActiveStudents,
  countActiveStudentsByClass,
  getAverageLevel,
  getClassStudentStats,
  getLastActivityByStudent,
  rowsOf,
  sumXpEarnedByClass,
  toInt,
  windowBoundsSql,
} from "../primary-dashboards/activity.js";
import { dashboardWindow } from "../primary-dashboards/window.js";
import type { ActivityScope } from "../primary-dashboards/contracts.js";
import { activeRatePercent, classStatus, classTrend } from "./teacher-class-rules.js";
import {
  TEACHER_HOME_ASSIGNMENT_LIMIT,
  TEACHER_HOME_HELP_LIMIT,
  TEACHER_HOME_INACTIVE_DAYS,
  teacherHomeOutput,
  type TeacherHome,
} from "./teacher-contracts.js";

/** A student assignment is done when it is marked completed or has the status COMPLETED. */
const DONE = sql<boolean>`(${studentAssignments.completed} = true or ${studentAssignments.status} = 'COMPLETED')`;

const DAY_MS = 86_400_000;

/**
 * Reads the Primary teacher dashboard: the teacher's classes (owned or co-taught, not archived, in
 * the teacher's school) with student counts, the open assignments of those classes, and the
 * students who need help (late work, or no activity for 7 Bangkok calendar days or more). It also
 * returns the summary numbers (active in 30 days, average level, active today, completed today) and
 * one table row for each class. A student is a STUDENT user of the teacher's school. The activity
 * rule is the shared rule of `primary-dashboards`.
 * @param params.db Database client.
 * @param params.user The signed-in teacher (or school admin).
 * @param params.now Current time. Tests replace it.
 * @returns The dashboard data, checked with `teacherHomeOutput`. A user without a school gets empty lists.
 * @throws {AuthError} FORBIDDEN when the user cannot list classes (for example a student).
 */
export async function getTeacherHome(params: { db: DB; user: UserContext; now?: Date }): Promise<TeacherHome> {
  const { user } = params;
  const now = params.now ?? new Date();
  assertCan(user, "class:list", { schoolId: user.schoolId });
  const empty: TeacherHome = {
    classes: [], studentCount: 0, openAssignments: [], openAssignmentCount: 0, needsHelp: [], needsHelpCount: 0,
    activeStudents30d: 0, engagementRate30d: 0, averageLevel: null, activeToday: 0, completedToday: 0, classRows: [],
  };
  if (!user.schoolId) return empty;
  const raw = createTenantDB(params.db, { schoolId: user.schoolId }).unscoped(
    "classes filter school_id = the teacher's school; class rosters, assignments, and activity are read only for those class ids",
  );

  const coTaught = await raw
    .select({ classroomId: classroomTeachers.classroomId })
    .from(classroomTeachers)
    .where(eq(classroomTeachers.teacherId, user.id));
  const coTaughtIds = coTaught.map((row) => row.classroomId);
  const classRows = await raw
    .select({ id: classrooms.id, name: classrooms.name, grade: classrooms.grade })
    .from(classrooms)
    .where(
      and(
        eq(classrooms.schoolId, user.schoolId),
        eq(classrooms.archived, false),
        coTaughtIds.length ? or(eq(classrooms.teacherId, user.id), inArray(classrooms.id, coTaughtIds)) : eq(classrooms.teacherId, user.id),
      ),
    )
    .orderBy(asc(classrooms.name));
  if (!classRows.length) return empty;
  const classIds = classRows.map((row) => row.id);

  const schoolId = user.schoolId;
  const scope: ActivityScope = { kind: "classes", schoolId, classIds };
  const w1 = dashboardWindow(1, now);
  const w7 = dashboardWindow(7, now);
  const w30 = dashboardWindow(30, now);
  // The 7 days before the last 7 days. Asia/Bangkok has no daylight saving time.
  const wPrevious7 = dashboardWindow(7, new Date(now.getTime() - 7 * DAY_MS));
  const today = windowBoundsSql(w1);

  const [rosterRows, assignmentRows, progressRows, lastActive, classStats, active30, activeToday, averageLevel, active7ByClass, xp7ByClass, xpPreviousByClass, completedRows] =
    await Promise.all([
      raw
        .select({ classroomId: classroomStudents.classroomId, studentId: classroomStudents.studentId, name: users.name, username: users.username })
        .from(classroomStudents)
        .innerJoin(users, eq(users.id, classroomStudents.studentId))
        .where(and(inArray(classroomStudents.classroomId, classIds), eq(users.role, "STUDENT"), eq(users.schoolId, schoolId))),
      raw
        .select({ id: assignments.id, title: assignments.title, classroomId: assignments.classroomId, dueDate: assignments.dueDate, createdAt: assignments.createdAt })
        .from(assignments)
        .where(inArray(assignments.classroomId, classIds)),
      raw
        .select({
          assignmentId: studentAssignments.assignmentId,
          assigned: count(),
          completed: sql<number>`count(*) filter (where ${DONE})`.mapWith(Number),
        })
        .from(studentAssignments)
        .innerJoin(assignments, eq(assignments.id, studentAssignments.assignmentId))
        .where(inArray(assignments.classroomId, classIds))
        .groupBy(studentAssignments.assignmentId),
      getLastActivityByStudent({ db: params.db, scope }),
      getClassStudentStats({ db: params.db, scope }),
      countActiveStudents({ db: params.db, scope, window: w30 }),
      countActiveStudents({ db: params.db, scope, window: w1 }),
      getAverageLevel({ db: params.db, scope }),
      countActiveStudentsByClass({ db: params.db, scope, window: w7 }),
      sumXpEarnedByClass({ db: params.db, scope, window: w7 }),
      sumXpEarnedByClass({ db: params.db, scope, window: wPrevious7 }),
      // Finished today, by the day the student finished (`completed_at`), not by the last update.
      raw.execute(sql`
        select count(*)::int as n from student_assignments sa join assignments a on a.id = sa.assignment_id
        where a.classroom_id in (${sql.join(classIds.map((id) => sql`${id}::uuid`), sql`, `)})
          and (sa.completed = true or sa.status = 'COMPLETED') and sa.completed_at is not null
          and sa.completed_at >= ${today.utcStart} and sa.completed_at < ${today.utcEnd}`),
    ]);

  const classById = new Map(classRows.map((row) => [row.id, row]));
  const progress = new Map(progressRows.map((row) => [row.assignmentId, { assigned: Number(row.assigned), completed: Number(row.completed) }]));
  const open = assignmentRows
    .map((row) => ({ row, ...(progress.get(row.id) ?? { assigned: 0, completed: 0 }) }))
    .filter((entry) => entry.assigned > entry.completed)
    .sort(
      (a, b) =>
        (a.row.dueDate?.getTime() ?? Infinity) - (b.row.dueDate?.getTime() ?? Infinity) ||
        b.row.createdAt.getTime() - a.row.createdAt.getTime(),
    );
  // Late = the due day is before today in Bangkok, the same rule as the due chips.
  const overdueIds = open.filter((entry) => getDueDateStatus(entry.row.dueDate, now).kind === "overdue").map((entry) => entry.row.id);
  const overdueRows = overdueIds.length
    ? await raw
        .select({ studentId: studentAssignments.studentId, count: count() })
        .from(studentAssignments)
        .where(
          and(
            inArray(studentAssignments.assignmentId, overdueIds),
            eq(studentAssignments.completed, false),
            or(isNull(studentAssignments.status), ne(studentAssignments.status, "COMPLETED")),
          ),
        )
        .groupBy(studentAssignments.studentId)
    : [];

  const studentCounts = new Map<string, number>();
  const firstClass = new Map<string, (typeof rosterRows)[number]>();
  for (const row of rosterRows) {
    studentCounts.set(row.classroomId, (studentCounts.get(row.classroomId) ?? 0) + 1);
    if (!firstClass.has(row.studentId)) firstClass.set(row.studentId, row);
  }
  const overdue = new Map(overdueRows.map((row) => [row.studentId, Number(row.count)]));
  const todayNumber = calendarDayNumber(now);
  const needsHelp = [...firstClass.values()]
    .map((row) => ({
      studentId: row.studentId,
      name: row.name ?? row.username ?? row.studentId,
      username: row.username,
      classroomId: row.classroomId,
      classroomName: classById.get(row.classroomId)?.name ?? "",
      overdueCount: overdue.get(row.studentId) ?? 0,
      lastActiveAt: lastActive.get(row.studentId) ?? null,
    }))
    .filter(
      (student) =>
        student.overdueCount > 0 || !student.lastActiveAt || todayNumber - calendarDayNumber(student.lastActiveAt) >= TEACHER_HOME_INACTIVE_DAYS,
    )
    .sort(
      (a, b) =>
        b.overdueCount - a.overdueCount ||
        (a.lastActiveAt?.getTime() ?? -Infinity) - (b.lastActiveAt?.getTime() ?? -Infinity) ||
        a.name.localeCompare(b.name),
    );

  const statsByClass = new Map(classStats.map((row) => [row.classId, row]));
  const classTable = classRows.map((row) => {
    const students = statsByClass.get(row.id)?.students ?? 0;
    const active7d = active7ByClass.get(row.id) ?? 0;
    const activeRate7d = activeRatePercent(active7d, students);
    const xp7d = xp7ByClass.get(row.id) ?? 0;
    const xpPrevious7d = xpPreviousByClass.get(row.id) ?? 0;
    return {
      id: row.id,
      name: row.name,
      grade: row.grade,
      students,
      active7d,
      activeRate7d,
      averageLevel: statsByClass.get(row.id)?.averageLevel ?? null,
      xp7d,
      xpPrevious7d,
      trend: classTrend(xp7d, xpPrevious7d),
      status: classStatus(students, activeRate7d),
    };
  });

  return teacherHomeOutput.parse({
    classes: classRows.map((row) => ({ id: row.id, name: row.name, grade: row.grade, studentCount: studentCounts.get(row.id) ?? 0 })),
    studentCount: firstClass.size,
    openAssignments: open.slice(0, TEACHER_HOME_ASSIGNMENT_LIMIT).map(({ row, assigned, completed }) => ({
      id: row.id,
      title: row.title,
      classroomId: row.classroomId,
      classroomName: classById.get(row.classroomId)?.name ?? "",
      dueDate: row.dueDate,
      assigned,
      completed,
    })),
    openAssignmentCount: open.length,
    needsHelp: needsHelp.slice(0, TEACHER_HOME_HELP_LIMIT),
    needsHelpCount: needsHelp.length,
    activeStudents30d: active30.active,
    engagementRate30d: activeRatePercent(active30.active, active30.total),
    averageLevel,
    activeToday: activeToday.active,
    completedToday: toInt(rowsOf<{ n: unknown }>(completedRows)[0]?.n),
    classRows: classTable,
  });
}

import { and, asc, count, eq, inArray, isNull, max, ne, or, sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { assignments, classroomStudents, classroomTeachers, classrooms, studentAssignments, userActivity, users } from "@reading-advantage/db/schema";
import { assertCan, type UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { calendarDayNumber } from "../calendar-day.js";
import { getDueDateStatus } from "../assignments/due-date.js";
import {
  TEACHER_HOME_ASSIGNMENT_LIMIT,
  TEACHER_HOME_HELP_LIMIT,
  TEACHER_HOME_INACTIVE_DAYS,
  type TeacherHome,
} from "./teacher-contracts.js";

/** A student assignment is done when it is marked completed or has the status COMPLETED. */
const DONE = sql<boolean>`(${studentAssignments.completed} = true or ${studentAssignments.status} = 'COMPLETED')`;

/**
 * Reads the Primary teacher dashboard: the teacher's classes (owned or co-taught, not archived, in
 * the teacher's school) with student counts, the open assignments of those classes, and the
 * students who need help (late work, or no activity for 7 Bangkok calendar days or more).
 * @param params.db Database client.
 * @param params.user The signed-in teacher (or school admin).
 * @param params.now Current time. Tests replace it.
 * @returns The dashboard data. A user without a school gets empty lists.
 * @throws {AuthError} FORBIDDEN when the user cannot list classes (for example a student).
 */
export async function getTeacherHome(params: { db: DB; user: UserContext; now?: Date }): Promise<TeacherHome> {
  const { user } = params;
  const now = params.now ?? new Date();
  assertCan(user, "class:list", { schoolId: user.schoolId });
  const empty: TeacherHome = { classes: [], studentCount: 0, openAssignments: [], openAssignmentCount: 0, needsHelp: [], needsHelpCount: 0 };
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

  const [rosterRows, assignmentRows, progressRows, activityRows] = await Promise.all([
    raw
      .select({ classroomId: classroomStudents.classroomId, studentId: classroomStudents.studentId, name: users.name, username: users.username })
      .from(classroomStudents)
      .innerJoin(users, eq(users.id, classroomStudents.studentId))
      .where(inArray(classroomStudents.classroomId, classIds)),
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
    raw
      .select({ studentId: classroomStudents.studentId, lastActiveAt: max(userActivity.createdAt) })
      .from(classroomStudents)
      .innerJoin(userActivity, eq(userActivity.userId, classroomStudents.studentId))
      .where(inArray(classroomStudents.classroomId, classIds))
      .groupBy(classroomStudents.studentId),
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
  const lastActive = new Map(activityRows.map((row) => [row.studentId, row.lastActiveAt ?? null]));
  const overdue = new Map(overdueRows.map((row) => [row.studentId, Number(row.count)]));
  const today = calendarDayNumber(now);
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
        student.overdueCount > 0 || !student.lastActiveAt || today - calendarDayNumber(student.lastActiveAt) >= TEACHER_HOME_INACTIVE_DAYS,
    )
    .sort(
      (a, b) =>
        b.overdueCount - a.overdueCount ||
        (a.lastActiveAt?.getTime() ?? -Infinity) - (b.lastActiveAt?.getTime() ?? -Infinity) ||
        a.name.localeCompare(b.name),
    );

  return {
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
  };
}

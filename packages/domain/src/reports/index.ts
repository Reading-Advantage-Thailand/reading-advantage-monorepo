import { eq, and, sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  userActivity,
  userWordRecords,
  userSentenceRecords,
  classroomStudents,
} from "@reading-advantage/db/schema";
import { xpLogs, storyRecords } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";

export async function getStudentProgress({
  db,
  user,
  tenant,
  input,
}: {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: { studentId: string };
}) {
  assertCan(user, "progress:read:all", tenant);

  const activities = await db
    .select()
    .from(userActivity)
    .where(eq(userActivity.userId, input.studentId));

  const wordRecords = await db
    .select()
    .from(userWordRecords)
    .where(eq(userWordRecords.userId, input.studentId));

  const sentenceRecords = await db
    .select()
    .from(userSentenceRecords)
    .where(eq(userSentenceRecords.userId, input.studentId));

  const xpTotal = await db
    .select({ total: sql<number>`COALESCE(SUM(${xpLogs.amount}), 0)` })
    .from(xpLogs)
    .where(eq(xpLogs.userId, input.studentId));

  const storiesCompleted = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(storyRecords)
    .where(
      and(
        eq(storyRecords.userId, input.studentId),
        eq(storyRecords.completed, true)
      )
    );

  return {
    studentId: input.studentId,
    activities,
    wordRecords,
    sentenceRecords,
    xpTotal: xpTotal[0]?.total ?? 0,
    storiesCompleted: storiesCompleted[0]?.count ?? 0,
  };
}

export async function getClassAnalytics({
  db,
  user,
  tenant,
  input,
}: {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: { classId: string };
}) {
  assertCan(user, "progress:read:all", tenant);

  const students = await db
    .select({ studentId: classroomStudents.studentId })
    .from(classroomStudents)
    .where(eq(classroomStudents.classroomId, input.classId));

  const studentIds = students.map((s) => s.studentId);

  if (studentIds.length === 0) {
    return { classId: input.classId, studentCount: 0, students: [] };
  }

  const studentSummaries = await Promise.all(
    studentIds.map(async (studentId) => {
      const xpResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${xpLogs.amount}), 0)` })
        .from(xpLogs)
        .where(eq(xpLogs.userId, studentId));

      const storiesResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(storyRecords)
        .where(
          and(
            eq(storyRecords.userId, studentId),
            eq(storyRecords.completed, true)
          )
        );

      return {
        studentId,
        xpTotal: xpResult[0]?.total ?? 0,
        storiesCompleted: storiesResult[0]?.count ?? 0,
      };
    })
  );

  const totalXp = studentSummaries.reduce((sum, s) => sum + s.xpTotal, 0);
  const avgXp = studentIds.length > 0 ? totalXp / studentIds.length : 0;

  return {
    classId: input.classId,
    studentCount: studentIds.length,
    totalXp,
    averageXp: Math.round(avgXp),
    students: studentSummaries,
  };
}

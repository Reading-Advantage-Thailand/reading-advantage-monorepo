import { eq, and, sql } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import {
  userActivity,
  userWordRecords,
  userSentenceRecords,
  lessonProgress,
  classroomStudents,
  classrooms,
  storyRecords,
  xpLogs,
} from "@reading-advantage/db/schema";

/**
 * Retrieves comprehensive progress data for a student: activity log, word records,
 * sentence records, total XP earned, and stories completed. Requires progress:read:all
 * and verifies the student belongs to the caller's school.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `studentId`
 * @returns Student progress bundle including activities, records, xpTotal, storiesCompleted
 */
export async function getStudentProgress({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { studentId: string };
}) {
  assertCan(user, "progress:read:all", tenant);

  const rawDb = db.unscoped("progress tables (classroomStudents, userActivity, etc.) are REFERENTIAL");

  const enrollment = await rawDb
    .select({ classroomId: classroomStudents.classroomId })
    .from(classroomStudents)
    .innerJoin(classrooms, eq(classroomStudents.classroomId, classrooms.id))
    .where(
      and(
        eq(classroomStudents.studentId, input.studentId),
        eq(classrooms.schoolId, tenant.schoolId!)
      )
    )
    .limit(1);

  if (enrollment.length === 0) {
    throw new Error("Student not found in your school");
  }

  const activities = await rawDb
    .select()
    .from(userActivity)
    .where(eq(userActivity.userId, input.studentId));

  const wordRecords = await rawDb
    .select()
    .from(userWordRecords)
    .where(eq(userWordRecords.userId, input.studentId));

  const sentenceRecords = await rawDb
    .select()
    .from(userSentenceRecords)
    .where(eq(userSentenceRecords.userId, input.studentId));

  const xpTotalResult = await rawDb
    .select({ total: sql<number>`COALESCE(SUM(${xpLogs.xpEarned}), 0)` })
    .from(xpLogs)
    .where(eq(xpLogs.userId, input.studentId));

  const storiesCompletedResult = await rawDb
    .select({ count: sql<number>`COUNT(*)` })
    .from(storyRecords)
    .where(
      and(
        eq(storyRecords.userId, input.studentId),
        eq(storyRecords.status, "COMPLETED")
      )
    );

  return {
    studentId: input.studentId,
    activities,
    wordRecords,
    sentenceRecords,
    xpTotal: xpTotalResult[0]?.total ?? 0,
    storiesCompleted: storiesCompletedResult[0]?.count ?? 0,
  };
}

/**
 * Retrieves the current user's progress record for a specific lesson,
 * or null if no progress exists yet.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `lessonId`
 * @returns The lesson progress record or null
 */
export async function getLessonProgress({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { lessonId: string };
}) {
  assertCan(user, "progress:read:own", tenant);

  const rawDb = db.unscoped("lessonProgress is REFERENTIAL, scoped via userId FK");

  const [progress] = await rawDb
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, user.id),
        eq(lessonProgress.lessonId, input.lessonId)
      )
    )
    .limit(1);

  return progress ?? null;
}

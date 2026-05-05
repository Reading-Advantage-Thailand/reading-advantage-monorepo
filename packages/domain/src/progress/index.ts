import { eq, and, sql } from "drizzle-orm";
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
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { ExternalLessonId } from "@reading-advantage/types";
import type { TenantDB } from "../db-contract.js";

interface RecordActivityInput {
  activityType: string;
  xpEarned?: number;
  metadata?: string;
}

interface UpdateLessonProgressInput {
  lessonId: ExternalLessonId;
  status: string;
  progress: number;
}

export async function recordActivity({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: RecordActivityInput;
}) {
  assertCan(user, "progress:record", tenant);

  const [activity] = await db
    .insert(userActivity)
    .values({
      userId: user.id,
      activityType: input.activityType,
      xpEarned: input.xpEarned ?? 0,
      metadata: input.metadata,
    })
    .returning();

  return activity;
}

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

  const enrollment = await db
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

  const xpTotalResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${xpLogs.amount}), 0)` })
    .from(xpLogs)
    .where(eq(xpLogs.userId, input.studentId));

  const storiesCompletedResult = await db
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
    xpTotal: xpTotalResult[0]?.total ?? 0,
    storiesCompleted: storiesCompletedResult[0]?.count ?? 0,
  };
}

export async function getLessonProgress({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { lessonId: ExternalLessonId };
}) {
  assertCan(user, "progress:read:own", tenant);

  const [progress] = await db
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

export async function updateLessonProgress({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: UpdateLessonProgressInput;
}) {
  assertCan(user, "progress:record", tenant);

  const [updated] = await db
    .insert(lessonProgress)
    .values({
      userId: user.id,
      lessonId: input.lessonId,
      status: input.status,
      progress: input.progress,
      completedAt: input.status === "completed" ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        status: input.status,
        progress: input.progress,
        completedAt: input.status === "completed" ? new Date() : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return updated;
}

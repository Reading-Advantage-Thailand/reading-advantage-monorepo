import { eq, and } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  userActivity,
  userWordRecords,
  userSentenceRecords,
  lessonProgress,
  classroomStudents,
  classrooms,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";

interface RecordActivityInput {
  activityType: string;
  xpEarned?: number;
  metadata?: string;
}

interface UpdateLessonProgressInput {
  lessonId: string;
  status: string;
  progress: number;
}

export async function recordActivity({
  db,
  user,
  tenant,
  input,
}: {
  db: DB;
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
  db: DB;
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

  return {
    activities,
    wordRecords,
    sentenceRecords,
  };
}

export async function getLessonProgress({
  db,
  user,
  tenant,
  input,
}: {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: { lessonId: string };
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
  db: DB;
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

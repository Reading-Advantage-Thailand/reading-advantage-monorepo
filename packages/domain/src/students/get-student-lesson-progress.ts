import { and, eq, exists, or } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceClassStudents, scienceClasses, scienceCurriculumUnits,
  scienceLessonCompletions, scienceLessons, scienceUnitLessons, users,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Gets a student's progress for a specific lesson.
 * Students can view their own; teachers can view students in their classes.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing studentId and lessonId
 * @returns Lesson progress data
 */
export async function getStudentLessonProgress({ user, tenant, input }: { user: UserContext; tenant: Tenant; input: { studentId: string; lessonId: string } }) {
  const targetStudentId = input.studentId === "me" ? user.id : input.studentId;
  if (targetStudentId !== user.id) assertCan(user, "progress:read:all", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [student] = await tenantDb.select({ id: users.id }).from(users).where(eq(users.id, targetStudentId)).limit(1);
  if (!student) throw new Error("Student not found");

  const [lesson] = await tenantDb.select({ id: scienceLessons.id }).from(scienceLessons).where(or(eq(scienceLessons.id, input.lessonId), eq(scienceLessons.slug, input.lessonId))).limit(1);
  if (!lesson) throw new Error("Lesson not found");

  if (targetStudentId !== user.id) {
    const matches = await tenantDb
      .select({ classId: scienceClasses.id })
      .from(scienceClasses)
      .where(
        and(
          eq(scienceClasses.teacherId, user.id),
          exists(
            tenantDb.select({ id: scienceUnitLessons.lessonId })
              .from(scienceUnitLessons)
              .innerJoin(scienceCurriculumUnits, eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId))
              .where(and(eq(scienceCurriculumUnits.classId, scienceClasses.id), eq(scienceUnitLessons.lessonId, lesson.id)))
          ),
          exists(
            tenantDb.select({ id: scienceClassStudents.studentId })
              .from(scienceClassStudents)
              .where(and(eq(scienceClassStudents.classId, scienceClasses.id), eq(scienceClassStudents.studentId, targetStudentId)))
          )
        )
      )
      .limit(1);
    if (matches.length === 0) throw new Error("Not authorized to view progress");
  }

  const [completion] = await tenantDb.select().from(scienceLessonCompletions).where(and(eq(scienceLessonCompletions.studentId, targetStudentId), eq(scienceLessonCompletions.lessonId, lesson.id))).limit(1);

  return {
    studentId: targetStudentId, lessonId: input.lessonId,
    status: completion?.status ?? "NOT_STARTED", attemptsCount: completion?.attemptsCount ?? 0,
    bestScore: completion?.bestScore ?? null, bestScorePercentage: completion?.bestScorePercentage ?? null,
    mostRecentScore: completion?.mostRecentScore ?? null, mostRecentScorePercentage: completion?.mostRecentScorePercentage ?? null,
    totalTimeSpentSeconds: completion?.totalTimeSpentSeconds ?? 0,
    lastAttemptAt: completion?.lastAttemptAt?.toISOString() ?? null, completedAt: completion?.completedAt?.toISOString() ?? null,
  };
}

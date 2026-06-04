import { and, eq, inArray } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceUnitLessons,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Gets the curriculum for a class with lesson completion status for the caller.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the classId
 * @returns Curriculum organized by units with lesson progress
 */
export async function getClassCurriculum({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { classId: string };
}) {
  assertCan(user, "class:read", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [classRecord] = await tenantDb.select().from(scienceClasses).where(eq(scienceClasses.id, input.classId)).limit(1);
  if (!classRecord) throw new Error("Class not found");

  const isTeacher = classRecord.teacherId === user.id;
  let isEnrolledStudent = false;
  if (!isTeacher) {
    const enrollment = await tenantDb
      .select({ studentId: scienceClassStudents.studentId })
      .from(scienceClassStudents)
      .where(and(eq(scienceClassStudents.classId, input.classId), eq(scienceClassStudents.studentId, user.id)))
      .limit(1);
    isEnrolledStudent = enrollment.length > 0;
  }
  if (!isTeacher && !isEnrolledStudent) throw new Error("Not enrolled in this class");

  const units = await tenantDb.select().from(scienceCurriculumUnits).where(eq(scienceCurriculumUnits.classId, input.classId)).orderBy(scienceCurriculumUnits.order);

  const unitIds = units.map((u) => u.id);
  const unitLessonRows = unitIds.length
    ? await tenantDb
        .select({ unitId: scienceUnitLessons.unitId, lesson: scienceLessons })
        .from(scienceUnitLessons)
        .innerJoin(scienceLessons, eq(scienceLessons.id, scienceUnitLessons.lessonId))
        .where(inArray(scienceUnitLessons.unitId, unitIds))
    : [];

  const lessonsByUnit = new Map<string, typeof scienceLessons.$inferSelect[]>();
  for (const row of unitLessonRows) {
    const arr = lessonsByUnit.get(row.unitId) ?? [];
    arr.push(row.lesson);
    lessonsByUnit.set(row.unitId, arr);
  }
  for (const arr of lessonsByUnit.values()) arr.sort((a, b) => a.order - b.order);

  const allLessonIds = unitLessonRows.map((r) => r.lesson.id);
  const completions = allLessonIds.length
    ? await tenantDb.select().from(scienceLessonCompletions).where(and(eq(scienceLessonCompletions.studentId, user.id), inArray(scienceLessonCompletions.lessonId, allLessonIds)))
    : [];
  const completionByLesson = new Map(completions.map((c) => [c.lessonId, c]));

  return {
    class: { id: classRecord.id, name: classRecord.name, gradeLevel: classRecord.gradeLevel, standardsAlignment: classRecord.standardsAlignment },
    units: units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      titleThai: unit.title,
      order: unit.order,
      lessons: (lessonsByUnit.get(unit.id) ?? []).map((lesson) => {
        const progress = completionByLesson.get(lesson.id);
        const status = progress?.status ?? "NOT_STARTED";
        return {
          id: lesson.id, slug: lesson.id, title: lesson.title, titleThai: lesson.titleThai ?? lesson.title, order: lesson.order,
          completed: status === "COMPLETED", started: status !== "NOT_STARTED",
          progress: {
            status, attemptsCount: progress?.attemptsCount ?? 0,
            mostRecentScore: progress?.mostRecentScore ?? null, mostRecentScorePercentage: progress?.mostRecentScorePercentage ?? null,
            bestScore: progress?.bestScore ?? null, bestScorePercentage: progress?.bestScorePercentage ?? null,
            lastAttemptAt: progress?.lastAttemptAt?.toISOString() ?? null, completedAt: progress?.completedAt?.toISOString() ?? null,
          },
        };
      }),
    })),
  };
}

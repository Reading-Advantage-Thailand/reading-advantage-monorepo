import { and, count, eq, inArray } from "drizzle-orm";
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

function getColorCode(averageScore: number): string {
  if (averageScore >= 90) return "blue";
  if (averageScore >= 80) return "green";
  if (averageScore >= 60) return "yellow";
  return "red";
}

/**
 * Gets per-lesson aggregate analytics for a class.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the classId
 * @returns Analytics overview with per-lesson stats
 */
export async function getClassAnalyticsOverview({
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

  const isTeacherOwner = classRecord.teacherId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isTeacherOwner && !isAdmin) throw new Error("Unauthorized access to class analytics");

  const [{ c: totalStudents }] = await tenantDb.select({ c: count() }).from(scienceClassStudents).where(eq(scienceClassStudents.classId, input.classId));

  const enrolledStudentRows = await tenantDb.select({ studentId: scienceClassStudents.studentId }).from(scienceClassStudents).where(eq(scienceClassStudents.classId, input.classId));
  const enrolledStudentIds = enrolledStudentRows.map((r) => r.studentId);

  const lessonRows = await tenantDb
    .select({ lesson: scienceLessons })
    .from(scienceLessons)
    .innerJoin(scienceUnitLessons, eq(scienceUnitLessons.lessonId, scienceLessons.id))
    .innerJoin(scienceCurriculumUnits, eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId))
    .where(eq(scienceCurriculumUnits.classId, input.classId))
    .orderBy(scienceLessons.order);

  const lessons = Array.from(new Map(lessonRows.map((r) => [r.lesson.id, r.lesson])).values()).sort((a, b) => a.order - b.order);
  const lessonIds = lessons.map((l) => l.id);

  const completions = lessonIds.length > 0 && enrolledStudentIds.length > 0
    ? await tenantDb.select().from(scienceLessonCompletions).where(and(inArray(scienceLessonCompletions.lessonId, lessonIds), inArray(scienceLessonCompletions.studentId, enrolledStudentIds)))
    : [];

  const completionsByLesson = new Map<string, typeof scienceLessonCompletions.$inferSelect[]>();
  for (const c of completions) {
    const arr = completionsByLesson.get(c.lessonId) ?? [];
    arr.push(c);
    completionsByLesson.set(c.lessonId, arr);
  }

  const lessonsAnalytics = lessons.map((lesson) => {
    const lessonCompletions = completionsByLesson.get(lesson.id) ?? [];
    const studentsCompleted = lessonCompletions.filter((lc) => lc.status === "COMPLETED").length;
    const completionRate = totalStudents > 0 ? (studentsCompleted / totalStudents) * 100 : 0;
    const completedLessons = lessonCompletions.filter((lc) => lc.status === "COMPLETED");
    const averageScore = completedLessons.length > 0 ? completedLessons.reduce((sum, lc) => sum + (lc.mostRecentScorePercentage || 0), 0) / completedLessons.length : 0;
    const averageAttempts = completedLessons.length > 0 ? completedLessons.reduce((sum, lc) => sum + lc.attemptsCount, 0) / completedLessons.length : 0;
    const averageTimeSeconds = completedLessons.length > 0 ? completedLessons.reduce((sum, lc) => sum + lc.totalTimeSpentSeconds, 0) / completedLessons.length : 0;

    return {
      lessonId: lesson.id, lessonTitle: lesson.title, lessonOrder: lesson.order,
      completionRate: Math.round(completionRate * 10) / 10, studentsCompleted,
      averageScore: Math.round(averageScore * 10) / 10, averageScorePercentage: Math.round(averageScore * 10) / 10,
      averageAttempts: Math.round(averageAttempts * 10) / 10, averageTimeSeconds: Math.round(averageTimeSeconds),
      colorCode: getColorCode(averageScore),
    };
  });

  return { classId: input.classId, className: classRecord.name, totalStudents, lessons: lessonsAnalytics };
}

import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceClasses, scienceClassStudents, scienceLessonCompletions,
  scienceLessons, scienceStandardMastery, users,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB, type TenantDB } from "../db-contract.js";

/**
 * Gets the teacher dashboard data: class progress, students needing attention, recent completions.
 * @param user - Authenticated user context (must be TEACHER)
 * @param tenant - Tenant (school) context
 * @returns Dashboard data
 */
export async function getTeacherDashboard({ user, tenant }: { user: UserContext; tenant: Tenant }) {
  assertCan(user, "teachers:read:own", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const teacherClasses = await tenantDb.select({ id: scienceClasses.id, name: scienceClasses.name }).from(scienceClasses).where(eq(scienceClasses.teacherId, user.id));
  if (teacherClasses.length === 0) return { classProgress: [], studentsNeedingAttention: 0, recentCompletions: [] };

  const classIds = teacherClasses.map((c) => c.id);
  const [classProgress, studentsNeedingAttention, recentCompletions] = await Promise.all([
    computeClassProgress(tenantDb, classIds, teacherClasses),
    countStudentsNeedingAttention(tenantDb, classIds),
    fetchRecentCompletions(tenantDb, classIds),
  ]);

  return { classProgress, studentsNeedingAttention, recentCompletions };
}

async function computeClassProgress(tenantDb: TenantDB, classIds: string[], teacherClasses: Array<{ id: string; name: string }>) {
  const results: Array<{ classId: string; className: string; completionRate: number; averageScore: number; activeStudents: number }> = [];
  for (const classId of classIds) {
    const classInfo = teacherClasses.find((c) => c.id === classId);
    if (!classInfo) continue;
    const enrolled = await tenantDb.select({ id: scienceClassStudents.studentId }).from(scienceClassStudents).where(eq(scienceClassStudents.classId, classId));
    if (enrolled.length === 0) { results.push({ classId, className: classInfo.name, completionRate: 0, averageScore: 0, activeStudents: 0 }); continue; }
    const studentIds = enrolled.map((s) => s.id);
    const completions = await tenantDb.select({ studentId: scienceLessonCompletions.studentId, mostRecentScorePercentage: scienceLessonCompletions.mostRecentScorePercentage }).from(scienceLessonCompletions).where(and(inArray(scienceLessonCompletions.studentId, studentIds), eq(scienceLessonCompletions.status, "COMPLETED")));
    const unique = new Set(completions.map((c) => c.studentId)).size;
    const completionRate = enrolled.length > 0 ? Math.round((unique / enrolled.length) * 1000) / 10 : 0;
    const scores = completions.filter((c) => c.mostRecentScorePercentage !== null);
    const averageScore = scores.length > 0 ? Math.round((scores.reduce((s, c) => s + (c.mostRecentScorePercentage ?? 0), 0) / scores.length) * 10) / 10 : 0;
    results.push({ classId, className: classInfo.name, completionRate: Math.min(completionRate, 100), averageScore, activeStudents: enrolled.length });
  }
  return results;
}

async function countStudentsNeedingAttention(tenantDb: TenantDB, classIds: string[]) {
  const enrolled = await tenantDb.selectDistinct({ studentId: scienceClassStudents.studentId }).from(scienceClassStudents).where(inArray(scienceClassStudents.classId, classIds));
  if (enrolled.length === 0) return 0;
  const rows = await tenantDb.selectDistinct({ studentId: scienceStandardMastery.studentId }).from(scienceStandardMastery).where(and(inArray(scienceStandardMastery.studentId, enrolled.map((e) => e.studentId)), lt(scienceStandardMastery.masteryLevel, sql`0.6`)));
  return rows.length;
}

async function fetchRecentCompletions(tenantDb: TenantDB, classIds: string[]) {
  const enrolled = await tenantDb.selectDistinct({ studentId: scienceClassStudents.studentId }).from(scienceClassStudents).where(inArray(scienceClassStudents.classId, classIds));
  if (enrolled.length === 0) return [];
  const completions = await tenantDb.select({ mostRecentScorePercentage: scienceLessonCompletions.mostRecentScorePercentage, completedAt: scienceLessonCompletions.completedAt, createdAt: scienceLessonCompletions.createdAt, studentName: users.name, lessonTitle: scienceLessons.title }).from(scienceLessonCompletions).innerJoin(users, eq(users.id, scienceLessonCompletions.studentId)).innerJoin(scienceLessons, eq(scienceLessons.id, scienceLessonCompletions.lessonId)).where(and(eq(scienceLessonCompletions.status, "COMPLETED"), inArray(scienceLessonCompletions.studentId, enrolled.map((e) => e.studentId)))).orderBy(desc(scienceLessonCompletions.completedAt)).limit(5);
  return completions.map((c) => ({ studentName: c.studentName, lessonTitle: c.lessonTitle, score: c.mostRecentScorePercentage, completedAt: c.completedAt?.toISOString() ?? c.createdAt.toISOString() }));
}

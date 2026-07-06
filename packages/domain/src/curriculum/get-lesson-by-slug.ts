import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceLessons, scienceStandards, scienceLessonStandards,
  scienceUnitLessons, scienceCurriculumUnits, scienceClasses, scienceClassStudents,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Gets lesson content with its attached standards.
 *
 * ME-04: a lesson is only visible to an authenticated user when the lesson
 * is part of at least one class curriculum the caller can reach. Admins and
 * system users no longer receive "orphan" lessons that exist on the
 * tenant but are not linked to any `scienceCurriculumUnits` row.
 *
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the lessonSlug (may be slug or id)
 * @returns Lesson with standards, or null if not found, or "FORBIDDEN"
 */
export async function getLessonBySlug({ user, tenant, input }: { user: UserContext; tenant: Tenant; input: { lessonSlug: string } }) {
  assertCan(user, "curriculum:read", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [lesson] = await tenantDb.select().from(scienceLessons).where(or(eq(scienceLessons.slug, input.lessonSlug), eq(scienceLessons.id, input.lessonSlug))).limit(1);
  if (!lesson) return null;

  const standards = await tenantDb.select({ id: scienceStandards.id, code: scienceStandards.code, description: scienceStandards.description, framework: scienceStandards.framework, gradeLevel: scienceStandards.gradeLevel }).from(scienceLessonStandards).innerJoin(scienceStandards, eq(scienceStandards.id, scienceLessonStandards.standardId)).where(eq(scienceLessonStandards.lessonId, lesson.id));

  const classRows = await tenantDb.select({ classId: scienceClasses.id, teacherId: scienceClasses.teacherId }).from(scienceUnitLessons).innerJoin(scienceCurriculumUnits, eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId)).innerJoin(scienceClasses, eq(scienceClasses.id, scienceCurriculumUnits.classId)).where(eq(scienceUnitLessons.lessonId, lesson.id));

  // ME-04: every lesson must be reachable through at least one class
  // curriculum. If the lesson exists but is not linked to any class,
  // there is no legitimate access path for any caller — return FORBIDDEN.
  if (classRows.length === 0) return "FORBIDDEN";

  const isAdmin = user.role === "ADMIN" || user.role === "SYSTEM";
  let hasAccess = isAdmin;
  if (!hasAccess) {
    if (classRows.some((c) => c.teacherId === user.id)) { hasAccess = true; }
    else {
      const classIds = classRows.map((c) => c.classId);
      const myEnrollments = await tenantDb.select({ classId: scienceClassStudents.classId }).from(scienceClassStudents).where(and(eq(scienceClassStudents.studentId, user.id), inArray(scienceClassStudents.classId, classIds))).limit(1);
      hasAccess = myEnrollments.length > 0;
    }
  }
  if (!hasAccess) return "FORBIDDEN";

  return {
    lesson: {
      id: lesson.id, slug: lesson.id, title: lesson.title, titleThai: lesson.titleThai ?? lesson.title,
      content: lesson.content ?? "", contentThai: lesson.content ?? "",
      objectives: lesson.description ? [lesson.description] : [],
      objectivesThai: lesson.descriptionThai ? [lesson.descriptionThai] : lesson.description ? [lesson.description] : [],
      structuredContent: lesson.structuredContent ?? undefined,
      contentType: lesson.structuredContent ? "structured" : "legacy", contentVersion: lesson.structuredContent ? 1 : undefined,
    },
    standards: standards.map((s) => ({ id: s.id, code: s.code, description: s.description, descriptionThai: s.description, framework: s.framework, gradeLevel: s.gradeLevel })),
  };
}

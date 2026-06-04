import { and, desc, eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { scienceAssignments, scienceClassStudents, scienceClasses, scienceLessons, users } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Gets all assignments for classes a student is enrolled in.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the studentId
 * @returns Array of assignment records with lesson and teacher details
 */
export async function getStudentAssignments({ user, tenant, input }: { user: UserContext; tenant: Tenant; input: { studentId: string } }) {
  if (input.studentId !== user.id) assertCan(user, "progress:read:all", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const rows = await tenantDb
    .select({
      id: scienceAssignments.id, classId: scienceAssignments.classId, lessonId: scienceAssignments.lessonId,
      assignedAt: scienceAssignments.assignedAt, dueAt: scienceAssignments.dueAt, assignedBy: scienceAssignments.assignedBy,
      lessonInnerId: scienceLessons.id, lessonTitle: scienceLessons.title, lessonSlug: scienceLessons.slug, lessonOrder: scienceLessons.order,
      teacherId: users.id, teacherName: users.name, className: scienceClasses.name,
    })
    .from(scienceAssignments)
    .innerJoin(scienceClassStudents, and(eq(scienceClassStudents.classId, scienceAssignments.classId), eq(scienceClassStudents.studentId, input.studentId)))
    .innerJoin(scienceClasses, eq(scienceClasses.id, scienceAssignments.classId))
    .innerJoin(scienceLessons, eq(scienceLessons.id, scienceAssignments.lessonId))
    .innerJoin(users, eq(users.id, scienceAssignments.assignedBy))
    .orderBy(desc(scienceAssignments.assignedAt));

  return {
    success: true,
    data: {
      assignments: rows.map((a) => ({
        id: a.id, classId: a.classId, className: a.className, lessonId: a.lessonId,
        lesson: { id: a.lessonInnerId, title: a.lessonTitle, slug: a.lessonSlug, order: a.lessonOrder },
        assignedAt: a.assignedAt.toISOString(), dueAt: a.dueAt?.toISOString() ?? null,
        assignedBy: a.assignedBy, teacher: { id: a.teacherId, name: a.teacherName },
      })),
    },
  };
}

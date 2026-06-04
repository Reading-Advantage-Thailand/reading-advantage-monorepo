import { desc, eq, and } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceAssignments,
  scienceClasses,
  scienceClassStudents,
  scienceLessons,
  users,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Lists all assignments for a class with lesson and teacher details.
 * Teachers who own the class or students enrolled in the class can view
 * assignments.
 *
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `classId`
 * @returns Object with serialized `assignments` array
 * @throws {AuthError} When user lacks assignment:read permission
 */
export async function listAssignments({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { classId: string };
}) {
  assertCan(user, "assignment:read", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const { classId } = input;

  const [classRecord] = await tenantDb
    .select({ teacherId: scienceClasses.teacherId })
    .from(scienceClasses)
    .where(eq(scienceClasses.id, classId))
    .limit(1);

  if (!classRecord) {
    return { error: "Class not found", status: 404 };
  }

  const isTeacherOwner = classRecord.teacherId === user.id;
  let isEnrolledStudent = false;
  if (!isTeacherOwner) {
    const enrollment = await tenantDb
      .select({ studentId: scienceClassStudents.studentId })
      .from(scienceClassStudents)
      .where(
        and(
          eq(scienceClassStudents.classId, classId),
          eq(scienceClassStudents.studentId, user.id)
        )
      )
      .limit(1);
    isEnrolledStudent = enrollment.length > 0;
  }

  if (!isTeacherOwner && !isEnrolledStudent) {
    return { error: "Forbidden", status: 403 };
  }

  const rows = await tenantDb
    .select({
      id: scienceAssignments.id,
      classId: scienceAssignments.classId,
      lessonId: scienceAssignments.lessonId,
      assignedAt: scienceAssignments.assignedAt,
      dueAt: scienceAssignments.dueAt,
      assignedBy: scienceAssignments.assignedBy,
      createdAt: scienceAssignments.createdAt,
      teacherId: users.id,
      teacherName: users.name,
      lessonInnerId: scienceLessons.id,
      lessonTitle: scienceLessons.title,
      lessonSlug: scienceLessons.slug,
      lessonOrder: scienceLessons.order,
      lessonGradeLevel: scienceLessons.gradeLevel,
    })
    .from(scienceAssignments)
    .innerJoin(users, eq(users.id, scienceAssignments.assignedBy))
    .innerJoin(scienceLessons, eq(scienceLessons.id, scienceAssignments.lessonId))
    .where(eq(scienceAssignments.classId, classId))
    .orderBy(desc(scienceAssignments.assignedAt));

  return {
    success: true,
    data: {
      assignments: rows.map((a) => ({
        id: a.id,
        classId: a.classId,
        lessonId: a.lessonId,
        assignedAt: a.assignedAt.toISOString(),
        dueAt: a.dueAt?.toISOString() ?? null,
        assignedBy: a.assignedBy,
        teacher: { id: a.teacherId, name: a.teacherName },
        lesson: {
          id: a.lessonInnerId,
          title: a.lessonTitle,
          slug: a.lessonSlug,
          order: a.lessonOrder,
          gradeLevel: a.lessonGradeLevel,
        },
        createdAt: a.createdAt.toISOString(),
      })),
    },
  };
}

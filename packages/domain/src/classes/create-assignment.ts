import { eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceAssignments,
  scienceClasses,
  scienceLessons,
  users,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Creates a new assignment for a class. Only the teacher who owns the class
 * or an admin can create assignments.
 *
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `classId` and `lessonId`, optional `dueAt`
 * @returns Object with the created assignment data
 * @throws {AuthError} When user lacks assignment:create permission
 */
export async function createAssignment({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { classId: string; lessonId: string; dueAt?: string };
}) {
  assertCan(user, "assignment:create", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const { classId, lessonId, dueAt } = input;

  const [classRecord] = await tenantDb
    .select({ teacherId: scienceClasses.teacherId })
    .from(scienceClasses)
    .where(eq(scienceClasses.id, classId))
    .limit(1);

  if (!classRecord) {
    return { error: "Class not found", status: 404 };
  }

  const isTeacherOwner = classRecord.teacherId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isTeacherOwner && !isAdmin) {
    return { error: "Forbidden", status: 403 };
  }

  const [lesson] = await tenantDb
    .select({ id: scienceLessons.id })
    .from(scienceLessons)
    .where(eq(scienceLessons.id, lessonId))
    .limit(1);

  if (!lesson) {
    return { error: "Lesson not found", status: 404 };
  }

  let parsedDueAt: Date | null = null;
  if (dueAt) {
    parsedDueAt = new Date(dueAt);
    if (isNaN(parsedDueAt.getTime())) {
      return { error: "Invalid dueAt date", status: 400 };
    }
  }

  const [assignment] = await tenantDb
    .insert(scienceAssignments)
    .values({
      schoolId: tenant.schoolId!,
      classId,
      lessonId,
      assignedBy: user.id,
      dueAt: parsedDueAt,
    })
    .returning();

  const [teacherRow] = await tenantDb
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, assignment.assignedBy))
    .limit(1);

  const [lessonRow] = await tenantDb
    .select({
      id: scienceLessons.id,
      title: scienceLessons.title,
      slug: scienceLessons.slug,
      order: scienceLessons.order,
    })
    .from(scienceLessons)
    .where(eq(scienceLessons.id, assignment.lessonId))
    .limit(1);

  return {
    success: true,
    data: {
      id: assignment.id,
      classId: assignment.classId,
      lessonId: assignment.lessonId,
      assignedAt: assignment.assignedAt.toISOString(),
      dueAt: assignment.dueAt?.toISOString() ?? null,
      assignedBy: assignment.assignedBy,
      teacher: teacherRow,
      lesson: lessonRow,
      createdAt: assignment.createdAt.toISOString(),
    },
  };
}

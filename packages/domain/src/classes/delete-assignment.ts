import { eq, and } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  scienceAssignments,
  scienceClasses,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Deletes an assignment from a class. Only the teacher who owns the class
 * or an admin can delete assignments.
 *
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `classId` and `assignmentId`
 * @returns Object with `deleted: true` on success
 * @throws {AuthError} When user lacks assignment:delete permission
 */
export async function deleteAssignment({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { classId: string; assignmentId: string };
}) {
  assertCan(user, "assignment:delete", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const { classId, assignmentId } = input;

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

  const [assignment] = await tenantDb
    .select({ id: scienceAssignments.id })
    .from(scienceAssignments)
    .where(
      and(
        eq(scienceAssignments.id, assignmentId),
        eq(scienceAssignments.classId, classId)
      )
    )
    .limit(1);

  if (!assignment) {
    return { error: "Assignment not found", status: 404 };
  }

  await tenantDb
    .delete(scienceAssignments)
    .where(eq(scienceAssignments.id, assignmentId));

  return { success: true, data: { deleted: true } };
}

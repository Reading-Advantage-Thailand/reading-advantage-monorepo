import { and, eq, inArray } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { gamificationProfiles, scienceClasses, scienceClassStudents, users } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Gets the roster (enrolled students) for a class.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the classId
 * @returns Array of student records with joinedAt and lastActiveAt
 */
export async function getClassRoster({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { classId: string };
}) {
  assertCan(user, "class:roster", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [classRecord] = await tenantDb.select({ teacherId: scienceClasses.teacherId }).from(scienceClasses).where(eq(scienceClasses.id, input.classId)).limit(1);
  if (!classRecord) throw new Error("Class not found");

  const isTeacherOwner = classRecord.teacherId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isTeacherOwner && !isAdmin) throw new Error("Forbidden");

  const enrolled = await tenantDb.select({ studentId: scienceClassStudents.studentId }).from(scienceClassStudents).where(eq(scienceClassStudents.classId, input.classId));
  const studentIds = enrolled.map((e) => e.studentId);

  const studentRows = studentIds.length
    ? await tenantDb
        .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt, lastActiveAt: gamificationProfiles.lastActiveAt })
        .from(users)
        .leftJoin(gamificationProfiles, eq(gamificationProfiles.userId, users.id))
        .where(inArray(users.id, studentIds))
        .orderBy(users.name)
    : [];

  return {
    success: true,
    data: {
      students: studentRows.map((s) => ({
        id: s.id, name: s.name, email: s.email,
        joinedAt: s.createdAt.toISOString(),
        lastActiveAt: s.lastActiveAt?.toISOString() ?? null,
      })),
    },
  };
}

/**
 * Removes a student from a class roster.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing classId and studentId
 * @returns Confirmation of removal
 */
export async function removeStudentFromClass({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { classId: string; studentId: string };
}) {
  assertCan(user, "class:roster", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [classRecord] = await tenantDb.select({ teacherId: scienceClasses.teacherId }).from(scienceClasses).where(eq(scienceClasses.id, input.classId)).limit(1);
  if (!classRecord) throw new Error("Class not found");

  const isTeacherOwner = classRecord.teacherId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isTeacherOwner && !isAdmin) throw new Error("Forbidden");

  await tenantDb.delete(scienceClassStudents).where(and(eq(scienceClassStudents.classId, input.classId), eq(scienceClassStudents.studentId, input.studentId)));

  return { success: true, data: { removed: true } };
}

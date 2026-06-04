import { eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { scienceClasses } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Archives (deletes) a class. Teacher must own the class or be ADMIN.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the classId
 * @returns Confirmation of deletion
 */
export async function archiveClass({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { classId: string };
}) {
  assertCan(user, "class:archive", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [classRecord] = await tenantDb
    .select({ teacherId: scienceClasses.teacherId })
    .from(scienceClasses)
    .where(eq(scienceClasses.id, input.classId))
    .limit(1);

  if (!classRecord) throw new Error("Class not found");

  const isTeacherOwner = classRecord.teacherId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isTeacherOwner && !isAdmin) throw new Error("Forbidden");

  await tenantDb.delete(scienceClasses).where(eq(scienceClasses.id, input.classId));

  return { success: true, data: { deleted: true } };
}

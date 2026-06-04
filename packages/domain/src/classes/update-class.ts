import { eq } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { scienceClasses } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";

/**
 * Updates a class name. Teacher must own the class or be ADMIN.
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing classId and optional name
 * @returns The updated class record
 */
export async function updateClass({
  user,
  tenant,
  input,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { classId: string; name?: string };
}) {
  assertCan(user, "class:update", tenant);
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

  const updateData: Record<string, string> = {};
  if (input.name !== undefined) {
    if (typeof input.name !== "string" || input.name.trim().length < 3 || input.name.trim().length > 100) {
      throw new Error("Name must be between 3 and 100 characters");
    }
    updateData.name = input.name.trim();
  }

  if (Object.keys(updateData).length === 0) throw new Error("No valid fields to update");

  const [updated] = await tenantDb
    .update(scienceClasses)
    .set(updateData)
    .where(eq(scienceClasses.id, input.classId))
    .returning({ id: scienceClasses.id, name: scienceClasses.name, updatedAt: scienceClasses.updatedAt });

  return {
    success: true,
    data: { id: updated.id, name: updated.name, updatedAt: updated.updatedAt.toISOString() },
  };
}

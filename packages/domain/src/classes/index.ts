import { eq, and } from "drizzle-orm";
import { classrooms } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

interface CreateClassInput {
  name: string;
}

interface ListClassesInput {
  includeArchived: boolean;
}

export async function createClass({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: CreateClassInput;
}) {
  assertCan(user, "class:create", tenant);

  const [klass] = await db
    .insert(classrooms)
    .values({
      name: input.name,
      schoolId: tenant.schoolId,
      teacherId: user.id,
    })
    .returning();

  return klass;
}

export async function listClasses({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: ListClassesInput;
}) {
  assertCan(user, "class:list", tenant);

  const conditions = [];

  if (!input.includeArchived) {
    conditions.push(eq(classrooms.archived, false));
  }

  if (user.role === "TEACHER") {
    conditions.push(eq(classrooms.teacherId, user.id));
  }

  return db
    .select()
    .from(classrooms)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
}

import { eq, and } from "drizzle-orm";
import { users } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

const safeUserCols = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  schoolId: users.schoolId,
  image: users.image,
  xp: users.xp,
  level: users.level,
  cefrLevel: users.cefrLevel,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

/**
 * Get the currently authenticated user's own profile.
 * Intentionally unguarded — every authenticated user can read their own profile.
 */
export async function getMe({
  db,
  user,
}: {
  db: TenantDB;
  user: UserContext;
}) {
  const [result] = await db
    .select(safeUserCols)
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!result) {
    throw new Error("User not found");
  }

  return result;
}

export async function getUser({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { id: string };
}) {
  assertCan(user, "user:read", tenant);

  const conditions = [eq(users.id, input.id)];

  const [result] = await db
    .select(safeUserCols)
    .from(users)
    .where(and(...conditions))
    .limit(1);

  if (!result) {
    throw new Error("User not found");
  }

  return result;
}

export async function listUsers({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: {
    schoolId?: string;
    role?: "INTERN" | "STUDENT" | "TEACHER" | "ADMIN" | "SYSTEM";
    limit: number;
    offset: number;
  };
}) {
  assertCan(user, "user:list", tenant);

  const conditions = [];

  if (input.schoolId) {
    if (user.role !== "SYSTEM" && input.schoolId !== tenant.schoolId) {
      throw new Error("Cannot list users outside your school");
    }
    conditions.push(eq(users.schoolId, input.schoolId));
  }

  if (input.role) {
    conditions.push(eq(users.role, input.role));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select(safeUserCols)
    .from(users)
    .where(whereClause)
    .limit(input.limit)
    .offset(input.offset);
}

export async function updateUser({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: {
    id: string;
    name?: string;
    image?: string;
  };
}) {
  // Self-profile updates are allowed for any role; editing others requires user:update
  if (input.id !== user.id) {
    assertCan(user, "user:update", tenant);
  }

  const { id, ...updates } = input;

  const [updated] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updated) {
    throw new Error("User not found");
  }

  return updated;
}

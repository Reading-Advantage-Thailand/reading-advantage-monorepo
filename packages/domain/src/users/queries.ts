import { eq, and } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { users } from "@reading-advantage/db/schema";
import { UserNotFoundError } from "./errors.js";

const safeUserCols = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  schoolId: users.schoolId,
  image: users.image,
  githubUsername: users.githubUsername,
  xp: users.xp,
  level: users.level,
  cefrLevel: users.cefrLevel,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

/**
 * Get the currently authenticated user's own profile.
 * Intentionally unguarded — every authenticated user can read their own profile.
 *
 * Uses `unscoped()` because a user's own profile lookup is by primary key,
 * not tenant-scoped (the id is globally unique).
 */
export async function getMe({
  db,
  user,
}: {
  db: TenantDB;
  user: UserContext;
}) {
  const rawDb = db.unscoped("getMe looks up a user by primary key — globally unique");
  const [result] = await rawDb
    .select(safeUserCols)
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!result) {
    throw new UserNotFoundError(user.id);
  }

  return result;
}

/**
 * Retrieves a user by their ID with safe columns only. Requires user:read permission.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `id`
 * @returns The user record or throws if not found
 */
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
    throw new UserNotFoundError(input.id);
  }

  return result;
}

/**
 * Lists users with optional filters for schoolId and role, with pagination.
 * SYSTEM role can list across schools; others are scoped to their own schoolId.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Includes `schoolId`, optional `role`, `limit`, and `offset`
 * @returns Array of user records matching the filters
 */
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
    role?: "INTERN" | "STUDENT" | "TEACHER" | "ADMIN" | "SYSTEM" | "SALES_REP" | "SALES_ADMIN";
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

/**
 * Looks up a user by their GitHub username, returning null if not found.
 *
 * Uses `unscoped()` because GitHub usernames are globally unique — not
 * scoped to a single school. The lookup is guarded by `user:read` permission
 * at the caller.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `githubUsername`
 * @returns The user record or null
 */
export async function getUserByGithubUsername({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { githubUsername: string };
}) {
  assertCan(user, "user:read", tenant);

  const rawDb = db.unscoped("githubUsername is globally unique — cross-school lookup");
  const [result] = await rawDb
    .select(safeUserCols)
    .from(users)
    .where(eq(users.githubUsername, input.githubUsername))
    .limit(1);

  return result ?? null;
}

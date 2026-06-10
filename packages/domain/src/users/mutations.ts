import { eq } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { users } from "@reading-advantage/db/schema";

/**
 * Updates a user's name and/or image. Any user can update their own profile;
 * updating another user requires user:update permission.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `id`; optional `name` and `image`
 * @returns The updated user record or throws if not found
 */
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

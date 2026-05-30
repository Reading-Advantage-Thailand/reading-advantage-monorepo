import { eq } from "drizzle-orm";
import { gamificationProfiles } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

/**
 * Gets a student's gamification profile. Users can only view their own profile unless
 * they have the "gamification:read:all" permission.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing the userId
 * @returns The gamification profile or null if not found
 */
export async function getGamificationProfile({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { userId: string };
}) {
  if (input.userId !== user.id) {
    assertCan(user, "gamification:read:all", tenant);
  }

  const [profile] = await db
    .select()
    .from(gamificationProfiles)
    .where(eq(gamificationProfiles.userId, input.userId))
    .limit(1);

  return profile ?? null;
}

/**
 * Updates the XP for a student's gamification profile.
 * @param db - Tenant-scoped database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) context
 * @param input - Object containing userId and xp values
 * @returns The updated gamification profile
 */
/**
 * Overwrites the XP value for a user's gamification profile. Use this to
 * correct or initialize XP rather than incrementally add to it.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `userId` and `xp` (the new total XP value)
 * @returns The updated gamification profile record
 */
export async function updateGamificationXp({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { userId: string; xp: number };
}) {
  assertCan(user, "gamification:update", tenant);

  const [updated] = await db
    .update(gamificationProfiles)
    .set({ xp: input.xp, updatedAt: new Date() })
    .where(eq(gamificationProfiles.userId, input.userId))
    .returning();

  return updated;
}

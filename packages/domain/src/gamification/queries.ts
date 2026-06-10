import { eq } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { gamificationProfiles } from "@reading-advantage/db/schema";

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

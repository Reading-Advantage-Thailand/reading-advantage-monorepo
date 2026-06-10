import { eq } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { gamificationProfiles } from "@reading-advantage/db/schema";

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

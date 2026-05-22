import { eq } from "drizzle-orm";
import { gamificationProfiles } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

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

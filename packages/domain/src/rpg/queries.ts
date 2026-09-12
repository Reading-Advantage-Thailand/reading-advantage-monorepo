import { eq } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  studentRpgStateSchema,
  type RpgCosmeticId,
  type RpgQuestId,
  type StudentRpgState,
} from "@reading-advantage/game-contracts";
import {
  studentCosmeticUnlocks,
  studentRpgProfiles,
} from "@reading-advantage/db/schema";

import type { TenantDB } from "../db-contract.js";
import { RPG_COSMETICS, RPG_QUESTS } from "./definitions.js";

/**
 * Reads the authenticated user's tenant-scoped RPG state.
 * @param db Tenant-scoped database.
 * @param user Authenticated user.
 * @param tenant Authenticated school tenant.
 * @returns Fixed quest definitions with current unlock and equipment state.
 */
export async function getMyRpgState({
  db,
  user,
  tenant,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
}): Promise<StudentRpgState> {
  assertCan(user, "rpg:read:own", tenant);
  const [unlocks, profiles] = await Promise.all([
    db.select({
      questId: studentCosmeticUnlocks.questId,
      cosmeticId: studentCosmeticUnlocks.cosmeticId,
      unlockedAt: studentCosmeticUnlocks.unlockedAt,
    }).from(studentCosmeticUnlocks)
      .where(eq(studentCosmeticUnlocks.userId, user.id)),
    db.select({ equippedEmblemId: studentRpgProfiles.equippedEmblemId })
      .from(studentRpgProfiles)
      .where(eq(studentRpgProfiles.userId, user.id))
      .limit(1),
  ]);
  const unlockByCosmetic = new Map(unlocks.map((unlock) => [
    unlock.cosmeticId as RpgCosmeticId,
    unlock,
  ]));
  const unlockByQuest = new Map(unlocks.map((unlock) => [
    unlock.questId as RpgQuestId,
    unlock,
  ]));
  const equippedEmblemId = profiles[0]?.equippedEmblemId as RpgCosmeticId | null | undefined;

  return studentRpgStateSchema.parse({
    schemaVersion: 1,
    equippedEmblemId: equippedEmblemId ?? null,
    cosmetics: RPG_COSMETICS.map((cosmetic) => ({
      ...cosmetic,
      unlockedAt: unlockByCosmetic.get(cosmetic.id)?.unlockedAt.toISOString() ?? null,
      equipped: equippedEmblemId === cosmetic.id,
    })),
    quests: RPG_QUESTS.map((quest) => ({
      ...quest,
      completed: unlockByQuest.has(quest.id),
      completedAt: unlockByQuest.get(quest.id)?.unlockedAt.toISOString() ?? null,
    })),
  });
}

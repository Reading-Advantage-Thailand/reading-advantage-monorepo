import { and, eq } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  equipRpgCosmeticInputSchema,
  equipRpgCosmeticResultSchema,
  type EquipRpgCosmeticInput,
  type EquipRpgCosmeticResult,
} from "@reading-advantage/game-contracts";
import {
  studentCosmeticUnlocks,
  studentRpgProfiles,
} from "@reading-advantage/db/schema";

import type { TenantDB } from "../db-contract.js";
import {
  getEligibleRpgRewards,
  type RpgCompletionFacts,
} from "./definitions.js";

/** Error returned when a user selects a locked cosmetic. */
export class RpgCosmeticLockedError extends Error {
  /** Stable error code for HTTP adapters. */
  readonly code = "COSMETIC_LOCKED";

  constructor() {
    super("The selected cosmetic is not unlocked");
    this.name = "RpgCosmeticLockedError";
  }
}

/**
 * Grants eligible cosmetic rewards inside a completion transaction.
 * @param db Active tenant transaction.
 * @param completion Saved completion row from the active transaction.
 * @returns The number of eligible rewards attempted.
 */
export async function grantCompletionCosmetics(
  db: TenantDB,
  completion: RpgCompletionFacts,
): Promise<number> {
  const rewards = getEligibleRpgRewards(completion);
  if (rewards.length === 0) return 0;
  await db.insert(studentCosmeticUnlocks).values(rewards.map((reward) => ({
    schoolId: completion.schoolId,
    userId: completion.userId,
    questId: reward.questId,
    cosmeticId: reward.cosmeticId,
    sourceCompletionId: completion.id,
  }))).onConflictDoNothing();
  return rewards.length;
}

/**
 * Equips one cosmetic owned by the authenticated user.
 * @param db Tenant-scoped database.
 * @param user Authenticated user.
 * @param tenant Authenticated school tenant.
 * @param input Untrusted cosmetic selection.
 * @returns The validated equipped cosmetic result.
 * @throws When the cosmetic is not owned or the tenant has no school.
 */
export async function equipMyRpgCosmetic({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: EquipRpgCosmeticInput;
}): Promise<EquipRpgCosmeticResult> {
  assertCan(user, "rpg:equip:own", tenant);
  const parsed = equipRpgCosmeticInputSchema.parse(input);
  if (!tenant.schoolId) throw new Error("RPG equipment requires a school tenant");
  const schoolId = tenant.schoolId;

  return db.transaction(async (rawTx) => {
    const tx = rawTx as unknown as TenantDB;
    const [owned] = await tx.select({ id: studentCosmeticUnlocks.id })
      .from(studentCosmeticUnlocks)
      .where(and(
        eq(studentCosmeticUnlocks.userId, user.id),
        eq(studentCosmeticUnlocks.cosmeticId, parsed.cosmeticId),
      ))
      .limit(1);
    if (!owned) throw new RpgCosmeticLockedError();

    await tx.insert(studentRpgProfiles).values({
      schoolId,
      userId: user.id,
      equippedEmblemId: parsed.cosmeticId,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [studentRpgProfiles.schoolId, studentRpgProfiles.userId],
      set: { equippedEmblemId: parsed.cosmeticId, updatedAt: new Date() },
    });
    return equipRpgCosmeticResultSchema.parse({ equippedEmblemId: parsed.cosmeticId });
  });
}

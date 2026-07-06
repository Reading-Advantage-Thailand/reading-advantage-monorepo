import 'server-only';

import { eq } from '@reading-advantage/db';
import { gamificationProfiles } from '@reading-advantage/db/schema';
import {
  assertCan,
  AuthError,
  type Tenant,
  type UserContext,
} from '@reading-advantage/auth';
import type { DB } from '@reading-advantage/db';

import { calculateLevel, getLevelName } from './xp.constants';

export * from './xp.constants';

/**
 * Phase 1 (ST-1) secured contract:
 *   awardXp({ db, user, tenant, input: { profileId, amount } })
 *
 * `db` is expected to be a TenantDB scoped to the caller's tenant. The
 * function routes all mutations through `db` and additionally enforces:
 *   - `assertCan(user, 'progress:record', tenant)` for role/permission gating
 *   - a resource-level schoolId check so a user from one school cannot
 *     mutate a profile owned by another school
 *     (CR-01: F-SA-B22-001/003/019/020/061/062).
 *
 * @throws {AuthError} When the caller lacks `progress:record` or the
 *   profile's `schoolId` does not match the caller's `schoolId`.
 * @throws {Error} When the gamification profile does not exist.
 */
type AwardXpContext = {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: { profileId: string; amount: number };
};

/**
 * Awards XP to a gamification profile after asserting permission and
 * verifying the profile belongs to the caller's tenant.
 *
 * @param ctx - The secured context (db, user, tenant, input).
 * @returns The updated XP, level, level name, and whether a level-up occurred.
 */
export async function awardXp(ctx: AwardXpContext): Promise<{
  xp: number;
  level: number;
  levelName: string;
  levelUp: boolean;
}> {
  const { db, user, tenant, input } = ctx;
  assertCan(user, 'progress:record', tenant);

  const [profile] = await db
    .select()
    .from(gamificationProfiles)
    .where(eq(gamificationProfiles.id, input.profileId))
    .limit(1);

  if (!profile) {
    throw new Error(`GamificationProfile not found: ${input.profileId}`);
  }

  if (profile.schoolId !== user.schoolId) {
    throw new AuthError(
      `User ${user.id} cannot modify profile ${input.profileId} from school ${profile.schoolId}`,
      'FORBIDDEN',
    );
  }

  const previousLevel = profile.level;
  const newTotalXp = profile.xp + input.amount;
  const newLevel = calculateLevel(newTotalXp);
  const levelUp = newLevel > previousLevel;

  const [updated] = await db
    .update(gamificationProfiles)
    .set({
      xp: newTotalXp,
      level: newLevel,
      updatedAt: new Date(),
    })
    .where(eq(gamificationProfiles.id, input.profileId))
    .returning();

  return {
    xp: updated.xp,
    level: updated.level,
    levelName: getLevelName(updated.level),
    levelUp,
  };
}
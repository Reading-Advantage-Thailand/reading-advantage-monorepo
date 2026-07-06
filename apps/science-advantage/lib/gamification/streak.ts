import {
  assertCan,
  AuthError,
  type Tenant,
  type UserContext,
} from '@reading-advantage/auth';
import type { DB } from '@reading-advantage/db';
import { eq } from '@reading-advantage/db';
import { gamificationProfiles } from '@reading-advantage/db/schema';

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isYesterday(lastActive: Date, current: Date): boolean {
  const yesterday = new Date(current);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(lastActive, yesterday);
}

export function updateStreak(
  profile: { lastActiveAt: Date | null; streak: number },
  currentTime: Date
): { streak: number; lastActiveAt: Date } {
  if (!profile.lastActiveAt) {
    return { streak: 1, lastActiveAt: currentTime };
  }

  if (isSameDay(profile.lastActiveAt, currentTime)) {
    return { streak: profile.streak, lastActiveAt: currentTime };
  }

  if (isYesterday(profile.lastActiveAt, currentTime)) {
    return { streak: profile.streak + 1, lastActiveAt: currentTime };
  }

  return { streak: 1, lastActiveAt: currentTime };
}

export function getStreakMilestoneBonus(streak: number): number {
  if (streak === 7) return 50;
  if (streak === 30) return 200;
  return 0;
}

/**
 * Phase 1 (ST-1) secured contract:
 *   updateStreakForProfile({ db, user, tenant, input: { profileId, currentTime } })
 *
 * Routes the read/write through the caller-provided TenantDB and enforces
 * `assertCan(user, 'progress:record', tenant)` plus a resource-level
 * schoolId match (HI-03: F-SA-B21-056/057).
 */
type UpdateStreakContext = {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: { profileId: string; currentTime: Date };
};

/**
 * Updates a gamification profile's streak after asserting permission and
 * verifying the profile belongs to the caller's tenant.
 *
 * @param ctx - The secured context (db, user, tenant, input).
 * @returns The updated streak count and milestone bonus.
 * @throws {AuthError} When the caller lacks `progress:record` or the
 *   profile's `schoolId` does not match the caller's `schoolId`.
 */
export async function updateStreakForProfile(
  ctx: UpdateStreakContext
): Promise<{ streak: number; milestoneBonus: number }> {
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
      `User ${user.id} cannot update streak for profile ${input.profileId} from school ${profile.schoolId}`,
      'FORBIDDEN',
    );
  }

  const { streak, lastActiveAt } = updateStreak(
    { lastActiveAt: profile.lastActiveAt, streak: profile.streak },
    input.currentTime,
  );

  await db
    .update(gamificationProfiles)
    .set({
      streak,
      lastActiveAt,
      updatedAt: new Date(),
    })
    .where(eq(gamificationProfiles.id, input.profileId));

  const milestoneBonus = getStreakMilestoneBonus(streak);

  return { streak, milestoneBonus };
}
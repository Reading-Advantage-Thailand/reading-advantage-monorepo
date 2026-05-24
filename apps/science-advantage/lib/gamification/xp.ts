import 'server-only';

import { db, eq } from '@reading-advantage/db';
import { gamificationProfiles } from '@reading-advantage/db/schema';

import { calculateLevel, getLevelName } from './xp.constants';

export * from './xp.constants';

export async function awardXp(
  profileId: string,
  amount: number
): Promise<{ xp: number; level: number; levelName: string; levelUp: boolean }> {
  const [profile] = await db
    .select()
    .from(gamificationProfiles)
    .where(eq(gamificationProfiles.id, profileId))
    .limit(1);

  if (!profile) {
    throw new Error(`GamificationProfile not found: ${profileId}`);
  }

  const previousLevel = profile.level;
  const newTotalXp = profile.xp + amount;
  const newLevel = calculateLevel(newTotalXp);
  const levelUp = newLevel > previousLevel;

  const [updated] = await db
    .update(gamificationProfiles)
    .set({
      xp: newTotalXp,
      level: newLevel,
      updatedAt: new Date(),
    })
    .where(eq(gamificationProfiles.id, profileId))
    .returning();

  return {
    xp: updated.xp,
    level: updated.level,
    levelName: getLevelName(updated.level),
    levelUp,
  };
}

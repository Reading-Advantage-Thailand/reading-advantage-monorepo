import { db, eq } from '@reading-advantage/db';
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

export async function updateStreakForProfile(
  profileId: string,
  currentTime: Date
): Promise<{ streak: number; milestoneBonus: number }> {
  const [profile] = await db
    .select()
    .from(gamificationProfiles)
    .where(eq(gamificationProfiles.id, profileId))
    .limit(1);

  if (!profile) {
    throw new Error(`GamificationProfile not found: ${profileId}`);
  }

  const { streak, lastActiveAt } = updateStreak(
    { lastActiveAt: profile.lastActiveAt, streak: profile.streak },
    currentTime
  );

  await db
    .update(gamificationProfiles)
    .set({
      streak,
      lastActiveAt,
      updatedAt: new Date(),
    })
    .where(eq(gamificationProfiles.id, profileId));

  const milestoneBonus = getStreakMilestoneBonus(streak);

  return { streak, milestoneBonus };
}

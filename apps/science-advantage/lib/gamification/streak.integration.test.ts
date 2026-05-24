import { describe, it, expect, beforeEach } from 'vitest';
import { db, eq, sql } from '@reading-advantage/db';
import { gamificationProfiles, users } from '@reading-advantage/db/schema';
import { updateStreakForProfile } from './streak';

const TEST_USER_ID = 'streak-itest-user';

async function cleanupFixtures(): Promise<void> {
  await db.execute(sql`DELETE FROM gamification_profiles WHERE user_id = ${TEST_USER_ID}`);
  await db.execute(sql`DELETE FROM users WHERE id = ${TEST_USER_ID}`);
}

async function seedProfile(args: {
  streak: number;
  lastActiveAt: Date | null;
}) {
  await db.insert(users).values({
    id: TEST_USER_ID,
    name: 'Streak Test User',
    username: TEST_USER_ID,
    displayUsername: 'StreakTester',
    email: 'streak-itest@example.com',
    role: 'STUDENT',
  });

  const [profile] = await db
    .insert(gamificationProfiles)
    .values({
      userId: TEST_USER_ID,
      xp: 0,
      level: 1,
      streak: args.streak,
      lastActiveAt: args.lastActiveAt,
    })
    .returning();

  return profile;
}

describe('updateStreakForProfile (integration)', () => {
  beforeEach(async () => {
    await cleanupFixtures();
  });

  it('starts the streak at 1 when lastActiveAt is null', async () => {
    const profile = await seedProfile({ streak: 0, lastActiveAt: null });
    const now = new Date('2026-05-24T10:00:00Z');

    const result = await updateStreakForProfile(profile.id, now);

    expect(result.streak).toBe(1);
    expect(result.milestoneBonus).toBe(0);

    const [persisted] = await db
      .select()
      .from(gamificationProfiles)
      .where(eq(gamificationProfiles.id, profile.id))
      .limit(1);
    expect(persisted.streak).toBe(1);
    expect(persisted.lastActiveAt?.toISOString()).toBe(now.toISOString());
  });

  it('increments and awards 50 XP milestone when reaching 7 days', async () => {
    const yesterday = new Date('2026-05-23T10:00:00Z');
    const profile = await seedProfile({ streak: 6, lastActiveAt: yesterday });
    const now = new Date('2026-05-24T10:00:00Z');

    const result = await updateStreakForProfile(profile.id, now);

    expect(result.streak).toBe(7);
    expect(result.milestoneBonus).toBe(50);
  });

  it('resets to 1 when lastActiveAt is 2+ days ago', async () => {
    const profile = await seedProfile({
      streak: 10,
      lastActiveAt: new Date('2026-05-20T10:00:00Z'),
    });
    const now = new Date('2026-05-24T10:00:00Z');

    const result = await updateStreakForProfile(profile.id, now);

    expect(result.streak).toBe(1);
    expect(result.milestoneBonus).toBe(0);
  });

  it('throws when the profile does not exist', async () => {
    await expect(
      updateStreakForProfile('00000000-0000-0000-0000-000000000000', new Date())
    ).rejects.toThrow(/GamificationProfile not found/);
  });
});

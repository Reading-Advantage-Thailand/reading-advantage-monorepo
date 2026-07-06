import { describe, it, expect, beforeEach } from 'vitest';
import { createTenantDB } from '@reading-advantage/domain';
import { db, eq, sql } from '@reading-advantage/db';
import { gamificationProfiles, users,
  schools
} from '@reading-advantage/db/schema';
import { awardXp } from './xp';

const TEST_USER_ID = 'xp-itest-user';
const TEST_USERNAME = 'xp-itest-user';
const TEST_SCHOOL_ID = '00000000-0000-0000-0000-000000000099';

async function cleanupFixtures(): Promise<void> {
  await db.execute(sql`DELETE FROM gamification_profiles WHERE user_id = ${TEST_USER_ID}`);
  await db.execute(sql`DELETE FROM users WHERE id = ${TEST_USER_ID}`);
}

async function seedProfile(initialXp: number, initialLevel: number) {
  await db.insert(users).values({
    id: TEST_USER_ID,
    name: 'XP Test User',
    username: TEST_USERNAME,
    displayUsername: 'XpTester',
    email: 'xp-itest@example.com',
    role: 'STUDENT',
    schoolId: TEST_SCHOOL_ID,
  });

  const [profile] = await db
    .insert(gamificationProfiles)
    .values({
      userId: TEST_USER_ID,
      xp: initialXp,
      level: initialLevel,
      streak: 0,
      schoolId: TEST_SCHOOL_ID,
    })
    .returning();

  return profile;
}

const studentUser = {
  id: TEST_USER_ID,
  username: TEST_USERNAME,
  name: 'XP Test User',
  role: 'STUDENT' as const,
  schoolId: TEST_SCHOOL_ID,
  xp: 0,
  level: 1,
  cefrLevel: 'A1',
};

describe('awardXp (integration)', () => {
  beforeEach(async () => {
    await cleanupFixtures();
    await db.insert(schools).values({ id: TEST_SCHOOL_ID, name: 'Test School' }).onConflictDoNothing();
  });

  it('adds the awarded amount to the profile xp and recomputes level', async () => {
    const profile = await seedProfile(50, 1);
    const tenantDb = createTenantDB(db, { schoolId: TEST_SCHOOL_ID });

    const result = await awardXp({
      db: tenantDb,
      user: studentUser,
      tenant: { schoolId: TEST_SCHOOL_ID },
      input: { profileId: profile.id, amount: 75 },
    });

    expect(result.xp).toBe(125);
    expect(result.level).toBe(2);
    expect(result.levelName).toBe('Discoverer');
    expect(result.levelUp).toBe(true);

    const [persisted] = await db
      .select()
      .from(gamificationProfiles)
      .where(eq(gamificationProfiles.id, profile.id))
      .limit(1);
    expect(persisted.xp).toBe(125);
    expect(persisted.level).toBe(2);
  });

  it('returns levelUp=false when level does not change', async () => {
    const profile = await seedProfile(100, 2);
    const tenantDb = createTenantDB(db, { schoolId: TEST_SCHOOL_ID });

    const result = await awardXp({
      db: tenantDb,
      user: studentUser,
      tenant: { schoolId: TEST_SCHOOL_ID },
      input: { profileId: profile.id, amount: 50 },
    });

    expect(result.xp).toBe(150);
    expect(result.level).toBe(2);
    expect(result.levelUp).toBe(false);
  });

  it('throws when the profile does not exist', async () => {
    const tenantDb = createTenantDB(db, { schoolId: TEST_SCHOOL_ID });

    await expect(
      awardXp({
        db: tenantDb,
        user: studentUser,
        tenant: { schoolId: TEST_SCHOOL_ID },
        input: { profileId: '00000000-0000-0000-0000-000000000000', amount: 10 },
      }),
    ).rejects.toThrow(/GamificationProfile not found/);
  });
});
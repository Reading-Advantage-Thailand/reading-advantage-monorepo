import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  achievements,
  gamificationProfiles,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'me-gamification-itest';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

async function cleanup(): Promise<void> {
  await db.delete(achievements);
  await db.delete(gamificationProfiles);
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedUser(
  id: string,
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
) {
  const [u] = await db
    .insert(users)
    .values({
      id,
      name: id,
      username: id,
      displayUsername: id,
      email: `${id}@example.com`,
      role,
    })
    .returning();
  return u;
}

describe('GET /api/students/me/gamification (integration)', () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when caller is not a STUDENT', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns 404 when the student has no gamification profile', async () => {
    const student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Gamification profile not found');
  });

  it('returns gamification data with xpProgress, recent + total achievements', async () => {
    const student = await seedUser(`${TEST_PREFIX}-student2`, 'STUDENT');
    await db.insert(gamificationProfiles).values({
      userId: student.id,
      xp: 450,
      level: 3,
      streak: 7,
    });
    // 4 achievements; the route returns the 3 most-recently unlocked.
    const baseTime = Date.now();
    for (let i = 0; i < 4; i++) {
      await db.insert(achievements).values({
        userId: student.id,
        badgeType: `BADGE_${i}`,
        unlockedAt: new Date(baseTime + i * 1000),
      });
    }

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.xp).toBe(450);
    expect(body.level).toBe(3);
    expect(body.streak).toBe(7);
    expect(typeof body.levelName).toBe('string');
    // Level 3 → [300, 600]; xp 450 → currentLevelXp 150, nextLevelXp 300 (range), progress 50%
    expect(body.xpProgress).toEqual({
      currentLevelXp: 150,
      nextLevelXp: 300,
      progressPercent: 50,
    });
    expect(body.totalAchievements).toBe(4);
    expect(body.recentAchievements).toHaveLength(3);
    expect(body.recentAchievements[0].badgeType).toBe('BADGE_3');
    expect(body.recentAchievements[1].badgeType).toBe('BADGE_2');
    expect(body.recentAchievements[2].badgeType).toBe('BADGE_1');
  });

  it('returns 100% progress and zero ranges for unknown level threshold', async () => {
    const student = await seedUser(`${TEST_PREFIX}-student3`, 'STUDENT');
    await db.insert(gamificationProfiles).values({
      userId: student.id,
      xp: 2000,
      level: 6, // last threshold — no next; route returns currentLevelXp:0, nextLevelXp:0, progressPercent:100
      streak: 0,
    });

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.xpProgress).toEqual({
      currentLevelXp: 0,
      nextLevelXp: 0,
      progressPercent: 100,
    });
    expect(body.totalAchievements).toBe(0);
    expect(body.recentAchievements).toEqual([]);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, eq, sql } from '@reading-advantage/db';
import {
  accounts,
  achievements,
  gamificationProfiles,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'gamification-profile-itest';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://localhost:5432/test',
    NODE_ENV: 'test',
    NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: false,
    DEV_AUTH_ENABLED: false,
  },
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

function buildRequest(studentId: string) {
  return new NextRequest(
    `http://localhost:3000/api/students/${studentId}/gamification-profile`
  );
}

describe('GET /api/students/[studentId]/gamification-profile (integration)', () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
  });

  it('returns 401 when unauthenticated', async () => {
    const req = buildRequest('anyone');
    const res = await GET(req, {
      params: Promise.resolve({ studentId: 'anyone' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when a student requests another student profile', async () => {
    const studentA = await seedUser(`${TEST_PREFIX}-a`, 'STUDENT');
    const studentB = await seedUser(`${TEST_PREFIX}-b`, 'STUDENT');
    const session = await createSession(studentA.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = buildRequest(studentB.id);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: studentB.id }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 403 when a teacher requests a student profile and DEV_AUTH_ENABLED=false', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = buildRequest(student.id);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(403);
  });

  it('auto-creates a gamification profile on first access for own profile', async () => {
    const student = await seedUser(`${TEST_PREFIX}-fresh`, 'STUDENT');
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = buildRequest(student.id);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.xp).toBe(0);
    expect(body.level).toBe(1);
    expect(body.streak).toBe(0);
    expect(typeof body.levelName).toBe('string');
    expect(body.recentBadges).toEqual([]);
    // The fallback for the lowest level should still return a finite xpProgress.
    expect(body.xpProgress).toMatchObject({
      currentLevelXp: 0,
      progressPercent: 0,
    });
    expect(body.xpProgress.nextLevelXp).toBe(100);

    // Verify the row was persisted.
    const [created] = await db
      .select()
      .from(gamificationProfiles)
      .where(eq(gamificationProfiles.userId, student.id))
      .limit(1);
    expect(created).toBeDefined();
    expect(created.xp).toBe(0);
    expect(created.level).toBe(1);
  });

  it('returns the existing profile, recent badges (limit 3 desc), and xpProgress', async () => {
    const student = await seedUser(`${TEST_PREFIX}-existing`, 'STUDENT');
    await db.insert(gamificationProfiles).values({
      userId: student.id,
      xp: 450,
      level: 3,
      streak: 7,
    });
    const baseTime = Date.now();
    for (let i = 0; i < 4; i++) {
      await db.insert(achievements).values({
        userId: student.id,
        badgeType: `GP_BADGE_${i}`,
        unlockedAt: new Date(baseTime + i * 1000),
      });
    }

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = buildRequest(student.id);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id }),
    });
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
    expect(body.recentBadges).toHaveLength(3);
    expect(body.recentBadges[0].badgeType).toBe('GP_BADGE_3');
    expect(body.recentBadges[1].badgeType).toBe('GP_BADGE_2');
    expect(body.recentBadges[2].badgeType).toBe('GP_BADGE_1');
  });

  it('returns 100% progress and zero range for the top level threshold', async () => {
    const student = await seedUser(`${TEST_PREFIX}-top`, 'STUDENT');
    await db.insert(gamificationProfiles).values({
      userId: student.id,
      xp: 2000,
      level: 6,
      streak: 0,
    });

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = buildRequest(student.id);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.xpProgress).toEqual({
      currentLevelXp: 0,
      nextLevelXp: 0,
      progressPercent: 100,
    });
    expect(body.recentBadges).toEqual([]);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
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

const TEST_PREFIX = 'achievements-itest';

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
    `http://localhost:3000/api/students/${studentId}/achievements`
  );
}

describe('GET /api/students/[studentId]/achievements (integration)', () => {
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

  it('returns 403 when a student requests another student achievements', async () => {
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

  it('returns 403 when a teacher requests a student achievements and DEV_AUTH_ENABLED=false', async () => {
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

  it('returns an empty achievements array for a student with no badges', async () => {
    const student = await seedUser(`${TEST_PREFIX}-empty`, 'STUDENT');
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = buildRequest(student.id);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.achievements).toEqual([]);
  });

  it('returns all achievements for the student, ordered by unlockedAt desc', async () => {
    const student = await seedUser(`${TEST_PREFIX}-loaded`, 'STUDENT');
    const other = await seedUser(`${TEST_PREFIX}-other`, 'STUDENT');
    const baseTime = Date.now();
    for (let i = 0; i < 4; i++) {
      await db.insert(achievements).values({
        userId: student.id,
        badgeType: `ACH_BADGE_${i}`,
        unlockedAt: new Date(baseTime + i * 1000),
      });
    }
    // Achievement for a different user must not leak in.
    await db.insert(achievements).values({
      userId: other.id,
      badgeType: 'OTHER_BADGE',
      unlockedAt: new Date(baseTime + 10_000),
    });

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = buildRequest(student.id);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.achievements).toHaveLength(4);
    expect(body.achievements.map((a: { badgeType: string }) => a.badgeType)).toEqual([
      'ACH_BADGE_3',
      'ACH_BADGE_2',
      'ACH_BADGE_1',
      'ACH_BADGE_0',
    ]);
    // Each entry should expose exactly badgeType + unlockedAt.
    for (const a of body.achievements) {
      expect(Object.keys(a).sort()).toEqual(['badgeType', 'unlockedAt']);
      expect(typeof a.unlockedAt).toBe('string');
    }
  });

  it('allows a teacher to view a student achievements when DEV_AUTH_ENABLED=true', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: {
        DATABASE_URL: 'postgresql://localhost:5432/test',
        NODE_ENV: 'test',
        NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: false,
        DEV_AUTH_ENABLED: true,
      },
    }));
    const { GET: GETDev } = await import('./route');

    const teacher = await seedUser(`${TEST_PREFIX}-dev-teacher`, 'TEACHER');
    const student = await seedUser(`${TEST_PREFIX}-dev-student`, 'STUDENT');
    await db.insert(achievements).values({
      userId: student.id,
      badgeType: 'DEV_BADGE',
    });

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = buildRequest(student.id);
    const res = await GETDev(req, {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.achievements).toHaveLength(1);
    expect(body.achievements[0].badgeType).toBe('DEV_BADGE');

    vi.doUnmock('@/lib/env');
    vi.resetModules();
  });
});

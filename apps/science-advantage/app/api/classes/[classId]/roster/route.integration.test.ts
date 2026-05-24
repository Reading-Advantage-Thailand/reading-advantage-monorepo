import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  gamificationProfiles,
  scienceClasses,
  scienceClassStudents,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { DELETE, GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'roster-itest';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

type UserRow = typeof users.$inferSelect;
type ClassRow = typeof scienceClasses.$inferSelect;

async function cleanup(): Promise<void> {
  await db.delete(scienceClassStudents);
  await db.delete(scienceClasses);
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(
    sql`DELETE FROM gamification_profiles WHERE user_id LIKE ${`${TEST_PREFIX}-%`}`
  );
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedUser(
  id: string,
  role: 'TEACHER' | 'STUDENT' | 'ADMIN'
): Promise<UserRow> {
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

async function seedClass(teacherId: string): Promise<ClassRow> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'Roster Test Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `ROS-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      teacherId,
    })
    .returning();
  return cls;
}

function buildReq(classId: string, init?: RequestInit) {
  return new NextRequest(`http://localhost/api/classes/${classId}/roster`, init);
}

describe('GET /api/classes/[classId]/roster (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let admin: UserRow;
  let studentA: UserRow;
  let studentB: UserRow;
  let outsider: UserRow;
  let cls: ClassRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
    studentA = await seedUser(`${TEST_PREFIX}-alice`, 'STUDENT');
    studentB = await seedUser(`${TEST_PREFIX}-bob`, 'STUDENT');
    outsider = await seedUser(`${TEST_PREFIX}-outsider`, 'STUDENT');
    cls = await seedClass(teacher.id);
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: studentA.id });
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: studentB.id });
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns 404 when class does not exist', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghost = '00000000-0000-0000-0000-000000000000';
    const res = await GET(buildReq(ghost), {
      params: Promise.resolve({ classId: ghost }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Class not found' });
  });

  it('returns 403 for a non-owning teacher who is not admin', async () => {
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns 403 for an outsider student', async () => {
    const session = await createSession(outsider.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 for the owning teacher with students sorted by name asc', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.students).toHaveLength(2);
    const names = body.data.students.map((s: { name: string }) => s.name);
    expect(names).toEqual([...names].sort());
    for (const s of body.data.students) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.name).toBe('string');
      expect(typeof s.email).toBe('string');
      expect(typeof s.joinedAt).toBe('string');
      expect(s.lastActiveAt).toBeNull();
    }
  });

  it('returns 200 for admin who is not the owner', async () => {
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.students).toHaveLength(2);
  });

  it('includes lastActiveAt as ISO string when gamificationProfile exists', async () => {
    const lastActive = new Date('2026-01-15T12:00:00.000Z');
    await db.insert(gamificationProfiles).values({
      userId: studentA.id,
      lastActiveAt: lastActive,
    });
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const alice = body.data.students.find(
      (s: { id: string }) => s.id === studentA.id
    );
    expect(alice.lastActiveAt).toBe(lastActive.toISOString());
    const bob = body.data.students.find(
      (s: { id: string }) => s.id === studentB.id
    );
    expect(bob.lastActiveAt).toBeNull();
  });

  it('returns an empty array when class has no enrolled students', async () => {
    await db.delete(scienceClassStudents);
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.students).toEqual([]);
  });
});

describe('DELETE /api/classes/[classId]/roster (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let admin: UserRow;
  let studentA: UserRow;
  let studentB: UserRow;
  let cls: ClassRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
    studentA = await seedUser(`${TEST_PREFIX}-alice`, 'STUDENT');
    studentB = await seedUser(`${TEST_PREFIX}-bob`, 'STUDENT');
    cls = await seedClass(teacher.id);
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: studentA.id });
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: studentB.id });
  });

  function delReq(classId: string, body: unknown) {
    return new NextRequest(`http://localhost/api/classes/${classId}/roster`, {
      method: 'DELETE',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });
  }

  it('returns 401 when unauthenticated', async () => {
    const res = await DELETE(delReq(cls.id, { studentId: studentA.id }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when studentId is missing', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(delReq(cls.id, {}), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'studentId is required' });
  });

  it('returns 400 when studentId is not a string', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(delReq(cls.id, { studentId: 123 }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when class does not exist', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghost = '00000000-0000-0000-0000-000000000000';
    const res = await DELETE(delReq(ghost, { studentId: studentA.id }), {
      params: Promise.resolve({ classId: ghost }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is neither owner nor admin', async () => {
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(delReq(cls.id, { studentId: studentA.id }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('removes the student enrollment when the owning teacher calls it', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(delReq(cls.id, { studentId: studentA.id }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { removed: true } });

    const remaining = await db
      .select()
      .from(scienceClassStudents)
      .where(sql`${scienceClassStudents.classId} = ${cls.id}`);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].studentId).toBe(studentB.id);
  });

  it('allows admin to remove a student', async () => {
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(delReq(cls.id, { studentId: studentB.id }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
  });

  it('is a no-op (still 200) when the student is not enrolled', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const stranger = await seedUser(`${TEST_PREFIX}-stranger`, 'STUDENT');
    const res = await DELETE(delReq(cls.id, { studentId: stranger.id }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const remaining = await db
      .select()
      .from(scienceClassStudents)
      .where(sql`${scienceClassStudents.classId} = ${cls.id}`);
    expect(remaining).toHaveLength(2);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceUnitLessons,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET, PATCH, DELETE } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'classid-itest';

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
  await db.delete(scienceLessonCompletions);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceClassStudents);
  await db.delete(scienceLessons);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceClasses);
  await db.delete(sessions);
  await db.delete(accounts);
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
      name: 'Original Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `CID-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      teacherId,
    })
    .returning();
  return cls;
}

function buildReq(classId: string, init?: RequestInit) {
  return new NextRequest(`http://localhost/api/classes/${classId}`, init);
}

describe('GET /api/classes/[classId] (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let student: UserRow;
  let outsider: UserRow;
  let admin: UserRow;
  let cls: ClassRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    outsider = await seedUser(`${TEST_PREFIX}-outsider`, 'STUDENT');
    admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
    cls = await seedClass(teacher.id);
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });
  });

  it('returns 401 when unauthenticated', async () => {
    const req = buildReq(cls.id);
    const res = await GET(req, { params: Promise.resolve({ classId: cls.id }) });
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

  it('returns 403 for a non-owning teacher who is not admin or enrolled', async () => {
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 for outsider student', async () => {
    const session = await createSession(outsider.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 with full detail for the owning teacher', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      id: cls.id,
      name: 'Original Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: cls.joinCode,
      studentCount: 1,
      curriculumUnits: [],
    });
    expect(typeof body.data.createdAt).toBe('string');
    expect(typeof body.data.updatedAt).toBe('string');
  });

  it('returns 200 for the enrolled student', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 200 for an admin who is neither owner nor enrolled', async () => {
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(buildReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/classes/[classId] (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let admin: UserRow;
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
    cls = await seedClass(teacher.id);
  });

  function patchReq(classId: string, body: unknown) {
    return new NextRequest(`http://localhost/api/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });
  }

  it('returns 401 when unauthenticated', async () => {
    const res = await PATCH(patchReq(cls.id, { name: 'New Name' }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when class does not exist', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghost = '00000000-0000-0000-0000-000000000000';
    const res = await PATCH(patchReq(ghost, { name: 'Whatever' }), {
      params: Promise.resolve({ classId: ghost }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 when the user is neither owner nor admin', async () => {
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await PATCH(patchReq(cls.id, { name: 'Hijack' }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is too short', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await PATCH(patchReq(cls.id, { name: 'ab' }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/3 and 100/);
  });

  it('returns 400 when name is too long', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await PATCH(patchReq(cls.id, { name: 'x'.repeat(101) }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when no fields are provided', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await PATCH(patchReq(cls.id, {}), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/No valid fields/);
  });

  it('updates the class name when the owner sends a valid PATCH', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await PATCH(patchReq(cls.id, { name: '  Brand New Name  ' }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(cls.id);
    expect(body.data.name).toBe('Brand New Name');
    expect(typeof body.data.updatedAt).toBe('string');

    const [row] = await db
      .select()
      .from(scienceClasses)
      .where(sql`${scienceClasses.id} = ${cls.id}`);
    expect(row.name).toBe('Brand New Name');
  });

  it('allows admin to update any class', async () => {
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await PATCH(patchReq(cls.id, { name: 'Admin Edit' }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/classes/[classId] (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let student: UserRow;
  let admin: UserRow;
  let cls: ClassRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
    cls = await seedClass(teacher.id);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await DELETE(buildReq(cls.id, { method: 'DELETE' }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when class does not exist', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghost = '00000000-0000-0000-0000-000000000000';
    const res = await DELETE(buildReq(ghost, { method: 'DELETE' }), {
      params: Promise.resolve({ classId: ghost }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 when the user is neither owner nor admin', async () => {
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(buildReq(cls.id, { method: 'DELETE' }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('hard-deletes the class when no student progress exists', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });

    const res = await DELETE(buildReq(cls.id, { method: 'DELETE' }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { deleted: true } });

    const rows = await db
      .select()
      .from(scienceClasses)
      .where(sql`${scienceClasses.id} = ${cls.id}`);
    expect(rows).toHaveLength(0);
  });

  it('deletes class even when student progress (lessonCompletions) exists', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    // Seed lesson + completion for an enrolled student
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });
    const [lesson] = await db
      .insert(scienceLessons)
      .values({
        slug: `${TEST_PREFIX}-lesson-${Date.now()}`,
        title: 'L',
        gradeLevel: 3,
        order: 1,
      })
      .returning();
    await db.insert(scienceLessonCompletions).values({
      studentId: student.id,
      lessonId: lesson.id,
      status: 'COMPLETED',
    });

    const res = await DELETE(buildReq(cls.id, { method: 'DELETE' }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);

    const rows = await db
      .select()
      .from(scienceClasses)
      .where(sql`${scienceClasses.id} = ${cls.id}`);
    expect(rows).toHaveLength(0);

    // Enrollment row is gone too (cascade)
    const enrollments = await db
      .select()
      .from(scienceClassStudents)
      .where(sql`${scienceClassStudents.classId} = ${cls.id}`);
    expect(enrollments).toHaveLength(0);
  });

  it('allows admin to delete any class', async () => {
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(buildReq(cls.id, { method: 'DELETE' }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql, eq } from '@reading-advantage/db';
import {
  accounts,
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonStandards,
  scienceLessons,
  scienceStandards,
  scienceUnitLessons,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET, POST } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'classes-itest';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

type UserRow = typeof users.$inferSelect;

async function cleanup(): Promise<void> {
  await db.delete(scienceUnitLessons);
  await db.delete(scienceClassStudents);
  await db.delete(scienceLessonStandards);
  await db.delete(scienceLessons);
  await db.delete(scienceStandards);
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

describe('POST /api/classes (integration)', () => {
  let teacher: UserRow;
  let student: UserRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
  });

  function postReq(body: unknown) {
    return new NextRequest('http://localhost/api/classes', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });
  }

  it('returns 401 when unauthenticated', async () => {
    const res = await POST(
      postReq({ name: 'X', gradeLevel: 4, standardsAlignment: 'NGSS' })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns 403 when student tries to create class', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(
      postReq({ name: 'Science Class', gradeLevel: 4, standardsAlignment: 'NGSS' })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/Forbidden/);
  });

  it('returns 400 with details for invalid payload', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(
      postReq({ name: 'ab', gradeLevel: 99, standardsAlignment: 'INVALID' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Validation failed');
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('creates a class with no template lessons and returns 201', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(
      postReq({ name: 'Science Explorers', gradeLevel: 5, standardsAlignment: 'NGSS' })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      name: 'Science Explorers',
      gradeLevel: 5,
      standardsAlignment: 'NGSS',
      studentCount: 0,
    });
    expect(typeof body.data.id).toBe('string');
    expect(typeof body.data.joinCode).toBe('string');
    expect(body.data.joinCode).toHaveLength(6);
    expect(typeof body.data.createdAt).toBe('string');

    // Verify row landed in DB
    const [row] = await db
      .select()
      .from(scienceClasses)
      .where(eq(scienceClasses.id, body.data.id));
    expect(row.teacherId).toBe(teacher.id);

    // No template lessons => no curriculum unit created
    const units = await db
      .select()
      .from(scienceCurriculumUnits)
      .where(eq(scienceCurriculumUnits.classId, body.data.id));
    expect(units).toHaveLength(0);
  });

  it('creates a class AND a curriculum unit when template lessons exist', async () => {
    // Seed a standard + two lessons matching grade/framework
    const [standard] = await db
      .insert(scienceStandards)
      .values({
        framework: 'NGSS',
        code: `${TEST_PREFIX}-STD-1`,
        description: 'std',
      })
      .returning();
    const [l1] = await db
      .insert(scienceLessons)
      .values({
        slug: `${TEST_PREFIX}-tpl-lesson-1-${Date.now()}`,
        title: 'Template 1',
        gradeLevel: 5,
        order: 1,
      })
      .returning();
    const [l2] = await db
      .insert(scienceLessons)
      .values({
        slug: `${TEST_PREFIX}-tpl-lesson-2-${Date.now()}`,
        title: 'Template 2',
        gradeLevel: 5,
        order: 2,
      })
      .returning();
    await db.insert(scienceLessonStandards).values([
      { lessonId: l1.id, standardId: standard.id },
      { lessonId: l2.id, standardId: standard.id },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(
      postReq({ name: 'With Template', gradeLevel: 5, standardsAlignment: 'NGSS' })
    );
    expect(res.status).toBe(201);
    const body = await res.json();

    const units = await db
      .select()
      .from(scienceCurriculumUnits)
      .where(eq(scienceCurriculumUnits.classId, body.data.id));
    expect(units).toHaveLength(1);
    expect(units[0].framework).toBe('NGSS');
    expect(units[0].gradeLevel).toBe(5);
    expect(units[0].order).toBe(1);

    // Lessons connected via junction
    const junction = await db
      .select()
      .from(scienceUnitLessons)
      .where(eq(scienceUnitLessons.unitId, units[0].id));
    expect(junction.map(j => j.lessonId).sort()).toEqual([l1.id, l2.id].sort());
  });

  it('allows admin to create a class', async () => {
    const admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(
      postReq({ name: 'Admin Class', gradeLevel: 4, standardsAlignment: 'NGSS' })
    );
    expect(res.status).toBe(201);
  });
});

describe('GET /api/classes (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let student: UserRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
  });

  function listReq(query = '') {
    return new NextRequest(`http://localhost/api/classes${query}`);
  }

  it('returns 401 when unauthenticated', async () => {
    const res = await GET(listReq());
    expect(res.status).toBe(401);
  });

  it('returns 403 for student', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(listReq());
    expect(res.status).toBe(403);
  });

  it('returns only the teacher own classes with default pagination', async () => {
    // 2 classes for teacher, 1 for otherTeacher
    for (let i = 0; i < 2; i++) {
      await db.insert(scienceClasses).values({
        name: `T-Class-${i}`,
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: `T-${i}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        teacherId: teacher.id,
      });
    }
    await db.insert(scienceClasses).values({
      name: 'Other-Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `O-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      teacherId: otherTeacher.id,
    });

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(listReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    for (const cls of body.data) {
      expect(cls.studentCount).toBe(0);
      expect(typeof cls.joinCode).toBe('string');
      expect(typeof cls.createdAt).toBe('string');
    }
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('honors page and limit query params', async () => {
    for (let i = 0; i < 3; i++) {
      await db.insert(scienceClasses).values({
        name: `T-Class-${i}`,
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: `P-${i}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        teacherId: teacher.id,
      });
    }

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(listReq('?page=2&limit=2'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('returns studentCount reflecting enrolled students', async () => {
    const [cls] = await db
      .insert(scienceClasses)
      .values({
        name: 'Counted Class',
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: `C-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        teacherId: teacher.id,
      })
      .returning();
    const s1 = await seedUser(`${TEST_PREFIX}-s1`, 'STUDENT');
    const s2 = await seedUser(`${TEST_PREFIX}-s2`, 'STUDENT');
    await db.insert(scienceClassStudents).values([
      { classId: cls.id, studentId: s1.id },
      { classId: cls.id, studentId: s2.id },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(listReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    const found = body.data.find((c: { id: string }) => c.id === cls.id);
    expect(found.studentCount).toBe(2);
  });
});

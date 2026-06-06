import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql, eq } from '@reading-advantage/db';
import {
  accounts,
  scienceClasses,
  scienceClassStudents,
  sessions,
  users,
  schools
} from '@reading-advantage/db/schema';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'student-classes-itest';
const TEST_SCHOOL_ID = '00000000-0000-0000-0000-000000000099';

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
  await db.delete(scienceClassStudents);
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

async function seedClass(teacherId: string, name: string) {
  const [c] = await db
    .insert(scienceClasses)
    .values({
      name,
      teacherId,
      gradeLevel: 5,
      standardsAlignment: 'NGSS',
      joinCode: `code-${Date.now()}`,
      schoolId: TEST_SCHOOL_ID,
    })
    .returning();
  return c;
}

async function enrollStudent(studentId: string, classId: string) {
  await db.insert(scienceClassStudents).values({
    studentId,
    classId,
    schoolId: TEST_SCHOOL_ID,
  });
}

describe('GET /api/student/classes (integration)', () => {
  let teacher: UserRow;
  let student: UserRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    await db.insert(schools).values({ id: TEST_SCHOOL_ID, name: 'Test School' }).onConflictDoNothing();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
  });

  it('returns 401 when no session', async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty classes when user is a teacher', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET();
    expect(res.status).toBe(200);
  });

  it('returns enrolled classes for student', async () => {
    const cls = await seedClass(teacher.id, 'Test Class');
    await enrollStudent(student.id, cls.id);

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.classes).toHaveLength(1);
    expect(data.classes[0].id).toBe(cls.id);
    expect(data.classes[0].name).toBe('Test Class');
  });

  it('returns empty array when student has no classes', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.classes).toHaveLength(0);
  });
});

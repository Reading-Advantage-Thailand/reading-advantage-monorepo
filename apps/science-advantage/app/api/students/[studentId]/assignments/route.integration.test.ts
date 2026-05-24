import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceAssignments,
  scienceClasses,
  scienceClassStudents,
  scienceLessons,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'student-assignments-itest';

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
type LessonRow = typeof scienceLessons.$inferSelect;
type AssignmentRow = typeof scienceAssignments.$inferSelect;

async function cleanup(): Promise<void> {
  await db.delete(scienceAssignments);
  await db.delete(scienceClassStudents);
  await db.delete(scienceLessons);
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

async function seedClass(teacherId: string, name = 'Student Assignments Class'): Promise<ClassRow> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name,
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `SAS-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      teacherId,
    })
    .returning();
  return cls;
}

async function seedLesson(suffix: string, order: number): Promise<LessonRow> {
  const [lesson] = await db
    .insert(scienceLessons)
    .values({
      slug: `${TEST_PREFIX}-lesson-${suffix}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2, 6)}`,
      title: `Lesson ${suffix}`,
      gradeLevel: 3,
      order,
    })
    .returning();
  return lesson;
}

async function seedAssignment(
  classId: string,
  lessonId: string,
  teacherId: string,
  dueAt?: Date | null
): Promise<AssignmentRow> {
  const [a] = await db
    .insert(scienceAssignments)
    .values({
      classId,
      lessonId,
      assignedBy: teacherId,
      dueAt: dueAt ?? null,
    })
    .returning();
  return a;
}

function buildRequest(studentId: string) {
  return new NextRequest(
    `http://localhost:3000/api/students/${studentId}/assignments`
  );
}

describe('GET /api/students/[studentId]/assignments (integration)', () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await GET(buildRequest('anyone'), {
      params: Promise.resolve({ studentId: 'anyone' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns 403 when a student requests another student assignments', async () => {
    const studentA = await seedUser(`${TEST_PREFIX}-a`, 'STUDENT');
    const studentB = await seedUser(`${TEST_PREFIX}-b`, 'STUDENT');
    const session = await createSession(studentA.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(studentB.id), {
      params: Promise.resolve({ studentId: studentB.id }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns 200 with an empty array for a student with no enrollments', async () => {
    const student = await seedUser(`${TEST_PREFIX}-empty`, 'STUDENT');
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(student.id), {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { assignments: [] } });
  });

  it('returns 200 with an empty array when student is enrolled but class has no assignments', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    const cls = await seedClass(teacher.id);
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(student.id), {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.assignments).toEqual([]);
  });

  it('returns assignments for the student own classes with expected shape', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    const cls = await seedClass(teacher.id, 'Physics 101');
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });
    const lesson = await seedLesson('only', 1);
    const due = new Date('2026-12-01T10:00:00.000Z');
    const assignment = await seedAssignment(cls.id, lesson.id, teacher.id, due);

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(student.id), {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.assignments).toHaveLength(1);
    const [a] = body.data.assignments;
    expect(a).toMatchObject({
      id: assignment.id,
      classId: cls.id,
      className: 'Physics 101',
      lessonId: lesson.id,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        order: 1,
      },
      dueAt: '2026-12-01T10:00:00.000Z',
      assignedBy: teacher.id,
      teacher: { id: teacher.id, name: teacher.name },
    });
    expect(typeof a.assignedAt).toBe('string');
  });

  it('returns assignments only from classes the student is enrolled in, ordered by assignedAt desc', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    const otherStudent = await seedUser(`${TEST_PREFIX}-other`, 'STUDENT');

    const enrolledClass = await seedClass(teacher.id, 'Enrolled');
    const otherClass = await seedClass(teacher.id, 'Other');

    await db
      .insert(scienceClassStudents)
      .values({ classId: enrolledClass.id, studentId: student.id });
    await db
      .insert(scienceClassStudents)
      .values({ classId: otherClass.id, studentId: otherStudent.id });

    const lessonA = await seedLesson('A', 1);
    const lessonB = await seedLesson('B', 2);
    const lessonOther = await seedLesson('other', 99);

    const first = await seedAssignment(enrolledClass.id, lessonA.id, teacher.id);
    await new Promise((r) => setTimeout(r, 5));
    const second = await seedAssignment(enrolledClass.id, lessonB.id, teacher.id);
    // Assignment in a class the student is NOT enrolled in — must not appear.
    await seedAssignment(otherClass.id, lessonOther.id, teacher.id);

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(student.id), {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.assignments).toHaveLength(2);
    expect(body.data.assignments[0].id).toBe(second.id);
    expect(body.data.assignments[1].id).toBe(first.id);
    for (const a of body.data.assignments) {
      expect(a.classId).toBe(enrolledClass.id);
    }
  });

  it('returns null dueAt when assignment has no due date', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    const cls = await seedClass(teacher.id);
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });
    const lesson = await seedLesson('nd', 1);
    await seedAssignment(cls.id, lesson.id, teacher.id);

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(student.id), {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.assignments[0].dueAt).toBeNull();
  });

  it('allows a teacher to view any student assignments', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    const student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    const cls = await seedClass(teacher.id);
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });
    const lesson = await seedLesson('t', 1);
    await seedAssignment(cls.id, lesson.id, teacher.id);

    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(student.id), {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.assignments).toHaveLength(1);
  });

  it('allows an admin to view any student assignments', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
    const student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    const cls = await seedClass(teacher.id);
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });
    const lesson = await seedLesson('a', 1);
    await seedAssignment(cls.id, lesson.id, teacher.id);

    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest(student.id), {
      params: Promise.resolve({ studentId: student.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.assignments).toHaveLength(1);
  });
});

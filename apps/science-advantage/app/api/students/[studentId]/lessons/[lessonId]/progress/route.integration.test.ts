import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceClassStudents,
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceUnitLessons,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'progress-itest';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

type UserRow = typeof users.$inferSelect;
type LessonRow = typeof scienceLessons.$inferSelect;
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

async function seedUser(id: string, role: 'TEACHER' | 'STUDENT'): Promise<UserRow> {
  const [user] = await db
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
  return user;
}

async function seedClassWithLesson(args: {
  teacherId: string;
  studentIds: string[];
}): Promise<{ cls: ClassRow; lesson: LessonRow }> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'Progress Test Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `PROG-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      teacherId: args.teacherId,
    })
    .returning();

  for (const sid of args.studentIds) {
    await db.insert(scienceClassStudents).values({ classId: cls.id, studentId: sid });
  }

  const [unit] = await db
    .insert(scienceCurriculumUnits)
    .values({
      slug: `${TEST_PREFIX}-unit-${Date.now()}`,
      title: 'Progress Unit',
      framework: 'THAI',
      gradeLevel: 3,
      order: 1,
      classId: cls.id,
    })
    .returning();

  const [lesson] = await db
    .insert(scienceLessons)
    .values({
      slug: `${TEST_PREFIX}-lesson-${Date.now()}`,
      title: 'Progress Lesson',
      gradeLevel: 3,
      order: 1,
    })
    .returning();

  await db.insert(scienceUnitLessons).values({ unitId: unit.id, lessonId: lesson.id });

  return { cls, lesson };
}

describe('GET /api/students/[studentId]/lessons/[lessonId]/progress (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let student: UserRow;
  let outsider: UserRow;
  let cls: ClassRow;
  let lesson: LessonRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    outsider = await seedUser(`${TEST_PREFIX}-outsider`, 'STUDENT');
    const seeded = await seedClassWithLesson({
      teacherId: teacher.id,
      studentIds: [student.id],
    });
    cls = seeded.cls;
    lesson = seeded.lesson;
  });

  it('returns 401 when not authenticated', async () => {
    const req = new NextRequest(`http://localhost/x`);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id, lessonId: lesson.id }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when student does not exist', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/x`);
    const res = await GET(req, {
      params: Promise.resolve({
        studentId: `${TEST_PREFIX}-nope`,
        lessonId: lesson.id,
      }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when lesson does not exist', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/x`);
    const res = await GET(req, {
      params: Promise.resolve({
        studentId: student.id,
        lessonId: '00000000-0000-0000-0000-000000000000',
      }),
    });
    expect(res.status).toBe(404);
  });

  it('lets the student view their own progress with `me`', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/x`);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: 'me', lessonId: lesson.id }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.studentId).toBe(student.id);
    expect(data.status).toBe('NOT_STARTED');
    expect(data.attemptsCount).toBe(0);
  });

  it('lets the student view their own progress by explicit id', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/x`);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id, lessonId: lesson.id }),
    });
    expect(res.status).toBe(200);
  });

  it('lets the owning teacher view a student in their class', async () => {
    await db.insert(scienceLessonCompletions).values({
      studentId: student.id,
      lessonId: lesson.id,
      status: 'COMPLETED',
      attemptsCount: 2,
      bestScore: 9,
      bestScorePercentage: 90,
      mostRecentScore: 8,
      mostRecentScorePercentage: 80,
      totalTimeSpentSeconds: 240,
      completedAt: new Date('2026-05-24T10:00:00Z'),
      lastAttemptAt: new Date('2026-05-24T10:00:00Z'),
    });

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/x`);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id, lessonId: lesson.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('COMPLETED');
    expect(data.attemptsCount).toBe(2);
    expect(data.bestScore).toBe(9);
    expect(data.bestScorePercentage).toBe(90);
    expect(data.mostRecentScorePercentage).toBe(80);
    expect(data.completedAt).toBe('2026-05-24T10:00:00.000Z');
  });

  it('returns 403 when another teacher tries to view the student', async () => {
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/x`);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id, lessonId: lesson.id }),
    });
    expect(res.status).toBe(403);
    expect(cls.id).toBeTruthy();
  });

  it('returns 403 when another student tries to view someone else', async () => {
    const session = await createSession(outsider.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/x`);
    const res = await GET(req, {
      params: Promise.resolve({ studentId: student.id, lessonId: lesson.id }),
    });
    expect(res.status).toBe(403);
  });
});

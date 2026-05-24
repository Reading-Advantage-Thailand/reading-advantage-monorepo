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
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'curriculum-itest';

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

async function seedClass(teacherId: string): Promise<ClassRow> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'Curriculum Test Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `CURR-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      teacherId,
    })
    .returning();
  return cls;
}

async function seedUnitWithLessons(
  classId: string,
  unitOrder: number,
  lessonOrders: number[]
): Promise<{ unitId: string; lessons: LessonRow[] }> {
  const [unit] = await db
    .insert(scienceCurriculumUnits)
    .values({
      slug: `${TEST_PREFIX}-unit-${unitOrder}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2, 6)}`,
      title: `Unit ${unitOrder}`,
      framework: 'THAI',
      gradeLevel: 3,
      order: unitOrder,
      classId,
    })
    .returning();

  const lessons: LessonRow[] = [];
  for (const order of lessonOrders) {
    const [lesson] = await db
      .insert(scienceLessons)
      .values({
        slug: `${TEST_PREFIX}-lesson-${unitOrder}-${order}-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2, 6)}`,
        title: `Lesson U${unitOrder}-${order}`,
        gradeLevel: 3,
        order,
      })
      .returning();
    lessons.push(lesson);
    await db
      .insert(scienceUnitLessons)
      .values({ unitId: unit.id, lessonId: lesson.id });
  }

  return { unitId: unit.id, lessons };
}

describe('GET /api/classes/[classId]/curriculum (integration)', () => {
  let teacher: UserRow;
  let student: UserRow;
  let outsider: UserRow;
  let cls: ClassRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    outsider = await seedUser(`${TEST_PREFIX}-outsider`, 'STUDENT');
    cls = await seedClass(teacher.id);
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });
  });

  it('returns 401 when not authenticated', async () => {
    mockCookies.get.mockReturnValue(undefined);
    const req = new NextRequest(`http://localhost/api/classes/${cls.id}/curriculum`);
    const res = await GET(req, { params: Promise.resolve({ classId: cls.id }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when class does not exist', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghostId = '00000000-0000-0000-0000-000000000000';
    const req = new NextRequest(`http://localhost/api/classes/${ghostId}/curriculum`);
    const res = await GET(req, { params: Promise.resolve({ classId: ghostId }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 for a non-enrolled student', async () => {
    const session = await createSession(outsider.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/api/classes/${cls.id}/curriculum`);
    const res = await GET(req, { params: Promise.resolve({ classId: cls.id }) });
    expect(res.status).toBe(403);
  });

  it('allows the teacher with empty curriculum', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/api/classes/${cls.id}/curriculum`);
    const res = await GET(req, { params: Promise.resolve({ classId: cls.id }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.class.id).toBe(cls.id);
    expect(data.units).toEqual([]);
  });

  it('returns units and lessons ordered by `order` for the enrolled student', async () => {
    // Two units; second seeded first but with higher order so we exercise sort.
    const unit2 = await seedUnitWithLessons(cls.id, 2, [2, 1]);
    const unit1 = await seedUnitWithLessons(cls.id, 1, [3, 1, 2]);

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/api/classes/${cls.id}/curriculum`);
    const res = await GET(req, { params: Promise.resolve({ classId: cls.id }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.units.map((u: { id: string }) => u.id)).toEqual([
      unit1.unitId,
      unit2.unitId,
    ]);
    expect(
      data.units[0].lessons.map((l: { order: number }) => l.order)
    ).toEqual([1, 2, 3]);
    expect(
      data.units[1].lessons.map((l: { order: number }) => l.order)
    ).toEqual([1, 2]);

    // Default progress is NOT_STARTED with zero counts.
    for (const unit of data.units) {
      for (const lesson of unit.lessons) {
        expect(lesson.progress.status).toBe('NOT_STARTED');
        expect(lesson.completed).toBe(false);
        expect(lesson.started).toBe(false);
        expect(lesson.progress.attemptsCount).toBe(0);
      }
    }
  });

  it('reflects the calling student’s completion status and scores', async () => {
    const { lessons } = await seedUnitWithLessons(cls.id, 1, [1, 2]);

    // Insert a COMPLETED row for lesson[0] and an IN_PROGRESS row for lesson[1].
    await db.insert(scienceLessonCompletions).values([
      {
        studentId: student.id,
        lessonId: lessons[0].id,
        status: 'COMPLETED',
        attemptsCount: 2,
        bestScore: 9,
        bestScorePercentage: 90,
        mostRecentScore: 8,
        mostRecentScorePercentage: 80,
        completedAt: new Date('2026-05-24T12:00:00Z'),
        lastAttemptAt: new Date('2026-05-24T12:00:00Z'),
        totalTimeSpentSeconds: 120,
      },
      {
        studentId: student.id,
        lessonId: lessons[1].id,
        status: 'IN_PROGRESS',
        attemptsCount: 1,
        lastAttemptAt: new Date('2026-05-24T13:00:00Z'),
      },
    ]);

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/api/classes/${cls.id}/curriculum`);
    const res = await GET(req, { params: Promise.resolve({ classId: cls.id }) });
    const data = await res.json();

    const unit = data.units[0];
    const lessonView0 = unit.lessons.find(
      (l: { id: string }) => l.id === lessons[0].id
    );
    const lessonView1 = unit.lessons.find(
      (l: { id: string }) => l.id === lessons[1].id
    );

    expect(lessonView0.completed).toBe(true);
    expect(lessonView0.started).toBe(true);
    expect(lessonView0.progress.attemptsCount).toBe(2);
    expect(lessonView0.progress.bestScore).toBe(9);
    expect(lessonView0.progress.bestScorePercentage).toBe(90);
    expect(lessonView0.progress.completedAt).toBe(
      '2026-05-24T12:00:00.000Z'
    );

    expect(lessonView1.completed).toBe(false);
    expect(lessonView1.started).toBe(true);
    expect(lessonView1.progress.status).toBe('IN_PROGRESS');
    expect(lessonView1.progress.completedAt).toBeNull();
  });
});

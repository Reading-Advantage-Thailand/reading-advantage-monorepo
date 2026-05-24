import { describe, it, expect, beforeEach, vi } from 'vitest';
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

const TEST_PREFIX = 'analytics-overview-itest';

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

async function seedUser(id: string, role: 'TEACHER' | 'STUDENT' | 'ADMIN'): Promise<UserRow> {
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

async function seedClassWithLessons(args: {
  teacherId: string;
  studentIds: string[];
  lessonCount: number;
}): Promise<{ cls: ClassRow; lessons: LessonRow[] }> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'Analytics Overview Test Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `AOV-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      teacherId: args.teacherId,
    })
    .returning();

  for (const studentId of args.studentIds) {
    await db.insert(scienceClassStudents).values({
      classId: cls.id,
      studentId,
    });
  }

  const [unit] = await db
    .insert(scienceCurriculumUnits)
    .values({
      slug: `${TEST_PREFIX}-unit-${Date.now()}`,
      title: 'Overview Unit',
      framework: 'THAI',
      gradeLevel: 3,
      order: 1,
      classId: cls.id,
    })
    .returning();

  const lessons: LessonRow[] = [];
  for (let i = 1; i <= args.lessonCount; i++) {
    const [lesson] = await db
      .insert(scienceLessons)
      .values({
        slug: `${TEST_PREFIX}-lesson-${i}-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2, 6)}`,
        title: `Lesson ${i}`,
        gradeLevel: 3,
        order: i,
      })
      .returning();
    lessons.push(lesson);
    await db
      .insert(scienceUnitLessons)
      .values({ unitId: unit.id, lessonId: lesson.id });
  }

  return { cls, lessons };
}

describe('GET /api/classes/[classId]/analytics/overview (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let admin: UserRow;
  let student1: UserRow;
  let student2: UserRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();

    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
    student1 = await seedUser(`${TEST_PREFIX}-s1`, 'STUDENT');
    student2 = await seedUser(`${TEST_PREFIX}-s2`, 'STUDENT');
  });

  it('returns 404 for an unknown class', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghostId = '00000000-0000-0000-0000-000000000000';
    const res = await GET(new Request(`http://localhost/${ghostId}`), {
      params: Promise.resolve({ classId: ghostId }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 for a teacher who does not own the class', async () => {
    const { cls } = await seedClassWithLessons({
      teacherId: teacher.id,
      studentIds: [],
      lessonCount: 0,
    });
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(new Request(`http://localhost/${cls.id}`), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('allows the owning teacher; empty lessons array when none seeded', async () => {
    const { cls } = await seedClassWithLessons({
      teacherId: teacher.id,
      studentIds: [student1.id],
      lessonCount: 0,
    });
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(new Request(`http://localhost/${cls.id}`), {
      params: Promise.resolve({ classId: cls.id }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.classId).toBe(cls.id);
    expect(data.totalStudents).toBe(1);
    expect(data.lessons).toEqual([]);
  });

  it('allows an ADMIN even when not the owner', async () => {
    const { cls } = await seedClassWithLessons({
      teacherId: teacher.id,
      studentIds: [],
      lessonCount: 0,
    });
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(new Request(`http://localhost/${cls.id}`), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
  });

  it('aggregates per-lesson analytics correctly', async () => {
    const { cls, lessons } = await seedClassWithLessons({
      teacherId: teacher.id,
      studentIds: [student1.id, student2.id],
      lessonCount: 2,
    });

    // Lesson 1 completions: student1=85%, student2=92%.
    await db.insert(scienceLessonCompletions).values([
      {
        studentId: student1.id,
        lessonId: lessons[0].id,
        status: 'COMPLETED',
        mostRecentScorePercentage: 85,
        attemptsCount: 2,
        totalTimeSpentSeconds: 600,
        completedAt: new Date(),
        lastAttemptAt: new Date(),
      },
      {
        studentId: student2.id,
        lessonId: lessons[0].id,
        status: 'COMPLETED',
        mostRecentScorePercentage: 92,
        attemptsCount: 1,
        totalTimeSpentSeconds: 480,
        completedAt: new Date(),
        lastAttemptAt: new Date(),
      },
      // Lesson 2: only student1 completed at 55%.
      {
        studentId: student1.id,
        lessonId: lessons[1].id,
        status: 'COMPLETED',
        mostRecentScorePercentage: 55,
        attemptsCount: 3,
        totalTimeSpentSeconds: 900,
        completedAt: new Date(),
        lastAttemptAt: new Date(),
      },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(new Request(`http://localhost/${cls.id}`), {
      params: Promise.resolve({ classId: cls.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalStudents).toBe(2);
    expect(data.lessons).toHaveLength(2);

    // Lessons sorted by order ascending.
    expect(data.lessons[0].lessonId).toBe(lessons[0].id);
    expect(data.lessons[1].lessonId).toBe(lessons[1].id);

    // Lesson 1: 2/2 completed → 100% completion; avg score = 88.5 → 88.5; blue (>=80 green, >=90 blue → 88.5 = green).
    expect(data.lessons[0].completionRate).toBe(100);
    expect(data.lessons[0].studentsCompleted).toBe(2);
    expect(data.lessons[0].averageScore).toBe(88.5);
    expect(data.lessons[0].averageAttempts).toBe(1.5);
    expect(data.lessons[0].averageTimeSeconds).toBe(540);
    expect(data.lessons[0].colorCode).toBe('green');

    // Lesson 2: 1/2 = 50%; avg 55 → yellow (>=60? no, 55 < 60 → red).
    expect(data.lessons[1].completionRate).toBe(50);
    expect(data.lessons[1].studentsCompleted).toBe(1);
    expect(data.lessons[1].averageScore).toBe(55);
    expect(data.lessons[1].colorCode).toBe('red');
  });

  it('ignores completions from students not enrolled in the class', async () => {
    const { cls, lessons } = await seedClassWithLessons({
      teacherId: teacher.id,
      studentIds: [student1.id], // only student1 enrolled
      lessonCount: 1,
    });
    // student2 completes the lesson but is not enrolled — should not count.
    await db.insert(scienceLessonCompletions).values({
      studentId: student2.id,
      lessonId: lessons[0].id,
      status: 'COMPLETED',
      mostRecentScorePercentage: 95,
      attemptsCount: 1,
      totalTimeSpentSeconds: 100,
      completedAt: new Date(),
      lastAttemptAt: new Date(),
    });

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(new Request(`http://localhost/${cls.id}`), {
      params: Promise.resolve({ classId: cls.id }),
    });
    const data = await res.json();

    expect(data.totalStudents).toBe(1);
    expect(data.lessons[0].studentsCompleted).toBe(0);
    expect(data.lessons[0].completionRate).toBe(0);
  });
});

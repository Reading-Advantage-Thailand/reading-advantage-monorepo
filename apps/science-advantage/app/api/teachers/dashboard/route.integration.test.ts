import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceClasses,
  scienceClassStudents,
  scienceLessonCompletions,
  scienceLessons,
  scienceStandardMastery,
  scienceStandards,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'teacher-dashboard-itest';
const STANDARDS_DESC = 'teacher-dashboard-itest standard';

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
  await db.delete(scienceStandardMastery);
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = ${STANDARDS_DESC}`
  );
  await db.delete(scienceClassStudents);
  await db.delete(scienceLessons);
  await db.delete(scienceClasses);
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedUser(
  id: string,
  role: 'TEACHER' | 'STUDENT' | 'ADMIN',
  opts: { name?: string } = {}
): Promise<UserRow> {
  const [u] = await db
    .insert(users)
    .values({
      id,
      name: opts.name ?? id,
      username: id,
      displayUsername: id,
      email: `${id}@example.com`,
      role,
    })
    .returning();
  return u;
}

async function seedClass(
  teacherId: string,
  name = 'Science 101'
): Promise<ClassRow> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name,
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `TDB-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
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

async function seedStandard(code: string) {
  const [s] = await db
    .insert(scienceStandards)
    .values({
      framework: 'THAI',
      code,
      description: STANDARDS_DESC,
      gradeLevel: 3,
    })
    .returning();
  return s;
}

function buildRequest() {
  return new NextRequest('http://localhost:3000/api/teachers/dashboard');
}

describe('GET /api/teachers/dashboard (integration)', () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
  });

  it('returns a non-2xx error when unauthenticated', async () => {
    // requireRole() -> requireAuth() -> redirect() throws NEXT_REDIRECT;
    // the try/catch surfaces it as a 500 (matches pre-migration behavior).
    let res: Response;
    try {
      res = await GET(buildRequest());
    } catch (err) {
      expect(err).toBeDefined();
      return;
    }
    expect(res.status).not.toBe(200);
  });

  it('returns a non-2xx error when a student tries to access the teacher dashboard', async () => {
    // Non-TEACHER role: requireRole() redirects to ROLE_ROUTES[STUDENT] →
    // NEXT_REDIRECT thrown → caught by route try/catch → 500.
    const student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    let res: Response;
    try {
      res = await GET(buildRequest());
    } catch (err) {
      expect(err).toBeDefined();
      return;
    }
    expect(res.status).not.toBe(200);
  });

  it('returns empty progress when teacher has no classes', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-lonely`, 'TEACHER');
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      classProgress: [],
      studentsNeedingAttention: 0,
      recentCompletions: [],
    });
  });

  it('returns class progress with completion rate, average score, and active students', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER', {
      name: 'Ms. Teacher',
    });
    const cls = await seedClass(teacher.id, 'Science 101');
    const lesson1 = await seedLesson('one', 1);

    const s1 = await seedUser(`${TEST_PREFIX}-s1`, 'STUDENT', { name: 'Alice' });
    const s2 = await seedUser(`${TEST_PREFIX}-s2`, 'STUDENT', { name: 'Bob' });
    const s3 = await seedUser(`${TEST_PREFIX}-s3`, 'STUDENT', {
      name: 'Charlie',
    });
    for (const s of [s1, s2, s3]) {
      await db
        .insert(scienceClassStudents)
        .values({ classId: cls.id, studentId: s.id });
    }

    await db.insert(scienceLessonCompletions).values([
      {
        studentId: s1.id,
        lessonId: lesson1.id,
        status: 'COMPLETED',
        mostRecentScore: 90,
        mostRecentScorePercentage: 90,
        bestScore: 90,
        bestScorePercentage: 90,
        attemptsCount: 1,
        totalTimeSpentSeconds: 120,
        completedAt: new Date(),
        lastAttemptAt: new Date(),
      },
      {
        studentId: s2.id,
        lessonId: lesson1.id,
        status: 'COMPLETED',
        mostRecentScore: 80,
        mostRecentScorePercentage: 80,
        bestScore: 80,
        bestScorePercentage: 80,
        attemptsCount: 1,
        totalTimeSpentSeconds: 150,
        completedAt: new Date(),
        lastAttemptAt: new Date(),
      },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.classProgress).toHaveLength(1);
    const c = data.classProgress[0];
    expect(c.classId).toBe(cls.id);
    expect(c.className).toBe('Science 101');
    expect(c.activeStudents).toBe(3);
    expect(c.completionRate).toBeCloseTo(66.7, 1);
    expect(c.averageScore).toBeCloseTo(85, 0);
  });

  it('counts students needing attention when mastery is below 0.6 across the teacher classes', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const cls = await seedClass(teacher.id);
    const standard = await seedStandard(`${TEST_PREFIX}-Sc1.1`);

    const s1 = await seedUser(`${TEST_PREFIX}-s1`, 'STUDENT');
    const s2 = await seedUser(`${TEST_PREFIX}-s2`, 'STUDENT');
    const s3 = await seedUser(`${TEST_PREFIX}-s3`, 'STUDENT');
    for (const s of [s1, s2, s3]) {
      await db
        .insert(scienceClassStudents)
        .values({ classId: cls.id, studentId: s.id });
    }

    await db.insert(scienceStandardMastery).values([
      {
        studentId: s1.id,
        standardId: standard.id,
        masteryLevel: String(0.4),
        lastAssessedAt: new Date(),
      },
      {
        studentId: s2.id,
        standardId: standard.id,
        masteryLevel: String(0.55),
        lastAssessedAt: new Date(),
      },
      {
        studentId: s3.id,
        standardId: standard.id,
        masteryLevel: String(0.8),
        lastAssessedAt: new Date(),
      },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.studentsNeedingAttention).toBe(2);
  });

  it('returns zero attention count when all mastery is above 0.6', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const cls = await seedClass(teacher.id);
    const standard = await seedStandard(`${TEST_PREFIX}-Sc1.2`);

    const s1 = await seedUser(`${TEST_PREFIX}-s1`, 'STUDENT');
    const s2 = await seedUser(`${TEST_PREFIX}-s2`, 'STUDENT');
    for (const s of [s1, s2]) {
      await db
        .insert(scienceClassStudents)
        .values({ classId: cls.id, studentId: s.id });
    }

    await db.insert(scienceStandardMastery).values([
      {
        studentId: s1.id,
        standardId: standard.id,
        masteryLevel: String(0.85),
        lastAssessedAt: new Date(),
      },
      {
        studentId: s2.id,
        standardId: standard.id,
        masteryLevel: String(0.92),
        lastAssessedAt: new Date(),
      },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.studentsNeedingAttention).toBe(0);
  });

  it('ignores mastery rows for students enrolled in other teacher classes (tenant scoping)', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    const cls = await seedClass(teacher.id, 'Mine');
    const otherCls = await seedClass(otherTeacher.id, 'Theirs');
    const standard = await seedStandard(`${TEST_PREFIX}-Sc2.1`);

    const myStudent = await seedUser(`${TEST_PREFIX}-mine`, 'STUDENT');
    const otherStudent = await seedUser(`${TEST_PREFIX}-other`, 'STUDENT');
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: myStudent.id });
    await db
      .insert(scienceClassStudents)
      .values({ classId: otherCls.id, studentId: otherStudent.id });

    await db.insert(scienceStandardMastery).values([
      {
        studentId: myStudent.id,
        standardId: standard.id,
        masteryLevel: String(0.3),
        lastAssessedAt: new Date(),
      },
      {
        // not in my class — should NOT count
        studentId: otherStudent.id,
        standardId: standard.id,
        masteryLevel: String(0.2),
        lastAssessedAt: new Date(),
      },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest());
    const data = await res.json();
    expect(data.studentsNeedingAttention).toBe(1);
  });

  it('returns recent completions with student name, lesson title, score, and timestamp', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const cls = await seedClass(teacher.id);
    const lesson1 = await seedLesson('one', 1);
    const lesson2 = await seedLesson('two', 2);

    const s1 = await seedUser(`${TEST_PREFIX}-s1`, 'STUDENT', { name: 'Alice' });
    const s2 = await seedUser(`${TEST_PREFIX}-s2`, 'STUDENT', { name: 'Bob' });
    for (const s of [s1, s2]) {
      await db
        .insert(scienceClassStudents)
        .values({ classId: cls.id, studentId: s.id });
    }

    await db.insert(scienceLessonCompletions).values([
      {
        studentId: s1.id,
        lessonId: lesson1.id,
        status: 'COMPLETED',
        mostRecentScore: 100,
        mostRecentScorePercentage: 100,
        bestScore: 100,
        bestScorePercentage: 100,
        attemptsCount: 1,
        totalTimeSpentSeconds: 100,
        completedAt: new Date('2025-01-01T10:00:00Z'),
        lastAttemptAt: new Date(),
      },
      {
        studentId: s2.id,
        lessonId: lesson2.id,
        status: 'COMPLETED',
        mostRecentScore: 75,
        mostRecentScorePercentage: 75,
        bestScore: 75,
        bestScorePercentage: 75,
        attemptsCount: 2,
        totalTimeSpentSeconds: 200,
        completedAt: new Date('2025-01-02T10:00:00Z'),
        lastAttemptAt: new Date(),
      },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.recentCompletions).toHaveLength(2);
    // Most recent first (s2, lesson2).
    expect(data.recentCompletions[0].studentName).toBe('Bob');
    expect(data.recentCompletions[0].lessonTitle).toBe(lesson2.title);
    expect(data.recentCompletions[0].score).toBe(75);
    expect(typeof data.recentCompletions[0].completedAt).toBe('string');
    expect(data.recentCompletions[1].studentName).toBe('Alice');
    expect(data.recentCompletions[1].lessonTitle).toBe(lesson1.title);
  });

  it('limits recent completions to 5 most recent', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const cls = await seedClass(teacher.id);
    const lesson = await seedLesson('shared', 1);

    for (let i = 0; i < 7; i++) {
      const s = await seedUser(`${TEST_PREFIX}-s${i}`, 'STUDENT', {
        name: `Student ${i}`,
      });
      await db
        .insert(scienceClassStudents)
        .values({ classId: cls.id, studentId: s.id });
      await db.insert(scienceLessonCompletions).values({
        studentId: s.id,
        lessonId: lesson.id,
        status: 'COMPLETED',
        mostRecentScore: 80 + i,
        mostRecentScorePercentage: 80 + i,
        bestScore: 80 + i,
        bestScorePercentage: 80 + i,
        attemptsCount: 1,
        totalTimeSpentSeconds: 100 + i * 10,
        completedAt: new Date(2025, 0, i + 1),
        lastAttemptAt: new Date(),
      });
    }

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.recentCompletions.length).toBeLessThanOrEqual(5);
  });

  it('returns zero active students and zero rates when a class has no enrolled students', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const cls = await seedClass(teacher.id, 'Empty Class');

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.classProgress).toHaveLength(1);
    expect(data.classProgress[0]).toEqual({
      classId: cls.id,
      className: 'Empty Class',
      completionRate: 0,
      averageScore: 0,
      activeStudents: 0,
    });
  });

  it('aggregates across multiple classes owned by the teacher', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    const classA = await seedClass(teacher.id, 'Class A');
    const classB = await seedClass(teacher.id, 'Class B');

    const sA = await seedUser(`${TEST_PREFIX}-sa`, 'STUDENT');
    const sB = await seedUser(`${TEST_PREFIX}-sb`, 'STUDENT');
    await db
      .insert(scienceClassStudents)
      .values({ classId: classA.id, studentId: sA.id });
    await db
      .insert(scienceClassStudents)
      .values({ classId: classB.id, studentId: sB.id });

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(buildRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.classProgress).toHaveLength(2);
    const byId = new Map<string, { activeStudents: number }>(
      data.classProgress.map((c: { classId: string; activeStudents: number }) => [
        c.classId,
        c,
      ])
    );
    expect(byId.get(classA.id)?.activeStudents).toBe(1);
    expect(byId.get(classB.id)?.activeStudents).toBe(1);
  });
});

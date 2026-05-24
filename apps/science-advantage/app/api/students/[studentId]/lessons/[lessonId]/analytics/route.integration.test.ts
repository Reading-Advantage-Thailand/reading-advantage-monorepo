import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceAttempts,
  scienceClassStudents,
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessons,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandards,
  scienceUnitLessons,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'student-lesson-analytics-itest';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

async function cleanup(): Promise<void> {
  await db.delete(scienceQuestionResponses);
  await db.delete(scienceAttempts);
  await db.delete(scienceQuestionStandards);
  await db.delete(scienceQuizQuestions);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceClassStudents);
  await db.delete(scienceLessons);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceClasses);
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = 'SL analytics standard'`
  );
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedUser(id: string, role: 'TEACHER' | 'STUDENT' | 'ADMIN', name?: string) {
  const [u] = await db
    .insert(users)
    .values({
      id,
      name: name ?? id,
      username: id,
      displayUsername: id,
      email: `${id}@example.com`,
      role,
    })
    .returning();
  return u;
}

async function seedScenario() {
  const teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER', 'Teach');
  const otherTeacher = await seedUser(`${TEST_PREFIX}-other`, 'TEACHER');
  const admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
  const student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT', 'Alice');

  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'SL Analytics Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `SLA-${Date.now()}`,
      teacherId: teacher.id,
    })
    .returning();
  await db
    .insert(scienceClassStudents)
    .values({ classId: cls.id, studentId: student.id });

  const [unit] = await db
    .insert(scienceCurriculumUnits)
    .values({
      slug: `${TEST_PREFIX}-unit-${Date.now()}`,
      title: 'SL Unit',
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
      title: 'SL Lesson',
      gradeLevel: 3,
      order: 1,
    })
    .returning();
  await db
    .insert(scienceUnitLessons)
    .values({ unitId: unit.id, lessonId: lesson.id });

  const [std1] = await db
    .insert(scienceStandards)
    .values({
      framework: 'THAI',
      code: `SL-${TEST_PREFIX}-S1-${Date.now()}`,
      description: 'SL analytics standard',
      gradeLevel: 3,
    })
    .returning();

  const [q1] = await db
    .insert(scienceQuizQuestions)
    .values({
      slug: `${TEST_PREFIX}-q1-${Date.now()}`,
      lessonId: lesson.id,
      type: 'MULTIPLE_CHOICE',
      text: 'Q1?',
      options: ['A', 'B'],
      correctAnswer: 'A',
      points: 1,
      order: 1,
    })
    .returning();
  const [q2] = await db
    .insert(scienceQuizQuestions)
    .values({
      slug: `${TEST_PREFIX}-q2-${Date.now()}`,
      lessonId: lesson.id,
      type: 'MULTIPLE_CHOICE',
      text: 'Q2?',
      options: ['A', 'B'],
      correctAnswer: 'A',
      points: 1,
      order: 2,
    })
    .returning();
  await db.insert(scienceQuestionStandards).values([
    { questionId: q1.id, standardId: std1.id },
    { questionId: q2.id, standardId: std1.id },
  ]);

  // Attempt 1: 1/2 correct (q1 correct, q2 wrong).
  const [attempt1] = await db
    .insert(scienceAttempts)
    .values({
      studentId: student.id,
      lessonId: lesson.id,
      score: 1,
      maxScore: 2,
      attemptNumber: 1,
      startedAt: new Date('2026-05-23T10:00:00Z'),
      completedAt: new Date('2026-05-23T10:05:00Z'),
    })
    .returning();
  await db.insert(scienceQuestionResponses).values([
    {
      attemptId: attempt1.id,
      questionId: q1.id,
      studentAnswer: 'A',
      isCorrect: true,
      timeSpentSeconds: 30,
      answeredAt: new Date(),
      order: 1,
    },
    {
      attemptId: attempt1.id,
      questionId: q2.id,
      studentAnswer: 'B',
      isCorrect: false,
      timeSpentSeconds: 45,
      answeredAt: new Date(),
      order: 2,
    },
  ]);

  // Attempt 2 (most recent): 2/2 correct.
  const [attempt2] = await db
    .insert(scienceAttempts)
    .values({
      studentId: student.id,
      lessonId: lesson.id,
      score: 2,
      maxScore: 2,
      attemptNumber: 2,
      startedAt: new Date('2026-05-24T10:00:00Z'),
      completedAt: new Date('2026-05-24T10:05:00Z'),
    })
    .returning();
  await db.insert(scienceQuestionResponses).values([
    {
      attemptId: attempt2.id,
      questionId: q1.id,
      studentAnswer: 'A',
      isCorrect: true,
      timeSpentSeconds: 20,
      answeredAt: new Date(),
      order: 1,
    },
    {
      attemptId: attempt2.id,
      questionId: q2.id,
      studentAnswer: 'A',
      isCorrect: true,
      timeSpentSeconds: 25,
      answeredAt: new Date(),
      order: 2,
    },
  ]);

  return { teacher, otherTeacher, admin, student, lesson, q1, q2, std1 };
}

describe('GET /api/students/[studentId]/lessons/[lessonId]/analytics (integration)', () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
  });

  it('returns a non-2xx error when not authenticated', async () => {
    // requireAuth() calls redirect() which throws NEXT_REDIRECT; the try/catch
    // surfaces it as a 500 (matches the pre-migration behavior). The point of
    // the test is that an unauthenticated caller never gets data back.
    let res: Response;
    try {
      res = await GET(new Request('http://localhost'), {
        params: Promise.resolve({
          studentId: `${TEST_PREFIX}-x`,
          lessonId: '00000000-0000-0000-0000-000000000000',
        }),
      });
    } catch (err) {
      // redirect() may also surface as an uncaught throw in non-Next runtime.
      expect(err).toBeDefined();
      return;
    }
    expect(res.status).not.toBe(200);
  });

  it('returns 404 when student does not exist', async () => {
    const { teacher } = await seedScenario();
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({
        studentId: `${TEST_PREFIX}-nope`,
        lessonId: '00000000-0000-0000-0000-000000000000',
      }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 when a non-teacher of the student tries to view', async () => {
    const { otherTeacher, student, lesson } = await seedScenario();
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ studentId: student.id, lessonId: lesson.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when lesson does not exist', async () => {
    const { teacher, student } = await seedScenario();
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({
        studentId: student.id,
        lessonId: '00000000-0000-0000-0000-000000000000',
      }),
    });
    expect(res.status).toBe(404);
  });

  it('returns attempt history newest-first with full per-question breakdown', async () => {
    const { teacher, student, lesson, q1, q2 } = await seedScenario();
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ studentId: student.id, lessonId: lesson.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.student).toEqual({ id: student.id, name: 'Alice' });
    expect(data.lesson.id).toBe(lesson.id);
    expect(data.attemptHistory).toHaveLength(2);
    expect(data.attemptHistory[0].attemptNumber).toBe(2);
    expect(data.attemptHistory[1].attemptNumber).toBe(1);

    const recent = data.attemptHistory[0];
    expect(recent.score).toBe(2);
    expect(recent.scorePercentage).toBe(100);
    expect(recent.colorCode).toBe('blue');
    expect(recent.questionBreakdown).toHaveLength(2);
    expect(recent.questionBreakdown[0].questionId).toBe(q1.id);
    expect(recent.questionBreakdown[0].isCorrect).toBe(true);
    expect(recent.questionBreakdown[1].questionId).toBe(q2.id);
    expect(recent.questionBreakdown[1].isCorrect).toBe(true);

    const earlier = data.attemptHistory[1];
    expect(earlier.score).toBe(1);
    expect(earlier.scorePercentage).toBe(50);
    expect(earlier.questionBreakdown[1].isCorrect).toBe(false);
  });

  it('computes standards performance using only the most recent attempt', async () => {
    const { teacher, student, lesson, std1 } = await seedScenario();
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ studentId: student.id, lessonId: lesson.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.standardsPerformance).toHaveLength(1);
    const entry = data.standardsPerformance[0];
    expect(entry.standardId).toBe(std1.id);
    // Both questions attached to std1, both answered correctly on attempt 2.
    expect(entry.questionsCount).toBe(2);
    expect(entry.questionsAnswered).toBe(2);
    expect(entry.questionsCorrect).toBe(2);
    expect(entry.masteryPercentage).toBe(100);
  });

  it('allows ADMIN regardless of teacher relationship', async () => {
    const { admin, student, lesson } = await seedScenario();
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ studentId: student.id, lessonId: lesson.id }),
    });
    expect(res.status).toBe(200);
  });
});

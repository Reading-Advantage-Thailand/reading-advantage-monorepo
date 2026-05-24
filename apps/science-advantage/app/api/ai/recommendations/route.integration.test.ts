import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceAttempts,
  scienceClassStudents,
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessonStandards,
  scienceLessons,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandards,
  scienceUnitLessons,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'ai-rec-itest';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

// Mock the LLM service — we don't want to hit a real provider in tests.
vi.mock('@/lib/ai/recommendation-service', () => ({
  generateRecommendation: vi.fn(async () => ({
    recommendation: {
      nextLessonId: 'mock-lesson',
      rationale: 'mock rationale',
      practiceStandards: [],
    },
    modelUsed: 'mock-model',
    fallbackUsed: false,
  })),
}));

// Mock the Redis-backed rate limiter to always allow.
vi.mock('@/lib/platform/rate-limit-store', () => ({
  RedisRateLimitStore: class {
    async checkLimit() {
      return true;
    }
    async recordFailure() {
      /* noop */
    }
    reset() {
      /* noop */
    }
  },
}));
vi.mock('@/lib/platform/redis-client', () => ({
  getRedisClient: vi.fn(() => null),
}));

const routeImport = () => import('./route');

async function cleanup(): Promise<void> {
  await db.delete(scienceQuestionResponses);
  await db.delete(scienceAttempts);
  await db.delete(scienceQuestionStandards);
  await db.delete(scienceQuizQuestions);
  await db.delete(scienceLessonStandards);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceClassStudents);
  await db.delete(scienceLessons);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceClasses);
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = 'AI rec test standard'`
  );
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedScenario() {
  const teacherId = `${TEST_PREFIX}-teacher`;
  const studentId = `${TEST_PREFIX}-student`;

  await db.insert(users).values([
    {
      id: teacherId,
      name: 'Teacher',
      username: teacherId,
      displayUsername: teacherId,
      email: `${teacherId}@example.com`,
      role: 'TEACHER',
    },
    {
      id: studentId,
      name: 'Student',
      username: studentId,
      displayUsername: studentId,
      email: `${studentId}@example.com`,
      role: 'STUDENT',
      gradeLevel: 3,
    },
  ]);

  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'AI Rec Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `AIR-${Date.now()}`,
      teacherId,
    })
    .returning();

  await db
    .insert(scienceClassStudents)
    .values({ classId: cls.id, studentId });

  const [unit] = await db
    .insert(scienceCurriculumUnits)
    .values({
      slug: `${TEST_PREFIX}-unit-${Date.now()}`,
      title: 'AI Rec Unit',
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
      title: 'AI Rec Lesson',
      gradeLevel: 3,
      order: 1,
    })
    .returning();

  await db
    .insert(scienceUnitLessons)
    .values({ unitId: unit.id, lessonId: lesson.id });

  const [standard] = await db
    .insert(scienceStandards)
    .values({
      framework: 'THAI',
      code: `Sc-${TEST_PREFIX}-${Date.now()}`,
      description: 'AI rec test standard',
      gradeLevel: 3,
    })
    .returning();
  await db
    .insert(scienceLessonStandards)
    .values({ lessonId: lesson.id, standardId: standard.id });

  const [question] = await db
    .insert(scienceQuizQuestions)
    .values({
      slug: `${TEST_PREFIX}-q-${Date.now()}`,
      lessonId: lesson.id,
      type: 'MULTIPLE_CHOICE',
      text: 'Q1',
      options: ['A', 'B'],
      correctAnswer: 'A',
      points: 1,
      order: 1,
    })
    .returning();
  await db.insert(scienceQuestionStandards).values({
    questionId: question.id,
    standardId: standard.id,
  });

  const [attempt] = await db
    .insert(scienceAttempts)
    .values({
      studentId,
      lessonId: lesson.id,
      score: 1,
      maxScore: 1,
      attemptNumber: 1,
      startedAt: new Date(),
      completedAt: new Date(),
    })
    .returning();
  await db.insert(scienceQuestionResponses).values({
    attemptId: attempt.id,
    questionId: question.id,
    studentAnswer: 'A',
    isCorrect: true,
    timeSpentSeconds: 30,
    answeredAt: new Date(),
  });

  return { teacherId, studentId, attemptId: attempt.id };
}

describe('POST /api/ai/recommendations (integration)', () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    const { unstable_recommendationTestkit } = await routeImport();
    unstable_recommendationTestkit.reset();
  });

  it('returns 401 when not authenticated', async () => {
    const { POST } = await routeImport();
    const req = new NextRequest('http://localhost/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ attemptId: 'doesnt-matter' }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 on invalid body', async () => {
    const { studentId } = await seedScenario();
    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await routeImport();
    const req = new NextRequest('http://localhost/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 404 when attempt does not exist', async () => {
    const { studentId } = await seedScenario();
    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await routeImport();
    const req = new NextRequest('http://localhost/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        attemptId: '00000000-0000-0000-0000-000000000000',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 409 when attempt has no completedAt', async () => {
    const { studentId } = await seedScenario();
    // Add an uncompleted attempt for this student.
    const [pending] = await db
      .insert(scienceAttempts)
      .values({
        studentId,
        lessonId: (
          await db.select({ id: scienceLessons.id }).from(scienceLessons).limit(1)
        )[0].id,
        score: 0,
        maxScore: 1,
        attemptNumber: 2,
        startedAt: new Date(),
        completedAt: null,
      })
      .returning();

    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });
    const { POST } = await routeImport();
    const req = new NextRequest('http://localhost/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ attemptId: pending.id }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it('returns 403 when a different student tries to fetch the recommendation', async () => {
    const { attemptId } = await seedScenario();

    // Seed another student not in the class.
    const outsiderId = `${TEST_PREFIX}-outsider`;
    await db.insert(users).values({
      id: outsiderId,
      name: 'Outsider',
      username: outsiderId,
      displayUsername: outsiderId,
      email: `${outsiderId}@example.com`,
      role: 'STUDENT',
    });

    const session = await createSession(outsiderId);
    mockCookies.get.mockReturnValue({ value: session.token });
    const { POST } = await routeImport();
    const req = new NextRequest('http://localhost/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ attemptId }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns the mocked recommendation on the happy path', async () => {
    const { studentId, attemptId } = await seedScenario();
    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });
    const { POST } = await routeImport();
    const req = new NextRequest('http://localhost/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ attemptId }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recommendation.nextLessonId).toBe('mock-lesson');
    expect(data.model).toBe('mock-model');
    expect(data.traceId).toMatch(/^rec_/);
  });

  it('serves cached responses on the second call (no extra LLM invocation)', async () => {
    const { studentId, attemptId } = await seedScenario();
    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await routeImport();
    const recommendationService = await import('@/lib/ai/recommendation-service');
    const spy = vi.mocked(recommendationService.generateRecommendation);
    spy.mockClear();

    const req1 = new NextRequest('http://localhost/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ attemptId }),
    });
    const req2 = new NextRequest('http://localhost/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ attemptId }),
    });

    const res1 = await POST(req1);
    const res2 = await POST(req2);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Mock should only have been called once.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

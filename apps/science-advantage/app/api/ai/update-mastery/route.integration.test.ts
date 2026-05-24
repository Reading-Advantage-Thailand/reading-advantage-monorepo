import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, eq, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceAttempts,
  scienceMasteryRuns,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandardMastery,
  scienceStandards,
  scienceLessons,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'update-mastery-itest';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

// Enable the mastery pipeline for tests.
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: true,
    DEV_AUTH_ENABLED: false,
  },
}));

async function cleanup(): Promise<void> {
  await db.execute(
    sql`DELETE FROM science_standard_mastery WHERE student_id LIKE ${`${TEST_PREFIX}-%`}`
  );
  await db.delete(scienceQuestionResponses);
  await db.delete(scienceMasteryRuns);
  await db.delete(scienceAttempts);
  await db.delete(scienceQuestionStandards);
  await db.delete(scienceQuizQuestions);
  await db.delete(scienceLessons);
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = 'UM test standard'`
  );
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedScenario(args: { withStandards: boolean }) {
  const studentId = `${TEST_PREFIX}-student-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2, 6)}`;
  await db.insert(users).values({
    id: studentId,
    name: 'UM Student',
    username: studentId,
    displayUsername: studentId,
    email: `${studentId}@example.com`,
    role: 'STUDENT',
  });

  const [lesson] = await db
    .insert(scienceLessons)
    .values({
      slug: `${TEST_PREFIX}-lesson-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2, 6)}`,
      title: 'UM Lesson',
      gradeLevel: 3,
      order: 1,
    })
    .returning();

  const [q1] = await db
    .insert(scienceQuizQuestions)
    .values({
      slug: `${TEST_PREFIX}-q-${Date.now()}`,
      lessonId: lesson.id,
      type: 'MULTIPLE_CHOICE',
      text: 'UM Q1',
      options: ['A', 'B'],
      correctAnswer: 'A',
      points: 1,
      order: 1,
    })
    .returning();

  let standardId: string | null = null;
  if (args.withStandards) {
    const [std] = await db
      .insert(scienceStandards)
      .values({
        framework: 'NGSS',
        code: `NGSS-${TEST_PREFIX}-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2, 6)}`,
        description: 'UM test standard',
        gradeLevel: 3,
      })
      .returning();
    standardId = std.id;
    await db
      .insert(scienceQuestionStandards)
      .values({ questionId: q1.id, standardId: std.id });
  }

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
    questionId: q1.id,
    studentAnswer: 'A',
    isCorrect: true,
    timeSpentSeconds: 30,
    answeredAt: new Date(),
  });

  return { studentId, attemptId: attempt.id, standardId };
}

describe('POST /api/ai/update-mastery (integration)', () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
  });

  it('returns 401 when not authenticated', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/ai/update-mastery', {
      method: 'POST',
      body: JSON.stringify({ attemptId: 'irrelevant' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid JSON', async () => {
    const { studentId } = await seedScenario({ withStandards: true });
    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/ai/update-mastery', {
      method: 'POST',
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing attemptId', async () => {
    const { studentId } = await seedScenario({ withStandards: true });
    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/ai/update-mastery', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when attempt does not exist', async () => {
    const { studentId } = await seedScenario({ withStandards: true });
    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/ai/update-mastery', {
      method: 'POST',
      body: JSON.stringify({
        attemptId: '00000000-0000-0000-0000-000000000000',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 403 when STUDENT tries to update another student’s attempt', async () => {
    const { attemptId } = await seedScenario({ withStandards: true });
    // Different student
    const otherId = `${TEST_PREFIX}-other-${Date.now()}`;
    await db.insert(users).values({
      id: otherId,
      name: 'Other',
      username: otherId,
      displayUsername: otherId,
      email: `${otherId}@example.com`,
      role: 'STUDENT',
    });
    const session = await createSession(otherId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/ai/update-mastery', {
      method: 'POST',
      body: JSON.stringify({ attemptId }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 409 when attempt has no completedAt', async () => {
    const { studentId, attemptId } = await seedScenario({ withStandards: true });
    // Mark this attempt as not completed.
    await db
      .update(scienceAttempts)
      .set({ completedAt: null })
      .where(eq(scienceAttempts.id, attemptId));

    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/ai/update-mastery', {
      method: 'POST',
      body: JSON.stringify({ attemptId }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it('short-circuits with 200/updated=0 when no standards are linked', async () => {
    const { studentId, attemptId } = await seedScenario({ withStandards: false });
    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/ai/update-mastery', {
      method: 'POST',
      body: JSON.stringify({ attemptId }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.updated).toBe(0);
    expect(data.records).toEqual([]);
  });

  it('processes mastery updates and persists scienceMasteryRuns COMPLETED', async () => {
    const { studentId, attemptId, standardId } = await seedScenario({
      withStandards: true,
    });
    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/ai/update-mastery', {
      method: 'POST',
      body: JSON.stringify({ attemptId }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.updated).toBeGreaterThan(0);
    expect(data.records).toHaveLength(1);
    expect(data.records[0].standardId).toBe(standardId);
    expect(typeof data.records[0].masteryLevel).toBe('number');

    // MasteryRun row should exist and be COMPLETED.
    const [run] = await db
      .select()
      .from(scienceMasteryRuns)
      .where(eq(scienceMasteryRuns.attemptId, attemptId))
      .limit(1);
    expect(run.status).toBe('COMPLETED');
    expect(run.updatedCount).toBe(1);

    // Standard mastery row should exist with the persisted level.
    const [mastery] = await db
      .select()
      .from(scienceStandardMastery)
      .where(eq(scienceStandardMastery.studentId, studentId))
      .limit(1);
    expect(mastery).toBeDefined();
    expect(mastery.standardId).toBe(standardId!);
  });

  it('returns the existing records with updated=0 when the run is already COMPLETED', async () => {
    const { studentId, attemptId, standardId } = await seedScenario({
      withStandards: true,
    });
    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await import('./route');
    // First call: actually processes.
    await POST(
      new NextRequest('http://localhost/api/ai/update-mastery', {
        method: 'POST',
        body: JSON.stringify({ attemptId }),
      })
    );

    // Second call: should hit the already-complete branch (mastery returns same records).
    const res2 = await POST(
      new NextRequest('http://localhost/api/ai/update-mastery', {
        method: 'POST',
        body: JSON.stringify({ attemptId }),
      })
    );
    const data2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(data2.updated).toBe(0);
    expect(data2.records).toHaveLength(1);
    expect(data2.records[0].standardId).toBe(standardId!);
  });

  it('returns 202/QUEUED when an existing run is already PROCESSING', async () => {
    const { studentId, attemptId } = await seedScenario({ withStandards: true });
    // Pre-insert a PROCESSING run for this attempt.
    await db.insert(scienceMasteryRuns).values({
      attemptId,
      studentId,
      status: 'PROCESSING',
      updatedCount: 0,
    });

    const session = await createSession(studentId);
    mockCookies.get.mockReturnValue({ value: session.token });

    const { POST } = await import('./route');
    const res = await POST(
      new NextRequest('http://localhost/api/ai/update-mastery', {
        method: 'POST',
        body: JSON.stringify({ attemptId }),
      })
    );
    const data = await res.json();
    expect(res.status).toBe(202);
    expect(data.reason).toBe('QUEUED');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { and, db, eq, sql } from '@reading-advantage/db';
import {
  accounts,
  achievements,
  gamificationProfiles,
  scienceAttempts,
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceMasteryRuns,
  scienceQuestionResponses,
  scienceQuizQuestions,
  scienceUnitLessons,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET, POST } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'quiz-itest';

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
type QuestionRow = typeof scienceQuizQuestions.$inferSelect;

async function cleanupFixtures(): Promise<void> {
  // Children first.
  await db.delete(scienceQuestionResponses);
  await db.delete(scienceMasteryRuns);
  await db.delete(scienceAttempts);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceClassStudents);
  await db.delete(scienceLessonCompletions);
  await db.delete(scienceQuizQuestions);
  await db.delete(scienceLessons);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceClasses);
  await db.execute(
    sql`DELETE FROM achievements WHERE user_id LIKE ${`${TEST_PREFIX}-%`}`
  );
  await db.execute(
    sql`DELETE FROM gamification_profiles WHERE user_id LIKE ${`${TEST_PREFIX}-%`}`
  );
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedUser(
  id: string,
  role: 'TEACHER' | 'STUDENT'
): Promise<UserRow> {
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

async function seedLessonWithQuestions(args: {
  enrolledStudentId: string;
  teacherId: string;
  questionCount: number;
}): Promise<{
  lesson: LessonRow;
  questions: QuestionRow[];
  classId: string;
}> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'Quiz Test Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `QUIZ-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      teacherId: args.teacherId,
    })
    .returning();

  await db.insert(scienceClassStudents).values({
    classId: cls.id,
    studentId: args.enrolledStudentId,
  });

  const [unit] = await db
    .insert(scienceCurriculumUnits)
    .values({
      slug: `${TEST_PREFIX}-unit-${Date.now()}`,
      title: 'Quiz Test Unit',
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
      title: 'Quiz Test Lesson',
      gradeLevel: 3,
      order: 1,
    })
    .returning();

  await db.insert(scienceUnitLessons).values({
    unitId: unit.id,
    lessonId: lesson.id,
  });

  const questions: QuestionRow[] = [];
  for (let i = 1; i <= args.questionCount; i++) {
    const [q] = await db
      .insert(scienceQuizQuestions)
      .values({
        slug: `${TEST_PREFIX}-q-${i}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        lessonId: lesson.id,
        type: 'MULTIPLE_CHOICE',
        text: `Question ${i}`,
        options: ['Observe', 'Predict', 'Test', 'Conclude'],
        correctAnswer: 'Observe',
        points: 1,
        order: i,
      })
      .returning();
    questions.push(q);
  }

  return { lesson, questions, classId: cls.id };
}

describe('GET /api/lessons/[lessonSlug]/quiz (integration)', () => {
  let teacher: UserRow;
  let student: UserRow;
  let outsider: UserRow;
  let lesson: LessonRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    await cleanupFixtures();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    outsider = await seedUser(`${TEST_PREFIX}-outsider`, 'STUDENT');
    const seeded = await seedLessonWithQuestions({
      enrolledStudentId: student.id,
      teacherId: teacher.id,
      questionCount: 12,
    });
    lesson = seeded.lesson;
  });

  it('returns 401 when not authenticated', async () => {
    mockCookies.get.mockReturnValue(undefined);
    const req = new NextRequest(`http://localhost/api/lessons/${lesson.id}/quiz`);
    const res = await GET(req, { params: Promise.resolve({ lessonSlug: lesson.id }) });
    expect(res.status).toBe(401);
  });

  it('allows the enrolled student', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/api/lessons/${lesson.id}/quiz`);
    const res = await GET(req, { params: Promise.resolve({ lessonSlug: lesson.id }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.quizId).toBeTruthy();
    expect(data.questions).toHaveLength(3); // N = 12 / 4
  });

  it('denies a non-enrolled student', async () => {
    const session = await createSession(outsider.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/api/lessons/${lesson.id}/quiz`);
    const res = await GET(req, { params: Promise.resolve({ lessonSlug: lesson.id }) });
    expect(res.status).toBe(403);
  });

  it('allows the class teacher', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/api/lessons/${lesson.id}/quiz`);
    const res = await GET(req, { params: Promise.resolve({ lessonSlug: lesson.id }) });
    expect(res.status).toBe(200);
  });

  it('returns 404 for a non-existent lesson', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(
      'http://localhost/api/lessons/00000000-0000-0000-0000-000000000000/quiz'
    );
    const res = await GET(req, {
      params: Promise.resolve({
        lessonSlug: '00000000-0000-0000-0000-000000000000',
      }),
    });
    expect(res.status).toBe(404);
  });

  it('omits correctAnswer from the question list', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/api/lessons/${lesson.id}/quiz`);
    const res = await GET(req, { params: Promise.resolve({ lessonSlug: lesson.id }) });
    const data = await res.json();
    for (const q of data.questions) {
      expect(q.correctAnswer).toBeUndefined();
    }
  });

  it('persists the attempt row with startedAt and no completedAt', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(`http://localhost/api/lessons/${lesson.id}/quiz`);
    const res = await GET(req, { params: Promise.resolve({ lessonSlug: lesson.id }) });
    const data = await res.json();

    const [attempt] = await db
      .select()
      .from(scienceAttempts)
      .where(eq(scienceAttempts.id, data.quizId))
      .limit(1);
    expect(attempt).toBeDefined();
    expect(attempt.studentId).toBe(student.id);
    expect(attempt.lessonId).toBe(lesson.id);
    expect(attempt.completedAt).toBeNull();
  });

  it('returns 500 when question pool is below 4', async () => {
    // New lesson with only 2 questions but enrolled student/teacher reused.
    const small = await seedLessonWithQuestions({
      enrolledStudentId: student.id,
      teacherId: teacher.id,
      questionCount: 2,
    });
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const req = new NextRequest(
      `http://localhost/api/lessons/${small.lesson.id}/quiz`
    );
    const res = await GET(req, {
      params: Promise.resolve({ lessonSlug: small.lesson.id }),
    });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/lessons/[lessonSlug]/quiz/submit (integration)', () => {
  let teacher: UserRow;
  let student: UserRow;
  let lesson: LessonRow;
  let questions: QuestionRow[];

  async function startAttempt(): Promise<string> {
    const [attempt] = await db
      .insert(scienceAttempts)
      .values({
        studentId: student.id,
        lessonId: lesson.id,
        maxScore: questions.length,
        attemptNumber: 1,
        startedAt: new Date(),
      })
      .returning();
    return attempt.id;
  }

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    await cleanupFixtures();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    const seeded = await seedLessonWithQuestions({
      enrolledStudentId: student.id,
      teacherId: teacher.id,
      questionCount: 3,
    });
    lesson = seeded.lesson;
    questions = seeded.questions;
  });

  it('grades, persists scores, completes the attempt, and returns badge data', async () => {
    const attemptId = await startAttempt();
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const body = {
      attemptId,
      responses: questions.map((q, i) => ({
        questionId: q.id,
        studentAnswer: 'Observe', // correct
        timeSpentSeconds: 30,
        answeredAt: new Date().toISOString(),
        order: i + 1,
      })),
    };
    const req = new NextRequest(
      `http://localhost/api/lessons/${lesson.id}/quiz/submit`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    const res = await POST(req, {
      params: Promise.resolve({ lessonSlug: lesson.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.score).toBe(3);
    expect(data.maxScore).toBe(3);
    expect(data.percentage).toBe(100);

    // Attempt row marked complete.
    const [attempt] = await db
      .select()
      .from(scienceAttempts)
      .where(eq(scienceAttempts.id, attemptId))
      .limit(1);
    expect(attempt.score).toBe(3);
    expect(attempt.completedAt).not.toBeNull();

    // Three responses persisted.
    const responseRows = await db
      .select()
      .from(scienceQuestionResponses)
      .where(eq(scienceQuestionResponses.attemptId, attemptId));
    expect(responseRows).toHaveLength(3);

    // Lesson completion record COMPLETED.
    const [completion] = await db
      .select()
      .from(scienceLessonCompletions)
      .where(
        and(
          eq(scienceLessonCompletions.studentId, student.id),
          eq(scienceLessonCompletions.lessonId, lesson.id)
        )
      )
      .limit(1);
    expect(completion.status).toBe('COMPLETED');
    expect(completion.bestScore).toBe(3);

    // FIRST_STEPS and PERFECT_SCORE both expected on a 100% first attempt.
    expect(data.gamification.badgesUnlocked).toEqual(
      expect.arrayContaining(['FIRST_STEPS', 'PERFECT_SCORE'])
    );

    // Achievement rows persisted.
    const ach = await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, student.id));
    expect(ach.length).toBeGreaterThanOrEqual(2);

    // Gamification profile created and XP applied.
    const [profile] = await db
      .select()
      .from(gamificationProfiles)
      .where(eq(gamificationProfiles.userId, student.id))
      .limit(1);
    expect(profile).toBeDefined();
    expect(profile.xp).toBeGreaterThan(0);
  });

  it('does not unlock PERFECT_SCORE on a less-than-100% submission', async () => {
    const attemptId = await startAttempt();
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const body = {
      attemptId,
      responses: questions.map((q, i) => ({
        questionId: q.id,
        studentAnswer: i === 0 ? 'Observe' : 'Wrong',
        timeSpentSeconds: 30,
        answeredAt: new Date().toISOString(),
        order: i + 1,
      })),
    };
    const req = new NextRequest(
      `http://localhost/api/lessons/${lesson.id}/quiz/submit`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    const res = await POST(req, {
      params: Promise.resolve({ lessonSlug: lesson.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.gamification.badgesUnlocked).not.toContain('PERFECT_SCORE');
  });

  it('does not duplicate already-earned achievements on a second submission', async () => {
    // First submission unlocks FIRST_STEPS.
    {
      const attemptId = await startAttempt();
      const session = await createSession(student.id);
      mockCookies.get.mockReturnValue({ value: session.token });
      const body = {
        attemptId,
        responses: questions.map((q, i) => ({
          questionId: q.id,
          studentAnswer: 'Observe',
          timeSpentSeconds: 30,
          answeredAt: new Date().toISOString(),
          order: i + 1,
        })),
      };
      const req = new NextRequest(
        `http://localhost/api/lessons/${lesson.id}/quiz/submit`,
        { method: 'POST', body: JSON.stringify(body) }
      );
      await POST(req, { params: Promise.resolve({ lessonSlug: lesson.id }) });
    }

    // Second attempt (new row).
    const [attempt2] = await db
      .insert(scienceAttempts)
      .values({
        studentId: student.id,
        lessonId: lesson.id,
        maxScore: questions.length,
        attemptNumber: 2,
        startedAt: new Date(),
      })
      .returning();
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const body = {
      attemptId: attempt2.id,
      responses: questions.map((q, i) => ({
        questionId: q.id,
        studentAnswer: 'Observe',
        timeSpentSeconds: 30,
        answeredAt: new Date().toISOString(),
        order: i + 1,
      })),
    };
    const req = new NextRequest(
      `http://localhost/api/lessons/${lesson.id}/quiz/submit`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    const res = await POST(req, {
      params: Promise.resolve({ lessonSlug: lesson.id }),
    });
    const data = await res.json();

    expect(data.gamification.badgesUnlocked).not.toContain('FIRST_STEPS');

    const firstSteps = await db
      .select()
      .from(achievements)
      .where(
        and(
          eq(achievements.userId, student.id),
          eq(achievements.badgeType, 'FIRST_STEPS')
        )
      );
    expect(firstSteps).toHaveLength(1);
  });

  it('returns 403 if a different user tries to submit the attempt', async () => {
    const attemptId = await startAttempt();
    const outsider = await seedUser(`${TEST_PREFIX}-outsider2`, 'STUDENT');
    const session = await createSession(outsider.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const body = {
      attemptId,
      responses: questions.map((q, i) => ({
        questionId: q.id,
        studentAnswer: 'Observe',
        timeSpentSeconds: 30,
        answeredAt: new Date().toISOString(),
        order: i + 1,
      })),
    };
    const req = new NextRequest(
      `http://localhost/api/lessons/${lesson.id}/quiz/submit`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    const res = await POST(req, {
      params: Promise.resolve({ lessonSlug: lesson.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 409 if attempt was already submitted', async () => {
    const attemptId = await startAttempt();
    await db
      .update(scienceAttempts)
      .set({ completedAt: new Date() })
      .where(eq(scienceAttempts.id, attemptId));

    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const body = {
      attemptId,
      responses: questions.map((q, i) => ({
        questionId: q.id,
        studentAnswer: 'Observe',
        timeSpentSeconds: 30,
        answeredAt: new Date().toISOString(),
        order: i + 1,
      })),
    };
    const req = new NextRequest(
      `http://localhost/api/lessons/${lesson.id}/quiz/submit`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    const res = await POST(req, {
      params: Promise.resolve({ lessonSlug: lesson.id }),
    });
    expect(res.status).toBe(409);
  });
});

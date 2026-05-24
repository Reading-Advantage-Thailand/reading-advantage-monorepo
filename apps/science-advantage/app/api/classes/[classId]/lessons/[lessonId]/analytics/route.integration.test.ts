import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceAttempts,
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonCompletions,
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
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'lesson-analytics-itest';

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
type StandardRow = typeof scienceStandards.$inferSelect;
type QuestionRow = typeof scienceQuizQuestions.$inferSelect;

async function cleanup(): Promise<void> {
  await db.delete(scienceQuestionResponses);
  await db.delete(scienceAttempts);
  await db.delete(scienceLessonCompletions);
  await db.delete(scienceQuestionStandards);
  await db.delete(scienceLessonStandards);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceClassStudents);
  await db.delete(scienceQuizQuestions);
  await db.delete(scienceLessons);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceClasses);
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = 'Lesson analytics test standard'`
  );
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedUser(
  id: string,
  role: 'TEACHER' | 'STUDENT' | 'ADMIN',
  name?: string
): Promise<UserRow> {
  const [user] = await db
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
  return user;
}

async function seedStandard(code: string): Promise<StandardRow> {
  const [s] = await db
    .insert(scienceStandards)
    .values({
      framework: 'NGSS',
      code,
      description: 'Lesson analytics test standard',
      gradeLevel: 3,
    })
    .returning();
  return s;
}

async function seedClassWithLesson(args: {
  teacherId: string;
  studentIds: string[];
  lessonStandardIds?: string[];
}): Promise<{
  cls: ClassRow;
  lesson: LessonRow;
}> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'Lesson Analytics Test',
      gradeLevel: 3,
      standardsAlignment: 'NGSS',
      joinCode: `LAA-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
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
      title: 'LA Unit',
      framework: 'NGSS',
      gradeLevel: 3,
      order: 1,
      classId: cls.id,
    })
    .returning();

  const [lesson] = await db
    .insert(scienceLessons)
    .values({
      slug: `${TEST_PREFIX}-lesson-${Date.now()}`,
      title: 'LA Lesson',
      gradeLevel: 3,
      order: 1,
    })
    .returning();

  await db
    .insert(scienceUnitLessons)
    .values({ unitId: unit.id, lessonId: lesson.id });

  if (args.lessonStandardIds) {
    for (const sid of args.lessonStandardIds) {
      await db
        .insert(scienceLessonStandards)
        .values({ lessonId: lesson.id, standardId: sid });
    }
  }

  return { cls, lesson };
}

async function seedQuestion(args: {
  lessonId: string;
  order: number;
  text?: string;
  standardIds?: string[];
}): Promise<QuestionRow> {
  const [q] = await db
    .insert(scienceQuizQuestions)
    .values({
      slug: `${TEST_PREFIX}-q-${args.order}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2, 6)}`,
      lessonId: args.lessonId,
      type: 'MULTIPLE_CHOICE',
      text: args.text ?? `Q${args.order}`,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      points: 1,
      order: args.order,
    })
    .returning();
  if (args.standardIds) {
    for (const sid of args.standardIds) {
      await db
        .insert(scienceQuestionStandards)
        .values({ questionId: q.id, standardId: sid });
    }
  }
  return q;
}

async function seedAttemptWithResponses(args: {
  studentId: string;
  lessonId: string;
  attemptNumber: number;
  results: Array<{ questionId: string; isCorrect: boolean; timeSpentSeconds?: number }>;
}): Promise<void> {
  const [attempt] = await db
    .insert(scienceAttempts)
    .values({
      studentId: args.studentId,
      lessonId: args.lessonId,
      score: args.results.filter((r) => r.isCorrect).length,
      maxScore: args.results.length,
      attemptNumber: args.attemptNumber,
      startedAt: new Date(),
      completedAt: new Date(),
    })
    .returning();

  for (const r of args.results) {
    await db.insert(scienceQuestionResponses).values({
      attemptId: attempt.id,
      questionId: r.questionId,
      studentAnswer: r.isCorrect ? 'A' : 'B',
      isCorrect: r.isCorrect,
      timeSpentSeconds: r.timeSpentSeconds ?? 30,
      answeredAt: new Date(),
    });
  }
}

describe('GET /api/classes/[classId]/lessons/[lessonId]/analytics (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let admin: UserRow;
  let alice: UserRow;
  let bob: UserRow;
  let carol: UserRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER', 'Teach');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
    alice = await seedUser(`${TEST_PREFIX}-alice`, 'STUDENT', 'Alice');
    bob = await seedUser(`${TEST_PREFIX}-bob`, 'STUDENT', 'Bob');
    carol = await seedUser(`${TEST_PREFIX}-carol`, 'STUDENT', 'Carol');
  });

  it('returns 404 for an unknown class', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghost = '00000000-0000-0000-0000-000000000000';
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ classId: ghost, lessonId: ghost }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 for a teacher who does not own the class', async () => {
    const { cls, lesson } = await seedClassWithLesson({
      teacherId: teacher.id,
      studentIds: [alice.id],
    });
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ classId: cls.id, lessonId: lesson.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the lesson is not part of the class curriculum', async () => {
    const { cls } = await seedClassWithLesson({
      teacherId: teacher.id,
      studentIds: [alice.id],
    });
    // Lesson with no curriculum link.
    const [orphan] = await db
      .insert(scienceLessons)
      .values({
        slug: `${TEST_PREFIX}-orphan-${Date.now()}`,
        title: 'Orphan',
        gradeLevel: 3,
        order: 99,
      })
      .returning();

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ classId: cls.id, lessonId: orphan.id }),
    });
    expect(res.status).toBe(404);
  });

  it('returns the full analytics shape for a class with question + standards data', async () => {
    const std1 = await seedStandard(`NGSS-${TEST_PREFIX}-S1-${Date.now()}`);
    const std2 = await seedStandard(`NGSS-${TEST_PREFIX}-S2-${Date.now()}`);

    const { cls, lesson } = await seedClassWithLesson({
      teacherId: teacher.id,
      studentIds: [alice.id, bob.id, carol.id],
      lessonStandardIds: [std1.id],
    });

    // Three questions; q1+q2 attach std1, q3 attaches std2.
    const q1 = await seedQuestion({
      lessonId: lesson.id,
      order: 1,
      text: 'Tell me about cells',
      standardIds: [std1.id],
    });
    const q2 = await seedQuestion({
      lessonId: lesson.id,
      order: 2,
      text: 'Photosynthesis basics',
      standardIds: [std1.id],
    });
    const q3 = await seedQuestion({
      lessonId: lesson.id,
      order: 3,
      text: 'Newton applied',
      standardIds: [std2.id],
    });

    // Alice: completed perfect score, all correct.
    await db.insert(scienceLessonCompletions).values({
      studentId: alice.id,
      lessonId: lesson.id,
      status: 'COMPLETED',
      attemptsCount: 1,
      mostRecentScore: 3,
      mostRecentScorePercentage: 100,
      bestScore: 3,
      bestScorePercentage: 100,
      totalTimeSpentSeconds: 90,
      completedAt: new Date(),
      lastAttemptAt: new Date(),
    });
    await seedAttemptWithResponses({
      studentId: alice.id,
      lessonId: lesson.id,
      attemptNumber: 1,
      results: [
        { questionId: q1.id, isCorrect: true, timeSpentSeconds: 30 },
        { questionId: q2.id, isCorrect: true, timeSpentSeconds: 30 },
        { questionId: q3.id, isCorrect: true, timeSpentSeconds: 30 },
      ],
    });

    // Bob: completed, 2/3.
    await db.insert(scienceLessonCompletions).values({
      studentId: bob.id,
      lessonId: lesson.id,
      status: 'COMPLETED',
      attemptsCount: 2,
      mostRecentScore: 2,
      mostRecentScorePercentage: 66.67,
      bestScore: 2,
      bestScorePercentage: 66.67,
      totalTimeSpentSeconds: 180,
      completedAt: new Date(),
      lastAttemptAt: new Date(),
    });
    await seedAttemptWithResponses({
      studentId: bob.id,
      lessonId: lesson.id,
      attemptNumber: 1,
      results: [
        { questionId: q1.id, isCorrect: true, timeSpentSeconds: 60 },
        { questionId: q2.id, isCorrect: false, timeSpentSeconds: 60 },
        { questionId: q3.id, isCorrect: true, timeSpentSeconds: 60 },
      ],
    });

    // Carol: not started → no completion row, no responses.

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ classId: cls.id, lessonId: lesson.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);

    expect(data.lesson.id).toBe(lesson.id);
    expect(data.standards).toEqual([
      { code: std1.code, description: std1.description },
    ]);

    expect(data.classStats.totalStudents).toBe(3);
    expect(data.classStats.studentsCompleted).toBe(2);
    expect(data.classStats.completionRate).toBe(66.7);

    // Students array contains all 3, with Carol as NOT_STARTED.
    expect(data.students).toHaveLength(3);
    const carolView = data.students.find(
      (s: { studentId: string }) => s.studentId === carol.id
    );
    expect(carolView.completionStatus).toBe('NOT_STARTED');
    expect(carolView.attempts).toBe(0);

    // Question-level analytics ordered ascending by percentCorrect.
    expect(data.questions).toHaveLength(3);
    expect(
      data.questions[0].percentCorrect <= data.questions[1].percentCorrect
    ).toBe(true);
    // q2: only bob answered wrong → 50%, alice correct, bob incorrect.
    const q2View = data.questions.find(
      (q: { questionId: string }) => q.questionId === q2.id
    );
    expect(q2View.totalResponses).toBe(2);
    expect(q2View.correctResponses).toBe(1);
    expect(q2View.percentCorrect).toBe(50);
    expect(q2View.incorrectStudents).toEqual(['Bob']);

    // Standards analytics: std1 has q1+q2 (4 responses total: alice×2 correct,
    // bob: 1 correct + 1 wrong → bob 50% < 80% → not mastered; alice 100% → mastered).
    const std1View = data.standardsPerformance.find(
      (s: { standardId: string }) => s.standardId === std1.id
    );
    expect(std1View.questionsCount).toBe(2);
    expect(std1View.studentsMastered).toBe(1);
    expect(std1View.percentMastered).toBe(50);
    expect(std1View.flagForReteach).toBe(true);
  });

  it('allows an ADMIN even when not the owner', async () => {
    const { cls, lesson } = await seedClassWithLesson({
      teacherId: teacher.id,
      studentIds: [],
    });
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ classId: cls.id, lessonId: lesson.id }),
    });
    expect(res.status).toBe(200);
  });
});

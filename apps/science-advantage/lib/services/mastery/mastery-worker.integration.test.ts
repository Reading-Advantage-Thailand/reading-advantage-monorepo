import { beforeEach, describe, expect, it } from 'vitest';
import { and, db, eq, inArray, sql } from '@reading-advantage/db';
import {
  scienceAttempts,
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessons,
  scienceMasteryRuns,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandardMastery,
  scienceStandards,
  scienceUnitLessons,
  users,
} from '@reading-advantage/db/schema';
import { processMasteryRun } from './mastery-worker';

const TEST_PREFIX = 'mw-itest';
const TEACHER_ID = `${TEST_PREFIX}-teacher`;
const STUDENT_ID = `${TEST_PREFIX}-student`;

async function cleanup(): Promise<void> {
  await db.execute(
    sql`DELETE FROM science_standard_mastery WHERE student_id = ${STUDENT_ID}`
  );
  await db.delete(scienceQuestionResponses);
  await db.delete(scienceMasteryRuns);
  await db.delete(scienceAttempts);
  await db.delete(scienceQuestionStandards);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceQuizQuestions);
  await db.delete(scienceLessons);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceClasses);
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = 'Mastery worker test standard'`
  );
  await db.execute(
    sql`DELETE FROM users WHERE id IN (${TEACHER_ID}, ${STUDENT_ID})`
  );
}

async function seedUsers(): Promise<void> {
  await db.insert(users).values([
    {
      id: TEACHER_ID,
      name: 'MW Teacher',
      username: TEACHER_ID,
      displayUsername: 'MWTeacher',
      email: `${TEACHER_ID}@example.com`,
      role: 'TEACHER',
    },
    {
      id: STUDENT_ID,
      name: 'MW Student',
      username: STUDENT_ID,
      displayUsername: 'MWStudent',
      email: `${STUDENT_ID}@example.com`,
      role: 'STUDENT',
    },
  ]);
}

async function seedScenario(args: {
  /** Per-question (correct, points, standards) tuples. */
  questions: Array<{
    correct: boolean;
    points: number;
    standardCount: number;
  }>;
  /** Optionally start each response N hours before the answered timestamp. */
  startedHoursAgo?: number;
}): Promise<{
  attemptId: string;
  standardIds: string[];
}> {
  const [lesson] = await db
    .insert(scienceLessons)
    .values({
      slug: `${TEST_PREFIX}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      title: 'MW Test Lesson',
      gradeLevel: 5,
      order: 1,
    })
    .returning();

  // Standards.
  const totalStandards = args.questions.reduce(
    (s, q) => s + q.standardCount,
    0
  );
  const standardRows = [];
  for (let i = 0; i < totalStandards; i++) {
    const [s] = await db
      .insert(scienceStandards)
      .values({
        framework: 'NGSS',
        code: `NGSS-${TEST_PREFIX}-${i}-${Date.now()}`,
        description: 'Mastery worker test standard',
        gradeLevel: 5,
      })
      .returning();
    standardRows.push(s);
  }

  // Quiz questions and their question-standard junction rows.
  const standardIds: string[] = [];
  let standardCursor = 0;
  const questionRows = [];
  for (let i = 0; i < args.questions.length; i++) {
    const q = args.questions[i];
    const [qrow] = await db
      .insert(scienceQuizQuestions)
      .values({
        slug: `${TEST_PREFIX}-q-${i}-${Date.now()}`,
        lessonId: lesson.id,
        type: 'MULTIPLE_CHOICE',
        text: `Q${i}`,
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        points: q.points,
        order: i + 1,
      })
      .returning();
    questionRows.push(qrow);

    for (let s = 0; s < q.standardCount; s++) {
      const standard = standardRows[standardCursor++];
      await db.insert(scienceQuestionStandards).values({
        questionId: qrow.id,
        standardId: standard.id,
      });
      if (!standardIds.includes(standard.id)) standardIds.push(standard.id);
    }
  }

  // Attempt + completion.
  const startedAt = new Date('2026-05-24T10:00:00Z');
  const completedAt = new Date('2026-05-24T10:05:00Z');
  const [attempt] = await db
    .insert(scienceAttempts)
    .values({
      studentId: STUDENT_ID,
      lessonId: lesson.id,
      score: args.questions.filter((q) => q.correct).reduce((s, q) => s + q.points, 0),
      maxScore: args.questions.reduce((s, q) => s + q.points, 0),
      attemptNumber: 1,
      startedAt,
      completedAt,
    })
    .returning();

  // Question responses.
  for (let i = 0; i < args.questions.length; i++) {
    await db.insert(scienceQuestionResponses).values({
      attemptId: attempt.id,
      questionId: questionRows[i].id,
      studentAnswer: args.questions[i].correct ? 'A' : 'B',
      isCorrect: args.questions[i].correct,
      timeSpentSeconds: 30,
      answeredAt: completedAt,
      order: i + 1,
    });
  }

  // Pre-create the MasteryRun row (worker expects to find it; in production
  // the quiz POST handler creates it before calling the worker).
  await db.insert(scienceMasteryRuns).values({
    attemptId: attempt.id,
    studentId: STUDENT_ID,
    status: 'PENDING',
    updatedCount: 0,
  });

  return { attemptId: attempt.id, standardIds };
}

describe('processMasteryRun (integration)', () => {
  beforeEach(async () => {
    await cleanup();
    await seedUsers();
  });

  it('returns FAILED with no-MasteryRun message when run missing', async () => {
    const result = await processMasteryRun({
      attemptId: '00000000-0000-0000-0000-000000000000',
      studentId: STUDENT_ID,
    });

    expect(result.status).toBe('FAILED');
    expect(result.updatedCount).toBe(0);
    expect(result.lastError).toMatch(/MasteryRun not found/);
  });

  it('returns FAILED when attempt has no completedAt', async () => {
    // Seed minimal lesson + attempt without completedAt.
    const [lesson] = await db
      .insert(scienceLessons)
      .values({
        slug: `${TEST_PREFIX}-uncompleted`,
        title: 'Uncompleted',
        gradeLevel: 5,
        order: 1,
      })
      .returning();
    const [attempt] = await db
      .insert(scienceAttempts)
      .values({
        studentId: STUDENT_ID,
        lessonId: lesson.id,
        score: 0,
        maxScore: 1,
        attemptNumber: 1,
        startedAt: new Date(),
        completedAt: null,
      })
      .returning();
    await db.insert(scienceMasteryRuns).values({
      attemptId: attempt.id,
      studentId: STUDENT_ID,
      status: 'PENDING',
      updatedCount: 0,
    });

    const result = await processMasteryRun({
      attemptId: attempt.id,
      studentId: STUDENT_ID,
    });

    expect(result.status).toBe('FAILED');
    expect(result.lastError).toMatch(/has not been completed/);

    const [run] = await db
      .select()
      .from(scienceMasteryRuns)
      .where(eq(scienceMasteryRuns.attemptId, attempt.id))
      .limit(1);
    expect(run.status).toBe('FAILED');
    expect(run.lastError).toMatch(/has not been completed/);
  });

  it('creates standard_mastery rows on first run and marks COMPLETED', async () => {
    const { attemptId, standardIds } = await seedScenario({
      questions: [
        { correct: true, points: 1, standardCount: 1 },
        { correct: false, points: 1, standardCount: 1 },
      ],
    });

    const result = await processMasteryRun({
      attemptId,
      studentId: STUDENT_ID,
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.updatedCount).toBe(2);

    const rows = await db
      .select()
      .from(scienceStandardMastery)
      .where(
        and(
          eq(scienceStandardMastery.studentId, STUDENT_ID),
          inArray(scienceStandardMastery.standardId, standardIds)
        )
      );
    expect(rows).toHaveLength(2);
    // 100%-correct standard should have higher mastery than 0%-correct.
    const sorted = rows.sort(
      (a, b) => Number(a.masteryLevel) - Number(b.masteryLevel)
    );
    expect(Number(sorted[0].masteryLevel)).toBeLessThan(
      Number(sorted[1].masteryLevel)
    );
    expect(Number(sorted[1].masteryLevel)).toBeGreaterThanOrEqual(0.5);
  });

  it('transitions MasteryRun PENDING → COMPLETED with updatedCount', async () => {
    const { attemptId } = await seedScenario({
      questions: [{ correct: true, points: 1, standardCount: 1 }],
    });

    await processMasteryRun({ attemptId, studentId: STUDENT_ID });

    const [run] = await db
      .select()
      .from(scienceMasteryRuns)
      .where(eq(scienceMasteryRuns.attemptId, attemptId))
      .limit(1);
    expect(run.status).toBe('COMPLETED');
    expect(run.updatedCount).toBe(1);
    expect(run.lastError).toBeNull();
  });

  it('skips standards with no question links (defensive — no rows written)', async () => {
    const { attemptId } = await seedScenario({
      questions: [
        // 0 standards on this question → should be skipped silently
        { correct: true, points: 1, standardCount: 0 },
      ],
    });

    const result = await processMasteryRun({
      attemptId,
      studentId: STUDENT_ID,
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.updatedCount).toBe(0);
  });
});

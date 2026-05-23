import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, sql } from '@reading-advantage/db';
import {
  scienceAttempts,
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessonStandards,
  scienceLessons,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandardMastery,
  scienceStandards,
  scienceUnitLessons,
  users,
} from '@reading-advantage/db/schema';

import { buildRecommendationContext } from './recommendation-context';
import type { AttemptWithRelations } from './recommendation-context';

async function cleanup(): Promise<void> {
  await db.delete(scienceQuestionResponses);
  await db.delete(scienceQuestionStandards);
  await db.delete(scienceQuizQuestions);
  await db.delete(scienceAttempts);
  await db.delete(scienceLessonCompletions);
  await db.delete(scienceStandardMastery);
  await db.delete(scienceLessonStandards);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceLessons);
  await db.delete(scienceClasses);
  await db.delete(scienceStandards);
  await db.execute(sql`DELETE FROM users WHERE id LIKE 'rec-context-test-%'`);
}

describe('buildRecommendationContext - Integration', () => {
  let studentId: string;
  let unitId: string;
  let attemptedLessonId: string;
  let otherLessonId: string;
  let standardLowId: string;
  let standardHighId: string;
  let standardOtherId: string;

  beforeEach(async () => {
    await cleanup();

    [{ id: studentId }] = await db
      .insert(users)
      .values({
        id: 'rec-context-test-student',
        name: 'Rec Student',
        username: 'rec-context-test-student',
        displayUsername: 'RecS',
        email: 'rec-student@example.com',
        role: 'STUDENT',
      })
      .returning({ id: users.id });

    const [{ id: teacherId }] = await db
      .insert(users)
      .values({
        id: 'rec-context-test-teacher',
        name: 'Rec Teacher',
        username: 'rec-context-test-teacher',
        displayUsername: 'RecT',
        email: 'rec-teacher@example.com',
        role: 'TEACHER',
      })
      .returning({ id: users.id });

    const [{ id: classId }] = await db
      .insert(scienceClasses)
      .values({
        name: 'RecContext Class',
        gradeLevel: 5,
        standardsAlignment: 'THAI',
        joinCode: 'RECCTX',
        teacherId,
      })
      .returning({ id: scienceClasses.id });

    [{ id: unitId }] = await db
      .insert(scienceCurriculumUnits)
      .values({
        slug: 'rec-ctx-unit',
        title: 'Energy & Motion',
        framework: 'THAI',
        gradeLevel: 5,
        order: 1,
        classId,
      })
      .returning({ id: scienceCurriculumUnits.id });

    // Two lessons in the unit; one is the attempt lesson, one is a peer
    [{ id: attemptedLessonId }] = await db
      .insert(scienceLessons)
      .values({
        slug: 'rec-ctx-lesson-attempted',
        title: 'Force Basics',
        gradeLevel: 5,
        order: 1,
        lessonType: 'LESSON',
      })
      .returning({ id: scienceLessons.id });

    [{ id: otherLessonId }] = await db
      .insert(scienceLessons)
      .values({
        slug: 'rec-ctx-lesson-peer',
        title: 'Energy Transfer',
        gradeLevel: 5,
        order: 2,
        lessonType: 'LAB',
      })
      .returning({ id: scienceLessons.id });

    await db.insert(scienceUnitLessons).values([
      { unitId, lessonId: attemptedLessonId },
      { unitId, lessonId: otherLessonId },
    ]);

    [{ id: standardLowId }] = await db
      .insert(scienceStandards)
      .values({
        framework: 'THAI',
        code: 'Sc-LOW',
        description: 'Low mastery standard',
        gradeLevel: 5,
      })
      .returning({ id: scienceStandards.id });

    [{ id: standardHighId }] = await db
      .insert(scienceStandards)
      .values({
        framework: 'THAI',
        code: 'Sc-HIGH',
        description: 'High mastery standard',
        gradeLevel: 5,
      })
      .returning({ id: scienceStandards.id });

    [{ id: standardOtherId }] = await db
      .insert(scienceStandards)
      .values({
        framework: 'THAI',
        code: 'Sc-OTHER',
        description: 'Other standard (no mastery yet)',
        gradeLevel: 5,
      })
      .returning({ id: scienceStandards.id });

    await db.insert(scienceLessonStandards).values([
      { lessonId: attemptedLessonId, standardId: standardLowId },
      { lessonId: otherLessonId, standardId: standardOtherId },
    ]);

    // Mastery: low (0.20) and high (0.95)
    await db.insert(scienceStandardMastery).values([
      {
        studentId,
        standardId: standardLowId,
        masteryLevel: '0.20',
        evidenceCount: 3,
        lastAssessedAt: new Date('2026-05-01T00:00:00Z'),
      },
      {
        studentId,
        standardId: standardHighId,
        masteryLevel: '0.95',
        evidenceCount: 10,
        lastAssessedAt: new Date('2026-05-15T00:00:00Z'),
      },
    ]);

    // Mark the peer lesson COMPLETED so we can assert the `completed` flag
    await db.insert(scienceLessonCompletions).values({
      studentId,
      lessonId: otherLessonId,
      status: 'COMPLETED',
      completedAt: new Date('2026-05-10T00:00:00Z'),
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  function buildAttempt(overrides: Partial<AttemptWithRelations> = {}): AttemptWithRelations {
    return {
      id: 'attempt-rec-1',
      studentId,
      lessonId: attemptedLessonId,
      score: 4,
      maxScore: 10,
      completedAt: new Date('2026-05-20T12:00:00Z'),
      lesson: {
        id: attemptedLessonId,
        title: 'Force Basics',
        lessonType: 'LESSON',
        gradeLevel: 5,
        order: 1,
        standards: [
          {
            id: standardLowId,
            code: 'Sc-LOW',
            description: 'Low mastery standard',
            framework: 'THAI',
          },
        ],
        curriculumUnits: [
          { id: unitId, title: 'Energy & Motion', order: 1, framework: 'THAI' },
        ],
      },
      student: { id: studentId, gradeLevel: 5 },
      questionResponses: [
        {
          id: 'qr-1',
          isCorrect: false,
          question: { id: 'q-1', standards: [{ id: standardLowId, code: 'Sc-LOW' }] },
        },
        {
          id: 'qr-2',
          isCorrect: true,
          question: { id: 'q-2', standards: [{ id: standardOtherId, code: 'Sc-OTHER' }] },
        },
      ],
      ...overrides,
    };
  }

  it('builds context with mastery snapshot ordered by ascending mastery', async () => {
    const result = await buildRecommendationContext({ attempt: buildAttempt() });

    expect(result.traceId).toMatch(/^rec_/);
    expect(result.studentId).toBe(studentId);
    expect(result.studentHash).toHaveLength(16);
    expect(result.studentGrade).toBe(5);
    expect(result.standardsAlignment).toBe('THAI');

    // mastery sorted ASC by masteryLevel: LOW (0.20) before HIGH (0.95)
    expect(result.masterySnapshot).toHaveLength(2);
    expect(result.masterySnapshot[0].code).toBe('Sc-LOW');
    expect(result.masterySnapshot[0].masteryLevel).toBe(0.2);
    expect(result.masterySnapshot[0].evidenceCount).toBe(3);
    expect(result.masterySnapshot[0].lastAssessedAt).toBe('2026-05-01T00:00:00.000Z');
    expect(result.masterySnapshot[1].code).toBe('Sc-HIGH');
    expect(result.masterySnapshot[1].masteryLevel).toBe(0.95);
  });

  it('exposes a non-zero masteryVersion = max(updatedAt).getTime()', async () => {
    const result = await buildRecommendationContext({ attempt: buildAttempt() });
    expect(result.masteryVersion).toBeGreaterThan(0);
  });

  it('returns candidate lessons from the attempt unit ordered by order, with completed flag', async () => {
    const result = await buildRecommendationContext({ attempt: buildAttempt() });

    expect(result.candidateLessons).toHaveLength(2);
    expect(result.candidateLessons.map((l) => l.title)).toEqual([
      'Force Basics',
      'Energy Transfer',
    ]);
    // Peer lesson (order 2) has prerequisites = [attempt lesson (order 1)]
    expect(result.candidateLessons[1].prerequisites).toEqual([attemptedLessonId]);
    expect(result.candidateLessons[0].prerequisites).toEqual([]);
    // Completed flag reflects the seeded lesson completion
    expect(result.candidateLessons[0].completed).toBe(false);
    expect(result.candidateLessons[1].completed).toBe(true);
    // Standards inherited via the junction
    const peerStandards = result.candidateLessons[1].standards.map((s) => s.code);
    expect(peerStandards).toEqual(['Sc-OTHER']);
  });

  it('summarizes the attempt score, question counts, and incorrect standards', async () => {
    const result = await buildRecommendationContext({ attempt: buildAttempt() });

    expect(result.attemptSummary.attemptId).toBe('attempt-rec-1');
    expect(result.attemptSummary.lessonId).toBe(attemptedLessonId);
    expect(result.attemptSummary.lessonTitle).toBe('Force Basics');
    expect(result.attemptSummary.completedAt).toBe('2026-05-20T12:00:00.000Z');
    expect(result.attemptSummary.scorePercentage).toBe(40);
    expect(result.attemptSummary.questionCount).toBe(2);
    expect(result.attemptSummary.correctCount).toBe(1);
    expect(result.attemptSummary.incorrectStandards).toEqual(['Sc-LOW']);
  });

  it('returns null curriculumTitle when no units exist on the attempt lesson', async () => {
    const attemptNoUnits = buildAttempt({
      lesson: {
        ...buildAttempt().lesson,
        curriculumUnits: [],
      },
    });
    const result = await buildRecommendationContext({ attempt: attemptNoUnits });

    expect(result.candidateLessons).toEqual([]);
    expect(result.curriculumTitle).toBeNull();
    // standardsAlignment still falls back to the attempt lesson's standards
    expect(result.standardsAlignment).toBe('THAI');
  });

  it('returns scorePercentage=null when maxScore is 0', async () => {
    const attempt = buildAttempt({ score: 0, maxScore: 0 });
    const result = await buildRecommendationContext({ attempt });
    expect(result.attemptSummary.scorePercentage).toBeNull();
  });
});

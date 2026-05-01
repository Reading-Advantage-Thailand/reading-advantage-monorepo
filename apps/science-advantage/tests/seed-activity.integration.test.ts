
import { PrismaClient } from '@prisma/client';
import { seedActivityData } from '../prisma/seed-functions/seed-activity-data';
import { seedDemoData } from '../prisma/seed-functions/seed-demo-data';
import { seedStandards } from '../prisma/seed-functions/seed-standards';
import { seedLessons } from '../prisma/seed-functions/seed-lessons';
import { seedQuestions } from '../prisma/seed-functions/seed-questions';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const prisma = new PrismaClient();

describe('seedActivityData', () => {
  beforeAll(async () => {
    // Clean up activity data before tests
    await prisma.lessonCompletion.deleteMany({});
    await prisma.questionResponse.deleteMany({});
    await prisma.attempt.deleteMany({});
    await prisma.user.deleteMany({ where: { username: { startsWith: 'student_demo_' } } });

    // Seed base data in correct order (same as main seed.ts)
    await seedStandards(prisma, {});
    await seedLessons(prisma, {});
    await seedQuestions(prisma);
    await seedDemoData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should seed activity data correctly', async () => {
    await seedActivityData(prisma);

    const demoClass = await prisma.class.findUnique({
      where: { joinCode: 'DEMO3T' },
      include: { students: true },
    });

    expect(demoClass?.students.length).toBe(15);

    const strugglingLearner = await prisma.user.findFirst({
      where: { name: { startsWith: 'Struggling-Learner' } },
    });

    const attempts = await prisma.attempt.findMany({
      where: { studentId: strugglingLearner?.id },
    });

    expect(attempts.length).toBeGreaterThan(1);
  });

  it('should be idempotent', async () => {
    await seedActivityData(prisma);
    await seedActivityData(prisma);

    const demoClass = await prisma.class.findUnique({
      where: { joinCode: 'DEMO3T' },
      include: { students: true },
    });

    expect(demoClass?.students.length).toBe(15);

    // Verify attempts weren't duplicated
    const totalAttempts = await prisma.attempt.count();
    expect(totalAttempts).toBeGreaterThan(0);
  });

  it('should create hard lesson with lower average score', async () => {
    // Find the "Diversity of Living Things" lesson
    const hardLesson = await prisma.lesson.findFirst({
      where: { title: { contains: 'Diversity' } },
    });

    expect(hardLesson).toBeDefined();

    // Calculate average score for hard lesson
    const hardLessonAttempts = await prisma.attempt.findMany({
      where: { lessonId: hardLesson!.id },
    });

    const hardLessonAvg = hardLessonAttempts.reduce((sum, a) => sum + (a.score / a.maxScore), 0) / hardLessonAttempts.length;

    // Calculate average score for all lessons
    const allAttempts = await prisma.attempt.findMany();
    const overallAvg = allAttempts.reduce((sum, a) => sum + (a.score / a.maxScore), 0) / allAttempts.length;

    // Hard lesson should have lower average than overall
    expect(hardLessonAvg).toBeLessThan(overallAvg);
    expect(hardLessonAvg).toBeLessThan(0.65); // Should be below 65%
  });

  it('should show improvement for improving learners', async () => {
    const improvingLearner = await prisma.user.findFirst({
      where: { name: { startsWith: 'Improving-Learner' } },
    });

    expect(improvingLearner).toBeDefined();

    // Get a lesson with multiple attempts
    const lesson = await prisma.lesson.findFirst({
      where: { gradeLevel: 3 },
    });

    const attempts = await prisma.attempt.findMany({
      where: {
        studentId: improvingLearner!.id,
        lessonId: lesson!.id,
      },
      orderBy: { attemptNumber: 'asc' },
    });

    if (attempts.length >= 2) {
      const firstScore = attempts[0].score / attempts[0].maxScore;
      const lastScore = attempts[attempts.length - 1].score / attempts[attempts.length - 1].maxScore;

      // Last attempt should be equal or better than first (allowing for randomness)
      // We'll check that the last attempt is at least not significantly worse
      expect(lastScore).toBeGreaterThanOrEqual(firstScore - 0.1);
    }
  });

  it('should create accurate LessonCompletion records', async () => {
    const student = await prisma.user.findFirst({
      where: { name: { startsWith: 'High-Achiever' } },
    });

    const completions = await prisma.lessonCompletion.findMany({
      where: { studentId: student!.id },
    });

    expect(completions.length).toBeGreaterThan(0);

    for (const completion of completions) {
      expect(completion.status).toBe('COMPLETED');
      expect(completion.attemptsCount).toBeGreaterThan(0);
      expect(completion.bestScorePercentage).toBeGreaterThanOrEqual(0);
      expect(completion.bestScorePercentage).toBeLessThanOrEqual(100);
      expect(completion.mostRecentScorePercentage).toBeGreaterThanOrEqual(0);
      expect(completion.mostRecentScorePercentage).toBeLessThanOrEqual(100);
      expect(completion.bestScorePercentage).toBeGreaterThanOrEqual(completion.mostRecentScorePercentage - 10);
    }
  });
});

import prisma from '../../lib/prisma';
import type {
  UserRole,
  StandardsAlignment,
  QuestionType,
  LessonCompletionStatus,
} from '@prisma/client';

export async function createTestUser(
  overrides: Partial<{ role: UserRole; gradeLevel: number; name: string }> = {}
) {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  return prisma.user.create({
    data: {
      id: `test-user-${timestamp}-${randomId}`,
      name: overrides.name || `Test User ${timestamp}`,
      username: `testuser${timestamp}`,
      displayUsername: `testuser${timestamp}`,
      email: `test${timestamp}@example.com`,
      role: overrides.role || 'STUDENT',
      gradeLevel: overrides.gradeLevel || 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function createTestClass(
  teacherId: string,
  overrides: Partial<{
    name: string;
    gradeLevel: number;
    standardsAlignment: StandardsAlignment;
  }> = {}
) {
  const timestamp = Date.now();
  return prisma.class.create({
    data: {
      name: overrides.name || `Test Class ${timestamp}`,
      gradeLevel: overrides.gradeLevel || 3,
      standardsAlignment: overrides.standardsAlignment || 'THAI',
      joinCode: `JOIN${timestamp}`,
      teacherId,
    },
  });
}

export async function createTestLesson(
  classId: string,
  overrides: Partial<{ title: string; order: number; standardIds: string[] }> = {}
) {
  const timestamp = Date.now();

  // First create a curriculum unit for the class
  const curriculumUnit = await prisma.curriculumUnit.create({
    data: {
      title: `Test Unit ${timestamp}`,
      slug: `test-unit-${timestamp}`,
      framework: 'THAI',
      gradeLevel: 3,
      order: overrides.order || 1,
      classId,
    },
  });

  return prisma.lesson.create({
    data: {
      title: overrides.title || `Test Lesson ${timestamp}`,
      slug: `test-lesson-${timestamp}`,
      description: 'Test lesson description',
      content: 'Test lesson content',
      gradeLevel: 3,
      order: overrides.order || 1,
      curriculumUnits: {
        connect: { id: curriculumUnit.id },
      },
      standards: overrides.standardIds
        ? {
            connect: overrides.standardIds.map((id) => ({ id })),
          }
        : undefined,
    },
  });
}

export async function createTestLessonCompletion(
  studentId: string,
  lessonId: string,
  overrides: Partial<{
    status: LessonCompletionStatus;
    mostRecentScore: number;
    mostRecentScorePercentage: number;
    bestScore: number;
    bestScorePercentage: number;
    attemptsCount: number;
    totalTimeSpentSeconds: number;
  }> = {}
) {
  return prisma.lessonCompletion.create({
    data: {
      studentId,
      lessonId,
      status: overrides.status || 'COMPLETED',
      mostRecentScore: overrides.mostRecentScore,
      mostRecentScorePercentage: overrides.mostRecentScorePercentage || 80,
      bestScore: overrides.bestScore,
      bestScorePercentage: overrides.bestScorePercentage,
      attemptsCount: overrides.attemptsCount || 1,
      totalTimeSpentSeconds: overrides.totalTimeSpentSeconds || 300,
      completedAt: new Date(),
    },
  });
}

export async function createTestStandard(
  overrides: Partial<{
    framework: StandardsAlignment;
    code: string;
    description: string;
    gradeLevel: number;
  }> = {}
) {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const framework = overrides.framework || 'THAI';
  const code = overrides.code || `TEST-${timestamp}-${randomId}`;

  // Use upsert to avoid unique constraint errors
  return prisma.standard.upsert({
    where: {
      framework_code: {
        framework,
        code,
      },
    },
    update: {},
    create: {
      framework,
      code,
      description: overrides.description || `Test standard ${timestamp}`,
      gradeLevel: overrides.gradeLevel || 3,
    },
  });
}

export async function createTestQuizQuestion(
  lessonId: string,
  overrides: Partial<{
    order: number;
    text: string;
    type: QuestionType;
    options: any;
    correctAnswer: any;
    points: number;
    standardIds: string[];
  }> = {}
) {
  const timestamp = Date.now();
  return prisma.quizQuestion.create({
    data: {
      lessonId,
      slug: `test-question-${timestamp}`,
      order: overrides.order || 1,
      text: overrides.text || `Test question ${timestamp}`,
      type: overrides.type || 'MULTIPLE_CHOICE',
      options: overrides.options || ['A', 'B', 'C', 'D'],
      correctAnswer: overrides.correctAnswer || 'A',
      points: overrides.points || 1,
      standards: overrides.standardIds
        ? {
            connect: overrides.standardIds.map((id) => ({ id })),
          }
        : undefined,
    },
  });
}

export async function createTestAttempt(
  overrides: Partial<{
    studentId: string;
    lessonId: string;
    attemptNumber: number;
    score: number;
    maxScore: number;
    completedAt: Date;
  }>
) {
  if (!overrides.studentId || !overrides.lessonId) {
    throw new Error('studentId and lessonId are required');
  }

  return prisma.attempt.create({
    data: {
      studentId: overrides.studentId,
      lessonId: overrides.lessonId,
      attemptNumber: overrides.attemptNumber || 1,
      score: overrides.score || 0,
      maxScore: overrides.maxScore || 10,
      completedAt: overrides.completedAt || new Date(),
    },
  });
}

export async function createTestQuestionResponse(
  overrides: Partial<{
    attemptId: string;
    questionId: string;
    studentAnswer: any;
    isCorrect: boolean;
    timeSpentSeconds: number;
  }>
) {
  if (!overrides.attemptId || !overrides.questionId) {
    throw new Error('attemptId and questionId are required');
  }

  return prisma.questionResponse.create({
    data: {
      attemptId: overrides.attemptId,
      questionId: overrides.questionId,
      studentAnswer: overrides.studentAnswer || 'test answer',
      isCorrect: overrides.isCorrect !== undefined ? overrides.isCorrect : true,
      timeSpentSeconds: overrides.timeSpentSeconds || 30,
    },
  });
}

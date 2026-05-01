import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import type { user as UserModel, Class, Lesson, QuizQuestion } from '@prisma/client';
import { GET, POST } from './route';
import { createSession } from '@/lib/auth/session';
import { BADGE_DEFINITIONS } from '@/lib/gamification/badges';

// Mock next/headers for cookies
const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

describe('GET /api/lessons/[lessonId]/quiz - Integration Tests', () => {
  let testTeacher: UserModel;
  let testStudent: UserModel;
  let otherStudent: UserModel;
  let testClass: Class;
  let testLesson: Lesson;
  let quizQuestions: QuizQuestion[];

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    // Clean up in correct order
    await prisma.$executeRaw`DELETE FROM "_QuizQuestionToStandard"`;
    await prisma.questionResponse.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.$executeRaw`DELETE FROM "_CurriculumUnitToLesson"`;
    await prisma.$executeRaw`DELETE FROM "_LessonToStandard"`;
    await prisma.curriculumUnit.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.class.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    testTeacher = await prisma.user.create({
      data: {
        id: 'test-teacher-quiz',
        name: 'Test Teacher',
        username: 'testteacher-quiz',
        displayUsername: 'TestTeacher',
        email: 'teacher-quiz@example.com',
        role: 'TEACHER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    testStudent = await prisma.user.create({
      data: {
        id: 'test-student-quiz',
        name: 'Test Student',
        username: 'teststudent-quiz',
        displayUsername: 'TestStudent',
        email: 'student-quiz@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    otherStudent = await prisma.user.create({
      data: {
        id: 'other-student-quiz',
        name: 'Other Student',
        username: 'otherstudent-quiz',
        displayUsername: 'OtherStudent',
        email: 'other-quiz@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test class
    testClass = await prisma.class.create({
      data: {
        id: 'test-class-quiz',
        name: 'Grade 3 Science',
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: 'QUIZ123',
        teacherId: testTeacher.id,
        students: {
          connect: { id: testStudent.id },
        },
      },
    });

    // Create test lesson
    testLesson = await prisma.lesson.create({
      data: {
        id: 'lesson-quiz-1',
        slug: 'intro-to-science-quiz',
        title: 'Introduction to Science',
        description: 'Learn what science is',
        content: 'Science is the study of the natural world',
        gradeLevel: 3,
        order: 1,
      },
    });

    // Link lesson to class via curriculum unit
    await prisma.curriculumUnit.create({
      data: {
        id: 'unit-quiz-1',
        slug: 'unit-quiz-1-science-basics',
        title: 'Unit 1: Science Basics',
        framework: 'THAI',
        gradeLevel: 3,
        order: 1,
        classId: testClass.id,
        lessons: {
          connect: { id: testLesson.id },
        },
      },
    });

    // Create 12 questions (4N = 36 for N=9, but using 12 for 3-question quiz for testing)
    quizQuestions = [];
    for (let i = 1; i <= 12; i++) {
      const question = await prisma.quizQuestion.create({
        data: {
          slug: `quiz-q-${i}`,
          lessonId: testLesson.id,
          type: 'MULTIPLE_CHOICE',
          text: `Question ${i}: What is the scientific method step ${i}?`,
          options: ['Observe', 'Predict', 'Test', 'Conclude'],
          correctAnswer: 'Observe',
          points: 1,
          order: i,
        },
      });
      quizQuestions.push(question);
    }
  });

  afterEach(async () => {
    await prisma.$executeRaw`DELETE FROM "_QuizQuestionToStandard"`;
    await prisma.questionResponse.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.$executeRaw`DELETE FROM "_CurriculumUnitToLesson"`;
    await prisma.$executeRaw`DELETE FROM "_LessonToStandard"`;
    await prisma.curriculumUnit.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.class.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      mockCookies.get.mockReturnValue(undefined);

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz`);
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Authorization', () => {
    it('should allow enrolled student to access quiz', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz`);
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.quizId).toBeDefined();
      expect(data.questions).toBeDefined();
    });

    it('should deny non-enrolled student access', async () => {
      const session = await createSession(otherStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz`);
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not enrolled in class with this lesson');
    });

    it('should allow class teacher to access quiz', async () => {
      const session = await createSession(testTeacher.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz`);
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.quizId).toBeDefined();
      expect(data.questions).toBeDefined();
    });
  });

  describe('Lesson Not Found', () => {
    it('should return 404 for non-existent lesson', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/lessons/non-existent-lesson/quiz');
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: 'non-existent-lesson' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Lesson not found');
    });
  });

  describe('Question Selection', () => {
    it('should return N questions from the question bank', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz`);
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      // For 12 questions, N = 3 (12/4)
      expect(data.questions).toHaveLength(3);
    });

    it('should not include correct answers in response', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz`);
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      data.questions.forEach((q: any) => {
        expect(q.correctAnswer).toBeUndefined();
      });
    });

    it('should include required question fields', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz`);
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      const question = data.questions[0];
      expect(question).toHaveProperty('id');
      expect(question).toHaveProperty('type');
      expect(question).toHaveProperty('text');
      expect(question).toHaveProperty('options');
      expect(question).toHaveProperty('points');
      expect(question).toHaveProperty('order');
    });

    it('should create an attempt record with startedAt timestamp', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz`);
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.quizId).toBeDefined();
      expect(data.startedAt).toBeDefined();

      // Verify attempt record exists in database
      const attempt = await prisma.attempt.findUnique({
        where: { id: data.quizId },
      });
      expect(attempt).toBeDefined();
      expect(attempt?.studentId).toBe(testStudent.id);
      expect(attempt?.lessonId).toBe(testLesson.id);
      expect(attempt?.completedAt).toBeNull();
    });

    it('should calculate correct total points', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz`);
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalPoints).toBe(3); // 3 questions * 1 point each
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if question pool is too small', async () => {
      // Create lesson with only 2 questions (less than 4N for any N > 0)
      const smallLesson = await prisma.lesson.create({
        data: {
          id: 'lesson-small',
          slug: 'small-lesson',
          title: 'Small Lesson',
          gradeLevel: 3,
          order: 99,
        },
      });

      await prisma.curriculumUnit.create({
        data: {
          id: 'unit-small',
          slug: 'unit-small',
          title: 'Small Unit',
          framework: 'THAI',
          gradeLevel: 3,
          order: 99,
          classId: testClass.id,
          lessons: {
            connect: { id: smallLesson.id },
          },
        },
      });

      await prisma.quizQuestion.create({
        data: {
          slug: 'small-q-1',
          lessonId: smallLesson.id,
          type: 'TRUE_FALSE',
          text: 'Is this a test?',
          options: ['True', 'False'],
          correctAnswer: 'True',
          points: 1,
          order: 1,
        },
      });

      await prisma.quizQuestion.create({
        data: {
          slug: 'small-q-2',
          lessonId: smallLesson.id,
          type: 'TRUE_FALSE',
          text: 'Is this another test?',
          options: ['True', 'False'],
          correctAnswer: 'False',
          points: 1,
          order: 2,
        },
      });

      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${smallLesson.id}/quiz`);
      const response = await GET(request, { params: Promise.resolve({ lessonSlug: smallLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Insufficient questions');
    });
  });
});

describe('POST /api/lessons/[lessonId]/quiz/submit - Integration Tests', () => {
  let testTeacher: UserModel;
  let testStudent: UserModel;
  let otherStudent: UserModel;
  let testClass: Class;
  let testLesson: Lesson;
  let quizQuestions: QuizQuestion[];
  let attemptId: string;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    // Clean up in correct order
    await prisma.$executeRaw`DELETE FROM "_QuizQuestionToStandard"`;
    await prisma.questionResponse.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.$executeRaw`DELETE FROM "_CurriculumUnitToLesson"`;
    await prisma.$executeRaw`DELETE FROM "_LessonToStandard"`;
    await prisma.achievement.deleteMany();
    await prisma.gamificationProfile.deleteMany();
    await prisma.lessonCompletion.deleteMany();
    await prisma.curriculumUnit.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.class.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    testTeacher = await prisma.user.create({
      data: {
        id: 'test-teacher-submit',
        name: 'Test Teacher',
        username: 'testteacher-submit',
        displayUsername: 'TestTeacher',
        email: 'teacher-submit@example.com',
        role: 'TEACHER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    testStudent = await prisma.user.create({
      data: {
        id: 'test-student-submit',
        name: 'Test Student',
        username: 'teststudent-submit',
        displayUsername: 'TestStudent',
        email: 'student-submit@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    otherStudent = await prisma.user.create({
      data: {
        id: 'other-student-submit',
        name: 'Other Student',
        username: 'otherstudent-submit',
        displayUsername: 'OtherStudent',
        email: 'other-submit@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test class
    testClass = await prisma.class.create({
      data: {
        id: 'test-class-submit',
        name: 'Grade 3 Science',
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: 'SUBM123',
        teacherId: testTeacher.id,
        students: {
          connect: { id: testStudent.id },
        },
      },
    });

    // Create test lesson
    testLesson = await prisma.lesson.create({
      data: {
        id: 'lesson-submit-1',
        slug: 'lesson-submit-1',
        title: 'Introduction to Science',
        description: 'Learn what science is',
        content: 'Science is the study of the natural world',
        gradeLevel: 3,
        order: 1,
      },
    });

    // Link lesson to class via curriculum unit
    await prisma.curriculumUnit.create({
      data: {
        id: 'unit-submit-1',
        slug: 'unit-submit-1',
        title: 'Unit 1: Science Basics',
        framework: 'THAI',
        gradeLevel: 3,
        order: 1,
        classId: testClass.id,
        lessons: {
          connect: { id: testLesson.id },
        },
      },
    });

    // Create 3 quiz questions
    quizQuestions = [];
    const questionsData = [
      {
        text: 'What is the first step of the scientific method?',
        correctAnswer: 'Observe',
      },
      {
        text: 'What comes after observation?',
        correctAnswer: 'Predict',
      },
      {
        text: 'How do you test a hypothesis?',
        correctAnswer: 'Test',
      },
    ];

    for (let i = 0; i < questionsData.length; i++) {
      const question = await prisma.quizQuestion.create({
        data: {
          slug: `submit-q-${i + 1}`,
          lessonId: testLesson.id,
          type: 'MULTIPLE_CHOICE',
          text: questionsData[i].text,
          options: ['Observe', 'Predict', 'Test', 'Conclude'],
          correctAnswer: questionsData[i].correctAnswer,
          points: 1,
          order: i + 1,
        },
      });
      quizQuestions.push(question);
    }

    // Create an attempt for testing
    const attempt = await prisma.attempt.create({
      data: {
        studentId: testStudent.id,
        lessonId: testLesson.id,
        maxScore: 3,
        attemptNumber: 1,
        startedAt: new Date(),
      },
    });
    attemptId = attempt.id;
  });

  afterEach(async () => {
    await prisma.$executeRaw`DELETE FROM "_QuizQuestionToStandard"`;
    await prisma.questionResponse.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.quizQuestion.deleteMany();
    await prisma.$executeRaw`DELETE FROM "_CurriculumUnitToLesson"`;
    await prisma.$executeRaw`DELETE FROM "_LessonToStandard"`;
    await prisma.achievement.deleteMany();
    await prisma.gamificationProfile.deleteMany();
    await prisma.lessonCompletion.deleteMany();
    await prisma.curriculumUnit.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.class.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Badge Unlocks', () => {
    it('should return badgesUnlocked and achievements in gamification response', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz/submit`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId,
          responses: quizQuestions.map((q, i) => ({
            questionId: q.id,
            studentAnswer: 'Observe',
            timeSpentSeconds: 30,
            answeredAt: new Date().toISOString(),
            order: i + 1,
          })),
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.gamification).toHaveProperty('badgesUnlocked');
      expect(data.gamification).toHaveProperty('achievements');
      expect(Array.isArray(data.gamification.badgesUnlocked)).toBe(true);
      expect(Array.isArray(data.gamification.achievements)).toBe(true);
    });

    it('should unlock FIRST_STEPS badge on first lesson completion', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz/submit`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId,
          responses: quizQuestions.map((q, i) => ({
            questionId: q.id,
            studentAnswer: 'Observe',
            timeSpentSeconds: 30,
            answeredAt: new Date().toISOString(),
            order: i + 1,
          })),
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.gamification.badgesUnlocked).toContain('FIRST_STEPS');

      // Verify achievement record was created in database
      const achievement = await prisma.achievement.findFirst({
        where: {
          userId: testStudent.id,
          badgeType: 'FIRST_STEPS',
        },
      });
      expect(achievement).toBeDefined();
      expect(achievement?.badgeType).toBe('FIRST_STEPS');
    });

    it('should unlock PERFECT_SCORE badge on 100% quiz score', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      // Submit correct answers for all questions (Observe, Predict, Test)
      const correctAnswers = ['Observe', 'Predict', 'Test'];
      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz/submit`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId,
          responses: quizQuestions.map((q, i) => ({
            questionId: q.id,
            studentAnswer: correctAnswers[i],
            timeSpentSeconds: 30,
            answeredAt: new Date().toISOString(),
            order: i + 1,
          })),
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.gamification.badgesUnlocked).toContain('PERFECT_SCORE');
    });

    it('should not unlock PERFECT_SCORE badge on less than 100%', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz/submit`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId,
          responses: quizQuestions.map((q, i) => ({
            questionId: q.id,
            studentAnswer: i === 0 ? 'Observe' : 'Wrong',
            timeSpentSeconds: 30,
            answeredAt: new Date().toISOString(),
            order: i + 1,
          })),
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.gamification.badgesUnlocked).not.toContain('PERFECT_SCORE');
    });

    it('should not create duplicate achievement records for already-earned badges', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      // First submission - should unlock FIRST_STEPS
      const request1 = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz/submit`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId,
          responses: quizQuestions.map((q, i) => ({
            questionId: q.id,
            studentAnswer: 'Observe',
            timeSpentSeconds: 30,
            answeredAt: new Date().toISOString(),
            order: i + 1,
          })),
        }),
      });
      await POST(request1, { params: Promise.resolve({ lessonSlug: testLesson.id }) });

      // Second attempt
      const attempt2 = await prisma.attempt.create({
        data: {
          studentId: testStudent.id,
          lessonId: testLesson.id,
          maxScore: 3,
          attemptNumber: 2,
          startedAt: new Date(),
        },
      });

      const request2 = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz/submit`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId: attempt2.id,
          responses: quizQuestions.map((q, i) => ({
            questionId: q.id,
            studentAnswer: 'Observe',
            timeSpentSeconds: 30,
            answeredAt: new Date().toISOString(),
            order: i + 1,
          })),
        }),
      });
      const response2 = await POST(request2, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data2 = await response2.json();

      // FIRST_STEPS should NOT be in newly unlocked (already earned)
      expect(data2.gamification.badgesUnlocked).not.toContain('FIRST_STEPS');

      // Only one FIRST_STEPS achievement should exist in database
      const firstStepsAchievements = await prisma.achievement.findMany({
        where: {
          userId: testStudent.id,
          badgeType: 'FIRST_STEPS',
        },
      });
      expect(firstStepsAchievements).toHaveLength(1);
    });
  });

  describe('Response Format', () => {
    it('should return all required fields in response', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest(`http://localhost:3000/api/lessons/${testLesson.id}/quiz/submit`, {
        method: 'POST',
        body: JSON.stringify({
          attemptId,
          responses: quizQuestions.map((q, i) => ({
            questionId: q.id,
            studentAnswer: 'Observe',
            timeSpentSeconds: 30,
            answeredAt: new Date().toISOString(),
            order: i + 1,
          })),
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ lessonSlug: testLesson.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('attemptId');
      expect(data).toHaveProperty('score');
      expect(data).toHaveProperty('maxScore');
      expect(data).toHaveProperty('percentage');
      expect(data).toHaveProperty('attemptNumber');
      expect(data).toHaveProperty('completedAt');
      expect(data).toHaveProperty('breakdown');

      const breakdownItem = data.breakdown[0];
      expect(breakdownItem).toHaveProperty('questionId');
      expect(breakdownItem).toHaveProperty('questionText');
      expect(breakdownItem).toHaveProperty('studentAnswer');
      expect(breakdownItem).toHaveProperty('correctAnswer');
      expect(breakdownItem).toHaveProperty('isCorrect');
      expect(breakdownItem).toHaveProperty('points');
      expect(breakdownItem).toHaveProperty('timeSpentSeconds');
    });
  });
});

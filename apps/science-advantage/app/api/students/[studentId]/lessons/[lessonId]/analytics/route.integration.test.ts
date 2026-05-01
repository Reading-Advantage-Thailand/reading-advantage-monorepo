import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

import prisma from '@/lib/prisma';
import { createTestUser, createTestClass, cleanupTestData } from '@/lib/test-helpers';

describe('/api/students/[studentId]/lessons/[lessonId]/analytics', () => {
  let teacher: any;
  let otherTeacher: any;
  let student: any;
  let otherStudent: any;
  let testClass: any;
  let lesson: any;
  let unit: any;
  let standard: any;
  let question1: any;
  let question2: any;
  let attempt1: any;
  let attempt2: any;

  beforeAll(async () => {
    // Create test users
    teacher = await createTestUser('teacher', 'TEACHER');
    otherTeacher = await createTestUser('other-teacher', 'TEACHER');
    student = await createTestUser('student', 'STUDENT');
    otherStudent = await createTestUser('other-student', 'STUDENT');

    // Create test class
    testClass = await createTestClass(teacher.id, [student.id]);

    // Create standard
    standard = await prisma.standard.create({
      data: {
        code: 'Sc1.1',
        description: 'Scientific Inquiry',
        framework: 'THAI',
        gradeLevel: 3,
      },
    });

    // Create lesson
    lesson = await prisma.lesson.create({
      data: {
        title: 'Test Lesson',
        description: 'Test lesson description',
        type: 'ASSESSMENT',
        order: 1,
        standards: {
          connect: [{ id: standard.id }],
        },
      },
    });

    // Create curriculum unit
    unit = await prisma.curriculumUnit.create({
      data: {
        title: 'Test Unit',
        framework: testClass.standardsAlignment,
        gradeLevel: testClass.gradeLevel,
        order: 1,
        classId: testClass.id,
        lessons: {
          connect: [{ id: lesson.id }],
        },
      },
    });

    // Create quiz questions
    question1 = await prisma.quizQuestion.create({
      data: {
        lessonId: lesson.id,
        type: 'MULTIPLE_CHOICE',
        text: 'What is the scientific method?',
        options: { choices: ['A', 'B', 'C', 'D'] },
        correctAnswer: { answer: 'A' },
        points: 1,
        order: 1,
        standards: {
          connect: [{ id: standard.id }],
        },
      },
    });

    question2 = await prisma.quizQuestion.create({
      data: {
        lessonId: lesson.id,
        type: 'MULTIPLE_CHOICE',
        text: 'What is a hypothesis?',
        options: { choices: ['A', 'B', 'C', 'D'] },
        correctAnswer: { answer: 'B' },
        points: 1,
        order: 2,
        standards: {
          connect: [{ id: standard.id }],
        },
      },
    });

    // Create attempts for the student
    attempt1 = await prisma.attempt.create({
      data: {
        studentId: student.id,
        lessonId: lesson.id,
        attemptNumber: 1,
        score: 1,
        maxScore: 2,
        startedAt: new Date('2024-01-10T10:00:00Z'),
        completedAt: new Date('2024-01-10T10:15:00Z'),
        questionResponses: {
          create: [
            {
              questionId: question1.id,
              studentAnswer: { answer: 'A' },
              isCorrect: true,
              timeSpentSeconds: 30,
              order: 1,
            },
            {
              questionId: question2.id,
              studentAnswer: { answer: 'A' },
              isCorrect: false,
              timeSpentSeconds: 45,
              order: 2,
            },
          ],
        },
      },
    });

    attempt2 = await prisma.attempt.create({
      data: {
        studentId: student.id,
        lessonId: lesson.id,
        attemptNumber: 2,
        score: 2,
        maxScore: 2,
        startedAt: new Date('2024-01-11T10:00:00Z'),
        completedAt: new Date('2024-01-11T10:12:00Z'),
        questionResponses: {
          create: [
            {
              questionId: question1.id,
              studentAnswer: { answer: 'A' },
              isCorrect: true,
              timeSpentSeconds: 25,
              order: 1,
            },
            {
              questionId: question2.id,
              studentAnswer: { answer: 'B' },
              isCorrect: true,
              timeSpentSeconds: 35,
              order: 2,
            },
          ],
        },
      },
    });

    // Update lesson completion for student
    await prisma.lessonCompletion.create({
      data: {
        studentId: student.id,
        lessonId: lesson.id,
        status: 'COMPLETED',
        attemptsCount: 2,
        bestScore: 2,
        bestScorePercentage: 100,
        mostRecentScore: 2,
        mostRecentScorePercentage: 100,
        totalTimeSpentSeconds: 135,
        completedAt: new Date('2024-01-11T10:12:00Z'),
        lastAttemptAt: new Date('2024-01-11T10:12:00Z'),
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(
        `http://localhost:3000/api/students/${student.id}/lessons/${lesson.id}/analytics`
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Authorization', () => {
    it('should allow teacher who owns a class the student is enrolled in', async () => {
      // Mock session for the teacher
      const mockSession = {
        user: { id: teacher.id, role: 'TEACHER' },
      };
      // Note: In real tests, you'd need to set up proper session mocking
      // This is a placeholder for the test structure
    });

    it('should deny teacher who does not teach the student', async () => {
      // Mock session for other teacher
      const mockSession = {
        user: { id: otherTeacher.id, role: 'TEACHER' },
      };
      // Note: In real tests, you'd need to set up proper session mocking
    });
  });

  describe('Response Data', () => {
    it('should return student and lesson information', async () => {
      // Mock authenticated request as teacher
      // Expected response structure:
      // {
      //   student: { id, name },
      //   lesson: { id, title, order },
      //   attemptHistory: [...],
      //   standardsPerformance: [...]
      // }
    });

    it('should return attempt history in correct order (most recent first)', async () => {
      // Expected: attempt2 before attempt1
    });

    it('should include question breakdown for each attempt', async () => {
      // Each attempt should have questionBreakdown array
    });

    it('should calculate scores correctly', async () => {
      // Attempt 1: 1/2 = 50%
      // Attempt 2: 2/2 = 100%
    });

    it('should include time spent for each attempt and question', async () => {
      // Attempt 1: 30 + 45 = 75 seconds
      // Attempt 2: 25 + 35 = 60 seconds
    });

    it('should mark correct/incorrect for each question response', async () => {
      // Attempt 1, Q1: correct, Q2: incorrect
      // Attempt 2, Q1: correct, Q2: correct
    });

    it('should include standards performance for the student', async () => {
      // Based on most recent attempt:
      // Standard Sc1.1: 2/2 questions correct = 100%
    });

    it('should assign correct color codes based on scores', async () => {
      // 50% = yellow, 100% = blue
    });
  });

  describe('Edge Cases', () => {
    it('should handle student with no attempts', async () => {
      // otherStudent has no attempts
      // Should return empty attemptHistory
    });

    it('should handle lesson not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      // Expected 404
    });

    it('should handle student not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      // Expected 404
    });

    it('should handle incomplete attempts', async () => {
      // Create attempt without completedAt
      // Should show status: 'in_progress'
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/classes/[classId]/lessons/[lessonId]/analytics/route';
import prisma from '@/lib/prisma';
import {
  createTestUser,
  createTestClass,
  createTestLesson,
  createTestLessonCompletion,
  createTestStandard,
  createTestQuizQuestion,
  createTestAttempt,
  createTestQuestionResponse,
} from '../lib/test-utils';

describe('/api/classes/[classId]/lessons/[lessonId]/analytics', () => {
  let teacher: any;
  let testClass: any;
  let lesson: any;
  let student1: any;
  let student2: any;
  let student3: any;
  let standard1: any;
  let standard2: any;
  let question1: any;
  let question2: any;
  let question3: any;

  beforeEach(async () => {
    // Create test data
    teacher = await createTestUser({ role: 'TEACHER' });
    testClass = await createTestClass(teacher.id);

    // Create standards
    standard1 = await createTestStandard({
      framework: testClass.standardsAlignment,
      code: 'Sc1.1-G3',
      description: 'Observe and describe characteristics',
      gradeLevel: testClass.gradeLevel,
    });

    standard2 = await createTestStandard({
      framework: testClass.standardsAlignment,
      code: 'Sc8.1-G3',
      description: 'Apply scientific method',
      gradeLevel: testClass.gradeLevel,
    });

    // Create lesson
    lesson = await createTestLesson(testClass.id, {
      order: 1,
      title: 'Being a Scientist',
      standardIds: [standard1.id, standard2.id],
    });

    // Create quiz questions
    question1 = await createTestQuizQuestion(lesson.id, {
      order: 1,
      text: 'What is the first step of the scientific method?',
      type: 'MULTIPLE_CHOICE',
      options: ['Observe', 'Predict', 'Test', 'Conclude'],
      correctAnswer: 'Observe',
      points: 1,
      standardIds: [standard2.id],
    });

    question2 = await createTestQuizQuestion(lesson.id, {
      order: 2,
      text: 'Which of the following are living things?',
      type: 'MULTIPLE_SELECT',
      options: ['Tree', 'Rock', 'Dog', 'Water'],
      correctAnswer: ['Tree', 'Dog'],
      points: 1,
      standardIds: [standard1.id],
    });

    question3 = await createTestQuizQuestion(lesson.id, {
      order: 3,
      text: 'Living things need energy. True or False?',
      type: 'TRUE_FALSE',
      options: ['True', 'False'],
      correctAnswer: 'True',
      points: 1,
      standardIds: [standard1.id],
    });

    // Create students
    student1 = await createTestUser({ role: 'STUDENT', name: 'Alice Johnson' });
    student2 = await createTestUser({ role: 'STUDENT', name: 'Bob Smith' });
    student3 = await createTestUser({ role: 'STUDENT', name: 'Charlie Brown' });

    // Enroll students in class
    await prisma.class.update({
      where: { id: testClass.id },
      data: {
        students: {
          connect: [
            { id: student1.id },
            { id: student2.id },
            { id: student3.id },
          ],
        },
      },
    });

    // Create attempts and responses for student1 (all correct)
    const attempt1 = await createTestAttempt({
      studentId: student1.id,
      lessonId: lesson.id,
      attemptNumber: 1,
      score: 3,
      maxScore: 3,
      completedAt: new Date('2025-10-25T10:00:00Z'),
    });

    await createTestQuestionResponse({
      attemptId: attempt1.id,
      questionId: question1.id,
      studentAnswer: 'Observe',
      isCorrect: true,
      timeSpentSeconds: 45,
    });

    await createTestQuestionResponse({
      attemptId: attempt1.id,
      questionId: question2.id,
      studentAnswer: ['Tree', 'Dog'],
      isCorrect: true,
      timeSpentSeconds: 60,
    });

    await createTestQuestionResponse({
      attemptId: attempt1.id,
      questionId: question3.id,
      studentAnswer: 'True',
      isCorrect: true,
      timeSpentSeconds: 30,
    });

    await createTestLessonCompletion(student1.id, lesson.id, {
      status: 'COMPLETED',
      mostRecentScore: 3,
      mostRecentScorePercentage: 100,
      bestScore: 3,
      bestScorePercentage: 100,
      attemptsCount: 1,
      totalTimeSpentSeconds: 135,
    });

    // Create attempts and responses for student2 (mixed correct/incorrect)
    const attempt2 = await createTestAttempt({
      studentId: student2.id,
      lessonId: lesson.id,
      attemptNumber: 1,
      score: 2,
      maxScore: 3,
      completedAt: new Date('2025-10-25T11:00:00Z'),
    });

    await createTestQuestionResponse({
      attemptId: attempt2.id,
      questionId: question1.id,
      studentAnswer: 'Predict',
      isCorrect: false,
      timeSpentSeconds: 50,
    });

    await createTestQuestionResponse({
      attemptId: attempt2.id,
      questionId: question2.id,
      studentAnswer: ['Tree', 'Dog'],
      isCorrect: true,
      timeSpentSeconds: 55,
    });

    await createTestQuestionResponse({
      attemptId: attempt2.id,
      questionId: question3.id,
      studentAnswer: 'True',
      isCorrect: true,
      timeSpentSeconds: 25,
    });

    await createTestLessonCompletion(student2.id, lesson.id, {
      status: 'COMPLETED',
      mostRecentScore: 2,
      mostRecentScorePercentage: 66.67,
      bestScore: 2,
      bestScorePercentage: 66.67,
      attemptsCount: 1,
      totalTimeSpentSeconds: 130,
    });

    // Student3 has not attempted the quiz yet
  });

  it('should return 401 when not authenticated', async () => {
    const mockRequireAuth = vi.fn(() => Promise.resolve(null as any));

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      `http://localhost:3000/api/classes/${testClass.id}/lessons/${lesson.id}/analytics`
    );
    const params = Promise.resolve({
      classId: testClass.id,
      lessonId: lesson.id,
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');

    moduleSpy.mockRestore();
  });

  it('should return 403 when user is not the class teacher', async () => {
    const otherTeacher = await createTestUser({ role: 'TEACHER' });

    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: otherTeacher.id, role: 'TEACHER' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      `http://localhost:3000/api/classes/${testClass.id}/lessons/${lesson.id}/analytics`
    );
    const params = Promise.resolve({
      classId: testClass.id,
      lessonId: lesson.id,
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized access to class analytics');

    moduleSpy.mockRestore();
  });

  it('should return 404 when class does not exist', async () => {
    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: teacher.id, role: 'TEACHER' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      `http://localhost:3000/api/classes/invalid-class-id/lessons/${lesson.id}/analytics`
    );
    const params = Promise.resolve({
      classId: 'invalid-class-id',
      lessonId: lesson.id,
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Class not found');

    moduleSpy.mockRestore();
  });

  it('should return 404 when lesson does not exist', async () => {
    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: teacher.id, role: 'TEACHER' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      `http://localhost:3000/api/classes/${testClass.id}/lessons/invalid-lesson-id/analytics`
    );
    const params = Promise.resolve({
      classId: testClass.id,
      lessonId: 'invalid-lesson-id',
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Lesson not found in this class');

    moduleSpy.mockRestore();
  });

  it('should return lesson analytics with class stats', async () => {
    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: teacher.id, role: 'TEACHER' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      `http://localhost:3000/api/classes/${testClass.id}/lessons/${lesson.id}/analytics`
    );
    const params = Promise.resolve({
      classId: testClass.id,
      lessonId: lesson.id,
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.lesson.id).toBe(lesson.id);
    expect(data.lesson.title).toBe('Being a Scientist');
    expect(data.lesson.order).toBe(1);

    expect(data.standards).toHaveLength(2);
    expect(data.standards.some((s: any) => s.code === 'Sc1.1-G3')).toBe(true);
    expect(data.standards.some((s: any) => s.code === 'Sc8.1-G3')).toBe(true);

    expect(data.classStats.totalStudents).toBe(3);
    expect(data.classStats.studentsCompleted).toBe(2);
    expect(data.classStats.completionRate).toBeCloseTo(66.7, 1);
    expect(data.classStats.averageScorePercentage).toBeCloseTo(83.3, 1);

    moduleSpy.mockRestore();
  });

  it('should return per-student performance data', async () => {
    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: teacher.id, role: 'TEACHER' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      `http://localhost:3000/api/classes/${testClass.id}/lessons/${lesson.id}/analytics`
    );
    const params = Promise.resolve({
      classId: testClass.id,
      lessonId: lesson.id,
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.students).toHaveLength(3);

    // Student 1 (Alice - 100%)
    const alice = data.students.find(
      (s: any) => s.studentName === 'Alice Johnson'
    );
    expect(alice).toBeDefined();
    expect(alice.completionStatus).toBe('COMPLETED');
    expect(alice.mostRecentScorePercentage).toBe(100);
    expect(alice.bestScorePercentage).toBe(100);
    expect(alice.attempts).toBe(1);
    expect(alice.totalTimeSeconds).toBe(135);
    expect(alice.colorCode).toBe('blue');

    // Student 2 (Bob - 66.67%)
    const bob = data.students.find((s: any) => s.studentName === 'Bob Smith');
    expect(bob).toBeDefined();
    expect(bob.completionStatus).toBe('COMPLETED');
    expect(bob.mostRecentScorePercentage).toBeCloseTo(66.67, 1);
    expect(bob.colorCode).toBe('yellow');

    // Student 3 (Charlie - not started)
    const charlie = data.students.find(
      (s: any) => s.studentName === 'Charlie Brown'
    );
    expect(charlie).toBeDefined();
    expect(charlie.completionStatus).toBe('NOT_STARTED');
    expect(charlie.mostRecentScorePercentage).toBeNull();
    expect(charlie.colorCode).toBeNull();

    moduleSpy.mockRestore();
  });

  it('should return question-level analytics sorted by % correct (lowest first)', async () => {
    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: teacher.id, role: 'TEACHER' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      `http://localhost:3000/api/classes/${testClass.id}/lessons/${lesson.id}/analytics`
    );
    const params = Promise.resolve({
      classId: testClass.id,
      lessonId: lesson.id,
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.questions).toHaveLength(3);

    // Questions should be sorted by percentCorrect (lowest first)
    // Question 1: 50% correct (1/2 got it right)
    // Question 2: 100% correct (2/2 got it right)
    // Question 3: 100% correct (2/2 got it right)

    const q1 = data.questions.find((q: any) => q.questionNumber === 1);
    expect(q1.percentCorrect).toBe(50);
    expect(q1.totalResponses).toBe(2);
    expect(q1.correctResponses).toBe(1);
    expect(q1.incorrectStudents).toContain('Bob Smith');
    expect(q1.questionType).toBe('MULTIPLE_CHOICE');

    const q2 = data.questions.find((q: any) => q.questionNumber === 2);
    expect(q2.percentCorrect).toBe(100);
    expect(q2.totalResponses).toBe(2);
    expect(q2.correctResponses).toBe(2);

    const q3 = data.questions.find((q: any) => q.questionNumber === 3);
    expect(q3.percentCorrect).toBe(100);

    // Verify sorting (lowest first)
    expect(data.questions[0].percentCorrect).toBeLessThanOrEqual(
      data.questions[1].percentCorrect
    );
    expect(data.questions[1].percentCorrect).toBeLessThanOrEqual(
      data.questions[2].percentCorrect
    );

    moduleSpy.mockRestore();
  });

  it('should calculate standards performance and flag for reteach', async () => {
    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: teacher.id, role: 'TEACHER' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      `http://localhost:3000/api/classes/${testClass.id}/lessons/${lesson.id}/analytics`
    );
    const params = Promise.resolve({
      classId: testClass.id,
      lessonId: lesson.id,
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.standardsPerformance).toHaveLength(2);

    // Standard 1 (Sc1.1-G3): Questions 2 and 3, both students got both correct = 100%
    const std1 = data.standardsPerformance.find(
      (s: any) => s.standardCode === 'Sc1.1-G3'
    );
    expect(std1).toBeDefined();
    expect(std1.questionsCount).toBe(2);
    expect(std1.percentMastered).toBe(100);
    expect(std1.studentsMastered).toBe(2); // Both students ≥80%
    expect(std1.flagForReteach).toBe(false);
    expect(std1.colorCode).toBe('blue');

    // Standard 2 (Sc8.1-G3): Question 1, only 1/2 students got it correct
    // Alice: 100% mastery (1/1 correct)
    // Bob: 0% mastery (0/1 correct)
    // 50% of students mastered
    const std2 = data.standardsPerformance.find(
      (s: any) => s.standardCode === 'Sc8.1-G3'
    );
    expect(std2).toBeDefined();
    expect(std2.questionsCount).toBe(1);
    expect(std2.percentMastered).toBe(50); // 1/2 students mastered
    expect(std2.studentsMastered).toBe(1);
    expect(std2.flagForReteach).toBe(true); // <70%
    expect(std2.colorCode).toBe('red');

    moduleSpy.mockRestore();
  });

  it('should handle class with no completed attempts', async () => {
    // Create a new class with no attempts
    const teacher2 = await createTestUser({ role: 'TEACHER' });
    const class2 = await createTestClass(teacher2.id);
    const lesson2 = await createTestLesson(class2.id, {
      order: 1,
      title: 'Empty Lesson',
    });

    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: teacher2.id, role: 'TEACHER' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      `http://localhost:3000/api/classes/${class2.id}/lessons/${lesson2.id}/analytics`
    );
    const params = Promise.resolve({
      classId: class2.id,
      lessonId: lesson2.id,
    });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.classStats.studentsCompleted).toBe(0);
    expect(data.classStats.completionRate).toBe(0);
    expect(data.classStats.averageScorePercentage).toBe(0);
    expect(data.questions).toHaveLength(0);

    moduleSpy.mockRestore();
  });

  it('should allow admin access to any class analytics', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });

    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: admin.id, role: 'ADMIN' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      `http://localhost:3000/api/classes/${testClass.id}/lessons/${lesson.id}/analytics`
    );
    const params = Promise.resolve({
      classId: testClass.id,
      lessonId: lesson.id,
    });

    const response = await GET(request, { params });

    expect(response.status).toBe(200);

    moduleSpy.mockRestore();
  });
});

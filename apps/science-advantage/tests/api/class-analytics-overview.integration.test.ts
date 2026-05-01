import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/classes/[classId]/analytics/overview/route';
import prisma from '@/lib/prisma';
import {
  createTestUser,
  createTestClass,
  createTestLesson,
  createTestLessonCompletion,
} from '../lib/test-utils';

describe('/api/classes/[classId]/analytics/overview', () => {
  let teacher: any;
  let testClass: any;
  let lesson1: any;
  let lesson2: any;
  let student1: any;
  let student2: any;

  beforeEach(async () => {
    // Create test data
    teacher = await createTestUser({ role: 'TEACHER' });
    testClass = await createTestClass(teacher.id);

    lesson1 = await createTestLesson(testClass.id, {
      order: 1,
      title: 'Lesson 1',
    });
    lesson2 = await createTestLesson(testClass.id, {
      order: 2,
      title: 'Lesson 2',
    });

    student1 = await createTestUser({ role: 'STUDENT' });
    student2 = await createTestUser({ role: 'STUDENT' });

    // Enroll students in class
    await prisma.class.update({
      where: { id: testClass.id },
      data: {
        students: {
          connect: [{ id: student1.id }, { id: student2.id }],
        },
      },
    });

    // Create some lesson completions
    await createTestLessonCompletion(student1.id, lesson1.id, {
      status: 'COMPLETED',
      mostRecentScorePercentage: 85,
      attemptsCount: 2,
      totalTimeSpentSeconds: 600,
    });

    await createTestLessonCompletion(student2.id, lesson1.id, {
      status: 'COMPLETED',
      mostRecentScorePercentage: 92,
      attemptsCount: 1,
      totalTimeSpentSeconds: 480,
    });

    await createTestLessonCompletion(student1.id, lesson2.id, {
      status: 'COMPLETED',
      mostRecentScorePercentage: 78,
      attemptsCount: 3,
      totalTimeSpentSeconds: 720,
    });
  });

  it('should return analytics overview for class teacher', async () => {
    // Mock the auth session
    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: teacher.id, role: 'TEACHER' },
      })
    );

    // Override the requireAuth module temporarily
    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      'http://localhost:3000/api/classes/' +
        testClass.id +
        '/analytics/overview'
    );
    const params = Promise.resolve({ classId: testClass.id });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.classId).toBe(testClass.id);
    expect(data.className).toBe(testClass.name);
    expect(data.totalStudents).toBe(2);
    expect(data.lessons).toHaveLength(2);

    // Check lesson 1 analytics
    const lesson1Data = data.lessons.find(
      (l: any) => l.lessonId === lesson1.id
    );
    expect(lesson1Data.completionRate).toBe(100); // 2/2 students completed
    expect(lesson1Data.averageScore).toBe(88.5); // (85 + 92) / 2
    expect(lesson1Data.averageAttempts).toBe(1.5); // (2 + 1) / 2
    expect(lesson1Data.colorCode).toBe('green'); // 88.5% >= 80%

    // Check lesson 2 analytics
    const lesson2Data = data.lessons.find(
      (l: any) => l.lessonId === lesson2.id
    );
    expect(lesson2Data.completionRate).toBe(50); // 1/2 students completed
    expect(lesson2Data.averageScore).toBe(78); // Only one student completed
    expect(lesson2Data.colorCode).toBe('yellow'); // 78% < 80%

    moduleSpy.mockRestore();
  });

  it('should return 403 for non-teacher user', async () => {
    const otherUser = await createTestUser({ role: 'TEACHER' });

    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: otherUser.id, role: 'TEACHER' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      'http://localhost:3000/api/classes/' +
        testClass.id +
        '/analytics/overview'
    );
    const params = Promise.resolve({ classId: testClass.id });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized access to class analytics');

    moduleSpy.mockRestore();
  });

  it('should return 404 for non-existent class', async () => {
    const mockRequireAuth = vi.fn(() =>
      Promise.resolve({
        user: { id: teacher.id, role: 'TEACHER' },
      })
    );

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireAuth');
    moduleSpy.mockImplementation(mockRequireAuth);

    const request = new Request(
      'http://localhost:3000/api/classes/non-existent/analytics/overview'
    );
    const params = Promise.resolve({ classId: 'non-existent' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Class not found');

    moduleSpy.mockRestore();
  });
});

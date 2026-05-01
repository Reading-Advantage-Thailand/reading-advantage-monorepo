import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/teachers/dashboard/route';
import prisma from '@/lib/prisma';
import {
  createTestUser,
  createTestClass,
  createTestLesson,
  createTestLessonCompletion,
  createTestStandard,
} from '../lib/test-utils';

describe('GET /api/teachers/dashboard', () => {
  let teacher: any;
  let student1: any;
  let student2: any;
  let student3: any;
  let testClass: any;
  let lesson1: any;
  let lesson2: any;
  let standard1: any;

  beforeEach(async () => {
    teacher = await createTestUser({ role: 'TEACHER', name: 'Ms. Teacher' });
    testClass = await createTestClass(teacher.id, { name: 'Science 101' });

    standard1 = await createTestStandard({
      framework: testClass.standardsAlignment,
      code: 'Sc1.1-G3',
      description: 'Observe and describe',
      gradeLevel: testClass.gradeLevel,
    });

    lesson1 = await createTestLesson(testClass.id, {
      order: 1,
      title: 'Being a Scientist',
      standardIds: [standard1.id],
    });

    lesson2 = await createTestLesson(testClass.id, {
      order: 2,
      title: 'States of Matter',
      standardIds: [standard1.id],
    });

    student1 = await createTestUser({ role: 'STUDENT', name: 'Alice' });
    student2 = await createTestUser({ role: 'STUDENT', name: 'Bob' });
    student3 = await createTestUser({ role: 'STUDENT', name: 'Charlie' });

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
  });

  it('returns 401 when not authenticated', async () => {
    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireRole');
    moduleSpy.mockImplementation(() => {
      throw new Error('Unauthorized');
    });

    const request = new NextRequest('http://localhost:3000/api/teachers/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');

    moduleSpy.mockRestore();
  });

  it('returns class progress with completion rate, average score, and active students', async () => {
    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireRole');
    moduleSpy.mockImplementation(() =>
      Promise.resolve({
        id: 'session-1',
        userId: teacher.id,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: teacher.id, role: 'TEACHER' as const },
      } as any)
    );

    await createTestLessonCompletion(student1.id, lesson1.id, {
      status: 'COMPLETED',
      mostRecentScore: 90,
      mostRecentScorePercentage: 90,
      bestScore: 90,
      bestScorePercentage: 90,
      attemptsCount: 1,
      totalTimeSpentSeconds: 120,
    });

    await createTestLessonCompletion(student2.id, lesson1.id, {
      status: 'COMPLETED',
      mostRecentScore: 80,
      mostRecentScorePercentage: 80,
      bestScore: 80,
      bestScorePercentage: 80,
      attemptsCount: 1,
      totalTimeSpentSeconds: 150,
    });

    const request = new NextRequest('http://localhost:3000/api/teachers/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.classProgress).toBeDefined();
    expect(data.classProgress.length).toBe(1);

    const classData = data.classProgress[0];
    expect(classData.classId).toBe(testClass.id);
    expect(classData.className).toBe('Science 101');
    expect(classData.activeStudents).toBe(3);
    expect(classData.completionRate).toBeCloseTo(66.7, 1);
    expect(classData.averageScore).toBeCloseTo(85, 0);

    moduleSpy.mockRestore();
  });

  it('counts students needing attention when mastery is below 0.6', async () => {
    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireRole');
    moduleSpy.mockImplementation(() =>
      Promise.resolve({
        id: 'session-2',
        userId: teacher.id,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: teacher.id, role: 'TEACHER' as const },
      } as any)
    );

    await prisma.standardMastery.createMany({
      data: [
        {
          studentId: student1.id,
          standardId: standard1.id,
          masteryLevel: 0.4,
          lastAssessedAt: new Date(),
        },
        {
          studentId: student2.id,
          standardId: standard1.id,
          masteryLevel: 0.55,
          lastAssessedAt: new Date(),
        },
        {
          studentId: student3.id,
          standardId: standard1.id,
          masteryLevel: 0.8,
          lastAssessedAt: new Date(),
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/teachers/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.studentsNeedingAttention).toBe(2);

    moduleSpy.mockRestore();
  });

  it('returns recent completions with student name, lesson title, score, and timestamp', async () => {
    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireRole');
    moduleSpy.mockImplementation(() =>
      Promise.resolve({
        id: 'session-3',
        userId: teacher.id,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: teacher.id, role: 'TEACHER' as const },
      } as any)
    );

    await createTestLessonCompletion(student1.id, lesson1.id, {
      status: 'COMPLETED',
      mostRecentScore: 100,
      mostRecentScorePercentage: 100,
      bestScore: 100,
      bestScorePercentage: 100,
      attemptsCount: 1,
      totalTimeSpentSeconds: 100,
    });

    await createTestLessonCompletion(student2.id, lesson2.id, {
      status: 'COMPLETED',
      mostRecentScore: 75,
      mostRecentScorePercentage: 75,
      bestScore: 75,
      bestScorePercentage: 75,
      attemptsCount: 2,
      totalTimeSpentSeconds: 200,
    });

    const request = new NextRequest('http://localhost:3000/api/teachers/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recentCompletions).toBeDefined();
    expect(data.recentCompletions.length).toBe(2);

    const first = data.recentCompletions[0];
    expect(first.studentName).toBeDefined();
    expect(first.lessonTitle).toBeDefined();
    expect(first.score).toBeDefined();
    expect(first.completedAt).toBeDefined();

    moduleSpy.mockRestore();
  });

  it('limits recent completions to 5 most recent', async () => {
    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireRole');
    moduleSpy.mockImplementation(() =>
      Promise.resolve({
        id: 'session-4',
        userId: teacher.id,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: teacher.id, role: 'TEACHER' as const },
      } as any)
    );

    for (let i = 0; i < 7; i++) {
      const student = await createTestUser({ role: 'STUDENT', name: `Student ${i}` });
      await prisma.class.update({
        where: { id: testClass.id },
        data: { students: { connect: { id: student.id } } },
      });

      await createTestLessonCompletion(student.id, lesson1.id, {
        status: 'COMPLETED',
        mostRecentScore: 80 + i,
        mostRecentScorePercentage: 80 + i,
        bestScore: 80 + i,
        bestScorePercentage: 80 + i,
        attemptsCount: 1,
        totalTimeSpentSeconds: 100 + i * 10,
      });
    }

    const request = new NextRequest('http://localhost:3000/api/teachers/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.recentCompletions.length).toBeLessThanOrEqual(5);

    moduleSpy.mockRestore();
  });

  it('returns zero attention count when all mastery is above 0.6', async () => {
    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireRole');
    moduleSpy.mockImplementation(() =>
      Promise.resolve({
        id: 'session-5',
        userId: teacher.id,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: teacher.id, role: 'TEACHER' as const },
      } as any)
    );

    await prisma.standardMastery.createMany({
      data: [
        {
          studentId: student1.id,
          standardId: standard1.id,
          masteryLevel: 0.85,
          lastAssessedAt: new Date(),
        },
        {
          studentId: student2.id,
          standardId: standard1.id,
          masteryLevel: 0.92,
          lastAssessedAt: new Date(),
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/teachers/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.studentsNeedingAttention).toBe(0);

    moduleSpy.mockRestore();
  });

  it('returns empty progress when teacher has no classes', async () => {
    const lonelyTeacher = await createTestUser({ role: 'TEACHER', name: 'Lonely' });

    const originalModule = await import('@/lib/auth/server');
    const moduleSpy = vi.spyOn(originalModule, 'requireRole');
    moduleSpy.mockImplementation(() =>
      Promise.resolve({
        id: 'session-6',
        userId: lonelyTeacher.id,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: lonelyTeacher.id, role: 'TEACHER' as const },
      } as any)
    );

    const request = new NextRequest('http://localhost:3000/api/teachers/dashboard');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.classProgress).toEqual([]);
    expect(data.studentsNeedingAttention).toBe(0);
    expect(data.recentCompletions).toEqual([]);

    moduleSpy.mockRestore();
  });
});

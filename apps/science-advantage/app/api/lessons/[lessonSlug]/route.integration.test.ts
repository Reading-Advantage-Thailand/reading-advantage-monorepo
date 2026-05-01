import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import type { user as UserModel, Class, Lesson, Standard } from '@prisma/client';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

describe('GET /api/lessons/[lessonSlug] - Integration Tests', () => {
  let testTeacher: UserModel;
  let testStudent: UserModel;
  let otherStudent: UserModel;
  let testClass: Class;
  let testLesson: Lesson;
  let testStandard: Standard;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    await prisma.$executeRaw`DELETE FROM "_CurriculumUnitToLesson"`;
    await prisma.$executeRaw`DELETE FROM "_LessonToStandard"`;
    await prisma.curriculumUnit.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.standard.deleteMany();
    await prisma.class.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    testTeacher = await prisma.user.create({
      data: {
        id: 'test-teacher-lesson-endpoint',
        name: 'Test Teacher',
        username: 'testteacher-lesson-endpoint',
        displayUsername: 'TeacherLesson',
        email: 'teacher-lesson@example.com',
        role: 'TEACHER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    testStudent = await prisma.user.create({
      data: {
        id: 'test-student-lesson-endpoint',
        name: 'Test Student',
        username: 'teststudent-lesson-endpoint',
        displayUsername: 'StudentLesson',
        email: 'student-lesson@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    otherStudent = await prisma.user.create({
      data: {
        id: 'other-student-lesson-endpoint',
        name: 'Other Student',
        username: 'otherstudent-lesson-endpoint',
        displayUsername: 'OtherLesson',
        email: 'other-lesson@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    testStandard = await prisma.standard.create({
      data: {
        id: 'standard-lesson-endpoint',
        framework: 'THAI',
        code: 'Sc1.1-G3',
        description: 'Identify characteristics of living things',
        gradeLevel: 3,
      },
    });

    testLesson = await prisma.lesson.create({
      data: {
        id: 'lesson-endpoint',
        slug: 'plants-and-animals',
        title: 'Plants and Animals',
        description: 'Compare characteristics of plants and animals',
        content: 'Plants make their own food, animals consume food.',
        gradeLevel: 3,
        order: 1,
        standards: {
          connect: [{ id: testStandard.id }],
        },
      },
      include: {
        standards: true,
      },
    });

    testClass = await prisma.class.create({
      data: {
        id: 'class-lesson-endpoint',
        name: 'Grade 3 Science',
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: 'LESSON',
        teacherId: testTeacher.id,
        students: {
          connect: { id: testStudent.id },
        },
      },
    });

    await prisma.curriculumUnit.create({
      data: {
        id: 'unit-lesson-endpoint',
        slug: 'living-things',
        title: 'Living Things',
        description: 'Introduction to living organisms',
        framework: 'THAI',
        gradeLevel: 3,
        order: 1,
        classId: testClass.id,
        lessons: {
          connect: [{ id: testLesson.id }],
        },
      },
    });
  });

  afterEach(async () => {
    await prisma.$executeRaw`DELETE FROM "_CurriculumUnitToLesson"`;
    await prisma.$executeRaw`DELETE FROM "_LessonToStandard"`;
    await prisma.curriculumUnit.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.standard.deleteMany();
    await prisma.class.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  it('returns 401 when not authenticated', async () => {
    mockCookies.get.mockReturnValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/lessons/lesson-endpoint');
    const response = await GET(request, {
      params: Promise.resolve({ lessonSlug: testLesson.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('returns 404 when lesson does not exist', async () => {
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const request = new NextRequest('http://localhost:3000/api/lessons/missing-lesson');
    const response = await GET(request, {
      params: Promise.resolve({ lessonSlug: 'missing-lesson' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Lesson not found');
  });

  it('returns 403 when user is not connected to a class with the lesson', async () => {
    const session = await createSession(otherStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const request = new NextRequest('http://localhost:3000/api/lessons/lesson-endpoint');
    const response = await GET(request, {
      params: Promise.resolve({ lessonSlug: testLesson.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Not enrolled in a class with this lesson');
  });

  it('allows an enrolled student to fetch lesson content', async () => {
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const request = new NextRequest('http://localhost:3000/api/lessons/lesson-endpoint');
    const response = await GET(request, {
      params: Promise.resolve({ lessonSlug: testLesson.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.lesson.id).toBe(testLesson.id);
    expect(data.lesson.slug).toBe(testLesson.id);
    expect(data.lesson.title).toBe('Plants and Animals');
    expect(Array.isArray(data.lesson.objectives)).toBe(true);
    expect(data.lesson.objectives).toContain('Compare characteristics of plants and animals');
    expect(Array.isArray(data.standards)).toBe(true);
    expect(data.standards[0]).toMatchObject({
      id: testStandard.id,
      code: testStandard.code,
      description: testStandard.description,
      framework: testStandard.framework,
      gradeLevel: testStandard.gradeLevel,
    });
  });

  it('allows the class teacher to fetch lesson content', async () => {
    const session = await createSession(testTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const request = new NextRequest('http://localhost:3000/api/lessons/lesson-endpoint');
    const response = await GET(request, {
      params: Promise.resolve({ lessonSlug: testLesson.id }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.lesson.id).toBe(testLesson.id);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import type { user as UserModel, Class, Lesson } from '@prisma/client';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

// Mock next/headers for cookies
const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

describe('GET /api/classes/[classId]/curriculum - Integration Tests', () => {
  let testTeacher: UserModel;
  let testStudent: UserModel;
  let otherStudent: UserModel;
  let testClass: Class;
  let testLesson1: Lesson;
  let testLesson2: Lesson;
  let testLesson3: Lesson;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    // Clean up in correct order
    await prisma.questionResponse.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.lessonCompletion.deleteMany();
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
        id: 'test-teacher-curriculum',
        name: 'Test Teacher',
        username: 'testteacher-curriculum',
        displayUsername: 'TestTeacher',
        email: 'teacher-curriculum@example.com',
        role: 'TEACHER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    testStudent = await prisma.user.create({
      data: {
        id: 'test-student-curriculum',
        name: 'Test Student',
        username: 'teststudent-curriculum',
        displayUsername: 'TestStudent',
        email: 'student-curriculum@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    otherStudent = await prisma.user.create({
      data: {
        id: 'other-student-curriculum',
        name: 'Other Student',
        username: 'otherstudent-curriculum',
        displayUsername: 'OtherStudent',
        email: 'other-curriculum@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test class
    testClass = await prisma.class.create({
      data: {
        id: 'test-class-curriculum',
        name: 'Grade 3 Science',
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: 'CUR123',
        teacherId: testTeacher.id,
        students: {
          connect: { id: testStudent.id },
        },
      },
    });

    // Create test lessons
    testLesson1 = await prisma.lesson.create({
      data: {
        id: 'lesson-1',
        slug: 'intro-to-science',
        title: 'Introduction to Science',
        description: 'Learn what science is',
        content: 'Science is the study of the natural world',
        gradeLevel: 3,
        order: 1,
      },
    });

    testLesson2 = await prisma.lesson.create({
      data: {
        id: 'lesson-2',
        slug: 'living-things',
        title: 'Living Things',
        description: 'Learn about living organisms',
        content: 'Living things grow, move, and reproduce',
        gradeLevel: 3,
        order: 2,
      },
    });

    testLesson3 = await prisma.lesson.create({
      data: {
        id: 'lesson-3',
        slug: 'plants-and-animals',
        title: 'Plants and Animals',
        description: 'Compare plants and animals',
        content: 'Plants make their own food, animals do not',
        gradeLevel: 3,
        order: 3,
      },
    });

    // Create curriculum units
    await prisma.curriculumUnit.create({
      data: {
        id: 'unit-1',
        slug: 'unit-1-intro-to-science',
        title: 'Unit 1: Introduction to Science',
        description: 'Basic science concepts',
        framework: 'THAI',
        gradeLevel: 3,
        order: 1,
        classId: testClass.id,
        lessons: {
          connect: [{ id: testLesson1.id }, { id: testLesson2.id }],
        },
      },
    });

    await prisma.curriculumUnit.create({
      data: {
        id: 'unit-2',
        slug: 'unit-2-living-organisms',
        title: 'Unit 2: Living Organisms',
        description: 'Study of life',
        framework: 'THAI',
        gradeLevel: 3,
        order: 2,
        classId: testClass.id,
        lessons: {
          connect: [{ id: testLesson3.id }],
        },
      },
    });
  });

  afterEach(async () => {
    await prisma.questionResponse.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.lessonCompletion.deleteMany();
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

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Authorization - Student Access', () => {
    it('should allow enrolled student to access curriculum', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.class).toBeDefined();
      expect(data.units).toBeDefined();
    });

    it('should deny non-enrolled student access', async () => {
      const session = await createSession(otherStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not enrolled in this class');
    });
  });

  describe('Authorization - Teacher Access', () => {
    it('should allow class teacher to access curriculum', async () => {
      const session = await createSession(testTeacher.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.class).toBeDefined();
      expect(data.units).toBeDefined();
    });

    it('should deny other teacher access', async () => {
      const otherTeacher = await prisma.user.create({
        data: {
          id: 'other-teacher',
          name: 'Other Teacher',
          username: 'otherteacher',
          displayUsername: 'OtherTeacher',
          email: 'other-teacher@example.com',
          role: 'TEACHER',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const session = await createSession(otherTeacher.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not enrolled in this class');
    });
  });

  describe('Class Not Found', () => {
    it('should return 404 for non-existent class', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/non-existent-class/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: 'non-existent-class' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Class not found');
    });
  });

  describe('Response Format', () => {
    it('should return correct class information', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.class).toEqual({
        id: testClass.id,
        name: 'Grade 3 Science',
        gradeLevel: 3,
        standardsAlignment: 'THAI',
      });
    });

    it('should return units in correct order', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.units).toHaveLength(2);
      expect(data.units[0].order).toBe(1);
      expect(data.units[1].order).toBe(2);
      expect(data.units[0].title).toBe('Unit 1: Introduction to Science');
      expect(data.units[1].title).toBe('Unit 2: Living Organisms');
    });

    it('should return lessons in correct order within units', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      const unit1 = data.units[0];
      expect(unit1.lessons).toHaveLength(2);
      expect(unit1.lessons[0].order).toBe(1);
      expect(unit1.lessons[1].order).toBe(2);
      expect(unit1.lessons[0].title).toBe('Introduction to Science');
      expect(unit1.lessons[1].title).toBe('Living Things');

      const unit2 = data.units[1];
      expect(unit2.lessons).toHaveLength(1);
      expect(unit2.lessons[0].title).toBe('Plants and Animals');
    });

    it('should include all required lesson fields', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      const lesson = data.units[0].lessons[0];
      expect(lesson).toHaveProperty('id');
      expect(lesson).toHaveProperty('slug');
      expect(lesson).toHaveProperty('title');
      expect(lesson).toHaveProperty('titleThai');
      expect(lesson).toHaveProperty('order');
      expect(lesson).toHaveProperty('completed');
      expect(lesson).toHaveProperty('started');
      expect(lesson).toHaveProperty('progress');
      expect(lesson.progress).toMatchObject({
        status: 'NOT_STARTED',
        attemptsCount: 0,
        mostRecentScore: null,
        mostRecentScorePercentage: null,
        bestScore: null,
        bestScorePercentage: null,
      });
    });

    it('should set placeholder progress values', async () => {
      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      const lesson = data.units[0].lessons[0];
      expect(lesson.completed).toBe(false);
      expect(lesson.started).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle class with no curriculum units', async () => {
      const emptyClass = await prisma.class.create({
        data: {
          id: 'empty-class',
          name: 'Empty Class',
          gradeLevel: 3,
          standardsAlignment: 'THAI',
          joinCode: 'EMPTY1',
          teacherId: testTeacher.id,
          students: {
            connect: { id: testStudent.id },
          },
        },
      });

      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/empty-class/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: emptyClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.units).toEqual([]);
    });

    it('should handle unit with no lessons', async () => {
      const emptyUnit = await prisma.curriculumUnit.create({
        data: {
          id: 'empty-unit',
          slug: 'empty-unit-no-lessons',
          title: 'Empty Unit',
          framework: 'THAI',
          gradeLevel: 3,
          order: 3,
          classId: testClass.id,
        },
      });

      const session = await createSession(testStudent.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const request = new NextRequest('http://localhost:3000/api/classes/test-class-curriculum/curriculum');
      const response = await GET(request, { params: Promise.resolve({ classId: testClass.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      const emptyUnitData = data.units.find((u: { id: string }) => u.id === emptyUnit.id);
      expect(emptyUnitData.lessons).toEqual([]);
    });
  });
});

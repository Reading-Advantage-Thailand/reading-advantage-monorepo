import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  generateLessonSlug,
  generateCurriculumUnitSlug,
  isValidLessonSlug,
  isValidCurriculumUnitSlug,
} from '../lesson-slug.schema';

const prisma = new PrismaClient();

describe('Curriculum Unit and Lesson Relationships (Integration)', () => {
  let testLesson: { id: string; slug: string };
  let testUnit: { id: string; slug: string };
  let testClassId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRaw`DELETE FROM "_CurriculumUnitToLesson"`;
    await prisma.$executeRaw`DELETE FROM "_LessonToStandard"`;
    await prisma.curriculumUnit.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.standard.deleteMany();
    await prisma.class.deleteMany();

    const standard = await prisma.standard.create({
      data: {
        id: 'test-standard-slug-validation-' + Math.random().toString(36).substring(7),
        framework: 'THAI',
        code: 'Sc1.1-G3',
        description: 'Test standard',
        gradeLevel: 3,
      },
    });

    const teacher = await prisma.user.create({
      data: {
        id: 'temp-teacher-slug-test-' + Math.random().toString(36).substring(7),
        name: 'Temp Teacher',
        username: 'tempteacher-' + Math.random().toString(36).substring(7),
        displayUsername: 'TempTeacherSlug',
        role: 'TEACHER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const classRecord = await prisma.class.create({
      data: {
        id: 'test-class-slug-validation-' + Math.random().toString(36).substring(7),
        name: 'Test Class',
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: 'TEST' + Math.random().toString(36).substring(7),
        teacherId: teacher.id,
      },
    });

    testClassId = classRecord.id;

    const lesson = await prisma.lesson.create({
      data: {
        id: 'test-lesson-slug-validation-' + Math.random().toString(36).substring(7),
        slug: 'test-lesson-' + Math.random().toString(36).substring(7),
        title: 'Test Lesson',
        description: 'A test lesson',
        content: 'Test content',
        gradeLevel: 3,
        order: 1,
        standards: {
          connect: { id: standard.id },
        },
      },
    });

    const unit = await prisma.curriculumUnit.create({
      data: {
        id: 'test-unit-slug-validation-' + Math.random().toString(36).substring(7),
        slug: 'test-unit-' + Math.random().toString(36).substring(7),
        title: 'Test Unit',
        description: 'A test unit',
        framework: 'THAI',
        gradeLevel: 3,
        order: 1,
        classId: classRecord.id,
        lessons: {
          connect: { id: lesson.id },
        },
      },
    });

    testLesson = { id: lesson.id, slug: 'not-yet-implemented' };
    testUnit = { id: unit.id, slug: 'not-yet-implemented' };
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

  it('should have distinct id and slug for lessons (FR-1, FR-2)', async () => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: testLesson.id },
      select: { id: true, title: true },
    });

    expect(lesson).toBeDefined();
    expect(lesson!.id).toBeDefined();
    expect(lesson!.title).toBeDefined();

    const slug = generateLessonSlug(lesson!.title);
    expect(slug).not.toBe(lesson!.id);
    expect(isValidLessonSlug(slug)).toBe(true);
  });

  it('should have distinct id and slug for curriculum units (FR-1)', async () => {
    const unit = await prisma.curriculumUnit.findUnique({
      where: { id: testUnit.id },
      select: { id: true, title: true },
    });

    expect(unit).toBeDefined();
    expect(unit!.id).toBeDefined();

    const slug = generateCurriculumUnitSlug(unit!.title);
    expect(slug).not.toBe(unit!.id);
    expect(isValidCurriculumUnitSlug(slug)).toBe(true);
  });

  it('should associate lessons with curriculum units through explicit mapping (FR-1)', async () => {
    const unit = await prisma.curriculumUnit.findUnique({
      where: { id: testUnit.id },
      include: {
        lessons: {
          select: { id: true, title: true },
        },
      },
    });

    expect(unit).toBeDefined();
    expect(unit!.lessons).toHaveLength(1);
    expect(unit!.lessons[0].id).toBe(testLesson.id);
  });

  it('should map lessons to standards with codes (FR-4)', async () => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: testLesson.id },
      include: {
        standards: {
          select: { code: true, framework: true },
        },
      },
    });

    expect(lesson).toBeDefined();
    expect(lesson!.standards).toHaveLength(1);
    expect(lesson!.standards[0].code).toBe('Sc1.1-G3');
    expect(lesson!.standards[0].framework).toBe('THAI');
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessons,
  scienceLessonStandards,
  scienceStandards,
  scienceUnitLessons,
  sessions,
  accounts,
  users,
} from '@reading-advantage/db/schema';
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

type UserRow = typeof users.$inferSelect;
type ClassRow = typeof scienceClasses.$inferSelect;
type LessonRow = typeof scienceLessons.$inferSelect;
type StandardRow = typeof scienceStandards.$inferSelect;

async function cleanupScienceFixtures(): Promise<void> {
  // Junction tables first (FKs ON DELETE CASCADE would cover this, but be explicit
  // so the parent deletes below have nothing pinned).
  await db.delete(scienceClassStudents);
  await db.delete(scienceLessonStandards);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceLessons);
  await db.delete(scienceStandards);
  await db.delete(scienceClasses);
  await db.delete(sessions);
  await db.delete(accounts);
  // Only delete users created by this suite (id prefix).
  await db.execute(
    sql`DELETE FROM users WHERE id LIKE 'pilot-lesson-route-%'`
  );
}

describe('GET /api/lessons/[lessonSlug] - Integration Tests', () => {
  let testTeacher: UserRow;
  let testStudent: UserRow;
  let otherStudent: UserRow;
  let testClass: ClassRow;
  let testLesson: LessonRow;
  let testStandard: StandardRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    await cleanupScienceFixtures();

    [testTeacher] = await db
      .insert(users)
      .values({
        id: 'pilot-lesson-route-teacher',
        name: 'Test Teacher',
        username: 'pilot-lesson-route-teacher',
        displayUsername: 'TeacherLesson',
        email: 'pilot-lesson-route-teacher@example.com',
        role: 'TEACHER',
      })
      .returning();

    [testStudent] = await db
      .insert(users)
      .values({
        id: 'pilot-lesson-route-student',
        name: 'Test Student',
        username: 'pilot-lesson-route-student',
        displayUsername: 'StudentLesson',
        email: 'pilot-lesson-route-student@example.com',
        role: 'STUDENT',
      })
      .returning();

    [otherStudent] = await db
      .insert(users)
      .values({
        id: 'pilot-lesson-route-other',
        name: 'Other Student',
        username: 'pilot-lesson-route-other',
        displayUsername: 'OtherLesson',
        email: 'pilot-lesson-route-other@example.com',
        role: 'STUDENT',
      })
      .returning();

    [testStandard] = await db
      .insert(scienceStandards)
      .values({
        framework: 'THAI',
        code: 'Sc1.1-G3',
        description: 'Identify characteristics of living things',
        gradeLevel: 3,
      })
      .returning();

    [testLesson] = await db
      .insert(scienceLessons)
      .values({
        slug: 'plants-and-animals',
        title: 'Plants and Animals',
        description: 'Compare characteristics of plants and animals',
        content: 'Plants make their own food, animals consume food.',
        gradeLevel: 3,
        order: 1,
      })
      .returning();

    await db.insert(scienceLessonStandards).values({
      lessonId: testLesson.id,
      standardId: testStandard.id,
    });

    [testClass] = await db
      .insert(scienceClasses)
      .values({
        name: 'Grade 3 Science',
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: 'LESSON',
        teacherId: testTeacher.id,
      })
      .returning();

    await db.insert(scienceClassStudents).values({
      classId: testClass.id,
      studentId: testStudent.id,
    });

    const [unit] = await db
      .insert(scienceCurriculumUnits)
      .values({
        slug: 'living-things',
        title: 'Living Things',
        description: 'Introduction to living organisms',
        framework: 'THAI',
        gradeLevel: 3,
        order: 1,
        classId: testClass.id,
      })
      .returning();

    await db.insert(scienceUnitLessons).values({
      unitId: unit.id,
      lessonId: testLesson.id,
    });
  });

  afterEach(async () => {
    await cleanupScienceFixtures();
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

    // Use a valid UUID that doesn't exist
    const missingId = '00000000-0000-0000-0000-000000000000';
    const request = new NextRequest(`http://localhost:3000/api/lessons/${missingId}`);
    const response = await GET(request, {
      params: Promise.resolve({ lessonSlug: missingId }),
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

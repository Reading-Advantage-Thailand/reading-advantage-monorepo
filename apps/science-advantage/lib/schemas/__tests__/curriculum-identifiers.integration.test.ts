import { describe, it, expect, beforeEach } from 'vitest';
import { db, eq, sql } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessonStandards,
  scienceLessons,
  scienceStandards,
  scienceUnitLessons,
  users,
} from '@reading-advantage/db/schema';
import {
  generateCurriculumUnitSlug,
  generateLessonSlug,
  isValidCurriculumUnitSlug,
  isValidLessonSlug,
} from '../lesson-slug.schema';

const TEST_PREFIX = 'curr-id-itest';

async function cleanup(): Promise<void> {
  await db.delete(scienceLessonStandards);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceLessons);
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = 'Curriculum identifiers test standard'`
  );
  await db.delete(scienceClasses);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

describe('Curriculum Unit and Lesson Relationships (Drizzle integration)', () => {
  let testLessonId: string;
  let testUnitId: string;
  let testClassId: string;
  let testStandardId: string;
  let testLessonTitle: string;
  let testUnitTitle: string;

  beforeEach(async () => {
    await cleanup();

    const [standard] = await db
      .insert(scienceStandards)
      .values({
        framework: 'THAI',
        code: `Sc1.1-G3-${TEST_PREFIX}-${Date.now()}`,
        description: 'Curriculum identifiers test standard',
        gradeLevel: 3,
      })
      .returning();
    testStandardId = standard.id;

    const teacherId = `${TEST_PREFIX}-teacher-${Date.now()}`;
    await db.insert(users).values({
      id: teacherId,
      name: 'Temp Teacher',
      username: teacherId,
      displayUsername: 'TempTeacherSlug',
      email: `${teacherId}@example.com`,
      role: 'TEACHER',
    });

    const [cls] = await db
      .insert(scienceClasses)
      .values({
        name: 'Test Class',
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: `TEST-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        teacherId,
      })
      .returning();
    testClassId = cls.id;

    testLessonTitle = 'Test Lesson';
    const [lesson] = await db
      .insert(scienceLessons)
      .values({
        slug: `test-lesson-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        title: testLessonTitle,
        description: 'A test lesson',
        content: 'Test content',
        gradeLevel: 3,
        order: 1,
      })
      .returning();
    testLessonId = lesson.id;

    await db.insert(scienceLessonStandards).values({
      lessonId: lesson.id,
      standardId: standard.id,
    });

    testUnitTitle = 'Test Unit';
    const [unit] = await db
      .insert(scienceCurriculumUnits)
      .values({
        slug: `test-unit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        title: testUnitTitle,
        description: 'A test unit',
        framework: 'THAI',
        gradeLevel: 3,
        order: 1,
        classId: cls.id,
      })
      .returning();
    testUnitId = unit.id;

    await db.insert(scienceUnitLessons).values({
      unitId: unit.id,
      lessonId: lesson.id,
    });
  });

  it('keeps id distinct from a derived slug for lessons (FR-1, FR-2)', async () => {
    const [lesson] = await db
      .select({ id: scienceLessons.id, title: scienceLessons.title })
      .from(scienceLessons)
      .where(eq(scienceLessons.id, testLessonId))
      .limit(1);

    expect(lesson).toBeDefined();
    expect(lesson.id).toBeDefined();

    const slug = generateLessonSlug(lesson.title);
    expect(slug).not.toBe(lesson.id);
    expect(isValidLessonSlug(slug)).toBe(true);
  });

  it('keeps id distinct from a derived slug for curriculum units (FR-1)', async () => {
    const [unit] = await db
      .select({ id: scienceCurriculumUnits.id, title: scienceCurriculumUnits.title })
      .from(scienceCurriculumUnits)
      .where(eq(scienceCurriculumUnits.id, testUnitId))
      .limit(1);

    expect(unit).toBeDefined();
    expect(unit.id).toBeDefined();

    const slug = generateCurriculumUnitSlug(unit.title);
    expect(slug).not.toBe(unit.id);
    expect(isValidCurriculumUnitSlug(slug)).toBe(true);
  });

  it('associates lessons with curriculum units through the junction table (FR-1)', async () => {
    const rows = await db
      .select({
        lessonId: scienceUnitLessons.lessonId,
        title: scienceLessons.title,
      })
      .from(scienceUnitLessons)
      .innerJoin(
        scienceLessons,
        eq(scienceLessons.id, scienceUnitLessons.lessonId)
      )
      .where(eq(scienceUnitLessons.unitId, testUnitId));

    expect(rows).toHaveLength(1);
    expect(rows[0].lessonId).toBe(testLessonId);
    expect(rows[0].title).toBe(testLessonTitle);
  });

  it('maps lessons to standards with codes (FR-4)', async () => {
    const rows = await db
      .select({
        code: scienceStandards.code,
        framework: scienceStandards.framework,
      })
      .from(scienceLessonStandards)
      .innerJoin(
        scienceStandards,
        eq(scienceStandards.id, scienceLessonStandards.standardId)
      )
      .where(eq(scienceLessonStandards.lessonId, testLessonId));

    expect(rows).toHaveLength(1);
    expect(rows[0].code).toMatch(/^Sc1\.1-G3-/);
    expect(rows[0].framework).toBe('THAI');
    expect(rows[0].code).toContain(TEST_PREFIX);
    // Sanity check that we are pinned to the same standard row that was seeded.
    expect(testStandardId).toBeTruthy();
    expect(testClassId).toBeTruthy();
  });
});

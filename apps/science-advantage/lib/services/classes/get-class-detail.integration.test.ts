import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, sql } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessons,
  scienceUnitLessons,
  users,
} from '@reading-advantage/db/schema';

import { getClassDetailWithCurriculum } from './get-class-detail';

async function cleanupFixtures(): Promise<void> {
  await db.delete(scienceClassStudents);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceLessons);
  await db.delete(scienceClasses);
  await db.execute(
    sql`DELETE FROM users WHERE id LIKE 'get-class-detail-test-%'`
  );
}

describe('getClassDetailWithCurriculum - Integration', () => {
  let teacherId: string;
  let studentAId: string;
  let studentBId: string;
  let classId: string;
  let unitOneId: string;
  let unitTwoId: string;
  let lessonOneId: string;
  let lessonTwoId: string;
  let lessonThreeId: string;

  beforeEach(async () => {
    await cleanupFixtures();

    [{ id: teacherId }] = await db
      .insert(users)
      .values({
        id: 'get-class-detail-test-teacher',
        name: 'Detail Teacher',
        username: 'get-class-detail-test-teacher',
        displayUsername: 'GCDTeacher',
        email: 'gcd-teacher@example.com',
        role: 'TEACHER',
      })
      .returning({ id: users.id });

    [{ id: studentAId }] = await db
      .insert(users)
      .values({
        id: 'get-class-detail-test-student-a',
        name: 'Student A',
        username: 'get-class-detail-test-student-a',
        displayUsername: 'GCDStudentA',
        email: 'gcd-student-a@example.com',
        role: 'STUDENT',
      })
      .returning({ id: users.id });

    [{ id: studentBId }] = await db
      .insert(users)
      .values({
        id: 'get-class-detail-test-student-b',
        name: 'Student B',
        username: 'get-class-detail-test-student-b',
        displayUsername: 'GCDStudentB',
        email: 'gcd-student-b@example.com',
        role: 'STUDENT',
      })
      .returning({ id: users.id });

    [{ id: classId }] = await db
      .insert(scienceClasses)
      .values({
        name: 'Grade 4 Science',
        gradeLevel: 4,
        standardsAlignment: 'THAI',
        joinCode: 'GCDCLS',
        teacherId,
      })
      .returning({ id: scienceClasses.id });

    await db.insert(scienceClassStudents).values([
      { classId, studentId: studentAId },
      { classId, studentId: studentBId },
    ]);

    // Two units in this class (insert in REVERSE order to prove ORDER BY works)
    [{ id: unitTwoId }] = await db
      .insert(scienceCurriculumUnits)
      .values({
        slug: 'gcd-unit-two',
        title: 'Unit Two',
        description: 'Second',
        framework: 'THAI',
        gradeLevel: 4,
        order: 2,
        classId,
      })
      .returning({ id: scienceCurriculumUnits.id });

    [{ id: unitOneId }] = await db
      .insert(scienceCurriculumUnits)
      .values({
        slug: 'gcd-unit-one',
        title: 'Unit One',
        description: 'First',
        framework: 'THAI',
        gradeLevel: 4,
        order: 1,
        classId,
      })
      .returning({ id: scienceCurriculumUnits.id });

    // One unit for a DIFFERENT framework — must be EXCLUDED from results
    await db.insert(scienceCurriculumUnits).values({
      slug: 'gcd-unit-other-framework',
      title: 'NGSS Unit',
      description: 'wrong framework',
      framework: 'NGSS',
      gradeLevel: 4,
      order: 99,
      classId,
    });

    // Three lessons; insert in REVERSE order to prove ORDER BY works
    [{ id: lessonThreeId }] = await db
      .insert(scienceLessons)
      .values({
        slug: 'gcd-lesson-three',
        title: 'Lesson Three',
        description: 'Third',
        gradeLevel: 4,
        order: 3,
      })
      .returning({ id: scienceLessons.id });

    [{ id: lessonTwoId }] = await db
      .insert(scienceLessons)
      .values({
        slug: 'gcd-lesson-two',
        title: 'Lesson Two',
        description: 'Second',
        gradeLevel: 4,
        order: 2,
      })
      .returning({ id: scienceLessons.id });

    [{ id: lessonOneId }] = await db
      .insert(scienceLessons)
      .values({
        slug: 'gcd-lesson-one',
        title: 'Lesson One',
        description: 'First',
        gradeLevel: 4,
        order: 1,
      })
      .returning({ id: scienceLessons.id });

    // Unit 1 has lessons 1 and 2; Unit 2 has lesson 3
    await db.insert(scienceUnitLessons).values([
      { unitId: unitOneId, lessonId: lessonOneId },
      { unitId: unitOneId, lessonId: lessonTwoId },
      { unitId: unitTwoId, lessonId: lessonThreeId },
    ]);
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it('returns null when the class does not exist', async () => {
    const missingId = '00000000-0000-0000-0000-000000000000';
    const result = await getClassDetailWithCurriculum(missingId);
    expect(result).toBeNull();
  });

  it('returns class metadata plus student ids and student count', async () => {
    const result = await getClassDetailWithCurriculum(classId);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(classId);
    expect(result!.name).toBe('Grade 4 Science');
    expect(result!.gradeLevel).toBe(4);
    expect(result!.standardsAlignment).toBe('THAI');
    expect(result!.joinCode).toBe('GCDCLS');
    expect(result!.teacherId).toBe(teacherId);
    expect(result!.createdAt).toBeInstanceOf(Date);
    expect(result!.updatedAt).toBeInstanceOf(Date);
    expect(result!.studentCount).toBe(2);
    const studentIds = result!.students.map((s) => s.id).sort();
    expect(studentIds).toEqual([studentAId, studentBId].sort());
  });

  it('returns curriculum units in `order asc`, filtered by class framework + gradeLevel', async () => {
    const result = await getClassDetailWithCurriculum(classId);
    expect(result).not.toBeNull();
    expect(result!.curriculumUnits).toHaveLength(2);
    expect(result!.curriculumUnits.map((u) => u.title)).toEqual([
      'Unit One',
      'Unit Two',
    ]);
    // NGSS unit (wrong framework) MUST be excluded
    expect(result!.curriculumUnits.find((u) => u.title === 'NGSS Unit')).toBeUndefined();
  });

  it('returns lessons inside each unit in `order asc`', async () => {
    const result = await getClassDetailWithCurriculum(classId);
    expect(result).not.toBeNull();

    const unitOne = result!.curriculumUnits.find((u) => u.title === 'Unit One');
    expect(unitOne).toBeDefined();
    expect(unitOne!.lessons.map((l) => l.title)).toEqual([
      'Lesson One',
      'Lesson Two',
    ]);
    expect(unitOne!.lessons[0]).toEqual({
      id: lessonOneId,
      slug: 'gcd-lesson-one',
      title: 'Lesson One',
      description: 'First',
      order: 1,
      gradeLevel: 4,
    });

    const unitTwo = result!.curriculumUnits.find((u) => u.title === 'Unit Two');
    expect(unitTwo).toBeDefined();
    expect(unitTwo!.lessons).toHaveLength(1);
    expect(unitTwo!.lessons[0].title).toBe('Lesson Three');
  });

  it('returns empty arrays when the class has no units and no students', async () => {
    // Create a second teacher + bare class with no units/students
    const [{ id: bareTeacherId }] = await db
      .insert(users)
      .values({
        id: 'get-class-detail-test-bare-teacher',
        name: 'Bare Teacher',
        username: 'get-class-detail-test-bare-teacher',
        displayUsername: 'BareT',
        email: 'gcd-bare@example.com',
        role: 'TEACHER',
      })
      .returning({ id: users.id });

    const [{ id: bareClassId }] = await db
      .insert(scienceClasses)
      .values({
        name: 'Empty Class',
        gradeLevel: 5,
        standardsAlignment: 'NGSS',
        joinCode: 'GCDBR',
        teacherId: bareTeacherId,
      })
      .returning({ id: scienceClasses.id });

    const result = await getClassDetailWithCurriculum(bareClassId);
    expect(result).not.toBeNull();
    expect(result!.students).toEqual([]);
    expect(result!.studentCount).toBe(0);
    expect(result!.curriculumUnits).toEqual([]);
  });
});

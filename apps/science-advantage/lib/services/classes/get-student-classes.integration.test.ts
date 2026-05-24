import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, sql } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  users,
} from '@reading-advantage/db/schema';

import { getStudentEnrolledClasses } from './get-student-classes';

const TEST_PREFIX = 'gsec-itest';

async function cleanupFixtures(): Promise<void> {
  await db.delete(scienceClassStudents);
  await db.delete(scienceClasses);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedUser(
  id: string,
  role: 'STUDENT' | 'TEACHER' | 'ADMIN',
  name?: string
) {
  const [u] = await db
    .insert(users)
    .values({
      id,
      name: name ?? id,
      username: id,
      displayUsername: id,
      email: `${id}@example.com`,
      role,
    })
    .returning();
  return u;
}

async function seedClass(opts: {
  name: string;
  gradeLevel: number;
  teacherId: string;
  joinCode: string;
  createdAt?: Date;
}) {
  const [c] = await db
    .insert(scienceClasses)
    .values({
      name: opts.name,
      gradeLevel: opts.gradeLevel,
      standardsAlignment: 'THAI',
      joinCode: opts.joinCode,
      teacherId: opts.teacherId,
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    })
    .returning();
  return c;
}

describe('getStudentEnrolledClasses - Integration', () => {
  beforeEach(async () => {
    await cleanupFixtures();
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it('returns an empty array when the student has no enrollments', async () => {
    const student = await seedUser(`${TEST_PREFIX}-empty-student`, 'STUDENT');
    const result = await getStudentEnrolledClasses(student.id);
    expect(result).toEqual([]);
  });

  it('returns an empty array for a non-existent student id', async () => {
    const result = await getStudentEnrolledClasses(
      `${TEST_PREFIX}-does-not-exist`
    );
    expect(result).toEqual([]);
  });

  it('returns a single enrolled class with teacher name and ISO enrolledAt', async () => {
    const teacher = await seedUser(
      `${TEST_PREFIX}-teacher-1`,
      'TEACHER',
      'Ms. Frizzle'
    );
    const student = await seedUser(`${TEST_PREFIX}-student-1`, 'STUDENT');
    const createdAt = new Date('2025-10-01T10:00:00.000Z');
    const cls = await seedClass({
      name: 'Science Explorers',
      gradeLevel: 5,
      teacherId: teacher.id,
      joinCode: 'GSEC01',
      createdAt,
    });
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });

    const result = await getStudentEnrolledClasses(student.id);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: cls.id,
      name: 'Science Explorers',
      gradeLevel: 5,
      teacherId: teacher.id,
      teacherName: 'Ms. Frizzle',
      enrolledAt: createdAt.toISOString(),
    });
  });

  it('falls back to "Teacher" when the teacher user has no name', async () => {
    const [teacher] = await db
      .insert(users)
      .values({
        id: `${TEST_PREFIX}-teacher-nameless`,
        name: null,
        username: `${TEST_PREFIX}-teacher-nameless`,
        displayUsername: `${TEST_PREFIX}-teacher-nameless`,
        email: `${TEST_PREFIX}-teacher-nameless@example.com`,
        role: 'TEACHER',
      })
      .returning();
    const student = await seedUser(`${TEST_PREFIX}-student-2`, 'STUDENT');
    const cls = await seedClass({
      name: 'Physics Lab',
      gradeLevel: 6,
      teacherId: teacher.id,
      joinCode: 'GSEC02',
    });
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });

    const result = await getStudentEnrolledClasses(student.id);
    expect(result).toHaveLength(1);
    expect(result[0].teacherName).toBe('Teacher');
  });

  it('returns multiple enrollments ordered by class createdAt desc', async () => {
    const teacher = await seedUser(
      `${TEST_PREFIX}-teacher-multi`,
      'TEACHER',
      'Mr. Tesla'
    );
    const student = await seedUser(`${TEST_PREFIX}-student-multi`, 'STUDENT');

    const older = await seedClass({
      name: 'Older Class',
      gradeLevel: 4,
      teacherId: teacher.id,
      joinCode: 'GSEC03',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    const newest = await seedClass({
      name: 'Newest Class',
      gradeLevel: 5,
      teacherId: teacher.id,
      joinCode: 'GSEC04',
      createdAt: new Date('2025-12-01T00:00:00.000Z'),
    });
    const middle = await seedClass({
      name: 'Middle Class',
      gradeLevel: 5,
      teacherId: teacher.id,
      joinCode: 'GSEC05',
      createdAt: new Date('2025-06-01T00:00:00.000Z'),
    });

    await db.insert(scienceClassStudents).values([
      { classId: older.id, studentId: student.id },
      { classId: newest.id, studentId: student.id },
      { classId: middle.id, studentId: student.id },
    ]);

    const result = await getStudentEnrolledClasses(student.id);
    expect(result.map((c) => c.name)).toEqual([
      'Newest Class',
      'Middle Class',
      'Older Class',
    ]);
  });

  it('does not leak classes for other students', async () => {
    const teacher = await seedUser(
      `${TEST_PREFIX}-teacher-scope`,
      'TEACHER',
      'Ms. Curie'
    );
    const studentA = await seedUser(`${TEST_PREFIX}-student-a`, 'STUDENT');
    const studentB = await seedUser(`${TEST_PREFIX}-student-b`, 'STUDENT');

    const classA = await seedClass({
      name: 'Class A',
      gradeLevel: 3,
      teacherId: teacher.id,
      joinCode: 'GSEC06',
    });
    const classB = await seedClass({
      name: 'Class B',
      gradeLevel: 3,
      teacherId: teacher.id,
      joinCode: 'GSEC07',
    });

    await db.insert(scienceClassStudents).values([
      { classId: classA.id, studentId: studentA.id },
      { classId: classB.id, studentId: studentB.id },
    ]);

    const resultA = await getStudentEnrolledClasses(studentA.id);
    expect(resultA).toHaveLength(1);
    expect(resultA[0].name).toBe('Class A');

    const resultB = await getStudentEnrolledClasses(studentB.id);
    expect(resultB).toHaveLength(1);
    expect(resultB[0].name).toBe('Class B');
  });
});

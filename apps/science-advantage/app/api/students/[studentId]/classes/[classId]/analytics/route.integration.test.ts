import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceAttempts,
  scienceClassStudents,
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessonStandards,
  scienceLessons,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandards,
  scienceUnitLessons,
  sessions,
  schools,
  users,
} from '@reading-advantage/db/schema';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'student-class-analytics-itest';
const TEST_SCHOOL_ID = '00000000-0000-0000-0000-000000000099';
const TEST_USER_IDS = {
  teacher: '00000000-0000-0000-0000-000000000101',
  otherTeacher: '00000000-0000-0000-0000-000000000102',
  admin: '00000000-0000-0000-0000-000000000103',
  student: '00000000-0000-0000-0000-000000000104',
} as const;

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

async function cleanup(): Promise<void> {
  await db.delete(scienceQuestionResponses);
  await db.delete(scienceQuestionStandards);
  await db.delete(scienceLessonStandards);
  await db.delete(scienceUnitLessons);
  await db.delete(scienceClassStudents);
  await db.delete(scienceLessonCompletions);
  await db.delete(scienceAttempts);
  await db.delete(scienceQuizQuestions);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceLessons);
  await db.delete(scienceClasses);
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = 'SC analytics standard'`
  );
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(
    sql`DELETE FROM users WHERE username LIKE ${`${TEST_PREFIX}-%`}`
  );
}

async function seedUser(
  id: string,
  role: 'TEACHER' | 'STUDENT' | 'ADMIN',
  name?: string
) {
  const username = `${TEST_PREFIX}-${id.slice(-3)}`;
  const [u] = await db
    .insert(users)
    .values({
      id,
      name: name ?? id,
      username,
      displayUsername: username,
      email: `${username}@example.com`,
      role,
      schoolId: TEST_SCHOOL_ID,
    })
    .returning();
  return u;
}

async function seedScenario(args: { enrolled: boolean }) {
  const teacher = await seedUser(TEST_USER_IDS.teacher, 'TEACHER');
  const otherTeacher = await seedUser(TEST_USER_IDS.otherTeacher, 'TEACHER');
  const admin = await seedUser(TEST_USER_IDS.admin, 'ADMIN');
  const student = await seedUser(TEST_USER_IDS.student, 'STUDENT', 'Alice');

  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'SC Analytics Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `SCA-${Date.now()}`,
      teacherId: teacher.id,
      schoolId: TEST_SCHOOL_ID,
    })
    .returning();
  if (args.enrolled) {
    await db.insert(scienceClassStudents).values({
      classId: cls.id,
      studentId: student.id,
      schoolId: TEST_SCHOOL_ID,
    });
  }

  const [unit] = await db
    .insert(scienceCurriculumUnits)
    .values({
      slug: `${TEST_PREFIX}-unit-${Date.now()}`,
      title: 'SC Unit',
      framework: 'THAI',
      gradeLevel: 3,
      order: 1,
      classId: cls.id,
      schoolId: TEST_SCHOOL_ID,
    })
    .returning();

  const [lesson1] = await db
    .insert(scienceLessons)
    .values({
      slug: `${TEST_PREFIX}-l1-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2, 6)}`,
      title: 'Lesson 1',
      gradeLevel: 3,
      order: 1,
      schoolId: TEST_SCHOOL_ID,
    })
    .returning();
  const [lesson2] = await db
    .insert(scienceLessons)
    .values({
      slug: `${TEST_PREFIX}-l2-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2, 6)}`,
      title: 'Lesson 2',
      gradeLevel: 3,
      order: 2,
      schoolId: TEST_SCHOOL_ID,
    })
    .returning();
  await db.insert(scienceUnitLessons).values([
    { unitId: unit.id, lessonId: lesson1.id, schoolId: TEST_SCHOOL_ID },
    { unitId: unit.id, lessonId: lesson2.id, schoolId: TEST_SCHOOL_ID },
  ]);

  const [std1] = await db
    .insert(scienceStandards)
    .values({
      framework: 'THAI',
      code: `Sc-${TEST_PREFIX}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2, 6)}`,
      description: 'SC analytics standard',
      gradeLevel: 3,
      schoolId: TEST_SCHOOL_ID,
    })
    .returning();
  await db.insert(scienceLessonStandards).values({
    lessonId: lesson1.id,
    standardId: std1.id,
    schoolId: TEST_SCHOOL_ID,
  });

  const [q1] = await db
    .insert(scienceQuizQuestions)
    .values({
      slug: `${TEST_PREFIX}-q1-${Date.now()}`,
      lessonId: lesson1.id,
      type: 'MULTIPLE_CHOICE',
      text: 'Q1?',
      options: ['A', 'B'],
      correctAnswer: 'A',
      points: 1,
      order: 1,
      schoolId: TEST_SCHOOL_ID,
    })
    .returning();
  await db.insert(scienceQuestionStandards).values({
    questionId: q1.id,
    standardId: std1.id,
    schoolId: TEST_SCHOOL_ID,
  });

  return {
    teacher,
    otherTeacher,
    admin,
    student,
    cls,
    lesson1,
    lesson2,
    q1,
    std1,
  };
}

describe('GET /api/students/[studentId]/classes/[classId]/analytics (integration)', () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    await db
      .insert(schools)
      .values({ id: TEST_SCHOOL_ID, name: 'Test School' })
      .onConflictDoNothing();
  });

  it('returns 404 when class does not exist', async () => {
    const { teacher, student } = await seedScenario({ enrolled: true });
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({
        studentId: student.id,
        classId: '00000000-0000-0000-0000-000000000000',
      }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 403 for a teacher who does not own the class', async () => {
    const { otherTeacher, student, cls } = await seedScenario({
      enrolled: true,
    });
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ studentId: student.id, classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 when student is not enrolled in the class', async () => {
    const { teacher, student, cls } = await seedScenario({ enrolled: false });
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ studentId: student.id, classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns lessons performance + standards mastery for the owning teacher', async () => {
    const { teacher, student, cls, lesson1, lesson2, q1, std1 } =
      await seedScenario({ enrolled: true });

    // Persist a completion for lesson1 (90%) and an attempt with the
    // student getting q1 correct.
    await db.insert(scienceLessonCompletions).values({
      studentId: student.id,
      lessonId: lesson1.id,
      schoolId: TEST_SCHOOL_ID,
      status: 'COMPLETED',
      attemptsCount: 1,
      mostRecentScore: 1,
      mostRecentScorePercentage: 90,
      bestScore: 1,
      bestScorePercentage: 90,
      completedAt: new Date(),
      lastAttemptAt: new Date(),
      totalTimeSpentSeconds: 120,
    });
    const [attempt] = await db
      .insert(scienceAttempts)
      .values({
        studentId: student.id,
        lessonId: lesson1.id,
        schoolId: TEST_SCHOOL_ID,
        score: 1,
        maxScore: 1,
        attemptNumber: 1,
        startedAt: new Date(),
        completedAt: new Date(),
      })
      .returning();
    await db.insert(scienceQuestionResponses).values({
      attemptId: attempt.id,
      questionId: q1.id,
      schoolId: TEST_SCHOOL_ID,
      studentAnswer: 'A',
      isCorrect: true,
      timeSpentSeconds: 60,
      answeredAt: new Date(),
    });

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ studentId: student.id, classId: cls.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.student).toEqual({ id: student.id, name: 'Alice' });
    expect(data.class.id).toBe(cls.id);

    expect(data.summary.lessonsCompleted).toBe(1);
    expect(data.summary.totalLessons).toBe(2);
    expect(data.summary.averageScore).toBe(90);
    expect(data.summary.totalAttempts).toBe(1);
    expect(data.summary.colorCode).toBe('blue');

    expect(data.lessonsPerformance).toHaveLength(2);
    expect(data.lessonsPerformance[0].lessonId).toBe(lesson1.id);
    expect(data.lessonsPerformance[0].completionStatus).toBe('completed');
    expect(data.lessonsPerformance[1].lessonId).toBe(lesson2.id);
    expect(data.lessonsPerformance[1].completionStatus).toBe('not_started');

    // Standards mastery — q1 correct + std1 linked → 100%.
    expect(data.standardsPerformance).toHaveLength(1);
    const entry = data.standardsPerformance[0];
    expect(entry.standardId).toBe(std1.id);
    expect(entry.questionsAnswered).toBe(1);
    expect(entry.questionsCorrect).toBe(1);
    expect(entry.masteryPercentage).toBe(100);
    expect(entry.needsIntervention).toBe(false);
  });

  it('admin can view the analytics regardless of class ownership', async () => {
    const { admin, student, cls } = await seedScenario({ enrolled: true });
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ studentId: student.id, classId: cls.id }),
    });
    expect(res.status).toBe(200);
  });
});

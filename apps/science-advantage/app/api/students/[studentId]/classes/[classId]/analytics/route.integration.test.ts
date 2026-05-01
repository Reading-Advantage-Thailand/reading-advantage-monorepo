import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

import prisma from '@/lib/prisma';
import { createTestUser, createTestClass, cleanupTestData } from '@/lib/test-helpers';

describe('/api/students/[studentId]/classes/[classId]/analytics', () => {
  let teacher: any;
  let otherTeacher: any;
  let student: any;
  let otherStudent: any;
  let testClass: any;
  let lesson1: any;
  let lesson2: any;
  let unit: any;
  let standard1: any;
  let standard2: any;

  beforeAll(async () => {
    // Create test users
    teacher = await createTestUser('teacher-student-analytics', 'TEACHER');
    otherTeacher = await createTestUser('other-teacher-student-analytics', 'TEACHER');
    student = await createTestUser('student-analytics', 'STUDENT');
    otherStudent = await createTestUser('other-student-analytics', 'STUDENT');

    // Create test class
    testClass = await createTestClass(teacher.id, [student.id]);

    // Create standards
    standard1 = await prisma.standard.create({
      data: {
        code: 'Sc1.1-test',
        description: 'Scientific Inquiry',
        framework: 'THAI',
        gradeLevel: 3,
      },
    });

    standard2 = await prisma.standard.create({
      data: {
        code: 'Sc1.2-test',
        description: 'Scientific Method',
        framework: 'THAI',
        gradeLevel: 3,
      },
    });

    // Create lessons
    lesson1 = await prisma.lesson.create({
      data: {
        title: 'Test Lesson 1',
        description: 'First test lesson',
        lessonType: 'LESSON',
        gradeLevel: 3,
        order: 1,
        standards: {
          connect: [{ id: standard1.id }],
        },
      },
    });

    lesson2 = await prisma.lesson.create({
      data: {
        title: 'Test Lesson 2',
        description: 'Second test lesson',
        lessonType: 'LESSON',
        gradeLevel: 3,
        order: 2,
        standards: {
          connect: [{ id: standard2.id }],
        },
      },
    });

    // Create curriculum unit
    unit = await prisma.curriculumUnit.create({
      data: {
        title: 'Test Unit',
        framework: testClass.standardsAlignment,
        gradeLevel: testClass.gradeLevel,
        order: 1,
        classId: testClass.id,
        lessons: {
          connect: [{ id: lesson1.id }, { id: lesson2.id }],
        },
      },
    });

    // Create quiz questions for lesson 1
    const question1 = await prisma.quizQuestion.create({
      data: {
        lessonId: lesson1.id,
        type: 'MULTIPLE_CHOICE',
        text: 'Question 1 for Lesson 1',
        options: { choices: ['A', 'B', 'C', 'D'] },
        correctAnswer: { answer: 'A' },
        points: 1,
        order: 1,
        standards: {
          connect: [{ id: standard1.id }],
        },
      },
    });

    const question2 = await prisma.quizQuestion.create({
      data: {
        lessonId: lesson1.id,
        type: 'MULTIPLE_CHOICE',
        text: 'Question 2 for Lesson 1',
        options: { choices: ['A', 'B', 'C', 'D'] },
        correctAnswer: { answer: 'B' },
        points: 1,
        order: 2,
        standards: {
          connect: [{ id: standard1.id }],
        },
      },
    });

    // Create quiz questions for lesson 2
    const question3 = await prisma.quizQuestion.create({
      data: {
        lessonId: lesson2.id,
        type: 'MULTIPLE_CHOICE',
        text: 'Question 1 for Lesson 2',
        options: { choices: ['A', 'B', 'C', 'D'] },
        correctAnswer: { answer: 'C' },
        points: 1,
        order: 1,
        standards: {
          connect: [{ id: standard2.id }],
        },
      },
    });

    // Create attempts for lesson 1
    const attempt1 = await prisma.attempt.create({
      data: {
        studentId: student.id,
        lessonId: lesson1.id,
        attemptNumber: 1,
        score: 1,
        maxScore: 2,
        startedAt: new Date('2024-01-10T10:00:00Z'),
        completedAt: new Date('2024-01-10T10:15:00Z'),
        questionResponses: {
          create: [
            {
              questionId: question1.id,
              studentAnswer: { answer: 'A' },
              isCorrect: true,
              timeSpentSeconds: 30,
              order: 1,
            },
            {
              questionId: question2.id,
              studentAnswer: { answer: 'A' },
              isCorrect: false,
              timeSpentSeconds: 45,
              order: 2,
            },
          ],
        },
      },
    });

    // Create second attempt for lesson 1 with better score
    const attempt2 = await prisma.attempt.create({
      data: {
        studentId: student.id,
        lessonId: lesson1.id,
        attemptNumber: 2,
        score: 2,
        maxScore: 2,
        startedAt: new Date('2024-01-11T10:00:00Z'),
        completedAt: new Date('2024-01-11T10:12:00Z'),
        questionResponses: {
          create: [
            {
              questionId: question1.id,
              studentAnswer: { answer: 'A' },
              isCorrect: true,
              timeSpentSeconds: 25,
              order: 1,
            },
            {
              questionId: question2.id,
              studentAnswer: { answer: 'B' },
              isCorrect: true,
              timeSpentSeconds: 35,
              order: 2,
            },
          ],
        },
      },
    });

    // Create attempt for lesson 2
    const attempt3 = await prisma.attempt.create({
      data: {
        studentId: student.id,
        lessonId: lesson2.id,
        attemptNumber: 1,
        score: 1,
        maxScore: 1,
        startedAt: new Date('2024-01-12T10:00:00Z'),
        completedAt: new Date('2024-01-12T10:10:00Z'),
        questionResponses: {
          create: [
            {
              questionId: question3.id,
              studentAnswer: { answer: 'C' },
              isCorrect: true,
              timeSpentSeconds: 40,
              order: 1,
            },
          ],
        },
      },
    });

    // Create lesson completions
    await prisma.lessonCompletion.create({
      data: {
        studentId: student.id,
        lessonId: lesson1.id,
        status: 'COMPLETED',
        completedAt: new Date('2024-01-11T10:12:00Z'),
        attemptsCount: 2,
        bestScore: 2,
        bestScorePercentage: 100,
        mostRecentScore: 2,
        mostRecentScorePercentage: 100,
        totalTimeSpentSeconds: 135, // 30+45+25+35
        lastAttemptAt: new Date('2024-01-11T10:12:00Z'),
      },
    });

    await prisma.lessonCompletion.create({
      data: {
        studentId: student.id,
        lessonId: lesson2.id,
        status: 'COMPLETED',
        completedAt: new Date('2024-01-12T10:10:00Z'),
        attemptsCount: 1,
        bestScore: 1,
        bestScorePercentage: 100,
        mostRecentScore: 1,
        mostRecentScorePercentage: 100,
        totalTimeSpentSeconds: 40,
        lastAttemptAt: new Date('2024-01-12T10:10:00Z'),
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('should return 401 when not authenticated', async () => {
    const response = await fetch(
      `http://localhost:3000/api/students/${student.id}/classes/${testClass.id}/analytics`
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 when class not found', async () => {
    // Authenticate as teacher
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: teacher.username,
        password: 'password123',
      }),
    });

    const cookies = loginResponse.headers.getSetCookie();

    const response = await fetch(
      `http://localhost:3000/api/students/${student.id}/classes/nonexistent-class/analytics`,
      { headers: { Cookie: cookies.join('; ') } }
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Class not found');
  });

  it('should return 404 when student not found in class', async () => {
    // Authenticate as teacher
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: teacher.username,
        password: 'password123',
      }),
    });

    const cookies = loginResponse.headers.getSetCookie();

    const response = await fetch(
      `http://localhost:3000/api/students/${otherStudent.id}/classes/${testClass.id}/analytics`,
      { headers: { Cookie: cookies.join('; ') } }
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Student not found in this class');
  });

  it('should return 403 when accessed by non-owner teacher', async () => {
    // Authenticate as other teacher
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: otherTeacher.username,
        password: 'password123',
      }),
    });

    const cookies = loginResponse.headers.getSetCookie();

    const response = await fetch(
      `http://localhost:3000/api/students/${student.id}/classes/${testClass.id}/analytics`,
      { headers: { Cookie: cookies.join('; ') } }
    );

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized access to student analytics');
  });

  it('should return student analytics for class teacher', async () => {
    // Authenticate as teacher
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: teacher.username,
        password: 'password123',
      }),
    });

    const cookies = loginResponse.headers.getSetCookie();

    const response = await fetch(
      `http://localhost:3000/api/students/${student.id}/classes/${testClass.id}/analytics`,
      { headers: { Cookie: cookies.join('; ') } }
    );

    expect(response.status).toBe(200);
    const data = await response.json();

    // Validate response structure
    expect(data).toHaveProperty('student');
    expect(data).toHaveProperty('class');
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('lessonsPerformance');
    expect(data).toHaveProperty('standardsPerformance');

    // Validate student info
    expect(data.student.id).toBe(student.id);
    expect(data.student.name).toBe(student.name);

    // Validate class info
    expect(data.class.id).toBe(testClass.id);
    expect(data.class.name).toBe(testClass.name);

    // Validate summary
    expect(data.summary.lessonsCompleted).toBe(2);
    expect(data.summary.totalLessons).toBe(2);
    expect(data.summary.averageScore).toBe(100); // Both lessons 100%
    expect(data.summary.totalAttempts).toBe(3); // 2 attempts for lesson1, 1 for lesson2
    expect(data.summary.colorCode).toBe('blue'); // 100% is blue

    // Validate lessons performance
    expect(data.lessonsPerformance).toHaveLength(2);
    const lesson1Perf = data.lessonsPerformance.find(
      (lp: any) => lp.lessonId === lesson1.id
    );
    expect(lesson1Perf).toBeDefined();
    expect(lesson1Perf.completionStatus).toBe('completed');
    expect(lesson1Perf.mostRecentScorePercentage).toBe(100);
    expect(lesson1Perf.attemptsCount).toBe(2);

    // Validate standards performance
    expect(data.standardsPerformance.length).toBeGreaterThan(0);
    expect(data.standardsPerformance[0]).toHaveProperty('standardCode');
    expect(data.standardsPerformance[0]).toHaveProperty('masteryPercentage');
    expect(data.standardsPerformance[0]).toHaveProperty('needsIntervention');
  });

  it('should aggregate standards performance across all lessons', async () => {
    // Authenticate as teacher
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: teacher.username,
        password: 'password123',
      }),
    });

    const cookies = loginResponse.headers.getSetCookie();

    const response = await fetch(
      `http://localhost:3000/api/students/${student.id}/classes/${testClass.id}/analytics`,
      { headers: { Cookie: cookies.join('; ') } }
    );

    const data = await response.json();

    // Should have standards from both lessons
    expect(data.standardsPerformance.length).toBe(2);

    // Standards should be sorted by mastery % (lowest first)
    for (let i = 0; i < data.standardsPerformance.length - 1; i++) {
      expect(data.standardsPerformance[i].masteryPercentage).toBeLessThanOrEqual(
        data.standardsPerformance[i + 1].masteryPercentage
      );
    }
  });

  it('should calculate correct color codes based on score thresholds', async () => {
    // Authenticate as teacher
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: teacher.username,
        password: 'password123',
      }),
    });

    const cookies = loginResponse.headers.getSetCookie();

    const response = await fetch(
      `http://localhost:3000/api/students/${student.id}/classes/${testClass.id}/analytics`,
      { headers: { Cookie: cookies.join('; ') } }
    );

    const data = await response.json();

    // Check summary color code (average 100% should be blue)
    expect(data.summary.colorCode).toBe('blue');

    // Check lessons color codes
    data.lessonsPerformance.forEach((lesson: any) => {
      if (lesson.mostRecentScore !== null) {
        const score = lesson.mostRecentScorePercentage;
        if (score >= 90) {
          expect(lesson.colorCode).toBe('blue');
        } else if (score >= 80) {
          expect(lesson.colorCode).toBe('green');
        } else if (score >= 60) {
          expect(lesson.colorCode).toBe('yellow');
        } else {
          expect(lesson.colorCode).toBe('red');
        }
      }
    });
  });

  it('should handle student with no attempts gracefully', async () => {
    // Create a new student with no attempts
    const newStudent = await createTestUser('student-no-attempts', 'STUDENT');

    // Enroll student in class
    await prisma.class.update({
      where: { id: testClass.id },
      data: {
        students: {
          connect: { id: newStudent.id },
        },
      },
    });

    // Authenticate as teacher
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: teacher.username,
        password: 'password123',
      }),
    });

    const cookies = loginResponse.headers.getSetCookie();

    const response = await fetch(
      `http://localhost:3000/api/students/${newStudent.id}/classes/${testClass.id}/analytics`,
      { headers: { Cookie: cookies.join('; ') } }
    );

    expect(response.status).toBe(200);
    const data = await response.json();

    // Should return with zero values
    expect(data.summary.lessonsCompleted).toBe(0);
    expect(data.summary.averageScore).toBe(0);
    expect(data.summary.totalAttempts).toBe(0);
    expect(data.lessonsPerformance.every((lp: any) => lp.mostRecentScore === null)).toBe(
      true
    );
  });

  it('should mark standards with <60% mastery as needing intervention', async () => {
    // Create a student with poor performance
    const strugglingStudent = await createTestUser('student-struggling', 'STUDENT');

    // Enroll in class
    await prisma.class.update({
      where: { id: testClass.id },
      data: {
        students: {
          connect: { id: strugglingStudent.id },
        },
      },
    });

    // Get questions for lesson 1
    const questions = await prisma.quizQuestion.findMany({
      where: { lessonId: lesson1.id },
      orderBy: { order: 'asc' },
    });

    // Create attempt with 50% score (1 out of 2 correct)
    await prisma.attempt.create({
      data: {
        studentId: strugglingStudent.id,
        lessonId: lesson1.id,
        attemptNumber: 1,
        score: 1,
        maxScore: 2,
        startedAt: new Date('2024-01-10T10:00:00Z'),
        completedAt: new Date('2024-01-10T10:15:00Z'),
        questionResponses: {
          create: [
            {
              questionId: questions[0].id,
              studentAnswer: { answer: 'A' },
              isCorrect: true,
              timeSpentSeconds: 30,
              order: 1,
            },
            {
              questionId: questions[1].id,
              studentAnswer: { answer: 'A' },
              isCorrect: false,
              timeSpentSeconds: 45,
              order: 2,
            },
          ],
        },
      },
    });

    // Authenticate as teacher
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: teacher.username,
        password: 'password123',
      }),
    });

    const cookies = loginResponse.headers.getSetCookie();

    const response = await fetch(
      `http://localhost:3000/api/students/${strugglingStudent.id}/classes/${testClass.id}/analytics`,
      { headers: { Cookie: cookies.join('; ') } }
    );

    const data = await response.json();

    // Find the standard from lesson 1
    const standard = data.standardsPerformance.find(
      (sp: any) => sp.standardCode === standard1.code
    );

    expect(standard).toBeDefined();
    expect(standard.masteryPercentage).toBe(50); // 1 out of 2 correct
    expect(standard.needsIntervention).toBe(true); // <60%
    expect(standard.colorCode).toBe('red'); // <60% is red
  });
});

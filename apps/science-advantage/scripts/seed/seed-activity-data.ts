#!/usr/bin/env tsx
import bcrypt from 'bcryptjs';

import { db, eq, inArray, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceAttempts,
  scienceClassStudents,
  scienceClasses,
  scienceLessonCompletions,
  scienceLessons,
  scienceQuestionResponses,
  scienceQuizQuestions,
  users,
} from '@reading-advantage/db/schema';

interface StudentProfile {
  profile: string;
  count: number;
  scoreRange: [number, number];
  attempts: number;
  improving: boolean;
  completedLessons?: number;
}

// Define student profiles
const studentProfiles: StudentProfile[] = [
  { profile: 'High-Achiever',         count: 2, scoreRange: [0.9, 1.0],  attempts: 1, improving: false },
  { profile: 'Consistent-Performer',  count: 5, scoreRange: [0.75, 0.9], attempts: 1, improving: false },
  { profile: 'Struggling-Learner',    count: 3, scoreRange: [0.4, 0.6],  attempts: 3, improving: false },
  { profile: 'Improving-Learner',     count: 2, scoreRange: [0.5, 0.9],  attempts: 2, improving: true  },
  { profile: 'Disengaged-Learner',    count: 2, scoreRange: [0.6, 0.8],  attempts: 1, improving: false, completedLessons: 2 },
];

// Helper function to generate random value within range
function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export async function seedActivityData(): Promise<void> {
  console.log('Seeding activity data...');

  const password = 'Password123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();

  // 1. Expand Student Roster
  const [demoClass] = await db
    .select({ id: scienceClasses.id })
    .from(scienceClasses)
    .where(eq(scienceClasses.joinCode, 'DEMO3T'))
    .limit(1);

  if (!demoClass) {
    console.error('Demo class with join code DEMO3T not found.');
    return;
  }

  let studentCount = 1; // student_demo already exists
  for (const { profile, count } of studentProfiles) {
    for (let i = 1; i <= count; i++) {
      studentCount++;
      const username = `student_demo_${studentCount.toString().padStart(2, '0')}`;
      const email = `student${studentCount.toString().padStart(2, '0')}@demo.local`;
      const name = `${profile} ${i}`;
      const userId = `student-${username}`;

      await db
        .insert(users)
        .values({
          id: userId,
          username,
          displayUsername: username,
          name,
          email,
          role: 'STUDENT',
          gradeLevel: 3,
          image: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: users.username });

      const accountId = `${userId}_credential`;
      await db
        .insert(accounts)
        .values({
          id: accountId,
          userId,
          providerId: 'credential',
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: accounts.id });

      await db
        .insert(scienceClassStudents)
        .values({ classId: demoClass.id, studentId: userId })
        .onConflictDoNothing();
    }
  }

  console.log('  ✓ Expanded student roster to 15 students.');

  // (Optional) Enhance Admin View
  const teacher2Id = 'teacher-demo-02';
  await db
    .insert(users)
    .values({
      id: teacher2Id,
      username: 'teacher_demo_02',
      displayUsername: 'teacher_demo_02',
      name: 'Demo Teacher 2',
      email: 'teacher2@demo.local',
      role: 'TEACHER',
      gradeLevel: null,
      image: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: users.username });

  const teacher2AccountId = `${teacher2Id}_credential`;
  await db
    .insert(accounts)
    .values({
      id: teacher2AccountId,
      userId: teacher2Id,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: accounts.id });

  await db
    .insert(scienceClasses)
    .values({
      name: 'Grade 4 Science (Thai Standards)',
      gradeLevel: 4,
      standardsAlignment: 'THAI',
      joinCode: 'DEMO4T',
      teacherId: teacher2Id,
    })
    .onConflictDoNothing({ target: scienceClasses.joinCode });

  console.log('  ✓ (Optional) Enhanced admin view with additional teacher and class.');

  // 2. Generate Realistic Assessment Activity

  // Lessons for grade 3 with their questions.
  const lessons = await db
    .select({
      id: scienceLessons.id,
      title: scienceLessons.title,
    })
    .from(scienceLessons)
    .where(eq(scienceLessons.gradeLevel, 3));

  const lessonIds = lessons.map((l) => l.id);
  const questionsRows = lessonIds.length
    ? await db
        .select({
          id: scienceQuizQuestions.id,
          lessonId: scienceQuizQuestions.lessonId,
        })
        .from(scienceQuizQuestions)
        .where(inArray(scienceQuizQuestions.lessonId, lessonIds))
    : [];

  const questionsByLesson = new Map<string, { id: string }[]>();
  for (const q of questionsRows) {
    const arr = questionsByLesson.get(q.lessonId) ?? [];
    arr.push({ id: q.id });
    questionsByLesson.set(q.lessonId, arr);
  }

  // Refetch class students after roster expansion.
  const studentRows = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .innerJoin(scienceClassStudents, eq(scienceClassStudents.studentId, users.id))
    .where(eq(scienceClassStudents.classId, demoClass.id));

  const students = studentRows;
  const hardLesson = lessons.find((l) => l.title.includes('Diversity'));
  const trickyQuestionIds = hardLesson
    ? (questionsByLesson.get(hardLesson.id) ?? []).slice(0, 2).map((q) => q.id)
    : [];

  // Check if activity data already exists (idempotency)
  const studentIds = students.map((s) => s.id);
  const existingAttempts = studentIds.length
    ? await db
        .select({ count: sql<number>`count(*)::int` })
        .from(scienceAttempts)
        .where(inArray(scienceAttempts.studentId, studentIds))
    : [{ count: 0 }];

  const existingAttemptCount = Number(existingAttempts[0]?.count ?? 0);

  if (existingAttemptCount > 0) {
    console.log(`  ℹ Activity data already exists (${existingAttemptCount} attempts found). Skipping generation.`);
  } else {
    for (const student of students) {
      const studentProfile = studentProfiles.find((p) =>
        student.name?.startsWith(p.profile),
      );
      if (!studentProfile) continue;

      const lessonsToComplete = studentProfile.completedLessons
        ? lessons.slice(0, studentProfile.completedLessons)
        : lessons;

      for (const lesson of lessonsToComplete) {
        for (let attemptNum = 1; attemptNum <= studentProfile.attempts; attemptNum++) {
          const lessonQuestions = questionsByLesson.get(lesson.id) ?? [];
          if (lessonQuestions.length === 0) continue;

          const startedAt = new Date();
          const completedAt = new Date();

          const [attempt] = await db
            .insert(scienceAttempts)
            .values({
              studentId: student.id,
              lessonId: lesson.id,
              attemptNumber: attemptNum,
              score: 0, // updated after responses
              maxScore: 9,
              startedAt,
              completedAt,
            })
            .returning({ id: scienceAttempts.id });

          if (!attempt) continue;

          let score = 0;
          const sampled = [...lessonQuestions]
            .sort(() => 0.5 - Math.random())
            .slice(0, 9);

          // Calculate base success rate for this attempt
          let baseSuccessRate: number;
          if (studentProfile.improving) {
            const progress = (attemptNum - 1) / (studentProfile.attempts - 1);
            baseSuccessRate =
              studentProfile.scoreRange[0] +
              progress * (studentProfile.scoreRange[1] - studentProfile.scoreRange[0]);
          } else {
            baseSuccessRate = randomInRange(
              studentProfile.scoreRange[0],
              studentProfile.scoreRange[1],
            );
          }

          const responsePayloads: Array<{
            attemptId: string;
            questionId: string;
            studentAnswer: unknown;
            isCorrect: boolean;
            timeSpentSeconds: number;
            answeredAt: Date;
          }> = [];

          for (const question of sampled) {
            let successRate = baseSuccessRate;
            if (lesson.id === hardLesson?.id) {
              successRate = Math.max(0.2, baseSuccessRate - 0.2);
            }
            if (trickyQuestionIds.includes(question.id)) {
              successRate = randomInRange(0.3, 0.4);
            }
            const isCorrect = Math.random() < successRate;
            if (isCorrect) score++;
            responsePayloads.push({
              attemptId: attempt.id,
              questionId: question.id,
              studentAnswer: '...',
              isCorrect,
              timeSpentSeconds: Math.floor(randomInRange(30, 120)),
              answeredAt: new Date(),
            });
          }

          if (responsePayloads.length > 0) {
            await db.insert(scienceQuestionResponses).values(responsePayloads);
          }

          await db
            .update(scienceAttempts)
            .set({ score })
            .where(eq(scienceAttempts.id, attempt.id));
        }
      }
    }
  }

  console.log('  ✓ Generated realistic assessment activity.');

  // 3. Ensure Accurate LessonCompletion Data
  console.log('  Updating LessonCompletion records...');

  for (const student of students) {
    const attempts = await db
      .select({
        lessonId: scienceAttempts.lessonId,
        score: scienceAttempts.score,
        maxScore: scienceAttempts.maxScore,
        completedAt: scienceAttempts.completedAt,
      })
      .from(scienceAttempts)
      .where(eq(scienceAttempts.studentId, student.id))
      .orderBy(scienceAttempts.completedAt);

    const lessonCompletions = new Map<
      string,
      {
        studentId: string;
        lessonId: string;
        status: string;
        completedAt: Date | null;
        attemptsCount: number;
        bestScore: number;
        bestScorePercentage: number;
        mostRecentScore: number;
        mostRecentScorePercentage: number;
        totalTimeSpentSeconds: number;
        lastAttemptAt: Date | null;
      }
    >();

    for (const attempt of attempts) {
      const { lessonId, score, maxScore, completedAt } = attempt;
      const percentage = (score / maxScore) * 100;

      if (!lessonCompletions.has(lessonId)) {
        lessonCompletions.set(lessonId, {
          studentId: student.id,
          lessonId,
          status: 'COMPLETED',
          completedAt,
          attemptsCount: 0,
          bestScore: 0,
          bestScorePercentage: 0,
          mostRecentScore: 0,
          mostRecentScorePercentage: 0,
          totalTimeSpentSeconds: 0,
          lastAttemptAt: completedAt,
        });
      }

      const completion = lessonCompletions.get(lessonId)!;
      completion.attemptsCount++;
      completion.mostRecentScore = score;
      completion.mostRecentScorePercentage = percentage;
      completion.lastAttemptAt = completedAt;
      if (percentage > completion.bestScorePercentage) {
        completion.bestScore = score;
        completion.bestScorePercentage = percentage;
      }
    }

    for (const completion of lessonCompletions.values()) {
      await db
        .insert(scienceLessonCompletions)
        .values(completion)
        .onConflictDoUpdate({
          target: [
            scienceLessonCompletions.studentId,
            scienceLessonCompletions.lessonId,
          ],
          set: {
            status: completion.status,
            completedAt: completion.completedAt,
            attemptsCount: completion.attemptsCount,
            bestScore: completion.bestScore,
            bestScorePercentage: completion.bestScorePercentage,
            mostRecentScore: completion.mostRecentScore,
            mostRecentScorePercentage: completion.mostRecentScorePercentage,
            totalTimeSpentSeconds: completion.totalTimeSpentSeconds,
            lastAttemptAt: completion.lastAttemptAt,
            updatedAt: new Date(),
          },
        });
    }
  }

  console.log('  ✓ Ensured accurate LessonCompletion data.');

  console.log('✅ Activity data seeding complete.\n');
}

const isDirectExecution = process.argv[1]?.includes('seed-activity-data');
if (isDirectExecution) {
  seedActivityData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ seedActivityData failed:', err);
      process.exit(1);
    });
}

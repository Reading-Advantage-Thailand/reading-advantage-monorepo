import { NextRequest, NextResponse } from 'next/server';
import { and, db, eq, inArray, count, or } from '@reading-advantage/db';
import {
  gamificationProfiles,
  scienceAttempts,
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceMasteryRuns,
  scienceQuestionResponses,
  scienceQuizQuestions,
  scienceUnitLessons,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';
import { gradeAnswer } from '@/lib/quiz/scoring';
import { calculateXpForQuiz, awardXp } from '@/lib/gamification/xp';
import { updateStreakForProfile } from '@/lib/gamification/streak';
import { checkBadgeConditions } from '@/lib/gamification/badges';
import { processMasteryRun } from '@/lib/services/mastery/mastery-worker';

/**
 * GET /api/lessons/{lessonSlug}/quiz
 * Returns a random set of N questions from the lesson's 4N question bank to
 * start a new quiz attempt.
 *
 * Authentication: Required
 * Authorization: Student must be enrolled in a class using this lesson OR
 * teacher must own the class.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ lessonSlug: string }> }
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { lessonSlug } = await context.params;

    // 1. Lesson lookup by slug OR id (URL param is named "lessonSlug" but
    //    callers may pass either the human-readable slug or the UUID id —
    //    accept both for defensive compat). Original Prisma route used `id`
    //    because Prisma `id` WAS the slug; Drizzle splits into UUID id + slug.
    const [lesson] = await db
      .select()
      .from(scienceLessons)
      .where(
        or(eq(scienceLessons.slug, lessonSlug), eq(scienceLessons.id, lessonSlug))
      )
      .limit(1);

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // 2. Authorization: find all classes that contain this lesson (via
    //    scienceUnitLessons junction → scienceCurriculumUnits → scienceClasses)
    //    and check whether the caller teaches the class or is enrolled.
    const classRows = await db
      .select({
        classId: scienceClasses.id,
        teacherId: scienceClasses.teacherId,
      })
      .from(scienceUnitLessons)
      .innerJoin(
        scienceCurriculumUnits,
        eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId)
      )
      .innerJoin(
        scienceClasses,
        eq(scienceClasses.id, scienceCurriculumUnits.classId)
      )
      .where(eq(scienceUnitLessons.lessonId, lesson.id));

    let hasAccess = classRows.some((c) => c.teacherId === session.user.id);
    if (!hasAccess && classRows.length > 0) {
      const classIds = classRows.map((c) => c.classId);
      const myEnrollments = await db
        .select({ classId: scienceClassStudents.classId })
        .from(scienceClassStudents)
        .where(
          and(
            eq(scienceClassStudents.studentId, session.user.id),
            inArray(scienceClassStudents.classId, classIds)
          )
        )
        .limit(1);
      hasAccess = myEnrollments.length > 0;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Not enrolled in class with this lesson' },
        { status: 403 }
      );
    }

    // 3. Pull the question bank (ordered).
    const quizQuestions = await db
      .select()
      .from(scienceQuizQuestions)
      .where(eq(scienceQuizQuestions.lessonId, lesson.id))
      .orderBy(scienceQuizQuestions.order);

    // 4. Validate pool size.
    const totalQuestions = quizQuestions.length;
    if (totalQuestions < 4) {
      return NextResponse.json(
        { error: 'Insufficient questions in question bank' },
        { status: 500 }
      );
    }
    const N = Math.floor(totalQuestions / 4);
    if (N === 0) {
      return NextResponse.json(
        { error: 'Insufficient questions in question bank' },
        { status: 500 }
      );
    }

    // 5. Randomly pick N.
    const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, N);

    // 6. Compute the next attempt number for this student-lesson pair.
    const [{ c: previousAttempts }] = await db
      .select({ c: count() })
      .from(scienceAttempts)
      .where(
        and(
          eq(scienceAttempts.studentId, session.user.id),
          eq(scienceAttempts.lessonId, lesson.id)
        )
      );
    const attemptNumber = previousAttempts + 1;

    // 7. Score total.
    const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);

    // 8. Create the attempt row.
    const [attempt] = await db
      .insert(scienceAttempts)
      .values({
        studentId: session.user.id,
        lessonId: lesson.id,
        maxScore: totalPoints,
        attemptNumber,
        startedAt: new Date(),
      })
      .returning();

    // 9. Ensure a lessonCompletion row exists in at least IN_PROGRESS state.
    const [existingCompletion] = await db
      .select()
      .from(scienceLessonCompletions)
      .where(
        and(
          eq(scienceLessonCompletions.studentId, session.user.id),
          eq(scienceLessonCompletions.lessonId, lesson.id)
        )
      )
      .limit(1);

    if (!existingCompletion) {
      await db.insert(scienceLessonCompletions).values({
        studentId: session.user.id,
        lessonId: lesson.id,
        status: 'IN_PROGRESS',
        attemptsCount: 0,
        lastAttemptAt: new Date(),
      });
    } else if (existingCompletion.status === 'NOT_STARTED') {
      await db
        .update(scienceLessonCompletions)
        .set({
          status: 'IN_PROGRESS',
          lastAttemptAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(scienceLessonCompletions.id, existingCompletion.id));
    }

    // 10. Response — exclude correctAnswer.
    const response = {
      quizId: attempt.id,
      lessonId: lesson.id,
      questions: selectedQuestions.map((q, index) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        points: q.points,
        order: index + 1,
      })),
      totalPoints,
      startedAt: attempt.startedAt.toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch quiz:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the quiz' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lessons/{lessonSlug}/quiz/submit
 * Submit a completed quiz attempt with question responses and timing data.
 *
 * Authentication: Required
 * Authorization: Student must be enrolled in class and quiz must belong to them
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ lessonSlug: string }> }
) {
  try {
    // lessonSlug from the URL is the lookup key for downstream routes; this
    // handler instead trusts the attempt row to identify the lesson, so we
    // intentionally read the params for parity with the route contract but
    // do not destructure them.
    void context;

    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { attemptId, responses } = body;

    if (!attemptId || !responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // 1. Load the attempt and verify ownership / not-already-submitted.
    const [attempt] = await db
      .select()
      .from(scienceAttempts)
      .where(eq(scienceAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    if (attempt.studentId !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to submit this attempt' },
        { status: 403 }
      );
    }

    if (attempt.completedAt) {
      return NextResponse.json(
        { error: 'Attempt already submitted' },
        { status: 409 }
      );
    }

    // 2. Load the lesson's question bank to grade against.
    const lessonQuestions = await db
      .select()
      .from(scienceQuizQuestions)
      .where(eq(scienceQuizQuestions.lessonId, attempt.lessonId));

    const questionMap = new Map(lessonQuestions.map((q) => [q.id, q]));

    if (responses.length === 0) {
      return NextResponse.json(
        { error: 'All questions must be answered' },
        { status: 400 }
      );
    }

    // 3. Grade.
    let totalScore = 0;
    const breakdown: {
      questionId: string;
      questionText: string;
      studentAnswer: unknown;
      correctAnswer: unknown;
      isCorrect: boolean;
      points: number;
      timeSpentSeconds: number;
    }[] = [];
    const questionResponsesToCreate: Array<typeof scienceQuestionResponses.$inferInsert> = [];

    for (const response of responses) {
      const question = questionMap.get(response.questionId);
      if (!question) {
        return NextResponse.json(
          { error: `Invalid question ID: ${response.questionId}` },
          { status: 400 }
        );
      }

      const isCorrect = gradeAnswer(
        question.type,
        response.studentAnswer,
        question.correctAnswer
      );

      const pointsEarned = isCorrect ? question.points : 0;
      totalScore += pointsEarned;

      questionResponsesToCreate.push({
        attemptId,
        questionId: question.id,
        studentAnswer: response.studentAnswer,
        isCorrect,
        timeSpentSeconds: response.timeSpentSeconds || 0,
        answeredAt: response.answeredAt
          ? new Date(response.answeredAt)
          : new Date(),
        order: response.order,
      });

      breakdown.push({
        questionId: question.id,
        questionText: question.text,
        studentAnswer: response.studentAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        points: pointsEarned,
        timeSpentSeconds: response.timeSpentSeconds || 0,
      });
    }

    const percentage = (totalScore / attempt.maxScore) * 100;

    const attemptTimeSpent = questionResponsesToCreate.reduce((sum, qr) => {
      const t = typeof qr.timeSpentSeconds === 'number' ? qr.timeSpentSeconds : 0;
      return sum + t;
    }, 0);

    // 4. Transactional write: attempt + responses + lessonCompletion upsert.
    await db.transaction(async (tx) => {
      await tx
        .update(scienceAttempts)
        .set({
          score: totalScore,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(scienceAttempts.id, attemptId));

      await tx.insert(scienceQuestionResponses).values(questionResponsesToCreate);

      const [existingCompletion] = await tx
        .select()
        .from(scienceLessonCompletions)
        .where(
          and(
            eq(scienceLessonCompletions.studentId, session.user.id),
            eq(scienceLessonCompletions.lessonId, attempt.lessonId)
          )
        )
        .limit(1);

      const now = new Date();

      if (existingCompletion) {
        const bestScore =
          existingCompletion.bestScore !== null
            ? Math.max(existingCompletion.bestScore, totalScore)
            : totalScore;
        const bestScorePercentage =
          existingCompletion.bestScorePercentage !== null
            ? Math.max(existingCompletion.bestScorePercentage, percentage)
            : percentage;

        await tx
          .update(scienceLessonCompletions)
          .set({
            attemptsCount: existingCompletion.attemptsCount + 1,
            mostRecentScore: totalScore,
            mostRecentScorePercentage: percentage,
            bestScore,
            bestScorePercentage,
            lastAttemptAt: now,
            status: 'COMPLETED',
            completedAt: now,
            totalTimeSpentSeconds:
              existingCompletion.totalTimeSpentSeconds + attemptTimeSpent,
            updatedAt: now,
          })
          .where(eq(scienceLessonCompletions.id, existingCompletion.id));
      } else {
        await tx.insert(scienceLessonCompletions).values({
          studentId: session.user.id,
          lessonId: attempt.lessonId,
          status: 'COMPLETED',
          attemptsCount: 1,
          bestScore: totalScore,
          bestScorePercentage: percentage,
          mostRecentScore: totalScore,
          mostRecentScorePercentage: percentage,
          lastAttemptAt: now,
          completedAt: now,
          totalTimeSpentSeconds: attemptTimeSpent,
        });
      }
    });

    // 5. Create MasteryRun and process mastery updates.
    await db.insert(scienceMasteryRuns).values({
      attemptId,
      studentId: session.user.id,
      status: 'PENDING',
      updatedCount: 0,
    });

    const masteryResult = await processMasteryRun({
      attemptId,
      studentId: session.user.id,
    });

    // 6. Award XP + update streak.
    const { baseXp, firstAttemptBonus, totalXp } = calculateXpForQuiz(
      percentage,
      attempt.attemptNumber
    );

    let [gamificationProfile] = await db
      .select()
      .from(gamificationProfiles)
      .where(eq(gamificationProfiles.userId, session.user.id))
      .limit(1);

    if (!gamificationProfile) {
      [gamificationProfile] = await db
        .insert(gamificationProfiles)
        .values({
          userId: session.user.id,
          xp: 0,
          level: 1,
          streak: 0,
        })
        .returning();
    }

    const xpResult = await awardXp(gamificationProfile.id, totalXp);
    const streakResult = await updateStreakForProfile(
      gamificationProfile.id,
      new Date()
    );

    const totalXpAwarded = totalXp + streakResult.milestoneBonus;

    // 7. Badge checks.
    const badgeResult = await checkBadgeConditions(session.user.id, {
      type: 'quiz_completed',
      score: percentage,
      attemptNumber: attempt.attemptNumber,
      lessonId: attempt.lessonId,
      studentId: session.user.id,
    });

    // 8. Response.
    return NextResponse.json(
      {
        attemptId,
        score: totalScore,
        maxScore: attempt.maxScore,
        percentage: parseFloat(percentage.toFixed(2)),
        attemptNumber: attempt.attemptNumber,
        completedAt: new Date().toISOString(),
        breakdown,
        mastery: {
          status: masteryResult.status,
          updatedCount: masteryResult.updatedCount,
        },
        gamification: {
          xpAwarded: totalXpAwarded,
          baseXp,
          firstAttemptBonus,
          streakMilestoneBonus: streakResult.milestoneBonus,
          currentStreak: streakResult.streak,
          level: xpResult.level,
          levelName: xpResult.levelName,
          levelUp: xpResult.levelUp,
          totalXp: xpResult.xp,
          badgesUnlocked: badgeResult.newlyUnlocked,
          achievements: badgeResult.achievements,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to submit quiz:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while submitting the quiz' },
      { status: 500 }
    );
  }
}

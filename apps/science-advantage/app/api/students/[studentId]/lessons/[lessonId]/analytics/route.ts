import { NextResponse } from 'next/server';
import { and, asc, db, desc, eq, exists, inArray } from '@reading-advantage/db';
import {
  scienceAttempts,
  scienceClassStudents,
  scienceClasses,
  scienceLessonStandards,
  scienceLessons,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandards,
  users,
} from '@reading-advantage/db/schema';

import { requireAuth } from '@/lib/auth/server';

function getColorCode(percentage: number): string {
  if (percentage >= 90) return 'blue';
  if (percentage >= 80) return 'green';
  if (percentage >= 60) return 'yellow';
  return 'red';
}

/**
 * GET /api/students/{studentId}/lessons/{lessonId}/analytics
 * Per-student, per-lesson attempt history + standards mastery.
 * Authorized for: a teacher of any class the student is enrolled in, or ADMIN.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string; lessonId: string }> }
) {
  try {
    const session = await requireAuth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, lessonId } = await params;

    // 1. Student must exist.
    const [student] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 2. Authorization: ADMIN bypass, or caller teaches a class the student
    //    is enrolled in.
    const isAdmin = session.user.role === 'ADMIN';
    let isTeacherOfStudent = false;
    if (!isAdmin) {
      const matches = await db
        .select({ classId: scienceClasses.id })
        .from(scienceClasses)
        .where(
          and(
            eq(scienceClasses.teacherId, session.user.id),
            exists(
              db
                .select({ id: scienceClassStudents.studentId })
                .from(scienceClassStudents)
                .where(
                  and(
                    eq(scienceClassStudents.classId, scienceClasses.id),
                    eq(scienceClassStudents.studentId, studentId)
                  )
                )
            )
          )
        )
        .limit(1);
      isTeacherOfStudent = matches.length > 0;
    }

    if (!isTeacherOfStudent && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to student data' },
        { status: 403 }
      );
    }

    // 3. Lesson + ordered questions.
    const [lesson] = await db
      .select()
      .from(scienceLessons)
      .where(eq(scienceLessons.id, lessonId))
      .limit(1);

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const quizQuestions = await db
      .select()
      .from(scienceQuizQuestions)
      .where(eq(scienceQuizQuestions.lessonId, lesson.id))
      .orderBy(asc(scienceQuizQuestions.order));

    const questionIds = quizQuestions.map((q) => q.id);

    // Lesson-level standards (response-only field — currently unused in body,
    // but kept for parity with the previous include shape; reading it would
    // be a future product feature).
    void scienceLessonStandards;

    // Per-question standards (used for the standards-performance breakdown).
    const questionStandardLinks = questionIds.length
      ? await db
          .select({
            questionId: scienceQuestionStandards.questionId,
            standard: scienceStandards,
          })
          .from(scienceQuestionStandards)
          .innerJoin(
            scienceStandards,
            eq(scienceStandards.id, scienceQuestionStandards.standardId)
          )
          .where(inArray(scienceQuestionStandards.questionId, questionIds))
      : [];

    const standardsByQuestion = new Map<
      string,
      Array<{ id: string; code: string; description: string }>
    >();
    for (const link of questionStandardLinks) {
      const arr = standardsByQuestion.get(link.questionId) ?? [];
      arr.push({
        id: link.standard.id,
        code: link.standard.code,
        description: link.standard.description,
      });
      standardsByQuestion.set(link.questionId, arr);
    }

    // 4. All attempts for student+lesson, newest first.
    const attempts = await db
      .select()
      .from(scienceAttempts)
      .where(
        and(
          eq(scienceAttempts.studentId, studentId),
          eq(scienceAttempts.lessonId, lessonId)
        )
      )
      .orderBy(desc(scienceAttempts.attemptNumber));

    const attemptIds = attempts.map((a) => a.id);

    // 5. Question responses for those attempts, ordered.
    const responses = attemptIds.length
      ? await db
          .select()
          .from(scienceQuestionResponses)
          .where(inArray(scienceQuestionResponses.attemptId, attemptIds))
          .orderBy(asc(scienceQuestionResponses.order))
      : [];

    const responsesByAttempt = new Map<
      string,
      typeof scienceQuestionResponses.$inferSelect[]
    >();
    for (const r of responses) {
      const arr = responsesByAttempt.get(r.attemptId) ?? [];
      arr.push(r);
      responsesByAttempt.set(r.attemptId, arr);
    }

    const questionById = new Map(quizQuestions.map((q) => [q.id, q]));

    // 6. Per-attempt history.
    const attemptHistory = attempts.map((attempt) => {
      const attemptResponses = responsesByAttempt.get(attempt.id) ?? [];
      const totalQuestions = attemptResponses.length;
      const correctAnswers = attemptResponses.filter((r) => r.isCorrect).length;
      const scorePercentage =
        totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      const totalTimeSeconds = attemptResponses.reduce(
        (sum, r) => sum + r.timeSpentSeconds,
        0
      );

      const questionBreakdown = attemptResponses.map((r, index) => {
        const q = questionById.get(r.questionId);
        return {
          questionId: r.questionId,
          questionNumber: index + 1,
          questionText: q?.text ?? '',
          questionType: q?.type ?? '',
          studentAnswer: r.studentAnswer,
          correctAnswer: q?.correctAnswer ?? null,
          isCorrect: r.isCorrect,
          timeSpentSeconds: r.timeSpentSeconds,
          points: q?.points ?? 0,
        };
      });

      return {
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt.toISOString(),
        completedAt: attempt.completedAt?.toISOString() || null,
        status: attempt.completedAt ? 'completed' : 'in_progress',
        score: attempt.score,
        maxScore: attempt.maxScore,
        scorePercentage: Math.round(scorePercentage * 10) / 10,
        totalTimeSeconds,
        colorCode: getColorCode(scorePercentage),
        questionBreakdown,
      };
    });

    // 7. Standards-performance: questionsCount from lesson; the per-student
    //    answered/correct counts come from the MOST RECENT attempt only
    //    (matches original behavior).
    const standardsMap = new Map<
      string,
      {
        standardId: string;
        standardCode: string;
        standardDescription: string;
        questionsCount: number;
        questionsAnswered: number;
        questionsCorrect: number;
      }
    >();

    for (const question of quizQuestions) {
      const standards = standardsByQuestion.get(question.id) ?? [];
      for (const std of standards) {
        let entry = standardsMap.get(std.id);
        if (!entry) {
          entry = {
            standardId: std.id,
            standardCode: std.code,
            standardDescription: std.description,
            questionsCount: 0,
            questionsAnswered: 0,
            questionsCorrect: 0,
          };
          standardsMap.set(std.id, entry);
        }
        entry.questionsCount += 1;
      }
    }

    if (attempts.length > 0) {
      const mostRecentAttemptNumber = attempts[0].attemptNumber;
      for (const attempt of attempts) {
        if (attempt.attemptNumber !== mostRecentAttemptNumber) continue;
        const attemptResponses = responsesByAttempt.get(attempt.id) ?? [];
        for (const r of attemptResponses) {
          const standards = standardsByQuestion.get(r.questionId) ?? [];
          for (const std of standards) {
            const entry = standardsMap.get(std.id);
            if (entry) {
              entry.questionsAnswered += 1;
              if (r.isCorrect) entry.questionsCorrect += 1;
            }
          }
        }
      }
    }

    const standardsPerformance = Array.from(standardsMap.values()).map(
      (entry) => {
        const masteryPercentage =
          entry.questionsAnswered > 0
            ? (entry.questionsCorrect / entry.questionsAnswered) * 100
            : 0;
        return {
          standardId: entry.standardId,
          standardCode: entry.standardCode,
          standardDescription: entry.standardDescription,
          questionsCount: entry.questionsCount,
          questionsAnswered: entry.questionsAnswered,
          questionsCorrect: entry.questionsCorrect,
          masteryPercentage: Math.round(masteryPercentage * 10) / 10,
          colorCode: getColorCode(masteryPercentage),
        };
      }
    );

    return NextResponse.json({
      student: { id: student.id, name: student.name },
      lesson: { id: lesson.id, title: lesson.title, order: lesson.order },
      attemptHistory,
      standardsPerformance,
    });
  } catch (error) {
    console.error('Error fetching student-lesson analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

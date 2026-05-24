import { NextResponse } from 'next/server';
import { and, db, eq, exists, inArray } from '@reading-advantage/db';
import {
  scienceAttempts,
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessonStandards,
  scienceLessons,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandards,
  scienceUnitLessons,
  users,
} from '@reading-advantage/db/schema';

import { requireAuth } from '@/lib/auth/server';

function getColorCode(percentage: number): string {
  if (percentage >= 90) return 'blue';
  if (percentage >= 80) return 'green';
  if (percentage >= 60) return 'yellow';
  return 'red';
}

function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * GET /api/classes/{classId}/lessons/{lessonId}/analytics
 * Per-lesson student + question + standards analytics. Teacher (owner) or
 * ADMIN only. The lesson must be part of the class's curriculum.
 */
export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ classId: string; lessonId: string }> }
) {
  try {
    const session = await requireAuth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId, lessonId } = await params;

    // 1. Class + students (id + name) for the response and authz.
    const [classRecord] = await db
      .select()
      .from(scienceClasses)
      .where(eq(scienceClasses.id, classId))
      .limit(1);

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const isTeacherOwner = classRecord.teacherId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isTeacherOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to class analytics' },
        { status: 403 }
      );
    }

    const studentRows = await db
      .select({ id: users.id, name: users.name })
      .from(scienceClassStudents)
      .innerJoin(users, eq(users.id, scienceClassStudents.studentId))
      .where(eq(scienceClassStudents.classId, classId));

    // 2. Lesson must belong to a curriculum unit of this class.
    const [lesson] = await db
      .select()
      .from(scienceLessons)
      .where(
        and(
          eq(scienceLessons.id, lessonId),
          exists(
            db
              .select({ id: scienceUnitLessons.lessonId })
              .from(scienceUnitLessons)
              .innerJoin(
                scienceCurriculumUnits,
                eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId)
              )
              .where(
                and(
                  eq(scienceUnitLessons.lessonId, scienceLessons.id),
                  eq(scienceCurriculumUnits.classId, classId)
                )
              )
          )
        )
      )
      .limit(1);

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found in this class' },
        { status: 404 }
      );
    }

    // Lesson-level standards + per-question standards.
    const lessonStandards = await db
      .select({
        id: scienceStandards.id,
        code: scienceStandards.code,
        description: scienceStandards.description,
      })
      .from(scienceLessonStandards)
      .innerJoin(
        scienceStandards,
        eq(scienceStandards.id, scienceLessonStandards.standardId)
      )
      .where(eq(scienceLessonStandards.lessonId, lesson.id));

    const quizQuestions = await db
      .select()
      .from(scienceQuizQuestions)
      .where(eq(scienceQuizQuestions.lessonId, lesson.id))
      .orderBy(scienceQuizQuestions.order);

    const questionIds = quizQuestions.map((q) => q.id);
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
    for (const row of questionStandardLinks) {
      const arr = standardsByQuestion.get(row.questionId) ?? [];
      arr.push({
        id: row.standard.id,
        code: row.standard.code,
        description: row.standard.description,
      });
      standardsByQuestion.set(row.questionId, arr);
    }

    // 3. Lesson completions for students enrolled in this class.
    const studentIds = studentRows.map((s) => s.id);
    const lessonCompletions =
      studentIds.length > 0
        ? await db
            .select({
              completion: scienceLessonCompletions,
              student: { id: users.id, name: users.name },
            })
            .from(scienceLessonCompletions)
            .innerJoin(
              users,
              eq(users.id, scienceLessonCompletions.studentId)
            )
            .where(
              and(
                eq(scienceLessonCompletions.lessonId, lesson.id),
                inArray(scienceLessonCompletions.studentId, studentIds)
              )
            )
        : [];

    // 4. Question responses for these students + this lesson.
    const questionResponseRows =
      studentIds.length > 0 && questionIds.length > 0
        ? await db
            .select({
              response: scienceQuestionResponses,
              attempt: {
                studentId: scienceAttempts.studentId,
              },
              student: { id: users.id, name: users.name },
            })
            .from(scienceQuestionResponses)
            .innerJoin(
              scienceAttempts,
              eq(scienceAttempts.id, scienceQuestionResponses.attemptId)
            )
            .innerJoin(users, eq(users.id, scienceAttempts.studentId))
            .where(
              and(
                inArray(scienceQuestionResponses.questionId, questionIds),
                inArray(scienceAttempts.studentId, studentIds)
              )
            )
        : [];

    // 5. Class-level statistics.
    const totalStudents = studentRows.length;
    const studentsCompleted = lessonCompletions.filter(
      (lc) => lc.completion.status === 'COMPLETED'
    ).length;
    const completionRate =
      totalStudents > 0 ? (studentsCompleted / totalStudents) * 100 : 0;

    const completedRows = lessonCompletions.filter(
      (lc) => lc.completion.status === 'COMPLETED'
    );
    const averageScore =
      completedRows.length > 0
        ? completedRows.reduce(
            (sum, lc) => sum + (lc.completion.mostRecentScore || 0),
            0
          ) / completedRows.length
        : 0;
    const averageScorePercentage =
      completedRows.length > 0
        ? completedRows.reduce(
            (sum, lc) => sum + (lc.completion.mostRecentScorePercentage || 0),
            0
          ) / completedRows.length
        : 0;

    // 6. Per-student performance row.
    const completionByStudent = new Map(
      lessonCompletions.map((lc) => [lc.completion.studentId, lc.completion])
    );
    const studentsData = studentRows.map((student) => {
      const completion = completionByStudent.get(student.id);
      return {
        studentId: student.id,
        studentName: student.name,
        completionStatus: completion?.status || 'NOT_STARTED',
        mostRecentScore: completion?.mostRecentScore ?? null,
        mostRecentScorePercentage:
          completion?.mostRecentScorePercentage ?? null,
        bestScore: completion?.bestScore ?? null,
        bestScorePercentage: completion?.bestScorePercentage ?? null,
        attempts: completion?.attemptsCount || 0,
        totalTimeSeconds: completion?.totalTimeSpentSeconds || 0,
        colorCode:
          completion?.mostRecentScorePercentage !== null &&
          completion?.mostRecentScorePercentage !== undefined
            ? getColorCode(completion.mostRecentScorePercentage)
            : null,
      };
    });

    // 7. Per-question analytics.
    const questionAnalytics = quizQuestions.map((question, index) => {
      const responses = questionResponseRows.filter(
        (r) => r.response.questionId === question.id
      );
      const correctResponses = responses.filter((r) => r.response.isCorrect);
      const incorrectResponses = responses.filter((r) => !r.response.isCorrect);

      const percentCorrect =
        responses.length > 0
          ? (correctResponses.length / responses.length) * 100
          : 0;

      const averageTimeSeconds =
        responses.length > 0
          ? responses.reduce((sum, r) => sum + r.response.timeSpentSeconds, 0) /
            responses.length
          : 0;

      // Unique students who got it wrong, sorted by name.
      const incorrectStudentIds = new Set(
        incorrectResponses.map((r) => r.attempt.studentId)
      );
      const incorrectStudents = Array.from(incorrectStudentIds)
        .map((sid) => {
          const r = incorrectResponses.find(
            (rr) => rr.attempt.studentId === sid
          );
          return r?.student.name ?? '';
        })
        .filter(Boolean)
        .sort();

      return {
        questionId: question.id,
        questionNumber: index + 1,
        questionTextTruncated: truncateText(question.text),
        questionType: question.type,
        percentCorrect: Math.round(percentCorrect * 10) / 10,
        averageTimeSeconds: Math.round(averageTimeSeconds),
        totalResponses: responses.length,
        correctResponses: correctResponses.length,
        incorrectStudents,
      };
    });

    questionAnalytics.sort((a, b) => a.percentCorrect - b.percentCorrect);

    // 8. Per-standard analytics derived from question-standard junction.
    const standardsAccumulator = new Map<
      string,
      {
        standardId: string;
        standardCode: string;
        standardDescription: string;
        questionsCount: number;
        responses: Array<{ studentId: string; isCorrect: boolean }>;
      }
    >();

    for (const question of quizQuestions) {
      const standards = standardsByQuestion.get(question.id) ?? [];
      for (const std of standards) {
        let entry = standardsAccumulator.get(std.id);
        if (!entry) {
          entry = {
            standardId: std.id,
            standardCode: std.code,
            standardDescription: std.description,
            questionsCount: 0,
            responses: [],
          };
          standardsAccumulator.set(std.id, entry);
        }
        entry.questionsCount += 1;

        const responsesForQuestion = questionResponseRows.filter(
          (r) => r.response.questionId === question.id
        );
        for (const r of responsesForQuestion) {
          entry.responses.push({
            studentId: r.attempt.studentId,
            isCorrect: r.response.isCorrect,
          });
        }
      }
    }

    const standardsAnalytics = Array.from(standardsAccumulator.values()).map(
      (entry) => {
        const studentAggregate = new Map<string, { correct: number; total: number }>();
        for (const r of entry.responses) {
          const stats = studentAggregate.get(r.studentId) ?? {
            correct: 0,
            total: 0,
          };
          stats.total += 1;
          if (r.isCorrect) stats.correct += 1;
          studentAggregate.set(r.studentId, stats);
        }

        let studentsMastered = 0;
        for (const stats of studentAggregate.values()) {
          const pct = (stats.correct / stats.total) * 100;
          if (pct >= 80) studentsMastered += 1;
        }

        const percentMastered =
          studentAggregate.size > 0
            ? (studentsMastered / studentAggregate.size) * 100
            : 0;

        return {
          standardId: entry.standardId,
          standardCode: entry.standardCode,
          standardDescription: entry.standardDescription,
          questionsCount: entry.questionsCount,
          studentsMastered,
          percentMastered: Math.round(percentMastered * 10) / 10,
          flagForReteach: percentMastered < 70,
          colorCode: getColorCode(percentMastered),
        };
      }
    );

    return NextResponse.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
      },
      standards: lessonStandards.map((s) => ({
        code: s.code,
        description: s.description,
      })),
      classStats: {
        totalStudents,
        studentsCompleted,
        completionRate: Math.round(completionRate * 10) / 10,
        averageScore: Math.round(averageScore * 10) / 10,
        averageScorePercentage: Math.round(averageScorePercentage * 10) / 10,
      },
      students: studentsData,
      questions: questionAnalytics,
      standardsPerformance: standardsAnalytics,
    });
  } catch (error) {
    console.error('Error fetching lesson analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

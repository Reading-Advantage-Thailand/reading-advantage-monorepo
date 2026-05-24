import { NextResponse } from 'next/server';
import { and, asc, db, desc, eq, inArray, isNotNull } from '@reading-advantage/db';
import {
  scienceAttempts,
  scienceClassStudents,
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessonStandards,
  scienceLessons,
  scienceQuestionResponses,
  scienceQuestionStandards,
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

/**
 * GET /api/students/{studentId}/classes/{classId}/analytics
 * Per-student, per-class summary: lessons performance + standards mastery.
 * Authorized for: the owning teacher or ADMIN. Student must be enrolled.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string; classId: string }> }
) {
  try {
    const session = await requireAuth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, classId } = await params;

    // 1. Class metadata + authz.
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
        { error: 'Unauthorized access to student analytics' },
        { status: 403 }
      );
    }

    // 2. Student must be enrolled in this class.
    const [enrollment] = await db
      .select({ id: users.id, name: users.name })
      .from(scienceClassStudents)
      .innerJoin(users, eq(users.id, scienceClassStudents.studentId))
      .where(
        and(
          eq(scienceClassStudents.classId, classId),
          eq(scienceClassStudents.studentId, studentId)
        )
      )
      .limit(1);

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this class' },
        { status: 403 }
      );
    }

    // 3. Lessons attached to this class (de-duped, ordered).
    const lessonRows = await db
      .select({ lesson: scienceLessons })
      .from(scienceLessons)
      .innerJoin(
        scienceUnitLessons,
        eq(scienceUnitLessons.lessonId, scienceLessons.id)
      )
      .innerJoin(
        scienceCurriculumUnits,
        eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId)
      )
      .where(eq(scienceCurriculumUnits.classId, classId))
      .orderBy(asc(scienceLessons.order));

    const lessons = Array.from(
      new Map(lessonRows.map((r) => [r.lesson.id, r.lesson])).values()
    ).sort((a, b) => a.order - b.order);

    const lessonIds = lessons.map((l) => l.id);

    // 4. Lesson completions for this student, scoped to these lessons.
    const completions = lessonIds.length
      ? await db
          .select()
          .from(scienceLessonCompletions)
          .where(
            and(
              eq(scienceLessonCompletions.studentId, studentId),
              inArray(scienceLessonCompletions.lessonId, lessonIds)
            )
          )
      : [];
    const completionByLesson = new Map(
      completions.map((c) => [c.lessonId, c])
    );

    // 5. Completed attempts (desc by completedAt) for the same set of lessons.
    const completedAttempts = lessonIds.length
      ? await db
          .select()
          .from(scienceAttempts)
          .where(
            and(
              eq(scienceAttempts.studentId, studentId),
              inArray(scienceAttempts.lessonId, lessonIds),
              isNotNull(scienceAttempts.completedAt)
            )
          )
          .orderBy(desc(scienceAttempts.completedAt))
      : [];

    // Group attempts by lessonId. Order preserved (already desc by
    // completedAt), so attempts[0] for a lesson is "most recent".
    const attemptsByLesson = new Map<string, typeof completedAttempts>();
    for (const a of completedAttempts) {
      const arr = attemptsByLesson.get(a.lessonId) ?? [];
      arr.push(a);
      attemptsByLesson.set(a.lessonId, arr);
    }

    // 6. Question responses for the most-recent attempt per lesson (only
    //    those are used for standards mastery aggregation below).
    const mostRecentAttemptIds = Array.from(attemptsByLesson.values())
      .map((arr) => arr[0]?.id)
      .filter((v): v is string => Boolean(v));

    const recentResponses = mostRecentAttemptIds.length
      ? await db
          .select({
            attemptId: scienceQuestionResponses.attemptId,
            questionId: scienceQuestionResponses.questionId,
            isCorrect: scienceQuestionResponses.isCorrect,
          })
          .from(scienceQuestionResponses)
          .where(
            inArray(scienceQuestionResponses.attemptId, mostRecentAttemptIds)
          )
      : [];

    // 7. Lesson-level standards (used to initialize the standardsMap) and
    //    per-question standards (used for the response aggregation).
    const lessonStandardLinks = lessonIds.length
      ? await db
          .select({
            lessonId: scienceLessonStandards.lessonId,
            standard: scienceStandards,
          })
          .from(scienceLessonStandards)
          .innerJoin(
            scienceStandards,
            eq(scienceStandards.id, scienceLessonStandards.standardId)
          )
          .where(inArray(scienceLessonStandards.lessonId, lessonIds))
      : [];

    const responseQuestionIds = recentResponses.map((r) => r.questionId);
    const questionStandardLinks = responseQuestionIds.length
      ? await db
          .select({
            questionId: scienceQuestionStandards.questionId,
            standardId: scienceQuestionStandards.standardId,
          })
          .from(scienceQuestionStandards)
          .where(
            inArray(scienceQuestionStandards.questionId, responseQuestionIds)
          )
      : [];
    const standardsByQuestion = new Map<string, string[]>();
    for (const link of questionStandardLinks) {
      const arr = standardsByQuestion.get(link.questionId) ?? [];
      arr.push(link.standardId);
      standardsByQuestion.set(link.questionId, arr);
    }

    // 8. Build the lessonsPerformance table.
    const lessonsPerformance = lessons.map((lesson) => {
      const completion = completionByLesson.get(lesson.id);
      const completionStatus =
        completion?.status === 'COMPLETED'
          ? 'completed'
          : completion?.status === 'IN_PROGRESS'
            ? 'in_progress'
            : 'not_started';
      const mostRecentScore = completion?.mostRecentScorePercentage ?? null;
      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonOrder: lesson.order,
        completionStatus,
        mostRecentScore,
        mostRecentScorePercentage: mostRecentScore,
        attemptsCount: completion?.attemptsCount ?? 0,
        totalTimeSeconds: completion?.totalTimeSpentSeconds ?? 0,
        colorCode:
          mostRecentScore !== null ? getColorCode(mostRecentScore) : null,
      };
    });

    // 9. Summary.
    const completedLessons = lessonsPerformance.filter(
      (lp) => lp.completionStatus === 'completed'
    );
    const lessonsCompleted = completedLessons.length;
    const averageScore =
      completedLessons.length > 0
        ? completedLessons.reduce(
            (sum, lp) => sum + (lp.mostRecentScore || 0),
            0
          ) / completedLessons.length
        : 0;
    const totalTimeSpent = lessonsPerformance.reduce(
      (sum, lp) => sum + lp.totalTimeSeconds,
      0
    );
    const totalAttempts = lessonsPerformance.reduce(
      (sum, lp) => sum + lp.attemptsCount,
      0
    );

    // 10. Standards mastery map seeded from lesson-level standards, then
    //     populated with responses from the MOST RECENT attempt per lesson.
    const standardsMap = new Map<
      string,
      {
        standardId: string;
        standardCode: string;
        standardDescription: string;
        questionsAnswered: number;
        questionsCorrect: number;
      }
    >();

    for (const link of lessonStandardLinks) {
      if (!standardsMap.has(link.standard.id)) {
        standardsMap.set(link.standard.id, {
          standardId: link.standard.id,
          standardCode: link.standard.code,
          standardDescription: link.standard.description,
          questionsAnswered: 0,
          questionsCorrect: 0,
        });
      }
    }

    for (const lesson of lessons) {
      const lessonAttempts = attemptsByLesson.get(lesson.id) ?? [];
      if (lessonAttempts.length === 0) continue;
      const mostRecent = lessonAttempts[0];
      const responsesForAttempt = recentResponses.filter(
        (r) => r.attemptId === mostRecent.id
      );

      for (const r of responsesForAttempt) {
        const standardIds = standardsByQuestion.get(r.questionId) ?? [];
        for (const sid of standardIds) {
          const entry = standardsMap.get(sid);
          if (entry) {
            entry.questionsAnswered += 1;
            if (r.isCorrect) entry.questionsCorrect += 1;
          }
        }
      }
    }

    const standardsPerformance = Array.from(standardsMap.values())
      .map((entry) => {
        const masteryPercentage =
          entry.questionsAnswered > 0
            ? (entry.questionsCorrect / entry.questionsAnswered) * 100
            : 0;
        return {
          standardId: entry.standardId,
          standardCode: entry.standardCode,
          standardDescription: entry.standardDescription,
          questionsAnswered: entry.questionsAnswered,
          questionsCorrect: entry.questionsCorrect,
          masteryPercentage: Math.round(masteryPercentage * 10) / 10,
          colorCode: getColorCode(masteryPercentage),
          needsIntervention: masteryPercentage < 60,
        };
      })
      .sort((a, b) => a.masteryPercentage - b.masteryPercentage);

    return NextResponse.json({
      student: { id: enrollment.id, name: enrollment.name },
      class: {
        id: classRecord.id,
        name: classRecord.name,
        gradeLevel: classRecord.gradeLevel,
        standardsAlignment: classRecord.standardsAlignment,
      },
      summary: {
        lessonsCompleted,
        totalLessons: lessons.length,
        averageScore: Math.round(averageScore * 10) / 10,
        averageScorePercentage: Math.round(averageScore * 10) / 10,
        totalTimeSpent,
        totalAttempts,
        colorCode: getColorCode(averageScore),
      },
      lessonsPerformance,
      standardsPerformance,
    });
  } catch (error) {
    console.error('Error fetching student class analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

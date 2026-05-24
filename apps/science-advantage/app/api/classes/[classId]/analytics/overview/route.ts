import { NextResponse } from 'next/server';
import { and, count, db, eq, inArray } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceUnitLessons,
} from '@reading-advantage/db/schema';

import { requireAuth } from '@/lib/auth/server';

function getColorCode(averageScore: number): string {
  if (averageScore >= 90) return 'blue';
  if (averageScore >= 80) return 'green';
  if (averageScore >= 60) return 'yellow';
  return 'red';
}

/**
 * GET /api/classes/{classId}/analytics/overview
 * Per-lesson aggregate analytics for a class. Teacher (owner) or ADMIN only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await requireAuth();
    const { classId } = await params;

    // Verify class exists.
    const [classRecord] = await db
      .select()
      .from(scienceClasses)
      .where(eq(scienceClasses.id, classId))
      .limit(1);

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Authorization: owning teacher or ADMIN.
    const isTeacherOwner = classRecord.teacherId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isTeacherOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to class analytics' },
        { status: 403 }
      );
    }

    // Class size (enrolled students).
    const [{ c: totalStudents }] = await db
      .select({ c: count() })
      .from(scienceClassStudents)
      .where(eq(scienceClassStudents.classId, classId));

    const enrolledStudentRows = await db
      .select({ studentId: scienceClassStudents.studentId })
      .from(scienceClassStudents)
      .where(eq(scienceClassStudents.classId, classId));
    const enrolledStudentIds = enrolledStudentRows.map((r) => r.studentId);

    // All lessons attached to this class (via unit → unitLesson → lesson).
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
      .orderBy(scienceLessons.order);

    // De-dupe lessons (a lesson can be linked to multiple units in theory).
    const lessons = Array.from(
      new Map(lessonRows.map((r) => [r.lesson.id, r.lesson])).values()
    ).sort((a, b) => a.order - b.order);

    // Pull all completions for this class's lessons by its enrolled students
    // in a single round-trip; then aggregate per-lesson in memory.
    const lessonIds = lessons.map((l) => l.id);
    const completions =
      lessonIds.length > 0 && enrolledStudentIds.length > 0
        ? await db
            .select()
            .from(scienceLessonCompletions)
            .where(
              and(
                inArray(scienceLessonCompletions.lessonId, lessonIds),
                inArray(scienceLessonCompletions.studentId, enrolledStudentIds)
              )
            )
        : [];

    const completionsByLesson = new Map<
      string,
      typeof scienceLessonCompletions.$inferSelect[]
    >();
    for (const c of completions) {
      const arr = completionsByLesson.get(c.lessonId) ?? [];
      arr.push(c);
      completionsByLesson.set(c.lessonId, arr);
    }

    const lessonsAnalytics = lessons.map((lesson) => {
      const lessonCompletions = completionsByLesson.get(lesson.id) ?? [];

      const studentsCompleted = lessonCompletions.filter(
        (lc) => lc.status === 'COMPLETED'
      ).length;

      const completionRate =
        totalStudents > 0 ? (studentsCompleted / totalStudents) * 100 : 0;

      const completedLessons = lessonCompletions.filter(
        (lc) => lc.status === 'COMPLETED'
      );

      const averageScore =
        completedLessons.length > 0
          ? completedLessons.reduce(
              (sum, lc) => sum + (lc.mostRecentScorePercentage || 0),
              0
            ) / completedLessons.length
          : 0;

      const averageAttempts =
        completedLessons.length > 0
          ? completedLessons.reduce((sum, lc) => sum + lc.attemptsCount, 0) /
            completedLessons.length
          : 0;

      const averageTimeSeconds =
        completedLessons.length > 0
          ? completedLessons.reduce(
              (sum, lc) => sum + lc.totalTimeSpentSeconds,
              0
            ) / completedLessons.length
          : 0;

      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonOrder: lesson.order,
        completionRate: Math.round(completionRate * 10) / 10,
        studentsCompleted,
        averageScore: Math.round(averageScore * 10) / 10,
        averageScorePercentage: Math.round(averageScore * 10) / 10,
        averageAttempts: Math.round(averageAttempts * 10) / 10,
        averageTimeSeconds: Math.round(averageTimeSeconds),
        colorCode: getColorCode(averageScore),
      };
    });

    return NextResponse.json({
      classId,
      className: classRecord.name,
      totalStudents,
      lessons: lessonsAnalytics,
    });
  } catch (error) {
    console.error('Error fetching class analytics overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

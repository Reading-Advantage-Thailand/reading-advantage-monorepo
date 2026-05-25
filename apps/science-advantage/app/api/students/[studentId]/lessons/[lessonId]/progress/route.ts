import { NextRequest, NextResponse } from 'next/server';
import { and, db, eq, exists, or } from '@reading-advantage/db';
import {
  scienceClassStudents,
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceUnitLessons,
  users,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ studentId: string; lessonId: string }> }
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { studentId: requestedStudentId, lessonId } = await context.params;
    const targetStudentId =
      requestedStudentId === 'me' ? session.user.id : requestedStudentId;

    // 1. Target student exists.
    const [student] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetStudentId))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 2. Lesson must exist. URL param is named `lessonId` but callers may
    //    pass either the UUID id or the human-readable slug (e.g. the
    //    student lesson page uses the slug from its own URL). Accept both.
    const [lesson] = await db
      .select({ id: scienceLessons.id })
      .from(scienceLessons)
      .where(
        or(eq(scienceLessons.id, lessonId), eq(scienceLessons.slug, lessonId))
      )
      .limit(1);

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Resolve to the canonical UUID for downstream queries.
    const resolvedLessonId = lesson.id;

    // 3. Authorization: caller is the student themselves OR caller is a
    //    teacher of a class that contains both this lesson AND the target
    //    student.
    const isSelf = targetStudentId === session.user.id;

    let authorizedViaClass = false;
    if (!isSelf) {
      const matches = await db
        .select({ classId: scienceClasses.id })
        .from(scienceClasses)
        .where(
          and(
            eq(scienceClasses.teacherId, session.user.id),
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
                    eq(scienceCurriculumUnits.classId, scienceClasses.id),
                    eq(scienceUnitLessons.lessonId, resolvedLessonId)
                  )
                )
            ),
            exists(
              db
                .select({ id: scienceClassStudents.studentId })
                .from(scienceClassStudents)
                .where(
                  and(
                    eq(scienceClassStudents.classId, scienceClasses.id),
                    eq(scienceClassStudents.studentId, targetStudentId)
                  )
                )
            )
          )
        )
        .limit(1);
      authorizedViaClass = matches.length > 0;
    }

    if (!isSelf && !authorizedViaClass) {
      return NextResponse.json(
        { error: 'Not authorized to view progress' },
        { status: 403 }
      );
    }

    // 4. Completion (may not exist yet).
    const [completion] = await db
      .select()
      .from(scienceLessonCompletions)
      .where(
        and(
          eq(scienceLessonCompletions.studentId, targetStudentId),
          eq(scienceLessonCompletions.lessonId, resolvedLessonId)
        )
      )
      .limit(1);

    return NextResponse.json(
      {
        studentId: targetStudentId,
        lessonId,
        status: completion?.status ?? 'NOT_STARTED',
        attemptsCount: completion?.attemptsCount ?? 0,
        bestScore: completion?.bestScore ?? null,
        bestScorePercentage: completion?.bestScorePercentage ?? null,
        mostRecentScore: completion?.mostRecentScore ?? null,
        mostRecentScorePercentage:
          completion?.mostRecentScorePercentage ?? null,
        totalTimeSpentSeconds: completion?.totalTimeSpentSeconds ?? 0,
        lastAttemptAt: completion?.lastAttemptAt?.toISOString() ?? null,
        completedAt: completion?.completedAt?.toISOString() ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch lesson progress:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching progress' },
      { status: 500 }
    );
  }
}

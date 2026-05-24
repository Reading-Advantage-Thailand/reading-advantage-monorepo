import { NextRequest, NextResponse } from 'next/server';
import { and, db, eq, inArray } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceUnitLessons,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';

/**
 * GET /api/classes/{classId}/curriculum
 * Returns the curriculum for a given class, organized by units and lessons.
 *
 * Authentication: Required (student must be enrolled OR teacher owns class)
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { classId } = await context.params;

    // 1. Fetch the class.
    const [classRecord] = await db
      .select()
      .from(scienceClasses)
      .where(eq(scienceClasses.id, classId))
      .limit(1);

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // 2. Authorization: teacher OR enrolled student.
    const isTeacher = classRecord.teacherId === session.user.id;
    let isEnrolledStudent = false;
    if (!isTeacher) {
      const enrollment = await db
        .select({ studentId: scienceClassStudents.studentId })
        .from(scienceClassStudents)
        .where(
          and(
            eq(scienceClassStudents.classId, classId),
            eq(scienceClassStudents.studentId, session.user.id)
          )
        )
        .limit(1);
      isEnrolledStudent = enrollment.length > 0;
    }

    if (!isTeacher && !isEnrolledStudent) {
      return NextResponse.json(
        { error: 'Not enrolled in this class' },
        { status: 403 }
      );
    }

    // 3. Curriculum units for this class, ordered.
    const units = await db
      .select()
      .from(scienceCurriculumUnits)
      .where(eq(scienceCurriculumUnits.classId, classId))
      .orderBy(scienceCurriculumUnits.order);

    // 4. Lessons per unit via the junction. One query joins units → lessons.
    const unitIds = units.map((u) => u.id);
    const unitLessonRows = unitIds.length
      ? await db
          .select({
            unitId: scienceUnitLessons.unitId,
            lesson: scienceLessons,
          })
          .from(scienceUnitLessons)
          .innerJoin(
            scienceLessons,
            eq(scienceLessons.id, scienceUnitLessons.lessonId)
          )
          .where(inArray(scienceUnitLessons.unitId, unitIds))
      : [];

    // Group lessons by unitId, then sort each by lesson.order to match the
    // original `orderBy: { order: 'asc' }` Prisma include.
    const lessonsByUnit = new Map<string, typeof scienceLessons.$inferSelect[]>();
    for (const row of unitLessonRows) {
      const arr = lessonsByUnit.get(row.unitId) ?? [];
      arr.push(row.lesson);
      lessonsByUnit.set(row.unitId, arr);
    }
    for (const arr of lessonsByUnit.values()) {
      arr.sort((a, b) => a.order - b.order);
    }

    // 5. Caller's lesson completions for all touched lesson ids.
    const allLessonIds = unitLessonRows.map((r) => r.lesson.id);
    const completions = allLessonIds.length
      ? await db
          .select()
          .from(scienceLessonCompletions)
          .where(
            and(
              eq(scienceLessonCompletions.studentId, session.user.id),
              inArray(scienceLessonCompletions.lessonId, allLessonIds)
            )
          )
      : [];

    const completionByLesson = new Map(
      completions.map((c) => [c.lessonId, c])
    );

    // 6. Shape the response (parity with previous Prisma version).
    const response = {
      class: {
        id: classRecord.id,
        name: classRecord.name,
        gradeLevel: classRecord.gradeLevel,
        standardsAlignment: classRecord.standardsAlignment,
      },
      units: units.map((unit) => ({
        id: unit.id,
        title: unit.title,
        titleThai: unit.title, // TODO: Thai translations when schema supports it
        order: unit.order,
        lessons: (lessonsByUnit.get(unit.id) ?? []).map((lesson) => {
          const progress = completionByLesson.get(lesson.id);
          const status = progress?.status ?? 'NOT_STARTED';
          return {
            id: lesson.id,
            slug: lesson.id, // TODO: Use slug field when schema supports it
            title: lesson.title,
            titleThai: lesson.titleThai ?? lesson.title,
            order: lesson.order,
            completed: status === 'COMPLETED',
            started: status !== 'NOT_STARTED',
            progress: {
              status,
              attemptsCount: progress?.attemptsCount ?? 0,
              mostRecentScore: progress?.mostRecentScore ?? null,
              mostRecentScorePercentage:
                progress?.mostRecentScorePercentage ?? null,
              bestScore: progress?.bestScore ?? null,
              bestScorePercentage: progress?.bestScorePercentage ?? null,
              lastAttemptAt: progress?.lastAttemptAt?.toISOString() ?? null,
              completedAt: progress?.completedAt?.toISOString() ?? null,
            },
          };
        }),
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch curriculum:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the curriculum' },
      { status: 500 }
    );
  }
}

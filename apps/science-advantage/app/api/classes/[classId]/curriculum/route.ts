import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

/**
 * GET /api/classes/{classId}/curriculum
 * Returns the curriculum for a given class, organized by units and lessons.
 *
 * Authentication: Required (student must be enrolled OR teacher owns class)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Get classId from params
    const { classId } = await context.params;

    // 3. Fetch the class with authorization check
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          select: {
            id: true,
          },
        },
        students: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!classRecord) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // 4. Authorization: Check if user is teacher or enrolled student
    const isTeacher = classRecord.teacher.id === session.user.id;
    const isEnrolledStudent = classRecord.students.some(
      student => student.id === session.user.id
    );

    if (!isTeacher && !isEnrolledStudent) {
      return NextResponse.json(
        { error: 'Not enrolled in this class' },
        { status: 403 }
      );
    }

    // 5. Fetch curriculum units with lessons
    const units = await prisma.curriculumUnit.findMany({
      where: {
        classId,
      },
      include: {
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    // 6. Gather lesson completions for current student (if applicable)
    const lessonIds = units.flatMap(unit => unit.lessons.map(lesson => lesson.id));
    const completions =
      lessonIds.length === 0
        ? []
        : await prisma.lessonCompletion.findMany({
          where: {
            studentId: session.user.id,
            lessonId: { in: lessonIds },
          },
        });

    const lessonsProgressMap = new Map(
      completions.map(completion => [completion.lessonId, completion])
    );

    // 7. Format response according to API contract
    const response = {
      class: {
        id: classRecord.id,
        name: classRecord.name,
        gradeLevel: classRecord.gradeLevel,
        standardsAlignment: classRecord.standardsAlignment,
      },
      units: units.map(unit => ({
        id: unit.id,
        title: unit.title,
        titleThai: unit.title, // TODO: Add Thai translations when schema supports it
        order: unit.order,
        lessons: unit.lessons.map(lesson => {
          const progress = lessonsProgressMap.get(lesson.id);
          const status = progress?.status ?? 'NOT_STARTED';
          const mostRecentScorePercentage = progress?.mostRecentScorePercentage ?? null;
          const mostRecentScore = progress?.mostRecentScore ?? null;
          const bestScorePercentage = progress?.bestScorePercentage ?? null;
          const bestScore = progress?.bestScore ?? null;
          const attemptsCount = progress?.attemptsCount ?? 0;

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
              attemptsCount,
              mostRecentScore,
              mostRecentScorePercentage,
              bestScore,
              bestScorePercentage,
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

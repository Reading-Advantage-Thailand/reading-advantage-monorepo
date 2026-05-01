import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

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
    const targetStudentId = requestedStudentId === 'me' ? session.user.id : requestedStudentId;

    const student = await prisma.user.findUnique({
      where: { id: targetStudentId },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        curriculumUnits: {
          include: {
            class: {
              include: {
                teacher: { select: { id: true } },
                students: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const isSelf = targetStudentId === session.user.id;

    const authorizedViaClass = lesson.curriculumUnits.some(unit => {
      const isTeacher = unit.class.teacher.id === session.user.id;
      const studentInClass = unit.class.students.some(s => s.id === targetStudentId);
      return isTeacher && studentInClass;
    });

    if (!isSelf && !authorizedViaClass) {
      return NextResponse.json({ error: 'Not authorized to view progress' }, { status: 403 });
    }

    const completion = await prisma.lessonCompletion.findUnique({
      where: {
        studentId_lessonId: {
          studentId: targetStudentId,
          lessonId,
        },
      },
    });

    const response = {
      studentId: targetStudentId,
      lessonId,
      status: completion?.status ?? 'NOT_STARTED',
      attemptsCount: completion?.attemptsCount ?? 0,
      bestScore: completion?.bestScore ?? null,
      bestScorePercentage: completion?.bestScorePercentage ?? null,
      mostRecentScore: completion?.mostRecentScore ?? null,
      mostRecentScorePercentage: completion?.mostRecentScorePercentage ?? null,
      totalTimeSpentSeconds: completion?.totalTimeSpentSeconds ?? 0,
      lastAttemptAt: completion?.lastAttemptAt?.toISOString() ?? null,
      completedAt: completion?.completedAt?.toISOString() ?? null,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch lesson progress:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching progress' },
      { status: 500 }
    );
  }
}

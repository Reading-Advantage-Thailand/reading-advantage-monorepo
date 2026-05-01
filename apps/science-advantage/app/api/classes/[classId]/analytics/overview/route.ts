import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth/server';
import prisma from '@/lib/prisma';

// Helper function to get color code based on average score
function getColorCode(averageScore: number): string {
  if (averageScore >= 90) return 'blue';
  if (averageScore >= 80) return 'green';
  if (averageScore >= 60) return 'yellow';
  return 'red';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await requireAuth();
    const resolvedParams = await params;
    const { classId } = resolvedParams;

    // Verify class exists and user has access
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          select: { id: true },
        },
      },
    });

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Check authorization: only class teacher or admin can access analytics
    const isTeacherOwner = classRecord.teacherId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isTeacherOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized access to class analytics' },
        { status: 403 }
      );
    }

    // Get all lessons for this class
    const lessons = await prisma.lesson.findMany({
      where: {
        curriculumUnits: {
          some: {
            classId,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Get analytics data for each lesson
    const lessonsAnalytics = await Promise.all(
      lessons.map(async (lesson) => {
        // Get all lesson completions for this lesson
        const lessonCompletions = await prisma.lessonCompletion.findMany({
          where: {
            lessonId: lesson.id,
            student: {
              enrolledClass: {
                some: { id: classId },
              },
            },
          },
        });

        const totalStudents = classRecord.students.length;
        const studentsCompleted = lessonCompletions.filter(
          (lc) => lc.status === 'COMPLETED'
        ).length;

        const completionRate =
          totalStudents > 0 ? (studentsCompleted / totalStudents) * 100 : 0;

        // Calculate averages from completed lessons
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
          completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
          studentsCompleted,
          averageScore: Math.round(averageScore * 10) / 10,
          averageScorePercentage: Math.round(averageScore * 10) / 10,
          averageAttempts: Math.round(averageAttempts * 10) / 10,
          averageTimeSeconds: Math.round(averageTimeSeconds),
          colorCode: getColorCode(averageScore),
        };
      })
    );

    const response = {
      classId,
      className: classRecord.name,
      totalStudents: classRecord.students.length,
      lessons: lessonsAnalytics,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching class analytics overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

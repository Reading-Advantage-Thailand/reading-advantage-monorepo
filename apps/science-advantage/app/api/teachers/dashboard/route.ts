import { NextRequest, NextResponse } from 'next/server';

import { requireRole } from '@/lib/auth/server';
import prisma from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole('TEACHER');

    const teacherId = session.user.id;

    const teacherClasses = await prisma.class.findMany({
      where: { teacherId },
      select: { id: true, name: true },
    });

    if (teacherClasses.length === 0) {
      return NextResponse.json({
        classProgress: [],
        studentsNeedingAttention: 0,
        recentCompletions: [],
      });
    }

    const classIds = teacherClasses.map((c) => c.id);

    const [classProgress, studentsNeedingAttention, recentCompletions] =
      await Promise.all([
        computeClassProgress(classIds, teacherClasses),
        countStudentsNeedingAttention(classIds),
        fetchRecentCompletions(classIds),
      ]);

    return NextResponse.json({
      classProgress,
      studentsNeedingAttention,
      recentCompletions,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to load teacher dashboard data', error);
    return NextResponse.json(
      { error: 'Unable to load dashboard data' },
      { status: 500 }
    );
  }
}

async function computeClassProgress(
  classIds: string[],
  teacherClasses: Array<{ id: string; name: string }>
) {
  const results: Array<{
    classId: string;
    className: string;
    completionRate: number;
    averageScore: number;
    activeStudents: number;
  }> = [];

  for (const classId of classIds) {
    const classInfo = teacherClasses.find((c) => c.id === classId);
    if (!classInfo) continue;

    const enrolledStudents = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        students: {
          select: { id: true },
        },
      },
    });

    const activeStudents = enrolledStudents?.students.length ?? 0;

    if (activeStudents === 0) {
      results.push({
        classId,
        className: classInfo.name,
        completionRate: 0,
        averageScore: 0,
        activeStudents: 0,
      });
      continue;
    }

    const studentIds = enrolledStudents!.students.map((s) => s.id);

    const completions = await prisma.lessonCompletion.findMany({
      where: {
        studentId: { in: studentIds },
        status: 'COMPLETED',
      },
      select: {
        studentId: true,
        mostRecentScorePercentage: true,
      },
    });

    const uniqueCompletions = new Set(
      completions.map((c) => c.studentId)
    ).size;

    const completionRate =
      activeStudents > 0
        ? Math.round((uniqueCompletions / activeStudents) * 1000) / 10
        : 0;

    const scoresWithValues = completions.filter(
      (c) => c.mostRecentScorePercentage !== null
    );
    const averageScore =
      scoresWithValues.length > 0
        ? Math.round(
            (scoresWithValues.reduce(
              (sum, c) => sum + (c.mostRecentScorePercentage ?? 0),
              0
            ) /
              scoresWithValues.length) *
              10
          ) / 10
        : 0;

    results.push({
      classId,
      className: classInfo.name,
      completionRate: Math.min(completionRate, 100),
      averageScore,
      activeStudents,
    });
  }

  return results;
}

async function countStudentsNeedingAttention(classIds: string[]) {
  const result = await prisma.standardMastery.groupBy({
    by: ['studentId'],
    where: {
      student: {
        enrolledClass: {
          some: { id: { in: classIds } },
        },
      },
      masteryLevel: { lt: 0.6 },
    },
    _count: { id: true },
  });

  return result.length;
}

async function fetchRecentCompletions(classIds: string[]) {
  const completions = await prisma.lessonCompletion.findMany({
    where: {
      status: 'COMPLETED',
      student: {
        enrolledClass: {
          some: { id: { in: classIds } },
        },
      },
    },
    include: {
      student: {
        select: { name: true },
      },
      lesson: {
        select: { title: true },
      },
    },
    orderBy: { completedAt: 'desc' },
    take: 5,
  });

  return completions.map((c) => ({
    studentName: c.student.name,
    lessonTitle: c.lesson.title,
    score: c.mostRecentScorePercentage,
    completedAt: c.completedAt?.toISOString() ?? c.createdAt.toISOString(),
  }));
}

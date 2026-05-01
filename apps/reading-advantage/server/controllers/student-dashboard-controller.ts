import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { StudentMeResponse } from "@/types/dashboard";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";

/**
 * Get student dashboard data
 * @param req - Extended Next request with session
 * @returns Student dashboard response
 */
export async function getStudentDashboard(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get student data
    const student = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: true,
        lessonRecords: {
          select: {
            id: true,
            createdAt: true,
          },
        },
        userActivities: {
          select: {
            createdAt: true,
            timer: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        studentAssignments: {
          select: {
            id: true,
            status: true,
            score: true,
            assignment: {
              select: {
                dueDate: true,
              },
            },
          },
        },
        userWordRecords: {
          where: {
            difficulty: {
              gte: 0.9, // Mastered words (high difficulty/stability)
            },
          },
          select: {
            id: true,
          },
        },
        xpLogs: {
          select: {
            xpEarned: true,
            createdAt: true,
          },
        },
      },
    }) as any;

    if (!student) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Student not found' },
        { status: 404 }
      );
    }

    // Calculate progress metrics
    const booksRead = student.lessonRecords.length;

    const totalReadingTime = student.userActivities
      .filter((a: any) => a.timer !== null)
      .reduce((sum: number, a: any) => sum + a.timer, 0) / 60; // Convert to minutes

    // Calculate streak (consecutive days with activity)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);

    const activityDates = new Set(
      student.userActivities.map((a: any) => {
        const date = new Date(a.createdAt);
        date.setHours(0, 0, 0, 0);
        return date.toISOString().split('T')[0];
      })
    );

    while (activityDates.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const lastActive = student.userActivities.length > 0
      ? student.userActivities[0].createdAt.toISOString()
      : undefined;

    // Calculate assignments
    const pending = student.studentAssignments.filter(
      (sa: any) => sa.status !== Status.COMPLETED
    ).length;

    const completed = student.studentAssignments.filter(
      (sa: any) => sa.status === Status.COMPLETED
    ).length;

    const now = new Date();
    const overdue = student.studentAssignments.filter((sa: any) => {
      const dueDate = sa.assignment?.dueDate;
      return (
        sa.status !== Status.COMPLETED &&
        dueDate &&
        new Date(dueDate) < now
      );
    }).length;

    // Calculate performance metrics
    const scores = student.studentAssignments
      .filter((sa: any) => sa.score !== null)
      .map((sa: any) => sa.score);

    const averageAccuracy = scores.length > 0
      ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
      : 0;

    const vocabularyMastered = student.userWordRecords.length;

    // Calculate XP for this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const xpThisWeek = student.xpLogs
      .filter((log: any) => new Date(log.createdAt) >= weekStart)
      .reduce((sum: number, log: any) => sum + log.xpEarned, 0);

    // Calculate XP for this month
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    const xpThisMonth = student.xpLogs
      .filter((log: any) => new Date(log.createdAt) >= monthStart)
      .reduce((sum: number, log: any) => sum + log.xpEarned, 0);

    const response: StudentMeResponse = {
      student: {
        id: student.id,
        name: student.name || 'Unknown',
        email: student.email,
        level: student.level,
        cefrLevel: student.cefrLevel,
        xp: student.xp,
        schoolId: student.schoolId || undefined,
        schoolName: student.school?.name || undefined,
      },
      progress: {
        booksRead,
        totalReadingTime: Math.round(totalReadingTime),
        streak,
        lastActive,
      },
      assignments: {
        pending,
        completed,
        overdue,
      },
      performance: {
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        vocabularyMastered,
        xpThisWeek,
        xpThisMonth,
      },
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    };

    const duration = Date.now() - startTime;

    console.log(`[Controller] getStudentDashboard - ${duration}ms - user: ${userId}`);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=240',
        'X-Response-Time': `${duration}ms`,
      },
    });
  } catch (error) {
    console.error('[Controller] getStudentDashboard - Error:', error);

    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch student data',
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}

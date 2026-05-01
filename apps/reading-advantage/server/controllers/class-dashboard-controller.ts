/**
 * Class Dashboard Controller
 * Provides comprehensive class-level metrics for teachers
 */

import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { createCachedQuery } from "@/lib/cache/advanced-cache";

interface RequestContext {
  params: Promise<{
    classroomId: string;
  }>;
}

/**
 * Verify class ownership/access
 */
async function verifyClassAccess(classroomId: string, userId: string, userRole: Role): Promise<boolean> {
  // System and Admin have access to all classes
  if (userRole === Role.SYSTEM || userRole === Role.ADMIN) {
    return true;
  }

  // Check if teacher is associated with this classroom
  const classroomTeacher = await prisma.classroomTeacher.findFirst({
    where: {
      classroomId,
      teacherId: userId,
    },
  });

  return !!classroomTeacher;
}

/**
 * GET /api/v1/teacher/class/[classroomId]/overview
 * Get comprehensive class overview and KPIs
 */
export async function getClassOverview(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  try {
    const { classroomId } = await ctx.params;
    const session = req.session;

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = session.user;

    // Verify access
    const hasAccess = await verifyClassAccess(classroomId, user.id, user.role as Role);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied. You do not have permission to view this class." },
        { status: 403 }
      );
    }

    // Get classroom info
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Get students data
    const students = await prisma.classroomStudent.findMany({
      where: {
        classroomId,
      },
      include: {
        student: {
          select: {
            id: true,
            level: true,
            cefrLevel: true,
            xp: true,
          },
        },
      },
    });

    // Get assignments data
    const assignments = await prisma.assignment.findMany({
      where: {
        classroomId,
      },
    });

    const assignmentIds = assignments.map(a => a.id);

    const completedAssignments = await prisma.studentAssignment.count({
      where: {
        assignmentId: {
          in: assignmentIds,
        },
        status: 'COMPLETED',
      },
    });

    // Get activity metrics
    const studentIds = students.map(s => s.studentId);

    const [activity7d, activity30d] = await Promise.all([
      prisma.userActivity.groupBy({
        by: ['userId'],
        where: {
          userId: {
            in: studentIds,
          },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.userActivity.groupBy({
        by: ['userId'],
        where: {
          userId: {
            in: studentIds,
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Calculate average accuracy from user records
    // For now, using a simplified approach
    // TODO: Implement proper accuracy calculation
    const XPLogStudents = await prisma.xPLog.groupBy({
      by: ['userId', 'activityType'],
      where: {
        userId: { in: studentIds },
        activityType: {
          in: ['MC_QUESTION', 'SA_QUESTION'],
        },
      },
      _avg: {
        xpEarned: true,
      },
    });

    const mcLogs = XPLogStudents.filter(log => log.activityType === 'MC_QUESTION');
    const mcQuestionAccuracy = mcLogs.length > 0
      ? Math.round((mcLogs.reduce((sum, log) => sum + (log._avg?.xpEarned || 0), 0) / mcLogs.length) * 10) / 10
      : 0;

    const saLogs = XPLogStudents.filter(log => log.activityType === 'SA_QUESTION');
    const saQuestionAccuracy = saLogs.length > 0
      ? Math.round((saLogs.reduce((sum, log) => sum + (log._avg?.xpEarned || 0), 0) / saLogs.length) * 10) / 10
      : 0;

    const totalStudents = students.length;
    const averageLevel = totalStudents > 0
      ? students.reduce((sum, s) => sum + (s.student.level || 0), 0) / totalStudents
      : 0;

    const totalXpEarned = students.reduce((sum, s) => sum + (s.student.xp || 0), 0);

    const assignmentsActive = assignments.filter(a => {
      const now = new Date();
      return !a.dueDate || a.dueDate > now;
    }).length;

    const result = {
      class: {
        id: classroom.id,
        name: classroom.classroomName,
        classCode: classroom.classCode,
        schoolId: classroom.schoolId,
        createdAt: classroom.createdAt.toISOString(),
      },
      summary: {
        totalStudents,
        activeStudents7d: activity7d.length,
        activeStudents30d: activity30d.length,
        averageLevel: Math.round(averageLevel * 10) / 10,
        totalXpEarned,
        assignmentsActive,
        assignmentsCompleted: completedAssignments,
      },
      performance: {
        saQuestionAccuracy,
        mcQuestionAccuracy,
        // averageAccuracy: Math.round(averageAccuracy * 10) / 10,
        // averageReadingTime: 0,
        // booksCompleted: 0,
      }
    };

    return NextResponse.json({
      ...result,
      cache: {
        cached: false,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching class overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch class overview" },
      { status: 500 }
    );
  }
}

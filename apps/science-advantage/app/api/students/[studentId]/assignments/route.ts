import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

/**
 * GET /api/students/{studentId}/assignments
 * Returns all assignments for classes the student is enrolled in.
 * If studentId matches current user, returns all enrolled classes' assignments.
 *
 * Authentication: Required (student can only see their own)
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { studentId } = await context.params;

    if (session.user.id !== studentId && session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        class: {
          students: {
            some: { id: studentId },
          },
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          assignments: assignments.map(a => ({
            id: a.id,
            classId: a.classId,
            className: a.class.name,
            lessonId: a.lessonId,
            lesson: a.lesson,
            assignedAt: a.assignedAt.toISOString(),
            dueAt: a.dueAt?.toISOString() ?? null,
            assignedBy: a.assignedBy,
            teacher: a.teacher,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching student assignments:', error);

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

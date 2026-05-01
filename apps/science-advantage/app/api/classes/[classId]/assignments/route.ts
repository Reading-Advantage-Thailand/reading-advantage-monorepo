import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

/**
 * GET /api/classes/{classId}/assignments
 * Returns all assignments for a class with lesson details.
 *
 * Authentication: Required (teacher owns class, or student is enrolled)
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { classId } = await context.params;

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        teacherId: true,
        students: { select: { id: true } },
      },
    });

    if (!classRecord) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    const isTeacherOwner = classRecord.teacherId === session.user.id;
    const isEnrolledStudent = classRecord.students.some(
      student => student.id === session.user.id
    );

    if (!isTeacherOwner && !isEnrolledStudent) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const assignments = await prisma.assignment.findMany({
      where: { classId },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
            gradeLevel: true,
          },
        },
        teacher: {
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
            lessonId: a.lessonId,
            assignedAt: a.assignedAt.toISOString(),
            dueAt: a.dueAt?.toISOString() ?? null,
            assignedBy: a.assignedBy,
            teacher: a.teacher,
            lesson: a.lesson,
            createdAt: a.createdAt.toISOString(),
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching assignments:', error);

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/classes/{classId}/assignments
 * Create a new assignment for a class.
 *
 * Body: { lessonId: string, dueAt?: string }
 * Authentication: Required (teacher owns class or admin)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only teachers can create assignments' },
        { status: 403 }
      );
    }

    const { classId } = await context.params;
    const body = await request.json();
    const { lessonId, dueAt } = body as { lessonId?: string; dueAt?: string };

    if (!lessonId || typeof lessonId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'lessonId is required' },
        { status: 400 }
      );
    }

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true },
    });

    if (!classRecord) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    const isTeacherOwner = classRecord.teacherId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isTeacherOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      );
    }

    let parsedDueAt: Date | null = null;
    if (dueAt) {
      parsedDueAt = new Date(dueAt);
      if (isNaN(parsedDueAt.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid dueAt date' },
          { status: 400 }
        );
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        classId,
        lessonId,
        assignedBy: session.user.id,
        dueAt: parsedDueAt,
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
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: assignment.id,
          classId: assignment.classId,
          lessonId: assignment.lessonId,
          assignedAt: assignment.assignedAt.toISOString(),
          dueAt: assignment.dueAt?.toISOString() ?? null,
          assignedBy: assignment.assignedBy,
          teacher: assignment.teacher,
          lesson: assignment.lesson,
          createdAt: assignment.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating assignment:', error);

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/classes/{classId}/assignments
 * Remove an assignment. Body: { assignmentId: string }
 *
 * Authentication: Required (teacher owns class or admin)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only teachers can delete assignments' },
        { status: 403 }
      );
    }

    const { classId } = await context.params;
    const body = await request.json();
    const { assignmentId } = body as { assignmentId?: string };

    if (!assignmentId || typeof assignmentId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'assignmentId is required' },
        { status: 400 }
      );
    }

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true },
    });

    if (!classRecord) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    const isTeacherOwner = classRecord.teacherId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isTeacherOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        classId,
      },
      select: { id: true },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    return NextResponse.json(
      { success: true, data: { deleted: true } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting assignment:', error);

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

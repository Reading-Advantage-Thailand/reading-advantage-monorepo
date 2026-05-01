import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { getClassDetailWithCurriculum } from '@/lib/services/classes/get-class-detail';

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

    const classDetail = await getClassDetailWithCurriculum(classId);

    if (!classDetail) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    const { user } = session;
    const isTeacherOwner = classDetail.teacherId === user.id;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SYSTEM';
    const isEnrolledStudent = classDetail.students.some(student => student.id === user.id);

    if (!isTeacherOwner && !isAdmin && !isEnrolledStudent) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: classDetail.id,
          name: classDetail.name,
          gradeLevel: classDetail.gradeLevel,
          standardsAlignment: classDetail.standardsAlignment,
          joinCode: classDetail.joinCode,
          studentCount: classDetail.studentCount,
          curriculumUnits: classDetail.curriculumUnits,
          createdAt: classDetail.createdAt.toISOString(),
          updatedAt: classDetail.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching class detail:', error);

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const { classId } = await context.params;

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

    const body = await request.json();
    const { name } = body as { name?: string };

    const updateData: Record<string, string> = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 100) {
        return NextResponse.json(
          { success: false, error: 'Name must be between 3 and 100 characters' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: updateData,
      select: { id: true, name: true, updatedAt: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: updated.id,
          name: updated.name,
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating class:', error);

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        _count: {
          select: {
            students: true,
          },
        },
      },
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

    // Check if any students have progress (lesson completions)
    const hasProgress = await prisma.lessonCompletion.findFirst({
      where: {
        student: {
          enrolledClass: {
            some: { id: classId },
          },
        },
      },
      select: { id: true },
    });

    if (hasProgress) {
      // Soft delete: disconnect all students
      await prisma.class.update({
        where: { id: classId },
        data: {
          students: { set: [] },
        },
      });
      // Then delete the class (cascading deletes curriculum units, etc.)
      await prisma.class.delete({ where: { id: classId } });
    } else {
      // Hard delete: no student progress, safe to remove entirely
      await prisma.class.delete({ where: { id: classId } });
    }

    return NextResponse.json(
      { success: true, data: { deleted: true } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting class:', error);

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

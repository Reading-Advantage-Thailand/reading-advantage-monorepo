import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

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

    const students = await prisma.user.findMany({
      where: {
        enrolledClass: {
          some: { id: classId },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        gamificationProfile: {
          select: { lastActiveAt: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          students: students.map(s => ({
            id: s.id,
            name: s.name,
            email: s.email,
            joinedAt: s.createdAt.toISOString(),
            lastActiveAt: s.gamificationProfile?.lastActiveAt?.toISOString() ?? null,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching class roster:', error);

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

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

    const { classId } = await context.params;
    const body = await request.json();
    const { studentId } = body as { studentId?: string };

    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'studentId is required' },
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

    // Disconnect student from class
    await prisma.class.update({
      where: { id: classId },
      data: {
        students: {
          disconnect: { id: studentId },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: { removed: true } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing student from class:', error);

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

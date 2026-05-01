import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { joinClassSchema } from '@/lib/validations/class';

/**
 * POST /api/classes/join
 * Allows a student to join a class by providing a join code.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only students can join classes' },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid join code format' },
        { status: 400 }
      );
    }

    const parseResult = joinClassSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid join code format' },
        { status: 400 }
      );
    }

    const { joinCode } = parseResult.data;

    const classRecord = await prisma.class.findUnique({
      where: { joinCode },
      include: {
        teacher: {
          select: {
            name: true,
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
        { success: false, error: 'Join code not found' },
        { status: 404 }
      );
    }

    const alreadyEnrolled = classRecord.students.some(
      student => student.id === session.user.id
    );

    if (alreadyEnrolled) {
      return NextResponse.json(
        { success: false, error: 'Already enrolled in this class' },
        { status: 409 }
      );
    }

    await prisma.class.update({
      where: { id: classRecord.id },
      data: {
        students: {
          connect: { id: session.user.id },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        classEnrollment: {
          id: `${classRecord.id}:${session.user.id}`,
          classId: classRecord.id,
          className: classRecord.name,
          gradeLevel: classRecord.gradeLevel,
          teacherName: classRecord.teacher?.name ?? 'Teacher',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Join class error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while joining the class',
      },
      { status: 500 }
    );
  }
}

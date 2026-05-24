import { NextRequest, NextResponse } from 'next/server';
import { and, db, eq, inArray } from '@reading-advantage/db';
import {
  gamificationProfiles,
  scienceClasses,
  scienceClassStudents,
  users,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';

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

    const [classRecord] = await db
      .select({ teacherId: scienceClasses.teacherId })
      .from(scienceClasses)
      .where(eq(scienceClasses.id, classId))
      .limit(1);

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

    const enrolled = await db
      .select({ studentId: scienceClassStudents.studentId })
      .from(scienceClassStudents)
      .where(eq(scienceClassStudents.classId, classId));

    const studentIds = enrolled.map((e) => e.studentId);

    const studentRows = studentIds.length
      ? await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            createdAt: users.createdAt,
            lastActiveAt: gamificationProfiles.lastActiveAt,
          })
          .from(users)
          .leftJoin(gamificationProfiles, eq(gamificationProfiles.userId, users.id))
          .where(inArray(users.id, studentIds))
          .orderBy(users.name)
      : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          students: studentRows.map((s) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            joinedAt: s.createdAt.toISOString(),
            lastActiveAt: s.lastActiveAt?.toISOString() ?? null,
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

    const [classRecord] = await db
      .select({ teacherId: scienceClasses.teacherId })
      .from(scienceClasses)
      .where(eq(scienceClasses.id, classId))
      .limit(1);

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

    // Disconnect student from class. Matches Prisma's `students.disconnect`:
    // a no-op when the enrollment row is absent.
    await db
      .delete(scienceClassStudents)
      .where(
        and(
          eq(scienceClassStudents.classId, classId),
          eq(scienceClassStudents.studentId, studentId)
        )
      );

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

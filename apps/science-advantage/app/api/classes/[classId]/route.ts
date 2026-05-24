import { NextRequest, NextResponse } from 'next/server';
import { db, eq } from '@reading-advantage/db';
import { scienceClasses } from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';
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

    const [updated] = await db
      .update(scienceClasses)
      .set(updateData)
      .where(eq(scienceClasses.id, classId))
      .returning({
        id: scienceClasses.id,
        name: scienceClasses.name,
        updatedAt: scienceClasses.updatedAt,
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

    // Delete the class. FK cascades drop curriculum units, enrollments,
    // assignments, etc. Lesson completions live on the student/lesson axis
    // and are intentionally left intact (matches the prior Prisma behaviour
    // of disconnecting students before delete — they still own their progress
    // records via `studentId`, just no longer through this class).
    await db.delete(scienceClasses).where(eq(scienceClasses.id, classId));

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

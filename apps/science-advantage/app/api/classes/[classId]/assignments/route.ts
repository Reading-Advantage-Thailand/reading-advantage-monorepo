import { NextRequest, NextResponse } from 'next/server';
import { and, db, desc, eq } from '@reading-advantage/db';
import {
  scienceAssignments,
  scienceClasses,
  scienceClassStudents,
  scienceLessons,
  users,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';

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
    let isEnrolledStudent = false;
    if (!isTeacherOwner) {
      const enrollment = await db
        .select({ studentId: scienceClassStudents.studentId })
        .from(scienceClassStudents)
        .where(
          and(
            eq(scienceClassStudents.classId, classId),
            eq(scienceClassStudents.studentId, session.user.id)
          )
        )
        .limit(1);
      isEnrolledStudent = enrollment.length > 0;
    }

    if (!isTeacherOwner && !isEnrolledStudent) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const rows = await db
      .select({
        id: scienceAssignments.id,
        classId: scienceAssignments.classId,
        lessonId: scienceAssignments.lessonId,
        assignedAt: scienceAssignments.assignedAt,
        dueAt: scienceAssignments.dueAt,
        assignedBy: scienceAssignments.assignedBy,
        createdAt: scienceAssignments.createdAt,
        teacherId: users.id,
        teacherName: users.name,
        lessonInnerId: scienceLessons.id,
        lessonTitle: scienceLessons.title,
        lessonSlug: scienceLessons.slug,
        lessonOrder: scienceLessons.order,
        lessonGradeLevel: scienceLessons.gradeLevel,
      })
      .from(scienceAssignments)
      .innerJoin(users, eq(users.id, scienceAssignments.assignedBy))
      .innerJoin(scienceLessons, eq(scienceLessons.id, scienceAssignments.lessonId))
      .where(eq(scienceAssignments.classId, classId))
      .orderBy(desc(scienceAssignments.assignedAt));

    return NextResponse.json(
      {
        success: true,
        data: {
          assignments: rows.map((a) => ({
            id: a.id,
            classId: a.classId,
            lessonId: a.lessonId,
            assignedAt: a.assignedAt.toISOString(),
            dueAt: a.dueAt?.toISOString() ?? null,
            assignedBy: a.assignedBy,
            teacher: { id: a.teacherId, name: a.teacherName },
            lesson: {
              id: a.lessonInnerId,
              title: a.lessonTitle,
              slug: a.lessonSlug,
              order: a.lessonOrder,
              gradeLevel: a.lessonGradeLevel,
            },
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

    const [lesson] = await db
      .select({ id: scienceLessons.id })
      .from(scienceLessons)
      .where(eq(scienceLessons.id, lessonId))
      .limit(1);

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

    const [assignment] = await db
      .insert(scienceAssignments)
      .values({
        classId,
        lessonId,
        assignedBy: session.user.id,
        dueAt: parsedDueAt,
      })
      .returning();

    const [teacherRow] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, assignment.assignedBy))
      .limit(1);

    const [lessonRow] = await db
      .select({
        id: scienceLessons.id,
        title: scienceLessons.title,
        slug: scienceLessons.slug,
        order: scienceLessons.order,
      })
      .from(scienceLessons)
      .where(eq(scienceLessons.id, assignment.lessonId))
      .limit(1);

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
          teacher: teacherRow,
          lesson: lessonRow,
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

    const [assignment] = await db
      .select({ id: scienceAssignments.id })
      .from(scienceAssignments)
      .where(
        and(
          eq(scienceAssignments.id, assignmentId),
          eq(scienceAssignments.classId, classId)
        )
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    await db
      .delete(scienceAssignments)
      .where(eq(scienceAssignments.id, assignmentId));

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

import { NextRequest, NextResponse } from 'next/server';
import {
  and,
  db,
  desc,
  eq,
} from '@reading-advantage/db';
import {
  scienceAssignments,
  scienceClassStudents,
  scienceClasses,
  scienceLessons,
  users,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';

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

    const rows = await db
      .select({
        id: scienceAssignments.id,
        classId: scienceAssignments.classId,
        lessonId: scienceAssignments.lessonId,
        assignedAt: scienceAssignments.assignedAt,
        dueAt: scienceAssignments.dueAt,
        assignedBy: scienceAssignments.assignedBy,
        lessonInnerId: scienceLessons.id,
        lessonTitle: scienceLessons.title,
        lessonSlug: scienceLessons.slug,
        lessonOrder: scienceLessons.order,
        teacherId: users.id,
        teacherName: users.name,
        className: scienceClasses.name,
      })
      .from(scienceAssignments)
      .innerJoin(
        scienceClassStudents,
        and(
          eq(scienceClassStudents.classId, scienceAssignments.classId),
          eq(scienceClassStudents.studentId, studentId)
        )
      )
      .innerJoin(scienceClasses, eq(scienceClasses.id, scienceAssignments.classId))
      .innerJoin(scienceLessons, eq(scienceLessons.id, scienceAssignments.lessonId))
      .innerJoin(users, eq(users.id, scienceAssignments.assignedBy))
      .orderBy(desc(scienceAssignments.assignedAt));

    return NextResponse.json(
      {
        success: true,
        data: {
          assignments: rows.map(a => ({
            id: a.id,
            classId: a.classId,
            className: a.className,
            lessonId: a.lessonId,
            lesson: {
              id: a.lessonInnerId,
              title: a.lessonTitle,
              slug: a.lessonSlug,
              order: a.lessonOrder,
            },
            assignedAt: a.assignedAt.toISOString(),
            dueAt: a.dueAt?.toISOString() ?? null,
            assignedBy: a.assignedBy,
            teacher: { id: a.teacherId, name: a.teacherName },
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

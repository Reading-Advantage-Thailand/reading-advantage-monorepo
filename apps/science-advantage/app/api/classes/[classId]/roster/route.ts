import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getClassRoster, removeStudentFromClass } from '@reading-advantage/domain/classes';

/**
 * GET /api/classes/{classId}/roster
 * Returns the roster (enrolled students) for a class.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ classId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { classId } = await context.params;
    const result = await getClassRoster({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId } });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error && error.message === 'Class not found') return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    console.error('Error fetching class roster:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/classes/{classId}/roster
 * Removes a student from a class roster.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ classId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { classId } = await context.params;
    const body = await request.json();
    const { studentId } = body as { studentId?: string };

    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json({ success: false, error: 'studentId is required' }, { status: 400 });
    }

    const result = await removeStudentFromClass({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId, studentId } });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error && error.message === 'Class not found') return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
    if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    console.error('Error removing student from class:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

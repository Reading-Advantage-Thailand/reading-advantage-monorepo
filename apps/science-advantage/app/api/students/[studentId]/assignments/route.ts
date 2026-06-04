import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getStudentAssignments } from '@reading-advantage/domain/students';

/**
 * GET /api/students/{studentId}/assignments
 * Returns all assignments for classes the student is enrolled in.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ studentId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { studentId } = await context.params;
    const result = await getStudentAssignments({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { studentId } });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    console.error('Error fetching student assignments:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

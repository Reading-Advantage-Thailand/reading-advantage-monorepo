import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getStudentAssignments } from '@reading-advantage/domain/students';
import { parsePath, ValidationError } from '@/lib/validations/api-helpers';
import { studentIdParamSchema } from '@/lib/validations/params';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/students/{studentId}/assignments
 * Returns all assignments for classes the student is enrolled in.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ studentId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { studentId } = parsePath(await context.params, studentIdParamSchema);
    const result = await getStudentAssignments({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { studentId } });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ success: false, ...error.toJSON() }, { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    logger.error('assignments.route.error.fetching.student.assignments', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

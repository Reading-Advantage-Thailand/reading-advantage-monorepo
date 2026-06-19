import { NextRequest, NextResponse } from 'next/server';
import { runWithRequestContext } from '@/lib/observability/context';
import { randomUUID } from 'crypto';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getClassRoster, removeStudentFromClass } from '@reading-advantage/domain/classes';
import { parseBody, ValidationError } from '@/lib/validations/api-helpers';
import { removeStudentFromRosterSchema } from '@/lib/validations/roster';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/classes/{classId}/roster
 * Returns the roster (enrolled students) for a class.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ classId: string }> }) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: _request.url,
    method: 'GET',
    startedAt: Date.now(),
  }, async () => {

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
      logger.error('roster.route.error.fetching.class.roster', { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }

  });
}

/**
 * DELETE /api/classes/{classId}/roster
 * Removes a student from a class roster.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ classId: string }> }) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'DELETE',
    startedAt: Date.now(),
  }, async () => {

    try {
      const session = await getCurrentSession();
      if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

      const { classId } = await context.params;
      const body = await parseBody(request, removeStudentFromRosterSchema);

      const result = await removeStudentFromClass({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId, studentId: body.studentId } });

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      if (error instanceof ValidationError) return NextResponse.json({ success: false, ...error.toJSON() }, { status: 400 });
      if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
      if (error instanceof Error && error.message === 'Class not found') return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
      if (error instanceof Error && error.message === 'Forbidden') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      logger.error('roster.route.error.removing.student.from.class', { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }

  });
}

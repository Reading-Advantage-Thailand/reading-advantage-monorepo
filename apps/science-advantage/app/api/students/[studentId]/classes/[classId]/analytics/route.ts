import { NextResponse } from 'next/server';
import { runWithRequestContext } from '@/lib/observability/context';
import { randomUUID } from 'crypto';

import { requireAuth } from '@/lib/auth/server';
import { AuthError } from '@reading-advantage/auth';
import { getStudentClassAnalytics } from '@reading-advantage/domain/students';
import { parsePath, ValidationError } from '@/lib/validations/api-helpers';
import { studentIdClassIdParamSchema } from '@/lib/validations/params';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/students/{studentId}/classes/{classId}/analytics
 * Per-student, per-class summary: lessons performance + standards mastery.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ studentId: string; classId: string }> }) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: _request.url,
    method: 'GET',
    startedAt: Date.now(),
  }, async () => {

    try {
      const session = await requireAuth();
      const { studentId, classId } = parsePath(await params, studentIdClassIdParamSchema);

      const result = await getStudentClassAnalytics({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { studentId, classId } });

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof ValidationError) return NextResponse.json(error.toJSON(), { status: 400 });
      if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
      if (error instanceof Error) {
        if (error.message === 'Class not found') return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized access to student analytics' }, { status: 403 });
        if (error.message === 'Student is not enrolled in this class') return NextResponse.json({ error: 'Student is not enrolled in this class' }, { status: 403 });
      }
      logger.error('analytics.route.error.fetching.student.class.analytics', { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

  });
}

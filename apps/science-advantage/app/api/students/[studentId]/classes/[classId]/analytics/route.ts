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
 * Returns a structured JSON 401 for an API route when authentication fails.
 *
 * Centralized so every API route handler returns the same shape for an
 * unauthenticated request instead of bubbling a Next.js `NEXT_REDIRECT`
 * digest (which the Next.js runtime converts into a non-JSON HTML response).
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

/**
 * Returns true when `error` looks like a Next.js `NEXT_REDIRECT` digest
 * raised by `redirect()` inside `requireAuth()`.
 */
function isNextRedirect(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

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
      // CR-03: `requireAuth()` redirects (throws NEXT_REDIRECT) when there is no
      // session. For an API route we must return a JSON 401 instead of a
      // redirect digest — otherwise the response body is HTML, not JSON.
      if (isNextRedirect(error)) return unauthorizedResponse();
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

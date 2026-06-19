import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { AuthError } from '@reading-advantage/auth';
import { getClassLessonAnalytics } from '@reading-advantage/domain/classes';
import { parsePath, ValidationError } from '@/lib/validations/api-helpers';
import { classIdLessonIdParamSchema } from '@/lib/validations/params';
import { runWithRequestContext, setRequestContextUserId } from '@/lib/observability/context';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/classes/{classId}/lessons/{lessonId}/analytics
 * Per-lesson student + question + standards analytics for a class.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ classId: string; lessonId: string }> }) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: _request.url,
    method: 'GET',
    startedAt: Date.now(),
  }, async () => {
  try {
    const session = await requireAuth();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    setRequestContextUserId(session.user.id);

    const { classId, lessonId } = parsePath(await params, classIdLessonIdParamSchema);
    const result = await getClassLessonAnalytics({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId, lessonId } });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json(error.toJSON(), { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error) {
      if (error.message === 'Class not found') return NextResponse.json({ error: 'Class not found' }, { status: 404 });
      if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized access to class analytics' }, { status: 403 });
      if (error.message === 'Lesson not found in this class') return NextResponse.json({ error: 'Lesson not found in this class' }, { status: 404 });
    }
    logger.error('lesson.analytics.error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  });
}

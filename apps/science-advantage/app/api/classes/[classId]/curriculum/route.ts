import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getClassCurriculum } from '@reading-advantage/domain/classes';
import { parsePath, ValidationError } from '@/lib/validations/api-helpers';
import { classIdParamSchema } from '@/lib/validations/params';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/classes/{classId}/curriculum
 * Returns the curriculum for a given class, organized by units and lessons.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ classId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { classId } = parsePath(await context.params, classIdParamSchema);
    const result = await getClassCurriculum({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId } });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json(error.toJSON(), { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error && error.message === 'Class not found') return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    if (error instanceof Error && error.message === 'Not enrolled in this class') return NextResponse.json({ error: 'Not enrolled in this class' }, { status: 403 });
    logger.error('curriculum.route.failed.to.fetch.curriculum', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'An unexpected error occurred while fetching the curriculum' }, { status: 500 });
  }
}

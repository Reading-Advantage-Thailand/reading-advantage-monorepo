import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getLessonBySlug } from '@reading-advantage/domain/curriculum';
import { parsePath, ValidationError } from '@/lib/validations/api-helpers';
import { lessonSlugParamSchema } from '@/lib/validations/params';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/lessons/{lessonSlug}
 * Returns lesson content with the standards it satisfies.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ lessonSlug: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { lessonSlug } = parsePath(await context.params, lessonSlugParamSchema);
    const result = await getLessonBySlug({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { lessonSlug } });

    if (result === null) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    if (result === 'FORBIDDEN') return NextResponse.json({ error: 'Not enrolled in a class with this lesson' }, { status: 403 });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json(error.toJSON(), { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    logger.error('lessonSlug.route.failed.to.fetch.lesson', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'An unexpected error occurred while fetching the lesson' }, { status: 500 });
  }
}

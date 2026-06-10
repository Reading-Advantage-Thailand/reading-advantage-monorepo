import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { AuthError } from '@reading-advantage/auth';
import { getClassAnalyticsOverview } from '@reading-advantage/domain/classes';
import { parsePath, ValidationError } from '@/lib/validations/api-helpers';
import { classIdParamSchema } from '@/lib/validations/params';

/**
 * GET /api/classes/{classId}/analytics/overview
 * Per-lesson aggregate analytics for a class.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const session = await requireAuth();
    const { classId } = parsePath(await params, classIdParamSchema);

    const result = await getClassAnalyticsOverview({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId } });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json(error.toJSON(), { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error && error.message === 'Class not found') return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    if (error instanceof Error && error.message === 'Unauthorized access to class analytics') return NextResponse.json({ error: 'Unauthorized access to class analytics' }, { status: 403 });
    console.error('Error fetching class analytics overview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

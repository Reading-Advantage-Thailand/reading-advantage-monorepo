import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getStudentMasteryProfile } from '@reading-advantage/domain/students';
import { parsePath, parseQuery, ValidationError } from '@/lib/validations/api-helpers';
import { studentIdParamSchema } from '@/lib/validations/params';
import { z } from 'zod';
import { logger } from '@/lib/observability/logger';

const masteryQuerySchema = z.object({
  strand: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
  includeRecommendations: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

/**
 * GET /api/students/{studentId}/mastery-profile
 * Returns a student's mastery profile with strand-level aggregation.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { studentId } = parsePath(await params, studentIdParamSchema);
    const query = parseQuery(request, masteryQuerySchema);

    const result = await getStudentMasteryProfile({
      user: session.user,
      tenant: { schoolId: session.user.schoolId },
      input: {
        studentId,
        strand: query.strand,
        limit: query.limit,
        cursor: query.cursor,
        includeRecommendations: query.includeRecommendations,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json({ success: false, ...error.toJSON() }, { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error && error.message === 'Student not found') return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    logger.error('mastery-profile.route.mastery.profile.error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

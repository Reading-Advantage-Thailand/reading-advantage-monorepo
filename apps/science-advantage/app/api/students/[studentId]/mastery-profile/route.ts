import { NextRequest, NextResponse } from 'next/server';
import { runWithRequestContext } from '@/lib/observability/context';
import { randomUUID } from 'crypto';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getStudentMasteryProfile } from '@reading-advantage/domain/students';
import { parsePath, parseQuery, ValidationError } from '@/lib/validations/api-helpers';
import { studentIdParamSchema } from '@/lib/validations/params';
import { z } from 'zod';
import { logger } from '@/lib/observability/logger';

/**
 * Maximum page size accepted by `getStudentMasteryProfile`. Larger values
 * supplied by clients are clamped to this ceiling so an unauthenticated or
 * abusive caller cannot force a multi-thousand-row read.
 */
export const MASTERY_PROFILE_LIMIT_MAX = 100;

/**
 * CR-06: the `limit` query parameter must be a positive integer ≤
 * {@link MASTERY_PROFILE_LIMIT_MAX}. We intentionally reject `.max(MAX)`
 * in Zod (would return 400 for `?limit=300`) and instead clamp in the
 * `.transform()` step so callers see a successful 200 with the clamped
 * value, while non-numeric / negative / fractional values still produce a
 * 400 from Zod's `.int()` + `>= 1` refinement.
 */
const masteryQuerySchema = z.object({
  strand: z.string().optional(),
  limit: z.coerce
    .number({ invalid_type_error: 'limit must be a number' })
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .transform((value) => Math.min(value, MASTERY_PROFILE_LIMIT_MAX))
    .optional(),
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
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'GET',
    startedAt: Date.now(),
  }, async () => {

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

  });
}

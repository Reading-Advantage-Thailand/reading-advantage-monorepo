import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { AuthError } from '@reading-advantage/auth';
import { getCurrentSession } from '@/lib/auth/session';
import { calculateMasteryUpdates, buildResponseInput } from '@/lib/ai/mastery-calculator';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import { recordRun, recordRunFailure, RateLimitError } from '@reading-advantage/domain/mastery';

/**
 * POST /api/ai/update-mastery
 * Processes a mastery run for a completed quiz attempt.
 */
export async function POST(request: NextRequest) {
  const requestClone = request.clone();
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const result = await recordRun({
      user: session.user,
      tenant: { schoolId: session.user.schoolId },
      request,
      deps: { calculateMasteryUpdates, buildResponseInput, enableMasteryPipeline: env.NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE, log: logger.info.bind(logger), metric: metrics },
    });

    return NextResponse.json(result.body, { status: result.status, ...(result.headers ? { headers: result.headers } : {}) });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429, headers: { 'retry-after': error.retryAfter.toString() } });
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors.map((i) => ({ path: i.path.join('.'), message: i.message })) }, { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });

    try {
      const body = await requestClone.json();
      const attemptId = body?.attemptId;
      const session = await getCurrentSession();
      if (attemptId && session?.user?.id) {
        await recordRunFailure({ attemptId, studentId: session.user.id, schoolId: session.user.schoolId ?? '', errorMessage: error instanceof Error ? error.message : 'Unknown error' });
      }
    } catch {
      // Best-effort failure recording — don't mask the original error
    }

    return NextResponse.json({ success: false, reason: 'QUEUED' }, { status: 202, headers: { 'retry-after': '30' } });
  }
}

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { AuthError } from '@reading-advantage/auth';
import { getCurrentSession } from '@/lib/auth/session';
import { calculateMasteryUpdates, buildResponseInput } from '@/lib/ai/mastery-calculator';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import { runWithRequestContext, setRequestContextUserId } from '@/lib/observability/context';
import { recordRun, recordRunFailure, RateLimitError } from '@reading-advantage/domain/mastery';

/**
 * POST /api/ai/update-mastery
 * Processes a mastery run for a completed quiz attempt.
 *
 * ME-01: unhandled domain errors must surface as a typed 5xx (never as a
 * 202 QUEUED). 202 QUEUED is reserved for the explicit "run is being
 * processed" branch inside `recordRun()` itself, which returns a typed
 * `MasteryHttpResponse` — not an exception.
 */
export async function POST(request: NextRequest) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'POST',
    startedAt: Date.now(),
  }, async () => {
  const requestClone = request.clone();
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    setRequestContextUserId(session.user.id);

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

    // ME-01: best-effort record the failure for the attempt so operators can
    // see what happened. We still surface a typed 5xx — we never silently
    // re-classify an unhandled exception as 202 QUEUED.
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

    logger.error('update-mastery.route.unhandled.error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
  });
}

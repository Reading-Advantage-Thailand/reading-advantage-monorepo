import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@reading-advantage/auth';
import { getCurrentSession } from '@/lib/auth/session';
import { gradeAnswer } from '@/lib/quiz/scoring';
import { calculateXpForQuiz, awardXp } from '@/lib/gamification/xp';
import { updateStreakForProfile } from '@/lib/gamification/streak';
import { checkBadgeConditions } from '@/lib/gamification/badges';
import { processMasteryRun } from '@/lib/services/mastery/mastery-worker';
import { startQuiz, submitAttempt } from '@reading-advantage/domain/quiz';
import { parseBody, parsePath, ValidationError } from '@/lib/validations/api-helpers';
import { submitQuizAttemptSchema } from '@/lib/validations/quiz';
import { lessonSlugParamSchema } from '@/lib/validations/params';
import { runWithRequestContext, setRequestContextUserId } from '@/lib/observability/context';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/lessons/{lessonSlug}/quiz
 * Returns a random set of N questions from the lesson's question bank.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ lessonSlug: string }> }
) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: _request.url,
    method: 'GET',
    startedAt: Date.now(),
  }, async () => {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    setRequestContextUserId(session.user.id);
    const { lessonSlug } = parsePath(await context.params, lessonSlugParamSchema);
    const result = await startQuiz({ user: session.user, tenant: { schoolId: session.user.schoolId }, lessonSlug });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json(error.toJSON(), { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    logger.error('quiz.fetch.error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'An unexpected error occurred while fetching the quiz' }, { status: 500 });
  }
  });
}

/**
 * POST /api/lessons/{lessonSlug}/quiz
 * Submit a completed quiz attempt with question responses and timing data.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ lessonSlug: string }> }
) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'POST',
    startedAt: Date.now(),
  }, async () => {
  try {
    void context;
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    setRequestContextUserId(session.user.id);
    const body = await parseBody(request, submitQuizAttemptSchema);
    const result = await submitAttempt({
      user: session.user, tenant: { schoolId: session.user.schoolId },
      input: { attemptId: body.attemptId, responses: body.responses as Parameters<typeof submitAttempt>[0]['input']['responses'] },
      deps: {
        gradeAnswer,
        calculateXpForQuiz,
        // Phase 1 ST-1: gamification/service functions accept
        // `{ db, user, tenant, input }` and call `assertCan` + `createTenantDB`
        // internally. The route is transport-thin and just forwards the
        // secured context.
        awardXp: (ctx) =>
          awardXp({
            db: ctx.db,
            user: ctx.user,
            tenant: ctx.tenant,
            input: ctx.input,
          }) as ReturnType<typeof awardXp>,
        updateStreakForProfile: (ctx) =>
          updateStreakForProfile({
            db: ctx.db,
            user: ctx.user,
            tenant: ctx.tenant,
            input: ctx.input,
          }) as ReturnType<typeof updateStreakForProfile>,
        checkBadgeConditions: ((ctx: Parameters<typeof checkBadgeConditions>[0]) =>
          checkBadgeConditions(ctx)) as Parameters<
          typeof submitAttempt
        >[0]['deps']['checkBadgeConditions'],
        processMasteryRun: ((ctx: Parameters<typeof processMasteryRun>[0]) =>
          processMasteryRun(ctx)) as Parameters<
          typeof submitAttempt
        >[0]['deps']['processMasteryRun'],
      },
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof ValidationError) return NextResponse.json(error.toJSON(), { status: 400 });
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    logger.error('quiz.submit.error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'An unexpected error occurred while submitting the quiz' }, { status: 500 });
  }
  });
}

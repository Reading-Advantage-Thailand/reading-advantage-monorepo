import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createTenantDB } from '@reading-advantage/domain';
import { db as defaultDb } from '@reading-advantage/db';
import { AuthError } from '@reading-advantage/auth';
import { getCurrentSession } from '@/lib/auth/session';
import { buildRecommendationContext } from '@/lib/ai/recommendation-context';
import { generateRecommendation } from '@/lib/ai/recommendation-service';
import { aiConfig } from '@/lib/config/ai';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import { runWithRequestContext, setRequestContextUserId } from '@/lib/observability/context';
import { captureException as captureError } from '@/lib/observability/sentry';
import { getRecommendation } from '@reading-advantage/domain/ai';
import { requestSchema, recommendationCache, rateLimitStore, RateLimitError } from '@/lib/config/recommendations';

/**
 * POST /api/ai/recommendations
 * Generates an AI recommendation for a completed quiz attempt.
 */
export async function POST(request: NextRequest) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: request.url,
    method: 'POST',
    startedAt: Date.now(),
  }, async () => {
  const startedAt = Date.now();
  const traceId = `rec_${randomUUID()}`;
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    setRequestContextUserId(session.user.id);
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'INVALID_JSON' }, { status: 400 }); }
    const parse = requestSchema.safeParse(body);
    if (!parse.success) return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    // Phase 1 SP-3: create a TenantDB scoped to the caller's tenant and pass
    // it into `buildRecommendationContext`. The route keeps transport-thin
    // by not importing the raw `db` symbol directly (we obtain it via the
    // session helper, which is the documented auth-layer entry point).
    const tenant = { schoolId: session.user.schoolId };
    const tenantDb = createTenantDB(defaultDb, tenant);
    const result = await getRecommendation({
      user: session.user, tenant, input: { attemptId: parse.data.attemptId },
      deps: {
        assertRateLimit: async (sid: string) => { if (!(await rateLimitStore.checkLimit(sid))) throw new RateLimitError(aiConfig.rateLimitWindowMs); await rateLimitStore.recordFailure(sid); },
        buildRecommendationContext: ((input: { attempt: Parameters<typeof buildRecommendationContext>[0]['attempt'] }) =>
          buildRecommendationContext({ db: tenantDb, attempt: input.attempt })) as Parameters<typeof getRecommendation>[0]['deps']['buildRecommendationContext'],
        generateRecommendation: generateRecommendation as Parameters<typeof getRecommendation>[0]['deps']['generateRecommendation'],
        cacheGet: (k: string) => recommendationCache.get(k),
        cacheSet: (k: string, v: unknown, ttl: number) => { recommendationCache.set(k, { response: v, expiresAt: Date.now() + ttl }); },
        cacheTtlMs: aiConfig.cacheTtlMs, devAuthEnabled: env.DEV_AUTH_ENABLED,
      },
    });
    if ('error' in result) return NextResponse.json({ success: false, error: result.error }, { status: result.status ?? 500 });
    metrics.increment('ai_recommendation_requests'); metrics.observe('ai_recommendation_latency_ms', Date.now() - startedAt);
    return NextResponse.json(result.recommendation);
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ success: false, error: 'RATE_LIMITED', retryAfter: error.retryAfter }, { status: 429, headers: { 'retry-after': String(error.retryAfter) } });
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    captureError(error, { traceId });
    logger.error('ai.recommendation.error', { traceId }); metrics.increment('ai_recommendation_errors');
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', traceId }, { status: 500 });
  }
  });
}

export const unstable_recommendationTestkit = { reset() { recommendationCache.clear(); rateLimitStore.reset(); } };

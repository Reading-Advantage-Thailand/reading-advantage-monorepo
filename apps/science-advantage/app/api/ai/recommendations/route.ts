import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@reading-advantage/auth';
import { getCurrentSession } from '@/lib/auth/session';
import { buildRecommendationContext } from '@/lib/ai/recommendation-context';
import { generateRecommendation } from '@/lib/ai/recommendation-service';
import { aiConfig } from '@/lib/config/ai';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import { getRecommendation } from '@reading-advantage/domain/ai';
import { requestSchema, recommendationCache, rateLimitStore, RateLimitError } from '@/lib/config/recommendations';

/**
 * POST /api/ai/recommendations
 * Generates an AI recommendation for a completed quiz attempt.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const traceId = `rec_${randomUUID()}`;
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'INVALID_JSON' }, { status: 400 }); }
    const parse = requestSchema.safeParse(body);
    if (!parse.success) return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    const result = await getRecommendation({
      user: session.user, tenant: { schoolId: session.user.schoolId }, input: { attemptId: parse.data.attemptId },
      deps: {
        assertRateLimit: async (sid: string) => { if (!(await rateLimitStore.checkLimit(sid))) throw new RateLimitError(aiConfig.rateLimitWindowMs); await rateLimitStore.recordFailure(sid); },
        buildRecommendationContext, generateRecommendation,
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
    logger.error('ai.recommendation.error', { traceId }); metrics.increment('ai_recommendation_errors');
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', traceId }, { status: 500 });
  }
}

export const unstable_recommendationTestkit = { reset() { recommendationCache.clear(); rateLimitStore.reset(); } };

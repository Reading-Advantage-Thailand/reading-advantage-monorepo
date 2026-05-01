import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentSession } from '@/lib/auth/session';
import { buildRecommendationContext } from '@/lib/ai/recommendation-context';
import { generateRecommendation } from '@/lib/ai/recommendation-service';
import type { AttemptWithRelations } from '@/lib/ai/recommendation-context';
import { aiConfig } from '@/lib/config/ai';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import prisma from '@/lib/prisma';
import { getRedisClient } from '@/lib/platform/redis-client';
import { RedisRateLimitStore } from '@/lib/platform/rate-limit-store';

const requestSchema = z.object({
  attemptId: z.string().min(1),
});

class RateLimitError extends Error {
  retryAfter: number;

  constructor(retryAfter: number) {
    super('rate-limit');
    this.retryAfter = Math.max(1, Math.ceil(retryAfter / 1000));
  }
}

class ResponseError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(params: { status: number; body: Record<string, unknown> }) {
    super('response-error');
    this.status = params.status;
    this.body = params.body;
  }
}

const recommendationCache = new Map<
  string,
  { expiresAt: number; response: RecommendationSuccess }
>();

type RecommendationSuccess = {
  success: true;
  recommendation: Awaited<
    ReturnType<typeof generateRecommendation>
  >['recommendation'];
  model: string;
  fallbackUsed: boolean;
  traceId: string;
  generatedAt: string;
};

function cacheKey(studentId: string, attemptId: string, version: number) {
  return `${studentId}:${attemptId}:${version}`;
}

const rateLimitStore = new RedisRateLimitStore(getRedisClient(), {
  maxAttempts: aiConfig.maxRequestsPerWindow,
  windowMs: aiConfig.rateLimitWindowMs,
  fallbackEnabled: true,
});

async function assertRateLimit(studentId: string) {
  const allowed = await rateLimitStore.checkLimit(studentId);
  if (!allowed) {
    throw new RateLimitError(aiConfig.rateLimitWindowMs);
  }
  await rateLimitStore.recordFailure(studentId);
}

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch (error) {
    logger.warn('ai.recommendation.invalid_json', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    throw new ResponseError({
      status: 400,
      body: { success: false, error: 'INVALID_JSON' },
    });
  }
}

function authorizeAttempt(
  attempt: AttemptWithRelations,
  session: Awaited<ReturnType<typeof getCurrentSession>>
) {
  if (!session) {
    throw new ResponseError({
      status: 401,
      body: { success: false, error: 'Unauthorized' },
    });
  }

  const isStudent = session.user.role === 'STUDENT';
  const isTeacherOrAdmin =
    session.user.role === 'TEACHER' || session.user.role === 'ADMIN';
  const canImpersonate = env.DEV_AUTH_ENABLED && isTeacherOrAdmin;

  if (isStudent && session.user.id !== attempt.studentId) {
    throw new ResponseError({
      status: 403,
      body: { success: false, error: 'Forbidden' },
    });
  }

  if (!isStudent && !canImpersonate && session.user.id !== attempt.studentId) {
    throw new ResponseError({
      status: 403,
      body: { success: false, error: 'Forbidden' },
    });
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const traceId = `rec_${randomUUID()}`;

  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await readJson(request);
    const parse = requestSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: parse.error.format(),
        },
        { status: 400 }
      );
    }

    const attempt = (await prisma.attempt.findUnique({
      where: { id: parse.data.attemptId },
      select: {
        id: true,
        studentId: true,
        lessonId: true,
        score: true,
        maxScore: true,
        completedAt: true,
        lesson: {
          select: {
            id: true,
            title: true,
            lessonType: true,
            gradeLevel: true,
            order: true,
            standards: {
              select: {
                id: true,
                code: true,
                description: true,
                framework: true,
              },
            },
            curriculumUnits: {
              select: { id: true, title: true, order: true, framework: true },
            },
          },
        },
        student: { select: { id: true, gradeLevel: true } },
        questionResponses: {
          select: {
            id: true,
            isCorrect: true,
            question: {
              select: {
                id: true,
                standards: { select: { id: true, code: true } },
              },
            },
          },
        },
      },
    })) as AttemptWithRelations | null;

    if (!attempt) {
      return NextResponse.json(
        { success: false, error: 'Attempt not found' },
        { status: 404 }
      );
    }

    if (!attempt.completedAt) {
      return NextResponse.json(
        { success: false, error: 'Attempt still grading' },
        { status: 409 }
      );
    }

    authorizeAttempt(attempt, session);
    assertRateLimit(attempt.studentId);

    const context = await buildRecommendationContext(prisma, { attempt });
    const key = cacheKey(attempt.studentId, attempt.id, context.masteryVersion);
    const cached = recommendationCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      metrics.increment('ai_recommendation_cache_hit');
      return NextResponse.json(cached.response);
    }

    const result = await generateRecommendation(context);

    const responseBody: RecommendationSuccess = {
      success: true,
      recommendation: result.recommendation,
      model: result.modelUsed,
      fallbackUsed: result.fallbackUsed,
      traceId: context.traceId,
      generatedAt: new Date().toISOString(),
    };

    recommendationCache.set(key, {
      response: responseBody,
      expiresAt: Date.now() + aiConfig.cacheTtlMs,
    });

    metrics.increment('ai_recommendation_requests', 1, {
      fallback: result.fallbackUsed,
    });
    metrics.observe('ai_recommendation_latency_ms', Date.now() - startedAt, {
      fallback: result.fallbackUsed,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: 'RATE_LIMITED', retryAfter: error.retryAfter },
        {
          status: 429,
          headers: { 'retry-after': String(error.retryAfter) },
        }
      );
    }

    if (error instanceof ResponseError) {
      return NextResponse.json(error.body, { status: error.status });
    }

    logger.error('ai.recommendation.error', {
      traceId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    metrics.increment('ai_recommendation_errors');

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', traceId },
      { status: 500 }
    );
  }
}

export const unstable_recommendationTestkit = {
  reset() {
    recommendationCache.clear();
    rateLimitStore.reset();
  },
};

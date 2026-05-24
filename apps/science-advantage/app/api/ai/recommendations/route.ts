import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db, eq, inArray } from '@reading-advantage/db';
import {
  scienceAttempts,
  scienceCurriculumUnits,
  scienceLessonStandards,
  scienceLessons,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceStandards,
  scienceUnitLessons,
  users,
} from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';
import { buildRecommendationContext } from '@/lib/ai/recommendation-context';
import { generateRecommendation } from '@/lib/ai/recommendation-service';
import type { AttemptWithRelations } from '@/lib/ai/recommendation-context';
import type { LessonType, StandardsAlignment } from '@/lib/enums';
import { aiConfig } from '@/lib/config/ai';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
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

/**
 * Loads a scienceAttempts row with the nested shape the recommendation
 * pipeline expects. Replaces a single deeply-nested Prisma include with a
 * small batch of Drizzle SELECTs assembled in-memory.
 */
async function loadAttemptWithRelations(
  attemptId: string
): Promise<AttemptWithRelations | null> {
  const [attemptRow] = await db
    .select({
      id: scienceAttempts.id,
      studentId: scienceAttempts.studentId,
      lessonId: scienceAttempts.lessonId,
      score: scienceAttempts.score,
      maxScore: scienceAttempts.maxScore,
      completedAt: scienceAttempts.completedAt,
    })
    .from(scienceAttempts)
    .where(eq(scienceAttempts.id, attemptId))
    .limit(1);

  if (!attemptRow) return null;

  const [lessonRow] = await db
    .select({
      id: scienceLessons.id,
      title: scienceLessons.title,
      lessonType: scienceLessons.lessonType,
      gradeLevel: scienceLessons.gradeLevel,
      order: scienceLessons.order,
    })
    .from(scienceLessons)
    .where(eq(scienceLessons.id, attemptRow.lessonId))
    .limit(1);

  if (!lessonRow) {
    // Defensive: schema FK should guarantee this exists, but match the
    // previous Prisma behavior of throwing-on-missing.
    throw new Error(`Lesson ${attemptRow.lessonId} not found`);
  }

  const lessonStandards = await db
    .select({
      id: scienceStandards.id,
      code: scienceStandards.code,
      description: scienceStandards.description,
      framework: scienceStandards.framework,
    })
    .from(scienceLessonStandards)
    .innerJoin(
      scienceStandards,
      eq(scienceStandards.id, scienceLessonStandards.standardId)
    )
    .where(eq(scienceLessonStandards.lessonId, lessonRow.id));

  const lessonUnits = await db
    .select({
      id: scienceCurriculumUnits.id,
      title: scienceCurriculumUnits.title,
      order: scienceCurriculumUnits.order,
      framework: scienceCurriculumUnits.framework,
    })
    .from(scienceUnitLessons)
    .innerJoin(
      scienceCurriculumUnits,
      eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId)
    )
    .where(eq(scienceUnitLessons.lessonId, lessonRow.id));

  const [studentRow] = await db
    .select({ id: users.id, gradeLevel: users.gradeLevel })
    .from(users)
    .where(eq(users.id, attemptRow.studentId))
    .limit(1);

  // Question responses with their question + per-question standards.
  const responseRows = await db
    .select({
      id: scienceQuestionResponses.id,
      isCorrect: scienceQuestionResponses.isCorrect,
      questionId: scienceQuestionResponses.questionId,
    })
    .from(scienceQuestionResponses)
    .where(eq(scienceQuestionResponses.attemptId, attemptRow.id));

  const responseQuestionIds = responseRows.map((r) => r.questionId);
  const questionStandardsRows = responseQuestionIds.length
    ? await db
        .select({
          questionId: scienceQuestionStandards.questionId,
          standardId: scienceStandards.id,
          code: scienceStandards.code,
        })
        .from(scienceQuestionStandards)
        .innerJoin(
          scienceStandards,
          eq(scienceStandards.id, scienceQuestionStandards.standardId)
        )
        .where(
          inArray(scienceQuestionStandards.questionId, responseQuestionIds)
        )
    : [];

  const standardsByQuestion = new Map<
    string,
    Array<{ id: string; code: string }>
  >();
  for (const row of questionStandardsRows) {
    const arr = standardsByQuestion.get(row.questionId) ?? [];
    arr.push({ id: row.standardId, code: row.code });
    standardsByQuestion.set(row.questionId, arr);
  }

  return {
    id: attemptRow.id,
    studentId: attemptRow.studentId,
    lessonId: attemptRow.lessonId,
    score: attemptRow.score,
    maxScore: attemptRow.maxScore,
    completedAt: attemptRow.completedAt,
    lesson: {
      id: lessonRow.id,
      title: lessonRow.title,
      lessonType: lessonRow.lessonType as LessonType,
      gradeLevel: lessonRow.gradeLevel,
      order: lessonRow.order,
      standards: lessonStandards.map((s) => ({
        id: s.id,
        code: s.code,
        description: s.description,
        framework: s.framework as StandardsAlignment,
      })),
      curriculumUnits: lessonUnits.map((u) => ({
        id: u.id,
        title: u.title,
        order: u.order,
        framework: u.framework as StandardsAlignment,
      })),
    },
    student: {
      id: studentRow?.id ?? attemptRow.studentId,
      gradeLevel: studentRow?.gradeLevel ?? null,
    },
    questionResponses: responseRows.map((r) => ({
      id: r.id,
      isCorrect: r.isCorrect,
      question: {
        id: r.questionId,
        standards: standardsByQuestion.get(r.questionId) ?? [],
      },
    })),
  };
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

    const attempt = await loadAttemptWithRelations(parse.data.attemptId);

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
    await assertRateLimit(attempt.studentId);

    const context = await buildRecommendationContext({ attempt });
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

import { z } from 'zod';
import { createHash } from 'crypto';
import type { AIClient } from '@reading-advantage/ai';
import { context as otelContext, trace, SpanStatusCode } from '@opentelemetry/api';

import { aiConfig } from '@/lib/config/ai';
import { logger } from '@/lib/observability/logger';
import { getRedisClient } from '@/lib/platform/redis-client';
import { RedisCacheAdapter } from '@/lib/platform/cache-adapter';

import { buildRecommendationPrompt } from './prompts/recommendation';
import { generateFallbackRecommendation } from './rules-engine';
import type { RecommendationContext, RecommendationRecord } from './types';

function getOtelTracer() {
  return trace.getTracer('science-advantage');
}

const recommendationSchema = z.object({
  recommendedLessonId: z.string().min(1),
  recommendedLessonSlug: z.string().min(1),
  lessonTitle: z.string().min(1),
  focusStandards: z.array(z.string().min(1)).min(1).max(5),
  reasoning: z.string().min(10).max(500),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  nextBestAlternatives: z
    .array(
      z.object({
        lessonId: z.string().min(1),
        lessonTitle: z.string().min(1),
      })
    )
    .max(3)
    .default([]),
});

type GenerateResult = {
  recommendation: RecommendationRecord;
  modelUsed: string;
  fallbackUsed: boolean;
};

const recommendationCache = new RedisCacheAdapter(getRedisClient(), {
  prefix: 'rec:',
  defaultTtlMs: aiConfig.cacheTtlMs,
});

function buildCacheKey(context: RecommendationContext): string {
  const candidateIds = context.candidateLessons
    .map((l) => l.id)
    .sort()
    .join(',');
  const keyData = `${context.studentId}:${context.masteryVersion}:${candidateIds}`;
  const hash = createHash('sha256').update(keyData).digest('hex').slice(0, 16);
  return hash;
}

export class RecommendationService {
  constructor(private readonly client: AIClient) {}

  async getRecommendation(
    context: RecommendationContext
  ): Promise<GenerateResult> {
    const cacheKey = buildCacheKey(context);
    const cached = await recommendationCache.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as GenerateResult;
        logger.info('ai.recommendation.cache_hit', {
          traceId: trace.getSpan(otelContext.active())?.spanContext().traceId,
          cacheKey,
        });
        return parsed;
      } catch {
        // corrupted cache entry, regenerate
      }
    }

    const prompt = buildRecommendationPrompt(context);
    const modelsToTry = [
      aiConfig.primaryModel,
      aiConfig.secondaryModel,
    ].filter(
      (value, index, array) =>
        Boolean(value) && array.indexOf(value) === index
    );

    for (const modelId of modelsToTry) {
      try {
        const result = await getOtelTracer().startActiveSpan(
          'ai.generateObject',
          {},
          otelContext.active(),
          async (span) => {
            span.setAttribute('ai.model', modelId);
            span.setAttribute(
              'ai.schema',
              recommendationSchema.description ?? 'unknown',
            );
            try {
              const response = await this.client.generateObject({
                schema: recommendationSchema,
                prompt,
                model: modelId,
              });
              const recommendation: RecommendationRecord = {
                recommendedLessonId: response.recommendedLessonId,
                recommendedLessonSlug: response.recommendedLessonSlug,
                lessonTitle: response.lessonTitle,
                focusStandards: response.focusStandards,
                reasoning: response.reasoning,
                confidence: response.confidence ?? 'medium',
                nextBestAlternatives: response.nextBestAlternatives ?? [],
              };

              span.setStatus({ code: SpanStatusCode.OK });
              span.end();

              if (modelId !== aiConfig.primaryModel) {
                logger.warn('ai.recommendation.secondary_model_used', {
                  traceId: trace
                    .getSpan(otelContext.active())
                    ?.spanContext().traceId,
                  model: modelId,
                });
              }

              return {
                recommendation,
                modelUsed: modelId,
                fallbackUsed: false,
              };
            } catch (error) {
              span.recordException(error as Error);
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: String(error),
              });
              span.end();

              logger.warn('ai.recommendation.model_error', {
                traceId: trace
                  .getSpan(otelContext.active())
                  ?.spanContext().traceId,
                model: modelId,
                error: error instanceof Error ? error.message : 'unknown',
              });
              throw error;
            }
          },
        );

        await recommendationCache
          .set(cacheKey, JSON.stringify(result))
          .catch(() => {});

        return result;
      } catch {
        // Continue to the next model.
      }
    }

    const fallback = generateFallbackRecommendation(context);
    logger.warn('ai.recommendation.fallback_rules', {
      traceId: trace.getSpan(otelContext.active())?.spanContext().traceId,
    });

    const result: GenerateResult = {
      recommendation: fallback,
      modelUsed: 'rules-engine',
      fallbackUsed: true,
    };

    await recommendationCache
      .set(cacheKey, JSON.stringify(result))
      .catch(() => {});

    return result;
  }
}

export async function generateRecommendation(
  context: RecommendationContext
): Promise<GenerateResult> {
  const { getAIClient } = await import('@reading-advantage/ai');
  const client = getAIClient();
  const service = new RecommendationService(client);
  return service.getRecommendation(context);
}

export { recommendationSchema };

import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createHash } from 'crypto';

import { aiConfig } from '@/lib/config/ai';
import { logger } from '@/lib/observability/logger';
import { getRedisClient } from '@/lib/platform/redis-client';
import { RedisCacheAdapter } from '@/lib/platform/cache-adapter';

import { buildRecommendationPrompt } from './prompts/recommendation';
import { generateFallbackRecommendation } from './rules-engine';
import type { RecommendationContext, RecommendationRecord } from './types';

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

const openaiClient = process.env.OPENAI_API_KEY
  ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const geminiClient = process.env.GEMINI_API_KEY
  ? createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

function resolveModel(modelId: string) {
  if (modelId.startsWith('gemini')) {
    if (!geminiClient) {
      throw new Error('Missing GEMINI_API_KEY');
    }
    return geminiClient(modelId);
  }

  if (!openaiClient) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  return openaiClient(modelId);
}

async function invokeModel(modelId: string, prompt: string) {
  const { object } = await generateObject({
    model: resolveModel(modelId),
    schema: recommendationSchema,
    prompt,
    maxRetries: 1,
  });
  return object;
}

export async function generateRecommendation(
  context: RecommendationContext
): Promise<GenerateResult> {
  const cacheKey = buildCacheKey(context);
  const cached = await recommendationCache.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as GenerateResult;
      logger.info('ai.recommendation.cache_hit', {
        traceId: context.traceId,
        cacheKey,
      });
      return parsed;
    } catch {
      // corrupted cache entry, regenerate
    }
  }

  const prompt = buildRecommendationPrompt(context);
  const modelsToTry = [aiConfig.primaryModel, aiConfig.secondaryModel].filter(
    (value, index, array) => Boolean(value) && array.indexOf(value) === index
  );

  for (const modelId of modelsToTry) {
    try {
      const response = await invokeModel(modelId, prompt);
      const recommendation: RecommendationRecord = {
        recommendedLessonId: response.recommendedLessonId,
        recommendedLessonSlug: response.recommendedLessonSlug,
        lessonTitle: response.lessonTitle,
        focusStandards: response.focusStandards,
        reasoning: response.reasoning,
        confidence: response.confidence,
        nextBestAlternatives: response.nextBestAlternatives,
      };

      if (modelId !== aiConfig.primaryModel) {
        logger.warn('ai.recommendation.secondary_model_used', {
          traceId: context.traceId,
          model: modelId,
        });
      }

      const result: GenerateResult = {
        recommendation,
        modelUsed: modelId,
        fallbackUsed: false,
      };

      await recommendationCache
        .set(cacheKey, JSON.stringify(result))
        .catch(() => {});

      return result;
    } catch (error) {
      logger.warn('ai.recommendation.model_error', {
        traceId: context.traceId,
        model: modelId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  const fallback = generateFallbackRecommendation(context);
  logger.warn('ai.recommendation.fallback_rules', {
    traceId: context.traceId,
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

export { recommendationSchema };

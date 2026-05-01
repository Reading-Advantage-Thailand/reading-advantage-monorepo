import { z } from 'zod';

const aiEnvSchema = z.object({
  AI_RECOMMENDER_MODEL_PRIMARY: z.string().optional(),
  AI_RECOMMENDER_MODEL_SECONDARY: z.string().optional(),
  AI_RECOMMENDER_MODEL: z.string().optional(),
  AI_RECOMMENDER_TIMEOUT_MS: z.string().optional(),
  AI_RECOMMENDATION_TIMEOUT_MS: z.string().optional(),
  AI_RECOMMENDER_CACHE_TTL_SECONDS: z.string().optional(),
  AI_RECOMMENDER_HASH_SECRET: z.string().optional(),
  AI_RECOMMENDER_MAX_REQUESTS_PER_MIN: z.string().optional(),
});

const parsed = aiEnvSchema.parse({
  AI_RECOMMENDER_MODEL_PRIMARY: process.env.AI_RECOMMENDER_MODEL_PRIMARY,
  AI_RECOMMENDER_MODEL_SECONDARY: process.env.AI_RECOMMENDER_MODEL_SECONDARY,
  AI_RECOMMENDER_MODEL: process.env.AI_RECOMMENDER_MODEL,
  AI_RECOMMENDER_TIMEOUT_MS: process.env.AI_RECOMMENDER_TIMEOUT_MS,
  AI_RECOMMENDATION_TIMEOUT_MS: process.env.AI_RECOMMENDATION_TIMEOUT_MS,
  AI_RECOMMENDER_CACHE_TTL_SECONDS:
    process.env.AI_RECOMMENDER_CACHE_TTL_SECONDS,
  AI_RECOMMENDER_HASH_SECRET: process.env.AI_RECOMMENDER_HASH_SECRET,
  AI_RECOMMENDER_MAX_REQUESTS_PER_MIN:
    process.env.AI_RECOMMENDER_MAX_REQUESTS_PER_MIN,
});

function parseNumber(value: string | undefined, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

const timeoutSource =
  parsed.AI_RECOMMENDER_TIMEOUT_MS ?? parsed.AI_RECOMMENDATION_TIMEOUT_MS;

export const aiConfig = {
  primaryModel:
    parsed.AI_RECOMMENDER_MODEL_PRIMARY ??
    parsed.AI_RECOMMENDER_MODEL ??
    'gemini-2.5-flash',
  secondaryModel: parsed.AI_RECOMMENDER_MODEL_SECONDARY ?? 'gpt-5-mini',
  timeoutMs: parseNumber(timeoutSource, 10_000),
  cacheTtlMs:
    parseNumber(parsed.AI_RECOMMENDER_CACHE_TTL_SECONDS, 15 * 60) * 1000,
  hashSecret: parsed.AI_RECOMMENDER_HASH_SECRET ?? 'science-advantage',
  maxRequestsPerWindow: parseNumber(
    parsed.AI_RECOMMENDER_MAX_REQUESTS_PER_MIN,
    3
  ),
  rateLimitWindowMs: 60_000,
};

export type AiConfig = typeof aiConfig;

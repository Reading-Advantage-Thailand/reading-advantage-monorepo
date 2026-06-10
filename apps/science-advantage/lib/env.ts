import { z } from 'zod';

/**
 * Centralised environment variable validation for science-advantage.
 *
 * Every variable listed in `.env.example` is declared here. Boot-time
 * `envSchema.parse(process.env)` fails fast on missing required vars.
 *
 * Consumers: `import { env } from '@/lib/env'` — never read `process.env`
 * directly outside this file.
 */

const envSchema = z
  .object({
    // ── Database ──────────────────────────────────────────────
    DATABASE_URL: z.string().url().optional().default('postgresql://localhost:5432/test'),
    DIRECT_DATABASE_URL: z.string().url().optional(),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().optional().default(3),

    // ── Redis ─────────────────────────────────────────────────
    REDIS_URL: z.string().optional(),

    // ── AI keys ───────────────────────────────────────────────
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),

    // ── AI Recommendation ─────────────────────────────────────
    AI_RECOMMENDER_MODEL_PRIMARY: z.string().optional(),
    AI_RECOMMENDER_MODEL_SECONDARY: z.string().optional(),
    AI_RECOMMENDER_MODEL: z.string().optional(),
    AI_RECOMMENDER_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
    AI_RECOMMENDATION_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
    AI_RECOMMENDER_CACHE_TTL_SECONDS: z.coerce.number().int().positive().optional(),
    AI_RECOMMENDER_HASH_SECRET: z.string().optional(),
    AI_RECOMMENDER_MAX_REQUESTS_PER_MIN: z.coerce.number().int().positive().optional(),

    // ── AI Image Generation ───────────────────────────────────
    AI_IMAGE_PRIMARY_MODEL: z.string().optional(),
    AI_IMAGE_FALLBACK_MODELS: z.string().optional(),
    AI_IMAGE_MAX_WIDTH: z.coerce.number().int().positive().optional(),
    AI_IMAGE_MAX_BYTES: z.coerce.number().int().positive().optional(),

    // ── Runtime flags ─────────────────────────────────────────
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DEV_AUTH_ENABLED: z.string().optional(),
    NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: z.string().optional(),
    NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION: z.string().optional(),
    NEXT_PUBLIC_STRUCTURED_CONTENT_ENABLED: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.AI_RECOMMENDER_HASH_SECRET && data.AI_RECOMMENDER_HASH_SECRET.length < 32) {
        return false;
      }
      return true;
    },
    { message: 'AI_RECOMMENDER_HASH_SECRET must be at least 32 characters', path: ['AI_RECOMMENDER_HASH_SECRET'] }
  );

const rawEnv = envSchema.parse(process.env);

/**
 * Parse a comma-separated list into a trimmed, filtered array.
 */
function parseCommaSeparated(input: string | undefined, fallback: string[]): string[] {
  if (!input) return fallback;
  return input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Parse a string to a number, returning the fallback if not finite.
 */
function parseNumber(value: number | string | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * Parse a string boolean ("true"/"false") with a fallback for when absent.
 */
function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true';
}

// ── Derived AI recommender config ─────────────────────────────
const timeoutSource = rawEnv.AI_RECOMMENDER_TIMEOUT_MS ?? rawEnv.AI_RECOMMENDATION_TIMEOUT_MS;

const aiRecommender = {
  primaryModel:
    rawEnv.AI_RECOMMENDER_MODEL_PRIMARY ??
    rawEnv.AI_RECOMMENDER_MODEL ??
    'gemini-2.5-flash',
  secondaryModel: rawEnv.AI_RECOMMENDER_MODEL_SECONDARY ?? 'gpt-5-mini',
  timeoutMs: parseNumber(timeoutSource, 10_000),
  cacheTtlMs: parseNumber(rawEnv.AI_RECOMMENDER_CACHE_TTL_SECONDS, 15 * 60) * 1000,
  hashSecret: rawEnv.AI_RECOMMENDER_HASH_SECRET ?? 'science-advantage',
  maxRequestsPerWindow: parseNumber(rawEnv.AI_RECOMMENDER_MAX_REQUESTS_PER_MIN, 3),
  rateLimitWindowMs: 60_000,
};

// ── Derived AI image config ───────────────────────────────────
const aiImage = {
  primaryModel: rawEnv.AI_IMAGE_PRIMARY_MODEL ?? 'google/gemini-3-pro-image',
  fallbackModels: parseCommaSeparated(rawEnv.AI_IMAGE_FALLBACK_MODELS, ['openai/dall-e-3']),
  maxWidth: parseNumber(rawEnv.AI_IMAGE_MAX_WIDTH, 1600),
  maxBytes: parseNumber(rawEnv.AI_IMAGE_MAX_BYTES, 200_000),
  googleApiKey: rawEnv.GEMINI_API_KEY ?? rawEnv.GOOGLE_API_KEY,
  openaiApiKey: rawEnv.OPENAI_API_KEY,
};

export const env = {
  // ── Database ──────────────────────────────────────────────
  DATABASE_URL: rawEnv.DATABASE_URL,
  DIRECT_DATABASE_URL: rawEnv.DIRECT_DATABASE_URL ?? rawEnv.DATABASE_URL,
  DATABASE_POOL_MAX: rawEnv.DATABASE_POOL_MAX,

  // ── Redis ─────────────────────────────────────────────────
  REDIS_URL: rawEnv.REDIS_URL,

  // ── AI keys (for direct use) ──────────────────────────────
  OPENAI_API_KEY: rawEnv.OPENAI_API_KEY,
  GEMINI_API_KEY: rawEnv.GEMINI_API_KEY,
  GOOGLE_API_KEY: rawEnv.GOOGLE_API_KEY,

  // ── AI config objects ─────────────────────────────────────
  aiRecommender,
  aiImage,

  // ── Runtime flags ─────────────────────────────────────────
  NODE_ENV: rawEnv.NODE_ENV,
  DEV_AUTH_ENABLED: parseBoolean(rawEnv.DEV_AUTH_ENABLED, rawEnv.NODE_ENV === 'development'),
  NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: parseBoolean(
    rawEnv.NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE,
    rawEnv.NODE_ENV !== 'production'
  ),
  NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION: parseBoolean(
    rawEnv.NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION,
    rawEnv.NODE_ENV !== 'production'
  ),
  NEXT_PUBLIC_STRUCTURED_CONTENT_ENABLED: parseBoolean(
    rawEnv.NEXT_PUBLIC_STRUCTURED_CONTENT_ENABLED,
    false
  ),
};

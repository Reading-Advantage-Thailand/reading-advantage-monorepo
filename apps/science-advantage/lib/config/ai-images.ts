import { z } from 'zod';

const imageEnvSchema = z.object({
  AI_IMAGE_PRIMARY_MODEL: z.string().optional(),
  AI_IMAGE_FALLBACK_MODELS: z.string().optional(),
  AI_IMAGE_MAX_WIDTH: z.string().optional(),
  AI_IMAGE_MAX_BYTES: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

const parsed = imageEnvSchema.parse({
  AI_IMAGE_PRIMARY_MODEL: process.env.AI_IMAGE_PRIMARY_MODEL,
  AI_IMAGE_FALLBACK_MODELS: process.env.AI_IMAGE_FALLBACK_MODELS,
  AI_IMAGE_MAX_WIDTH: process.env.AI_IMAGE_MAX_WIDTH,
  AI_IMAGE_MAX_BYTES: process.env.AI_IMAGE_MAX_BYTES,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});

function parseNumber(value: string | undefined, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseFallbackModels(input: string | undefined) {
  if (!input) return ['openai/dall-e-3'];

  return input
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const aiImageConfig = {
  primaryModel: parsed.AI_IMAGE_PRIMARY_MODEL ?? 'google/gemini-3-pro-image',
  fallbackModels: parseFallbackModels(parsed.AI_IMAGE_FALLBACK_MODELS),
  maxWidth: parseNumber(parsed.AI_IMAGE_MAX_WIDTH, 1600),
  maxBytes: parseNumber(parsed.AI_IMAGE_MAX_BYTES, 200_000),
  googleApiKey: parsed.GEMINI_API_KEY ?? parsed.GOOGLE_API_KEY,
  openaiApiKey: parsed.OPENAI_API_KEY,
};

export type AiImageConfig = typeof aiImageConfig;

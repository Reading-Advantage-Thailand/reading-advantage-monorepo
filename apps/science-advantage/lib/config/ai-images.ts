import { env } from '@/lib/env';

export const aiImageConfig = {
  primaryModel: env.aiImage.primaryModel,
  fallbackModels: env.aiImage.fallbackModels,
  maxWidth: env.aiImage.maxWidth,
  maxBytes: env.aiImage.maxBytes,
  googleApiKey: env.aiImage.googleApiKey,
  openaiApiKey: env.aiImage.openaiApiKey,
};

export type AiImageConfig = typeof aiImageConfig;

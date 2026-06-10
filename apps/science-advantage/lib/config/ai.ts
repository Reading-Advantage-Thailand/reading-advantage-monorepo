import { env } from '@/lib/env';

export const aiConfig = {
  primaryModel: env.aiRecommender.primaryModel,
  secondaryModel: env.aiRecommender.secondaryModel,
  timeoutMs: env.aiRecommender.timeoutMs,
  cacheTtlMs: env.aiRecommender.cacheTtlMs,
  hashSecret: env.aiRecommender.hashSecret,
  maxRequestsPerWindow: env.aiRecommender.maxRequestsPerWindow,
  rateLimitWindowMs: env.aiRecommender.rateLimitWindowMs,
};

export type AiConfig = typeof aiConfig;

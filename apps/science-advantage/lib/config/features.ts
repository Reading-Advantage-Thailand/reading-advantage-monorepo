import { env } from '@/lib/env';

export function isAiRecommendationEnabled() {
  return env.NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION;
}

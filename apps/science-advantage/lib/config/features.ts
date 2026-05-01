export function isAiRecommendationEnabled() {
  const raw = process.env.NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION;
  if (raw === undefined) {
    return process.env.NODE_ENV !== 'production';
  }
  return raw === 'true';
}

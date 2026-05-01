import type { CandidateLesson, RecommendationContext, RecommendationRecord } from './types';

const WEAK_THRESHOLD = 0.6;

function listWeakStandards(context: RecommendationContext) {
  return context.masterySnapshot
    .filter(entry => entry.masteryLevel < WEAK_THRESHOLD)
    .map(entry => entry.code);
}

function pickLesson(
  lessons: CandidateLesson[],
  predicate: (lesson: CandidateLesson) => boolean
) {
  return lessons.find(predicate);
}

function toRecord(
  orderedLessons: CandidateLesson[],
  target: CandidateLesson,
  focusStandards: string[],
  fallback: boolean
): RecommendationRecord {
  const alternatives = focusStandards.length
    ? focusStandards
    : target.standards.map(standard => standard.code);

  return {
    recommendedLessonId: target.id,
    recommendedLessonSlug: target.slug,
    lessonTitle: target.title,
    focusStandards: alternatives.slice(0, 3),
    reasoning: `Based on your mastery levels, focusing on ${
      alternatives.slice(0, 3).join(', ') || 'key standards'
    } will strengthen your understanding before moving on.`,
    confidence: fallback ? 'medium' : 'high',
    nextBestAlternatives: orderedLessons
      .filter(lesson => lesson.id !== target.id && !lesson.completed)
      .slice(0, 2)
      .map(lesson => ({ lessonId: lesson.id, lessonTitle: lesson.title })),
  };
}

function lessons(context: RecommendationContext) {
  return context.candidateLessons.slice().sort((a, b) => a.order - b.order);
}

export function generateFallbackRecommendation(
  context: RecommendationContext
): RecommendationRecord {
  const orderedLessons = lessons(context);
  const weakStandards = listWeakStandards(context);

  if (!orderedLessons.length) {
    return {
      recommendedLessonId: context.attemptSummary.lessonId,
      recommendedLessonSlug: context.attemptSummary.lessonSlug,
      lessonTitle: context.attemptSummary.lessonTitle,
      focusStandards: weakStandards.slice(0, 3),
      reasoning:
        'Complete the next recommended practice to reinforce the standards you are still mastering.',
      confidence: 'medium',
      nextBestAlternatives: [],
    };
  }

  const weakTargets = weakStandards.length
    ? weakStandards
    : context.attemptSummary.incorrectStandards;

  const target =
    pickLesson(
      orderedLessons,
      lesson =>
        !lesson.completed &&
        lesson.standards.some(standard => weakTargets.includes(standard.code))
    ) || pickLesson(orderedLessons, lesson => !lesson.completed) || orderedLessons[0];

  return toRecord(orderedLessons, target, weakTargets, true);
}

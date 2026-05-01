import type { RecommendationContext } from '../types';

function formatCandidateLessons(context: RecommendationContext) {
  const lessons = context.candidateLessons.slice(0, 10).map(lesson => ({
    id: lesson.id,
    title: lesson.title,
    standards: lesson.standards.map(standard => standard.code),
    completed: lesson.completed,
    prerequisites: lesson.prerequisites,
    order: lesson.order,
  }));

  return JSON.stringify(lessons, null, 2);
}

function formatMasterySnapshot(context: RecommendationContext) {
  const snapshot = context.masterySnapshot.map(entry => ({
    code: entry.code,
    masteryLevel: entry.masteryLevel,
    evidenceCount: entry.evidenceCount,
    lastAssessedAt: entry.lastAssessedAt,
  }));

  return JSON.stringify(snapshot, null, 2);
}

export function buildRecommendationPrompt(context: RecommendationContext) {
  const candidateLessons = formatCandidateLessons(context);
  const masterySnapshot = formatMasterySnapshot(context);
  const incorrectStandards = context.attemptSummary.incorrectStandards.join(', ');

  return `You are an AI learning coach for Science Advantage. Provide a JSON response that recommends the next best lesson for the student.

Student Hash: ${context.studentHash}
Grade Level: ${context.studentGrade ?? 'unknown'}
Standards Alignment: ${context.standardsAlignment ?? 'unknown'}
Curriculum: ${context.curriculumTitle ?? 'not specified'}

## Mastery Snapshot (lowest first)
${masterySnapshot}

## Attempt Summary
- Lesson: ${context.attemptSummary.lessonTitle} (${context.attemptSummary.lessonSlug})
- Score Percentage: ${context.attemptSummary.scorePercentage ?? 'N/A'}
- Correct Answers: ${context.attemptSummary.correctCount} / ${context.attemptSummary.questionCount}
- Incorrect Standards: ${incorrectStandards || 'None captured'}

## Candidate Lessons
${candidateLessons}

Instructions:
1. Recommend a lesson that is not completed.
2. Align focus standards with the mastery snapshot or incorrect standards when possible.
3. Keep reasoning under 320 characters and student-friendly.
4. Include up to two alternate lessons.
5. Respond strictly in JSON with the schema described elsewhere in this prompt.`;
}

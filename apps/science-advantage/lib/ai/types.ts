import type { LessonType, StandardsAlignment } from '@prisma/client';

export type MasterySnapshotEntry = {
  standardId: string;
  code: string;
  description: string | null;
  masteryLevel: number;
  evidenceCount: number;
  lastAssessedAt: string;
};

export type CandidateLesson = {
  id: string;
  slug: string;
  title: string;
  lessonType: LessonType;
  order: number;
  gradeLevel: number;
  standards: { id: string; code: string }[];
  prerequisites: string[];
  completed: boolean;
};

export type AttemptPerformance = {
  attemptId: string;
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  completedAt: string | null;
  scorePercentage: number | null;
  questionCount: number;
  correctCount: number;
  incorrectStandards: string[];
};

export type RecommendationContext = {
  traceId: string;
  studentId: string;
  studentHash: string;
  studentGrade: number | null;
  standardsAlignment: StandardsAlignment | null;
  masterySnapshot: MasterySnapshotEntry[];
  masteryVersion: number;
  candidateLessons: CandidateLesson[];
  attemptSummary: AttemptPerformance;
  curriculumTitle: string | null;
};

export type RecommendationRecord = {
  recommendedLessonId: string;
  recommendedLessonSlug: string;
  lessonTitle: string;
  focusStandards: string[];
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  nextBestAlternatives: { lessonId: string; lessonTitle: string }[];
};

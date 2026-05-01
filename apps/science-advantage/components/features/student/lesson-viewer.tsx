"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LessonPlayer } from '@/components/features/lesson';
import {
  LessonContentSchema,
  type LessonContent,
} from '@/lib/schemas/lesson-content.schema';

interface Standard {
  id: string;
  code: string;
  description: string;
  descriptionThai: string;
  framework: 'THAI' | 'NGSS';
  gradeLevel: number;
}

interface LessonData {
  lesson: {
    id: string;
    slug: string;
    title: string;
    titleThai: string;
    content: string;
    contentThai: string;
    objectives: string[];
    objectivesThai: string[];
    structuredContent?: unknown;
    contentType?: 'legacy' | 'structured';
    contentVersion?: number;
  };
  standards: Standard[];
}

type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

interface LessonProgressSummary {
  status: LessonProgressStatus;
  attemptsCount: number;
  mostRecentScore: number | null;
  mostRecentScorePercentage: number | null;
  bestScore: number | null;
  bestScorePercentage: number | null;
}

interface LessonViewerProps {
  classId: string;
  lessonSlug: string;
  progress?: LessonProgressSummary | null;
  progressLoading?: boolean;
  onStartQuiz?: () => void;
  /** Show Thai translations when available */
  showThai?: boolean;
  /** Display preference mode: 'en', 'th', or 'side-by-side' */
  displayPreference?: 'en' | 'th' | 'side-by-side';
}

const PROGRESS_STATUS_META: Record<
  LessonProgressStatus,
  { label: string; badgeClass: string; description: string }
> = {
  NOT_STARTED: {
    label: 'Not Started',
    badgeClass: 'bg-gray-50 text-gray-600 border-gray-200',
    description: 'Complete the lesson and start the quiz to track your progress.',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'You have started working on this lesson. Finish the quiz to see your score.',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Great work! Retake the quiz anytime to improve your score.',
  },
};

const getScoreBadgeClass = (percentage: number) => {
  if (percentage >= 90) return 'bg-blue-100 text-blue-900 border-blue-200';
  if (percentage >= 80) return 'bg-emerald-100 text-emerald-900 border-emerald-200';
  if (percentage >= 60) return 'bg-yellow-100 text-yellow-900 border-yellow-200';
  return 'bg-rose-100 text-rose-900 border-rose-200';
};

const formatPercentage = (value: number | null) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${Math.round(value)}%`;
};

/**
 * Feature flag check for structured content.
 * Can be disabled via environment variable.
 * Note: NEXT_PUBLIC_* variables are inlined at build time,
 * so they're available on both server and client.
 */
const isStructuredContentEnabled = () => {
  return process.env.NEXT_PUBLIC_STRUCTURED_CONTENT_ENABLED !== 'false';
};

/**
 * Safely validates structured content without throwing.
 * Returns validated content or null if invalid.
 */
function validateStructuredContent(data: unknown): LessonContent | null {
  const result = LessonContentSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('[LessonContentRenderer] Structured content validation failed:', result.error);
  return null;
}

/**
 * Renders lesson content - either structured (LessonPlayer) or legacy (simple text).
 * Falls back to legacy content if structured content fails validation.
 */
function LessonContentRenderer({
  lesson,
  displayPreference,
}: {
  lesson: LessonData['lesson'];
  displayPreference?: 'en' | 'th' | 'side-by-side';
}) {
  // Check if structured content is enabled and available
  const structuredEnabled = isStructuredContentEnabled();

  // Validate structured content outside of JSX
  const validatedContent = structuredEnabled && lesson.structuredContent
    ? validateStructuredContent(lesson.structuredContent)
    : null;

  if (validatedContent) {
    return (
      <LessonPlayer content={validatedContent} displayPreference={displayPreference} />
    );
  }

  // Legacy content fallback
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lesson Content</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-gray-700">
            {lesson.content || 'No content available for this lesson.'}
          </div>
          {lesson.contentThai !== lesson.content && (
            <div className="mt-6 border-t pt-6">
              <p className="mb-3 text-sm font-semibold text-gray-600">
                เนื้อหาบทเรียน:
              </p>
              <div className="whitespace-pre-wrap text-gray-700">
                {lesson.contentThai}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LessonViewer({ classId, lessonSlug, progress, progressLoading = false, onStartQuiz, showThai, displayPreference }: LessonViewerProps) {
  const router = useRouter();
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const progressSummary = useMemo<LessonProgressSummary>(() => {
    return (
      progress ?? {
        status: 'NOT_STARTED',
        attemptsCount: 0,
        mostRecentScore: null,
        mostRecentScorePercentage: null,
        bestScore: null,
        bestScorePercentage: null,
      }
    );
  }, [progress]);

  const statusMeta = PROGRESS_STATUS_META[progressSummary.status];
  const hasScore = typeof progressSummary.mostRecentScorePercentage === 'number';
  const ctaLabel = progressSummary.attemptsCount > 0 ? 'Retake Quiz' : 'Start Quiz';

  useEffect(() => {
    async function fetchLesson() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/lessons/${lessonSlug}`);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Please sign in to view this lesson');
          } else if (response.status === 403) {
            throw new Error('You are not enrolled in a class with this lesson');
          } else if (response.status === 404) {
            throw new Error('Lesson not found');
          } else {
            throw new Error('Failed to load lesson');
          }
        }

        const data = await response.json();
        setLessonData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchLesson();
  }, [lessonSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        <span className="ml-2 text-gray-600">Loading lesson...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to curriculum
        </Button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!lessonData) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to curriculum
        </Button>
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">No lesson data available.</p>
        </div>
      </div>
    );
  }

  const handleQuizCta = () => {
    if (onStartQuiz) {
      onStartQuiz();
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.push(`/student/classes/${classId}`)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to curriculum
      </Button>

      {/* Lesson Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">{lessonData.lesson.title}</h1>
        {lessonData.lesson.titleThai !== lessonData.lesson.title && (
          <p className="text-xl text-gray-600">{lessonData.lesson.titleThai}</p>
        )}
      </div>

      {/* Learning Objectives */}
      {lessonData.lesson.objectives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Learning Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5">
              {lessonData.lesson.objectives.map((objective, index) => (
                <li key={index} className="text-gray-700">
                  {objective}
                </li>
              ))}
            </ul>
            {lessonData.lesson.objectivesThai.some(
              (thai, i) => thai !== lessonData.lesson.objectives[i]
            ) && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-sm font-semibold text-gray-600">วัตถุประสงค์การเรียนรู้:</p>
                <ul className="list-disc space-y-2 pl-5">
                  {lessonData.lesson.objectivesThai.map((objective, index) => (
                    <li key={index} className="text-gray-700">
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lesson Content */}
      <LessonContentRenderer
        lesson={lessonData.lesson}
        displayPreference={displayPreference}
      />

      {/* Lesson Progress & Quiz CTA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lesson Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge variant="outline" className={statusMeta.badgeClass}>
                {statusMeta.label}
              </Badge>
              <p className="mt-2 text-sm text-gray-600">{statusMeta.description}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-700">
                <span>
                  Attempts:{' '}
                  <span className="font-semibold text-gray-900">
                    {progressSummary.attemptsCount}
                  </span>
                </span>
                {hasScore && (
                  <>
                    <span>
                      Most recent:{' '}
                      <span className="font-semibold text-gray-900">
                        {formatPercentage(progressSummary.mostRecentScorePercentage)}
                      </span>
                    </span>
                    <span>
                      Best:{' '}
                      <span className="font-semibold text-gray-900">
                        {formatPercentage(progressSummary.bestScorePercentage ?? progressSummary.mostRecentScorePercentage)}
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasScore && progressSummary.mostRecentScorePercentage !== null && (
                <span
                  className={`rounded-full border px-3 py-1 text-sm font-semibold ${getScoreBadgeClass(
                    progressSummary.mostRecentScorePercentage
                  )}`}
                >
                  {formatPercentage(progressSummary.mostRecentScorePercentage)}
                </span>
              )}
              <Button
                onClick={handleQuizCta}
                disabled={!onStartQuiz || progressLoading}
                className="gap-2"
              >
                {progressLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <FileQuestion className="h-4 w-4" />
                    {ctaLabel}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standards Covered */}
      {lessonData.standards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Standards Covered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lessonData.standards.map((standard) => (
                <div
                  key={standard.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Badge
                      variant="outline"
                      className={
                        standard.framework === 'THAI'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }
                    >
                      {standard.framework}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {standard.code}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {standard.description}
                      </p>
                      {standard.descriptionThai !== standard.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {standard.descriptionThai}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        Grade {standard.gradeLevel}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

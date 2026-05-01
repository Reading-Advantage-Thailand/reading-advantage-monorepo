'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LessonPlayer } from '@/components/features/lesson';
import { AssignButton } from '@/components/features/teacher/assign-button';
import {
  LessonContentSchema,
  type LessonContent,
} from '@/lib/schemas/lesson-content.schema';
import { DisplayPreferenceProvider, useDisplayPreference } from '@/contexts/display-preference-context';
import { DisplayPreferenceSelector } from '@/components/features/lesson/display-preference-selector';

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

interface AssignmentData {
  id: string;
  lessonId: string;
  classId: string;
  dueAt: string | null;
}

interface TeacherLessonPreviewProps {
  classId: string;
  lessonSlug: string;
}

/**
 * Feature flag check for structured content.
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
  console.warn('[TeacherLessonPreview] Structured content validation failed:', result.error);
  return null;
}

/**
 * Renders lesson content - either structured (LessonPlayer) or legacy (simple text).
 */
function LessonContentRenderer({
  lesson,
  displayPreference,
}: {
  lesson: LessonData['lesson'];
  displayPreference: 'en' | 'th' | 'side-by-side';
}) {
  const structuredEnabled = isStructuredContentEnabled();

  // Validate structured content outside of JSX
  const validatedContent = structuredEnabled && lesson.structuredContent
    ? validateStructuredContent(lesson.structuredContent)
    : null;

  if (validatedContent) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lesson Content</CardTitle>
            <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
              Rich Content
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <LessonPlayer content={validatedContent} displayPreference={displayPreference} />
        </CardContent>
      </Card>
    );
  }

  // Legacy content fallback
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Lesson Content</CardTitle>
          <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">
            Legacy Content
          </Badge>
        </div>
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

/**
 * Inner preview content that uses the language context.
 */
function PreviewContent({
  classId,
  lessonSlug,
}: {
  classId: string;
  lessonSlug: string;
}) {
  const router = useRouter();
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const { displayPreference } = useDisplayPreference();

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
            throw new Error('You do not have permission to view this lesson');
          } else if (response.status === 404) {
            throw new Error('Lesson not found');
          } else {
            throw new Error('Failed to load lesson');
          }
        }

        const data = await response.json();
        setLessonData(data);

        // Fetch existing assignment for this lesson
        try {
          const assignmentsRes = await fetch(`/api/classes/${classId}/assignments`);
          if (assignmentsRes.ok) {
            const assignmentsData = await assignmentsRes.json();
            const existing = assignmentsData.data.assignments.find(
              (a: AssignmentData) => a.lessonId === data.lesson.id
            );
            if (existing) {
              setAssignment(existing);
            }
          }
        } catch {
          // Silently handle - assignment state just won't show
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchLesson();
  }, [lessonSlug, classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        <span className="ml-2 text-gray-600">Loading lesson preview...</span>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push(`/teacher/classes/${classId}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to curriculum
        </Button>
        <div className="flex items-center gap-2">
          <AssignButton
            classId={classId}
            lessonId={lessonData.lesson.id}
            lessonTitle={lessonData.lesson.title}
            existingAssignment={assignment ?? undefined}
            onAssigned={setAssignment}
            onRemoved={() => setAssignment(null)}
          />
          <DisplayPreferenceSelector />
        </div>
      </div>

      {/* Lesson Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">{lessonData.lesson.title}</h2>
        {lessonData.lesson.titleThai !== lessonData.lesson.title && (
          <p className="text-lg text-gray-600">{lessonData.lesson.titleThai}</p>
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
                <p className="mb-2 text-sm font-semibold text-gray-600">
                  วัตถุประสงค์การเรียนรู้:
                </p>
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
      <LessonContentRenderer lesson={lessonData.lesson} displayPreference={displayPreference} />

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

/**
 * Teacher lesson preview component with language support.
 * Shows a "Preview Mode" badge and content type indicator (Rich/Legacy).
 */
export function TeacherLessonPreview({ classId, lessonSlug }: TeacherLessonPreviewProps) {
  return (
    <DisplayPreferenceProvider>
      <PreviewContent classId={classId} lessonSlug={lessonSlug} />
    </DisplayPreferenceProvider>
  );
}

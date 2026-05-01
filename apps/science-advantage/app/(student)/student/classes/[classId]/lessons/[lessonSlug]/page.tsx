"use client";

import { useState, useEffect, useCallback, use } from 'react';
import { LessonViewer } from '@/components/features/student/lesson-viewer';
import { QuizPlayer } from '@/components/features/student/quiz-player';
import { Button } from '@/components/ui/button';
import { BookOpen, FileQuestion } from 'lucide-react';
import { DisplayPreferenceProvider, useDisplayPreference } from '@/contexts/display-preference-context';
import { DisplayPreferenceSelector } from '@/components/features/lesson/display-preference-selector';

interface PageProps {
  params: Promise<{
    classId: string;
    lessonSlug: string;
  }>;
}

interface LessonProgressResponse {
  studentId: string;
  lessonId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  attemptsCount: number;
  mostRecentScore: number | null;
  mostRecentScorePercentage: number | null;
  bestScore: number | null;
  bestScorePercentage: number | null;
  completedAt: string | null;
  lastAttemptAt: string | null;
  totalTimeSpentSeconds: number;
}

/**
 * Inner lesson page content that uses the language context.
 */
function LessonPageContent({
  classId,
  lessonSlug,
}: {
  classId: string;
  lessonSlug: string;
}) {
  const [view, setView] = useState<'lesson' | 'quiz'>('lesson');
  const [progress, setProgress] = useState<LessonProgressResponse | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const { displayPreference } = useDisplayPreference();

  const fetchProgress = useCallback(async () => {
    try {
      setProgressLoading(true);
      const response = await fetch(`/api/students/me/lessons/${lessonSlug}/progress`);

      if (!response.ok) {
        if (response.status === 404) {
          setProgress(null);
          return;
        }
        if (response.status === 401) {
          throw new Error('Please sign in to view progress');
        }
        throw new Error('Failed to load lesson progress');
      }

      const data = (await response.json()) as LessonProgressResponse;
      setProgress(data);
    } catch (error) {
      console.error(error);
      setProgress(null);
    } finally {
      setProgressLoading(false);
    }
  }, [lessonSlug]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleStartQuiz = useCallback(() => {
    setView('quiz');
  }, []);

  const handleQuizCompleted = useCallback(() => {
    fetchProgress();
  }, [fetchProgress]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header with View Toggle and Language Toggle */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex gap-2">
          <Button
            variant={view === 'lesson' ? 'default' : 'ghost'}
            onClick={() => setView('lesson')}
            className="gap-2 rounded-b-none"
          >
            <BookOpen className="h-4 w-4" />
            Lesson
          </Button>
          <Button
            variant={view === 'quiz' ? 'default' : 'ghost'}
            onClick={() => setView('quiz')}
            className="gap-2 rounded-b-none"
          >
            <FileQuestion className="h-4 w-4" />
            Quiz
          </Button>
        </div>
        <DisplayPreferenceSelector />
      </div>

      {/* Content */}
      {view === 'lesson' ? (
        <LessonViewer
          classId={classId}
          lessonSlug={lessonSlug}
          progress={progress}
          progressLoading={progressLoading}
          onStartQuiz={handleStartQuiz}
          displayPreference={displayPreference}
        />
      ) : (
        <QuizPlayer
          classId={classId}
          lessonSlug={lessonSlug}
          studentId={progress?.studentId}
          onQuizCompleted={handleQuizCompleted}
        />
      )}
    </div>
  );
}

export default function LessonPage({ params }: PageProps) {
  const { classId, lessonSlug } = use(params);

  return (
    <DisplayPreferenceProvider>
      <LessonPageContent classId={classId} lessonSlug={lessonSlug} />
    </DisplayPreferenceProvider>
  );
}

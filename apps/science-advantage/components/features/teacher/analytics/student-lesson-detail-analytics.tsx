'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { StudentAnswer } from '@/components/features/student/quiz-questions/types';

type QuestionBreakdown = {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionType: string;
  studentAnswer: StudentAnswer;
  correctAnswer: StudentAnswer;
  isCorrect: boolean;
  timeSpentSeconds: number;
  points: number;
};

type AttemptHistory = {
  attemptId: string;
  attemptNumber: number;
  startedAt: string;
  completedAt: string | null;
  status: 'completed' | 'in_progress';
  score: number;
  maxScore: number;
  scorePercentage: number;
  totalTimeSeconds: number;
  colorCode: 'blue' | 'green' | 'yellow' | 'red';
  questionBreakdown: QuestionBreakdown[];
};

type StandardPerformance = {
  standardId: string;
  standardCode: string;
  standardDescription: string;
  questionsCount: number;
  questionsAnswered: number;
  questionsCorrect: number;
  masteryPercentage: number;
  colorCode: 'blue' | 'green' | 'yellow' | 'red';
};

type StudentLessonAnalyticsData = {
  student: {
    id: string;
    name: string;
  };
  lesson: {
    id: string;
    title: string;
    order: number;
  };
  attemptHistory: AttemptHistory[];
  standardsPerformance: StandardPerformance[];
};

interface StudentLessonDetailAnalyticsProps {
  classId: string;
  studentId: string;
  lessonId: string;
}

function getScoreColorVariant(colorCode: string) {
  switch (colorCode) {
    case 'blue':
      return 'scoreBlue' as const;
    case 'green':
      return 'scoreGreen' as const;
    case 'yellow':
      return 'scoreYellow' as const;
    case 'red':
      return 'scoreRed' as const;
    default:
      return 'outline' as const;
  }
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatAnswer(answer: StudentAnswer): string {
  if (typeof answer === 'object' && answer !== null) {
    if ('answer' in answer && (answer as Record<string, unknown>).answer) {
      return String((answer as Record<string, unknown>).answer);
    }
    return JSON.stringify(answer);
  }
  return answer === null || typeof answer === 'undefined' ? '' : String(answer);
}

export function StudentLessonDetailAnalytics({
  classId,
  studentId,
  lessonId,
}: StudentLessonDetailAnalyticsProps) {
  const router = useRouter();
  const [data, setData] = useState<StudentLessonAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAttempts, setExpandedAttempts] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, lessonId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/students/${studentId}/lessons/${lessonId}/analytics`
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to view this student data.');
        } else if (response.status === 404) {
          setError('Student or lesson not found.');
        } else {
          setError('Failed to load analytics data.');
        }
        return;
      }

      const analyticsData: StudentLessonAnalyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching student-lesson analytics:', err);
      setError('An unexpected error occurred while loading analytics.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAttemptExpand = (attemptId: string) => {
    const newExpanded = new Set(expandedAttempts);
    if (newExpanded.has(attemptId)) {
      newExpanded.delete(attemptId);
    } else {
      newExpanded.add(attemptId);
    }
    setExpandedAttempts(newExpanded);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>No analytics data available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Button
          variant="link"
          onClick={() => router.push(`/teacher/classes/${classId}/analytics`)}
          className="p-0 h-auto"
        >
          Class Overview
        </Button>
        <span>→</span>
        <Button
          variant="link"
          onClick={() =>
            router.push(`/teacher/classes/${classId}/lessons/${lessonId}`)
          }
          className="p-0 h-auto"
        >
          Lesson Detail
        </Button>
        <span>→</span>
        <span className="font-semibold">Student Detail</span>
      </div>

      {/* Student and Lesson Header */}
      <Card>
        <CardHeader>
          <CardTitle>
            {data.student.name} - {data.lesson.title}
          </CardTitle>
          <div className="text-sm text-gray-600">
            <p>
              <strong>Lesson {data.lesson.order}</strong>
            </p>
            <p className="mt-1">
              Total Attempts: {data.attemptHistory.length}
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Attempt History */}
      <Card>
        <CardHeader>
          <CardTitle>Attempt History</CardTitle>
          <p className="text-sm text-gray-600">
            Click on an attempt to see question-by-question breakdown
          </p>
        </CardHeader>
        <CardContent>
          {data.attemptHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No attempts yet
            </div>
          ) : (
            <div className="space-y-3">
              {data.attemptHistory.map((attempt) => (
                <Collapsible
                  key={attempt.attemptId}
                  open={expandedAttempts.has(attempt.attemptId)}
                  onOpenChange={() => toggleAttemptExpand(attempt.attemptId)}
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      {expandedAttempts.has(attempt.attemptId) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <div className="text-left">
                        <div className="font-semibold">
                          Attempt {attempt.attemptNumber}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDateTime(attempt.startedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <Badge variant={getScoreColorVariant(attempt.colorCode)}>
                          {attempt.scorePercentage}%
                        </Badge>
                        <div className="text-xs text-gray-600 mt-1">
                          {attempt.score}/{attempt.maxScore} points
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          {formatTime(attempt.totalTimeSeconds)}
                        </div>
                        <div className="text-xs text-gray-600">total time</div>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <span
                          className={`text-sm ${
                            attempt.status === 'completed'
                              ? 'text-green-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {attempt.status === 'completed'
                            ? 'Completed'
                            : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="rounded-b-lg border border-t-0 bg-gray-50 p-4">
                    <div className="mb-3 font-semibold text-gray-700">
                      Question-by-Question Breakdown
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Q#</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead className="w-[120px]">
                            Student Answer
                          </TableHead>
                          <TableHead className="w-[120px]">
                            Correct Answer
                          </TableHead>
                          <TableHead className="w-[100px]">Result</TableHead>
                          <TableHead className="w-[100px] text-right">
                            Time
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attempt.questionBreakdown.map((question) => (
                          <TableRow
                            key={question.questionId}
                            className={
                              question.isCorrect ? 'bg-green-50' : 'bg-red-50'
                            }
                          >
                            <TableCell className="font-medium">
                              {question.questionNumber}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div className="max-w-md">
                                {question.questionText}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {question.questionType.replace(/_/g, ' ')}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {formatAnswer(question.studentAnswer)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {formatAnswer(question.correctAnswer)}
                            </TableCell>
                            <TableCell>
                              {question.isCorrect ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-sm">Correct</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-600">
                                  <XCircle className="h-4 w-4" />
                                  <span className="text-sm">Incorrect</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatTime(question.timeSpentSeconds)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Standards Performance */}
      {data.standardsPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Standards Performance</CardTitle>
            <p className="text-sm text-gray-600">
              Performance on standards covered in this lesson (based on most
              recent attempt)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.standardsPerformance.map((standard) => (
                <div
                  key={standard.standardId}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">
                        {standard.standardCode}
                      </div>
                      <div className="text-sm text-gray-600">
                        {standard.standardDescription}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {standard.questionsCount} question
                        {standard.questionsCount !== 1 ? 's' : ''} in this
                        lesson
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={getScoreColorVariant(standard.colorCode)}
                      >
                        {standard.masteryPercentage}%
                      </Badge>
                      <div className="mt-1 text-xs text-gray-600">
                        {standard.questionsCorrect}/
                        {standard.questionsAnswered} correct
                      </div>
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

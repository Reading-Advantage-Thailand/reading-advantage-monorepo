'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, ChevronLeft } from 'lucide-react';

type LessonPerformance = {
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  completionStatus: 'completed' | 'in_progress' | 'not_started';
  mostRecentScore: number | null;
  mostRecentScorePercentage: number | null;
  attemptsCount: number;
  totalTimeSeconds: number;
  colorCode: 'blue' | 'green' | 'yellow' | 'red' | null;
};

type StandardPerformance = {
  standardId: string;
  standardCode: string;
  standardDescription: string;
  questionsAnswered: number;
  questionsCorrect: number;
  masteryPercentage: number;
  colorCode: 'blue' | 'green' | 'yellow' | 'red';
  needsIntervention: boolean;
};

type StudentAnalyticsData = {
  student: {
    id: string;
    name: string;
  };
  class: {
    id: string;
    name: string;
    gradeLevel: number;
    standardsAlignment: string;
  };
  summary: {
    lessonsCompleted: number;
    totalLessons: number;
    averageScore: number;
    averageScorePercentage: number;
    totalTimeSpent: number;
    totalAttempts: number;
    colorCode: 'blue' | 'green' | 'yellow' | 'red';
  };
  lessonsPerformance: LessonPerformance[];
  standardsPerformance: StandardPerformance[];
};

type SortField = 'order' | 'score' | 'attempts' | 'time';
type SortDirection = 'asc' | 'desc';

interface StudentDetailAnalyticsProps {
  classId: string;
  studentId: string;
}

function getScoreColorVariant(colorCode: string | null) {
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

function getSortIcon(
  field: SortField,
  currentField: SortField,
  direction: SortDirection
) {
  if (field !== currentField) {
    return <ArrowUpDown className="ml-2 h-4 w-4" />;
  }
  return direction === 'asc' ? (
    <ArrowUp className="ml-2 h-4 w-4" />
  ) : (
    <ArrowDown className="ml-2 h-4 w-4" />
  );
}

function getCompletionStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="default">Completed</Badge>;
    case 'in_progress':
      return <Badge variant="secondary">In Progress</Badge>;
    case 'not_started':
      return <Badge variant="outline">Not Started</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function StudentDetailAnalytics({
  classId,
  studentId,
}: StudentDetailAnalyticsProps) {
  const router = useRouter();
  const [data, setData] = useState<StudentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, studentId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/students/${studentId}/classes/${classId}/analytics`
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to view this student\'s analytics.');
        } else if (response.status === 404) {
          setError('Student or class not found.');
        } else {
          setError('Failed to load analytics data.');
        }
        return;
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching student analytics:', err);
      setError('An unexpected error occurred while loading analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedLessons = data?.lessonsPerformance
    ? [...data.lessonsPerformance].sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'order':
            comparison = a.lessonOrder - b.lessonOrder;
            break;
          case 'score':
            comparison = (a.mostRecentScore || -1) - (b.mostRecentScore || -1);
            break;
          case 'attempts':
            comparison = a.attemptsCount - b.attemptsCount;
            break;
          case 'time':
            comparison = a.totalTimeSeconds - b.totalTimeSeconds;
            break;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      })
    : [];

  const handleLessonClick = (lessonId: string) => {
    router.push(
      `/teacher/classes/${classId}/students/${studentId}/lessons/${lessonId}`
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
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
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link href={`/teacher/classes/${classId}/analytics`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Class Analytics
          </Button>
        </Link>
      </div>

      {/* Student Header */}
      <div>
        <h1 className="text-3xl font-bold">{data.student.name}</h1>
        <p className="text-lg text-gray-600">
          {data.class.name} (Grade {data.class.gradeLevel})
        </p>
      </div>

      {/* Overall Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <div className="text-sm text-gray-600">Lessons Completed</div>
              <div className="text-2xl font-bold">
                {data.summary.lessonsCompleted} / {data.summary.totalLessons}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Average Score</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {Math.round(data.summary.averageScore)}%
                </span>
                <Badge variant={getScoreColorVariant(data.summary.colorCode)}>
                  {data.summary.colorCode}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Time Spent</div>
              <div className="text-2xl font-bold">
                {formatTime(data.summary.totalTimeSpent)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Attempts</div>
              <div className="text-2xl font-bold">{data.summary.totalAttempts}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessons Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lessons Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {data.lessonsPerformance.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
              No lessons available.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('order')}
                    >
                      Lesson
                      {getSortIcon('order', sortField, sortDirection)}
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('score')}
                    >
                      Most Recent Score
                      {getSortIcon('score', sortField, sortDirection)}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('attempts')}
                    >
                      Attempts
                      {getSortIcon('attempts', sortField, sortDirection)}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort('time')}
                    >
                      Total Time
                      {getSortIcon('time', sortField, sortDirection)}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLessons.map((lesson) => (
                  <TableRow
                    key={lesson.lessonId}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => handleLessonClick(lesson.lessonId)}
                  >
                    <TableCell className="font-medium">
                      {lesson.lessonTitle}
                    </TableCell>
                    <TableCell>
                      {getCompletionStatusBadge(lesson.completionStatus)}
                    </TableCell>
                    <TableCell className="text-right">
                      {lesson.mostRecentScore !== null ? (
                        <Badge variant={getScoreColorVariant(lesson.colorCode)}>
                          {Math.round(lesson.mostRecentScore)}%
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {lesson.attemptsCount > 0 ? (
                        lesson.attemptsCount
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {lesson.totalTimeSeconds > 0 ? (
                        formatTime(lesson.totalTimeSeconds)
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Standards Mastery Section */}
      <Card>
        <CardHeader>
          <CardTitle>Standards Mastery</CardTitle>
          <p className="text-sm text-gray-600">
            Sorted by mastery percentage (lowest first) to highlight areas
            needing intervention
          </p>
        </CardHeader>
        <CardContent>
          {data.standardsPerformance.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
              No standards data available.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Standard Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Questions Answered</TableHead>
                  <TableHead className="text-right">Questions Correct</TableHead>
                  <TableHead className="text-right">Mastery %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.standardsPerformance.map((standard) => (
                  <TableRow key={standard.standardId}>
                    <TableCell className="font-mono font-medium">
                      <div className="flex items-center gap-2">
                        {standard.needsIntervention && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        {standard.standardCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {standard.standardDescription}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {standard.questionsAnswered}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {standard.questionsCorrect}
                    </TableCell>
                    <TableCell className="text-right">
                      {standard.questionsAnswered > 0 ? (
                        <Badge variant={getScoreColorVariant(standard.colorCode)}>
                          {Math.round(standard.masteryPercentage)}%
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

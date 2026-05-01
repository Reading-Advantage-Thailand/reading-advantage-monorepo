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
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type LessonAnalytics = {
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
  completionRate: number;
  studentsCompleted: number;
  averageScore: number;
  averageScorePercentage: number;
  averageAttempts: number;
  averageTimeSeconds: number;
  colorCode: 'blue' | 'green' | 'yellow' | 'red';
};

type ClassAnalyticsData = {
  classId: string;
  className: string;
  totalStudents: number;
  lessons: LessonAnalytics[];
};

type SortField = 'order' | 'completionRate' | 'averageScore';
type SortDirection = 'asc' | 'desc';

interface ClassAnalyticsOverviewProps {
  classId: string;
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

export function ClassAnalyticsOverview({
  classId,
}: ClassAnalyticsOverviewProps) {
  const router = useRouter();
  const [data, setData] = useState<ClassAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/classes/${classId}/analytics/overview`
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to view these analytics.');
        } else if (response.status === 404) {
          setError('Class not found.');
        } else {
          setError('Failed to load analytics data.');
        }
        return;
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
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

  const sortedLessons = data?.lessons
    ? [...data.lessons].sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'order':
            comparison = a.lessonOrder - b.lessonOrder;
            break;
          case 'completionRate':
            comparison = a.completionRate - b.completionRate;
            break;
          case 'averageScore':
            comparison = a.averageScore - b.averageScore;
            break;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      })
    : [];

  const handleLessonClick = (lessonId: string) => {
    router.push(`/teacher/classes/${classId}/analytics/lessons/${lessonId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Class Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
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

  if (data.lessons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Class Analytics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
            No lessons available for analytics. Curriculum may not be set up for
            this class.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Analytics Overview</CardTitle>
        <p className="text-sm text-gray-600">
          Performance data across {data.totalStudents} students and{' '}
          {data.lessons.length} lessons
        </p>
      </CardHeader>
      <CardContent>
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
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold"
                  onClick={() => handleSort('completionRate')}
                >
                  Completion Rate
                  {getSortIcon('completionRate', sortField, sortDirection)}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold"
                  onClick={() => handleSort('averageScore')}
                >
                  Average Score
                  {getSortIcon('averageScore', sortField, sortDirection)}
                </Button>
              </TableHead>
              <TableHead className="text-right">Avg Attempts</TableHead>
              <TableHead className="text-right">Avg Time</TableHead>
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
                  <div>
                    <div className="font-semibold">{lesson.lessonTitle}</div>
                    <div className="text-sm text-gray-500">
                      {lesson.studentsCompleted} of {data.totalStudents}{' '}
                      students completed
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-mono text-sm">
                    {lesson.completionRate}%
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {lesson.studentsCompleted === 0 ? (
                    <span className="text-sm text-gray-500">No data</span>
                  ) : (
                    <Badge variant={getScoreColorVariant(lesson.colorCode)}>
                      {lesson.averageScore}%
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {lesson.studentsCompleted === 0 ? (
                    <span className="text-gray-500">—</span>
                  ) : (
                    lesson.averageAttempts
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {lesson.studentsCompleted === 0 ? (
                    <span className="text-gray-500">—</span>
                  ) : (
                    formatTime(lesson.averageTimeSeconds)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

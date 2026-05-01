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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

type StudentPerformance = {
  studentId: string;
  studentName: string;
  completionStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  mostRecentScore: number | null;
  mostRecentScorePercentage: number | null;
  bestScore: number | null;
  bestScorePercentage: number | null;
  attempts: number;
  totalTimeSeconds: number;
  colorCode: 'blue' | 'green' | 'yellow' | 'red' | null;
};

type QuestionAnalytics = {
  questionId: string;
  questionNumber: number;
  questionTextTruncated: string;
  questionType: string;
  percentCorrect: number;
  averageTimeSeconds: number;
  totalResponses: number;
  correctResponses: number;
  incorrectStudents: string[];
};

type StandardPerformance = {
  standardId: string;
  standardCode: string;
  standardDescription: string;
  questionsCount: number;
  studentsMastered: number;
  percentMastered: number;
  flagForReteach: boolean;
  colorCode: 'blue' | 'green' | 'yellow' | 'red';
};

type LessonAnalyticsData = {
  lesson: {
    id: string;
    title: string;
    order: number;
  };
  standards: Array<{
    code: string;
    description: string;
  }>;
  classStats: {
    totalStudents: number;
    studentsCompleted: number;
    completionRate: number;
    averageScore: number;
    averageScorePercentage: number;
  };
  students: StudentPerformance[];
  questions: QuestionAnalytics[];
  standardsPerformance: StandardPerformance[];
};

type StudentSortField = 'name' | 'score' | 'attempts' | 'time';
type SortDirection = 'asc' | 'desc';

interface LessonDetailAnalyticsProps {
  classId: string;
  lessonId: string;
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
  field: StudentSortField,
  currentField: StudentSortField,
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

export function LessonDetailAnalytics({
  classId,
  lessonId,
}: LessonDetailAnalyticsProps) {
  const router = useRouter();
  const [data, setData] = useState<LessonAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<StudentSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, lessonId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/classes/${classId}/lessons/${lessonId}/analytics`
      );

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to view these analytics.');
        } else if (response.status === 404) {
          setError('Lesson not found.');
        } else {
          setError('Failed to load analytics data.');
        }
        return;
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching lesson analytics:', err);
      setError('An unexpected error occurred while loading analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: StudentSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleQuestionExpand = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const sortedStudents = data?.students
    ? [...data.students].sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'name':
            comparison = a.studentName.localeCompare(b.studentName);
            break;
          case 'score':
            comparison =
              (a.mostRecentScorePercentage || 0) -
              (b.mostRecentScorePercentage || 0);
            break;
          case 'attempts':
            comparison = a.attempts - b.attempts;
            break;
          case 'time':
            comparison = a.totalTimeSeconds - b.totalTimeSeconds;
            break;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      })
    : [];

  const handleStudentClick = (studentId: string) => {
    // Navigate to student detail view showing all lessons for this student
    router.push(`/teacher/classes/${classId}/students/${studentId}`);
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
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push(`/teacher/classes/${classId}/analytics`)}
      >
        ← Back to Class Overview
      </Button>

      {/* Lesson Header */}
      <Card>
        <CardHeader>
          <CardTitle>{data.lesson.title}</CardTitle>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Lesson {data.lesson.order}</strong>
            </p>
            {data.standards.length > 0 && (
              <div>
                <strong>Standards Covered:</strong>{' '}
                {data.standards.map((s) => s.code).join(', ')}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="text-2xl font-bold">
                {data.classStats.totalStudents}
              </div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {data.classStats.completionRate}%
              </div>
              <div className="text-sm text-gray-600">
                Completion Rate ({data.classStats.studentsCompleted}/
                {data.classStats.totalStudents})
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {data.classStats.averageScorePercentage}%
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={getScoreColorVariant(
                    data.classStats.averageScorePercentage >= 90
                      ? 'blue'
                      : data.classStats.averageScorePercentage >= 80
                        ? 'green'
                        : data.classStats.averageScorePercentage >= 60
                          ? 'yellow'
                          : 'red'
                  )}
                >
                  {data.classStats.averageScorePercentage >= 90
                    ? 'Excellent'
                    : data.classStats.averageScorePercentage >= 80
                      ? 'Good'
                      : data.classStats.averageScorePercentage >= 60
                        ? 'Needs Improvement'
                        : 'Needs Intervention'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('name')}
                  >
                    Student
                    {getSortIcon('name', sortField, sortDirection)}
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
              {sortedStudents.map((student) => (
                <TableRow
                  key={student.studentId}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                  onClick={() => handleStudentClick(student.studentId)}
                >
                  <TableCell className="font-medium">
                    {student.studentName}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-sm ${
                        student.completionStatus === 'COMPLETED'
                          ? 'text-green-600'
                          : student.completionStatus === 'IN_PROGRESS'
                            ? 'text-yellow-600'
                            : 'text-gray-500'
                      }`}
                    >
                      {student.completionStatus === 'COMPLETED'
                        ? 'Completed'
                        : student.completionStatus === 'IN_PROGRESS'
                          ? 'In Progress'
                          : 'Not Started'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {student.mostRecentScorePercentage !== null ? (
                      <Badge variant={getScoreColorVariant(student.colorCode)}>
                        {Math.round(student.mostRecentScorePercentage)}%
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {student.attempts > 0 ? (
                      student.attempts
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {student.totalTimeSeconds > 0 ? (
                      formatTime(student.totalTimeSeconds)
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Question-Level Analytics */}
      {data.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Question Analytics</CardTitle>
            <p className="text-sm text-gray-600">
              Questions sorted by difficulty (lowest % correct first)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.questions.map((question) => (
                <Collapsible
                  key={question.questionId}
                  open={expandedQuestions.has(question.questionId)}
                  onOpenChange={() => toggleQuestionExpand(question.questionId)}
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      {expandedQuestions.has(question.questionId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            Q{question.questionNumber}
                          </span>
                          <span className="text-sm text-gray-600">
                            {question.questionTextTruncated}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {question.questionType.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          {question.percentCorrect}% correct
                        </div>
                        <div className="text-xs text-gray-500">
                          {question.correctResponses}/{question.totalResponses}{' '}
                          students
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          {formatTime(question.averageTimeSeconds)}
                        </div>
                        <div className="text-xs text-gray-500">avg time</div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="rounded-b-lg border border-t-0 bg-gray-50 p-4">
                    {question.incorrectStudents.length > 0 ? (
                      <div>
                        <div className="mb-2 text-sm font-semibold text-gray-700">
                          Students who answered incorrectly:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {question.incorrectStudents.map((name, idx) => (
                            <Badge key={idx} variant="outline">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">
                        All students answered this question correctly!
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standards Performance */}
      {data.standardsPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Standards Performance</CardTitle>
            <p className="text-sm text-gray-600">
              Mastery based on ≥80% correct on questions for each standard
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.standardsPerformance.map((standard) => (
                <div
                  key={standard.standardId}
                  className={`rounded-lg border p-4 ${
                    standard.flagForReteach ? 'border-red-300 bg-red-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {standard.standardCode}
                        </span>
                        {standard.flagForReteach && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Needs Reteach
                          </Badge>
                        )}
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
                      <Badge variant={getScoreColorVariant(standard.colorCode)}>
                        {standard.percentMastered}%
                      </Badge>
                      <div className="mt-1 text-xs text-gray-600">
                        {standard.studentsMastered}/
                        {data.classStats.studentsCompleted} mastered
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

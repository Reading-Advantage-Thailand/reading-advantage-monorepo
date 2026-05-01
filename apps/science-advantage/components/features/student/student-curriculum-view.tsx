"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, CheckCircle2, Circle, Clock } from 'lucide-react';

type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

interface LessonProgress {
  status: LessonProgressStatus;
  attemptsCount: number;
  mostRecentScore: number | null;
  mostRecentScorePercentage: number | null;
  bestScore: number | null;
  bestScorePercentage: number | null;
  lastAttemptAt: string | null;
  completedAt: string | null;
}

interface Lesson {
  id: string;
  slug: string;
  title: string;
  titleThai: string;
  order: number;
  completed: boolean;
  started: boolean;
  progress: LessonProgress;
}

interface AssignmentData {
  id: string;
  lessonId: string;
  classId: string;
  dueAt: string | null;
}

interface CurriculumUnit {
  id: string;
  title: string;
  titleThai: string;
  order: number;
  lessons: Lesson[];
}

interface CurriculumData {
  class: {
    id: string;
    name: string;
    gradeLevel: number;
    standardsAlignment: string;
  };
  units: CurriculumUnit[];
}

interface StudentCurriculumViewProps {
  classId: string;
}

const STATUS_CONFIG: Record<
  LessonProgressStatus,
  {
    label: string;
    icon: typeof Circle;
    iconClass: string;
    badgeClass: string;
  }
> = {
  NOT_STARTED: {
    label: 'Not Started',
    icon: Circle,
    iconClass: 'text-gray-300',
    badgeClass: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: Circle,
    iconClass: 'text-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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

function formatDueDate(dueAt: string): string {
  const date = new Date(dueAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;
  return `Due ${date.toLocaleDateString()}`;
}

export function StudentCurriculumView({ classId }: StudentCurriculumViewProps) {
  const router = useRouter();
  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Map<string, AssignmentData>>(new Map());

  useEffect(() => {
    async function fetchCurriculum() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/classes/${classId}/curriculum`);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Please sign in to view this class');
          } else if (response.status === 403) {
            throw new Error('You are not enrolled in this class');
          } else if (response.status === 404) {
            throw new Error('Class not found');
          } else {
            throw new Error('Failed to load curriculum');
          }
        }

        const data = await response.json();
        setCurriculum(data);

        // Fetch assignments for this class
        try {
          const assignmentsRes = await fetch(`/api/classes/${classId}/assignments`);
          if (assignmentsRes.ok) {
            const assignmentsData = await assignmentsRes.json();
            const map = new Map<string, AssignmentData>();
            for (const assignment of assignmentsData.data.assignments) {
              map.set(assignment.lessonId, assignment);
            }
            setAssignments(map);
          }
        } catch {
          // Silently handle - assignment badges just won't show
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchCurriculum();
  }, [classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
        <span className="ml-2 text-gray-600">Loading curriculum...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">{error}</p>
      </div>
    );
  }

  if (!curriculum || curriculum.units.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-600">
          No curriculum available for this class yet. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-gray-900">{curriculum.class.name}</h2>
        <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
          <span>Grade {curriculum.class.gradeLevel}</span>
          <span>•</span>
          <span>{curriculum.class.standardsAlignment}</span>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <Accordion type="multiple" className="divide-y divide-gray-200">
          {curriculum.units.map(unit => (
            <AccordionItem key={unit.id} value={unit.id} className="px-2">
            <AccordionTrigger>
              <div className="flex flex-col gap-1 text-left">
                <span className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                  Unit {unit.order}
                </span>
                <span className="text-lg font-semibold text-gray-900">{unit.title}</span>
                {unit.titleThai !== unit.title && (
                  <span className="text-sm text-gray-600">{unit.titleThai}</span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-1 pb-4">
                  {unit.lessons.length > 0 ? (
                    <ol className="space-y-3">
                      {unit.lessons.map(lesson => {
                        const status = lesson.progress?.status ?? 'NOT_STARTED';
                        const statusConfig = STATUS_CONFIG[status];
                        const attemptsCount = lesson.progress?.attemptsCount ?? 0;
                        const scorePercentage = lesson.progress?.mostRecentScorePercentage ?? null;
                        const bestPercentage = lesson.progress?.bestScorePercentage ?? null;
                        const hasScoreBadge = attemptsCount > 0 && typeof scorePercentage === 'number';
                        const lessonAssignment = assignments.get(lesson.id);

                        const StatusIcon = statusConfig.icon;

                        return (
                          <li
                            key={lesson.id}
                            onClick={() => router.push(`/student/classes/${classId}/lessons/${lesson.slug}`)}
                            className="cursor-pointer rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition hover:border-rose-200 hover:shadow-md"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex flex-1 items-start gap-3">
                                <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusConfig.iconClass}`} />
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                                    Lesson {lesson.order}
                                  </p>
                                  <p className="text-base font-medium text-gray-900">{lesson.title}</p>
                                  {lesson.titleThai !== lesson.title && (
                                    <p className="text-sm text-gray-600">{lesson.titleThai}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className={statusConfig.badgeClass}>
                                  {statusConfig.label}
                                </Badge>
                                {lessonAssignment && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {lessonAssignment.dueAt
                                      ? formatDueDate(lessonAssignment.dueAt)
                                      : 'Assigned'
                                    }
                                  </Badge>
                                )}
                                {hasScoreBadge && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        className={`rounded-full border px-3 py-1 text-sm font-semibold ${getScoreBadgeClass(
                                          scorePercentage!
                                        )}`}
                                      >
                                        {Math.round(scorePercentage!)}%
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" align="center">
                                      <div className="space-y-1">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                          Attempt history
                                        </p>
                                        <div className="flex items-center justify-between gap-4 text-sm">
                                          <span className="text-gray-500">Attempts</span>
                                          <span className="font-semibold text-gray-900">{attemptsCount}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 text-sm">
                                          <span className="text-gray-500">Most recent</span>
                                          <span className="font-semibold text-gray-900">{formatPercentage(scorePercentage)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4 text-sm">
                                          <span className="text-gray-500">Best</span>
                                          <span className="font-semibold text-gray-900">{formatPercentage(bestPercentage)}</span>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="text-sm text-gray-500">No lessons added yet.</p>
                  )}
            </AccordionContent>
          </AccordionItem>
          ))}
        </Accordion>
      </TooltipProvider>
    </div>
  );
}

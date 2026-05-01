'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignButton } from '@/components/features/teacher/assign-button';

interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  titleThai: string;
  description: string | null;
  order: number;
  gradeLevel: number;
  completionCount?: number;
  assignment?: {
    id: string;
    lessonId: string;
    classId: string;
    dueAt: string | null;
  };
}

interface CurriculumUnitSummary {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: LessonSummary[];
}

interface CurriculumAccordionProps {
  units: CurriculumUnitSummary[];
  classId: string;
  studentCount: number;
  completionsLoading?: boolean;
  onAssignmentChange?: (lessonId: string, assignment: { id: string; lessonId: string; classId: string; dueAt: string | null } | null) => void;
}

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

export function CurriculumAccordion({
  units,
  classId,
  studentCount,
  completionsLoading = false,
  onAssignmentChange,
}: CurriculumAccordionProps) {
  if (units.length === 0) {
    return null;
  }

  return (
    <Accordion type="multiple" className="divide-y divide-gray-200">
      {units.map(unit => (
        <AccordionItem key={unit.id} value={unit.id} className="px-2">
          <AccordionTrigger>
            <div className="flex flex-col gap-1 text-left">
              <span className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                Unit {unit.order}
              </span>
              <span className="text-lg font-semibold text-gray-900">{unit.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-1 pb-4">
            {unit.description && (
              <p className="mb-4 text-sm text-gray-600">{unit.description}</p>
            )}

            {unit.lessons.length > 0 ? (
              <ol className="space-y-3">
                {unit.lessons.map(lesson => (
                  <li key={lesson.id}>
                    <Link
                      href={`/teacher/classes/${classId}/lessons/${lesson.slug}`}
                      className="block rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition hover:border-rose-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                            Lesson {lesson.order}
                          </p>
                          <p className="text-base font-medium text-gray-900">{lesson.title}</p>
                          {lesson.titleThai && lesson.titleThai !== lesson.title && (
                            <p className="text-sm text-gray-500">{lesson.titleThai}</p>
                          )}
                          {lesson.assignment && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <Clock className="h-3 w-3 mr-1" />
                                Assigned
                              </Badge>
                              {lesson.assignment.dueAt && (
                                <span className="text-xs text-muted-foreground">
                                  {formatDueDate(lesson.assignment.dueAt)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {completionsLoading ? (
                            <Skeleton className="h-5 w-16 rounded-full" />
                          ) : lesson.completionCount !== undefined ? (
                            <Badge
                              variant={lesson.completionCount === studentCount ? 'scoreGreen' : 'secondary'}
                              className="text-xs"
                            >
                              {lesson.completionCount}/{studentCount}
                            </Badge>
                          ) : null}
                          {lesson.completionCount !== undefined && lesson.completionCount === studentCount ? (
                            <CheckCircle2 className="size-5 text-green-500" />
                          ) : (
                            <Circle className="size-5 text-gray-300" />
                          )}
                          {onAssignmentChange && (
                            <div onClick={(e) => e.preventDefault()}>
                              <AssignButton
                                classId={classId}
                                lessonId={lesson.id}
                                lessonTitle={lesson.title}
                                existingAssignment={lesson.assignment}
                                onAssigned={(assignment) => onAssignmentChange(lesson.id, assignment)}
                                onRemoved={() => onAssignmentChange(lesson.id, null)}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      {lesson.description && (
                        <p className="mt-2 text-sm text-gray-600">{lesson.description}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-gray-500">No lessons added yet.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

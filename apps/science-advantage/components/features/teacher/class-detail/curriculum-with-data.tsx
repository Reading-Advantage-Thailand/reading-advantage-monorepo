'use client';

import { useEffect, useState } from 'react';

import { CurriculumAccordion } from './curriculum-accordion';

interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  titleThai: string;
  description: string | null;
  order: number;
  gradeLevel: number;
}

interface CurriculumUnitSummary {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: LessonSummary[];
}

interface CurriculumWithDataProps {
  units: CurriculumUnitSummary[];
  classId: string;
  studentCount: number;
}

interface LessonAnalytics {
  lessonId: string;
  studentsCompleted: number;
}

interface AssignmentData {
  id: string;
  lessonId: string;
  classId: string;
  dueAt: string | null;
}

export function CurriculumWithData({ units, classId, studentCount }: CurriculumWithDataProps) {
  const [completions, setCompletions] = useState<Map<string, number>>(new Map());
  const [assignments, setAssignments] = useState<Map<string, AssignmentData>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [completionsRes, assignmentsRes] = await Promise.allSettled([
          fetch(`/api/classes/${classId}/analytics/overview`),
          fetch(`/api/classes/${classId}/assignments`),
        ]);

        if (completionsRes.status === 'fulfilled' && completionsRes.value.ok) {
          const data = await completionsRes.value.json();
          const map = new Map<string, number>();
          for (const lesson of data.lessons as LessonAnalytics[]) {
            map.set(lesson.lessonId, lesson.studentsCompleted);
          }
          setCompletions(map);
        }

        if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value.ok) {
          const data = await assignmentsRes.value.json();
          const map = new Map<string, AssignmentData>();
          for (const assignment of data.data.assignments) {
            map.set(assignment.lessonId, assignment);
          }
          setAssignments(map);
        }
      } catch {
        // Silently handle - badges just won't show counts
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [classId]);

  const enrichedUnits = units.map(unit => ({
    ...unit,
    lessons: unit.lessons.map(lesson => ({
      ...lesson,
      completionCount: completions.get(lesson.id),
      assignment: assignments.get(lesson.id),
    })),
  }));

  const handleAssignmentChange = (lessonId: string, assignment: AssignmentData | null) => {
    setAssignments(prev => {
      const next = new Map(prev);
      if (assignment) {
        next.set(lessonId, assignment);
      } else {
        next.delete(lessonId);
      }
      return next;
    });
  };

  return (
    <CurriculumAccordion
      units={enrichedUnits}
      classId={classId}
      studentCount={studentCount}
      completionsLoading={loading}
      onAssignmentChange={handleAssignmentChange}
    />
  );
}

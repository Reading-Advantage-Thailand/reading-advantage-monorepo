'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Loader2, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AssignmentLesson {
  id: string;
  title: string;
  slug: string;
  order: number;
}

interface Assignment {
  id: string;
  classId: string;
  className: string;
  lessonId: string;
  lesson: AssignmentLesson;
  assignedAt: string;
  dueAt: string | null;
}

interface StudentAssignmentsCardProps {
  studentId: string;
}

function formatDueDate(dueAt: string): { text: string; variant: 'default' | 'destructive' | 'secondary' } {
  const date = new Date(dueAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'Overdue', variant: 'destructive' };
  if (diffDays === 0) return { text: 'Due today', variant: 'destructive' };
  if (diffDays === 1) return { text: 'Due tomorrow', variant: 'default' };
  if (diffDays <= 7) return { text: `Due in ${diffDays} days`, variant: 'secondary' };
  return { text: `Due ${date.toLocaleDateString()}`, variant: 'secondary' };
}

export function StudentAssignmentsCard({ studentId }: StudentAssignmentsCardProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch(`/api/students/${studentId}/assignments`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.data.assignments);
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, [studentId]);

  const sortedAssignments = [...assignments].sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  return (
    <Card className="edu-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📝 Upcoming Assignments
        </CardTitle>
        <CardDescription>Your pending work</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sortedAssignments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No assignments yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedAssignments.slice(0, 5).map(assignment => {
              const dueInfo = assignment.dueAt ? formatDueDate(assignment.dueAt) : null;

              return (
                <Link
                  key={assignment.id}
                  href={`/student/classes/${assignment.classId}/lessons/${assignment.lesson.slug}`}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition hover:border-rose-200 hover:shadow-md"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {assignment.lesson.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.className}
                    </p>
                  </div>
                  {dueInfo && (
                    <Badge variant={dueInfo.variant} className="text-xs shrink-0">
                      <Calendar className="h-3 w-3 mr-1" />
                      {dueInfo.text}
                    </Badge>
                  )}
                </Link>
              );
            })}
            {sortedAssignments.length > 5 && (
              <p className="text-xs text-center text-muted-foreground">
                +{sortedAssignments.length - 5} more assignments
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useCallback, useState } from 'react';
import { Calendar, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AssignmentData {
  id: string;
  lessonId: string;
  classId: string;
  dueAt: string | null;
}

interface AssignButtonProps {
  classId: string;
  lessonId: string;
  lessonTitle: string;
  existingAssignment?: AssignmentData;
  onAssigned?: (assignment: AssignmentData) => void;
  onRemoved?: (assignmentId: string) => void;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function AssignButton({
  classId,
  lessonId,
  lessonTitle,
  existingAssignment,
  onAssigned,
  onRemoved,
  variant = 'outline',
  size = 'sm',
  className,
}: AssignButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAssigned = !!existingAssignment;

  const handleAssign = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const body: { lessonId: string; dueAt?: string } = { lessonId };
      if (dueDate) {
        body.dueAt = new Date(dueDate).toISOString();
      }

      const res = await fetch(`/api/classes/${classId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign lesson');
      }

      const data = await res.json();
      onAssigned?.(data.data);
      setDialogOpen(false);
      setDueDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign lesson');
    } finally {
      setLoading(false);
    }
  }, [classId, lessonId, dueDate, onAssigned]);

  const handleRemove = useCallback(async () => {
    if (!existingAssignment) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/classes/${classId}/assignments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: existingAssignment.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove assignment');
      }

      onRemoved?.(existingAssignment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove assignment');
    } finally {
      setLoading(false);
    }
  }, [classId, existingAssignment, onRemoved]);

  if (isAssigned) {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={handleRemove}
        disabled={loading}
        className={`gap-1.5 text-green-700 hover:text-red-600 ${className ?? ''}`}
        title="Remove assignment"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        Assigned
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className={`gap-1.5 ${className ?? ''}`}
      >
        <Plus className="h-3.5 w-3.5" />
        Assign
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Assign &ldquo;{lessonTitle}&rdquo; to this class.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="due-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date (optional)
              </Label>
              <Input
                id="due-date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no deadline
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssign} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Assign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

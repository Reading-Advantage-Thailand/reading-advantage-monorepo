'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserMinus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface RosterStudent {
  id: string;
  name: string;
  email: string | null;
  joinedAt: string;
  lastActiveAt: string | null;
}

interface ClassRosterProps {
  classId: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatLastActive(lastActiveAt: string | null): string {
  if (!lastActiveAt) return 'Never';
  const date = new Date(lastActiveAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(lastActiveAt);
}

export function ClassRoster({ classId }: ClassRosterProps) {
  const router = useRouter();
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<RosterStudent | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    async function fetchRoster() {
      try {
        const res = await fetch(`/api/classes/${classId}/roster`);
        if (!res.ok) return;
        const data = await res.json();
        setStudents(data.data.students);
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }

    fetchRoster();
  }, [classId]);

  async function handleRemoveStudent() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/classes/${classId}/roster`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: removeTarget.id }),
      });
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== removeTarget.id));
        setRemoveTarget(null);
        router.refresh();
      }
    } finally {
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
        No students enrolled yet. Share the join code to get started.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map(student => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">{student.name}</TableCell>
              <TableCell className="text-gray-600">{student.email ?? '—'}</TableCell>
              <TableCell className="text-gray-600">{formatDate(student.joinedAt)}</TableCell>
              <TableCell className="text-gray-600">{formatLastActive(student.lastActiveAt)}</TableCell>
              <TableCell>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setRemoveTarget(student)}
                  aria-label={`Remove ${student.name}`}
                >
                  <UserMinus className="size-4 text-gray-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={removeTarget !== null} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeTarget?.name} from this class?
              They will lose access to class content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveStudent}
              disabled={removing}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removing ? 'Removing...' : 'Remove Student'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

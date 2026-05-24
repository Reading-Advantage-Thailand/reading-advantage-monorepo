'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { getStandardsAlignmentLabel } from '@/lib/utils/class-format';
import type { StandardsAlignment } from '@/lib/enums';

interface ClassDetailHeaderProps {
  classId: string;
  classTitle: string;
  gradeLevel: number;
  standardsAlignment: StandardsAlignment;
  studentCount: number;
}

export function ClassDetailHeader({
  classId,
  classTitle,
  gradeLevel,
  standardsAlignment,
  studentCount,
}: ClassDetailHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(classTitle);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    if (editName.trim().length < 3) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/classes/${classId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/teacher/classes');
      }
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  return (
    <>
      <header className="space-y-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/teacher" className="transition hover:text-rose-700">
                Teacher
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/teacher/classes" className="transition hover:text-rose-700">
                Classes
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-gray-900">{classTitle}</li>
          </ol>
        </nav>

        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Curriculum</p>
              {isEditing ? (
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-3xl font-bold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                      if (e.key === 'Escape') {
                        setEditName(classTitle);
                        setIsEditing(false);
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleSave} disabled={saving || editName.trim().length < 3}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditName(classTitle);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-gray-900">{classTitle}</h1>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    aria-label="Edit class name"
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              aria-label="Delete class"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>Grade {gradeLevel}</span>
            <span aria-hidden="true">•</span>
            <span>{getStandardsAlignmentLabel(standardsAlignment)}</span>
            <span aria-hidden="true">•</span>
            <span>{studentCount === 1 ? '1 student enrolled' : `${studentCount} students enrolled`}</span>
          </div>
        </div>
      </header>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{classTitle}&quot;? This action cannot be undone.
              {studentCount > 0 && (
                <span className="mt-2 block text-amber-600">
                  This class has {studentCount} enrolled student{studentCount !== 1 ? 's' : ''}.
                  They will be unenrolled.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Class'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import Link from 'next/link';
import {
  count,
  db,
  desc,
  eq,
  inArray,
} from '@reading-advantage/db';
import {
  scienceClassStudents,
  scienceClasses,
} from '@reading-advantage/db/schema';

import { requireRole } from '@/lib/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateClassForm } from '@/components/features/classes/create-class-form';
import type { StandardsAlignment } from '@/lib/enums';
import { formatStudentCount, getStandardsAlignmentLabel } from '@/lib/utils/class-format';

export default async function TeacherClassesPage() {
  const session = await requireRole('TEACHER');

  const classRows = await db
    .select()
    .from(scienceClasses)
    .where(eq(scienceClasses.teacherId, session.user.id))
    .orderBy(desc(scienceClasses.createdAt));

  const classIds = classRows.map((c) => c.id);
  const studentCounts = classIds.length
    ? await db
        .select({
          classId: scienceClassStudents.classId,
          value: count(),
        })
        .from(scienceClassStudents)
        .where(inArray(scienceClassStudents.classId, classIds))
        .groupBy(scienceClassStudents.classId)
    : [];
  const countByClass = new Map(
    studentCounts.map((row) => [row.classId, Number(row.value)])
  );

  const classes = classRows.map((cls) => ({
    ...cls,
    _count: { students: countByClass.get(cls.id) ?? 0 },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
          <p className="mt-2 text-gray-600">
            Manage your classes and access standards-aligned curriculum resources
          </p>
        </div>

        <Button asChild className="w-full bg-rose-600 hover:bg-rose-700 lg:w-auto">
          <Link href="#create-class">Create New Class</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>All Classes</CardTitle>
            <CardDescription>Your teaching schedule</CardDescription>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-gray-500">
                No classes yet. Create your first class to begin teaching.
              </p>
            ) : (
              <div className="space-y-4">
                {classes.map(cls => (
                  <Link
                    key={cls.id}
                    href={`/teacher/classes/${cls.id}`}
                    className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-rose-200 hover:shadow"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                        <p className="text-sm text-gray-600">
                          Grade {cls.gradeLevel} &middot; {getStandardsAlignmentLabel(cls.standardsAlignment as StandardsAlignment)}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-1 text-sm md:items-end">
                        <span className="font-semibold text-rose-600">
                          Join Code: {cls.joinCode}
                        </span>
                        <span className="text-gray-500">
                          {formatStudentCount(cls._count.students)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card id="create-class">
          <CardHeader>
            <CardTitle>Create Class</CardTitle>
            <CardDescription>
              Set up a new class with the right standards alignment and grade level.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateClassForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { requireRole } from '@/lib/auth/server';
import { StudentCurriculumView } from '@/components/features/student/student-curriculum-view';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StudentClassPageProps {
  params: Promise<{ classId: string }>;
}

export default async function StudentClassPage({
  params,
}: StudentClassPageProps) {
  await requireRole('STUDENT');
  const { classId } = await params;

  return (
    <div className="space-y-6">
      <Link
        href="/student"
        className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 transition hover:text-rose-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Curriculum</CardTitle>
          <CardDescription>
            Explore units and lessons aligned with your class standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentCurriculumView classId={classId} />
        </CardContent>
      </Card>
    </div>
  );
}

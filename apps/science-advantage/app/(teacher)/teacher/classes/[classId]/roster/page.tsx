import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';

import { hasRole, requireAuth } from '@/lib/auth/server';
import { getClassDetailWithCurriculum } from '@/lib/services/classes/get-class-detail';
import { ClassDetailHeader } from '@/components/features/teacher/class-detail/class-detail-header';
import { ClassTabs } from '@/components/features/teacher/class-detail/class-tabs';
import { ClassRoster } from '@/components/features/teacher/class-detail/class-roster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const getClassDetail = cache(async (classId: string) => getClassDetailWithCurriculum(classId));

type RouteParams = Promise<{ classId: string }>;

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { classId } = await params;
  const classDetail = await getClassDetail(classId);

  if (!classDetail) {
    return { title: 'Class Not Found' };
  }

  return {
    title: `${classDetail.name} - Roster`,
  };
}

export default async function TeacherClassRosterPage({ params }: { params: RouteParams }) {
  const session = await requireAuth();
  const { classId } = await params;

  if (session.user.role === 'STUDENT') {
    return redirect(`/student/classes/${classId}`);
  }

  const classDetail = await getClassDetail(classId);

  if (!classDetail) {
    return notFound();
  }

  const isTeacherOwner = classDetail.teacherId === session.user.id;
  const isAdmin = hasRole(session, 'ADMIN');

  if (!isTeacherOwner && !isAdmin) {
    return notFound();
  }

  return (
    <div className="space-y-8">
      <ClassDetailHeader
        classId={classId}
        classTitle={classDetail.name}
        gradeLevel={classDetail.gradeLevel}
        standardsAlignment={classDetail.standardsAlignment}
        studentCount={classDetail.studentCount}
      />

      <ClassTabs classId={classId} />

      <Card>
        <CardHeader>
          <CardTitle>Class Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassRoster classId={classId} />
        </CardContent>
      </Card>
    </div>
  );
}

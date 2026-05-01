import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';

import { hasRole, requireAuth } from '@/lib/auth/server';
import { getClassDetailWithCurriculum } from '@/lib/services/classes/get-class-detail';
import { ClassDetailHeader } from '@/components/features/teacher/class-detail/class-detail-header';
import { ClassTabs } from '@/components/features/teacher/class-detail/class-tabs';
import { CurriculumWithData } from '@/components/features/teacher/class-detail/curriculum-with-data';
import { ClassSnapshotPanel } from '@/components/features/teacher/class-detail/class-snapshot-panel';
import { JoinCodePanel } from '@/components/features/teacher/class-detail/join-code-panel';
import { ClassInterventionSummary } from '@/components/features/teacher/class-detail/class-intervention-summary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStandardsAlignmentLabel } from '@/lib/utils/class-format';

const getClassDetail = cache(async (classId: string) => getClassDetailWithCurriculum(classId));

type RouteParams = Promise<{ classId: string }>;

export async function generateMetadata({ params }: { params: RouteParams }) {
  const { classId } = await params;
  const classDetail = await getClassDetail(classId);

  if (!classDetail) {
    return { title: 'Class Not Found' };
  }

  return {
    title: `${classDetail.name} - Curriculum`,
  };
}

export default async function TeacherClassDetailPage({ params }: { params: RouteParams }) {
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
    console.warn('Unauthorized class detail access attempt', {
      classId,
      viewerId: session.user.id,
      viewerRole: session.user.role,
    });
    return notFound();
  }

  const standardsLabel = getStandardsAlignmentLabel(classDetail.standardsAlignment);

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Curriculum Units</CardTitle>
            <CardDescription>
              Auto-populated units and lessons aligned with your selected standards
            </CardDescription>
          </CardHeader>
          <CardContent>
            {classDetail.curriculumUnits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
                No curriculum available for Grade {classDetail.gradeLevel} {standardsLabel}. Contact
                admin.
              </div>
            ) : (
              <CurriculumWithData
                units={classDetail.curriculumUnits}
                classId={classId}
                studentCount={classDetail.studentCount}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <ClassInterventionSummary classId={classId} />
          <JoinCodePanel
            classId={classDetail.id}
            classTitle={classDetail.name}
            joinCode={classDetail.joinCode}
            isOwner={isTeacherOwner || isAdmin}
          />
          <ClassSnapshotPanel
            gradeLevel={classDetail.gradeLevel}
            standardsAlignment={classDetail.standardsAlignment}
            studentCount={classDetail.studentCount}
          />
        </div>
      </div>
    </div>
  );
}

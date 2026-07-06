import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createTenantDB } from '@reading-advantage/domain';
import { db } from '@reading-advantage/db';

import { hasRole, requireAuth } from '@/lib/auth/server';
import { logger } from '@/lib/observability/logger';
import { getClassDetailWithCurriculum } from '@/lib/services/classes/get-class-detail';
import { ClassDetailHeader } from '@/components/features/teacher/class-detail/class-detail-header';
import { ClassTabs } from '@/components/features/teacher/class-detail/class-tabs';
import { ClassAnalyticsOverview } from '@/components/features/teacher/analytics/class-analytics-overview';

const getClassDetail = cache(async (classId: string, user: { id: string; schoolId: string | null }) => {
  const tenant = { schoolId: user.schoolId };
  const tenantDb = createTenantDB(db, tenant);
  return getClassDetailWithCurriculum({
    db: tenantDb,
    user: user as unknown as Parameters<typeof getClassDetailWithCurriculum>[0]['user'],
    tenant,
    input: { classId },
  });
});

type RouteParams = Promise<{ classId: string }>;

export async function generateMetadata({ params }: { params: RouteParams }) {
  const session = await requireAuth();
  const { classId } = await params;
  const classDetail = await getClassDetail(classId, session.user);

  if (!classDetail) {
    return { title: 'Class Not Found' };
  }

  return {
    title: `${classDetail.name} - Analytics`,
  };
}

export default async function TeacherClassAnalyticsPage({
  params,
}: {
  params: RouteParams;
}) {
  const session = await requireAuth();
  const { classId } = await params;

  if (session.user.role === 'STUDENT') {
    return redirect(`/student/classes/${classId}`);
  }

  const classDetail = await getClassDetail(classId, session.user);

  if (!classDetail) {
    return notFound();
  }

  const isTeacherOwner = classDetail.teacherId === session.user.id;
  const isAdmin = hasRole(session, 'ADMIN');

  if (!isTeacherOwner && !isAdmin) {
    logger.warn('class.analytics.access.unauthorized', {
      classId,
      viewerId: session.user.id,
      viewerRole: session.user.role,
    });
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

      <ClassAnalyticsOverview classId={classId} />
    </div>
  );
}

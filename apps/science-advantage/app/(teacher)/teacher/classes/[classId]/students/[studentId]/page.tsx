import { StudentDetailAnalytics } from '@/components/features/teacher/analytics/student-detail-analytics';

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  const resolvedParams = await params;

  return (
    <div className="container mx-auto py-6">
      <StudentDetailAnalytics
        classId={resolvedParams.classId}
        studentId={resolvedParams.studentId}
      />
    </div>
  );
}

import { LessonDetailAnalytics } from '@/components/features/teacher/analytics/lesson-detail-analytics';

export default async function LessonAnalyticsPage({
  params,
}: {
  params: Promise<{ classId: string; lessonId: string }>;
}) {
  const resolvedParams = await params;

  return (
    <div className="container mx-auto py-6">
      <LessonDetailAnalytics
        classId={resolvedParams.classId}
        lessonId={resolvedParams.lessonId}
      />
    </div>
  );
}

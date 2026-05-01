import { StudentLessonDetailAnalytics } from '@/components/features/teacher/analytics/student-lesson-detail-analytics';

interface PageProps {
  params: Promise<{
    classId: string;
    studentId: string;
    lessonId: string;
  }>;
}

export default async function StudentLessonDetailPage({ params }: PageProps) {
  const { classId, studentId, lessonId } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <StudentLessonDetailAnalytics
        classId={classId}
        studentId={studentId}
        lessonId={lessonId}
      />
    </div>
  );
}

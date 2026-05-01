import { requireRole } from '@/lib/auth/server';
import { Badge } from '@/components/ui/badge';
import { TeacherLessonPreview } from './teacher-lesson-preview';

interface TeacherLessonPageProps {
  params: Promise<{ classId: string; slug: string }>;
}

export default async function TeacherLessonPage({ params }: TeacherLessonPageProps) {
  await requireRole('TEACHER');
  const { classId, slug } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm uppercase text-rose-600">Lesson</p>
            <Badge variant="secondary" className="text-xs">
              Preview Mode
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Lesson Viewer</h1>
          <p className="mt-2 text-gray-600">
            Class: {classId}
          </p>
        </div>
      </div>

      <TeacherLessonPreview classId={classId} lessonSlug={slug} />
    </div>
  );
}

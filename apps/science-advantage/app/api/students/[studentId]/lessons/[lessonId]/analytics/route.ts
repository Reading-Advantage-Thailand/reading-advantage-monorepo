import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { AuthError } from '@reading-advantage/auth';
import { getStudentLessonAnalytics } from '@reading-advantage/domain/students';

/**
 * GET /api/students/{studentId}/lessons/{lessonId}/analytics
 * Per-student, per-lesson attempt history + standards mastery.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ studentId: string; lessonId: string }> }) {
  try {
    const session = await requireAuth();
    const { studentId, lessonId } = await params;

    const result = await getStudentLessonAnalytics({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { studentId, lessonId } });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error) {
      if (error.message === 'Student not found') return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized access to student data' }, { status: 403 });
      if (error.message === 'Lesson not found') return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
    console.error('Error fetching student-lesson analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

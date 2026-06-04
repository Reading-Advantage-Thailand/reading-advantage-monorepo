import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { AuthError } from '@reading-advantage/auth';
import { getClassLessonAnalytics } from '@reading-advantage/domain/classes';

/**
 * GET /api/classes/{classId}/lessons/{lessonId}/analytics
 * Per-lesson student + question + standards analytics for a class.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ classId: string; lessonId: string }> }) {
  try {
    const session = await requireAuth();
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { classId, lessonId } = await params;
    const result = await getClassLessonAnalytics({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { classId, lessonId } });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error) {
      if (error.message === 'Class not found') return NextResponse.json({ error: 'Class not found' }, { status: 404 });
      if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized access to class analytics' }, { status: 403 });
      if (error.message === 'Lesson not found in this class') return NextResponse.json({ error: 'Lesson not found in this class' }, { status: 404 });
    }
    console.error('Error fetching lesson analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

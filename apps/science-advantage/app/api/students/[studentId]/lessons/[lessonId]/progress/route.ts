import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getStudentLessonProgress } from '@reading-advantage/domain/students';

/**
 * GET /api/students/{studentId}/lessons/{lessonId}/progress
 * Returns a student's progress for a specific lesson.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ studentId: string; lessonId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { studentId, lessonId } = await context.params;
    const result = await getStudentLessonProgress({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { studentId, lessonId } });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error) {
      if (error.message === 'Student not found') return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      if (error.message === 'Lesson not found') return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      if (error.message === 'Not authorized to view progress') return NextResponse.json({ error: 'Not authorized to view progress' }, { status: 403 });
    }
    console.error('Failed to fetch lesson progress:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while fetching progress' }, { status: 500 });
  }
}

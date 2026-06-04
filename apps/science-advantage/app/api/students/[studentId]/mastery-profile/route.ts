import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getStudentMasteryProfile } from '@reading-advantage/domain/students';

/**
 * GET /api/students/{studentId}/mastery-profile
 * Returns a student's mastery profile with strand-level aggregation.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { studentId } = await params;
    const url = new URL(request.url);

    const result = await getStudentMasteryProfile({
      user: session.user,
      tenant: { schoolId: session.user.schoolId },
      input: {
        studentId,
        strand: url.searchParams.get('strand') || undefined,
        limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined,
        cursor: url.searchParams.get('cursor') || undefined,
        includeRecommendations: url.searchParams.get('includeRecommendations') === 'true',
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error && error.message === 'Student not found') return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    console.error('Mastery profile error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

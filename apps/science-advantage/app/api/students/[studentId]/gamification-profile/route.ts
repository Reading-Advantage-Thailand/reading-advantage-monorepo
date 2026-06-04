import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getStudentGamificationProfile } from '@reading-advantage/domain/students';

/**
 * GET /api/students/{studentId}/gamification-profile
 * Returns a student's gamification profile with XP progress.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { studentId } = await params;
    const result = await getStudentGamificationProfile({ user: session.user, tenant: { schoolId: session.user.schoolId }, input: { studentId } });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    console.error('Gamification profile error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

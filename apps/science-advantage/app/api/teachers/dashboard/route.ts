import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/server';
import { AuthError } from '@reading-advantage/auth';
import { getTeacherDashboard } from '@reading-advantage/domain/teachers';

/**
 * GET /api/teachers/dashboard
 * Returns teacher dashboard data: class progress, students needing attention, recent completions.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireRole('TEACHER');

    const result = await getTeacherDashboard({ user: session.user, tenant: { schoolId: session.user.schoolId } });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('Failed to load teacher dashboard data', error);
    return NextResponse.json({ error: 'Unable to load dashboard data' }, { status: 500 });
  }
}

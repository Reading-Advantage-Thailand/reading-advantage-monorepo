import { NextResponse } from 'next/server';
import { assertCan, AuthError } from '@reading-advantage/auth';
import type { UserContext } from '@reading-advantage/auth';
import { getCurrentSession } from '@/lib/auth/session';
import { getStudentEnrolledClasses } from '@/lib/services/classes/get-student-classes';

/**
 * GET /api/student/classes
 * Returns classes the authenticated student is enrolled in.
 */
export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    assertCan(session.user as unknown as UserContext, 'student:read:own');

    const classes = await getStudentEnrolledClasses(session.user.id);

    return NextResponse.json(
      { classes },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    console.error('Failed to fetch student classes:', error);

    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching enrolled classes' },
      { status: 500 }
    );
  }
}

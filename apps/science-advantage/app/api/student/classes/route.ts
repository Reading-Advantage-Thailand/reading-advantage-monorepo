import { NextResponse } from 'next/server';

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

    if (session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    const classes = await getStudentEnrolledClasses(session.user.id);

    return NextResponse.json(
      { classes },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch student classes:', error);

    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching enrolled classes' },
      { status: 500 }
    );
  }
}

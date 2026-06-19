import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { joinClassSchema } from '@/lib/validations/class';
import { AuthError } from '@reading-advantage/auth';
import { joinClass, AlreadyEnrolledError } from '@reading-advantage/domain/classes';
import { parseBody, ValidationError } from '@/lib/validations/api-helpers';
import { logger } from '@/lib/observability/logger';

/**
 * POST /api/classes/join
 * Allows a student to join a class by providing a join code.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let parsed: { joinCode: string };
    try {
      parsed = await parseBody(request, joinClassSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ success: false, error: 'Invalid join code format' }, { status: 400 });
      }
      throw err;
    }

    const result = await joinClass({
      user: session.user,
      tenant: { schoolId: session.user.schoolId },
      input: { joinCode: parsed.joinCode },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
    }
    if (error instanceof AlreadyEnrolledError) {
      return NextResponse.json({ success: false, error: 'Already enrolled in this class' }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'Join code not found') {
      return NextResponse.json({ success: false, error: 'Join code not found' }, { status: 404 });
    }
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === '23505') {
      return NextResponse.json({ success: false, error: 'Already enrolled in this class' }, { status: 409 });
    }
    logger.error('join.route.join.class.error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'An unexpected error occurred while joining the class' }, { status: 500 });
  }
}

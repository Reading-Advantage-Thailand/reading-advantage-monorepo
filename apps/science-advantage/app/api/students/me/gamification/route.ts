import { NextResponse, NextRequest } from 'next/server';
import { runWithRequestContext } from '@/lib/observability/context';
import { randomUUID } from 'crypto';

import { getCurrentSession } from '@/lib/auth/session';
import { AuthError } from '@reading-advantage/auth';
import { getMyGamification } from '@reading-advantage/domain/students';
import { logger } from '@/lib/observability/logger';

/**
 * GET /api/students/me/gamification
 * Returns the gamification summary for the authenticated student.
 */
export async function GET(_request?: NextRequest) {
  return runWithRequestContext({
    requestId: randomUUID(),
    route: _request?.url ?? '/api/students/me/gamification',
    method: 'GET',
    startedAt: Date.now(),
  }, async () => {

    try {
      const session = await getCurrentSession();
      if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

      const result = await getMyGamification({ user: session.user, tenant: { schoolId: session.user.schoolId } });

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof AuthError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
      if (error instanceof Error && error.message === 'Gamification profile not found') return NextResponse.json({ success: false, error: 'Gamification profile not found' }, { status: 404 });
      logger.error('gamification.route.gamification.error', { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  });
}

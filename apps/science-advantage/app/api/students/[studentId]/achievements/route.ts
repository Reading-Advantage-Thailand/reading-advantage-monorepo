import { NextRequest, NextResponse } from 'next/server';
import { db, desc, eq } from '@reading-advantage/db';
import { achievements } from '@reading-advantage/db/schema';

import { getCurrentSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { studentId } = resolvedParams;

    const isOwnProfile = session.user.id === studentId;
    const isDev = env.DEV_AUTH_ENABLED;
    const isTeacherOrAdmin =
      session.user.role === 'TEACHER' || session.user.role === 'ADMIN';
    const canImpersonate = isDev && isTeacherOrAdmin;

    if (!isOwnProfile && !canImpersonate) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const studentAchievements = await db
      .select({
        badgeType: achievements.badgeType,
        unlockedAt: achievements.unlockedAt,
      })
      .from(achievements)
      .where(eq(achievements.userId, studentId))
      .orderBy(desc(achievements.unlockedAt));

    logger.info('achievements.fetch', {
      studentId,
      count: studentAchievements.length,
    });

    return NextResponse.json({
      achievements: studentAchievements,
    });
  } catch (error) {
    logger.error('achievements.error', {
      message:
        error instanceof Error
          ? error.message
          : 'Unknown achievements error',
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

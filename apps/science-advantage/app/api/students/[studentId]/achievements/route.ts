import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import prisma from '@/lib/prisma';

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

    const achievements = await prisma.achievement.findMany({
      where: { userId: studentId },
      orderBy: { unlockedAt: 'desc' },
      select: {
        badgeType: true,
        unlockedAt: true,
      },
    });

    logger.info('achievements.fetch', {
      studentId,
      count: achievements.length,
    });

    return NextResponse.json({
      achievements,
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

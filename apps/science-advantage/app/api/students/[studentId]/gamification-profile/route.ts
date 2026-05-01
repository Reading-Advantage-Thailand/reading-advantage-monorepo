import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { logger } from '@/lib/observability/logger';
import prisma from '@/lib/prisma';
import { getLevelName } from '@/lib/gamification/xp';

const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 300 },
  { level: 4, minXp: 600 },
  { level: 5, minXp: 1000 },
  { level: 6, minXp: 1500 },
];

function getXpProgress(
  xp: number,
  level: number
): { currentLevelXp: number; nextLevelXp: number; progressPercent: number } {
  const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
  const nextThreshold = LEVEL_THRESHOLDS.find((t) => t.level === level + 1);

  if (!currentThreshold || !nextThreshold) {
    return { currentLevelXp: 0, nextLevelXp: 0, progressPercent: 100 };
  }

  const currentLevelXp = xp - currentThreshold.minXp;
  const xpRange = nextThreshold.minXp - currentThreshold.minXp;
  const progressPercent = Math.min(Math.round((currentLevelXp / xpRange) * 100), 100);

  return { currentLevelXp, nextLevelXp: xpRange, progressPercent };
}

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

    let profile = await prisma.gamificationProfile.findUnique({
      where: { userId: studentId },
      select: {
        xp: true,
        level: true,
        streak: true,
        lastActiveAt: true,
      },
    });

    if (!profile) {
      profile = await prisma.gamificationProfile.create({
        data: { userId: studentId, xp: 0, level: 1, streak: 0 },
        select: {
          xp: true,
          level: true,
          streak: true,
          lastActiveAt: true,
        },
      });
    }

    const levelName = getLevelName(profile.level);
    const xpProgress = getXpProgress(profile.xp, profile.level);

    const recentBadges = await prisma.achievement.findMany({
      where: { userId: studentId },
      orderBy: { unlockedAt: 'desc' },
      take: 3,
      select: {
        badgeType: true,
        unlockedAt: true,
      },
    });

    logger.info('gamification-profile.fetch', { studentId });

    return NextResponse.json({
      xp: profile.xp,
      level: profile.level,
      levelName,
      streak: profile.streak,
      xpProgress,
      recentBadges,
    });
  } catch (error) {
    logger.error('gamification-profile.error', {
      message:
        error instanceof Error
          ? error.message
          : 'Unknown gamification profile error',
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

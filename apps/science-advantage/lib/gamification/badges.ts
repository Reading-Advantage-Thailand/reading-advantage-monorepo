import prisma from '@/lib/prisma';

export type BadgeType =
  | 'FIRST_STEPS'
  | 'PERFECT_SCORE'
  | 'UNIT_CHAMPION'
  | 'SCIENCE_EXPLORER'
  | 'LAB_PARTNER'
  | 'BILINGUAL_SCHOLAR'
  | 'STREAK_WARRIOR'
  | 'DEDICATED_LEARNER'
  | 'QUIZ_MASTER'
  | 'FAST_LEARNER';

export interface BadgeDefinition {
  id: BadgeType;
  name: string;
  description: string;
  icon: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'FIRST_STEPS',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: 'Footprints',
  },
  {
    id: 'PERFECT_SCORE',
    name: 'Perfect Score',
    description: 'Score 100% on any quiz',
    icon: 'Trophy',
  },
  {
    id: 'UNIT_CHAMPION',
    name: 'Unit Champion',
    description: 'Complete all lessons in a curriculum unit',
    icon: 'Crown',
  },
  {
    id: 'SCIENCE_EXPLORER',
    name: 'Science Explorer',
    description: 'Complete 10 lessons',
    icon: 'Compass',
  },
  {
    id: 'LAB_PARTNER',
    name: 'Lab Partner',
    description: 'Complete a lab activity',
    icon: 'FlaskConical',
  },
  {
    id: 'BILINGUAL_SCHOLAR',
    name: 'Bilingual Scholar',
    description: 'Complete a lesson in Thai mode',
    icon: 'Languages',
  },
  {
    id: 'STREAK_WARRIOR',
    name: 'Streak Warrior',
    description: 'Maintain a 7-day activity streak',
    icon: 'Flame',
  },
  {
    id: 'DEDICATED_LEARNER',
    name: 'Dedicated Learner',
    description: 'Maintain a 30-day activity streak',
    icon: 'CalendarCheck',
  },
  {
    id: 'QUIZ_MASTER',
    name: 'Quiz Master',
    description: 'Complete 10 quizzes',
    icon: 'ScrollText',
  },
  {
    id: 'FAST_LEARNER',
    name: 'Fast Learner',
    description: 'Pass 5 quizzes on first attempt with 80%+',
    icon: 'Zap',
  },
];

export interface BadgeTriggerEvent {
  type: 'quiz_completed' | 'lesson_completed';
  score?: number;
  attemptNumber?: number;
  lessonId?: string;
  studentId: string;
}

async function checkFirstSteps(userId: string): Promise<boolean> {
  const count = await prisma.lessonCompletion.count({
    where: { studentId: userId, status: 'COMPLETED' },
  });
  return count >= 1;
}

async function checkPerfectScore(userId: string): Promise<boolean> {
  // Check if any completed attempt has score equal to maxScore
  const attempt = await prisma.attempt.findFirst({
    where: {
      studentId: userId,
      completedAt: { not: null },
      maxScore: { gt: 0 },
    },
    orderBy: { completedAt: 'desc' },
  });
  if (!attempt) return false;
  return attempt.score >= attempt.maxScore;
}

async function checkUnitChampion(userId: string): Promise<boolean> {
  // Check if there exists any CurriculumUnit where the student has completed all lessons
  const units = await prisma.curriculumUnit.findMany({
    include: { lessons: { select: { id: true } } },
  });

  for (const unit of units) {
    if (unit.lessons.length === 0) continue;

    const completedCount = await prisma.lessonCompletion.count({
      where: {
        studentId: userId,
        status: 'COMPLETED',
        lessonId: { in: unit.lessons.map(l => l.id) },
      },
    });

    if (completedCount === unit.lessons.length) {
      return true;
    }
  }

  return false;
}

async function checkScienceExplorer(userId: string): Promise<boolean> {
  const count = await prisma.lessonCompletion.count({
    where: { studentId: userId, status: 'COMPLETED' },
  });
  return count >= 10;
}

async function checkLabPartner(userId: string): Promise<boolean> {
  const count = await prisma.lessonCompletion.count({
    where: {
      studentId: userId,
      status: 'COMPLETED',
      lesson: { lessonType: 'LAB' },
    },
  });
  return count >= 1;
}

async function checkBilingualScholar(_userId: string): Promise<boolean> {
  // TODO: Requires language preference tracking — not yet implemented
  return false;
}

async function checkStreakWarrior(userId: string): Promise<boolean> {
  const profile = await prisma.gamificationProfile.findUnique({
    where: { userId },
    select: { streak: true },
  });
  return (profile?.streak ?? 0) >= 7;
}

async function checkDedicatedLearner(userId: string): Promise<boolean> {
  const profile = await prisma.gamificationProfile.findUnique({
    where: { userId },
    select: { streak: true },
  });
  return (profile?.streak ?? 0) >= 30;
}

async function checkQuizMaster(userId: string): Promise<boolean> {
  const count = await prisma.attempt.count({
    where: { studentId: userId, completedAt: { not: null } },
  });
  return count >= 10;
}

async function checkFastLearner(userId: string): Promise<boolean> {
  const firstAttempts = await prisma.attempt.findMany({
    where: {
      studentId: userId,
      attemptNumber: 1,
      completedAt: { not: null },
    },
    select: { score: true, maxScore: true },
  });

  const passingCount = firstAttempts.filter(a => {
    if (a.maxScore === 0) return false;
    return (a.score / a.maxScore) * 100 >= 80;
  }).length;

  return passingCount >= 5;
}

const CHECKERS: Record<BadgeType, (userId: string) => Promise<boolean>> = {
  FIRST_STEPS: checkFirstSteps,
  PERFECT_SCORE: checkPerfectScore,
  UNIT_CHAMPION: checkUnitChampion,
  SCIENCE_EXPLORER: checkScienceExplorer,
  LAB_PARTNER: checkLabPartner,
  BILINGUAL_SCHOLAR: checkBilingualScholar,
  STREAK_WARRIOR: checkStreakWarrior,
  DEDICATED_LEARNER: checkDedicatedLearner,
  QUIZ_MASTER: checkQuizMaster,
  FAST_LEARNER: checkFastLearner,
};

export async function evaluateAllBadges(
  userId: string
): Promise<BadgeType[]> {
  const unlocked: BadgeType[] = [];

  for (const [badgeType, checker] of Object.entries(CHECKERS)) {
    if (await checker(userId)) {
      unlocked.push(badgeType as BadgeType);
    }
  }

  return unlocked;
}

export async function checkBadgeConditions(
  userId: string,
  _triggerEvent: BadgeTriggerEvent
): Promise<{ newlyUnlocked: BadgeType[]; achievements: { badgeType: string; id: string; unlockedAt: Date }[] }> {
  // Get already-unlocked badges
  const existingAchievements = await prisma.achievement.findMany({
    where: { userId },
    select: { badgeType: true },
  });
  const existingBadgeTypes = new Set(existingAchievements.map(a => a.badgeType));

  // Evaluate all badge conditions
  const allUnlocked = await evaluateAllBadges(userId);

  // Filter to only newly unlocked
  const newlyUnlocked = allUnlocked.filter(b => !existingBadgeTypes.has(b));

  // Create Achievement records for newly unlocked badges
  const achievements: { badgeType: string; id: string; unlockedAt: Date }[] = [];

  for (const badgeType of newlyUnlocked) {
    const achievement = await prisma.achievement.create({
      data: {
        userId,
        badgeType,
        unlockedAt: new Date(),
      },
    });
    achievements.push({
      badgeType: achievement.badgeType,
      id: achievement.id,
      unlockedAt: achievement.unlockedAt,
    });
  }

  return { newlyUnlocked, achievements };
}

import 'server-only';

import { db, and, eq, gt, inArray, isNotNull, count } from '@reading-advantage/db';
import {
  achievements,
  gamificationProfiles,
  scienceAttempts,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceUnitLessons,
} from '@reading-advantage/db/schema';

import type { BadgeTriggerEvent, BadgeType } from './badges.constants';

export * from './badges.constants';

async function countCompletedLessons(userId: string): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(scienceLessonCompletions)
    .where(
      and(
        eq(scienceLessonCompletions.studentId, userId),
        eq(scienceLessonCompletions.status, 'COMPLETED')
      )
    );
  return row?.c ?? 0;
}

async function checkFirstSteps(userId: string): Promise<boolean> {
  return (await countCompletedLessons(userId)) >= 1;
}

async function checkPerfectScore(userId: string): Promise<boolean> {
  const [attempt] = await db
    .select({
      score: scienceAttempts.score,
      maxScore: scienceAttempts.maxScore,
    })
    .from(scienceAttempts)
    .where(
      and(
        eq(scienceAttempts.studentId, userId),
        isNotNull(scienceAttempts.completedAt),
        gt(scienceAttempts.maxScore, 0)
      )
    )
    .orderBy(scienceAttempts.completedAt)
    .limit(1);

  if (!attempt) return false;
  return attempt.score >= attempt.maxScore;
}

async function checkUnitChampion(userId: string): Promise<boolean> {
  // For each curriculum unit, check whether the student has completed every
  // lesson in that unit via the unitLessons junction.
  const units = await db
    .select({ unitId: scienceCurriculumUnits.id })
    .from(scienceCurriculumUnits);

  for (const unit of units) {
    const unitLessonRows = await db
      .select({ lessonId: scienceUnitLessons.lessonId })
      .from(scienceUnitLessons)
      .where(eq(scienceUnitLessons.unitId, unit.unitId));

    if (unitLessonRows.length === 0) continue;

    const lessonIds = unitLessonRows.map((r) => r.lessonId);

    const [completedRow] = await db
      .select({ c: count() })
      .from(scienceLessonCompletions)
      .where(
        and(
          eq(scienceLessonCompletions.studentId, userId),
          eq(scienceLessonCompletions.status, 'COMPLETED'),
          inArray(scienceLessonCompletions.lessonId, lessonIds)
        )
      );

    if ((completedRow?.c ?? 0) === lessonIds.length) {
      return true;
    }
  }

  return false;
}

async function checkScienceExplorer(userId: string): Promise<boolean> {
  return (await countCompletedLessons(userId)) >= 10;
}

async function checkLabPartner(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ c: count() })
    .from(scienceLessonCompletions)
    .innerJoin(
      scienceLessons,
      eq(scienceLessons.id, scienceLessonCompletions.lessonId)
    )
    .where(
      and(
        eq(scienceLessonCompletions.studentId, userId),
        eq(scienceLessonCompletions.status, 'COMPLETED'),
        eq(scienceLessons.lessonType, 'LAB')
      )
    );
  return (row?.c ?? 0) >= 1;
}

async function checkBilingualScholar(_userId: string): Promise<boolean> {
  // TODO: Requires language preference tracking — not yet implemented
  return false;
}

async function checkStreakWarrior(userId: string): Promise<boolean> {
  const [profile] = await db
    .select({ streak: gamificationProfiles.streak })
    .from(gamificationProfiles)
    .where(eq(gamificationProfiles.userId, userId))
    .limit(1);
  return (profile?.streak ?? 0) >= 7;
}

async function checkDedicatedLearner(userId: string): Promise<boolean> {
  const [profile] = await db
    .select({ streak: gamificationProfiles.streak })
    .from(gamificationProfiles)
    .where(eq(gamificationProfiles.userId, userId))
    .limit(1);
  return (profile?.streak ?? 0) >= 30;
}

async function checkQuizMaster(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ c: count() })
    .from(scienceAttempts)
    .where(
      and(
        eq(scienceAttempts.studentId, userId),
        isNotNull(scienceAttempts.completedAt)
      )
    );
  return (row?.c ?? 0) >= 10;
}

async function checkFastLearner(userId: string): Promise<boolean> {
  const firstAttempts = await db
    .select({
      score: scienceAttempts.score,
      maxScore: scienceAttempts.maxScore,
    })
    .from(scienceAttempts)
    .where(
      and(
        eq(scienceAttempts.studentId, userId),
        eq(scienceAttempts.attemptNumber, 1),
        isNotNull(scienceAttempts.completedAt)
      )
    );

  const passingCount = firstAttempts.filter((a) => {
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
): Promise<{
  newlyUnlocked: BadgeType[];
  achievements: { badgeType: string; id: string; unlockedAt: Date }[];
}> {
  const existingAchievements = await db
    .select({ badgeType: achievements.badgeType })
    .from(achievements)
    .where(eq(achievements.userId, userId));
  const existingBadgeTypes = new Set(existingAchievements.map((a) => a.badgeType));

  const allUnlocked = await evaluateAllBadges(userId);
  const newlyUnlocked = allUnlocked.filter((b) => !existingBadgeTypes.has(b));

  const created: { badgeType: string; id: string; unlockedAt: Date }[] = [];

  for (const badgeType of newlyUnlocked) {
    const [achievement] = await db
      .insert(achievements)
      .values({
        userId,
        badgeType,
        unlockedAt: new Date(),
      })
      .returning();
    created.push({
      badgeType: achievement.badgeType,
      id: achievement.id,
      unlockedAt: achievement.unlockedAt,
    });
  }

  return { newlyUnlocked, achievements: created };
}

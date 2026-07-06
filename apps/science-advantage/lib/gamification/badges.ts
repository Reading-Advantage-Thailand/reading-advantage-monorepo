import 'server-only';

import { and, eq, gt, inArray, isNotNull, count } from '@reading-advantage/db';
import {
  achievements,
  gamificationProfiles,
  scienceAttempts,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceUnitLessons,
} from '@reading-advantage/db/schema';
import {
  assertCan,
  AuthError,
  type Tenant,
  type UserContext,
} from '@reading-advantage/auth';
import type { DB } from '@reading-advantage/db';

import type { BadgeTriggerEvent, BadgeType } from './badges.constants';

export * from './badges.constants';

type BadgeContext = {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: { userId: string; triggerEvent: BadgeTriggerEvent['type'] };
};

async function countCompletedLessons(
  db: DB,
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(scienceLessonCompletions)
    .where(
      and(
        eq(scienceLessonCompletions.studentId, userId),
        eq(scienceLessonCompletions.status, 'COMPLETED'),
      ),
    );
  return row?.c ?? 0;
}

async function checkFirstSteps(
  db: DB,
  userId: string,
): Promise<boolean> {
  return (await countCompletedLessons(db, userId)) >= 1;
}

async function checkPerfectScore(
  db: DB,
  userId: string,
): Promise<boolean> {
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
        gt(scienceAttempts.maxScore, 0),
      ),
    )
    .orderBy(scienceAttempts.completedAt)
    .limit(1);

  if (!attempt) return false;
  return attempt.score >= attempt.maxScore;
}

async function checkUnitChampion(
  db: DB,
  userId: string,
): Promise<boolean> {
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
          inArray(scienceLessonCompletions.lessonId, lessonIds),
        ),
      );

    if ((completedRow?.c ?? 0) === lessonIds.length) {
      return true;
    }
  }

  return false;
}

async function checkScienceExplorer(
  db: DB,
  userId: string,
): Promise<boolean> {
  return (await countCompletedLessons(db, userId)) >= 10;
}

async function checkLabPartner(
  db: DB,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ c: count() })
    .from(scienceLessonCompletions)
    .innerJoin(
      scienceLessons,
      eq(scienceLessons.id, scienceLessonCompletions.lessonId),
    )
    .where(
      and(
        eq(scienceLessonCompletions.studentId, userId),
        eq(scienceLessonCompletions.status, 'COMPLETED'),
        eq(scienceLessons.lessonType, 'LAB'),
      ),
    );
  return (row?.c ?? 0) >= 1;
}

async function checkBilingualScholar(_db: DB, _userId: string): Promise<boolean> {
  return false;
}

async function checkStreakWarrior(
  db: DB,
  userId: string,
): Promise<boolean> {
  const [profile] = await db
    .select({ streak: gamificationProfiles.streak })
    .from(gamificationProfiles)
    .where(eq(gamificationProfiles.userId, userId))
    .limit(1);
  return (profile?.streak ?? 0) >= 7;
}

async function checkDedicatedLearner(
  db: DB,
  userId: string,
): Promise<boolean> {
  const [profile] = await db
    .select({ streak: gamificationProfiles.streak })
    .from(gamificationProfiles)
    .where(eq(gamificationProfiles.userId, userId))
    .limit(1);
  return (profile?.streak ?? 0) >= 30;
}

async function checkQuizMaster(
  db: DB,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ c: count() })
    .from(scienceAttempts)
    .where(
      and(
        eq(scienceAttempts.studentId, userId),
        isNotNull(scienceAttempts.completedAt),
      ),
    );
  return (row?.c ?? 0) >= 10;
}

async function checkFastLearner(
  db: DB,
  userId: string,
): Promise<boolean> {
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
        isNotNull(scienceAttempts.completedAt),
      ),
    );

  const passingCount = firstAttempts.filter((a) => {
    if (a.maxScore === 0) return false;
    return (a.score / a.maxScore) * 100 >= 80;
  }).length;

  return passingCount >= 5;
}

type Checker = (db: DB, userId: string) => Promise<boolean>;

const CHECKERS: Record<BadgeType, Checker> = {
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

/**
 * Evaluates every badge condition for the given user and returns the
 * unlocked ones. Used internally by `checkBadgeConditions` and exposed for
 * diagnostics/tests.
 *
 * @param db - Database/tenant-scoped client.
 * @param userId - The student whose badges are evaluated.
 * @returns Array of unlocked badge types.
 */
export async function evaluateAllBadges(
  db: DB,
  userId: string,
): Promise<BadgeType[]> {
  const unlocked: BadgeType[] = [];

  for (const [badgeType, checker] of Object.entries(CHECKERS)) {
    if (await checker(db, userId)) {
      unlocked.push(badgeType as BadgeType);
    }
  }

  return unlocked;
}

/**
 * Phase 1 (ST-1) secured contract:
 *   checkBadgeConditions({ db, user, tenant, input: { userId, triggerEvent } })
 *
 * Routes the read/write through the caller-provided TenantDB and enforces
 * `assertCan(user, 'progress:record', tenant)` plus a resource-level
 * schoolId match on the user's gamification profile.
 *
 * @param ctx - The secured context (db, user, tenant, input).
 * @returns Newly unlocked badges and the achievement rows created.
 * @throws {AuthError} When the caller lacks `progress:record` or the
 *   profile's `schoolId` does not match the caller's `schoolId`.
 */
export async function checkBadgeConditions(
  ctx: BadgeContext,
): Promise<{
  newlyUnlocked: BadgeType[];
  achievements: { badgeType: string; id: string; unlockedAt: Date }[];
}> {
  const { db, user, tenant, input } = ctx;
  assertCan(user, 'progress:record', tenant);

  // Students may only check their own badges; teachers/admins/systems may
  // check any student's badges (HI-03: F-SA-B21-056/057).
  if (user.role === 'STUDENT' && input.userId !== user.id) {
    throw new AuthError(
      `Student ${user.id} cannot check badges for user ${input.userId}`,
      'FORBIDDEN',
    );
  }

  const existingAchievements = await db
    .select({ badgeType: achievements.badgeType })
    .from(achievements)
    .where(eq(achievements.userId, input.userId));
  const existingBadgeTypes = new Set(
    existingAchievements.map((a) => a.badgeType),
  );

  const allUnlocked = await evaluateAllBadges(db, input.userId);
  const newlyUnlocked = allUnlocked.filter(
    (b) => !existingBadgeTypes.has(b),
  );

  const created: { badgeType: string; id: string; unlockedAt: Date }[] = [];

  const [userProfile] = await db
    .select({ schoolId: gamificationProfiles.schoolId })
    .from(gamificationProfiles)
    .where(eq(gamificationProfiles.userId, input.userId))
    .limit(1);

  if (!userProfile || !userProfile.schoolId) {
    return { newlyUnlocked: [], achievements: [] };
  }

  if (userProfile.schoolId !== user.schoolId) {
    throw new AuthError(
      `User ${user.id} cannot check badges for user ${input.userId} from school ${userProfile.schoolId}`,
      'FORBIDDEN',
    );
  }

  for (const badgeType of newlyUnlocked) {
    const [achievement] = await db
      .insert(achievements)
      .values({
        userId: input.userId,
        badgeType,
        unlockedAt: new Date(),
        schoolId: userProfile.schoolId,
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
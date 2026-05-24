import { describe, it, expect, beforeEach } from 'vitest';
import { db, and, eq, sql } from '@reading-advantage/db';
import {
  achievements,
  gamificationProfiles,
  scienceAttempts,
  scienceClasses,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceUnitLessons,
  users,
} from '@reading-advantage/db/schema';
import {
  checkBadgeConditions,
  evaluateAllBadges,
  BADGE_DEFINITIONS,
} from './badges';

const TEST_PREFIX = 'badges-itest';
const TEACHER_ID = `${TEST_PREFIX}-teacher`;
const STUDENT_ID = `${TEST_PREFIX}-student`;

async function cleanupFixtures(): Promise<void> {
  // Junction tables, then completions/attempts/achievements (FKs cascade,
  // but be explicit to keep ordering obvious).
  await db.delete(scienceUnitLessons);
  await db.delete(scienceLessonCompletions);
  await db.delete(scienceAttempts);
  await db.delete(scienceCurriculumUnits);
  await db.delete(scienceLessons);
  await db.delete(scienceClasses);
  await db.execute(sql`DELETE FROM achievements WHERE user_id = ${STUDENT_ID}`);
  await db.execute(
    sql`DELETE FROM gamification_profiles WHERE user_id = ${STUDENT_ID}`
  );
  await db.execute(sql`DELETE FROM users WHERE id IN (${TEACHER_ID}, ${STUDENT_ID})`);
}

async function seedUsers(): Promise<void> {
  await db.insert(users).values([
    {
      id: TEACHER_ID,
      name: 'Badges Teacher',
      username: TEACHER_ID,
      displayUsername: 'BadgesTeacher',
      email: `${TEACHER_ID}@example.com`,
      role: 'TEACHER',
    },
    {
      id: STUDENT_ID,
      name: 'Badges Student',
      username: STUDENT_ID,
      displayUsername: 'BadgesStudent',
      email: `${STUDENT_ID}@example.com`,
      role: 'STUDENT',
    },
  ]);
}

async function seedClass(): Promise<string> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'Badges Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `BADGES-${Date.now()}`,
      teacherId: TEACHER_ID,
    })
    .returning();
  return cls.id;
}

async function seedUnit(classId: string): Promise<string> {
  const [unit] = await db
    .insert(scienceCurriculumUnits)
    .values({
      slug: `${TEST_PREFIX}-unit-${Date.now()}`,
      title: 'Badges Unit',
      framework: 'THAI',
      gradeLevel: 3,
      order: 1,
      classId,
    })
    .returning();
  return unit.id;
}

async function seedLesson(
  args: { slug: string; lessonType?: string; order: number }
): Promise<string> {
  const [lesson] = await db
    .insert(scienceLessons)
    .values({
      slug: args.slug,
      title: args.slug,
      gradeLevel: 3,
      order: args.order,
      lessonType: args.lessonType ?? 'LESSON',
    })
    .returning();
  return lesson.id;
}

async function attachLessonToUnit(unitId: string, lessonId: string): Promise<void> {
  await db.insert(scienceUnitLessons).values({ unitId, lessonId });
}

async function markLessonCompleted(lessonId: string): Promise<void> {
  await db.insert(scienceLessonCompletions).values({
    studentId: STUDENT_ID,
    lessonId,
    status: 'COMPLETED',
    attemptsCount: 1,
    completedAt: new Date(),
    lastAttemptAt: new Date(),
  });
}

async function insertAttempt(args: {
  lessonId: string;
  score: number;
  maxScore: number;
  attemptNumber: number;
  completed?: boolean;
}): Promise<void> {
  await db.insert(scienceAttempts).values({
    studentId: STUDENT_ID,
    lessonId: args.lessonId,
    score: args.score,
    maxScore: args.maxScore,
    attemptNumber: args.attemptNumber,
    completedAt: args.completed === false ? null : new Date(),
  });
}

async function setStreak(streak: number): Promise<void> {
  await db
    .insert(gamificationProfiles)
    .values({
      userId: STUDENT_ID,
      xp: 0,
      level: 1,
      streak,
    })
    .onConflictDoUpdate({
      target: gamificationProfiles.userId,
      set: { streak, updatedAt: new Date() },
    });
}

describe('badges (integration)', () => {
  beforeEach(async () => {
    await cleanupFixtures();
    await seedUsers();
  });

  describe('BADGE_DEFINITIONS', () => {
    it('defines 10 unique badge types with required fields', () => {
      expect(BADGE_DEFINITIONS).toHaveLength(10);
      const ids = new Set(BADGE_DEFINITIONS.map((b) => b.id));
      expect(ids.size).toBe(10);
      for (const badge of BADGE_DEFINITIONS) {
        expect(badge.id).toBeTruthy();
        expect(badge.name).toBeTruthy();
        expect(badge.description).toBeTruthy();
        expect(badge.icon).toBeTruthy();
      }
    });
  });

  describe('FIRST_STEPS', () => {
    it('unlocks when student has ≥1 completed lesson', async () => {
      const lessonId = await seedLesson({ slug: 'first-steps-lesson', order: 1 });
      await markLessonCompleted(lessonId);

      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });

      expect(newlyUnlocked).toContain('FIRST_STEPS');
    });

    it('does not unlock with zero completed lessons', async () => {
      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });
      expect(newlyUnlocked).not.toContain('FIRST_STEPS');
    });

    it('does not re-unlock if already awarded', async () => {
      const lessonId = await seedLesson({ slug: 'first-steps-dup', order: 1 });
      await markLessonCompleted(lessonId);
      await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });

      const second = await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });

      expect(second.newlyUnlocked).not.toContain('FIRST_STEPS');
      const allAchievements = await db
        .select()
        .from(achievements)
        .where(
          and(
            eq(achievements.userId, STUDENT_ID),
            eq(achievements.badgeType, 'FIRST_STEPS')
          )
        );
      expect(allAchievements).toHaveLength(1);
    });
  });

  describe('PERFECT_SCORE', () => {
    it('unlocks when any completed attempt is 100%', async () => {
      const lessonId = await seedLesson({ slug: 'perfect-lesson', order: 1 });
      await insertAttempt({ lessonId, score: 10, maxScore: 10, attemptNumber: 1 });

      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'quiz_completed',
        studentId: STUDENT_ID,
      });

      expect(newlyUnlocked).toContain('PERFECT_SCORE');
    });

    it('does not unlock when best is below 100%', async () => {
      const lessonId = await seedLesson({ slug: 'perfect-partial', order: 1 });
      await insertAttempt({ lessonId, score: 9, maxScore: 10, attemptNumber: 1 });

      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'quiz_completed',
        studentId: STUDENT_ID,
      });

      expect(newlyUnlocked).not.toContain('PERFECT_SCORE');
    });
  });

  describe('LAB_PARTNER', () => {
    it('unlocks when a completed lesson has lessonType=LAB', async () => {
      const lessonId = await seedLesson({
        slug: 'lab-lesson',
        lessonType: 'LAB',
        order: 1,
      });
      await markLessonCompleted(lessonId);

      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });

      expect(newlyUnlocked).toContain('LAB_PARTNER');
    });

    it('does not unlock when no LAB lessons are completed', async () => {
      const lessonId = await seedLesson({ slug: 'non-lab-lesson', order: 1 });
      await markLessonCompleted(lessonId);

      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });

      expect(newlyUnlocked).not.toContain('LAB_PARTNER');
    });
  });

  describe('UNIT_CHAMPION', () => {
    it('unlocks when all lessons in a unit are completed', async () => {
      const classId = await seedClass();
      const unitId = await seedUnit(classId);
      const l1 = await seedLesson({ slug: 'uc-1', order: 1 });
      const l2 = await seedLesson({ slug: 'uc-2', order: 2 });
      await attachLessonToUnit(unitId, l1);
      await attachLessonToUnit(unitId, l2);
      await markLessonCompleted(l1);
      await markLessonCompleted(l2);

      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });

      expect(newlyUnlocked).toContain('UNIT_CHAMPION');
    });

    it('does not unlock when only some lessons in a unit are completed', async () => {
      const classId = await seedClass();
      const unitId = await seedUnit(classId);
      const l1 = await seedLesson({ slug: 'uc-partial-1', order: 1 });
      const l2 = await seedLesson({ slug: 'uc-partial-2', order: 2 });
      await attachLessonToUnit(unitId, l1);
      await attachLessonToUnit(unitId, l2);
      await markLessonCompleted(l1);

      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });

      expect(newlyUnlocked).not.toContain('UNIT_CHAMPION');
    });
  });

  describe('STREAK_WARRIOR / DEDICATED_LEARNER', () => {
    it('STREAK_WARRIOR unlocks at streak=7', async () => {
      await setStreak(7);
      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'quiz_completed',
        studentId: STUDENT_ID,
      });
      expect(newlyUnlocked).toContain('STREAK_WARRIOR');
    });

    it('STREAK_WARRIOR does not unlock at streak=6', async () => {
      await setStreak(6);
      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'quiz_completed',
        studentId: STUDENT_ID,
      });
      expect(newlyUnlocked).not.toContain('STREAK_WARRIOR');
    });

    it('DEDICATED_LEARNER unlocks at streak=30', async () => {
      await setStreak(30);
      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'quiz_completed',
        studentId: STUDENT_ID,
      });
      expect(newlyUnlocked).toContain('DEDICATED_LEARNER');
    });
  });

  describe('QUIZ_MASTER / SCIENCE_EXPLORER / FAST_LEARNER', () => {
    it('QUIZ_MASTER unlocks at 10 completed attempts', async () => {
      const lessonId = await seedLesson({ slug: 'quiz-master-lesson', order: 1 });
      for (let i = 1; i <= 10; i++) {
        await insertAttempt({
          lessonId,
          score: 5,
          maxScore: 10,
          attemptNumber: i,
        });
      }

      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'quiz_completed',
        studentId: STUDENT_ID,
      });
      expect(newlyUnlocked).toContain('QUIZ_MASTER');
    });

    it('SCIENCE_EXPLORER unlocks at 10 completed lessons', async () => {
      for (let i = 1; i <= 10; i++) {
        const lid = await seedLesson({ slug: `se-${i}`, order: i });
        await markLessonCompleted(lid);
      }
      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });
      expect(newlyUnlocked).toContain('SCIENCE_EXPLORER');
    });

    it('FAST_LEARNER unlocks at 5 first-attempt passes ≥80%', async () => {
      for (let i = 1; i <= 5; i++) {
        const lid = await seedLesson({ slug: `fl-${i}`, order: i });
        await insertAttempt({
          lessonId: lid,
          score: 9,
          maxScore: 10,
          attemptNumber: 1,
        });
      }
      const { newlyUnlocked } = await checkBadgeConditions(STUDENT_ID, {
        type: 'quiz_completed',
        studentId: STUDENT_ID,
      });
      expect(newlyUnlocked).toContain('FAST_LEARNER');
    });
  });

  describe('BILINGUAL_SCHOLAR', () => {
    it('never unlocks (deferred, requires language preference tracking)', async () => {
      const lessonId = await seedLesson({ slug: 'bili-lesson', order: 1 });
      await markLessonCompleted(lessonId);
      const all = await evaluateAllBadges(STUDENT_ID);
      expect(all).not.toContain('BILINGUAL_SCHOLAR');
    });
  });

  describe('Achievement creation', () => {
    it('creates one Achievement row per newly unlocked badge', async () => {
      const lessonId = await seedLesson({
        slug: 'achievement-lesson',
        lessonType: 'LAB',
        order: 1,
      });
      await markLessonCompleted(lessonId);
      // Hit FIRST_STEPS + LAB_PARTNER
      await insertAttempt({ lessonId, score: 10, maxScore: 10, attemptNumber: 1 });
      // adds PERFECT_SCORE too

      const { newlyUnlocked, achievements: created } = await checkBadgeConditions(
        STUDENT_ID,
        { type: 'lesson_completed', studentId: STUDENT_ID }
      );

      expect(newlyUnlocked.sort()).toEqual(
        ['FIRST_STEPS', 'LAB_PARTNER', 'PERFECT_SCORE'].sort()
      );
      expect(created).toHaveLength(3);

      const rows = await db
        .select()
        .from(achievements)
        .where(eq(achievements.userId, STUDENT_ID));
      expect(rows).toHaveLength(3);
    });

    it('does not duplicate achievements on subsequent calls', async () => {
      const lessonId = await seedLesson({
        slug: 'dup-lesson',
        order: 1,
      });
      await markLessonCompleted(lessonId);
      await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });

      const second = await checkBadgeConditions(STUDENT_ID, {
        type: 'lesson_completed',
        studentId: STUDENT_ID,
      });

      expect(second.newlyUnlocked).toHaveLength(0);
      expect(second.achievements).toHaveLength(0);
    });
  });

  describe('evaluateAllBadges', () => {
    it('returns every badge the student currently qualifies for', async () => {
      const lessonId = await seedLesson({ slug: 'eval-lesson', order: 1 });
      await markLessonCompleted(lessonId);
      for (let i = 2; i <= 10; i++) {
        const lid = await seedLesson({ slug: `eval-${i}`, order: i });
        await markLessonCompleted(lid);
      }
      await insertAttempt({ lessonId, score: 10, maxScore: 10, attemptNumber: 1 });
      await setStreak(7);

      const list = await evaluateAllBadges(STUDENT_ID);
      expect(list).toEqual(
        expect.arrayContaining([
          'FIRST_STEPS',
          'PERFECT_SCORE',
          'SCIENCE_EXPLORER',
          'STREAK_WARRIOR',
        ])
      );
    });
  });
});

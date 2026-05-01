import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  return {
    default: {
      lessonCompletion: {
        count: vi.fn(),
      },
      attempt: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      curriculumUnit: {
        findMany: vi.fn(),
      },
      gamificationProfile: {
        findUnique: vi.fn(),
      },
      achievement: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

import prisma from '@/lib/prisma';
import {
  checkBadgeConditions,
  evaluateAllBadges,
  BADGE_DEFINITIONS,
} from './badges';

const mockedPrisma = vi.mocked(prisma, true);

function mockAchievementCreate() {
  let callCount = 0;
  mockedPrisma.achievement.create.mockImplementation(async (args: any) => {
    callCount++;
    return {
      id: `ach-${callCount}`,
      userId: args.data.userId,
      badgeType: args.data.badgeType,
      unlockedAt: args.data.unlockedAt,
    } as any;
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  // Re-setup default mocks after reset
  mockedPrisma.curriculumUnit.findMany.mockResolvedValue([]);
  mockedPrisma.attempt.findMany.mockResolvedValue([]);
  mockedPrisma.achievement.findMany.mockResolvedValue([]);
  mockAchievementCreate();
});

describe('Badge Definitions', () => {
  it('defines 10 badge types', () => {
    expect(BADGE_DEFINITIONS).toHaveLength(10);
  });

  it('each badge has id, name, description, and icon', () => {
    for (const badge of BADGE_DEFINITIONS) {
      expect(badge.id).toBeTruthy();
      expect(badge.name).toBeTruthy();
      expect(badge.description).toBeTruthy();
      expect(badge.icon).toBeTruthy();
    }
  });

  it('all badge IDs are unique', () => {
    const ids = BADGE_DEFINITIONS.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('FIRST_STEPS badge', () => {
  it('unlocks when user has at least 1 completed lesson', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(1);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toContain('FIRST_STEPS');
  });

  it('does not unlock when user has no completed lessons', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('FIRST_STEPS');
  });

  it('does not unlock if already earned', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(1);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.achievement.findMany.mockResolvedValue([
      { badgeType: 'FIRST_STEPS', id: 'a1', unlockedAt: new Date(), userId: 'user-1' },
    ]);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('FIRST_STEPS');
  });
});

describe('PERFECT_SCORE badge', () => {
  it('unlocks when user has a 100% attempt', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue({
      score: 10,
      maxScore: 10,
    } as never);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      score: 100,
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toContain('PERFECT_SCORE');
  });

  it('does not unlock when best score is below 100%', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue({
      score: 9,
      maxScore: 10,
    } as never);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      score: 90,
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('PERFECT_SCORE');
  });

  it('does not unlock when no attempts exist', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('PERFECT_SCORE');
  });
});

describe('SCIENCE_EXPLORER badge', () => {
  it('unlocks when user has 10+ completed lessons', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(10);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toContain('SCIENCE_EXPLORER');
  });

  it('does not unlock with fewer than 10 completed lessons', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(9);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('SCIENCE_EXPLORER');
  });
});

describe('LAB_PARTNER badge', () => {
  it('unlocks when user has completed a LAB lesson', async () => {
    // FIRST_STEPS, SCIENCE_EXPLORER, LAB_PARTNER
    mockedPrisma.lessonCompletion.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toContain('LAB_PARTNER');
  });

  it('does not unlock when no LAB lessons completed', async () => {
    mockedPrisma.lessonCompletion.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('LAB_PARTNER');
  });
});

describe('STREAK_WARRIOR badge', () => {
  it('unlocks when streak >= 7', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.gamificationProfile.findUnique.mockResolvedValue({
      streak: 7,
    } as never);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toContain('STREAK_WARRIOR');
  });

  it('does not unlock with streak < 7', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.gamificationProfile.findUnique.mockResolvedValue({
      streak: 6,
    } as never);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('STREAK_WARRIOR');
  });
});

describe('DEDICATED_LEARNER badge', () => {
  it('unlocks when streak >= 30', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.gamificationProfile.findUnique.mockResolvedValue({
      streak: 30,
    } as never);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toContain('DEDICATED_LEARNER');
  });

  it('does not unlock with streak < 30', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.gamificationProfile.findUnique.mockResolvedValue({
      streak: 29,
    } as never);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('DEDICATED_LEARNER');
  });
});

describe('QUIZ_MASTER badge', () => {
  it('unlocks when user has 10+ completed attempts', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.attempt.count.mockResolvedValue(10);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toContain('QUIZ_MASTER');
  });

  it('does not unlock with fewer than 10 completed attempts', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.attempt.count.mockResolvedValue(9);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('QUIZ_MASTER');
  });
});

describe('FAST_LEARNER badge', () => {
  it('unlocks when user has 5+ first-attempt passes with 80%+', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.attempt.findMany.mockResolvedValue([
      { score: 10, maxScore: 10 },
      { score: 9, maxScore: 10 },
      { score: 10, maxScore: 10 },
      { score: 8, maxScore: 10 },
      { score: 10, maxScore: 10 },
    ] as never);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toContain('FAST_LEARNER');
  });

  it('does not unlock with fewer than 5 qualifying attempts', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.attempt.findMany.mockResolvedValue([
      { score: 10, maxScore: 10 },
      { score: 5, maxScore: 10 },
    ] as never);

    const result = await checkBadgeConditions('user-1', {
      type: 'quiz_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('FAST_LEARNER');
  });
});

describe('UNIT_CHAMPION badge', () => {
  it('unlocks when all lessons in a unit are completed', async () => {
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.curriculumUnit.findMany.mockResolvedValue([
      {
        id: 'unit-1',
        lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }],
      },
    ] as never);
    mockedPrisma.lessonCompletion.count.mockResolvedValue(2);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toContain('UNIT_CHAMPION');
  });

  it('does not unlock when not all lessons in a unit are completed', async () => {
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.curriculumUnit.findMany.mockResolvedValue([
      {
        id: 'unit-1',
        lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }],
      },
    ] as never);
    mockedPrisma.lessonCompletion.count.mockResolvedValue(1);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('UNIT_CHAMPION');
  });
});

describe('BILINGUAL_SCHOLAR badge', () => {
  it('is always false (deferred — needs language preference tracking)', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(0);
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).not.toContain('BILINGUAL_SCHOLAR');
  });
});

describe('Achievement creation', () => {
  it('creates Achievement records for newly unlocked badges', async () => {
    // Only FIRST_STEPS matches: completed count = 1, everything else returns 0
    mockedPrisma.lessonCompletion.count
      .mockResolvedValueOnce(1)  // FIRST_STEPS: 1>=1 → true
      .mockResolvedValueOnce(0)  // SCIENCE_EXPLORER: 0>=10 → false
      .mockResolvedValueOnce(0); // LAB_PARTNER: 0>=1 → false
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toContain('FIRST_STEPS');
    expect(result.achievements.length).toBeGreaterThanOrEqual(1);
    expect(result.achievements[0].badgeType).toBe('FIRST_STEPS');
    expect(mockedPrisma.achievement.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        badgeType: 'FIRST_STEPS',
        unlockedAt: expect.any(Date),
      },
    });
  });

  it('does not create Achievement records for already-unlocked badges', async () => {
    mockedPrisma.lessonCompletion.count
      .mockResolvedValueOnce(1)  // FIRST_STEPS: matches but already earned
      .mockResolvedValueOnce(0)  // SCIENCE_EXPLORER
      .mockResolvedValueOnce(0); // LAB_PARTNER
    mockedPrisma.attempt.findFirst.mockResolvedValue(null);
    mockedPrisma.achievement.findMany.mockResolvedValue([
      { badgeType: 'FIRST_STEPS', id: 'a1', unlockedAt: new Date(), userId: 'user-1' },
    ]);

    const result = await checkBadgeConditions('user-1', {
      type: 'lesson_completed',
      studentId: 'user-1',
    });

    expect(result.newlyUnlocked).toHaveLength(0);
    expect(result.achievements).toHaveLength(0);
    expect(mockedPrisma.achievement.create).not.toHaveBeenCalled();
  });
});

describe('evaluateAllBadges', () => {
  it('returns all matching badge types for a user', async () => {
    mockedPrisma.lessonCompletion.count.mockResolvedValue(10);
    mockedPrisma.attempt.findFirst.mockResolvedValue({
      score: 10,
      maxScore: 10,
    } as never);
    mockedPrisma.gamificationProfile.findUnique.mockResolvedValue({
      streak: 7,
    } as never);

    const result = await evaluateAllBadges('user-1');

    expect(result).toContain('FIRST_STEPS');
    expect(result).toContain('PERFECT_SCORE');
    expect(result).toContain('SCIENCE_EXPLORER');
    expect(result).toContain('STREAK_WARRIOR');
  });
});

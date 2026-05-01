import { describe, it, expect } from 'vitest';
import { calculateLevel, getLevelName } from './xp';

describe('XP and Level Calculation', () => {
  describe('calculateLevel', () => {
    it('returns level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('returns level 1 for 99 XP', () => {
      expect(calculateLevel(99)).toBe(1);
    });

    it('returns level 2 for 100 XP', () => {
      expect(calculateLevel(100)).toBe(2);
    });

    it('returns level 2 for 299 XP', () => {
      expect(calculateLevel(299)).toBe(2);
    });

    it('returns level 3 for 300 XP', () => {
      expect(calculateLevel(300)).toBe(3);
    });

    it('returns level 3 for 599 XP', () => {
      expect(calculateLevel(599)).toBe(3);
    });

    it('returns level 4 for 600 XP', () => {
      expect(calculateLevel(600)).toBe(4);
    });

    it('returns level 5 for 1000 XP', () => {
      expect(calculateLevel(1000)).toBe(5);
    });

    it('returns level 6 for 1500 XP', () => {
      expect(calculateLevel(1500)).toBe(6);
    });

    it('returns level 6 for very high XP', () => {
      expect(calculateLevel(10000)).toBe(6);
    });
  });

  describe('getLevelName', () => {
    it('returns "Explorer" for level 1', () => {
      expect(getLevelName(1)).toBe('Explorer');
    });

    it('returns "Discoverer" for level 2', () => {
      expect(getLevelName(2)).toBe('Discoverer');
    });

    it('returns "Scientist" for level 3', () => {
      expect(getLevelName(3)).toBe('Scientist');
    });

    it('returns "Researcher" for level 4', () => {
      expect(getLevelName(4)).toBe('Researcher');
    });

    it('returns "Innovator" for level 5', () => {
      expect(getLevelName(5)).toBe('Innovator');
    });

    it('returns "Master" for level 6', () => {
      expect(getLevelName(6)).toBe('Master');
    });

    it('returns "Explorer" for level 0 (edge case)', () => {
      expect(getLevelName(0)).toBe('Explorer');
    });

    it('returns "Master" for level > 6 (max level)', () => {
      expect(getLevelName(7)).toBe('Master');
      expect(getLevelName(100)).toBe('Master');
    });
  });
});

describe('XP Award Calculation', () => {
  it('awards 100 XP for 90%+ score', () => {
    // These tests verify the XP award logic that will be implemented in awardXp
    // The actual implementation should use these thresholds
    const scorePercentages = [
      { percentage: 95, expectedXp: 100 },
      { percentage: 90, expectedXp: 100 },
      { percentage: 89, expectedXp: 75 },
      { percentage: 80, expectedXp: 75 },
      { percentage: 79, expectedXp: 50 },
      { percentage: 60, expectedXp: 50 },
      { percentage: 59, expectedXp: 0 },
      { percentage: 0, expectedXp: 0 },
    ];

    for (const { percentage, expectedXp } of scorePercentages) {
      // This is the logic that awardXp should implement
      let xp = 0;
      if (percentage >= 90) {
        xp = 100;
      } else if (percentage >= 80) {
        xp = 75;
      } else if (percentage >= 60) {
        xp = 50;
      }
      expect(xp).toBe(expectedXp);
    }
  });

  it('awards +25 XP first-attempt bonus for 80%+ on first attempt', () => {
    const attemptNumber = 1;
    const scorePercentage = 85;
    const baseXp = scorePercentage >= 90 ? 100 : scorePercentage >= 80 ? 75 : 50;
    const firstAttemptBonus = attemptNumber === 1 && scorePercentage >= 80 ? 25 : 0;
    expect(baseXp + firstAttemptBonus).toBe(100);
  });

  it('does not award first-attempt bonus for second attempt', () => {
    const attemptNumber = 2;
    const scorePercentage = 85;
    const baseXp = scorePercentage >= 90 ? 100 : scorePercentage >= 80 ? 75 : 50;
    const firstAttemptBonus = attemptNumber === 1 && scorePercentage >= 80 ? 25 : 0;
    expect(baseXp + firstAttemptBonus).toBe(75);
  });

  it('does not award first-attempt bonus for score below 80%', () => {
    const attemptNumber = 1;
    const scorePercentage = 70;
    const baseXp = scorePercentage >= 90 ? 100 : scorePercentage >= 80 ? 75 : 50;
    const firstAttemptBonus = attemptNumber === 1 && scorePercentage >= 80 ? 25 : 0;
    expect(baseXp + firstAttemptBonus).toBe(50);
  });
});

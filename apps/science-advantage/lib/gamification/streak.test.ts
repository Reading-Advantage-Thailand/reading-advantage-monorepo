import { describe, it, expect } from 'vitest';
import { updateStreak, getStreakMilestoneBonus } from './streak';

describe('Streak Tracking', () => {
  describe('updateStreak', () => {
    it('sets streak to 1 when lastActiveAt is null (first activity)', () => {
      const profile = { lastActiveAt: null, streak: 0 };
      const result = updateStreak(profile, new Date('2026-04-28T10:00:00Z'));
      expect(result.streak).toBe(1);
    });

    it('increments streak when lastActiveAt was yesterday', () => {
      const profile = {
        lastActiveAt: new Date('2026-04-27T10:00:00Z'),
        streak: 5,
      };
      const result = updateStreak(profile, new Date('2026-04-28T10:00:00Z'));
      expect(result.streak).toBe(6);
    });

    it('keeps streak unchanged when lastActiveAt is today', () => {
      const profile = {
        lastActiveAt: new Date('2026-04-28T08:00:00Z'),
        streak: 5,
      };
      const result = updateStreak(profile, new Date('2026-04-28T10:00:00Z'));
      expect(result.streak).toBe(5);
    });

    it('resets streak to 1 when lastActiveAt was 2+ days ago', () => {
      const profile = {
        lastActiveAt: new Date('2026-04-25T10:00:00Z'),
        streak: 10,
      };
      const result = updateStreak(profile, new Date('2026-04-28T10:00:00Z'));
      expect(result.streak).toBe(1);
    });

    it('updates lastActiveAt to current time', () => {
      const profile = {
        lastActiveAt: new Date('2026-04-27T10:00:00Z'),
        streak: 3,
      };
      const currentTime = new Date('2026-04-28T14:30:00Z');
      const result = updateStreak(profile, currentTime);
      expect(result.lastActiveAt).toBe(currentTime);
    });

    it('handles same-day activity correctly (updates time but not streak)', () => {
      const profile = {
        lastActiveAt: new Date('2026-04-28T09:00:00Z'),
        streak: 7,
      };
      const currentTime = new Date('2026-04-28T15:00:00Z');
      const result = updateStreak(profile, currentTime);
      expect(result.streak).toBe(7);
      expect(result.lastActiveAt).toBe(currentTime);
    });
  });

  describe('getStreakMilestoneBonus', () => {
    it('returns 0 for streak below 7', () => {
      expect(getStreakMilestoneBonus(6)).toBe(0);
    });

    it('returns 50 XP for 7-day streak milestone', () => {
      expect(getStreakMilestoneBonus(7)).toBe(50);
    });

    it('returns 0 for streak between 7 and 30', () => {
      expect(getStreakMilestoneBonus(15)).toBe(0);
    });

    it('returns 200 XP for 30-day streak milestone', () => {
      expect(getStreakMilestoneBonus(30)).toBe(200);
    });

    it('returns 0 for streak above 30 (already claimed)', () => {
      expect(getStreakMilestoneBonus(31)).toBe(0);
    });

    it('returns 50 XP for streak of exactly 7', () => {
      expect(getStreakMilestoneBonus(7)).toBe(50);
    });

    it('returns 200 XP for streak of exactly 30', () => {
      expect(getStreakMilestoneBonus(30)).toBe(200);
    });
  });
});

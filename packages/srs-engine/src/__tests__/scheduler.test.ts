import { describe, it, expect } from 'vitest';
import {
  createCard,
  reviewCard,
  getDueCards,
  mapSrsRatingToGrade,
  mapGradeToSrsRating,
  DEFAULT_SCHEDULER_CONFIG,
} from '../srs/scheduler.js';
import type { SrsCardState } from '../srs/contract.js';

describe('scheduler', () => {
  const mockNow = '2026-04-18T00:00:00.000Z';

  describe('createCard', () => {
    it('should create a card with new state', () => {
      const card = createCard({
        studentId: 'stu_001',
        objectiveId: 'obj_quadratic_roots',
        variantKey: 'pf_qr_01',
        now: mockNow,
      });

      expect(card.studentId).toBe('stu_001');
      expect(card.objectiveId).toBe('obj_quadratic_roots');
      expect(card.variantKey).toBe('pf_qr_01');
      expect(card.state).toBe('new');
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
      expect(card.stability).toBe(0);
      expect(card.difficulty).toBe(0);
      expect(card.cardId).toMatch(/^card_[a-f0-9]{32}$/);
    });
  });

  describe('reviewCard', () => {
    it('should update card state after review', () => {
      const card = createCard({
        studentId: 'stu_001',
        objectiveId: 'obj_quadratic_roots',
        variantKey: 'pf_qr_01',
        now: mockNow,
      });

      const updated = reviewCard(card, 'Good', mockNow);

      expect(updated.reps).toBe(1);
      expect(updated.state).toBeTruthy();
      expect(updated.dueDate).not.toBe(mockNow);
    });

    it('should handle Again rating', () => {
      const card = createCard({
        studentId: 'stu_001',
        objectiveId: 'obj_quadratic_roots',
        variantKey: 'pf_qr_01',
        now: mockNow,
      });

      const updated = reviewCard(card, 'Again', mockNow);

      expect(updated.lapses).toBeGreaterThanOrEqual(0);
      expect(updated.state).toBeTruthy();
    });
  });

  describe('getDueCards', () => {
    it('should return only cards with dueDate <= now', () => {
      const now = '2026-04-18T12:00:00.000Z';
      const cards: SrsCardState[] = [
        {
          cardId: 'card_1',
          studentId: 'stu_001',
          objectiveId: 'obj_1',
          variantKey: 'pf_1',
          stability: 1,
          difficulty: 1,
          state: 'review',
          dueDate: '2026-04-18T06:00:00.000Z', // before now
          elapsedDays: 0,
          scheduledDays: 1,
          reps: 1,
          lapses: 0,
          lastReview: null,
          createdAt: mockNow,
          updatedAt: mockNow,
        },
        {
          cardId: 'card_2',
          studentId: 'stu_001',
          objectiveId: 'obj_1',
          variantKey: 'pf_2',
          stability: 1,
          difficulty: 1,
          state: 'review',
          dueDate: '2026-04-18T18:00:00.000Z', // after now
          elapsedDays: 0,
          scheduledDays: 1,
          reps: 1,
          lapses: 0,
          lastReview: null,
          createdAt: mockNow,
          updatedAt: mockNow,
        },
      ];

      const due = getDueCards(cards, now);

      expect(due).toHaveLength(1);
      expect(due[0].cardId).toBe('card_1');
    });
  });

  describe('mapSrsRatingToGrade', () => {
    it('should map all ratings correctly', () => {
      expect(mapSrsRatingToGrade('Again')).toBe(1);
      expect(mapSrsRatingToGrade('Hard')).toBe(2);
      expect(mapSrsRatingToGrade('Good')).toBe(3);
      expect(mapSrsRatingToGrade('Easy')).toBe(4);
    });
  });

  describe('mapGradeToSrsRating', () => {
    it('should map all grades correctly', () => {
      expect(mapGradeToSrsRating(1)).toBe('Again');
      expect(mapGradeToSrsRating(2)).toBe('Hard');
      expect(mapGradeToSrsRating(3)).toBe('Good');
      expect(mapGradeToSrsRating(4)).toBe('Easy');
    });

    it('should default to Again for unknown grades', () => {
      expect(mapGradeToSrsRating(0 as never)).toBe('Again');
      expect(mapGradeToSrsRating(5 as never)).toBe('Again');
    });
  });

  describe('DEFAULT_SCHEDULER_CONFIG', () => {
    it('should have sensible educational defaults', () => {
      expect(DEFAULT_SCHEDULER_CONFIG.requestRetention).toBe(0.9);
      expect(DEFAULT_SCHEDULER_CONFIG.maximumInterval).toBe(365);
      expect(DEFAULT_SCHEDULER_CONFIG.enableShortTermPreview).toBe(false);
    });
  });
});
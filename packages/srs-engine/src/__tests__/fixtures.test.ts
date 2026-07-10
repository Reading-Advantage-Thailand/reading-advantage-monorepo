import { describe, it, expect } from 'vitest';
import {
  createMockSrsCard,
  createMockSrsReviewLog,
} from '../srs/fixtures.js';

describe('createMockSrsCard', () => {
  it('produces a valid SRS card with defaults', () => {
    const card = createMockSrsCard();

    expect(card.cardId).toMatch(/^card_/);
    expect(card.studentId).toBe('mock-student');
    expect(card.objectiveId).toBe('mock-objective');
    expect(card.variantKey).toBe('mock-family');
    expect(card.state).toBe('new');
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.stability).toBe(0);
    expect(card.difficulty).toBe(0);
    expect(card.lastReview).toBeNull();
    expect(card.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(card.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(card.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('accepts overrides for all fields', () => {
    const card = createMockSrsCard({
      cardId: 'card_custom',
      studentId: 'stu_001',
      objectiveId: 'obj_001',
      variantKey: 'pf_001',
      state: 'review',
      reps: 5,
      lapses: 1,
      stability: 3.5,
      difficulty: 2.0,
    });

    expect(card.cardId).toBe('card_custom');
    expect(card.studentId).toBe('stu_001');
    expect(card.objectiveId).toBe('obj_001');
    expect(card.variantKey).toBe('pf_001');
    expect(card.state).toBe('review');
    expect(card.reps).toBe(5);
    expect(card.lapses).toBe(1);
    expect(card.stability).toBe(3.5);
    expect(card.difficulty).toBe(2.0);
  });

  it('generates unique card IDs when none provided', () => {
    const card1 = createMockSrsCard();
    const card2 = createMockSrsCard();
    expect(card1.cardId).not.toBe(card2.cardId);
  });
});

describe('createMockSrsReviewLog', () => {
  it('produces a valid review log with defaults', () => {
    const log = createMockSrsReviewLog();

    expect(log.reviewId).toMatch(/^review_/);
    expect(log.cardId).toBe('mock-card');
    expect(log.studentId).toBe('mock-student');
    expect(log.rating).toBe('Good');
    expect(log.submissionId).toBe('mock-submission');
    expect(log.evidence).toEqual({
      baseRating: 'Good',
      timingAdjusted: false,
      reasons: ['correct'],
    });
    expect(log.stateBefore).toEqual({
      stability: 0,
      difficulty: 0,
      state: 'new',
      reps: 0,
      lapses: 0,
    });
    expect(log.stateAfter).toEqual({
      stability: 1,
      difficulty: 0,
      state: 'learning',
      reps: 1,
      lapses: 0,
    });
    expect(log.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('accepts overrides for all fields', () => {
    const log = createMockSrsReviewLog({
      reviewId: 'rev_custom',
      rating: 'Again',
      evidence: {
        action: 'teacher_reset',
        objectiveId: 'obj_001',
      },
      stateBefore: {
        stability: 5,
        difficulty: 3,
        state: 'review',
        reps: 5,
        lapses: 0,
      },
      stateAfter: {
        stability: 4,
        difficulty: 3,
        state: 'review',
        reps: 6,
        lapses: 0,
      },
    });

    expect(log.reviewId).toBe('rev_custom');
    expect(log.rating).toBe('Again');
    expect(log.evidence).toEqual({
      action: 'teacher_reset',
      objectiveId: 'obj_001',
    });
    expect(log.stateBefore.reps).toBe(5);
    expect(log.stateAfter.lapses).toBe(0);
    expect(log.stateAfter.state).toBe('review');
  });

  it('generates unique review IDs when none provided', () => {
    const log1 = createMockSrsReviewLog();
    const log2 = createMockSrsReviewLog();
    expect(log1.reviewId).not.toBe(log2.reviewId);
  });
});

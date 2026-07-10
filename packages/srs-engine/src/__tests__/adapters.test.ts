import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCardStore, InMemoryReviewLogStore } from '../srs/adapters.js';
import type { SrsCardState, SrsReviewLogEntry } from '../srs/contract.js';

describe('InMemoryCardStore', () => {
  let store: InMemoryCardStore;
  const mockNow = '2026-04-18T00:00:00.000Z';

  const createMockCard = (overrides: Partial<SrsCardState> = {}): SrsCardState => ({
    cardId: `card_${Math.random().toString(36).slice(2)}`,
    studentId: 'stu_001',
    objectiveId: 'obj_1',
    variantKey: 'pf_1',
    stability: 1,
    difficulty: 1,
    state: 'new',
    dueDate: mockNow,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    createdAt: mockNow,
    updatedAt: mockNow,
    ...overrides,
  });

  beforeEach(() => {
    store = new InMemoryCardStore();
  });

  describe('saveCard and getCard', () => {
    it('should save and retrieve a card', async () => {
      const card = createMockCard();
      await store.saveCard(card);
      const retrieved = await store.getCard(card.cardId);
      expect(retrieved).toEqual(card);
    });

    it('should return null for non-existent card', async () => {
      const retrieved = await store.getCard('non_existent');
      expect(retrieved).toBeNull();
    });

    it('should overwrite existing card on save', async () => {
      const card = createMockCard({ stability: 1 });
      await store.saveCard(card);
      await store.saveCard({ ...card, stability: 2 });
      const retrieved = await store.getCard(card.cardId);
      expect(retrieved?.stability).toBe(2);
    });
  });

  describe('getCardsByStudent', () => {
    it('should return all cards for a student', async () => {
      const card1 = createMockCard({ cardId: 'card_1', studentId: 'stu_001' });
      const card2 = createMockCard({ cardId: 'card_2', studentId: 'stu_001' });
      const card3 = createMockCard({ cardId: 'card_3', studentId: 'stu_002' });
      await store.saveCards([card1, card2, card3]);

      const studentCards = await store.getCardsByStudent('stu_001');
      expect(studentCards).toHaveLength(2);
      expect(studentCards.map(c => c.cardId).sort()).toEqual(['card_1', 'card_2']);
    });
  });

  describe('getCardsByObjective', () => {
    it('should return all cards for an objective', async () => {
      const card1 = createMockCard({ cardId: 'card_1', objectiveId: 'obj_1' });
      const card2 = createMockCard({ cardId: 'card_2', objectiveId: 'obj_1' });
      const card3 = createMockCard({ cardId: 'card_3', objectiveId: 'obj_2' });
      await store.saveCards([card1, card2, card3]);

      const objectiveCards = await store.getCardsByObjective('obj_1');
      expect(objectiveCards).toHaveLength(2);
    });
  });

  describe('getDueCards', () => {
    it('should return cards due before or at now', async () => {
      const now = '2026-04-18T12:00:00.000Z';
      const card1 = createMockCard({
        cardId: 'card_1',
        studentId: 'stu_001',
        state: 'review',
        dueDate: '2026-04-18T06:00:00.000Z', // before now
      });
      const card2 = createMockCard({
        cardId: 'card_2',
        studentId: 'stu_001',
        state: 'review',
        dueDate: '2026-04-18T18:00:00.000Z', // after now
      });
      await store.saveCards([card1, card2]);

      const dueCards = await store.getDueCards('stu_001', now);
      expect(dueCards).toHaveLength(1);
      expect(dueCards[0].cardId).toBe('card_1');
    });
  });
});

describe('InMemoryReviewLogStore', () => {
  let store: InMemoryReviewLogStore;
  const mockNow = '2026-04-18T00:00:00.000Z';

  const createMockReview = (overrides: Partial<SrsReviewLogEntry> = {}): SrsReviewLogEntry => ({
    reviewId: `rev_${Math.random().toString(36).slice(2)}`,
    cardId: 'card_1',
    studentId: 'stu_001',
    rating: 'Good',
    submissionId: 'sub_1',
    evidence: {
      baseRating: 'Good',
      timingAdjusted: false,
      reasons: [],
    },
    stateBefore: { stability: 1, difficulty: 1, state: 'new', reps: 0, lapses: 0 },
    stateAfter: { stability: 2, difficulty: 1, state: 'learning', reps: 1, lapses: 0 },
    reviewedAt: mockNow,
    ...overrides,
  });

  beforeEach(() => {
    store = new InMemoryReviewLogStore();
  });

  describe('saveReview and getReviewsByCard', () => {
    it('should save and retrieve reviews by card', async () => {
      const review = createMockReview();
      await store.saveReview(review);
      const reviews = await store.getReviewsByCard(review.cardId);
      expect(reviews).toHaveLength(1);
      expect(reviews[0].reviewId).toBe(review.reviewId);
    });

    it('should return reviews ordered by reviewedAt', async () => {
      const review1 = createMockReview({
        reviewId: 'rev_1',
        reviewedAt: '2026-04-18T00:00:00.000Z',
      });
      const review2 = createMockReview({
        reviewId: 'rev_2',
        reviewedAt: '2026-04-18T01:00:00.000Z',
      });
      await store.saveReview(review2);
      await store.saveReview(review1);

      const reviews = await store.getReviewsByCard('card_1');
      expect(reviews[0].reviewId).toBe('rev_1');
      expect(reviews[1].reviewId).toBe('rev_2');
    });
  });

  describe('getReviewsByStudent', () => {
    it('should return all reviews for a student', async () => {
      const review1 = createMockReview({ cardId: 'card_1', studentId: 'stu_001' });
      const review2 = createMockReview({ cardId: 'card_2', studentId: 'stu_001' });
      const review3 = createMockReview({ cardId: 'card_3', studentId: 'stu_002' });
      await store.saveReview(review1);
      await store.saveReview(review2);
      await store.saveReview(review3);

      const studentReviews = await store.getReviewsByStudent('stu_001');
      expect(studentReviews).toHaveLength(2);
    });

    it('should filter by since timestamp', async () => {
      const review1 = createMockReview({
        reviewId: 'rev_1',
        reviewedAt: '2026-04-17T00:00:00.000Z',
      });
      const review2 = createMockReview({
        reviewId: 'rev_2',
        reviewedAt: '2026-04-19T00:00:00.000Z',
      });
      await store.saveReview(review1);
      await store.saveReview(review2);

      const reviews = await store.getReviewsByStudent('stu_001', '2026-04-18T00:00:00.000Z');
      expect(reviews).toHaveLength(1);
      expect(reviews[0].reviewId).toBe('rev_2');
    });
  });
});
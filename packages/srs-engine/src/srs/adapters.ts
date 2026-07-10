/**
 * SRS Persistence Adapter Interfaces
 *
 * Defines `CardStore` and `ReviewLogStore` interfaces for SRS card and review
 * log persistence. These interfaces are intentionally agnostic to the
 * underlying storage layer so that the SRS core library remains pure and
 * testable.
 */

import type { SrsCardState, SrsReviewLogEntry } from './contract.js';

/**
 * Persistence adapter for SRS card state.
 */
export interface CardStore {
  /**
   * Retrieve a single card by its unique cardId.
   * Returns null if not found.
   */
  getCard(id: string): Promise<SrsCardState | null>;

  /**
   * Retrieve all cards belonging to a student.
   */
  getCardsByStudent(studentId: string): Promise<SrsCardState[]>;

  /**
   * Retrieve all cards for a specific objective.
   */
  getCardsByObjective(objectiveId: string): Promise<SrsCardState[]>;

  /**
   * Retrieve a single card by student and problem family.
   * Returns null if not found.
   */
  getCardByStudentAndVariant(studentId: string, variantKey: string): Promise<SrsCardState | null>;

  /**
   * Retrieve cards due for review for a given student at the given time.
   * Filters cards where dueDate <= now.
   */
  getDueCards(studentId: string, now: string): Promise<SrsCardState[]>;

  /**
   * Save (upsert) a single card.
   */
  saveCard(card: SrsCardState): Promise<void>;

  /**
   * Save (upsert) multiple cards in one call.
   */
  saveCards(cards: SrsCardState[]): Promise<void>;
}

/**
 * Persistence adapter for SRS review log entries.
 */
export interface ReviewLogStore {
  /**
   * Save a single review log entry.
   */
  saveReview(entry: SrsReviewLogEntry): Promise<void>;

  /**
   * Retrieve all review log entries for a specific card.
   * Ordered by reviewedAt ascending.
   */
  getReviewsByCard(cardId: string): Promise<SrsReviewLogEntry[]>;

  /**
   * Retrieve all review log entries for a specific student.
   * Optionally filter to entries reviewed at or after `since`.
   * Ordered by reviewedAt ascending.
   */
  getReviewsByStudent(studentId: string, since?: string): Promise<SrsReviewLogEntry[]>;
}

/**
 * In-memory implementation of `CardStore` for testing and local development.
 */
export class InMemoryCardStore implements CardStore {
  private cards = new Map<string, SrsCardState>();

  async getCard(id: string): Promise<SrsCardState | null> {
    return this.cards.get(id) ?? null;
  }

  async getCardsByStudent(studentId: string): Promise<SrsCardState[]> {
    return Array.from(this.cards.values()).filter(
      (card) => card.studentId === studentId
    );
  }

  async getCardByStudentAndVariant(studentId: string, variantKey: string): Promise<SrsCardState | null> {
    return Array.from(this.cards.values()).find(
      (card) => card.studentId === studentId && card.variantKey === variantKey
    ) ?? null;
  }

  async getCardsByObjective(objectiveId: string): Promise<SrsCardState[]> {
    return Array.from(this.cards.values()).filter(
      (card) => card.objectiveId === objectiveId
    );
  }

  async getDueCards(studentId: string, now: string): Promise<SrsCardState[]> {
    const nowMs = new Date(now).getTime();
    return Array.from(this.cards.values()).filter((card) => {
      if (card.studentId !== studentId) return false;
      const dueMs = new Date(card.dueDate).getTime();
      return dueMs <= nowMs;
    });
  }

  async saveCard(card: SrsCardState): Promise<void> {
    this.cards.set(card.cardId, card);
  }

  async saveCards(cards: SrsCardState[]): Promise<void> {
    for (const card of cards) {
      this.cards.set(card.cardId, card);
    }
  }
}

/**
 * In-memory implementation of `ReviewLogStore` for testing and local development.
 */
export class InMemoryReviewLogStore implements ReviewLogStore {
  private reviews: SrsReviewLogEntry[] = [];

  async saveReview(entry: SrsReviewLogEntry): Promise<void> {
    this.reviews.push(entry);
  }

  async getReviewsByCard(cardId: string): Promise<SrsReviewLogEntry[]> {
    return this.reviews
      .filter((review) => review.cardId === cardId)
      .sort((a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime());
  }

  async getReviewsByStudent(
    studentId: string,
    since?: string
  ): Promise<SrsReviewLogEntry[]> {
    const sinceMs = since ? new Date(since).getTime() : undefined;
    return this.reviews
      .filter((review) => {
        if (review.studentId !== studentId) return false;
        if (sinceMs === undefined) return true;
        return new Date(review.reviewedAt).getTime() >= sinceMs;
      })
      .sort((a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime());
  }
}
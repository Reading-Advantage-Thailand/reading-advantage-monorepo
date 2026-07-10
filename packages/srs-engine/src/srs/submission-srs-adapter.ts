/**
 * Submission-to-SRS Adapter
 *
 * Bridges practice submission events to SRS card state transitions.
 */

import { mapPracticeToSrsRating } from '@reading-advantage/practice-core/srs-rating';
import { deriveTimingFeatures } from '@reading-advantage/practice-core/timing-baseline';
import { createCard, reviewCard } from './scheduler.js';
import type {
  CardStore,
  ReviewLogStore,
} from './adapters.js';
import type {
  PracticeSubmissionEnvelope,
  PracticeTimingBaseline,
  SrsCardState,
  SrsRating,
  SrsReviewLogEntry,
} from './contract.js';

// ============================================
// Input / Output Types
// ============================================

export type SubmissionSrsInput = {
  submission: PracticeSubmissionEnvelope;
  studentId: string;
  activityId: string;
};

export type SubmissionSrsResult =
  | SubmissionSrsResultSuccess
  | SubmissionSrsResultSkipped
  | SubmissionSrsResultError;

export type SubmissionSrsResultSuccess = {
  ok: true;
  skipped: false;
  card: SrsCardState;
  reviewLog: {
    reviewId: string;
    rating: SrsRating;
    evidence: {
      baseRating: SrsRating;
      timingAdjusted: boolean;
      reasons: string[];
      misconceptionTags?: string[];
    };
    stateBefore: {
      stability: number;
      difficulty: number;
      state: SrsCardState['state'];
      reps: number;
      lapses: number;
    };
    stateAfter: {
      stability: number;
      difficulty: number;
      state: SrsCardState['state'];
      reps: number;
      lapses: number;
    };
    reviewedAt: string;
  };
};

export type SubmissionSrsResultSkipped = {
  ok: false;
  skipped: true;
  reason: 'no_blueprint' | 'no_timing_baseline';
};

export type SubmissionSrsResultError = {
  ok: false;
  skipped: false;
  error: string;
};

// ============================================
// Resolver Types
// ============================================

export type PracticeVariantInfo = {
  variantKey: string;
  objectiveId: string;
};

export interface PracticeVariantResolver {
  resolve(activityId: string): Promise<PracticeVariantInfo | null>;
}

// ============================================
// Timing Baseline Resolver
// ============================================

export interface TimingBaselineResolver {
  getBaseline(variantKey: string): Promise<PracticeTimingBaseline | null>;
}

// ============================================
// Main Adapter
// ============================================

export class SubmissionSrsAdapter {
  private cardStore: CardStore;
  private reviewLogStore: ReviewLogStore;
  private resolver: PracticeVariantResolver;
  private baselineResolver: TimingBaselineResolver;

  constructor(config: {
    cardStore: CardStore;
    reviewLogStore: ReviewLogStore;
    resolver: PracticeVariantResolver;
    baselineResolver: TimingBaselineResolver;
  }) {
    this.cardStore = config.cardStore;
    this.reviewLogStore = config.reviewLogStore;
    this.resolver = config.resolver;
    this.baselineResolver = config.baselineResolver;
  }

  async processSubmission(input: SubmissionSrsInput): Promise<SubmissionSrsResult> {
    try {
      return await this.processSubmissionInternal(input);
    } catch (err) {
      return {
        ok: false,
        skipped: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  protected async processSubmissionInternal(
    input: SubmissionSrsInput
  ): Promise<SubmissionSrsResult> {
    const { submission, studentId, activityId } = input;

    const familyInfo = await this.resolver.resolve(activityId);
    if (!familyInfo) {
      return { ok: false, skipped: true, reason: 'no_blueprint' };
    }

    const { variantKey, objectiveId } = familyInfo;

    const studentCards = await this.cardStore.getCardByStudentAndVariant(studentId, variantKey);
    let card = studentCards ?? null;

    if (!card) {
      const now = new Date().toISOString();
      card = createCard({
        studentId,
        objectiveId,
        variantKey,
        now,
      });
      await this.cardStore.saveCard(card);
    }

    const baseline = await this.baselineResolver.getBaseline(variantKey);
    const timingFeatures = submission.timing
      ? deriveTimingFeatures(submission.timing, baseline)
      : {
          hasReliableTiming: false as const,
          confidence: 'low' as const,
          reasons: ['timing_missing'],
        };

    const parts = submission.parts.map((part) => ({
      isCorrect: part.isCorrect,
      hintsUsed: part.hintsUsed,
      revealStepsSeen: part.revealStepsSeen,
      misconceptionTags: part.misconceptionTags,
    }));

    const ratingResult = mapPracticeToSrsRating({
      parts,
      timingFeatures,
      baselineSampleCount: baseline?.sampleCount,
    });

    const evidenceReasons = submission.timing
      ? ratingResult.reasons
      : ['timing_missing', ...ratingResult.reasons];

    const misconceptionTags = Array.from(
      new Set(submission.parts.flatMap((p) => p.misconceptionTags ?? []))
    );

    const now = new Date().toISOString();
    const updatedCard = reviewCard(card, ratingResult.rating, now);

    const stateBefore = {
      stability: card.stability,
      difficulty: card.difficulty,
      state: card.state,
      reps: card.reps,
      lapses: card.lapses,
    };

    const stateAfter = {
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      state: updatedCard.state,
      reps: updatedCard.reps,
      lapses: updatedCard.lapses,
    };

    const reviewLog = {
      reviewId: generateReviewId(),
      cardId: card.cardId,
      studentId,
      rating: ratingResult.rating,
      submissionId: `${submission.activityId}-${submission.attemptNumber}`,
      evidence: {
        baseRating: ratingResult.baseRating,
        timingAdjusted: ratingResult.timingAdjusted,
        reasons: evidenceReasons,
        misconceptionTags: misconceptionTags.length > 0 ? misconceptionTags : undefined,
      },
      stateBefore,
      stateAfter,
      reviewedAt: now,
    };

    // Use atomic save if the cardStore supports it (e.g., Convex direct handler)
    if ('saveCardAndReview' in this.cardStore && typeof (this.cardStore as unknown as Record<string, unknown>).saveCardAndReview === 'function') {
      await (this.cardStore as unknown as { saveCardAndReview(card: SrsCardState, reviewLog: SrsReviewLogEntry): Promise<void> }).saveCardAndReview(updatedCard, reviewLog);
    } else {
      await this.cardStore.saveCard(updatedCard);
      await this.reviewLogStore.saveReview(reviewLog);
    }

    return {
      ok: true,
      skipped: false,
      card: updatedCard,
      reviewLog,
    };
  }
}

/**
 * Generate a unique review ID using random hex bytes.
 * @returns {string} - Review ID string prefixed with 'rev_'
 */
function generateReviewId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `rev_${hex}`;
}

// ============================================
// In-Memory Adapter for Testing
// ============================================

export class InMemoryPracticeVariantResolver implements PracticeVariantResolver {
  private map = new Map<string, PracticeVariantInfo>();

  register(activityId: string, info: PracticeVariantInfo): void {
    this.map.set(activityId, info);
  }

  async resolve(activityId: string): Promise<PracticeVariantInfo | null> {
    return this.map.get(activityId) ?? null;
  }
}

export class InMemoryTimingBaselineResolver implements TimingBaselineResolver {
  private baselines = new Map<string, PracticeTimingBaseline>();

  setBaseline(variantKey: string, baseline: PracticeTimingBaseline): void {
    this.baselines.set(variantKey, baseline);
  }

  async getBaseline(variantKey: string): Promise<PracticeTimingBaseline | null> {
    return this.baselines.get(variantKey) ?? null;
  }
}

export class InMemorySubmissionSrsAdapter extends SubmissionSrsAdapter {
  constructor() {
    const cardStore = new InMemoryTestCardStore();
    const reviewLogStore = new InMemoryTestReviewLogStore();
    const resolver = new InMemoryPracticeVariantResolver();
    const baselineResolver = new InMemoryTimingBaselineResolver();
    super({ cardStore, reviewLogStore, resolver, baselineResolver });
  }

  getResolver(): InMemoryPracticeVariantResolver {
    return (this as unknown as { resolver: InMemoryPracticeVariantResolver }).resolver;
  }

  getBaselineResolver(): InMemoryTimingBaselineResolver {
    return (this as unknown as { baselineResolver: InMemoryTimingBaselineResolver }).baselineResolver;
  }

  getCardStore(): InMemoryTestCardStore {
    return (this as unknown as { cardStore: InMemoryTestCardStore }).cardStore;
  }

  getReviewLogStore(): InMemoryTestReviewLogStore {
    return (this as unknown as { reviewLogStore: InMemoryTestReviewLogStore }).reviewLogStore;
  }
}

class InMemoryTestCardStore implements CardStore {
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

class InMemoryTestReviewLogStore implements ReviewLogStore {
  private reviews: SrsReviewLogEntry[] = [];

  async saveReview(entry: SrsReviewLogEntry): Promise<void> {
    this.reviews.push(entry);
  }

  async getReviewsByCard(cardId: string): Promise<SrsReviewLogEntry[]> {
    return this.reviews
      .filter((review) => review.cardId === cardId)
      .sort(
        (a, b) =>
          new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
      );
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
      .sort(
        (a, b) =>
          new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
      );
  }
}
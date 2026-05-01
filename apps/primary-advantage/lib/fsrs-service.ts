// lib/fsrs-service.ts
import {
  FSRS,
  createEmptyCard,
  generatorParameters,
  Card as TSFSRSCard,
  Rating,
  RecordLog,
  RecordLogItem,
  State,
  Grade,
} from "ts-fsrs";
import { FlashcardCard } from "@/types";
import { CardState } from "@prisma/client";

class FSRSService {
  private fsrs: FSRS;

  constructor() {
    // Configure FSRS with optimized parameters for language learning
    const params = generatorParameters({
      enable_fuzz: true,
      enable_short_term: false,
      maximum_interval: 36500, // ~100 years max
      request_retention: 0.9, // 90% retention rate
      w: [
        0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
        0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034,
        0.6567,
      ], // Optimized weights for language learning
    });

    this.fsrs = new FSRS(params);
  }

  /**
   * Convert numeric ts-fsrs State to string CardState
   */
  private stateToCardState(state: State): CardState {
    switch (state) {
      case 0: // State.New
        return "NEW" as CardState;
      case 1: // State.Learning
        return "LEARNING" as CardState;
      case 2: // State.Review
        return "REVIEW" as CardState;
      case 3: // State.Relearning
        return "RELEARNING" as CardState;
      default:
        return "NEW" as CardState;
    }
  }

  /**
   * Convert string CardState to numeric ts-fsrs State
   */
  private cardStateToState(cardState: CardState): State {
    switch (cardState) {
      case "NEW":
        return 0 as State; // State.New
      case "LEARNING":
        return 1 as State; // State.Learning
      case "REVIEW":
        return 2 as State; // State.Review
      case "RELEARNING":
        return 3 as State; // State.Relearning
      default:
        return 0 as State; // Default to New
    }
  }

  /**
   * Convert database card to ts-fsrs Card format
   */
  private dbCardToFSRSCard(dbCard: FlashcardCard): TSFSRSCard {
    return {
      due: dbCard.due,
      stability: dbCard.stability,
      difficulty: dbCard.difficulty,
      elapsed_days: dbCard.elapsedDays,
      scheduled_days: dbCard.scheduledDays,
      learning_steps: dbCard.learningSteps,
      reps: dbCard.reps,
      lapses: dbCard.lapses,
      state: this.cardStateToState(dbCard.state), // Convert enum
      last_review: dbCard.lastReview,
    };
  }

  /**
   * Convert ts-fsrs Card back to database format
   */
  private fsrsCardToDbCard(
    fsrsCard: TSFSRSCard,
    originalCard: FlashcardCard,
  ): Partial<FlashcardCard> {
    return {
      due: fsrsCard.due,
      stability: fsrsCard.stability,
      difficulty: fsrsCard.difficulty,
      elapsedDays: fsrsCard.elapsed_days,
      scheduledDays: fsrsCard.scheduled_days,
      learningSteps: fsrsCard.learning_steps,
      reps: fsrsCard.reps,
      lapses: fsrsCard.lapses,
      state: this.stateToCardState(fsrsCard.state),
      lastReview: fsrsCard.last_review,
      updatedAt: new Date(),
    };
  }

  /**
   * Create a new card with FSRS initial state
   */
  createNewCard(cardData: Partial<FlashcardCard>): Partial<FlashcardCard> {
    const emptyCard = createEmptyCard();

    return {
      ...cardData,
      due: emptyCard.due,
      stability: emptyCard.stability,
      difficulty: emptyCard.difficulty,
      elapsedDays: emptyCard.elapsed_days,
      scheduledDays: emptyCard.scheduled_days,
      learningSteps: emptyCard.learning_steps,
      reps: emptyCard.reps,
      lapses: emptyCard.lapses,
      state: this.stateToCardState(emptyCard.state),
      lastReview: emptyCard.last_review,
    };
  }

  /**
   * Get all possible outcomes for a card review
   */
  getReviewOptions(
    card: FlashcardCard,
    reviewTime: Date = new Date(),
  ): RecordLog {
    const fsrsCard = this.dbCardToFSRSCard(card);
    return this.fsrs.repeat(fsrsCard, reviewTime);
  }

  /**
   * Process a card review and return updated card data
   */
  processReview(
    card: FlashcardCard,
    rating: Rating,
    reviewTime: Date = new Date(),
  ): { updatedCard: Partial<FlashcardCard>; reviewLog: any } {
    const fsrsCard = this.dbCardToFSRSCard(card);
    const result = this.fsrs.next(fsrsCard, reviewTime, rating as Grade);

    return {
      updatedCard: this.fsrsCardToDbCard(result.card, card),
      reviewLog: result.log,
    };
  }

  /**
   * Get cards that are due for review
   */
  getDueCards(cards: FlashcardCard[], limit?: number): FlashcardCard[] {
    const now = new Date();
    const dueCards = cards
      .filter((card) => card.due <= now)
      .sort((a, b) => a.due.getTime() - b.due.getTime());

    return limit ? dueCards.slice(0, limit) : dueCards;
  }

  /**
   * Get learning statistics for a deck
   */
  getDeckStats(cards: FlashcardCard[]) {
    const now = new Date();

    return {
      total: cards.length,
      new: cards.filter((card) => card.state === "NEW").length,
      learning: cards.filter(
        (card) => card.state === "LEARNING" || card.state === "RELEARNING",
      ).length,
      review: cards.filter((card) => card.state === "REVIEW").length,
      due: cards.filter((card) => card.due <= now).length,
      overdue: cards.filter((card) => card.due < now && card.state === "REVIEW")
        .length,
    };
  }
}

export const fsrsService = new FSRSService();

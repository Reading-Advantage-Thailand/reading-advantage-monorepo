/**
 * SRS Queue Primitives
 *
 * Provides `buildDailyQueue` for ordering SRS cards into a daily practice session.
 *
 * Queue ordering rules (per spec.md):
 * 1. Exclude cards for triaged objectives and cards with no policy.
 * 2. Due reviews are selected before new cards.
 * 3. Reviews are ordered by predicted retention ascending.
 * 4. Backlog mode suppresses new cards while due reviews exceed the daily cap.
 * 5. New cards are capped by both `newCardsPerDay` and remaining session capacity.
 *
 * All functions are pure — no side effects, no browser/convex imports.
 */

import type {
  ObjectivePracticePolicy,
  ObjectivePriority,
  SrsCardState,
  SrsSessionConfig,
} from "./contract.js";
import { interleaveReviewItems } from "./session-composition.js";

/**
 * A single item in the daily practice queue.
 */
export type QueueItem = {
  /** The SRS card to be reviewed. */
  card: SrsCardState;
  /** Priority of the objective this card belongs to. */
  objectivePriority: ObjectivePriority;
  /** Whether the card is past its due date. */
  isOverdue: boolean;
  /** Number of whole days the card is overdue (0 if not overdue). */
  daysOverdue: number;
  /** Queue role used to preserve remediation-before-progression ordering. */
  kind?: "remediation" | "review" | "new";
};

/** Optional v3.2 composition inputs for a daily queue. */
export type BuildDailyQueueOptions = {
  remediationItems?: QueueItem[];
  composeSession?: boolean;
};

const PRIORITY_ORDER: Record<ObjectivePriority, number> = {
  essential: 0,
  supporting: 1,
  extension: 2,
  triaged: 3,
};

const DAY_MS = 86_400_000;
const RETENTION_FACTOR = 19 / 81;
const RETENTION_DECAY = -0.5;

/**
 * Predict current retention from a reviewed card's stability and elapsed time.
 * @param card Reviewed SRS card to project.
 * @param now Evaluation timestamp as an ISO string.
 * @returns Predicted recall probability in the inclusive range zero to one.
 */
export function predictCardRetention(card: SrsCardState, now: string): number {
  if (card.stability <= 0 || !Number.isFinite(card.stability)) {
    return card.stability === Infinity ? 1 : 0;
  }

  const elapsedDays = card.lastReview
    ? Math.max(
        0,
        (new Date(now).getTime() - new Date(card.lastReview).getTime()) /
          DAY_MS,
      )
    : Math.max(0, card.elapsedDays);

  return Math.pow(
    1 + (RETENTION_FACTOR * elapsedDays) / card.stability,
    RETENTION_DECAY,
  );
}

/**
 * Determine if a card is overdue (past its due date and in review/relearning state).
 */
export function isOverdue(card: SrsCardState, now: string): boolean {
  if (card.state === "new" || card.state === "learning") {
    return false;
  }
  const dueMs = new Date(card.dueDate).getTime();
  const nowMs = new Date(now).getTime();
  return dueMs < nowMs;
}

/**
 * Calculate how many days overdue a card is.
 * Returns 0 for non-overdue cards.
 */
export function daysOverdue(card: SrsCardState, now: string): number {
  if (!isOverdue(card, now)) {
    return 0;
  }
  const dueMs = new Date(card.dueDate).getTime();
  const nowMs = new Date(now).getTime();
  const diffMs = nowMs - dueMs;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Build a daily practice queue from a list of cards.
 */
export function buildDailyQueue(
  cards: SrsCardState[],
  policies: Map<string, ObjectivePracticePolicy>,
  config: SrsSessionConfig,
  now: string,
  options: BuildDailyQueueOptions = {},
): QueueItem[] {
  const { newCardsPerDay, maxReviewsPerDay } = config;

  const nonTriaged = cards.filter((card) => {
    const policy = policies.get(card.objectiveId);
    return policy !== undefined && policy.priority !== "triaged";
  });

  const nowMs = new Date(now).getTime();
  const newCards = nonTriaged.filter((card) => card.state === "new");
  const dueReviewCards = nonTriaged.filter(
    (card) => card.state !== "new" && new Date(card.dueDate).getTime() <= nowMs,
  );

  const sortedReviews = dueReviewCards
    .map((card): QueueItem & { predictedRetention: number } => {
      const policy = policies.get(card.objectiveId);
      return {
        card,
        objectivePriority: policy!.priority,
        isOverdue: isOverdue(card, now),
        daysOverdue: daysOverdue(card, now),
        predictedRetention: predictCardRetention(card, now),
      };
    })
    .sort((a, b) => {
      if (a.predictedRetention !== b.predictedRetention) {
        return a.predictedRetention - b.predictedRetention;
      }
      const dueDifference =
        new Date(a.card.dueDate).getTime() - new Date(b.card.dueDate).getTime();
      if (dueDifference !== 0) return dueDifference;
      return a.card.cardId.localeCompare(b.card.cardId);
    })
    .map(({ predictedRetention: _predictedRetention, ...item }) => item);

  const remediationItems = (options.remediationItems ?? [])
    .slice(0, Math.max(0, maxReviewsPerDay))
    .map((item) => ({ ...item, kind: "remediation" as const }));
  const reviewCapacity = Math.max(
    0,
    maxReviewsPerDay - remediationItems.length,
  );
  const selectedReviews = sortedReviews
    .slice(0, reviewCapacity)
    .map((item) => ({
      ...item,
      kind: "review" as const,
    }));
  const backlogMode = dueReviewCards.length > maxReviewsPerDay;
  const remainingCapacity = Math.max(
    0,
    maxReviewsPerDay - remediationItems.length - selectedReviews.length,
  );
  const newCardAllowance = backlogMode
    ? 0
    : Math.min(newCardsPerDay, remainingCapacity);

  const sortedNew = [...newCards].sort((a, b) => {
    const policyA = policies.get(a.objectiveId);
    const policyB = policies.get(b.objectiveId);
    const priorityA = policyA ? PRIORITY_ORDER[policyA.priority] : 3;
    const priorityB = policyB ? PRIORITY_ORDER[policyB.priority] : 3;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.cardId.localeCompare(b.cardId);
  });

  const selectedNewCards = sortedNew.slice(0, newCardAllowance).map(
    (card): QueueItem => ({
      card,
      objectivePriority: policies.get(card.objectiveId)!.priority,
      isOverdue: false,
      daysOverdue: 0,
      kind: "new",
    }),
  );

  const selectedByCardId = new Map(
    selectedReviews.map((item) => [item.card.cardId, item] as const),
  );
  const composedReviews =
    options.composeSession !== false
      ? interleaveReviewItems(
          selectedReviews.map((item) => ({
            cardId: item.card.cardId,
            objectiveId: item.card.objectiveId,
            objectivePriority: item.objectivePriority as Exclude<
              ObjectivePriority,
              "triaged"
            >,
          })),
        ).map((item) => selectedByCardId.get(item.cardId)!)
      : selectedReviews;
  return [...remediationItems, ...composedReviews, ...selectedNewCards];
}

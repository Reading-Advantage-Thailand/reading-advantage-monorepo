/**
 * SRS FSRS Scheduler Wrapper
 *
 * Wraps the `ts-fsrs` library with a clean interface for card scheduling.
 * Operates on `SrsCardState` from the SRS product contract.
 *
 * ## FSRS Algorithm Background
 *
 * FSRS (Free Spaced Repetition Scheduler) is a modern spaced repetition
 * algorithm that models memory stability and retrievability to optimize
 * review scheduling.
 */

import {
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
} from "ts-fsrs";
import { z } from "zod";
import type {
  ObjectivePriority,
  SrsCardId,
  SrsCardState,
  SrsRating,
} from "./contract.js";
import { balanceDueDate, fuzzIntervalDays } from "./session-composition.js";

/** Normative request-retention defaults by objective priority. */
export const DEFAULT_REQUEST_RETENTION_BY_PRIORITY: Readonly<
  Record<Exclude<ObjectivePriority, "triaged">, number>
> = {
  essential: 0.95,
  supporting: 0.9,
  extension: 0.8,
};

/**
 * Scheduler configuration parameters.
 */
export type SchedulerConfig = {
  /**
   * Target retention probability (0 < r <= 1).
   * Default: 0.9 (90%)
   */
  requestRetention: number;

  /** Optional per-priority overrides for the normative retention targets. */
  requestRetentionByPriority?: Partial<Record<ObjectivePriority, number>>;

  /**
   * Maximum interval in days.
   * Default: 365 (one school year)
   */
  maximumInterval: number;

  /**
   * Enable short-term preview mode.
   * Default: false
   */
  enableShortTermPreview: boolean;
  /** Apply deterministic v3.2 interval fuzz after FSRS scheduling. */
  enableIntervalFuzz?: boolean;
  /** Projected UTC-day loads used to balance the fuzzed due date. */
  projectedLoadByDate?: Readonly<Record<string, number>>;
};

/**
 * Default scheduler configuration optimized for educational content.
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  requestRetention: 0.9,
  maximumInterval: 365,
  enableShortTermPreview: false,
  enableIntervalFuzz: true,
};

const requestRetentionSchema = z.number().finite().gt(0).max(1);

/**
 * Validate a scheduler retention target at the public boundary.
 * @param value Candidate retention probability.
 * @returns The validated probability.
 * @throws When the value is non-finite or outside `(0, 1]`.
 */
function validateRequestRetention(value: number): number {
  const parsed = requestRetentionSchema.safeParse(value);
  if (!parsed.success) {
    throw new RangeError("requestRetention must be finite and in (0, 1]");
  }
  return parsed.data;
}

/**
 * Resolve the retention target for an objective priority without mutating configuration.
 * @param priority Objective priority being scheduled.
 * @param config Optional scalar and per-priority scheduler overrides.
 * @returns The configured override or normative target for the priority.
 */
export function resolveRequestRetention(
  priority: ObjectivePriority,
  config: Partial<SchedulerConfig> = {},
): number {
  const explicit = config.requestRetentionByPriority?.[priority];
  if (explicit !== undefined) return validateRequestRetention(explicit);
  if (config.requestRetentionByPriority !== undefined && priority !== "triaged")
    return DEFAULT_REQUEST_RETENTION_BY_PRIORITY[priority];
  if (config.requestRetention !== undefined)
    return validateRequestRetention(config.requestRetention);
  if (priority !== "triaged")
    return DEFAULT_REQUEST_RETENTION_BY_PRIORITY[priority];
  return DEFAULT_SCHEDULER_CONFIG.requestRetention;
}

/**
 * Map our SrsRating enum to ts-fsrs Grade enum.
 */
export function mapSrsRatingToGrade(rating: SrsRating): Grade {
  switch (rating) {
    case "Again":
      return Rating.Again;
    case "Hard":
      return Rating.Hard;
    case "Good":
      return Rating.Good;
    case "Easy":
      return Rating.Easy;
  }
}

/**
 * Map ts-fsrs Grade enum back to our SrsRating.
 */
export function mapGradeToSrsRating(grade: Grade): SrsRating {
  switch (grade) {
    case Rating.Again:
      return "Again";
    case Rating.Hard:
      return "Hard";
    case Rating.Good:
      return "Good";
    case Rating.Easy:
      return "Easy";
    default:
      return "Again";
  }
}

/**
 * Convert ts-fsrs internal Card to our SrsCardState.
 */
function mapFsrsCardToSrsCardState(
  fsrsCard: Card,
  metadata: {
    cardId: SrsCardId;
    studentId: string;
    objectiveId: string;
    variantKey: string;
  },
  now: string,
): SrsCardState {
  return {
    cardId: metadata.cardId,
    studentId: metadata.studentId,
    objectiveId: metadata.objectiveId,
    variantKey: metadata.variantKey,
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    state: mapCardState(fsrsCard.state),
    dueDate: fsrsCard.due.toISOString(),
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    lastReview: fsrsCard.last_review?.toISOString() ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Map ts-fsrs state number to our card state string.
 */
function mapCardState(state: number): SrsCardState["state"] {
  switch (state) {
    case 0:
      return "new";
    case 1:
      return "learning";
    case 2:
      return "review";
    case 3:
      return "relearning";
    default:
      return "new";
  }
}

/**
 * Create a new SRS card initialized with FSRS defaults.
 */
export function createCard(params: {
  studentId: string;
  objectiveId: string;
  variantKey?: string;
  now?: string;
  config?: Partial<SchedulerConfig>;
}): SrsCardState {
  const now = params.now ?? new Date().toISOString();
  const cardId = generateCardId();
  const variantKey = params.variantKey ?? params.objectiveId;

  return {
    cardId,
    studentId: params.studentId,
    objectiveId: params.objectiveId,
    variantKey,
    stability: 0,
    difficulty: 0,
    state: "new",
    dueDate: now,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Convert our internal card state to ts-fsrs Card format.
 */
function toFsrsCard(card: SrsCardState): Card {
  return {
    due: new Date(card.dueDate),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: mapSrsStateToNumber(card.state),
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

/**
 * Apply a review rating to a card and return the updated state.
 * @param card Current SRS card state.
 * @param rating Recall rating produced by validated practice evidence.
 * @param now Optional deterministic review timestamp.
 * @param config Optional scheduler configuration overrides.
 * @param objectivePriority Optional objective priority used to resolve a targeted retention rate.
 * @returns The updated card state after applying the FSRS transition.
 */
export function reviewCard(
  card: SrsCardState,
  rating: SrsRating,
  now?: string,
  config?: Partial<SchedulerConfig>,
  objectivePriority?: ObjectivePriority,
): SrsCardState {
  const currentTime = now ?? new Date().toISOString();
  const fullConfig = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
  const requestRetention = objectivePriority
    ? resolveRequestRetention(objectivePriority, config ?? {})
    : fullConfig.requestRetention;

  const params = generatorParameters({
    request_retention: requestRetention,
    maximum_interval: fullConfig.maximumInterval,
    enable_short_term: fullConfig.enableShortTermPreview,
  });

  const scheduler = fsrs(params);
  const fsrsCard = toFsrsCard(card);
  const grade = mapSrsRatingToGrade(rating);
  const result = scheduler.next(fsrsCard, currentTime, grade);

  const updated = mapFsrsCardToSrsCardState(
    result.card,
    {
      cardId: card.cardId,
      studentId: card.studentId,
      objectiveId: card.objectiveId,
      variantKey: card.variantKey,
    },
    currentTime,
  );
  if (!fullConfig.enableIntervalFuzz || updated.scheduledDays <= 0)
    return updated;

  const fuzzedDays = fuzzIntervalDays({
    cardId: updated.cardId,
    reps: updated.reps,
    intervalDays: updated.scheduledDays,
  });
  const currentMs = new Date(currentTime).getTime();
  const fuzzedDueDate = new Date(
    currentMs + fuzzedDays * 86_400_000,
  ).toISOString();
  const dueDate =
    Object.keys(fullConfig.projectedLoadByDate ?? {}).length === 0
      ? fuzzedDueDate
      : balanceDueDate({
          baseDueDate: fuzzedDueDate,
          minimumDueDate: new Date(
            currentMs + updated.scheduledDays * 0.95 * 86_400_000,
          ).toISOString(),
          maximumDueDate: new Date(
            currentMs + updated.scheduledDays * 1.05 * 86_400_000,
          ).toISOString(),
          maximumIntervalDays: fullConfig.maximumInterval,
          projectedLoadByDate: fullConfig.projectedLoadByDate ?? {},
        });
  return {
    ...updated,
    dueDate,
    scheduledDays: (new Date(dueDate).getTime() - currentMs) / 86_400_000,
  };
}

/**
 * Filter cards to return only those with dueDate <= now.
 */
export function getDueCards(
  cards: SrsCardState[],
  now?: string,
): SrsCardState[] {
  const currentTime = now ?? new Date().toISOString();
  const nowMs = new Date(currentTime).getTime();

  return cards.filter((card) => {
    const dueMs = new Date(card.dueDate).getTime();
    return dueMs <= nowMs;
  });
}

/**
 * Preview the scheduled interval for a card without mutating its state.
 */
export function previewInterval(
  card: SrsCardState,
  rating: SrsRating,
  now?: string,
): number {
  const currentTime = now ?? new Date().toISOString();
  const params = generatorParameters({
    request_retention: DEFAULT_SCHEDULER_CONFIG.requestRetention,
    maximum_interval: DEFAULT_SCHEDULER_CONFIG.maximumInterval,
    enable_short_term: DEFAULT_SCHEDULER_CONFIG.enableShortTermPreview,
  });

  const scheduler = fsrs(params);
  const fsrsCard = toFsrsCard(card);
  const grade = mapSrsRatingToGrade(rating);
  const result = scheduler.next(fsrsCard, currentTime, grade);

  return result.card.scheduled_days;
}

/**
 * Map our state string to ts-fsrs state number.
 */
function mapSrsStateToNumber(state: SrsCardState["state"]): number {
  switch (state) {
    case "new":
      return 0;
    case "learning":
      return 1;
    case "review":
      return 2;
    case "relearning":
      return 3;
  }
}

/**
 * Generate a unique card ID using crypto-safe random bytes.
 */
function generateCardId(): SrsCardId {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `card_${hex}`;
}

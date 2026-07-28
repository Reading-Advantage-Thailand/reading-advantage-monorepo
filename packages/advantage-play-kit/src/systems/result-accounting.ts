/**
 * `capability:result-accounting` shared core.
 *
 * Shared result infrastructure owns typed counters, finite arithmetic, rounding
 * declarations, and optional caps. A pure calculator accepts normalized
 * performance counters plus an explicit game policy and returns XP. Games own
 * formula weights, bonus policies, performance dimensions, and zero-attempt
 * treatment.
 *
 * Source evidence: abyssal-well, alchemists-synthesis, enchanted-library,
 * magic-defense. The XP formula synthesizes the accuracy-based XP evidence
 * (alchemists-synthesis) and performance-derived XP evidence (abyssal-well,
 * magic-defense) behind an explicit game policy so games retain weight control.
 */

/** Explicit game-owned policy that weights normalized counters into display XP. */
export interface ResultAccountingPolicy {
  /** XP awarded per correct answer. */
  readonly xpPerCorrect: number;
  /** XP awarded per accuracy point (accuracy is 0..1). */
  readonly xpPerAccuracyPoint: number;
  /** Optional ceiling on the final XP value. */
  readonly xpCap?: number;
  /** XP returned when zero attempts were recorded. */
  readonly zeroAttemptsXp?: number;
}

/** Normalized performance counters consumed by the XP calculator. */
export interface ResultCounters {
  /** Number of correct answers. */
  readonly correctAnswers: number;
  /** Number of total attempts. */
  readonly totalAttempts: number;
  /** Accuracy from 0 through 1. */
  readonly accuracy: number;
}

/** Finalized, frozen result emitted by the shared accounting infrastructure. */
export interface AccountedResult extends ResultCounters {
  /** Display XP after policy weighting, rounding, and optional cap. */
  readonly xp: number;
  /** Game-supplied score counter, accumulated through the accountant. */
  readonly score: number;
}

/** XP returned when zero attempts were recorded and the policy omits a value. */
export const RESULT_ACCOUNTING_ZERO_ATTEMPTS_XP = 0;

/** Mutable typed counters owned by the shared accountant. */
export interface ResultAccountant extends ResultCounters {
  /** Game-supplied score counter. */
  readonly score: number;
  /**
   * Records one attempt as correct or incorrect.
   * @param attempt Whether the attempt was correct.
   */
  recordAttempt(attempt: { readonly correct: boolean }): void;
  /** Adds to the game-supplied score counter. */
  addScore(points: number): void;
  /** Returns the current accuracy as correct over total. */
  computeAccuracy(): number;
  /** Returns an immutable snapshot of the current counters. */
  snapshot(): ResultCounters & { readonly score: number };
}

/**
 * Creates a typed result accountant with zero-initialized counters.
 * @returns A mutable accountant that records attempts and score.
 */
export function createResultAccountant(): ResultAccountant {
  let correctAnswers = 0;
  let totalAttempts = 0;
  let score = 0;

  const computeAccuracy = (): number => (totalAttempts === 0 ? 0 : correctAnswers / totalAttempts);

  return Object.freeze({
    get correctAnswers() {
      return correctAnswers;
    },
    get totalAttempts() {
      return totalAttempts;
    },
    get accuracy() {
      return computeAccuracy();
    },
    get score() {
      return score;
    },
    recordAttempt({ correct }: { readonly correct: boolean }): void {
      totalAttempts += 1;
      if (correct) correctAnswers += 1;
    },
    addScore(points: number): void {
      score += points;
    },
    computeAccuracy,
    snapshot() {
      return Object.freeze({
        correctAnswers,
        totalAttempts,
        accuracy: computeAccuracy(),
        score,
      });
    },
  });
}

/**
 * Accumulates one attempt into the accountant.
 * @param accountant The accountant to mutate.
 * @param attempt Whether the attempt was correct.
 */
export function accumulateResult(
  accountant: ResultAccountant,
  attempt: { readonly correct: boolean },
): void {
  accountant.recordAttempt(attempt);
}

/**
 * Calculates display XP from normalized counters plus an explicit game policy.
 * @param counters Normalized performance counters.
 * @param policy Game-owned policy that weights counters into XP.
 * @returns A nonnegative integer XP value after rounding and optional cap.
 */
export function calculateXp(counters: ResultCounters, policy: ResultAccountingPolicy): number {
  if (counters.totalAttempts === 0) {
    return policy.zeroAttemptsXp ?? RESULT_ACCOUNTING_ZERO_ATTEMPTS_XP;
  }
  const raw = counters.correctAnswers * policy.xpPerCorrect
    + counters.accuracy * policy.xpPerAccuracyPoint;
  const floored = Math.max(0, Math.floor(raw));
  if (policy.xpCap === undefined) return floored;
  return Math.min(floored, Math.max(0, Math.floor(policy.xpCap)));
}

/**
 * Finalizes the accountant into a frozen result with XP from the game policy.
 * @param accountant The accountant whose counters should be finalized.
 * @param policy Game-owned XP policy.
 * @returns A frozen, immutable accounted result.
 */
export function finalizeResult(
  accountant: ResultAccountant,
  policy: ResultAccountingPolicy,
): AccountedResult {
  const snapshot = accountant.snapshot();
  const xp = calculateXp(snapshot, policy);
  return Object.freeze({
    correctAnswers: snapshot.correctAnswers,
    totalAttempts: snapshot.totalAttempts,
    accuracy: snapshot.accuracy,
    score: snapshot.score,
    xp,
  });
}

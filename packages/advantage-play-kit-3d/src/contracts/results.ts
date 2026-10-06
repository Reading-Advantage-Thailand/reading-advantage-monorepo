/**
 * Results mapping (section 6 of docs/apk3d-cartridge.md): the five-field APK `GameResults` from
 * a run's evidence, the outcome rule, and the stars rule for the host's results screen.
 */
import type { GameResults, GameTerminalOutcome } from './apk.js';
import type { StoryGameEvidence, StoryGameEvidenceItem } from './evidence.js';

// ---------------------------------------------------------------- XP (the apps' rule)

/**
 * Exact copy of the apps' XP rule. Speed never changes it; `score` is unused by design.
 * Source: ../reading-advantage-monorepo/apps/reading-advantage/lib/games/xp.ts (fe6aedc2b);
 * the same function is advantage-games/src/lib/xp.ts.
 */
// prettier-ignore
export function calculateXP(
  score: number,
  correctAnswers: number,
  totalAttempts: number
): number {
  if (totalAttempts === 0) return 0;

  const accuracy = correctAnswers / totalAttempts;

  // Formula: correctAnswers * accuracy
  // Example: 8 correct * 0.8 accuracy = 6.4 → 6 XP
  return Math.floor(correctAnswers * accuracy);
}

// ---------------------------------------------------------------- GameResults (section 6.1)

/** `correctAnswers / totalAttempts`, 0 when there are no attempts. */
export function accuracyOf(correctAnswers: number, totalAttempts: number): number {
  return totalAttempts === 0 ? 0 : correctAnswers / totalAttempts;
}

/**
 * The response counts of a run from its evidence: a solved item holds exactly one correct
 * response (its last), and `attempts` counts every response to the item.
 */
export function countResponses(items: readonly StoryGameEvidenceItem[]): {
  correctAnswers: number;
  totalAttempts: number;
} {
  let correctAnswers = 0;
  let totalAttempts = 0;
  for (const item of items) {
    if (item.solved) correctAnswers += 1;
    totalAttempts += item.attempts;
  }
  return { correctAnswers, totalAttempts };
}

/**
 * The APK five-field result for a run. `score` is the game's own points (integer, shown in the
 * HUD during play; speed may add to it); `xp` is the apps' rule and never depends on `score`.
 */
export function toGameResults(evidence: Pick<StoryGameEvidence, 'items'>, score: number): GameResults {
  const { correctAnswers, totalAttempts } = countResponses(evidence.items);
  return {
    accuracy: accuracyOf(correctAnswers, totalAttempts),
    xp: calculateXP(score, correctAnswers, totalAttempts),
    score: Math.max(0, Math.floor(score)),
    correctAnswers,
    totalAttempts,
  };
}

// ---------------------------------------------------------------- outcome (section 6.2)

/** The outcomes a story game may send: `defeat` never, the guardrail forbids a game over. */
export type StoryGameOutcome = Exclude<GameTerminalOutcome, 'defeat'>;

/** `victory` when the game's win condition was met; `complete` when the run ended another way. */
export function toOutcome(won: boolean): StoryGameOutcome {
  return won ? 'victory' : 'complete';
}

// ---------------------------------------------------------------- stars (the host's rule)

export type Stars = 1 | 2 | 3;

/** Share of items correct on the first try, 0 with no items. */
export function firstTryAccuracy(items: readonly StoryGameEvidenceItem[]): number {
  if (items.length === 0) return 0;
  return items.filter((item) => item.correctFirstTry).length / items.length;
}

/** Stars for a first-try accuracy: 3 at 90% and above, 2 at 70% and above, else 1. */
export function starsFor(accuracy: number): Stars {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

/** Stars for a run, from its items' first-try accuracy. */
export function starsOf(evidence: Pick<StoryGameEvidence, 'items'>): Stars {
  return starsFor(firstTryAccuracy(evidence.items));
}

// ---------------------------------------------------------------- class boss (section 6.3)

/** Damage the class boss takes per correct answer. */
export const CLASS_BOSS_DAMAGE_PER_CORRECT = 2;

export function classBossDamage(results: Pick<GameResults, 'correctAnswers'>): number {
  return results.correctAnswers * CLASS_BOSS_DAMAGE_PER_CORRECT;
}

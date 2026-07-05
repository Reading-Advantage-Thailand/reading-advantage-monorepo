import type { GameCompletionInput } from "./contracts.js";

/**
 * Server-side XP calculation for Advantage Games.
 *
 * The `GameCompletionInputSchema` has no `xp` field (Decision 3.2; `.strict()`
 * rejects client-supplied `xp` as an unknown key — primary D-02 defense).
 * This pure function is the source of truth for awarded XP.
 *
 * Formula (Decision 3.3):
 *   base = correctAnswers
 *   bonus = (accuracy === 1 ? 2 : 0)        // perfect-accuracy bonus
 *         + (victory ? 1 : 0)                 // victory bonus
 *         + (duration < 60_000 ? 1 : 0);      // speed bonus
 *   xpEarned = Math.min(10, base + bonus)
 *
 * Returns 0 for `totalAttempts === 0` (defensive: no attempts = no work = no XP).
 * The cap at 10 mirrors the haunted-library client formula and the multiplayer
 * XP cap from the Wave 0 audit (B42-005/-026/-065).
 *
 * @param input - Validated game-completion input (no `xp` field).
 * @returns Non-negative integer XP earned, capped at 10.
 */
export function calculateGameXP(input: GameCompletionInput): number {
  if (input.totalAttempts === 0) return 0;

  const accuracy = input.correctAnswers / input.totalAttempts;
  const base = input.correctAnswers;
  let bonus = 0;

  if (accuracy === 1) bonus += 2;
  if (input.victory) bonus += 1;
  if (input.duration < 60_000) bonus += 1;

  return Math.min(10, base + bonus);
}
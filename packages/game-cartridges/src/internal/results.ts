import { gameResultsSchema, type GameResults } from "@reading-advantage/game-contracts";

/** Constructs and validates the frozen cartridge result shape.
 * @param score Final client-display score.
 * @param correctAnswers Number of successful learning attempts.
 * @param totalAttempts Number of all learning attempts.
 * @returns A validated result compatible with existing mini-game callers.
 */
export function createGameResults(
  score: number,
  correctAnswers: number,
  totalAttempts: number,
): GameResults {
  return gameResultsSchema.parse({
    accuracy: totalAttempts === 0 ? 0 : correctAnswers / totalAttempts,
    xp: Math.max(0, Math.floor(score / 10)),
    score: Math.max(0, score),
    correctAnswers,
    totalAttempts,
  });
}

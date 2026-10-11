import {
  mapGameResultsToCompletionInput,
  type GameCompletionInput,
  type GameResults,
  type StoryGameEvidence,
} from "@reading-advantage/game-contracts";

/** The completion `gameType` of a story game: kept apart from the 2D catalog game of the same name. */
export const storyGameType = (gameId: string): string => `${gameId}-story`;

/**
 * Maps a finished story game to the authoritative completion input of `/api/v1/apk/complete`.
 * The server computes XP from the counts; the story evidence rides in `metadata.learningEvidence`.
 * @param gameId The story game's cartridge id.
 * @param result The five-field game result.
 * @param evidence The per-item story evidence.
 * @param run The run's timing and settings.
 * @returns The validated completion input.
 */
export function storyCompletionInput(
  gameId: string,
  result: GameResults,
  evidence: StoryGameEvidence,
  run: { startedAt: number; now: number; helper: boolean; victory: boolean; idempotencyKey: string; articleId?: string },
): GameCompletionInput {
  return mapGameResultsToCompletionInput(result, {
    gameType: storyGameType(gameId),
    difficulty: run.helper ? "easy" : "medium",
    duration: Math.max(0, Math.round((run.now - run.startedAt) / 1000)),
    victory: run.victory,
    idempotencyKey: run.idempotencyKey,
    clientTimestamp: run.now,
    // The article lets the evidence job map word items to the article's glossary nodes.
    metadata: { learningEvidence: evidence, ...(run.articleId ? { articleId: run.articleId } : {}) },
  });
}

import { z } from "zod";

import { gameResultsSchema, type GameResults } from "./educational-io.js";

/** Canonical difficulty values accepted by authoritative game completion. */
export const gameDifficultySchema = z.enum([
  "easy",
  "medium",
  "hard",
  "extreme",
]);

/** Strict host-owned context required to map a cartridge result for persistence. */
export const hostCompletionContextSchema = z
  .object({
    gameType: z.string().min(1),
    difficulty: gameDifficultySchema,
    duration: z.number().int().min(0),
    victory: z.boolean(),
    idempotencyKey: z.string().uuid(),
    clientTimestamp: z.number().int(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/** Strict transport input compatible with the server-authoritative games domain. */
export const gameCompletionInputSchema = z
  .object({
    gameType: z.string().min(1),
    difficulty: gameDifficultySchema,
    score: z.number().int().min(0),
    accuracy: z.number().min(0).max(1),
    correctAnswers: z.number().int().min(0),
    totalAttempts: z.number().int().min(0),
    duration: z.number().int().min(0),
    victory: z.boolean(),
    idempotencyKey: z.string().uuid(),
    clientTimestamp: z.number().int(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/** Host-owned context used to map display results into server completion input. */
export type HostCompletionContext = z.infer<typeof hostCompletionContextSchema>;

/** Browser-safe completion transport shape accepted by the games domain. */
export type GameCompletionInput = z.infer<typeof gameCompletionInputSchema>;

/**
 * Maps a cartridge result and host-owned context to authoritative completion input.
 * @param results Untrusted five-field cartridge result containing display XP.
 * @param context Host-owned game, timing, victory, and idempotency context.
 * @returns A validated completion input that deliberately excludes display XP.
 * @throws When either boundary value violates its strict schema.
 */
export function mapGameResultsToCompletionInput(
  results: GameResults | unknown,
  context: HostCompletionContext | unknown,
): GameCompletionInput {
  const parsedResults = gameResultsSchema.parse(results);
  const parsedContext = hostCompletionContextSchema.parse(context);

  return gameCompletionInputSchema.parse({
    gameType: parsedContext.gameType,
    difficulty: parsedContext.difficulty,
    score: parsedResults.score,
    accuracy: parsedResults.accuracy,
    correctAnswers: parsedResults.correctAnswers,
    totalAttempts: parsedResults.totalAttempts,
    duration: parsedContext.duration,
    victory: parsedContext.victory,
    idempotencyKey: parsedContext.idempotencyKey,
    clientTimestamp: parsedContext.clientTimestamp,
    ...(parsedContext.metadata === undefined
      ? {}
      : { metadata: parsedContext.metadata }),
  });
}

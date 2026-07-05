import type { z } from "zod";
import type {
  gameCompletionInputSchema,
  gameCompletionResultSchema,
} from "./schema.js";

/**
 * Inferred TypeScript types for the game-completion contract.
 * Derived from the Zod schemas in `./schema.ts` so the type and runtime
 * validation cannot drift.
 */
export type GameCompletionInput = z.infer<typeof gameCompletionInputSchema>;
export type GameCompletionResult = z.infer<typeof gameCompletionResultSchema>;
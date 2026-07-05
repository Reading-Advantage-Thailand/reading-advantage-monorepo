/**
 * Barrel for the games domain module.
 *
 * Phase 3 ships the shared `GameCompletionInputSchema` / `ResultSchema`,
 * server-side `calculateGameXP`, and `recordGameCompletion` / `getGameCompletions`
 * domain functions. Host apps (Reading/Primary) call `recordGameCompletion`
 * directly with a real `TenantDB`. The standalone `apps/advantage-games` route
 * handler validates via `gameCompletionInputSchema` and delegates the XP
 * preview to `calculateGameXP` without persisting (Decision 3.7).
 */

// Schemas + enums
export {
  gameCompletionInputSchema,
  gameCompletionResultSchema,
  gameTypeEnum,
  gameDifficultyEnum,
} from "./schema.js";

// Inferred types
export type { GameCompletionInput, GameCompletionResult } from "./contracts.js";

// Pure XP formula
export { calculateGameXP } from "./xp.js";

// Domain functions
export { recordGameCompletion } from "./mutations.js";
export { getGameCompletions, type GameCompletion } from "./queries.js";

// Permissions
export { GAMES_PERMISSIONS } from "./permissions.js";

// Errors
export {
  GameCompletionError,
  DuplicateCompletionError,
  InvalidGameCompletionError,
} from "./errors.js";
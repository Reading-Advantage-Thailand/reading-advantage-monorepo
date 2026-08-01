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
  leaderboardEntrySchema,
  leaderboardResponseSchema,
} from "./schema.js";

// Inferred types
export type {
  GameCompletionHistoryQuery,
  GameCompletionInput,
  GameCompletionResult,
} from "./contracts.js";

// Pure XP formula
export { calculateGameXP } from "./xp.js";

// Domain functions
export { recordGameCompletion } from "./mutations.js";
export {
  getGameCompletions,
  getSchoolLeaderboard,
  type GameCompletion,
  type LeaderboardEntry,
} from "./queries.js";

// Permissions
export { GAMES_PERMISSIONS } from "./permissions.js";

// Errors
export {
  GameCompletionError,
  DuplicateCompletionError,
  InvalidGameCompletionError,
} from "./errors.js";

// Host-proof adapter (Task 5 — Reading/Primary existing-core host proof)
export {
  HOST_PROOF_ERROR_CODES,
  HostProofCompletionError,
  getHostProofGameCompletions,
  hostProofCompletionRequestSchema,
  hostProofCompletionResponseSchema,
  hostProofErrorHttpStatus,
  hostProofHistoryEntrySchema,
  hostProofHistoryInputSchema,
  listHostProofCartridgeBindings,
  recordHostProofGameCompletion,
} from "./host-proof.js";
export {
  attestDragonFlightHostProofAction,
  attestDragonFlightHostProofActionSchema,
  completeDragonFlightHostProofAttempt,
  completeDragonFlightHostProofAttemptSchema,
  DRAGON_FLIGHT_HOST_PROOF_ATTEMPT_TTL_MS,
  DRAGON_FLIGHT_HOST_PROOF_GATE_TO_LAUNCH_DWELL_MS,
  issueDragonFlightHostProofAttempt,
  issueDragonFlightHostProofAttemptSchema,
} from "./host-proof.js";
export {
  createDragonFlightHostProofAttemptDependencies,
  createDragonFlightHostProofAttemptStore,
} from "./host-proof.js";
export type {
  HostProofCompletionRequest,
  HostProofCompletionResponse,
  HostProofErrorCode,
  HostProofHistoryEntry,
  HostProofHistoryInput,
} from "./host-proof.js";
export type {
  DragonFlightHostProofActionAttestation,
  DragonFlightHostProofAttempt,
  DragonFlightHostProofAttemptDependencies,
  DragonFlightHostProofAttemptStore,
  DragonFlightHostProofCompletion,
  HostProofAttemptActor,
} from "./host-proof.js";

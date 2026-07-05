/**
 * Error types for the game-completion domain.
 *
 * Phase 3 uses these errors sparingly — most validation failures surface as
 * Zod parse errors thrown by `gameCompletionInputSchema.parse(...)`. The
 * dedicated error classes exist for cases where the domain function needs to
 * distinguish a duplicate completion (`DuplicateCompletionError`) from a
 * malformed payload (`InvalidGameCompletionError`) at the call site (e.g. for
 * observability or retry logic in a host app).
 */

export class GameCompletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameCompletionError";
  }
}

/**
 * Thrown when a completion with the same `idempotencyKey` is already recorded
 * for the user. The default `recordGameCompletion` returns `{ duplicate: true,
 * xpEarned: 0 }` instead of throwing — this class is exposed for host code
 * that prefers a thrown error on duplicates.
 */
export class DuplicateCompletionError extends GameCompletionError {
  constructor(public readonly activityId: string) {
    super(`Game completion already recorded: ${activityId}`);
    this.name = "DuplicateCompletionError";
  }
}

/**
 * Thrown when the input fails `gameCompletionInputSchema.parse(...)`. The
 * `issues` field carries the raw Zod issues so callers can render structured
 * validation errors.
 */
export class InvalidGameCompletionError extends GameCompletionError {
  constructor(
    message: string,
    public readonly issues?: unknown,
  ) {
    super(message);
    this.name = "InvalidGameCompletionError";
  }
}
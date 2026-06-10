/**
 * Base error for all gamification domain errors.
 */
export class GamificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GamificationError";
  }
}

/**
 * Thrown when a user attempts an XP operation that would result in negative XP.
 */
export class InsufficientXpError extends GamificationError {
  constructor(message = "Insufficient XP for this operation") {
    super(message);
    this.name = "InsufficientXpError";
  }
}

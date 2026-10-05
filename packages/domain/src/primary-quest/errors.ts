/** The error codes of the Class Quest use-cases (track primary_class_quest_20261005). */
export type QuestErrorCode =
  | "TEMPLATE_NOT_FOUND"
  | "ALREADY_OPEN"
  | "NO_CONTENT"
  | "BAD_TIME"
  | "GAME_UNAVAILABLE"
  | "NOT_FOUND"
  | "BAD_STATE"
  | "NOT_IN_CLASS";

/** A quest refusal with the HTTP status a route answers. */
export class QuestError extends Error {
  constructor(
    public readonly code: QuestErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "QuestError";
  }
}

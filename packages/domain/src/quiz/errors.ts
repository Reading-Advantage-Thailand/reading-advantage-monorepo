export class QuizError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizError";
  }
}

export class AttemptNotFoundError extends QuizError {
  constructor(id: string) {
    super(`Attempt not found: ${id}`);
    this.name = "AttemptNotFoundError";
  }
}

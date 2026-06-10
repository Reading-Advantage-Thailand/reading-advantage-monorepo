export class StoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryError";
  }
}

export class StoryNotFoundError extends StoryError {
  constructor(id: string) {
    super(`Story not found: ${id}`);
    this.name = "StoryNotFoundError";
  }
}

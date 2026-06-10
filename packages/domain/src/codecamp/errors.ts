export class CodecampError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodecampError";
  }
}

export class ModuleNotFoundError extends CodecampError {
  constructor(slug: string) {
    super(`Module not found: ${slug}`);
    this.name = "ModuleNotFoundError";
  }
}

export class LessonNotFoundError extends CodecampError {
  constructor(id: string) {
    super(`Lesson not found: ${id}`);
    this.name = "LessonNotFoundError";
  }
}

export class ExerciseNotFoundError extends CodecampError {
  constructor(id: string) {
    super(`Exercise not found: ${id}`);
    this.name = "ExerciseNotFoundError";
  }
}

export class ConversationNotFoundError extends CodecampError {
  constructor() {
    super("Conversation not found");
    this.name = "ConversationNotFoundError";
  }
}

export class InternNotFoundError extends CodecampError {
  constructor(id: string) {
    super(`Intern not found: ${id}`);
    this.name = "InternNotFoundError";
  }
}

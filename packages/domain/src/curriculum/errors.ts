export class CurriculumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurriculumError";
  }
}

export class LessonNotFoundError extends CurriculumError {
  constructor(id: string) {
    super(`Lesson not found: ${id}`);
    this.name = "LessonNotFoundError";
  }
}

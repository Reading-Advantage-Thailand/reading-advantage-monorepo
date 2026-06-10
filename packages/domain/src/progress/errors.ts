export class ProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgressError";
  }
}

export class StudentNotFoundError extends ProgressError {
  constructor(studentId: string) {
    super(`Student not found in your school: ${studentId}`);
    this.name = "StudentNotFoundError";
  }
}

export class ReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportError";
  }
}

export class ClassNotFoundError extends ReportError {
  constructor(classId: string) {
    super(`Class not found: ${classId}`);
    this.name = "ClassNotFoundError";
  }
}

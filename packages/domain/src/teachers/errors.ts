/**
 * Error thrown when a teacher record cannot be found.
 */
export class TeacherNotFoundError extends Error {
  constructor(teacherId: string) {
    super(`Teacher not found: ${teacherId}`);
    this.name = "TeacherNotFoundError";
  }
}

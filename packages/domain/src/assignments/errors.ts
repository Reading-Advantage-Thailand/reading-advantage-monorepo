/**
 * Base error for all assignment domain errors.
 */
export class AssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssignmentError";
  }
}

/**
 * Thrown when an assignment is not found.
 */
export class AssignmentNotFoundError extends AssignmentError {
  constructor(id: string) {
    super(`Assignment not found: ${id}`);
    this.name = "AssignmentNotFoundError";
  }
}

/**
 * Thrown when a student is not assigned to an assignment.
 */
export class StudentNotAssignedError extends AssignmentError {
  constructor() {
    super("Student not assigned to this assignment");
    this.name = "StudentNotAssignedError";
  }
}

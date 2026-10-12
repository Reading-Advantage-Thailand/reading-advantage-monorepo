/**
 * Error thrown when a teacher record cannot be found.
 */
export class TeacherNotFoundError extends Error {
  constructor(teacherId: string) {
    super(`Teacher not found: ${teacherId}`);
    this.name = "TeacherNotFoundError";
  }
}

/** The refusal codes of `moveTeacherToSchool` and their HTTP status. */
export const MOVE_TEACHER_SCHOOL_STATUS = {
  TEACHER_NOT_FOUND: 404,
  NOT_A_TEACHER: 400,
  SCHOOL_NOT_FOUND: 404,
  CROSS_SCHOOL_CLASSROOM: 400,
  OWNS_CLASSES: 409,
} as const;

/** A refusal of `moveTeacherToSchool`. No row changed when it is thrown. */
export class MoveTeacherSchoolError extends Error {
  readonly status: number;

  /**
   * @param code The refusal code.
   * @param message A short message.
   * @param classNames The names of the owned classes (code `OWNS_CLASSES` only).
   */
  constructor(
    readonly code: keyof typeof MOVE_TEACHER_SCHOOL_STATUS,
    message: string,
    readonly classNames: string[] = [],
  ) {
    super(message);
    this.name = "MoveTeacherSchoolError";
    this.status = MOVE_TEACHER_SCHOOL_STATUS[code];
  }
}

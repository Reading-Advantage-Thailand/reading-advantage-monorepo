/** Reason codes of a student-login failure. Route handlers map them to HTTP status codes. */
export type StudentLoginErrorCode =
  | "invalid_code"
  | "invalid_credentials"
  | "locked"
  | "rate_limited"
  | "forbidden"
  | "not_found"
  | "unavailable";

/**
 * Error thrown by the student-login use-cases. The message never names a student or a class.
 */
export class StudentLoginError extends Error {
  /**
   * Builds a student-login error.
   * @param code Reason code used by the caller to choose an HTTP status.
   * @param message Short text without personal data.
   * @param retryAfterSeconds Seconds until a retry can work, set for `locked` and `rate_limited`.
   */
  constructor(
    readonly code: StudentLoginErrorCode,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "StudentLoginError";
  }
}

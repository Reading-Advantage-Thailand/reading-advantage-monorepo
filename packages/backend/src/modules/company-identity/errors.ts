/** Stable identity error codes that may cross transport boundaries. */
export type CompanyIdentityErrorCode =
  | "AUTHENTICATION_FAILED"
  | "AUTHORIZATION_CODE_INVALID"
  | "CLIENT_INVALID"
  | "EMPLOYEE_NOT_FOUND"
  | "FORBIDDEN"
  | "LAST_COMPANY_ADMIN_REQUIRED"
  | "RATE_LIMITED"
  | "SESSION_INVALID"
  | "USERNAME_CONFLICT";

/** Boundary-safe error emitted by company identity capabilities. */
export class CompanyIdentityError extends Error {
  /** Stable machine-readable error category. */
  readonly code: CompanyIdentityErrorCode;

  /**
   * Creates a boundary-safe identity error without internal details.
   * @param code Stable machine-readable category.
   * @param message Public-safe message.
   */
  constructor(code: CompanyIdentityErrorCode, message: string) {
    super(message);
    this.name = "CompanyIdentityError";
    this.code = code;
  }
}

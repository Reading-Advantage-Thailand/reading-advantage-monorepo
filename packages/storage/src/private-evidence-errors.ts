/** Stable error codes emitted by the authorized private evidence reader. */
export type PrivateEvidenceReadErrorCode =
  | "PRIVATE_EVIDENCE_REFERENCE_INVALID"
  | "PRIVATE_EVIDENCE_REQUEST_INVALID"
  | "PRIVATE_EVIDENCE_DEPENDENCY_INVALID"
  | "PRIVATE_EVIDENCE_SCOPE_MISMATCH"
  | "PRIVATE_EVIDENCE_AUTHORIZATION_DENIED"
  | "PRIVATE_EVIDENCE_MAX_BYTES_INVALID"
  | "PRIVATE_EVIDENCE_MAX_BYTES_EXCEEDS_OWNER_CEILING"
  | "PRIVATE_EVIDENCE_CONTENT_TOO_LARGE"
  | "PRIVATE_EVIDENCE_DRIVER_RESULT_INVALID"
  | "PRIVATE_EVIDENCE_DRIVER_ERROR"
  | "PRIVATE_EVIDENCE_DIGEST_INVALID"
  | "PRIVATE_EVIDENCE_DIGEST_MISMATCH"
  | "PRIVATE_EVIDENCE_OWNER_CEILING_REQUIRED"
  | "PRIVATE_EVIDENCE_OWNER_CEILING_INVALID"
  | "PRIVATE_EVIDENCE_AUTHORIZATION_ERROR"
  | "PRIVATE_EVIDENCE_DIGEST_ERROR"
  | "PRIVATE_EVIDENCE_CONTENT_TYPE_INVALID";

/** Error raised when an authorized private evidence read fails closed. */
export class PrivateEvidenceReadError extends Error {
  /** Stable machine-readable reason for the failed read. */
  readonly code: PrivateEvidenceReadErrorCode;

  /**
   * Creates a provider-neutral private evidence boundary error.
   * @param code Stable machine-readable reason for the failure.
   */
  constructor(code: PrivateEvidenceReadErrorCode) {
    super(code);
    this.name = "PrivateEvidenceReadError";
    this.code = code;
  }
}

/** Stable error codes emitted by the successor-admission command boundary. */
export type StandardPackSuccessorAdmissionErrorCode =
  | "SUCCESSOR_ADMISSION_UNAUTHORIZED"
  | "SUCCESSOR_ADMISSION_EVIDENCE_INVALID"
  | "SUCCESSOR_ADMISSION_GIT_CANDIDATE_INVALID"
  | "SUCCESSOR_ADMISSION_IDEMPOTENCY_CONFLICT"
  | "SUCCESSOR_ADMISSION_REGISTRY_CONFLICT"
  | "SUCCESSOR_ADMISSION_RECEIPT_FAILURE"
  | "SUCCESSOR_ADMISSION_UNAVAILABLE";

/** Boundary-safe error emitted by the transport-independent successor-admission command. */
export class StandardPackSuccessorAdmissionError extends Error {
  /** Stable machine-readable error category. */
  readonly code: StandardPackSuccessorAdmissionErrorCode;
  /** Whether retrying the exact request can be safe. */
  readonly retryable: boolean;

  /**
   * Creates a public-safe successor-admission error without database, Git, or secret details.
   * @param code Stable machine-readable category.
   * @param message Public-safe summary.
   * @param retryable Whether an exact retry can be safe.
   */
  constructor(
    code: StandardPackSuccessorAdmissionErrorCode,
    message: string,
    retryable: boolean,
  ) {
    super(message);
    this.name = "StandardPackSuccessorAdmissionError";
    this.code = code;
    this.retryable = retryable;
  }
}

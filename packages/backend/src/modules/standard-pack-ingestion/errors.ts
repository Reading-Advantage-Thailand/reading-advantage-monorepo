/** Stable error codes that can cross a future registry command boundary. */
export type StandardPackSuccessorRegistryErrorCode =
  | "SUCCESSOR_CANDIDATE_INVALID"
  | "SUCCESSOR_COMMITMENT_CONFLICT"
  | "SUCCESSOR_REGISTRY_INTEGRITY_FAILURE"
  | "SUCCESSOR_REGISTRY_UNAVAILABLE"
  | "SUCCESSOR_RESERVATION_ABORTED";

/** Boundary-safe error emitted by the backend-owned successor registry. */
export class StandardPackSuccessorRegistryError extends Error {
  /** Stable machine-readable error category. */
  readonly code: StandardPackSuccessorRegistryErrorCode;
  /** Whether a trusted caller may retry without changing its evidence candidate. */
  readonly retryable: boolean;

  /**
   * Creates a boundary-safe successor-registry error without database or Git internals.
   * @param code Stable machine-readable error category.
   * @param message Public-safe summary.
   * @param retryable Whether retrying the exact candidate can be safe.
   */
  constructor(
    code: StandardPackSuccessorRegistryErrorCode,
    message: string,
    retryable: boolean,
  ) {
    super(message);
    this.name = "StandardPackSuccessorRegistryError";
    this.code = code;
    this.retryable = retryable;
  }
}

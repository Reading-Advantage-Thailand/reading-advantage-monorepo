/**
 * Structured diagnostics emitted when a blocked T11 scope or unsupported capability is requested.
 *
 * These error types enforce the T10 acceptance boundary: every blocked scope
 * (runtime, responsive, presentation, asset mappings, unknown Must-haves) and
 * every capability id absent from the accepted registry must fail closed with a
 * machine-readable diagnostic rather than silent fallback behavior.
 */

/** Blocked T11 scope categories that must fail closed. */
export type BlockedScope =
  | "runtime"
  | "responsive"
  | "presentation"
  | "asset-mappings"
  | "unknown-must-haves";

/** Structured error raised when a blocked T11 scope is requested. */
export class APKBlockedScopeError extends Error {
  /** Machine-readable blocked scope category. */
  readonly scope: BlockedScope;
  /** Structured context safe for diagnostics and QC overlays. */
  readonly details: Readonly<Record<string, unknown>>;

  /**
   * Creates a structured blocked-scope error.
   * @param scope The blocked T11 scope category.
   * @param message Human-readable description of why the scope is blocked.
   * @param details Structured context such as accepted/blocked counts.
   */
  constructor(
    scope: BlockedScope,
    message: string,
    details: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "APKBlockedScopeError";
    this.scope = scope;
    this.details = details;
  }
}

/** Structured error raised when a capability id outside the accepted registry is requested. */
export class APKUnsupportedCapabilityError extends Error {
  /** The capability id that was requested but is not accepted. */
  readonly requestedCapabilityId: string;
  /** The seven accepted capability ids. */
  readonly acceptedCapabilityIds: readonly string[];

  /**
   * Creates a structured unsupported-capability error.
   * @param requestedCapabilityId The non-accepted capability id that was requested.
   * @param acceptedCapabilityIds The seven accepted capability ids.
   */
  constructor(
    requestedCapabilityId: string,
    acceptedCapabilityIds: readonly string[],
  ) {
    super(
      `Capability ${requestedCapabilityId} is not in the T10-accepted registry; `
        + `accepted capabilities are: ${acceptedCapabilityIds.join(", ")}`,
    );
    this.name = "APKUnsupportedCapabilityError";
    this.requestedCapabilityId = requestedCapabilityId;
    this.acceptedCapabilityIds = acceptedCapabilityIds;
  }
}

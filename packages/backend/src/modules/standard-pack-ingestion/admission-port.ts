import type {
  StandardPackImmutableGitCandidateVerification,
  StandardPackSuccessorAdmissionSafeAudit,
  StandardPackSuccessorAdmissionInput,
  StandardPackSuccessorAdmissionObservability,
  StandardPackSuccessorAdmissionReceipt,
  StandardPackSuccessorAdmissionReceiptAppend,
  StandardPackSuccessorAdmissionReceiptLookup,
  StandardPackSuccessorAdmissionReplayRecord,
  StandardPackSuccessorAdmissionReservation,
  StandardPackSuccessorAdmissionReservationResult,
  StandardPackSuccessorAdmissionResult,
  StandardPackSuccessorAdmissionTrustedContext,
} from "./admission-contracts.js";

/** Result of applying the reviewed successor-admission authorization policy. */
export type StandardPackSuccessorAdmissionAuthorizationDecision =
  | Readonly<{ outcome: "allowed" }>
  | Readonly<{ outcome: "denied"; reasonCode: "ACTOR_NOT_AUTHORIZED" | "POLICY_DENIED" }>;

/** Provider-neutral authorization policy that receives trusted actor context separately from caller input. */
export interface StandardPackSuccessorAdmissionAuthorizationPolicy {
  /**
   * Evaluates whether a trusted actor may ask for this immutable successor admission.
   * @param input Trusted context and validated evidence excluding the raw idempotency key.
   * @returns An explicit allow or deny decision without performing persistence.
   */
  authorize(input: Readonly<{
    readonly context: Readonly<StandardPackSuccessorAdmissionTrustedContext>;
    readonly candidate: Readonly<StandardPackSuccessorAdmissionInput["candidate"]>;
    readonly commitment: Readonly<StandardPackSuccessorAdmissionInput["commitment"]>;
  }>): Promise<Readonly<StandardPackSuccessorAdmissionAuthorizationDecision>>;
}

/** Read-only adapter that verifies a candidate already exists at an immutable Git revision. */
export interface StandardPackImmutableGitCandidateVerifier {
  /**
   * Verifies immutable candidate identity without writing, tagging, publishing, or mutating Git.
   * @param reservation Candidate and commitment that must resolve to pre-existing immutable Git data.
   * @returns Verified immutable Git identity, or rejects when evidence cannot be verified.
   */
  verify(
    reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
  ): Promise<Readonly<StandardPackImmutableGitCandidateVerification>>;
}

/** Hashing boundary that converts raw idempotency input into non-secret durable identities. */
export interface StandardPackSuccessorAdmissionHasher {
  /**
   * Fingerprints an opaque idempotency key before it reaches durable, audit, or observability boundaries.
   * @param rawKey Caller-provided idempotency key retained only for this calculation.
   * @returns Stable fingerprint safe for the receipt table idempotency identity.
   */
  fingerprintIdempotencyKey(rawKey: string): Promise<string>;

  /**
   * Calculates the canonical request-input digest without incorporating the raw idempotency key.
   * @param reservation Candidate and commitment whose exact identity is replay-protected.
   * @returns Stable request-input digest used to detect divergent reuse of a fingerprinted key.
   */
  digestRequestInput(
    reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
  ): Promise<string>;
}

/** Transaction-scoped persistence operations that keep registry and receipt state atomic. */
export interface StandardPackSuccessorAdmissionTransaction {
  /**
   * Reads an existing immutable receipt by its hash-only idempotency identity.
   * @param lookup Actor-policy-fingerprint key used for replay lookup.
   * @returns Correlated durable receipt and registry record, or null when no admission exists.
   */
  readReceipt(
    lookup: Readonly<StandardPackSuccessorAdmissionReceiptLookup>,
  ): Promise<Readonly<StandardPackSuccessorAdmissionReplayRecord> | null>;

  /**
   * Atomically reserves one candidate-bound successor through the authoritative registry.
   * @param reservation Verified immutable Git candidate and exact successor commitment.
   * @returns Reserved, replayed, or conflicting registry state within this transaction.
   */
  reserveSuccessor(
    reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
  ): Promise<Readonly<StandardPackSuccessorAdmissionReservationResult>>;

  /**
   * Appends a receipt correlated with the transaction's reservation without allowing overwrite.
   * @param input Canonical receipt projection containing fingerprints instead of the raw idempotency key.
   * @returns The durable immutable receipt after append.
   */
  appendReceipt(
    input: Readonly<StandardPackSuccessorAdmissionReceiptAppend>,
  ): Promise<Readonly<StandardPackSuccessorAdmissionReceipt>>;
}

/** Provider-neutral atomic transaction owner for successor admission and receipt persistence. */
export interface StandardPackSuccessorAdmissionPersistencePort {
  /**
   * Runs registry reservation and receipt persistence in one transaction that rolls back on failure.
   * @param work Transaction-scoped work that may only resolve after every correlated write succeeds.
   * @returns The work result after the transaction commits.
   */
  transaction<T>(
    work: (transaction: StandardPackSuccessorAdmissionTransaction) => Promise<T>,
  ): Promise<T>;
}

/** Append-only audit sink constrained to redacted successor-admission event fields. */
export interface StandardPackSuccessorAdmissionAuditPort {
  /**
   * Appends one immutable, redacted successor-admission audit event.
   * @param event Safe event that cannot contain the caller's raw idempotency key.
   * @returns Nothing after append completes.
   */
  append(event: Readonly<StandardPackSuccessorAdmissionSafeAudit>): Promise<void>;
}

/** Structured observability sink constrained to redacted successor-admission fields. */
export interface StandardPackSuccessorAdmissionObservabilityPort {
  /**
   * Emits one safe structured event for operational diagnosis.
   * @param event Hash-only event fields that omit raw caller credentials and idempotency values.
   * @returns Nothing after the event is accepted by the sink.
   */
  emit(event: Readonly<StandardPackSuccessorAdmissionObservability>): void;
}

/** Dependencies required by the future transport-independent successor-admission command. */
export interface StandardPackSuccessorAdmissionCommandDependencies {
  /** Reviewed policy authorizer executed before candidate verification or persistence. */
  readonly authorization: StandardPackSuccessorAdmissionAuthorizationPolicy;
  /** Read-only immutable Git-candidate verifier. */
  readonly gitCandidateVerifier: StandardPackImmutableGitCandidateVerifier;
  /** Fingerprinting adapter that redacts raw idempotency input before durable boundaries. */
  readonly hasher: StandardPackSuccessorAdmissionHasher;
  /** Atomic registry-plus-receipt persistence boundary. */
  readonly persistence: StandardPackSuccessorAdmissionPersistencePort;
  /** Append-only safe audit boundary. */
  readonly audit: StandardPackSuccessorAdmissionAuditPort;
  /** Structured safe observability boundary. */
  readonly observability: StandardPackSuccessorAdmissionObservabilityPort;
  /** Creates a unique receipt identifier without deriving it from raw idempotency input. */
  readonly createReceiptId: () => string;
  /** Returns the current instant for receipts, audits, and verifier correlation. */
  readonly now: () => Date;
}

/** Transport-independent service contract for authorizing and admitting one immutable successor candidate. */
export interface StandardPackSuccessorAdmissionCommand {
  /**
   * Validates untrusted evidence, applies trusted authorization, verifies Git, and atomically persists a receipt.
   * @param input Untrusted evidence and opaque idempotency key without trusted authorization fields.
   * @param context Authenticated actor context supplied outside the untrusted input.
   * @returns New admission or exact idempotent replay with a hash-only receipt identity.
   */
  admit(
    input: Readonly<StandardPackSuccessorAdmissionInput>,
    context: Readonly<StandardPackSuccessorAdmissionTrustedContext>,
  ): Promise<Readonly<StandardPackSuccessorAdmissionResult>>;
}

import type {
  ApproveMasteryCalibrationInput,
  ApproveMasteryCalibrationResult,
  CommitMasteryEvidenceInput,
  CommitMasteryEvidenceResult,
  MasterySnapshot,
  MasterySnapshotInput,
} from "./persistence-contracts.js";

/** Portable error codes exposed by mastery persistence adapters. */
export type MasteryPersistenceErrorCode =
  | "VALIDATION_ERROR"
  | "TENANT_SCOPE_ERROR"
  | "IDEMPOTENCY_CONFLICT"
  | "APPEND_ONLY_CONFLICT"
  | "REVISION_CONFLICT"
  | "PERSISTENCE_UNAVAILABLE"
  | "PERSISTENCE_TIMEOUT"
  | "MISSING_MIGRATION"
  | "INTERNAL_ERROR";

/** Construction metadata for a portable persistence error. */
export interface MasteryPersistenceErrorOptions {
  /** Whether callers may safely retry the failed operation. */
  retryable?: boolean;
  /** Provider error retained for server-side diagnostics. */
  cause?: unknown;
}

const DEFAULT_RETRYABILITY: Readonly<Record<MasteryPersistenceErrorCode, boolean>> = {
  VALIDATION_ERROR: false,
  TENANT_SCOPE_ERROR: false,
  IDEMPOTENCY_CONFLICT: false,
  APPEND_ONLY_CONFLICT: false,
  REVISION_CONFLICT: true,
  PERSISTENCE_UNAVAILABLE: true,
  PERSISTENCE_TIMEOUT: true,
  MISSING_MIGRATION: false,
  INTERNAL_ERROR: false,
};

/** Provider-neutral error returned by mastery persistence adapters. */
export class MasteryPersistenceError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: MasteryPersistenceErrorCode;

  /** Whether callers may safely retry the operation. */
  readonly retryable: boolean;

  /**
   * Creates a portable persistence error.
   * @param code Stable machine-readable failure code.
   * @param message Safe provider-neutral explanation.
   * @param options Retryability and internal diagnostic cause.
   */
  constructor(
    code: MasteryPersistenceErrorCode,
    message: string,
    options: MasteryPersistenceErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "MasteryPersistenceError";
    this.code = code;
    this.retryable = options.retryable ?? DEFAULT_RETRYABILITY[code];
  }
}

/** Provider-neutral high-level persistence operations required by mastery services. */
export interface MasteryPersistencePort {
  /**
   * Reads a deterministic defensive snapshot for one school.
   * @param input Validated school scope.
   * @returns All persisted mastery record classes for that school.
   */
  readSnapshot(input: MasterySnapshotInput): Promise<MasterySnapshot>;

  /**
   * Validates and atomically applies or replays one mastery evidence command.
   * @param input Canonical records, revisions, provenance, and audit context.
   * @returns A stable applied or replayed idempotency receipt.
   */
  commitMasteryEvidence(
    input: CommitMasteryEvidenceInput,
  ): Promise<CommitMasteryEvidenceResult>;

  /**
   * Validates and persists a calibration release independently of learner evidence.
   * @param input Complete calibration, evaluation, approval, and audit evidence.
   * @returns The stable approved calibration receipt.
   */
  approveMasteryCalibration(
    input: ApproveMasteryCalibrationInput,
  ): Promise<ApproveMasteryCalibrationResult>;
}

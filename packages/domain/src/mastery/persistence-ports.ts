import type {
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
  | "REVISION_CONFLICT";

/** Provider-neutral error returned by mastery persistence adapters. */
export class MasteryPersistenceError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: MasteryPersistenceErrorCode;

  /**
   * Creates a portable persistence error.
   * @param code Stable machine-readable failure code.
   * @param message Safe provider-neutral explanation.
   */
  constructor(code: MasteryPersistenceErrorCode, message: string) {
    super(message);
    this.name = "MasteryPersistenceError";
    this.code = code;
  }
}

/** Provider-neutral persistence operations required by mastery orchestration. */
export interface MasteryPersistencePort {
  /**
   * Reads a deterministic defensive snapshot for one school.
   * @param input Validated school scope.
   * @returns All persisted mastery record classes for that school.
   */
  readSnapshot(input: MasterySnapshotInput): Promise<MasterySnapshot>;

  /**
   * Atomically applies or replays one validated mastery evidence commit.
   * @param input Versioned records, revisions, provenance, and audit context.
   * @returns A stable applied or replayed idempotency receipt.
   */
  commitMasteryEvidence(
    input: CommitMasteryEvidenceInput,
  ): Promise<CommitMasteryEvidenceResult>;
}


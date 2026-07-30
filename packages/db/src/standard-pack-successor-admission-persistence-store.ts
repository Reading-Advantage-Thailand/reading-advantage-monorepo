import type postgres from "postgres";

import type {
  DatabaseJsonObject,
  StandardPackSuccessorCommitmentStoreInput,
  StandardPackSuccessorCommitmentStoreReservation,
  StandardPackSuccessorCommitmentStoreRow,
} from "./standard-pack-successor-commitment-store.js";

/** Hash-only identity used to serialise and look up one immutable admission receipt. */
export interface StandardPackSuccessorAdmissionReceiptLookupInput {
  readonly actorId: string;
  readonly policyId: string;
  readonly idempotencyKeyFingerprint: string;
}

/** Flattened immutable receipt columns and their canonical JSON projection. */
export interface StandardPackSuccessorAdmissionReceiptAppendInput {
  readonly id: string;
  readonly schemaVersion: number;
  readonly commitmentDigest: string;
  readonly candidateDigest: string;
  readonly actorId: string;
  readonly policyId: string;
  readonly idempotencyKeyFingerprint: string;
  readonly requestInputDigest: string;
  readonly correlationId: string;
  readonly outcome: "reserved" | "replayed";
  readonly safeAuditJson: DatabaseJsonObject;
  readonly observabilityJson: DatabaseJsonObject;
  readonly receiptJson: DatabaseJsonObject;
  readonly recordedAt: Date | string;
}

/** Raw append-only receipt data returned from PostgreSQL before domain validation. */
export type StandardPackSuccessorAdmissionReceiptStoreRow =
  StandardPackSuccessorAdmissionReceiptAppendInput;

/** Existing raw receipt paired with the immutable successor evidence it references. */
export interface StandardPackSuccessorAdmissionReplayStoreRow {
  readonly receipt: StandardPackSuccessorAdmissionReceiptStoreRow;
  readonly registryRow: StandardPackSuccessorCommitmentStoreRow;
}

/** Transaction-scoped primitive persistence operations for one successor admission. */
export interface StandardPackSuccessorAdmissionPersistenceTransaction {
  /**
   * Locks and reads one prior receipt in its actor-policy-fingerprint namespace.
   * @param lookup Hash-only actor, policy, and idempotency identity.
   * @returns Raw receipt and registry evidence, or null when no receipt exists.
   */
  readReceipt(
    lookup: Readonly<StandardPackSuccessorAdmissionReceiptLookupInput>,
  ): Promise<StandardPackSuccessorAdmissionReplayStoreRow | null>;

  /**
   * Reserves a successor or locks the unique row that already owns the identity.
   * @param input Flattened registry columns and their canonical JSON evidence.
   * @returns The raw inserted, predecessor-existing, or secondary-existing result.
   */
  reserveSuccessor(
    input: Readonly<StandardPackSuccessorCommitmentStoreInput>,
  ): Promise<StandardPackSuccessorCommitmentStoreReservation>;

  /**
   * Appends one immutable receipt without permitting an overwrite.
   * @param input Flattened receipt columns and their canonical JSON projection.
   * @returns The canonical raw receipt returned by PostgreSQL.
   */
  appendReceipt(
    input: Readonly<StandardPackSuccessorAdmissionReceiptAppendInput>,
  ): Promise<StandardPackSuccessorAdmissionReceiptStoreRow>;
}

/** Provider-neutral owner of one atomic successor-reservation and receipt-persistence transaction. */
export interface StandardPackSuccessorAdmissionPersistenceStore {
  /**
   * Runs receipt lookup, successor reservation, and receipt append in one database transaction.
   * @param work Callback that uses only transaction-scoped raw persistence operations.
   * @returns The callback result after the outer transaction commits.
   */
  transaction<T>(
    work: (transaction: StandardPackSuccessorAdmissionPersistenceTransaction) => Promise<T>,
  ): Promise<T>;
}

/** Stable low-level failure categories emitted by the admission persistence store. */
export type StandardPackSuccessorAdmissionPersistenceStoreErrorCode =
  | "INTEGRITY_FAILURE"
  | "UNAVAILABLE";

/** Error emitted when the raw PostgreSQL admission persistence boundary cannot complete safely. */
export class StandardPackSuccessorAdmissionPersistenceStoreError extends Error {
  /** Stable low-level error classification. */
  readonly code: StandardPackSuccessorAdmissionPersistenceStoreErrorCode;
  /** Whether retrying the same storage operation can be safe. */
  readonly retryable: boolean;

  /**
   * Creates a safe persistence-layer error without exposing PostgreSQL details.
   * @param code Stable low-level error classification.
   * @param message Safe storage-layer failure summary.
   * @param retryable Whether retrying the same operation can be safe.
   */
  constructor(
    code: StandardPackSuccessorAdmissionPersistenceStoreErrorCode,
    message: string,
    retryable: boolean,
  ) {
    super(message);
    this.name = "StandardPackSuccessorAdmissionPersistenceStoreError";
    this.code = code;
    this.retryable = retryable;
  }
}

interface PostgresSuccessorCommitmentRow {
  readonly candidate_json: unknown;
  readonly commitment_json: unknown;
  readonly reserved_at: Date | string;
}

interface PostgresReceiptRow {
  readonly id: string;
  readonly schema_version: number;
  readonly commitment_digest: string;
  readonly candidate_digest: string;
  readonly actor_id: string;
  readonly policy_id: string;
  readonly idempotency_key_fingerprint: string;
  readonly request_input_digest: string;
  readonly correlation_id: string;
  readonly outcome: "reserved" | "replayed";
  readonly safe_audit_json: unknown;
  readonly observability_json: unknown;
  readonly receipt_json: unknown;
  readonly recorded_at: Date | string;
}

interface PostgresReplayRow extends PostgresReceiptRow, PostgresSuccessorCommitmentRow {}

/** Preserves errors thrown by transaction work while PostgreSQL rolls the transaction back. */
class TransactionWorkFailure extends Error {
  /** Original callback error that must not be recategorized as a database outage. */
  readonly original: unknown;

  /**
   * Wraps callback failure solely until postgres.js completes transaction rollback.
   * @param original Error thrown by the transaction callback.
   */
  constructor(original: unknown) {
    super("Successor admission transaction work failed.");
    this.name = "TransactionWorkFailure";
    this.original = original;
  }
}

/** Converts a PostgreSQL successor row to storage-owned provider-neutral evidence. */
function toRegistryRow(
  row: Readonly<PostgresSuccessorCommitmentRow>,
): StandardPackSuccessorCommitmentStoreRow {
  return {
    candidateJson: row.candidate_json as DatabaseJsonObject,
    commitmentJson: row.commitment_json as DatabaseJsonObject,
    reservedAt: row.reserved_at,
  };
}

/** Converts a PostgreSQL receipt row to raw provider-neutral receipt evidence. */
function toReceiptRow(
  row: Readonly<PostgresReceiptRow>,
): StandardPackSuccessorAdmissionReceiptStoreRow {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    commitmentDigest: row.commitment_digest,
    candidateDigest: row.candidate_digest,
    actorId: row.actor_id,
    policyId: row.policy_id,
    idempotencyKeyFingerprint: row.idempotency_key_fingerprint,
    requestInputDigest: row.request_input_digest,
    correlationId: row.correlation_id,
    outcome: row.outcome,
    safeAuditJson: row.safe_audit_json as DatabaseJsonObject,
    observabilityJson: row.observability_json as DatabaseJsonObject,
    receiptJson: row.receipt_json as DatabaseJsonObject,
    recordedAt: row.recorded_at,
  };
}

/** Extracts one PostgreSQL SQLSTATE without exposing driver types through the store API. */
function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const value = (error as { code?: unknown }).code;
  return typeof value === "string" ? value : undefined;
}

/** Converts unknown PostgreSQL failures into the raw store's bounded error surface. */
function storageFailure(error: unknown): StandardPackSuccessorAdmissionPersistenceStoreError {
  if (error instanceof StandardPackSuccessorAdmissionPersistenceStoreError) {
    return error;
  }
  return new StandardPackSuccessorAdmissionPersistenceStoreError(
    "UNAVAILABLE",
    "Successor admission persistence is temporarily unavailable.",
    true,
  );
}

/** Locks one idempotency namespace even when the receipt row does not exist yet. */
async function lockReceiptIdentity(
  sql: postgres.TransactionSql,
  lookup: Readonly<StandardPackSuccessorAdmissionReceiptLookupInput>,
): Promise<void> {
  await sql`
    SELECT pg_advisory_xact_lock(
      hashtextextended(
        jsonb_build_array(
          ${lookup.actorId},
          ${lookup.policyId},
          ${lookup.idempotencyKeyFingerprint}
        )::text,
        0
      )
    )
  `;
}

/** Locks and reads one existing receipt together with its immutable registry evidence. */
async function readReceiptInTransaction(
  sql: postgres.TransactionSql,
  lookup: Readonly<StandardPackSuccessorAdmissionReceiptLookupInput>,
): Promise<StandardPackSuccessorAdmissionReplayStoreRow | null> {
  await lockReceiptIdentity(sql, lookup);
  const rows = await sql<readonly PostgresReplayRow[]>`
    SELECT
      receipt.id,
      receipt.schema_version,
      receipt.commitment_digest,
      receipt.candidate_digest,
      receipt.actor_id,
      receipt.policy_id,
      receipt.idempotency_key_fingerprint,
      receipt.request_input_digest,
      receipt.correlation_id,
      receipt.outcome,
      receipt.safe_audit_json,
      receipt.observability_json,
      receipt.receipt_json,
      receipt.recorded_at,
      commitment.candidate_json,
      commitment.commitment_json,
      commitment.reserved_at
    FROM standard_pack_successor_admission_receipts AS receipt
    INNER JOIN standard_pack_successor_commitments AS commitment
      ON commitment.commitment_digest = receipt.commitment_digest
    WHERE receipt.actor_id = ${lookup.actorId}
      AND receipt.policy_id = ${lookup.policyId}
      AND receipt.idempotency_key_fingerprint = ${lookup.idempotencyKeyFingerprint}
    FOR UPDATE OF receipt, commitment
  `;
  if (rows.length === 0) return null;
  if (rows.length !== 1 || rows[0] === undefined) {
    throw new StandardPackSuccessorAdmissionPersistenceStoreError(
      "INTEGRITY_FAILURE",
      "Successor admission persistence could not lock one receipt row.",
      false,
    );
  }
  return { receipt: toReceiptRow(rows[0]), registryRow: toRegistryRow(rows[0]) };
}

/** Locks exactly one row after an insert loses the predecessor-identity race. */
async function lockPredecessorRow(
  sql: postgres.TransactionSql,
  predecessorIndexDigest: string,
): Promise<StandardPackSuccessorCommitmentStoreRow> {
  const rows = await sql<readonly PostgresSuccessorCommitmentRow[]>`
    SELECT candidate_json, commitment_json, reserved_at
      FROM standard_pack_successor_commitments
     WHERE predecessor_index_digest = ${predecessorIndexDigest}
     FOR UPDATE
  `;
  if (rows.length !== 1 || rows[0] === undefined) {
    throw new StandardPackSuccessorAdmissionPersistenceStoreError(
      "INTEGRITY_FAILURE",
      "Successor commitment storage could not lock one predecessor row.",
      false,
    );
  }
  return toRegistryRow(rows[0]);
}

/** Inserts a successor commitment or locks the predecessor row that already owns it. */
async function reserveInTransaction(
  sql: postgres.TransactionSql,
  input: Readonly<StandardPackSuccessorCommitmentStoreInput>,
): Promise<Exclude<
  StandardPackSuccessorCommitmentStoreReservation,
  Readonly<{ readonly outcome: "secondary-existing"; readonly row: StandardPackSuccessorCommitmentStoreRow }>
>> {
  const inserted = await sql<readonly PostgresSuccessorCommitmentRow[]>`
    INSERT INTO standard_pack_successor_commitments (
      schema_version,
      predecessor_index_digest,
      predecessor_version,
      predecessor_catalog_digest,
      predecessor_source_receipt_digest,
      successor_batch_id,
      successor_batch_digest,
      successor_version,
      successor_catalog_digest,
      successor_source_receipt_digest,
      candidate_repository_id,
      candidate_revision,
      candidate_tree_digest,
      descriptor_digest,
      source_packet_digest,
      candidate_digest,
      commitment_digest,
      candidate_json,
      commitment_json
    ) VALUES (
      ${input.schemaVersion},
      ${input.predecessorIndexDigest},
      ${input.predecessorVersion},
      ${input.predecessorCatalogDigest},
      ${input.predecessorSourceReceiptDigest},
      ${input.successorBatchId},
      ${input.successorBatchDigest},
      ${input.successorVersion},
      ${input.successorCatalogDigest},
      ${input.successorSourceReceiptDigest},
      ${input.candidateRepositoryId},
      ${input.candidateRevision},
      ${input.candidateTreeDigest},
      ${input.descriptorDigest},
      ${input.sourcePacketDigest},
      ${input.candidateDigest},
      ${input.commitmentDigest},
      ${sql.json(input.candidateJson as postgres.JSONValue)},
      ${sql.json(input.commitmentJson as postgres.JSONValue)}
    )
    ON CONFLICT (predecessor_index_digest) DO NOTHING
    RETURNING candidate_json, commitment_json, reserved_at
  `;
  if (inserted[0] !== undefined) {
    return { outcome: "inserted", row: toRegistryRow(inserted[0]) };
  }
  return {
    outcome: "predecessor-existing",
    row: await lockPredecessorRow(sql, input.predecessorIndexDigest),
  };
}

/** Locks the sole row implicated by a successor-batch or commitment-digest unique collision. */
async function lockSecondaryConflictRow(
  sql: postgres.TransactionSql,
  input: Readonly<StandardPackSuccessorCommitmentStoreInput>,
): Promise<StandardPackSuccessorCommitmentStoreRow> {
  const rows = await sql<readonly PostgresSuccessorCommitmentRow[]>`
    SELECT candidate_json, commitment_json, reserved_at
      FROM standard_pack_successor_commitments
     WHERE successor_batch_digest = ${input.successorBatchDigest}
        OR commitment_digest = ${input.commitmentDigest}
     FOR UPDATE
  `;
  if (rows.length !== 1 || rows[0] === undefined) {
    throw new StandardPackSuccessorAdmissionPersistenceStoreError(
      "INTEGRITY_FAILURE",
      "Successor commitment unique collision does not resolve to one row.",
      false,
    );
  }
  return toRegistryRow(rows[0]);
}

/** Recovers a secondary unique collision through a savepoint so the outer receipt transaction remains usable. */
async function reserveSuccessorInTransaction(
  sql: postgres.TransactionSql,
  input: Readonly<StandardPackSuccessorCommitmentStoreInput>,
): Promise<StandardPackSuccessorCommitmentStoreReservation> {
  try {
    return await sql.savepoint(async (savepoint) =>
      await reserveInTransaction(savepoint, input));
  } catch (error) {
    if (sqlState(error) !== "23505") throw storageFailure(error);
    try {
      return {
        outcome: "secondary-existing",
        row: await lockSecondaryConflictRow(sql, input),
      };
    } catch (secondaryError) {
      throw storageFailure(secondaryError);
    }
  }
}

/** Appends one immutable receipt and returns exactly its persisted raw projection. */
async function appendReceiptInTransaction(
  sql: postgres.TransactionSql,
  input: Readonly<StandardPackSuccessorAdmissionReceiptAppendInput>,
): Promise<StandardPackSuccessorAdmissionReceiptStoreRow> {
  const rows = await sql<readonly PostgresReceiptRow[]>`
    INSERT INTO standard_pack_successor_admission_receipts (
      id,
      schema_version,
      commitment_digest,
      candidate_digest,
      actor_id,
      policy_id,
      idempotency_key_fingerprint,
      request_input_digest,
      correlation_id,
      outcome,
      safe_audit_json,
      observability_json,
      receipt_json,
      recorded_at
    ) VALUES (
      ${input.id},
      ${input.schemaVersion},
      ${input.commitmentDigest},
      ${input.candidateDigest},
      ${input.actorId},
      ${input.policyId},
      ${input.idempotencyKeyFingerprint},
      ${input.requestInputDigest},
      ${input.correlationId},
      ${input.outcome},
      ${sql.json(input.safeAuditJson as postgres.JSONValue)},
      ${sql.json(input.observabilityJson as postgres.JSONValue)},
      ${sql.json(input.receiptJson as postgres.JSONValue)},
      ${input.recordedAt}
    )
    RETURNING
      id,
      schema_version,
      commitment_digest,
      candidate_digest,
      actor_id,
      policy_id,
      idempotency_key_fingerprint,
      request_input_digest,
      correlation_id,
      outcome,
      safe_audit_json,
      observability_json,
      receipt_json,
      recorded_at
  `;
  if (rows.length !== 1 || rows[0] === undefined) {
    throw new StandardPackSuccessorAdmissionPersistenceStoreError(
      "INTEGRITY_FAILURE",
      "Successor admission persistence did not append one receipt row.",
      false,
    );
  }
  return toReceiptRow(rows[0]);
}

/** Creates the PostgreSQL implementation of the raw atomic successor-admission persistence store. */
export function createPostgresStandardPackSuccessorAdmissionPersistenceStore(
  sql: postgres.Sql,
): StandardPackSuccessorAdmissionPersistenceStore {
  return Object.freeze({
    async transaction<T>(
      work: (transaction: StandardPackSuccessorAdmissionPersistenceTransaction) => Promise<T>,
    ): Promise<T> {
      try {
        return await sql.begin(async (activeSql) => {
          const transaction: StandardPackSuccessorAdmissionPersistenceTransaction = {
            async readReceipt(lookup) {
              try {
                return await readReceiptInTransaction(activeSql, lookup);
              } catch (error) {
                throw storageFailure(error);
              }
            },
            async reserveSuccessor(input) {
              return await reserveSuccessorInTransaction(activeSql, input);
            },
            async appendReceipt(input) {
              try {
                return await appendReceiptInTransaction(activeSql, input);
              } catch (error) {
                throw storageFailure(error);
              }
            },
          };
          try {
            return await work(transaction);
          } catch (error) {
            throw new TransactionWorkFailure(error);
          }
        }) as T;
      } catch (error) {
        if (error instanceof TransactionWorkFailure) throw error.original;
        throw storageFailure(error);
      }
    },
  });
}

import type postgres from "postgres";

/** A primitive value that can be stored inside a provider-neutral JSON document. */
export type DatabaseJsonPrimitive = boolean | null | number | string;

/** A provider-neutral JSON value accepted and returned by durable storage. */
export type DatabaseJsonValue =
  | DatabaseJsonPrimitive
  | readonly DatabaseJsonValue[]
  | Readonly<{ readonly [key: string]: DatabaseJsonValue }>;

/** A provider-neutral JSON object accepted and returned by durable storage. */
export type DatabaseJsonObject = Readonly<{
  readonly [key: string]: DatabaseJsonValue;
}>;

/** Flattened immutable values required to write one standard-pack successor commitment row. */
export interface StandardPackSuccessorCommitmentStoreInput {
  readonly schemaVersion: number;
  readonly predecessorIndexDigest: string;
  readonly predecessorVersion: string;
  readonly predecessorCatalogDigest: string;
  readonly predecessorSourceReceiptDigest: string;
  readonly successorBatchId: string;
  readonly successorBatchDigest: string;
  readonly successorVersion: string;
  readonly successorCatalogDigest: string;
  readonly successorSourceReceiptDigest: string;
  readonly candidateRepositoryId: string;
  readonly candidateRevision: string;
  readonly candidateTreeDigest: string;
  readonly descriptorDigest: string;
  readonly sourcePacketDigest: string;
  readonly candidateDigest: string;
  readonly commitmentDigest: string;
  readonly candidateJson: DatabaseJsonObject;
  readonly commitmentJson: DatabaseJsonObject;
}

/** Raw immutable commitment evidence returned from the database before domain validation. */
export interface StandardPackSuccessorCommitmentStoreRow {
  readonly candidateJson: DatabaseJsonObject;
  readonly commitmentJson: DatabaseJsonObject;
  readonly reservedAt: Date | string;
}

/** Atomic persistence outcome that leaves replay versus domain conflict to the backend. */
export type StandardPackSuccessorCommitmentStoreReservation =
  | Readonly<{
    readonly outcome: "inserted";
    readonly row: StandardPackSuccessorCommitmentStoreRow;
  }>
  | Readonly<{
    readonly outcome: "predecessor-existing";
    readonly row: StandardPackSuccessorCommitmentStoreRow;
  }>
  | Readonly<{
    readonly outcome: "secondary-existing";
    readonly row: StandardPackSuccessorCommitmentStoreRow;
  }>;

/** Stable low-level failure categories emitted by the successor commitment store. */
export type StandardPackSuccessorCommitmentStoreErrorCode =
  | "INTEGRITY_FAILURE"
  | "UNAVAILABLE";

/** Error emitted when the store cannot fulfill its durable persistence contract. */
export class StandardPackSuccessorCommitmentStoreError extends Error {
  /** Stable low-level error classification. */
  readonly code: StandardPackSuccessorCommitmentStoreErrorCode;
  /** Whether callers may retry the same storage operation. */
  readonly retryable: boolean;

  /**
   * Creates a storage-layer error without exposing PostgreSQL implementation details.
   * @param code Stable low-level error classification.
   * @param message Safe storage-layer failure summary.
   * @param retryable Whether retrying the same operation can be safe.
   */
  constructor(
    code: StandardPackSuccessorCommitmentStoreErrorCode,
    message: string,
    retryable: boolean,
  ) {
    super(message);
    this.name = "StandardPackSuccessorCommitmentStoreError";
    this.code = code;
    this.retryable = retryable;
  }
}

/** Provider-neutral low-level persistence boundary for immutable successor commitments. */
export interface StandardPackSuccessorCommitmentStore {
  /**
   * Reads the one immutable row for a predecessor index.
   * @param predecessorIndexDigest The immutable predecessor index key.
   * @returns The raw durable evidence, or null when no reservation exists.
   */
  read(
    predecessorIndexDigest: string,
  ): Promise<StandardPackSuccessorCommitmentStoreRow | null>;

  /**
   * Atomically inserts a commitment or locks the row that prevents insertion.
   * @param input Flattened immutable database values and their JSON evidence.
   * @returns The inserted row or the locked row implicated by a unique constraint.
   */
  reserve(
    input: Readonly<StandardPackSuccessorCommitmentStoreInput>,
  ): Promise<StandardPackSuccessorCommitmentStoreReservation>;
}

interface PostgresSuccessorCommitmentRow {
  readonly candidate_json: unknown;
  readonly commitment_json: unknown;
  readonly reserved_at: Date | string;
}

/** Converts a PostgreSQL row to storage-owned, provider-neutral evidence values. */
function toStoreRow(
  row: Readonly<PostgresSuccessorCommitmentRow>,
): StandardPackSuccessorCommitmentStoreRow {
  return {
    candidateJson: row.candidate_json as DatabaseJsonObject,
    commitmentJson: row.commitment_json as DatabaseJsonObject,
    reservedAt: row.reserved_at,
  };
}

/** Extracts one PostgreSQL SQLSTATE without leaking driver-specific types through the store API. */
function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const value = (error as { code?: unknown }).code;
  return typeof value === "string" ? value : undefined;
}

/** Converts unknown driver failures into the store's bounded error surface. */
function storageFailure(error: unknown): StandardPackSuccessorCommitmentStoreError {
  if (error instanceof StandardPackSuccessorCommitmentStoreError) return error;
  return new StandardPackSuccessorCommitmentStoreError(
    "UNAVAILABLE",
    "Successor commitment storage is temporarily unavailable.",
    true,
  );
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
    throw new StandardPackSuccessorCommitmentStoreError(
      "INTEGRITY_FAILURE",
      "Successor commitment storage could not lock one predecessor row.",
      false,
    );
  }
  return toStoreRow(rows[0]);
}

/** Inserts a commitment, or locks the canonical predecessor row in the same transaction. */
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
    return { outcome: "inserted", row: toStoreRow(inserted[0]) };
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
    throw new StandardPackSuccessorCommitmentStoreError(
      "INTEGRITY_FAILURE",
      "Successor commitment unique collision does not resolve to one row.",
      false,
    );
  }
  return toStoreRow(rows[0]);
}

/** Starts a replacement transaction after PostgreSQL rolls back a secondary unique collision. */
async function recoverSecondaryUniqueCollision(
  sql: postgres.Sql,
  input: Readonly<StandardPackSuccessorCommitmentStoreInput>,
): Promise<StandardPackSuccessorCommitmentStoreReservation> {
  try {
    return await sql.begin(async (transaction) => ({
      outcome: "secondary-existing" as const,
      row: await lockSecondaryConflictRow(transaction, input),
    }));
  } catch (error) {
    throw storageFailure(error);
  }
}

/** Creates the PostgreSQL implementation of the low-level successor-commitment store. */
export function createPostgresStandardPackSuccessorCommitmentStore(
  sql: postgres.Sql,
): StandardPackSuccessorCommitmentStore {
  return Object.freeze({
    async read(predecessorIndexDigest: string) {
      try {
        const rows = await sql<readonly PostgresSuccessorCommitmentRow[]>`
          SELECT candidate_json, commitment_json, reserved_at
            FROM standard_pack_successor_commitments
           WHERE predecessor_index_digest = ${predecessorIndexDigest}
        `;
        if (rows.length === 0) return null;
        if (rows.length !== 1 || rows[0] === undefined) {
          throw new StandardPackSuccessorCommitmentStoreError(
            "INTEGRITY_FAILURE",
            "Successor commitment storage returned multiple predecessor rows.",
            false,
          );
        }
        return toStoreRow(rows[0]);
      } catch (error) {
        throw storageFailure(error);
      }
    },

    async reserve(input: Readonly<StandardPackSuccessorCommitmentStoreInput>) {
      try {
        return await sql.begin(async (transaction) =>
          await reserveInTransaction(transaction, input));
      } catch (error) {
        if (sqlState(error) === "23505") {
          return await recoverSecondaryUniqueCollision(sql, input);
        }
        throw storageFailure(error);
      }
    },
  });
}

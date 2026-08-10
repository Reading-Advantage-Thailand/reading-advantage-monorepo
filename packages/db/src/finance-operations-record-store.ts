import type postgres from "postgres";

/** Flat, company-first scope used by the Finance record store. */
export interface FinanceRecordStoreScope {
  /** Company that owns the immutable record identity. */
  readonly companyId: string;
  /** Optional school sub-scope; omitted means company scope. */
  readonly schoolId?: string;
}

/** Flattened immutable values written to the Finance record table. */
export interface FinanceRecordStoreInput extends FinanceRecordStoreScope {
  /** Stable Finance Operations record identity within the scope. */
  readonly recordId: string;
  /** Exact signed minor-unit amount represented as text. */
  readonly amountMinor: string;
  /** Uppercase ISO-style currency code retained without conversion. */
  readonly currency: string;
  /** Provider-neutral source-system identity. */
  readonly sourceSystem: string;
  /** Version of the source contract that produced the record. */
  readonly sourceVersion: string;
  /** Stable source-system record identity. */
  readonly sourceRecordId: string;
  /** Immutable import batch identity. */
  readonly importBatchId: string;
  /** Lowercase SHA-256 digest of the source payload. */
  readonly payloadDigest: string;
  /** Private, provider-neutral evidence reference. */
  readonly evidenceReference: string;
  /** Record identity superseded by an append-only correction, when present. */
  readonly supersedesRecordId?: string;
  /** Explanation paired with an append-only supersession reference. */
  readonly correctionReason?: string;
}

/** Raw immutable Finance record row exposed by the database-owned store. */
export type FinanceRecordStoreRow = FinanceRecordStoreInput;

/** Result of atomically inserting a record or locking its existing identity. */
export interface FinanceRecordStoreAppendResult {
  /** Whether the row was newly inserted or already owned an identity. */
  readonly outcome: "inserted" | "existing";
  /** Canonical immutable row returned by PostgreSQL. */
  readonly row: FinanceRecordStoreRow;
}

/** Immutable success event written beside an accepted Finance record. */
export interface FinanceRecordSuccessAuditInput extends FinanceRecordStoreScope {
  /** Stable idempotency identity for the success event. */
  readonly eventId: string;
  /** Authenticated Company Identity subject that performed the operation. */
  readonly actorSubjectId: string;
  /** Finance operation represented by the success event. */
  readonly operation:
    | "financial-record:import"
    | "financial-record:append-correction";
  /** Financial record identity represented by the event. */
  readonly objectId: string;
  /** Canonical UTC instant at which the operation completed. */
  readonly occurredAt: string;
  /** Request identity used for audit idempotency. */
  readonly requestId: string;
  /** Correlation identity shared across related operations. */
  readonly correlationId: string;
}

/** Stable low-level failures emitted by the Finance record store. */
export type FinanceRecordStoreErrorCode = "INTEGRITY_FAILURE" | "UNAVAILABLE";

/** Bounded persistence error that avoids leaking PostgreSQL details upstream. */
export class FinanceRecordStoreError extends Error {
  /** Stable machine-readable persistence failure category. */
  readonly code: FinanceRecordStoreErrorCode;
  /** Whether retrying the same operation can be safe. */
  readonly retryable: boolean;

  /**
   * Creates a bounded Finance persistence error.
   * @param code Stable persistence failure category.
   * @param message Safe message suitable for an internal boundary.
   * @param retryable Whether retrying can be safe.
   */
  constructor(
    code: FinanceRecordStoreErrorCode,
    message: string,
    retryable: boolean,
  ) {
    super(message);
    this.name = "FinanceRecordStoreError";
    this.code = code;
    this.retryable = retryable;
  }
}

/** Provider-neutral raw PostgreSQL persistence boundary for Finance records. */
export interface FinanceOperationsRecordStore {
  /**
   * Looks up one immutable record within its explicit company and school scope.
   * @param identity Tenant scope and Finance record identity to find.
   * @returns The immutable row, or null when no row owns the identity.
   */
  findByRecordId(
    identity: Readonly<FinanceRecordStoreScope & { readonly recordId: string }>,
  ): Promise<FinanceRecordStoreRow | null>;

  /**
   * Appends a record and its local success-audit outbox event in one transaction.
   * @param input Flattened immutable record values to append.
   * @param audit Immutable success event to persist beside the record.
   * @returns Inserted or existing canonical row and its classification.
   */
  appendWithSuccessAudit(
    input: Readonly<FinanceRecordStoreInput>,
    audit: Readonly<FinanceRecordSuccessAuditInput>,
  ): Promise<FinanceRecordStoreAppendResult>;
}

/** Snake-case row shape returned by postgres.js before store mapping. */
interface PostgresFinanceRecordRow {
  /** Internal UUID primary key retained by the database layer. */
  readonly id?: string;
  readonly company_id: string;
  readonly school_id: string | null;
  readonly record_id: string;
  readonly amount_minor: string;
  readonly currency: string;
  readonly source_system: string;
  readonly source_version: string;
  readonly source_record_id: string;
  readonly import_batch_id: string;
  readonly payload_digest: string;
  readonly evidence_reference: string;
  readonly supersedes_record_id: string | null;
  readonly correction_reason: string | null;
  /** Immutable database acceptance instant retained by the database layer. */
  readonly accepted_at?: Date | string;
}

/** Converts one PostgreSQL row into the store's provider-neutral flat shape. */
function toStoreRow(
  row: Readonly<PostgresFinanceRecordRow>,
): FinanceRecordStoreRow {
  return {
    companyId: row.company_id,
    ...(row.school_id === null ? {} : { schoolId: row.school_id }),
    recordId: row.record_id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    sourceSystem: row.source_system,
    sourceVersion: row.source_version,
    sourceRecordId: row.source_record_id,
    importBatchId: row.import_batch_id,
    payloadDigest: row.payload_digest,
    evidenceReference: row.evidence_reference,
    ...(row.supersedes_record_id === null
      ? {}
      : { supersedesRecordId: row.supersedes_record_id }),
    ...(row.correction_reason === null
      ? {}
      : { correctionReason: row.correction_reason }),
  };
}

/** Creates an integrity error for a result that violates one-row identity semantics. */
function integrityFailure(message: string): FinanceRecordStoreError {
  return new FinanceRecordStoreError("INTEGRITY_FAILURE", message, false);
}

/** Converts an unknown PostgreSQL failure to the bounded store error surface. */
function storageFailure(error: unknown): FinanceRecordStoreError {
  if (error instanceof FinanceRecordStoreError) return error;
  return new FinanceRecordStoreError(
    "UNAVAILABLE",
    "Finance record persistence is temporarily unavailable.",
    true,
  );
}

/** Locks the sole row implicated by a record or source identity collision. */
async function lockCollisionRow(
  sql: postgres.TransactionSql,
  input: Readonly<FinanceRecordStoreInput>,
): Promise<FinanceRecordStoreRow> {
  const schoolId = input.schoolId ?? null;
  const rows = await sql<readonly PostgresFinanceRecordRow[]>`
    SELECT id, company_id, school_id, record_id, amount_minor, currency,
           source_system, source_version, source_record_id, import_batch_id,
           payload_digest, evidence_reference, supersedes_record_id,
           correction_reason, accepted_at
      FROM finance_records
     WHERE (
       company_id = ${input.companyId}
       AND school_id IS NOT DISTINCT FROM ${schoolId}
       AND record_id = ${input.recordId}
     ) OR (
       company_id = ${input.companyId}
       AND school_id IS NOT DISTINCT FROM ${schoolId}
       AND source_system = ${input.sourceSystem}
       AND source_version = ${input.sourceVersion}
       AND source_record_id = ${input.sourceRecordId}
     )
     FOR UPDATE
  `;
  if (rows.length !== 1 || rows[0] === undefined) {
    throw integrityFailure(
      "Finance record identity collision did not resolve to exactly one row.",
    );
  }
  return toStoreRow(rows[0]);
}

/** Inserts a record or locks its one existing identity within the active transaction. */
async function compareAndAppendInTransaction(
  sql: postgres.TransactionSql,
  input: Readonly<FinanceRecordStoreInput>,
): Promise<FinanceRecordStoreAppendResult> {
  const schoolId = input.schoolId ?? null;
  const supersedesRecordId = input.supersedesRecordId ?? null;
  const correctionReason = input.correctionReason ?? null;
  const inserted = await sql<readonly PostgresFinanceRecordRow[]>`
    INSERT INTO finance_records (
      company_id, school_id, record_id, amount_minor, currency,
      source_system, source_version, source_record_id, import_batch_id,
      payload_digest, evidence_reference, supersedes_record_id, correction_reason
    ) VALUES (
      ${input.companyId}, ${schoolId}, ${input.recordId}, ${input.amountMinor},
      ${input.currency}, ${input.sourceSystem}, ${input.sourceVersion},
      ${input.sourceRecordId}, ${input.importBatchId}, ${input.payloadDigest},
      ${input.evidenceReference}, ${supersedesRecordId}, ${correctionReason}
    )
    ON CONFLICT DO NOTHING
    RETURNING id, company_id, school_id, record_id, amount_minor, currency,
              source_system, source_version, source_record_id, import_batch_id,
              payload_digest, evidence_reference, supersedes_record_id,
              correction_reason, accepted_at
  `;
  if (inserted.length === 1 && inserted[0] !== undefined) {
    return { outcome: "inserted", row: toStoreRow(inserted[0]) };
  }
  if (inserted.length > 1) {
    throw integrityFailure(
      "Finance record append returned multiple inserted rows.",
    );
  }
  return {
    outcome: "existing",
    row: await lockCollisionRow(sql, input),
  };
}

/** Validates that an outbox event cannot describe a different Finance record or scope. */
function validateSuccessAudit(
  input: Readonly<FinanceRecordStoreInput>,
  audit: Readonly<FinanceRecordSuccessAuditInput>,
): void {
  if (
    audit.companyId !== input.companyId ||
    (audit.schoolId ?? null) !== (input.schoolId ?? null) ||
    audit.objectId !== input.recordId
  ) {
    throw integrityFailure(
      "Finance success audit scope or object does not match the accepted record.",
    );
  }
  const isCorrection =
    input.supersedesRecordId !== undefined &&
    input.correctionReason !== undefined;
  const expectedOperation = isCorrection
    ? "financial-record:append-correction"
    : "financial-record:import";
  if (audit.operation !== expectedOperation) {
    throw integrityFailure(
      "Finance success audit operation does not match the accepted record.",
    );
  }
}

/** Normalizes a PostgreSQL timestamp value for immutable event comparison. */
function normalizeAuditTimestamp(value: Date | string): string {
  const timestamp = value instanceof Date ? value : new Date(value);
  const normalized = timestamp.toISOString();
  return normalized;
}

/** Appends one immutable success event to the local projection outbox. */
async function appendSuccessAuditInTransaction(
  sql: postgres.TransactionSql,
  audit: Readonly<FinanceRecordSuccessAuditInput>,
): Promise<void> {
  const inserted = await sql<readonly { readonly event_id: string }[]>`
    INSERT INTO finance_record_success_audit_outbox (
      event_id, company_id, school_id, actor_subject_id, operation,
      object_id, occurred_at, request_id, correlation_id
    ) VALUES (
      ${audit.eventId}, ${audit.companyId}, ${audit.schoolId ?? null},
      ${audit.actorSubjectId}, ${audit.operation}, ${audit.objectId},
      ${audit.occurredAt}, ${audit.requestId}, ${audit.correlationId}
    )
    ON CONFLICT (event_id) DO NOTHING
    RETURNING event_id
  `;
  if (inserted.length === 1 && inserted[0] !== undefined) return;
  if (inserted.length > 1) {
    throw integrityFailure(
      "Finance success audit outbox append returned multiple rows.",
    );
  }

  const existing = await sql<
    readonly {
      readonly event_id: string;
      readonly company_id: string;
      readonly school_id: string | null;
      readonly actor_subject_id: string;
      readonly operation: FinanceRecordSuccessAuditInput["operation"];
      readonly object_id: string;
      readonly occurred_at: Date | string;
      readonly request_id: string;
      readonly correlation_id: string;
    }[]
  >`
    SELECT event_id, company_id, school_id, actor_subject_id, operation,
           object_id, occurred_at, request_id, correlation_id
      FROM finance_record_success_audit_outbox
     WHERE event_id = ${audit.eventId}
       AND company_id = ${audit.companyId}
       AND school_id IS NOT DISTINCT FROM ${audit.schoolId ?? null}
     FOR UPDATE
  `;
  const row = existing[0];
  if (existing.length !== 1 || row === undefined) {
    throw integrityFailure(
      "Finance success audit outbox collision did not resolve to one row.",
    );
  }
  if (
    row.company_id !== audit.companyId ||
    (row.school_id ?? null) !== (audit.schoolId ?? null) ||
    row.actor_subject_id !== audit.actorSubjectId ||
    row.operation !== audit.operation ||
    row.object_id !== audit.objectId ||
    normalizeAuditTimestamp(row.occurred_at) !== audit.occurredAt ||
    row.request_id !== audit.requestId ||
    row.correlation_id !== audit.correlationId
  ) {
    throw integrityFailure(
      "Finance success audit event identity is already owned by different data.",
    );
  }
}

/**
 * Creates the PostgreSQL implementation of the raw Finance record store.
 * @param sql PostgreSQL client whose transaction boundary owns each append.
 * @returns Provider-neutral immutable Finance record persistence operations.
 */
export function createPostgresFinanceOperationsRecordStore(
  sql: postgres.Sql,
): FinanceOperationsRecordStore {
  return Object.freeze({
    async findByRecordId(
      identity: Readonly<
        FinanceRecordStoreScope & { readonly recordId: string }
      >,
    ): Promise<FinanceRecordStoreRow | null> {
      try {
        const rows = await sql<readonly PostgresFinanceRecordRow[]>`
          SELECT id, company_id, school_id, record_id, amount_minor, currency,
                 source_system, source_version, source_record_id, import_batch_id,
                 payload_digest, evidence_reference, supersedes_record_id,
                 correction_reason, accepted_at
            FROM finance_records
           WHERE company_id = ${identity.companyId}
             AND school_id IS NOT DISTINCT FROM ${identity.schoolId ?? null}
             AND record_id = ${identity.recordId}
        `;
        if (rows.length === 0) return null;
        if (rows.length !== 1 || rows[0] === undefined) {
          throw integrityFailure(
            "Finance record lookup returned multiple rows for one identity.",
          );
        }
        return toStoreRow(rows[0]);
      } catch (error) {
        throw storageFailure(error);
      }
    },

    async appendWithSuccessAudit(
      input: Readonly<FinanceRecordStoreInput>,
      audit: Readonly<FinanceRecordSuccessAuditInput>,
    ): Promise<FinanceRecordStoreAppendResult> {
      try {
        validateSuccessAudit(input, audit);
        return await sql.begin(async (transaction) => {
          const result = await compareAndAppendInTransaction(
            transaction,
            input,
          );
          await appendSuccessAuditInTransaction(transaction, audit);
          return result;
        });
      } catch (error) {
        throw storageFailure(error);
      }
    },
  });
}

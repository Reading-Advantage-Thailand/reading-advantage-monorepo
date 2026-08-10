import { type FinanceAuditEvent } from "./audit.js";
import {
  financeRecordSchema,
  type FinanceRecord,
  type FinanceRecordCompareAndAppendResult,
  type FinanceRecordIdentity,
  type FinanceRecordRepository,
} from "./records.js";

/** Flat scope accepted by the database-owned Finance record store seam. */
interface FinanceRecordStoreScope {
  /** Company that owns the record. */
  readonly companyId: string;
  /** Optional school sub-scope; absent means company-level scope. */
  readonly schoolId?: string | null;
}

/** Raw immutable row returned by the database-owned Finance record store. */
interface FinanceRecordStoreRow extends FinanceRecordStoreScope {
  /** Stable Finance record identity. */
  readonly recordId: string;
  /** Exact signed minor-unit amount represented as text. */
  readonly amountMinor: string;
  /** Uppercase currency code retained without conversion. */
  readonly currency: string;
  /** Source-system identity. */
  readonly sourceSystem: string;
  /** Source contract version. */
  readonly sourceVersion: string;
  /** Source-system record identity. */
  readonly sourceRecordId: string;
  /** Immutable import batch identity. */
  readonly importBatchId: string;
  /** Lowercase SHA-256 source payload digest. */
  readonly payloadDigest: string;
  /** Private provider-neutral evidence reference. */
  readonly evidenceReference: string;
  /** Optional superseded record identity. */
  readonly supersedesRecordId?: string | null;
  /** Optional correction reason paired with supersession. */
  readonly correctionReason?: string | null;
}

/** Provider-neutral persistence methods required by the PostgreSQL repository adapter. */
interface FinanceOperationsRecordStore {
  /**
   * Finds one raw row in the requested company and school scope.
   * @param identity Scoped Finance record identity.
   * @returns Raw row, or null when no record exists.
   */
  findByRecordId(
    identity: Readonly<FinanceRecordStoreScope & { readonly recordId: string }>,
  ): Promise<FinanceRecordStoreRow | null>;

  /**
   * Appends a record and its success event in one database transaction.
   * @param input Flattened immutable Finance record values.
   * @param audit Success event retained in the database-owned outbox.
   * @returns Append classification and canonical raw row.
   */
  appendWithSuccessAudit(
    input: Readonly<FinanceRecordStoreRow>,
    audit: Readonly<{
      readonly companyId: string;
      readonly schoolId?: string;
      readonly eventId: string;
      readonly actorSubjectId: string;
      readonly operation:
        | "financial-record:import"
        | "financial-record:append-correction";
      readonly objectId: string;
      readonly occurredAt: string;
      readonly requestId: string;
      readonly correlationId: string;
    }>,
  ): Promise<{
    readonly outcome: "inserted" | "existing";
    readonly row: FinanceRecordStoreRow;
  }>;
}

/** Flattens a validated Finance domain record for the database store seam. */
function toStoreInput(record: Readonly<FinanceRecord>): FinanceRecordStoreRow {
  return {
    companyId: record.scope.companyId,
    ...(record.scope.schoolId === undefined
      ? {}
      : { schoolId: record.scope.schoolId }),
    recordId: record.recordId,
    amountMinor: record.money.amountMinor,
    currency: record.money.currency,
    sourceSystem: record.provenance.sourceSystem,
    sourceVersion: record.provenance.sourceVersion,
    sourceRecordId: record.provenance.sourceRecordId,
    importBatchId: record.provenance.importBatchId,
    payloadDigest: record.provenance.payloadDigest,
    evidenceReference: record.provenance.evidenceReference,
    ...(record.supersedesRecordId === undefined
      ? {}
      : { supersedesRecordId: record.supersedesRecordId }),
    ...(record.correctionReason === undefined
      ? {}
      : { correctionReason: record.correctionReason }),
  };
}

/** Maps and validates one raw store row before crossing the repository boundary. */
function toFinanceRecord(row: Readonly<FinanceRecordStoreRow>): FinanceRecord {
  return financeRecordSchema.parse({
    scope: {
      companyId: row.companyId,
      ...(row.schoolId === undefined || row.schoolId === null
        ? {}
        : { schoolId: row.schoolId }),
    },
    recordId: row.recordId,
    money: {
      amountMinor: row.amountMinor,
      currency: row.currency,
    },
    provenance: {
      sourceSystem: row.sourceSystem,
      sourceVersion: row.sourceVersion,
      sourceRecordId: row.sourceRecordId,
      importBatchId: row.importBatchId,
      payloadDigest: row.payloadDigest,
      evidenceReference: row.evidenceReference,
    },
    ...(row.supersedesRecordId === undefined || row.supersedesRecordId === null
      ? {}
      : { supersedesRecordId: row.supersedesRecordId }),
    ...(row.correctionReason === undefined || row.correctionReason === null
      ? {}
      : { correctionReason: row.correctionReason }),
  });
}

/** Converts a validated succeeded event into the raw store's atomic-audit shape. */
function toSuccessAuditInput(event: Readonly<FinanceAuditEvent>): {
  readonly companyId: string;
  readonly schoolId?: string;
  readonly eventId: string;
  readonly actorSubjectId: string;
  readonly operation:
    | "financial-record:import"
    | "financial-record:append-correction";
  readonly objectId: string;
  readonly occurredAt: string;
  readonly requestId: string;
  readonly correlationId: string;
} {
  if (
    event.outcome !== "succeeded" ||
    event.objectType !== "financial-record" ||
    (event.operation !== "financial-record:import" &&
      event.operation !== "financial-record:append-correction")
  ) {
    throw new Error(
      "Only succeeded financial-record events can enter the Finance success outbox.",
    );
  }
  return {
    companyId: event.scope.companyId,
    ...(event.scope.schoolId === undefined
      ? {}
      : { schoolId: event.scope.schoolId }),
    eventId: event.eventId,
    actorSubjectId: event.actorSubjectId,
    operation: event.operation,
    objectId: event.objectId,
    occurredAt: event.occurredAt,
    requestId: event.requestId,
    correlationId: event.correlationId,
  };
}

/**
 * Creates a validated Finance repository over the raw PostgreSQL store.
 * @param store Provider-neutral raw persistence seam supplied by composition.
 * @returns Repository that validates every persisted row with financeRecordSchema.
 */
export function createPostgresFinanceRecordRepository(
  store: FinanceOperationsRecordStore,
): FinanceRecordRepository {
  return Object.freeze({
    async findByRecordId(identity: FinanceRecordIdentity) {
      const row = await store.findByRecordId({
        companyId: identity.scope.companyId,
        ...(identity.scope.schoolId === undefined
          ? {}
          : { schoolId: identity.scope.schoolId }),
        recordId: identity.recordId,
      });
      return row === null ? undefined : toFinanceRecord(row);
    },

    async appendWithSuccessAudit(
      record: FinanceRecord,
      audit: FinanceAuditEvent,
    ): Promise<FinanceRecordCompareAndAppendResult> {
      const candidate = financeRecordSchema.parse(record) as FinanceRecord;
      const result = await store.appendWithSuccessAudit(
        toStoreInput(candidate),
        toSuccessAuditInput(audit),
      );
      const status =
        result.outcome === "inserted"
          ? ("accepted" as const)
          : ("existing" as const);
      return {
        status,
        record: toFinanceRecord(result.row),
      };
    },
  });
}

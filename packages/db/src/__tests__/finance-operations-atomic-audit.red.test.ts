import type postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

/** Flat tenant boundary used by the provider-neutral Finance persistence seam. */
interface FinanceRecordStoreScope {
  readonly companyId: string;
  readonly schoolId?: string;
}

/** Immutable Finance fact values accepted by raw persistence. */
interface FinanceRecordStoreInput extends FinanceRecordStoreScope {
  readonly recordId: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly sourceSystem: string;
  readonly sourceVersion: string;
  readonly sourceRecordId: string;
  readonly importBatchId: string;
  readonly payloadDigest: string;
  readonly evidenceReference: string;
  readonly supersedesRecordId?: string;
  readonly correctionReason?: string;
}

/** Minimal immutable success-audit data retained inside the record transaction. */
interface FinanceRecordSuccessAuditInput extends FinanceRecordStoreScope {
  readonly eventId: string;
  readonly actorSubjectId: string;
  readonly operation:
    | "financial-record:import"
    | "financial-record:append-correction";
  readonly objectId: string;
  readonly occurredAt: string;
  readonly requestId: string;
  readonly correlationId: string;
}

/** Result of accepting a Finance record through raw persistence. */
interface FinanceRecordStoreAppendResult {
  readonly outcome: "inserted" | "existing";
  readonly row: FinanceRecordStoreInput;
}

/** Expected atomic method for a record and its durable success audit/outbox. */
interface FinanceOperationsRecordStore {
  /** Atomically accepts a new record and appends its immutable success audit/outbox. */
  appendWithSuccessAudit(
    input: Readonly<FinanceRecordStoreInput>,
    audit: Readonly<FinanceRecordSuccessAuditInput>,
  ): Promise<FinanceRecordStoreAppendResult>;
}

/** Expected database package exports for the bounded atomic acceptance seam. */
interface FinanceOperationsRecordStoreModule {
  /** Creates raw Finance persistence over one PostgreSQL client. */
  createPostgresFinanceOperationsRecordStore(
    sql: postgres.Sql,
  ): FinanceOperationsRecordStore;
}

/** One captured tagged-SQL statement and its parameters. */
interface CapturedStatement {
  readonly statement: string;
  readonly values: readonly unknown[];
}

/** Creates a valid exact-money Finance record fixture. */
function recordInput(
  overrides: Partial<FinanceRecordStoreInput> = {},
): FinanceRecordStoreInput {
  return {
    companyId: "company-amber",
    schoolId: "school-north",
    recordId: "finance-record-atomic-0001",
    amountMinor: "250",
    currency: "THB",
    sourceSystem: "tutor-export",
    sourceVersion: "finance-v1",
    sourceRecordId: "tutor-row-atomic-0001",
    importBatchId: "finance-import-0001",
    payloadDigest: "a".repeat(64),
    evidenceReference:
      "private-evidence://company-amber/finance/records/atomic-0001.json",
    ...overrides,
  };
}

/** Creates the immutable success-audit metadata that must commit with a new fact. */
function successAudit(
  record: Readonly<FinanceRecordStoreInput>,
  operation: FinanceRecordSuccessAuditInput["operation"] = "financial-record:import",
): FinanceRecordSuccessAuditInput {
  return {
    companyId: record.companyId,
    schoolId: record.schoolId,
    eventId: "finance-audit-atomic-0001",
    actorSubjectId: "employee-0001",
    operation,
    objectId: record.recordId,
    occurredAt: "2026-08-10T02:04:05.678Z",
    requestId: "request-atomic-0001",
    correlationId: "correlation-atomic-0001",
  };
}

/** Maps the source fixture to a PostgreSQL record row. */
function recordRow(
  input: Readonly<FinanceRecordStoreInput>,
): Record<string, unknown> {
  return {
    company_id: input.companyId,
    school_id: input.schoolId ?? null,
    record_id: input.recordId,
    amount_minor: input.amountMinor,
    currency: input.currency,
    source_system: input.sourceSystem,
    source_version: input.sourceVersion,
    source_record_id: input.sourceRecordId,
    import_batch_id: input.importBatchId,
    payload_digest: input.payloadDigest,
    evidence_reference: input.evidenceReference,
    supersedes_record_id: null,
    correction_reason: null,
  };
}

/** Creates a transaction-aware tagged-SQL double with deterministic statement outcomes. */
function scriptedDatabase(
  outcomes: readonly (readonly Record<string, unknown>[] | Error)[],
): {
  readonly beginCalls: { count: number };
  readonly statements: CapturedStatement[];
  readonly sql: postgres.Sql;
} {
  const pending = [...outcomes];
  const statements: CapturedStatement[] = [];
  const beginCalls = { count: 0 };
  const tagged = vi.fn(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      statements.push({ statement: strings.join("?"), values });
      const outcome = pending.shift();
      if (outcome === undefined) throw new Error("Unexpected SQL statement.");
      if (outcome instanceof Error) throw outcome;
      return outcome;
    },
  );
  const transaction = tagged as unknown as postgres.TransactionSql;
  const sql = tagged as unknown as postgres.Sql;
  Object.assign(sql, {
    begin: async <T>(work: (active: postgres.TransactionSql) => Promise<T>) => {
      beginCalls.count += 1;
      return await work(transaction);
    },
  });
  return { beginCalls, statements, sql };
}

/** Loads the atomically extended store only when this RED behavior executes. */
async function loadRecordStore(): Promise<FinanceOperationsRecordStoreModule> {
  return (await import("../finance-operations-record-store.js")) as unknown as FinanceOperationsRecordStoreModule;
}

describe("Finance Operations atomic accepted-record audit persistence", () => {
  it("rejects a correction audit operation for an ordinary imported record", async () => {
    const record = recordInput();
    const database = scriptedDatabase([]);
    const { createPostgresFinanceOperationsRecordStore } =
      await loadRecordStore();
    const store = createPostgresFinanceOperationsRecordStore(database.sql);

    await expect(
      store.appendWithSuccessAudit(
        record,
        successAudit(record, "financial-record:append-correction"),
      ),
    ).rejects.toMatchObject({
      code: "INTEGRITY_FAILURE",
      retryable: false,
      message:
        "Finance success audit operation does not match the accepted record.",
    });
    expect(database.beginCalls.count).toBe(0);
    expect(database.statements).toHaveLength(0);
  });

  it("rejects an import audit operation for an append-only correction", async () => {
    const correction = recordInput({
      recordId: "finance-record-atomic-correction-0001",
      sourceRecordId: "tutor-row-atomic-correction-0001",
      supersedesRecordId: "finance-record-atomic-0001",
      correctionReason: "Corrected an accepted source value.",
    });
    const database = scriptedDatabase([]);
    const { createPostgresFinanceOperationsRecordStore } =
      await loadRecordStore();
    const store = createPostgresFinanceOperationsRecordStore(database.sql);

    await expect(
      store.appendWithSuccessAudit(
        correction,
        successAudit(correction, "financial-record:import"),
      ),
    ).rejects.toMatchObject({
      code: "INTEGRITY_FAILURE",
      retryable: false,
      message:
        "Finance success audit operation does not match the accepted record.",
    });
    expect(database.beginCalls.count).toBe(0);
    expect(database.statements).toHaveLength(0);
  });

  it("rolls back the new record when its same-transaction immutable success audit/outbox rejects", async () => {
    const record = recordInput();
    const database = scriptedDatabase([
      [recordRow(record)],
      new Error("success audit outbox rejected"),
    ]);
    const { createPostgresFinanceOperationsRecordStore } =
      await loadRecordStore();
    const store = createPostgresFinanceOperationsRecordStore(database.sql);

    expect(store).not.toHaveProperty("compareAndAppend");
    await expect(
      store.appendWithSuccessAudit(record, successAudit(record)),
    ).rejects.toMatchObject({
      code: "UNAVAILABLE",
      retryable: true,
      message: "Finance record persistence is temporarily unavailable.",
    });
    expect(database.beginCalls.count).toBe(1);
    expect(database.statements).toHaveLength(2);
    expect(database.statements[0]?.statement).toContain(
      "INSERT INTO finance_records",
    );
    expect(database.statements[1]?.statement).toContain(
      "INSERT INTO finance_record_success_audit_outbox",
    );
  });
});

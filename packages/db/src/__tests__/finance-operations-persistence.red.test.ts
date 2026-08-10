import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const FINANCE_SCHEMA_PATH = resolve(
  PACKAGE_ROOT,
  "src/schema/finance-operations.ts",
);
const FINANCE_MIGRATION_PATH = resolve(
  PACKAGE_ROOT,
  "drizzle/0050_finance_operations_records.sql",
);

/** Flat tenant boundary used by the database-owned Finance record store. */
interface FinanceRecordStoreScope {
  readonly companyId: string;
  readonly schoolId?: string;
}

/** Flattened immutable record values accepted by the database store. */
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

/** Immutable local success event that must commit with an accepted record. */
interface FinanceRecordSuccessAuditInput extends FinanceRecordStoreScope {
  readonly eventId: string;
  readonly actorSubjectId: string;
  readonly operation: "financial-record:import";
  readonly objectId: string;
  readonly occurredAt: string;
  readonly requestId: string;
  readonly correlationId: string;
}

/** Raw immutable Finance record row returned by the database store. */
type FinanceRecordStoreRow = FinanceRecordStoreInput;

/** Outcome from atomically inserting or locking one Finance record identity. */
interface FinanceRecordStoreAppendResult {
  readonly outcome: "inserted" | "existing";
  readonly row: FinanceRecordStoreRow;
}

/** Expected low-level PostgreSQL persistence boundary for Finance records. */
interface FinanceOperationsRecordStore {
  /** Looks up one Finance record without crossing its company and school scope. */
  findByRecordId(
    identity: Readonly<FinanceRecordStoreScope & { readonly recordId: string }>,
  ): Promise<FinanceRecordStoreRow | null>;
  /** Atomically accepts a record and its idempotent local success event. */
  appendWithSuccessAudit(
    input: Readonly<FinanceRecordStoreInput>,
    audit: Readonly<FinanceRecordSuccessAuditInput>,
  ): Promise<FinanceRecordStoreAppendResult>;
}

/** Expected exports of the future Finance Operations raw PostgreSQL store. */
interface FinanceOperationsRecordStoreModule {
  /** Constructs a provider-neutral Finance record store over one PostgreSQL client. */
  createPostgresFinanceOperationsRecordStore(
    sql: postgres.Sql,
  ): FinanceOperationsRecordStore;
}

/** Produces an immutable source record fixture with a valid Finance contract shape. */
function recordInput(
  overrides: Partial<FinanceRecordStoreInput> = {},
): FinanceRecordStoreInput {
  return {
    companyId: "company-amber",
    schoolId: "school-north",
    recordId: "finance-record-001",
    amountMinor: "12500",
    currency: "THB",
    sourceSystem: "tutor-export",
    sourceVersion: "2026-08-10",
    sourceRecordId: "tutor-row-001",
    importBatchId: "batch-001",
    payloadDigest: "a".repeat(64),
    evidenceReference: "private-evidence://company-amber/finance/receipt-001",
    ...overrides,
  };
}

/** Creates valid, scope-matched success metadata for one immutable record. */
function successAudit(
  record: Readonly<FinanceRecordStoreInput>,
  suffix = "001",
): FinanceRecordSuccessAuditInput {
  return {
    companyId: record.companyId,
    ...(record.schoolId === undefined ? {} : { schoolId: record.schoolId }),
    eventId: `finance-audit-${suffix}`,
    actorSubjectId: "employee-001",
    operation: "financial-record:import",
    objectId: record.recordId,
    occurredAt: "2026-08-10T02:04:05.678Z",
    requestId: `request-${suffix}`,
    correlationId: `correlation-${suffix}`,
  };
}

/** Converts a store fixture into the snake-case PostgreSQL row returned by postgres.js. */
function postgresRow(
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
    supersedes_record_id: input.supersedesRecordId ?? null,
    correction_reason: input.correctionReason ?? null,
  };
}

/** Converts success metadata into the snake-case row returned by PostgreSQL. */
function postgresAuditRow(
  audit: Readonly<FinanceRecordSuccessAuditInput>,
): Record<string, unknown> {
  return {
    event_id: audit.eventId,
    company_id: audit.companyId,
    school_id: audit.schoolId ?? null,
    actor_subject_id: audit.actorSubjectId,
    operation: audit.operation,
    object_id: audit.objectId,
    occurred_at: audit.occurredAt,
    request_id: audit.requestId,
    correlation_id: audit.correlationId,
  };
}

type ScriptedOutcome = readonly Record<string, unknown>[] | Error;

/** One SQL statement and its bound values captured by the postgres.js test double. */
interface CapturedStatement {
  readonly statement: string;
  readonly values: readonly unknown[];
}

/** Transaction-aware PostgreSQL test double that returns scripted query outcomes. */
function scriptedDatabase(outcomes: readonly ScriptedOutcome[]): {
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

/** Loads the future Finance record store only when a RED behavioral test executes. */
async function loadRecordStore(): Promise<FinanceOperationsRecordStoreModule> {
  return (await import("../finance-operations-record-store.js")) as unknown as FinanceOperationsRecordStoreModule;
}

/** Normalizes formatting and quoted PostgreSQL identifiers for migration assertions. */
function normalizedSql(sql: string): string {
  return sql.replaceAll('"', "").replace(/\s+/gu, " ").trim();
}

describe("Finance Operations persistence schema and migration contract", () => {
  it("exports finance_records through the schema and database barrels", async () => {
    const schemaSource = await readFile(FINANCE_SCHEMA_PATH, "utf8");

    expect(schemaSource).toContain("financeRecords");
    expect(schemaSource).toContain("finance_records");
    await expect(
      import("../schema/finance-operations.js"),
    ).resolves.toHaveProperty("financeRecords");
    await expect(import("../schema/index.js")).resolves.toHaveProperty(
      "financeRecords",
    );
    await expect(import("../index.js")).resolves.toHaveProperty(
      "financeRecords",
    );
  }, 15_000);

  it("requires text-only exact money, currency, digest, and private-evidence values", async () => {
    const migration = await readFile(FINANCE_MIGRATION_PATH, "utf8");
    const sql = normalizedSql(migration);

    for (const column of [
      "amount_minor text NOT NULL",
      "currency text NOT NULL",
      "payload_digest text NOT NULL",
      "evidence_reference text NOT NULL",
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain("0|[1-9][0-9]*|-[1-9][0-9]*");
    expect(sql).toContain("^[A-Z]{3}$");
    expect(sql).toContain("^[a-f0-9]{64}$");
    expect(sql).toContain("private-evidence://");
    expect(sql).toMatch(/evidence_reference[^;]*NOT LIKE '%\/\.\.\/%'/u);
    expect(sql).toContain("evidence_reference NOT LIKE '%/..'");
    expect(sql).toContain("evidence_reference NOT LIKE '%/.'");
  });

  it("keeps correction references paired, distinct, and scoped by nullable-school partial identities", async () => {
    const sql = normalizedSql(await readFile(FINANCE_MIGRATION_PATH, "utf8"));

    expect(sql).toMatch(
      /CHECK \(\(supersedes_record_id IS NULL\) = \(correction_reason IS NULL\)\)/u,
    );
    expect(sql).toMatch(
      /CHECK \(supersedes_record_id IS NULL OR supersedes_record_id <> record_id\)/u,
    );
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX [a-z0-9_]+ ON (?:public\.)?finance_records \(company_id, record_id\) WHERE school_id IS NULL/u,
    );
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX [a-z0-9_]+ ON (?:public\.)?finance_records \(company_id, school_id, record_id\) WHERE school_id IS NOT NULL/u,
    );
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX [a-z0-9_]+ ON (?:public\.)?finance_records \(company_id, source_system, source_version, source_record_id\) WHERE school_id IS NULL/u,
    );
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX [a-z0-9_]+ ON (?:public\.)?finance_records \(company_id, school_id, source_system, source_version, source_record_id\) WHERE school_id IS NOT NULL/u,
    );
  });

  it("uses database-owned append-only triggers and only revokes mutation privileges when app_user exists", async () => {
    const sql = normalizedSql(await readFile(FINANCE_MIGRATION_PATH, "utf8"));

    expect(sql).toMatch(
      /CREATE TRIGGER [a-z0-9_]+ BEFORE UPDATE OR DELETE OR TRUNCATE ON public\.finance_records/u,
    );
    expect(sql).toMatch(
      /CREATE TRIGGER finance_record_success_audit_outbox_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public\.finance_record_success_audit_outbox/u,
    );
    expect(sql).toMatch(/RAISE EXCEPTION[^;]+append-only/iu);
    expect(sql).toMatch(
      /DO \$\$.*IF EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'app_user'\).*EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public\.finance_records FROM app_user'.*END IF.*\$\$/u,
    );
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.finance_record_success_audit_outbox_reject_mutation() FROM PUBLIC",
    );
  });
});

describe("Finance Operations PostgreSQL record-store contract", () => {
  it("inserts first, then locks exactly one record-or-source collision in one transaction", async () => {
    const input = recordInput({ schoolId: undefined });
    const audit = successAudit(input, "existing");
    const database = scriptedDatabase([
      [],
      [postgresRow(input)],
      [],
      [postgresAuditRow(audit)],
    ]);
    const { createPostgresFinanceOperationsRecordStore } =
      await loadRecordStore();
    const store = createPostgresFinanceOperationsRecordStore(database.sql);

    expect(store).not.toHaveProperty("compareAndAppend");
    await expect(store.appendWithSuccessAudit(input, audit)).resolves.toEqual({
      outcome: "existing",
      row: input,
    });

    expect(database.beginCalls.count).toBe(1);
    expect(database.statements).toHaveLength(4);
    expect(database.statements[0]?.statement).toContain(
      "INSERT INTO finance_records",
    );
    expect(database.statements[0]?.statement).toContain(
      "ON CONFLICT DO NOTHING",
    );
    expect(database.statements[1]?.statement).toContain("FOR UPDATE");
    expect(database.statements[1]?.statement).toContain("record_id =");
    expect(database.statements[1]?.statement).toContain("source_system =");
    expect(database.statements[1]?.statement).toContain("source_version =");
    expect(database.statements[1]?.statement).toContain("source_record_id =");
    expect(database.statements[1]?.statement).toContain(" OR ");
    expect(database.statements[1]?.statement).toContain("IS NOT DISTINCT FROM");
    expect(database.statements[1]?.values).toContain(null);
    expect(database.statements[2]?.statement).toContain(
      "INSERT INTO finance_record_success_audit_outbox",
    );
    expect(database.statements[3]?.statement).toContain(
      "FROM finance_record_success_audit_outbox",
    );
    expect(database.statements[3]?.statement).toContain("FOR UPDATE");
  });

  it("uses IS NOT DISTINCT FROM with null school scope for non-mutating record lookups", async () => {
    const input = recordInput({ schoolId: undefined });
    const database = scriptedDatabase([[postgresRow(input)]]);
    const { createPostgresFinanceOperationsRecordStore } =
      await loadRecordStore();
    const store = createPostgresFinanceOperationsRecordStore(database.sql);

    await expect(
      store.findByRecordId({
        companyId: input.companyId,
        recordId: input.recordId,
      }),
    ).resolves.toEqual(input);

    expect(database.beginCalls.count).toBe(0);
    expect(database.statements).toHaveLength(1);
    expect(database.statements[0]?.statement).toContain("IS NOT DISTINCT FROM");
    expect(database.statements[0]?.statement).not.toContain("FOR UPDATE");
    expect(database.statements[0]?.values).toContain(null);
  });

  it("does not conflate otherwise-identical records from another company or school", async () => {
    const companyPeer = recordInput({
      companyId: "company-indigo",
      evidenceReference:
        "private-evidence://company-indigo/finance/receipt-001",
    });
    const schoolPeer = recordInput({ schoolId: "school-south" });
    const database = scriptedDatabase([
      [postgresRow(companyPeer)],
      [{ event_id: "finance-audit-company-peer" }],
      [postgresRow(schoolPeer)],
      [{ event_id: "finance-audit-school-peer" }],
    ]);
    const { createPostgresFinanceOperationsRecordStore } =
      await loadRecordStore();
    const store = createPostgresFinanceOperationsRecordStore(database.sql);

    await expect(
      store.appendWithSuccessAudit(
        companyPeer,
        successAudit(companyPeer, "company-peer"),
      ),
    ).resolves.toEqual({ outcome: "inserted", row: companyPeer });
    await expect(
      store.appendWithSuccessAudit(
        schoolPeer,
        successAudit(schoolPeer, "school-peer"),
      ),
    ).resolves.toEqual({ outcome: "inserted", row: schoolPeer });

    expect(database.beginCalls.count).toBe(2);
    expect(database.statements).toHaveLength(4);
    expect(database.statements[0]?.values).toContain("company-indigo");
    expect(database.statements[2]?.values).toContain("school-south");
  });

  it("fails closed with a bounded non-retryable integrity error when a conflict locks no row", async () => {
    const database = scriptedDatabase([[], []]);
    const { createPostgresFinanceOperationsRecordStore } =
      await loadRecordStore();
    const store = createPostgresFinanceOperationsRecordStore(database.sql);

    const input = recordInput();
    await expect(
      store.appendWithSuccessAudit(input, successAudit(input, "conflict")),
    ).rejects.toMatchObject({ code: "INTEGRITY_FAILURE", retryable: false });
  });
});

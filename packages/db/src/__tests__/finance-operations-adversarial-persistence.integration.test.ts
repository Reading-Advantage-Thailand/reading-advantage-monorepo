import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PG_TEST_URL = process.env.PG_TEST_URL;
const isolatedSuite = PG_TEST_URL === undefined ? describe.skip : describe;
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const MIGRATION_PATH = resolve(
  PACKAGE_ROOT,
  "drizzle/0050_finance_operations_records.sql",
);
const JOURNAL_PATH = resolve(PACKAGE_ROOT, "drizzle/meta/_journal.json");
const DOCTOR_PATH = resolve(PACKAGE_ROOT, "scripts/migration-ledger-doctor.ts");
const TSX_PATH =
  process.env.FINANCE_TEST_TSX_PATH ??
  resolve(PACKAGE_ROOT, "../../node_modules/tsx/dist/cli.mjs");

/** Raw result returned after an atomic Finance record append. */
interface FinanceRecordAppendResult {
  readonly outcome: "inserted" | "existing";
}

/** Bounded raw store surface used to prove a Finance success audit commits atomically. */
interface FinanceRecordStore {
  /** Appends a record and its immutable success audit/outbox in one transaction. */
  appendWithSuccessAudit(
    record: Record<string, unknown>,
    audit: Record<string, unknown>,
  ): Promise<FinanceRecordAppendResult>;
}

/** Expected module exports for the Finance raw PostgreSQL store. */
interface FinanceRecordStoreModule {
  /** Creates the raw Finance record store over an isolated PostgreSQL client. */
  createPostgresFinanceOperationsRecordStore(
    sql: ReturnType<typeof postgres>,
  ): FinanceRecordStore;
}

/** Replaces the database path in an administrator URL with an isolated database. */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/** Creates a valid raw Finance-record insertion fixture with narrow overrides. */
function recordValues(
  overrides: Partial<{
    readonly companyId: string;
    readonly schoolId: string | null;
    readonly recordId: string;
    readonly sourceSystem: string;
    readonly sourceVersion: string;
    readonly sourceRecordId: string;
    readonly importBatchId: string;
    readonly amountMinor: string;
    readonly currency: string;
    readonly payloadDigest: string;
    readonly evidenceReference: string;
  }> = {},
) {
  return {
    companyId: "company-amber",
    schoolId: "school-north",
    recordId: `finance-record-${Math.random().toString(36).slice(2, 10)}`,
    sourceSystem: "tutor-export",
    sourceVersion: "finance-v1",
    sourceRecordId: `tutor-row-${Math.random().toString(36).slice(2, 10)}`,
    importBatchId: "finance-import-0001",
    amountMinor: "250",
    currency: "THB",
    payloadDigest: "a".repeat(64),
    evidenceReference:
      "private-evidence://company-amber/finance/direct-insert-fixture.json",
    ...overrides,
  };
}

/** Inserts one raw Finance record so database invariants cannot be bypassed by an adapter. */
async function insertRecord(
  database: ReturnType<typeof postgres>,
  input: ReturnType<typeof recordValues>,
  supersedesRecordId: string | null = null,
  correctionReason: string | null = null,
): Promise<void> {
  await database.unsafe(
    `INSERT INTO finance_records (
       company_id, school_id, record_id, amount_minor, currency,
       source_system, source_version, source_record_id, import_batch_id,
       payload_digest, evidence_reference, supersedes_record_id, correction_reason
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      input.companyId,
      input.schoolId,
      input.recordId,
      input.amountMinor,
      input.currency,
      input.sourceSystem,
      input.sourceVersion,
      input.sourceRecordId,
      input.importBatchId,
      input.payloadDigest,
      input.evidenceReference,
      supersedesRecordId,
      correctionReason,
    ],
  );
}

/** Creates valid raw outbox values with narrow adversarial overrides. */
function outboxValues(
  overrides: Partial<{
    readonly eventId: string;
    readonly companyId: string;
    readonly schoolId: string | null;
    readonly actorSubjectId: string;
    readonly objectId: string;
    readonly requestId: string;
    readonly correlationId: string;
  }> = {},
) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return {
    eventId: `finance-audit-${suffix}`,
    companyId: "company-amber",
    schoolId: "school-north",
    actorSubjectId: "employee-0001",
    objectId: `finance-record-${suffix}`,
    requestId: `request-${suffix}`,
    correlationId: `correlation-${suffix}`,
    ...overrides,
  };
}

/** Inserts one raw success-audit event to exercise database-owned outbox checks. */
async function insertOutbox(
  database: ReturnType<typeof postgres>,
  input: ReturnType<typeof outboxValues>,
): Promise<void> {
  await database.unsafe(
    `INSERT INTO finance_record_success_audit_outbox (
       event_id, company_id, school_id, actor_subject_id, operation,
       object_id, occurred_at, request_id, correlation_id
     ) VALUES ($1, $2, $3, $4, 'financial-record:import', $5, $6, $7, $8)`,
    [
      input.eventId,
      input.companyId,
      input.schoolId,
      input.actorSubjectId,
      input.objectId,
      "2026-08-10T02:04:05.678Z",
      input.requestId,
      input.correlationId,
    ],
  );
}

/** Loads the raw Finance store only inside its live PostgreSQL acceptance path. */
async function loadRecordStore(): Promise<FinanceRecordStoreModule> {
  return (await import("../finance-operations-record-store.js")) as unknown as FinanceRecordStoreModule;
}

/** Captures the migration-doctor process exit status and output. */
async function runDoctor(databaseUrl: string): Promise<{
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}> {
  return await new Promise((resolveResult, reject) => {
    const child = spawn(
      process.execPath,
      [
        TSX_PATH,
        DOCTOR_PATH,
        "--check",
        "--required-migration",
        "0050_finance_operations_records",
      ],
      {
        cwd: PACKAGE_ROOT,
        env: {
          ...process.env,
          DATABASE_URL: undefined,
          DIRECT_DATABASE_URL: databaseUrl,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("close", (status) => {
      resolveResult({ status, stdout, stderr });
    });
  });
}

let admin: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof postgres> | undefined;
let databaseName = "";
let databaseUrl = "";

isolatedSuite("Finance Operations adversarial PostgreSQL persistence", () => {
  beforeAll(async () => {
    if (PG_TEST_URL === undefined) return;
    databaseName = `finance_adversarial_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    admin = postgres(PG_TEST_URL, { max: 1, prepare: false });
    await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    databaseUrl = withDatabase(PG_TEST_URL, databaseName);
    database = postgres(databaseUrl, { max: 1, prepare: false });

    const migration = await readFile(MIGRATION_PATH, "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim().length > 0) await database.unsafe(statement);
    }
    const journal = JSON.parse(await readFile(JOURNAL_PATH, "utf8")) as {
      entries: ReadonlyArray<{ readonly tag: string; readonly when: number }>;
    };
    const entry = journal.entries.find(
      (candidate) => candidate.tag === "0050_finance_operations_records",
    );
    if (entry === undefined) {
      throw new Error("Finance migration is missing from the Drizzle journal.");
    }
    await database.unsafe(`
      CREATE SCHEMA drizzle;
      CREATE TABLE drizzle.__drizzle_migrations (
        id serial PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint NOT NULL
      );
    `);
    await database.unsafe(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
       VALUES ($1, $2)`,
      [createHash("sha256").update(migration).digest("hex"), entry.when],
    );
  }, 30_000);

  afterAll(async () => {
    await database?.end({ timeout: 5 });
    if (admin !== undefined && databaseName !== "") {
      await admin.unsafe(
        `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
      );
    }
    await admin?.end({ timeout: 5 });
  }, 30_000);

  it("rejects POSIX-whitespace-only record and outbox values while allowing internal whitespace", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const whitespaceOnly = " \t\n\r\f\v ";
    for (const field of [
      "companyId",
      "schoolId",
      "recordId",
      "sourceSystem",
      "sourceVersion",
      "sourceRecordId",
      "importBatchId",
    ] as const) {
      await expect(
        insertRecord(
          database,
          recordValues({
            recordId: `finance-record-whitespace-${field}`,
            sourceRecordId: `tutor-row-whitespace-${field}`,
            [field]: whitespaceOnly,
          }),
        ),
        `${field} must be rejected before a raw insert can persist`,
      ).rejects.toThrow();
    }

    const superseded = recordValues({
      recordId: "finance-record-whitespace-correction-base",
      sourceRecordId: "tutor-row-whitespace-correction-base",
    });
    await insertRecord(database, superseded);
    await expect(
      insertRecord(
        database,
        recordValues({
          recordId: "finance-record-whitespace-correction",
          sourceRecordId: "tutor-row-whitespace-correction",
        }),
        superseded.recordId,
        whitespaceOnly,
      ),
      "correctionReason must reject every POSIX whitespace control",
    ).rejects.toThrow();

    for (const field of [
      "eventId",
      "companyId",
      "schoolId",
      "actorSubjectId",
      "objectId",
      "requestId",
      "correlationId",
    ] as const) {
      await expect(
        insertOutbox(
          database,
          outboxValues({
            eventId: `finance-audit-whitespace-${field}`,
            [field]: whitespaceOnly,
          }),
        ),
        `${field} must be rejected before a raw outbox insert can persist`,
      ).rejects.toThrow();
    }

    await expect(
      insertRecord(
        database,
        recordValues({
          recordId: "finance-record-internal-whitespace",
          sourceSystem: "tutor \t export\nfeed",
          sourceRecordId: "tutor-row-internal-whitespace",
        }),
      ),
    ).resolves.toBeUndefined();
    await expect(
      insertOutbox(
        database,
        outboxValues({ requestId: "request \t with\ninternal whitespace" }),
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects UPDATE, DELETE, and TRUNCATE for Finance facts and success outbox events", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const record = recordValues();
    await insertRecord(database, record);

    await expect(
      database.unsafe(
        "UPDATE finance_records SET amount_minor = '251' WHERE company_id = $1 AND school_id = $2 AND record_id = $3",
        [record.companyId, record.schoolId, record.recordId],
      ),
    ).rejects.toThrow(/append-only/u);
    await expect(
      database.unsafe(
        "DELETE FROM finance_records WHERE company_id = $1 AND school_id = $2 AND record_id = $3",
        [record.companyId, record.schoolId, record.recordId],
      ),
    ).rejects.toThrow(/append-only/u);
    await expect(database.unsafe("TRUNCATE finance_records")).rejects.toThrow(
      /append-only/u,
    );

    const outbox = outboxValues({
      eventId: "finance-audit-append-only-live",
      objectId: record.recordId,
    });
    await insertOutbox(database, outbox);
    await expect(
      database.unsafe(
        "UPDATE finance_record_success_audit_outbox SET request_id = 'changed' WHERE event_id = $1",
        [outbox.eventId],
      ),
    ).rejects.toThrow(/append-only/u);
    await expect(
      database.unsafe(
        "DELETE FROM finance_record_success_audit_outbox WHERE event_id = $1",
        [outbox.eventId],
      ),
    ).rejects.toThrow(/append-only/u);
    await expect(
      database.unsafe("TRUNCATE finance_record_success_audit_outbox"),
    ).rejects.toThrow(/append-only/u);
  });

  it("revokes PUBLIC execution of all three Finance trigger functions", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    for (const triggerFunction of [
      "finance_records_reject_mutation",
      "finance_records_validate_supersession",
      "finance_record_success_audit_outbox_reject_mutation",
    ]) {
      await expect(
        database.unsafe(
          `SELECT has_function_privilege('public', 'public.${triggerFunction}()', 'EXECUTE') AS executable`,
        ),
        `${triggerFunction} must not remain executable by PUBLIC`,
      ).resolves.toEqual([{ executable: false }]);
    }
  });

  it("rejects orphan and scope-crossing supersession through raw direct inserts", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const base = recordValues({ recordId: "finance-record-superseded-0001" });
    await insertRecord(database, base);

    await expect(
      insertRecord(
        database,
        recordValues({ recordId: "finance-record-orphan-correction-0001" }),
        "missing-record",
        "Correcting an accepted source value.",
      ),
    ).rejects.toThrow(/superseded/u);
    await expect(
      insertRecord(
        database,
        recordValues({
          companyId: "company-indigo",
          recordId: "finance-record-other-company-correction-0001",
        }),
        base.recordId,
        "Correcting an accepted source value.",
      ),
    ).rejects.toThrow(/superseded/u);
    await expect(
      insertRecord(
        database,
        recordValues({
          schoolId: "school-south",
          recordId: "finance-record-other-school-correction-0001",
        }),
        base.recordId,
        "Correcting an accepted source value.",
      ),
    ).rejects.toThrow(/superseded/u);
  });

  it("rolls back a new record when its same-transaction success audit/outbox insert is rejected", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const record = recordValues({
      recordId: "finance-record-atomic-outbox-0001",
    });
    await database.unsafe(`
      CREATE FUNCTION finance_record_success_audit_outbox_test_reject()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'success audit outbox rejected';
      END;
      $$;
      CREATE TRIGGER finance_record_success_audit_outbox_test_reject
      BEFORE INSERT ON finance_record_success_audit_outbox
      FOR EACH ROW
      EXECUTE FUNCTION finance_record_success_audit_outbox_test_reject();
    `);
    const { createPostgresFinanceOperationsRecordStore } =
      await loadRecordStore();
    const store = createPostgresFinanceOperationsRecordStore(database);

    await expect(
      store.appendWithSuccessAudit(record, {
        companyId: record.companyId,
        schoolId: record.schoolId,
        eventId: "finance-audit-atomic-outbox-0001",
        actorSubjectId: "employee-0001",
        operation: "financial-record:import",
        objectId: record.recordId,
        occurredAt: "2026-08-10T02:04:05.678Z",
        requestId: "request-atomic-outbox-0001",
        correlationId: "correlation-atomic-outbox-0001",
      }),
    ).rejects.toMatchObject({
      code: "UNAVAILABLE",
      retryable: true,
      message: "Finance record persistence is temporarily unavailable.",
    });
    await expect(
      database.unsafe(
        "SELECT count(*)::int AS count FROM finance_records WHERE record_id = $1",
        [record.recordId],
      ),
    ).resolves.toEqual([{ count: 0 }]);
    await expect(
      database.unsafe(
        "SELECT count(*)::int AS count FROM finance_record_success_audit_outbox WHERE event_id = $1",
        ["finance-audit-atomic-outbox-0001"],
      ),
    ).resolves.toEqual([{ count: 0 }]);
  });

  it("makes the doctor reject same-name drift in every required Finance trigger", async () => {
    if (database === undefined || databaseUrl === "") {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const healthy = await runDoctor(databaseUrl);
    expect(
      healthy.status,
      `Doctor rejected healthy Finance migration. stdout=${healthy.stdout} stderr=${healthy.stderr}`,
    ).toBe(0);

    await database.unsafe(
      "ALTER TABLE public.finance_records DISABLE TRIGGER finance_records_append_only",
    );
    const disabled = await runDoctor(databaseUrl);
    expect(disabled.status).toBe(1);
    expect(`${disabled.stdout}\n${disabled.stderr}`).toMatch(/DIVERGENCE/u);
    await database.unsafe(
      "ALTER TABLE public.finance_records ENABLE TRIGGER finance_records_append_only",
    );
    const reenabled = await runDoctor(databaseUrl);
    expect(
      reenabled.status,
      `Doctor rejected the re-enabled Finance trigger. stdout=${reenabled.stdout} stderr=${reenabled.stderr}`,
    ).toBe(0);

    await database.unsafe(`
      CREATE OR REPLACE FUNCTION public.finance_records_reject_mutation()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = pg_catalog
      AS $$
      BEGIN
        RETURN OLD;
      END;
      $$;
    `);
    const replacedBody = await runDoctor(databaseUrl);
    expect(replacedBody.status).toBe(1);
    expect(`${replacedBody.stdout}\n${replacedBody.stderr}`).toMatch(
      /DIVERGENCE/u,
    );
    await database.unsafe(`
      CREATE OR REPLACE FUNCTION public.finance_records_reject_mutation()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = pg_catalog
      AS $$
      BEGIN
        RAISE EXCEPTION 'finance_records is append-only';
      END;
      $$;
    `);
    const restoredBody = await runDoctor(databaseUrl);
    expect(
      restoredBody.status,
      `Doctor rejected the restored Finance trigger body. stdout=${restoredBody.stdout} stderr=${restoredBody.stderr}`,
    ).toBe(0);

    await database.unsafe(`
      CREATE FUNCTION public.finance_operations_wrong_trigger()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RETURN NEW;
      END;
      $$;
    `);
    for (const driftCase of [
      {
        trigger: "finance_records_append_only",
        table: "finance_records",
        restore: `CREATE TRIGGER finance_records_append_only
          BEFORE UPDATE OR DELETE OR TRUNCATE ON public.finance_records
          FOR EACH STATEMENT
          EXECUTE FUNCTION public.finance_records_reject_mutation()`,
      },
      {
        trigger: "finance_records_validate_supersession",
        table: "finance_records",
        restore: `CREATE TRIGGER finance_records_validate_supersession
          BEFORE INSERT ON public.finance_records
          FOR EACH ROW
          EXECUTE FUNCTION public.finance_records_validate_supersession()`,
      },
      {
        trigger: "finance_record_success_audit_outbox_append_only",
        table: "finance_record_success_audit_outbox",
        restore: `CREATE TRIGGER finance_record_success_audit_outbox_append_only
          BEFORE UPDATE OR DELETE OR TRUNCATE
          ON public.finance_record_success_audit_outbox
          FOR EACH STATEMENT
          EXECUTE FUNCTION public.finance_record_success_audit_outbox_reject_mutation()`,
      },
    ] as const) {
      await database.unsafe(
        `DROP TRIGGER ${driftCase.trigger} ON public.${driftCase.table}`,
      );
      await database.unsafe(`
        CREATE TRIGGER ${driftCase.trigger}
        AFTER INSERT ON public.${driftCase.table}
        FOR EACH ROW
        EXECUTE FUNCTION public.finance_operations_wrong_trigger();
      `);
      await expect(
        database.unsafe(
          "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
          [driftCase.table],
        ),
      ).resolves.toEqual([{ "?column?": 1 }]);

      const drifted = await runDoctor(databaseUrl);
      expect(
        drifted.status,
        `${driftCase.trigger} drift escaped the composite sentinel`,
      ).toBe(1);
      expect(`${drifted.stdout}\n${drifted.stderr}`).toMatch(/DIVERGENCE/u);

      await database.unsafe(
        `DROP TRIGGER ${driftCase.trigger} ON public.${driftCase.table}`,
      );
      await database.unsafe(driftCase.restore);
      const restored = await runDoctor(databaseUrl);
      expect(
        restored.status,
        `Doctor rejected restored ${driftCase.trigger}. stdout=${restored.stdout} stderr=${restored.stderr}`,
      ).toBe(0);
    }
  }, 30_000);
});

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PG_TEST_URL = process.env.PG_TEST_URL;
const isolatedSuite = PG_TEST_URL === undefined ? describe.skip : describe;
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const FINANCE_MIGRATION_PATH = resolve(
  PACKAGE_ROOT,
  "drizzle/0050_finance_operations_records.sql",
);

/** Flattened Finance record input accepted by the future raw PostgreSQL store. */
interface FinanceRecordStoreInput {
  readonly companyId: string;
  readonly schoolId?: string;
  readonly recordId: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly sourceSystem: string;
  readonly sourceVersion: string;
  readonly sourceRecordId: string;
  readonly importBatchId: string;
  readonly payloadDigest: string;
  readonly evidenceReference: string;
}

/** Immutable local success event accepted atomically with the record. */
interface FinanceRecordSuccessAuditInput {
  readonly companyId: string;
  readonly schoolId?: string;
  readonly eventId: string;
  readonly actorSubjectId: string;
  readonly operation: "financial-record:import";
  readonly objectId: string;
  readonly occurredAt: string;
  readonly requestId: string;
  readonly correlationId: string;
}

/** Expected store implementation used by the live PostgreSQL concurrency contract. */
interface FinanceOperationsRecordStore {
  /** Atomically accepts a record and its idempotent local success event. */
  appendWithSuccessAudit(
    input: Readonly<FinanceRecordStoreInput>,
    audit: Readonly<FinanceRecordSuccessAuditInput>,
  ): Promise<Readonly<{ readonly outcome: "inserted" | "existing" }>>;
}

/** Expected exports of the future Finance Operations raw PostgreSQL store. */
interface FinanceOperationsRecordStoreModule {
  /** Constructs a Finance record store over the supplied isolated PostgreSQL client. */
  createPostgresFinanceOperationsRecordStore(
    sql: ReturnType<typeof postgres>,
  ): FinanceOperationsRecordStore;
}

/** Produces a valid record whose concurrent source and record identities are intentionally identical. */
function recordInput(): FinanceRecordStoreInput {
  return {
    companyId: "company-amber",
    schoolId: "school-north",
    recordId: "finance-record-concurrent",
    amountMinor: "12500",
    currency: "THB",
    sourceSystem: "tutor-export",
    sourceVersion: "2026-08-10",
    sourceRecordId: "tutor-row-concurrent",
    importBatchId: "batch-concurrent",
    payloadDigest: "a".repeat(64),
    evidenceReference:
      "private-evidence://company-amber/finance/receipt-concurrent",
  };
}

/** Creates the shared idempotency event for both competing acceptance attempts. */
function successAudit(
  record: Readonly<FinanceRecordStoreInput>,
): FinanceRecordSuccessAuditInput {
  return {
    companyId: record.companyId,
    schoolId: record.schoolId,
    eventId: "finance-audit-concurrent",
    actorSubjectId: "employee-concurrent",
    operation: "financial-record:import",
    objectId: record.recordId,
    occurredAt: "2026-08-10T02:04:05.678Z",
    requestId: "request-concurrent",
    correlationId: "correlation-concurrent",
  };
}

/** Replaces the database component of a PostgreSQL URL with a disposable database name. */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/** Creates a two-party release barrier so both clients start their append attempt together. */
function startBarrier(parties: number): { wait(): Promise<void> } {
  let arrived = 0;
  let release: (() => void) | undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    async wait() {
      arrived += 1;
      if (arrived === parties) release?.();
      await released;
    },
  };
}

/** Loads the future store only in the explicit live-PostgreSQL test path. */
async function loadRecordStore(): Promise<FinanceOperationsRecordStoreModule> {
  return (await import("../finance-operations-record-store.js")) as unknown as FinanceOperationsRecordStoreModule;
}

let admin: ReturnType<typeof postgres> | undefined;
let first: ReturnType<typeof postgres> | undefined;
let second: ReturnType<typeof postgres> | undefined;
let databaseName = "";

isolatedSuite("Finance Operations record store PostgreSQL concurrency", () => {
  beforeAll(async () => {
    if (PG_TEST_URL === undefined) return;
    databaseName = `finance_records_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    admin = postgres(PG_TEST_URL, { max: 1, prepare: false });
    await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    const databaseUrl = withDatabase(PG_TEST_URL, databaseName);
    first = postgres(databaseUrl, { max: 1, prepare: false });
    second = postgres(databaseUrl, { max: 1, prepare: false });
    const migration = await readFile(FINANCE_MIGRATION_PATH, "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim().length > 0) await first.unsafe(statement);
    }
  }, 30_000);

  afterAll(async () => {
    await first?.end({ timeout: 5 });
    await second?.end({ timeout: 5 });
    if (admin !== undefined && databaseName !== "") {
      await admin.unsafe(
        `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
      );
    }
    await admin?.end({ timeout: 5 });
  }, 30_000);

  it("returns one inserted and one locked-existing result for barrier-backed competing appends", async () => {
    if (first === undefined || second === undefined) {
      throw new Error("Isolated PostgreSQL clients were not initialized.");
    }
    await first.unsafe(`
      CREATE FUNCTION finance_records_test_serialize_competing_insert()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(209060810);
        PERFORM pg_sleep(0.15);
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER finance_records_test_serialize_competing_insert
      BEFORE INSERT ON finance_records
      FOR EACH ROW
      EXECUTE FUNCTION finance_records_test_serialize_competing_insert();
    `);
    const { createPostgresFinanceOperationsRecordStore } =
      await loadRecordStore();
    const firstStore = createPostgresFinanceOperationsRecordStore(first);
    const secondStore = createPostgresFinanceOperationsRecordStore(second);
    const barrier = startBarrier(2);
    const input = recordInput();
    const audit = successAudit(input);

    expect(firstStore).not.toHaveProperty("compareAndAppend");
    expect(secondStore).not.toHaveProperty("compareAndAppend");

    const [left, right] = await Promise.all([
      (async () => {
        await barrier.wait();
        return await firstStore.appendWithSuccessAudit(input, audit);
      })(),
      (async () => {
        await barrier.wait();
        return await secondStore.appendWithSuccessAudit(input, audit);
      })(),
    ]);

    expect([left.outcome, right.outcome].sort()).toEqual([
      "existing",
      "inserted",
    ]);
    await expect(
      first.unsafe("SELECT count(*)::text AS row_count FROM finance_records"),
    ).resolves.toEqual([{ row_count: "1" }]);
    await expect(
      first.unsafe(
        `SELECT count(*)::text AS row_count,
                min(event_id) AS event_id,
                min(object_id) AS object_id
           FROM finance_record_success_audit_outbox`,
      ),
    ).resolves.toEqual([
      {
        row_count: "1",
        event_id: audit.eventId,
        object_id: input.recordId,
      },
    ]);
  }, 30_000);
});

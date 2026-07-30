import type postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import {
  createPostgresStandardPackSuccessorAdmissionPersistenceStore,
  type StandardPackSuccessorAdmissionReceiptAppendInput,
  type StandardPackSuccessorAdmissionReceiptLookupInput,
  type StandardPackSuccessorAdmissionReceiptStoreRow,
} from "../standard-pack-successor-admission-persistence-store.js";
import type {
  StandardPackSuccessorCommitmentStoreInput,
  StandardPackSuccessorCommitmentStoreRow,
} from "../standard-pack-successor-commitment-store.js";

/** Creates one deterministic SHA-256-shaped fixture digest from a hexadecimal character. */
function digest(letter: string): string {
  return letter.repeat(64);
}

const lookup: StandardPackSuccessorAdmissionReceiptLookupInput = {
  actorId: "asset-release-admin",
  policyId: "standard-pack.successor-admission",
  idempotencyKeyFingerprint: digest("9"),
};

const reservationInput: StandardPackSuccessorCommitmentStoreInput = {
  schemaVersion: 1,
  predecessorIndexDigest: digest("a"),
  predecessorVersion: "2026.07.29",
  predecessorCatalogDigest: digest("b"),
  predecessorSourceReceiptDigest: digest("c"),
  successorBatchId: "legacy-hero-batch",
  successorBatchDigest: digest("d"),
  successorVersion: "2026.07.30",
  successorCatalogDigest: digest("e"),
  successorSourceReceiptDigest: digest("f"),
  candidateRepositoryId: "reading-advantage-monorepo",
  candidateRevision: "a".repeat(40),
  candidateTreeDigest: digest("2"),
  descriptorDigest: digest("3"),
  sourcePacketDigest: digest("4"),
  candidateDigest: digest("5"),
  commitmentDigest: digest("1"),
  candidateJson: { candidateDigest: digest("5"), commitmentDigest: digest("1") },
  commitmentJson: { commitmentDigest: digest("1"), predecessorIndexDigest: digest("a") },
};

const registryRow: StandardPackSuccessorCommitmentStoreRow = {
  candidateJson: reservationInput.candidateJson,
  commitmentJson: reservationInput.commitmentJson,
  reservedAt: "2026-07-30T15:00:01.000Z",
};

const receiptInput: StandardPackSuccessorAdmissionReceiptAppendInput = {
  id: "5b57ed22-369d-46e3-a96f-514f7a7ff70e",
  schemaVersion: 1,
  commitmentDigest: reservationInput.commitmentDigest,
  candidateDigest: reservationInput.candidateDigest,
  actorId: lookup.actorId,
  policyId: lookup.policyId,
  idempotencyKeyFingerprint: lookup.idempotencyKeyFingerprint,
  requestInputDigest: digest("8"),
  correlationId: "0f941a87-0abe-4436-af6f-0e6807c67bc0",
  outcome: "reserved",
  safeAuditJson: { eventType: "standard-pack.successor-admission", outcome: "reserved" },
  observabilityJson: { operation: "standard-pack.successor-admission", outcome: "reserved" },
  receiptJson: {
    id: "5b57ed22-369d-46e3-a96f-514f7a7ff70e",
    schemaVersion: 1,
    commitmentDigest: reservationInput.commitmentDigest,
    candidateDigest: reservationInput.candidateDigest,
    actorId: lookup.actorId,
    policyId: lookup.policyId,
    idempotencyKeyFingerprint: lookup.idempotencyKeyFingerprint,
    requestInputDigest: digest("8"),
    correlationId: "0f941a87-0abe-4436-af6f-0e6807c67bc0",
    outcome: "reserved",
    safeAudit: { eventType: "standard-pack.successor-admission", outcome: "reserved" },
    observability: { operation: "standard-pack.successor-admission", outcome: "reserved" },
    recordedAt: "2026-07-30T15:00:02.000Z",
  },
  recordedAt: "2026-07-30T15:00:02.000Z",
};

const receiptRow: StandardPackSuccessorAdmissionReceiptStoreRow = { ...receiptInput };

type ScriptedOutcome = readonly Record<string, unknown>[] | Error;

interface ScriptedDatabase {
  readonly beginCalls: { count: number };
  readonly savepointCalls: { count: number };
  readonly sql: postgres.Sql;
  readonly statements: string[];
}

/** Creates a fake PostgreSQL client that records transaction boundaries and template SQL. */
function scriptedDatabase(outcomes: readonly ScriptedOutcome[]): ScriptedDatabase {
  const pending = [...outcomes];
  const statements: string[] = [];
  const beginCalls = { count: 0 };
  const savepointCalls = { count: 0 };
  const tagged = vi.fn(async (strings: TemplateStringsArray) => {
    statements.push(strings.join("?"));
    const outcome = pending.shift();
    if (outcome === undefined) throw new Error("Unexpected SQL statement.");
    if (outcome instanceof Error) throw outcome;
    return outcome;
  });
  const transaction = tagged as unknown as postgres.TransactionSql;
  Object.assign(transaction, {
    json: (value: unknown) => value,
    savepoint: async <T>(work: (active: postgres.TransactionSql) => Promise<T>) => {
      savepointCalls.count += 1;
      return await work(transaction);
    },
  });
  const sql = tagged as unknown as postgres.Sql;
  Object.assign(sql, {
    begin: async <T>(work: (active: postgres.TransactionSql) => Promise<T>) => {
      beginCalls.count += 1;
      return await work(transaction);
    },
    json: (value: unknown) => value,
  });
  return { beginCalls, savepointCalls, sql, statements };
}

/** Converts a raw registry fixture to PostgreSQL column names. */
function postgresRegistryRow(): Record<string, unknown> {
  return {
    candidate_json: registryRow.candidateJson,
    commitment_json: registryRow.commitmentJson,
    reserved_at: registryRow.reservedAt,
  };
}

/** Converts the immutable receipt fixture to PostgreSQL column names. */
function postgresReceiptRow(): Record<string, unknown> {
  return {
    id: receiptRow.id,
    schema_version: receiptRow.schemaVersion,
    commitment_digest: receiptRow.commitmentDigest,
    candidate_digest: receiptRow.candidateDigest,
    actor_id: receiptRow.actorId,
    policy_id: receiptRow.policyId,
    idempotency_key_fingerprint: receiptRow.idempotencyKeyFingerprint,
    request_input_digest: receiptRow.requestInputDigest,
    correlation_id: receiptRow.correlationId,
    outcome: receiptRow.outcome,
    safe_audit_json: receiptRow.safeAuditJson,
    observability_json: receiptRow.observabilityJson,
    receipt_json: receiptRow.receiptJson,
    recorded_at: receiptRow.recordedAt,
  };
}

describe("PostgreSQL standard-pack successor admission persistence store", () => {
  it("locks idempotency lookup, reserves a successor, and appends a receipt in one transaction", async () => {
    const database = scriptedDatabase([[], [], [postgresRegistryRow()], [postgresReceiptRow()]]);
    const store = createPostgresStandardPackSuccessorAdmissionPersistenceStore(database.sql);

    const result = await store.transaction(async (transaction) => {
      expect(await transaction.readReceipt(lookup)).toBeNull();
      const reservation = await transaction.reserveSuccessor(reservationInput);
      const receipt = await transaction.appendReceipt(receiptInput);
      return { receipt, reservation };
    });

    expect(result).toEqual({
      reservation: { outcome: "inserted", row: registryRow },
      receipt: receiptRow,
    });
    expect(database.beginCalls.count).toBe(1);
    expect(database.savepointCalls.count).toBe(1);
    expect(database.statements).toHaveLength(4);
    expect(database.statements[0]).toContain("pg_advisory_xact_lock");
    expect(database.statements[1]).toContain("FOR UPDATE");
    expect(database.statements[2]).toContain("INSERT INTO standard_pack_successor_commitments");
    expect(database.statements[3]).toContain("INSERT INTO standard_pack_successor_admission_receipts");
  });

  it("returns a structured secondary registry collision without appending a receipt", async () => {
    const uniqueViolation = Object.assign(new Error("unique violation"), { code: "23505" });
    const database = scriptedDatabase([[], [], uniqueViolation, [postgresRegistryRow()]]);
    const store = createPostgresStandardPackSuccessorAdmissionPersistenceStore(database.sql);

    const reservation = await store.transaction(async (transaction) => {
      expect(await transaction.readReceipt(lookup)).toBeNull();
      return await transaction.reserveSuccessor(reservationInput);
    });

    expect(reservation).toEqual({ outcome: "secondary-existing", row: registryRow });
    expect(database.beginCalls.count).toBe(1);
    expect(database.savepointCalls.count).toBe(1);
    expect(database.statements).toHaveLength(4);
    expect(database.statements[3]).toContain("successor_batch_digest");
    expect(database.statements[3]).toContain("commitment_digest");
    expect(database.statements[3]).toContain("FOR UPDATE");
    expect(database.statements.join("\n")).not.toContain(
      "INSERT INTO standard_pack_successor_admission_receipts",
    );
  });

  it("returns locked raw receipt and registry evidence for an existing idempotency identity", async () => {
    const database = scriptedDatabase([[], [{ ...postgresReceiptRow(), ...postgresRegistryRow() }]]);
    const store = createPostgresStandardPackSuccessorAdmissionPersistenceStore(database.sql);

    const existing = await store.transaction(async (transaction) =>
      await transaction.readReceipt(lookup));

    expect(existing).toEqual({ receipt: receiptRow, registryRow });
    expect(database.beginCalls.count).toBe(1);
    expect(database.savepointCalls.count).toBe(0);
    expect(database.statements).toHaveLength(2);
    expect(database.statements[1]).toContain("FOR UPDATE OF receipt, commitment");
  });

  it("surfaces a receipt append failure after the outer transaction rejects", async () => {
    const database = scriptedDatabase([
      [],
      [],
      [postgresRegistryRow()],
      Object.assign(new Error("receipt trigger rejected insert"), { code: "P0001" }),
    ]);
    const store = createPostgresStandardPackSuccessorAdmissionPersistenceStore(database.sql);

    await expect(store.transaction(async (transaction) => {
      await transaction.readReceipt(lookup);
      await transaction.reserveSuccessor(reservationInput);
      await transaction.appendReceipt(receiptInput);
    })).rejects.toMatchObject({
      code: "UNAVAILABLE",
      retryable: true,
    });
    expect(database.beginCalls.count).toBe(1);
    expect(database.statements).toHaveLength(4);
  });
});

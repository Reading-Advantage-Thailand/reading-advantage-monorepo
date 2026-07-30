import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createPostgresStandardPackSuccessorAdmissionPersistenceStore,
  type StandardPackSuccessorAdmissionReceiptAppendInput,
  type StandardPackSuccessorAdmissionReceiptLookupInput,
} from "../standard-pack-successor-admission-persistence-store.js";
import type {
  StandardPackSuccessorCommitmentStoreInput,
} from "../standard-pack-successor-commitment-store.js";

const PG_TEST_URL = process.env.PG_TEST_URL;
const isolatedSuite = PG_TEST_URL === undefined ? describe.skip : describe;
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");

/** Creates one deterministic SHA-256-shaped fixture digest from a hexadecimal character. */
function digest(letter: string): string {
  return letter.repeat(64);
}

/** Creates full raw commitment evidence that satisfies the 0044 JSON projections. */
function reservationInput(): StandardPackSuccessorCommitmentStoreInput {
  const commitment = {
    schemaVersion: 1,
    predecessorIndexDigest: digest("a"),
    predecessorRelease: {
      version: "2026.07.29",
      catalogDigest: digest("b"),
      sourceReceiptDigest: digest("c"),
    },
    successorBatchId: "legacy-hero-batch",
    successorBatchDigest: digest("d"),
    successorRelease: {
      version: "2026.07.30",
      catalogDigest: digest("e"),
      sourceReceiptDigest: digest("f"),
    },
    commitmentDigest: digest("1"),
  };
  const candidate = {
    schemaVersion: 1,
    gitCandidate: {
      repositoryId: "reading-advantage-monorepo",
      revision: "a".repeat(40),
      treeDigest: digest("2"),
    },
    predecessorIndexDigest: commitment.predecessorIndexDigest,
    predecessorRelease: commitment.predecessorRelease,
    successorBatchId: commitment.successorBatchId,
    successorBatchDigest: commitment.successorBatchDigest,
    successorRelease: commitment.successorRelease,
    descriptorDigest: digest("3"),
    sourcePacketDigest: digest("4"),
    candidateDigest: digest("5"),
    commitmentDigest: commitment.commitmentDigest,
  };
  return {
    schemaVersion: 1,
    predecessorIndexDigest: commitment.predecessorIndexDigest,
    predecessorVersion: commitment.predecessorRelease.version,
    predecessorCatalogDigest: commitment.predecessorRelease.catalogDigest,
    predecessorSourceReceiptDigest: commitment.predecessorRelease.sourceReceiptDigest,
    successorBatchId: commitment.successorBatchId,
    successorBatchDigest: commitment.successorBatchDigest,
    successorVersion: commitment.successorRelease.version,
    successorCatalogDigest: commitment.successorRelease.catalogDigest,
    successorSourceReceiptDigest: commitment.successorRelease.sourceReceiptDigest,
    candidateRepositoryId: candidate.gitCandidate.repositoryId,
    candidateRevision: candidate.gitCandidate.revision,
    candidateTreeDigest: candidate.gitCandidate.treeDigest,
    descriptorDigest: candidate.descriptorDigest,
    sourcePacketDigest: candidate.sourcePacketDigest,
    candidateDigest: candidate.candidateDigest,
    commitmentDigest: commitment.commitmentDigest,
    candidateJson: candidate,
    commitmentJson: commitment,
  };
}

/** Returns the actor-policy-fingerprint identity used by the receipt uniqueness constraint. */
function receiptLookup(): StandardPackSuccessorAdmissionReceiptLookupInput {
  return {
    actorId: "asset-release-admin",
    policyId: "standard-pack.successor-admission",
    idempotencyKeyFingerprint: digest("9"),
  };
}

/** Creates one full receipt-contract projection for the supplied raw commitment row. */
function receiptInput(
  reservation: Readonly<StandardPackSuccessorCommitmentStoreInput>,
): StandardPackSuccessorAdmissionReceiptAppendInput {
  const lookup = receiptLookup();
  const requestInputDigest = digest("8");
  const correlationId = "0f941a87-0abe-4436-af6f-0e6807c67bc0";
  const recordedAt = "2026-07-30T15:00:02.000Z";
  const metadata = {
    outcome: "reserved" as const,
    actorId: lookup.actorId,
    policyId: lookup.policyId,
    correlationId,
    predecessorIndexDigest: reservation.predecessorIndexDigest,
    successorBatchDigest: reservation.successorBatchDigest,
    candidateDigest: reservation.candidateDigest,
    commitmentDigest: reservation.commitmentDigest,
    idempotencyKeyFingerprint: lookup.idempotencyKeyFingerprint,
    requestInputDigest,
  };
  const safeAuditJson = {
    eventType: "standard-pack.successor-admission",
    ...metadata,
    recordedAt,
  };
  const observabilityJson = {
    operation: "standard-pack.successor-admission",
    ...metadata,
  };
  return {
    id: "5b57ed22-369d-46e3-a96f-514f7a7ff70e",
    schemaVersion: 1,
    commitmentDigest: reservation.commitmentDigest,
    candidateDigest: reservation.candidateDigest,
    actorId: lookup.actorId,
    policyId: lookup.policyId,
    idempotencyKeyFingerprint: lookup.idempotencyKeyFingerprint,
    requestInputDigest,
    correlationId,
    outcome: "reserved",
    safeAuditJson,
    observabilityJson,
    receiptJson: {
      id: "5b57ed22-369d-46e3-a96f-514f7a7ff70e",
      schemaVersion: 1,
      commitmentDigest: reservation.commitmentDigest,
      candidateDigest: reservation.candidateDigest,
      actorId: lookup.actorId,
      policyId: lookup.policyId,
      idempotencyKeyFingerprint: lookup.idempotencyKeyFingerprint,
      requestInputDigest,
      correlationId,
      outcome: "reserved",
      safeAudit: safeAuditJson,
      observability: observabilityJson,
      recordedAt,
    },
    recordedAt,
  };
}

/** Replaces the database component of a PostgreSQL URL with a scratch database name. */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = "/" + databaseName;
  return url.toString();
}

let admin: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof postgres> | undefined;
let databaseName = "";

isolatedSuite("PostgreSQL successor-admission persistence integration", () => {
  beforeAll(async () => {
    if (PG_TEST_URL === undefined) return;
    databaseName = "successor_admission_" + Date.now() + "_" + Math.random()
      .toString(36)
      .slice(2, 8);
    admin = postgres(PG_TEST_URL, { max: 1 });
    await admin.unsafe("CREATE DATABASE \"" + databaseName + "\"");
    database = postgres(withDatabase(PG_TEST_URL, databaseName), { max: 1 });
    for (const migrationName of [
      "0044_standard_pack_successor_commitments.sql",
      "0045_standard_pack_successor_admission_receipts.sql",
      "0046_standard_pack_successor_admission_receipt_integrity.sql",
    ]) {
      const migration = await readFile(
        resolve(PACKAGE_ROOT, "drizzle", migrationName),
        "utf8",
      );
      for (const statement of migration.split("--> statement-breakpoint")) {
        if (statement.trim().length > 0) await database.unsafe(statement);
      }
    }
  }, 30_000);

  afterAll(async () => {
    await database?.end({ timeout: 5 });
    if (admin !== undefined && databaseName !== "") {
      await admin.unsafe("DROP DATABASE IF EXISTS \"" + databaseName + "\" WITH (FORCE)");
    }
    await admin?.end({ timeout: 5 });
  }, 30_000);

  it("rolls back both the new successor reservation and receipt when receipt append is rejected", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const reservation = reservationInput();
    const receipt = receiptInput(reservation);
    await database.unsafe([
      "CREATE FUNCTION standard_pack_successor_admission_test_reject_receipt()",
      "RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''receipt insert rejected''; END;';",
      "CREATE TRIGGER standard_pack_successor_admission_test_reject_receipt",
      "BEFORE INSERT ON standard_pack_successor_admission_receipts",
      "FOR EACH ROW EXECUTE FUNCTION standard_pack_successor_admission_test_reject_receipt();",
    ].join("\n"));
    const store = createPostgresStandardPackSuccessorAdmissionPersistenceStore(database);

    await expect(store.transaction(async (transaction) => {
      expect(await transaction.readReceipt(receiptLookup())).toBeNull();
      await transaction.reserveSuccessor(reservation);
      await transaction.appendReceipt(receipt);
    })).rejects.toMatchObject({
      code: "UNAVAILABLE",
      retryable: true,
    });

    const [commitmentCount, receiptCount] = await Promise.all([
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_commitments WHERE predecessor_index_digest = $1",
        [reservation.predecessorIndexDigest],
      ),
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_admission_receipts WHERE actor_id = $1",
        [receipt.actorId],
      ),
    ]);
    expect(commitmentCount[0]?.count).toBe(0);
    expect(receiptCount[0]?.count).toBe(0);
    await database.unsafe(
      "DROP TRIGGER standard_pack_successor_admission_test_reject_receipt ON standard_pack_successor_admission_receipts",
    );
    await database.unsafe(
      "DROP FUNCTION standard_pack_successor_admission_test_reject_receipt()",
    );
  });

  it("rejects a receipt whose embedded audit identity does not match the durable columns", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const reservation = reservationInput();
    const receipt = receiptInput(reservation);
    const safeAuditJson = { ...receipt.safeAuditJson, actorId: "other-admin" };
    const malformedReceipt = {
      ...receipt,
      safeAuditJson,
      receiptJson: { ...receipt.receiptJson, safeAudit: safeAuditJson },
    };
    const store = createPostgresStandardPackSuccessorAdmissionPersistenceStore(database);

    await expect(store.transaction(async (transaction) => {
      expect(await transaction.readReceipt(receiptLookup())).toBeNull();
      await transaction.reserveSuccessor(reservation);
      await transaction.appendReceipt(malformedReceipt);
    })).rejects.toMatchObject({
      code: "UNAVAILABLE",
      retryable: true,
    });

    const [commitmentCount, receiptCount] = await Promise.all([
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_commitments WHERE predecessor_index_digest = $1",
        [reservation.predecessorIndexDigest],
      ),
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_admission_receipts WHERE actor_id = $1",
        [receipt.actorId],
      ),
    ]);
    expect(commitmentCount[0]?.count).toBe(0);
    expect(receiptCount[0]?.count).toBe(0);
  });

  it("rejects a receipt that omits required observability registry evidence", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const reservation = reservationInput();
    const receipt = receiptInput(reservation);
    const { predecessorIndexDigest: _missing, ...observabilityJson } = receipt.observabilityJson;
    const malformedReceipt = {
      ...receipt,
      observabilityJson,
      receiptJson: { ...receipt.receiptJson, observability: observabilityJson },
    };
    const store = createPostgresStandardPackSuccessorAdmissionPersistenceStore(database);

    await expect(store.transaction(async (transaction) => {
      expect(await transaction.readReceipt(receiptLookup())).toBeNull();
      await transaction.reserveSuccessor(reservation);
      await transaction.appendReceipt(malformedReceipt);
    })).rejects.toMatchObject({
      code: "UNAVAILABLE",
      retryable: true,
    });

    const [commitmentCount, receiptCount] = await Promise.all([
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_commitments WHERE predecessor_index_digest = $1",
        [reservation.predecessorIndexDigest],
      ),
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_admission_receipts WHERE actor_id = $1",
        [receipt.actorId],
      ),
    ]);
    expect(commitmentCount[0]?.count).toBe(0);
    expect(receiptCount[0]?.count).toBe(0);
  });

  it("rejects a receipt whose JSON schema version is a string instead of a number", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const reservation = reservationInput();
    const receipt = receiptInput(reservation);
    const malformedReceipt = {
      ...receipt,
      receiptJson: { ...receipt.receiptJson, schemaVersion: "1" },
    };
    const store = createPostgresStandardPackSuccessorAdmissionPersistenceStore(database);

    await expect(store.transaction(async (transaction) => {
      expect(await transaction.readReceipt(receiptLookup())).toBeNull();
      await transaction.reserveSuccessor(reservation);
      await transaction.appendReceipt(malformedReceipt);
    })).rejects.toMatchObject({
      code: "UNAVAILABLE",
      retryable: true,
    });

    const [commitmentCount, receiptCount] = await Promise.all([
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_commitments WHERE predecessor_index_digest = $1",
        [reservation.predecessorIndexDigest],
      ),
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_admission_receipts WHERE actor_id = $1",
        [receipt.actorId],
      ),
    ]);
    expect(commitmentCount[0]?.count).toBe(0);
    expect(receiptCount[0]?.count).toBe(0);
  });

  it("rejects matching but malformed nested registry digests", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const reservation = reservationInput();
    const receipt = receiptInput(reservation);
    const predecessorIndexDigest = "not-a-digest";
    const safeAuditJson = { ...receipt.safeAuditJson, predecessorIndexDigest };
    const observabilityJson = { ...receipt.observabilityJson, predecessorIndexDigest };
    const malformedReceipt = {
      ...receipt,
      safeAuditJson,
      observabilityJson,
      receiptJson: {
        ...receipt.receiptJson,
        safeAudit: safeAuditJson,
        observability: observabilityJson,
      },
    };
    const store = createPostgresStandardPackSuccessorAdmissionPersistenceStore(database);

    await expect(store.transaction(async (transaction) => {
      expect(await transaction.readReceipt(receiptLookup())).toBeNull();
      await transaction.reserveSuccessor(reservation);
      await transaction.appendReceipt(malformedReceipt);
    })).rejects.toMatchObject({
      code: "UNAVAILABLE",
      retryable: true,
    });

    const [commitmentCount, receiptCount] = await Promise.all([
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_commitments WHERE predecessor_index_digest = $1",
        [reservation.predecessorIndexDigest],
      ),
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_admission_receipts WHERE actor_id = $1",
        [receipt.actorId],
      ),
    ]);
    expect(commitmentCount[0]?.count).toBe(0);
    expect(receiptCount[0]?.count).toBe(0);
  });

  it("rejects a receipt candidate that is not the committed registry candidate", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const reservation = reservationInput();
    const receipt = receiptInput(reservation);
    const candidateDigest = digest("6");
    const safeAuditJson = { ...receipt.safeAuditJson, candidateDigest };
    const observabilityJson = { ...receipt.observabilityJson, candidateDigest };
    const mismatchedReceipt = {
      ...receipt,
      candidateDigest,
      safeAuditJson,
      observabilityJson,
      receiptJson: {
        ...receipt.receiptJson,
        candidateDigest,
        safeAudit: safeAuditJson,
        observability: observabilityJson,
      },
    };
    const store = createPostgresStandardPackSuccessorAdmissionPersistenceStore(database);

    await expect(store.transaction(async (transaction) => {
      expect(await transaction.readReceipt(receiptLookup())).toBeNull();
      await transaction.reserveSuccessor(reservation);
      await transaction.appendReceipt(mismatchedReceipt);
    })).rejects.toMatchObject({
      code: "UNAVAILABLE",
      retryable: true,
    });

    const [commitmentCount, receiptCount] = await Promise.all([
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_commitments WHERE predecessor_index_digest = $1",
        [reservation.predecessorIndexDigest],
      ),
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_admission_receipts WHERE actor_id = $1",
        [receipt.actorId],
      ),
    ]);
    expect(commitmentCount[0]?.count).toBe(0);
    expect(receiptCount[0]?.count).toBe(0);
  });
});

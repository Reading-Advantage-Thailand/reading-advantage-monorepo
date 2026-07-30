import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPostgresStandardPackSuccessorAdmissionPersistenceStore } from "@reading-advantage/db";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  createStandardPackSuccessorAdmissionCommand,
  createStandardPackSuccessorAdmissionPersistencePort,
  standardPackSuccessorAdmissionResultSchema,
  type StandardPackSuccessorAdmissionReservation,
} from "../index.js";

const PG_TEST_URL = process.env.PG_TEST_URL;
const isolatedSuite = PG_TEST_URL === undefined ? describe.skip : describe;
const DB_PACKAGE_ROOT = resolve(import.meta.dirname, "../../../../../db");

/** Serializes JSON-compatible evidence with recursively sorted object keys. */
function canonicalJson(value: unknown): string {
  if (
    value === null
    || typeof value === "boolean"
    || typeof value === "number"
    || typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  throw new Error("Fixture digest payload contains a non-JSON value.");
}

/** Calculates one canonical SHA-256 digest for fixture identity evidence. */
function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

/** Computes a fixture digest after removing its self-referential digest property. */
function digestWithout(value: object, key: string): string {
  const payload = { ...(value as Record<string, unknown>) };
  delete payload[key];
  return digest(payload);
}

/** Creates one canonical-digest-valid command input for the isolated composition test. */
function createInput() {
  const commitmentDraft = {
    schemaVersion: 1 as const,
    predecessorIndexDigest: digest("predecessor-index"),
    predecessorRelease: {
      version: "2026.07.29",
      catalogDigest: digest("predecessor-catalog"),
      sourceReceiptDigest: digest("predecessor-source-receipt"),
    },
    successorBatchId: "legacy-hero-batch",
    successorBatchDigest: digest("successor-batch"),
    successorRelease: {
      version: "2026.07.31",
      catalogDigest: digest("successor-catalog"),
      sourceReceiptDigest: digest("successor-source-receipt"),
    },
    commitmentDigest: "",
  };
  const commitment = {
    ...commitmentDraft,
    commitmentDigest: digestWithout(commitmentDraft, "commitmentDigest"),
  };
  const candidateDraft = {
    schemaVersion: 1 as const,
    gitCandidate: {
      repositoryId: "reading-advantage-monorepo",
      revision: "a".repeat(40),
      treeDigest: digest("immutable-tree"),
    },
    predecessorIndexDigest: commitment.predecessorIndexDigest,
    predecessorRelease: commitment.predecessorRelease,
    successorBatchId: commitment.successorBatchId,
    successorBatchDigest: commitment.successorBatchDigest,
    successorRelease: commitment.successorRelease,
    descriptorDigest: digest("descriptor"),
    sourcePacketDigest: digest("source-packet"),
    candidateDigest: "",
    commitmentDigest: commitment.commitmentDigest,
  };
  const candidate = {
    ...candidateDraft,
    candidateDigest: digestWithout(candidateDraft, "candidateDigest"),
  };
  return {
    schemaVersion: 1 as const,
    candidate,
    commitment,
    idempotencyKey: "successor-admission-key-0001",
  };
}

/** Replaces the database component of a PostgreSQL URL with one scratch database name. */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

let admin: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof postgres> | undefined;
let databaseName = "";

isolatedSuite("PostgreSQL successor-admission command composition", () => {
  beforeAll(async () => {
    if (PG_TEST_URL === undefined) return;
    databaseName = `successor_admission_command_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    admin = postgres(PG_TEST_URL, { max: 1 });
    await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    database = postgres(withDatabase(PG_TEST_URL, databaseName), { max: 1 });
    for (const migrationName of [
      "0044_standard_pack_successor_commitments.sql",
      "0045_standard_pack_successor_admission_receipts.sql",
      "0046_standard_pack_successor_admission_receipt_integrity.sql",
    ]) {
      const migration = await readFile(resolve(DB_PACKAGE_ROOT, "drizzle", migrationName), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) {
        if (statement.trim().length > 0) await database.unsafe(statement);
      }
    }
  }, 30_000);

  afterAll(async () => {
    await database?.end({ timeout: 5 });
    if (admin !== undefined && databaseName !== "") {
      await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    }
    await admin?.end({ timeout: 5 });
  }, 30_000);

  it("persists one commitment and receipt, then returns the original receipt without another Git verification", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const input = createInput();
    const context = {
      actorId: "asset-release-admin",
      policyId: "standard-pack.successor-admission" as const,
      correlationId: "0f941a87-0abe-4436-af6f-0e6807c67bc0",
      requestedAt: "2026-07-31T00:00:00.000Z",
    };
    const verifier = vi.fn(async (reservation: Readonly<StandardPackSuccessorAdmissionReservation>) => ({
      status: "verified" as const,
      repositoryId: reservation.candidate.gitCandidate.repositoryId,
      revision: reservation.candidate.gitCandidate.revision,
      treeDigest: reservation.candidate.gitCandidate.treeDigest,
      candidateDigest: reservation.candidate.candidateDigest,
      descriptorDigest: reservation.candidate.descriptorDigest,
      sourcePacketDigest: reservation.candidate.sourcePacketDigest,
      commitmentDigest: reservation.commitment.commitmentDigest,
      verifiedAt: "2026-07-31T00:00:01.000Z",
    }));
    const auditAppend = vi.fn(async () => undefined);
    const observabilityEmit = vi.fn();
    const command = createStandardPackSuccessorAdmissionCommand({
      authorization: { authorize: async () => ({ outcome: "allowed" as const }) },
      gitCandidateVerifier: { verify: verifier },
      hasher: {
        fingerprintIdempotencyKey: async (key) => digest({ idempotencyKey: key }),
        digestRequestInput: async (reservation) => digest(reservation),
      },
      persistence: createStandardPackSuccessorAdmissionPersistencePort(
        createPostgresStandardPackSuccessorAdmissionPersistenceStore(database),
      ),
      audit: { append: auditAppend },
      observability: { emit: observabilityEmit },
      createReceiptId: () => "5b57ed22-369d-46e3-a96f-514f7a7ff70e",
      now: () => new Date("2026-07-31T00:00:02.000Z"),
    });

    const admitted = await command.admit(input, context);
    const replayed = await command.admit(input, context);
    const [commitments, receipts] = await Promise.all([
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_commitments",
      ),
      database.unsafe(
        "SELECT count(*)::int AS count FROM standard_pack_successor_admission_receipts",
      ),
    ]);

    expect(admitted).toMatchObject({
      outcome: "admitted",
      receipt: {
        outcome: "reserved",
        candidateDigest: input.candidate.candidateDigest,
        commitmentDigest: input.commitment.commitmentDigest,
        recordedAt: "2026-07-31T00:00:02.000Z",
      },
    });
    expect(replayed).toEqual({ outcome: "replayed", receipt: admitted.receipt });
    expect(standardPackSuccessorAdmissionResultSchema.safeParse(admitted).success).toBe(true);
    expect(standardPackSuccessorAdmissionResultSchema.safeParse(replayed).success).toBe(true);
    expect(commitments[0]?.count).toBe(1);
    expect(receipts[0]?.count).toBe(1);
    expect(verifier).toHaveBeenCalledTimes(1);
    expect(auditAppend).toHaveBeenCalledTimes(1);
    expect(observabilityEmit).toHaveBeenCalledTimes(1);
  });
});

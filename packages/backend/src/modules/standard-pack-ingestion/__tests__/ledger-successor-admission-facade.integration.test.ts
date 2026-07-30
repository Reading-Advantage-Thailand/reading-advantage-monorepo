import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  createPostgresStandardPackSuccessorAdmissionPersistenceStore,
  createPostgresStandardPackSuccessorCommitmentStore,
} from "@reading-advantage/db";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  createStandardPackIngestionLedgerSuccessorAdmissionFacade,
  createStandardPackSuccessorAdmissionCommand,
  createStandardPackSuccessorAdmissionPersistencePort,
  createStandardPackSuccessorRegistryPort,
  type StandardPackImmutableGitCandidateVerifier,
  type StandardPackIngestionLedgerSuccessorAdmissionProofResolver,
  type StandardPackSuccessorAdmissionInput,
  type StandardPackSuccessorAdmissionObservability,
  type StandardPackSuccessorAdmissionReservation,
  type StandardPackSuccessorAdmissionSafeAudit,
  type StandardPackSuccessorAdmissionTrustedContext,
} from "../index.js";

const PG_TEST_URL = process.env.PG_TEST_URL;
const isolatedSuite = PG_TEST_URL === undefined ? describe.skip : describe;
const DB_PACKAGE_ROOT = resolve(import.meta.dirname, "../../../../../db");

/** Serializes JSON-compatible fixture evidence with recursive key ordering. */
function canonicalJson(value: unknown): string {
  if (
    value === null
    || typeof value === "boolean"
    || typeof value === "number"
    || typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return "{" + Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
      .join(",") + "}";
  }
  throw new Error("Facade integration fixture contains a non-JSON value.");
}

/** Calculates one canonical SHA-256 fixture digest. */
function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

/** Computes a fixture digest after removing its self-referential property. */
function digestWithout(value: object, key: string): string {
  const payload = { ...(value as Record<string, unknown>) };
  delete payload[key];
  return digest(payload);
}

/** Builds synthetic, canonical-digest-valid closed admission evidence. */
function createInput(options: {
  readonly predecessorIndexDigest?: string;
  readonly suffix: string;
  readonly idempotencyKey: string;
}): StandardPackSuccessorAdmissionInput {
  const predecessorIndexDigest = options.predecessorIndexDigest ?? digest({
    predecessor: options.suffix,
  });
  const commitmentDraft = {
    schemaVersion: 1 as const,
    predecessorIndexDigest,
    predecessorRelease: {
      version: "2026.07.29",
      catalogDigest: digest("predecessor-catalog"),
      sourceReceiptDigest: digest("predecessor-source-receipt"),
    },
    successorBatchId: "ledger-batch-" + options.suffix,
    successorBatchDigest: digest({ successorBatch: options.suffix }),
    successorRelease: {
      version: "2026.07.31-" + options.suffix,
      catalogDigest: digest({ successorCatalog: options.suffix }),
      sourceReceiptDigest: digest({ successorSource: options.suffix }),
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
      treeDigest: digest({ tree: options.suffix }),
    },
    predecessorIndexDigest: commitment.predecessorIndexDigest,
    predecessorRelease: commitment.predecessorRelease,
    successorBatchId: commitment.successorBatchId,
    successorBatchDigest: commitment.successorBatchDigest,
    successorRelease: commitment.successorRelease,
    descriptorDigest: digest({ descriptor: options.suffix }),
    sourcePacketDigest: digest({ sourcePacket: options.suffix }),
    candidateDigest: "",
    commitmentDigest: commitment.commitmentDigest,
  };
  return {
    schemaVersion: 1,
    candidate: {
      ...candidateDraft,
      candidateDigest: digestWithout(candidateDraft, "candidateDigest"),
    },
    commitment,
    idempotencyKey: options.idempotencyKey,
  };
}

/** Builds the trusted context kept outside portable ledger evidence. */
function createContext(correlationId: string): StandardPackSuccessorAdmissionTrustedContext {
  return {
    actorId: "asset-release-admin",
    policyId: "standard-pack.successor-admission",
    correlationId,
    requestedAt: "2026-07-31T02:00:00.000Z",
  };
}

/** Produces the narrow predecessor identity accepted by the ledger facade. */
function predecessorIndexFor(input: Readonly<StandardPackSuccessorAdmissionInput>) {
  return {
    snapshotDigest: input.commitment.predecessorIndexDigest,
    predecessorRelease: input.commitment.predecessorRelease,
  };
}

/** Replaces a PostgreSQL URL database component with one isolated scratch database. */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = "/" + databaseName;
  return url.toString();
}

/** Shared external mirror observations used to prove replay and conflict do not duplicate side effects. */
interface ExternalMirrors {
  readonly audits: StandardPackSuccessorAdmissionSafeAudit[];
  readonly observability: StandardPackSuccessorAdmissionObservability[];
}

/** Constructs one independent facade over real command, persistence, and registry boundaries. */
function createFacadeRuntime(
  database: postgres.Sql,
  input: Readonly<StandardPackSuccessorAdmissionInput>,
  trustedContext: Readonly<StandardPackSuccessorAdmissionTrustedContext>,
  mirrors: ExternalMirrors,
  receiptId: string,
) {
  const verifier = {
    verify: vi.fn(async (reservation: Readonly<StandardPackSuccessorAdmissionReservation>) => ({
      status: "verified" as const,
      repositoryId: reservation.candidate.gitCandidate.repositoryId,
      revision: reservation.candidate.gitCandidate.revision,
      treeDigest: reservation.candidate.gitCandidate.treeDigest,
      candidateDigest: reservation.candidate.candidateDigest,
      descriptorDigest: reservation.candidate.descriptorDigest,
      sourcePacketDigest: reservation.candidate.sourcePacketDigest,
      commitmentDigest: reservation.commitment.commitmentDigest,
      verifiedAt: "2026-07-31T02:00:01.000Z",
    })),
  } satisfies StandardPackImmutableGitCandidateVerifier;
  const auditAppend = vi.fn(async (event: Readonly<StandardPackSuccessorAdmissionSafeAudit>) => {
    mirrors.audits.push(event);
  });
  const observabilityEmit = vi.fn((event: Readonly<StandardPackSuccessorAdmissionObservability>) => {
    mirrors.observability.push(event);
  });
  const command = createStandardPackSuccessorAdmissionCommand({
    authorization: { authorize: async () => ({ outcome: "allowed" as const }) },
    gitCandidateVerifier: verifier,
    hasher: {
      fingerprintIdempotencyKey: async (key) => digest({ idempotencyKey: key }),
      digestRequestInput: async (reservation) => digest(reservation),
    },
    persistence: createStandardPackSuccessorAdmissionPersistencePort(
      createPostgresStandardPackSuccessorAdmissionPersistenceStore(database),
    ),
    audit: { append: auditAppend },
    observability: { emit: observabilityEmit },
    createReceiptId: () => receiptId,
    now: () => new Date("2026-07-31T02:00:02.000Z"),
  });
  const registry = createStandardPackSuccessorRegistryPort(
    createPostgresStandardPackSuccessorCommitmentStore(database),
  );
  const proofResolver = {
    resolve: vi.fn(async () => ({ input, trustedContext })),
  } satisfies StandardPackIngestionLedgerSuccessorAdmissionProofResolver;
  return {
    facade: createStandardPackIngestionLedgerSuccessorAdmissionFacade({
      admissionCommand: command,
      registry,
      proofResolver,
    }),
    proofResolver,
    verifier,
    auditAppend,
    observabilityEmit,
  };
}

/** Counts only the commitment and receipt that belong to one synthetic closed proof. */
async function durableCounts(
  database: postgres.Sql,
  input: Readonly<StandardPackSuccessorAdmissionInput>,
): Promise<{ readonly commitments: number; readonly receipts: number }> {
  const [commitments, receipts] = await Promise.all([
    database.unsafe(
      "SELECT count(*)::int AS count FROM standard_pack_successor_commitments WHERE predecessor_index_digest = $1",
      [input.commitment.predecessorIndexDigest],
    ),
    database.unsafe(
      "SELECT count(*)::int AS count FROM standard_pack_successor_admission_receipts WHERE commitment_digest = $1",
      [input.commitment.commitmentDigest],
    ),
  ]);
  return {
    commitments: commitments[0]?.count ?? 0,
    receipts: receipts[0]?.count ?? 0,
  };
}

let admin: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof postgres> | undefined;
let databaseName = "";

isolatedSuite("PostgreSQL ledger successor-admission facade integration", () => {
  beforeAll(async () => {
    if (PG_TEST_URL === undefined) return;
    databaseName = "ledger_successor_facade_" + Date.now() + "_" + Math.random()
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
      const migration = await readFile(resolve(DB_PACKAGE_ROOT, "drizzle", migrationName), "utf8");
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

  it("shares one durable admission across independent facades, replays exactly, and returns the existing commitment for a competing closed proof", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const input = createInput({
      suffix: "primary",
      idempotencyKey: "ledger-facade-primary-idempotency-key",
    });
    const context = createContext("0f941a87-0abe-4436-af6f-0e6807c67bc0");
    const mirrors: ExternalMirrors = { audits: [], observability: [] };
    const first = createFacadeRuntime(
      database,
      input,
      context,
      mirrors,
      "5b57ed22-369d-46e3-a96f-514f7a7ff70e",
    );
    const replay = createFacadeRuntime(
      database,
      input,
      context,
      mirrors,
      "a13cf9ae-ef60-40a9-8008-3e7feec95602",
    );
    const predecessorIndex = predecessorIndexFor(input);

    await expect(first.facade.readSuccessorCommitment(predecessorIndex))
      .resolves.toBeUndefined();
    expect(first.proofResolver.resolve).not.toHaveBeenCalled();
    await expect(first.facade.reserveSuccessorCommitment(predecessorIndex, input.commitment))
      .resolves.toEqual(input.commitment);
    expect(first.proofResolver.resolve).toHaveBeenCalledTimes(1);
    expect(first.proofResolver.resolve).toHaveBeenCalledWith({
      predecessorIndex,
      commitment: input.commitment,
    });
    await expect(replay.facade.reserveSuccessorCommitment(predecessorIndex, input.commitment))
      .resolves.toEqual(input.commitment);
    expect(replay.proofResolver.resolve).toHaveBeenCalledTimes(1);
    expect(replay.proofResolver.resolve).toHaveBeenCalledWith({
      predecessorIndex,
      commitment: input.commitment,
    });
    await expect(replay.facade.readSuccessorCommitment(predecessorIndex))
      .resolves.toEqual(input.commitment);
    expect(replay.proofResolver.resolve).toHaveBeenCalledTimes(1);

    expect(await durableCounts(database, input)).toEqual({ commitments: 1, receipts: 1 });
    expect(first.verifier.verify).toHaveBeenCalledTimes(1);
    expect(replay.verifier.verify).not.toHaveBeenCalled();
    expect(Object.keys(first.verifier)).toEqual(["verify"]);
    expect(mirrors.audits).toHaveLength(1);
    expect(mirrors.observability).toHaveLength(1);
    expect(mirrors.audits[0]).toMatchObject({
      eventType: "standard-pack.successor-admission",
      commitmentDigest: input.commitment.commitmentDigest,
      candidateDigest: input.candidate.candidateDigest,
    });
    expect(JSON.stringify(mirrors)).not.toContain(input.idempotencyKey);

    const competingInput = createInput({
      predecessorIndexDigest: input.commitment.predecessorIndexDigest,
      suffix: "competing",
      idempotencyKey: "ledger-facade-competing-idempotency-key",
    });
    const competing = createFacadeRuntime(
      database,
      competingInput,
      createContext("947e491c-7fdf-4d4f-8444-4ee78ef01457"),
      mirrors,
      "d7e16b27-0dd5-4c91-80f3-3cb03947fdaf",
    );

    await expect(competing.facade.reserveSuccessorCommitment(
      predecessorIndexFor(competingInput),
      competingInput.commitment,
    )).resolves.toEqual(input.commitment);
    expect(competing.proofResolver.resolve).toHaveBeenCalledTimes(1);
    expect(competing.verifier.verify).toHaveBeenCalledTimes(1);
    expect(await durableCounts(database, input)).toEqual({ commitments: 1, receipts: 1 });
    expect(mirrors.audits).toHaveLength(1);
    expect(mirrors.observability).toHaveLength(1);
  });

  it("returns a structured safe error and leaves no durable state when receipt append is rejected", async () => {
    if (database === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const input = createInput({
      suffix: "receipt-rejected",
      idempotencyKey: "ledger-facade-receipt-rejected-idempotency-key",
    });
    const mirrors: ExternalMirrors = { audits: [], observability: [] };
    const runtime = createFacadeRuntime(
      database,
      input,
      createContext("9586537d-ea33-48d4-a247-9f894ff1d536"),
      mirrors,
      "1243042d-08e0-4553-b844-5455599a2d10",
    );
    await database.unsafe([
      "CREATE FUNCTION ledger_successor_facade_reject_receipt()",
      "RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''receipt append rejected''; END;';",
      "CREATE TRIGGER ledger_successor_facade_reject_receipt",
      "BEFORE INSERT ON standard_pack_successor_admission_receipts",
      "FOR EACH ROW EXECUTE FUNCTION ledger_successor_facade_reject_receipt();",
    ].join("\n"));

    try {
      let failure: unknown;
      try {
        await runtime.facade.reserveSuccessorCommitment(
          predecessorIndexFor(input),
          input.commitment,
        );
      } catch (error) {
        failure = error;
      }
      expect(failure).toMatchObject({
        code: "SUCCESSOR_ADMISSION_UNAVAILABLE",
        retryable: true,
        message: "Successor-admission processing is temporarily unavailable.",
      });
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).not.toContain(input.idempotencyKey);
      expect(await durableCounts(database, input)).toEqual({ commitments: 0, receipts: 0 });
      expect(runtime.proofResolver.resolve).toHaveBeenCalledTimes(1);
      expect(runtime.verifier.verify).toHaveBeenCalledTimes(1);
      expect(mirrors.audits).toEqual([]);
      expect(mirrors.observability).toEqual([]);
      expect(runtime.auditAppend).not.toHaveBeenCalled();
      expect(runtime.observabilityEmit).not.toHaveBeenCalled();
    } finally {
      await database.unsafe(
        "DROP TRIGGER ledger_successor_facade_reject_receipt ON standard_pack_successor_admission_receipts",
      );
      await database.unsafe("DROP FUNCTION ledger_successor_facade_reject_receipt()");
    }
  });
});

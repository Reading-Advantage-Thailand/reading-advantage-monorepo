import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPostgresStandardPackSuccessorCommitmentStore } from "@reading-advantage/db";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createStandardPackSuccessorRegistryPort } from "../index.js";

const PG_TEST_URL = process.env.PG_TEST_URL;
const isolatedSuite = PG_TEST_URL === undefined ? describe.skip : describe;

/** Creates one deterministic SHA-256-shaped fixture digest from a hexadecimal character. */
function digest(letter: string): string {
  return letter.repeat(64);
}

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

/** Computes a SHA-256 digest after removing its self-referential digest property. */
function digestWithout(value: object, key: string): string {
  const payload = { ...(value as Record<string, unknown>) };
  delete payload[key];
  return createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
}

/** Creates a canonical digest-valid request for one successor candidate. */
function createRequest(
  successorBatchId: string,
  successorBatchDigest: string,
  successorRelease: {
    readonly version: string;
    readonly catalogDigest: string;
    readonly sourceReceiptDigest: string;
  },
  predecessorIndexDigest = digest("a"),
) {
  const commitmentDraft = {
    schemaVersion: 1 as const,
    predecessorIndexDigest,
    predecessorRelease: {
      version: "2026.07.29",
      catalogDigest: digest("b"),
      sourceReceiptDigest: digest("c"),
    },
    successorBatchId,
    successorBatchDigest,
    successorRelease,
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
      treeDigest: digest("2"),
    },
    predecessorIndexDigest: commitment.predecessorIndexDigest,
    predecessorRelease: commitment.predecessorRelease,
    successorBatchId: commitment.successorBatchId,
    successorBatchDigest: commitment.successorBatchDigest,
    successorRelease: commitment.successorRelease,
    descriptorDigest: digest("3"),
    sourcePacketDigest: digest("4"),
    candidateDigest: "",
    commitmentDigest: commitment.commitmentDigest,
  };
  return {
    authorization: {
      policyId: "standard-pack.successor-registry.reserve" as const,
      actorId: "asset-release-admin",
    },
    candidate: {
      ...candidateDraft,
      candidateDigest: digestWithout(candidateDraft, "candidateDigest"),
    },
    commitment,
  };
}

/** Replaces the database component of a PostgreSQL URL with one temporary database name. */
function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

let admin: ReturnType<typeof postgres> | undefined;
let first: ReturnType<typeof postgres> | undefined;
let second: ReturnType<typeof postgres> | undefined;
let restarted: ReturnType<typeof postgres> | undefined;
let databaseName = "";

isolatedSuite("PostgreSQL standard-pack successor registry integration", () => {
  beforeAll(async () => {
    if (PG_TEST_URL === undefined) return;
    databaseName = `successor_registry_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    admin = postgres(PG_TEST_URL, { max: 1 });
    await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    const databaseUrl = withDatabase(PG_TEST_URL, databaseName);
    first = postgres(databaseUrl, { max: 1 });
    second = postgres(databaseUrl, { max: 1 });
    restarted = postgres(databaseUrl, { max: 1 });
    const migration = await readFile(
      resolve(
        process.cwd(),
        "../../packages/db/drizzle/0044_standard_pack_successor_commitments.sql",
      ),
      "utf8",
    );
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim().length > 0) await first.unsafe(statement);
    }
  }, 30_000);

  afterAll(async () => {
    await first?.end({ timeout: 5 });
    await second?.end({ timeout: 5 });
    await restarted?.end({ timeout: 5 });
    if (admin !== undefined && databaseName !== "") {
      await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    }
    await admin?.end({ timeout: 5 });
  }, 30_000);

  it("prevents two clients from reserving different successors and rehydrates after restart", async () => {
    if (first === undefined || second === undefined || restarted === undefined) {
      throw new Error("Isolated PostgreSQL clients were not initialized.");
    }
    const initial = createRequest(
      "legacy-hero-batch",
      digest("d"),
      {
        version: "2026.07.30",
        catalogDigest: digest("e"),
        sourceReceiptDigest: digest("f"),
      },
    );
    const fork = createRequest(
      "legacy-mage-batch",
      digest("6"),
      {
        version: "2026.07.31",
        catalogDigest: digest("7"),
        sourceReceiptDigest: digest("8"),
      },
    );
    const firstRegistry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(first),
    );
    const secondRegistry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(second),
    );
    const [left, right] = await Promise.all([
      firstRegistry.reserve(initial),
      secondRegistry.reserve(fork),
    ]);

    expect([left.outcome, right.outcome].sort()).toEqual([
      "conflict",
      "reserved",
    ]);
    const winner = left.outcome === "reserved" ? initial : fork;
    const afterRestart = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(restarted),
    );

    await expect(afterRestart.read({
      predecessorIndexDigest: winner.commitment.predecessorIndexDigest,
    })).resolves.toMatchObject({
      candidate: winner.candidate,
      commitment: winner.commitment,
    });
    await expect(afterRestart.reserve(winner)).resolves.toMatchObject({
      outcome: "replayed",
      record: {
        candidate: winner.candidate,
        commitment: winner.commitment,
      },
    });
  });

  it("returns the locked original record for a secondary successor-batch collision", async () => {
    if (first === undefined || second === undefined) {
      throw new Error("Isolated PostgreSQL clients were not initialized.");
    }
    const original = createRequest(
      "secondary-original-batch",
      digest("9"),
      {
        version: "2026.07.32",
        catalogDigest: digest("8"),
        sourceReceiptDigest: digest("7"),
      },
      digest("6"),
    );
    const collision = createRequest(
      "secondary-collision-batch",
      original.commitment.successorBatchDigest,
      {
        version: "2026.07.33",
        catalogDigest: digest("5"),
        sourceReceiptDigest: digest("4"),
      },
      digest("3"),
    );
    const firstRegistry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(first),
    );
    const secondRegistry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(second),
    );

    await expect(firstRegistry.reserve(original)).resolves.toMatchObject({
      outcome: "reserved",
    });
    await expect(secondRegistry.reserve(collision)).resolves.toMatchObject({
      outcome: "conflict",
      record: {
        candidate: original.candidate,
        commitment: original.commitment,
      },
    });
  });

  it("rolls back a rejected insert without leaving a predecessor reservation", async () => {
    if (first === undefined) {
      throw new Error("Isolated PostgreSQL client was not initialized.");
    }
    const rejected = createRequest(
      "rollback-batch",
      digest("c"),
      {
        version: "2026.07.34",
        catalogDigest: digest("b"),
        sourceReceiptDigest: digest("a"),
      },
      digest("d"),
    );
    await first.unsafe([
      "CREATE FUNCTION standard_pack_successor_commitment_test_reject_insert()",
      "RETURNS trigger LANGUAGE plpgsql AS $$",
      "BEGIN PERFORM 1 / 0; END;",
      "$$;",
      "CREATE TRIGGER standard_pack_successor_commitment_test_reject_insert",
      "BEFORE INSERT ON standard_pack_successor_commitments",
      "FOR EACH ROW EXECUTE FUNCTION standard_pack_successor_commitment_test_reject_insert();",
    ].join("\n"));
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(first),
    );

    await expect(registry.reserve(rejected)).rejects.toMatchObject({
      code: "SUCCESSOR_REGISTRY_UNAVAILABLE",
    });
    const rows = await first.unsafe(
      "SELECT EXISTS (SELECT 1 FROM standard_pack_successor_commitments WHERE predecessor_index_digest = $1) AS exists",
      [rejected.commitment.predecessorIndexDigest],
    );
    expect(rows[0]?.exists).toBe(false);
  });
});

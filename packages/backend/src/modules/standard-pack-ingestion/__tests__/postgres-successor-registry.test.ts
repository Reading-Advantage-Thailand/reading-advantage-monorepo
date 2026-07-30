import { createHash } from "node:crypto";

import { createPostgresStandardPackSuccessorCommitmentStore } from "@reading-advantage/db";
import type postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import {
  createStandardPackSuccessorRegistryPort,
} from "../index.js";

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
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return "{" + Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key]))
      .join(",") + "}";
  }
  throw new Error("Fixture digest payload contains a non-JSON value.");
}

/** Computes a SHA-256 digest after removing its self-referential digest property. */
function digestWithout(value: object, key: string): string {
  const payload = { ...(value as Record<string, unknown>) };
  delete payload[key];
  return createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
}

/**
 * Reorders nested object keys to model PostgreSQL JSONB key normalization.
 * @param value JSON-compatible value to reorder.
 * @returns Equivalent value with each object key sequence reversed.
 */
function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, child]) => [key, reverseObjectKeys(child)]),
  );
}

const commitmentDraft = {
  schemaVersion: 1 as const,
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

const candidate = {
  ...candidateDraft,
  candidateDigest: digestWithout(candidateDraft, "candidateDigest"),
};

/**
 * Recomputes a valid candidate digest after replacing its correlated commitment digest.
 * @param commitmentDigest Correlated commitment digest to include in the candidate.
 * @returns Candidate whose own digest matches its changed canonical payload.
 */
function candidateWithCommitmentDigest(commitmentDigest: string) {
  const candidateDraftWithCommitment = {
    ...candidate,
    candidateDigest: "",
    commitmentDigest,
  };
  return {
    ...candidateDraftWithCommitment,
    candidateDigest: digestWithout(
      candidateDraftWithCommitment,
      "candidateDigest",
    ),
  };
}

const request = {
  authorization: {
    policyId: "standard-pack.successor-registry.reserve" as const,
    actorId: "asset-release-admin",
  },
  candidate,
  commitment,
};

/** Creates a correlation-valid but digest-recomputed divergent successor request. */
function successorForkRequest() {
  const successorRelease = {
    version: "2026.07.31",
    catalogDigest: digest("7"),
    sourceReceiptDigest: digest("8"),
  };
  const forkCommitmentDraft = {
    ...commitment,
    successorBatchId: "legacy-mage-batch",
    successorBatchDigest: digest("6"),
    successorRelease,
    commitmentDigest: "",
  };
  const forkCommitment = {
    ...forkCommitmentDraft,
    commitmentDigest: digestWithout(
      forkCommitmentDraft,
      "commitmentDigest",
    ),
  };
  const forkCandidateDraft = {
    ...candidate,
    successorBatchId: forkCommitment.successorBatchId,
    successorBatchDigest: forkCommitment.successorBatchDigest,
    successorRelease: forkCommitment.successorRelease,
    commitmentDigest: forkCommitment.commitmentDigest,
    candidateDigest: "",
  };
  return {
    ...request,
    candidate: {
      ...forkCandidateDraft,
      candidateDigest: digestWithout(forkCandidateDraft, "candidateDigest"),
    },
    commitment: forkCommitment,
  };
}

const record = {
  candidate: request.candidate,
  commitment: request.commitment,
  reservedAt: "2026-07-30T14:00:00.000Z",
};

interface RegistryRow {
  readonly [column: string]: unknown;
  readonly candidate_json: unknown;
  readonly commitment_json: unknown;
  readonly reserved_at: string | Date;
}

interface ScriptedDatabase {
  readonly beginCalls: { count: number };
  readonly sql: postgres.Sql;
  readonly statements: readonly string[];
}

/**
 * Creates a transaction-capable postgres.js test double with ordered outcomes.
 * @param outcomes Query results or database errors returned in execution order.
 * @returns Scripted client, transaction count, and captured statement text.
 */
function scriptedDatabase(
  outcomes: readonly ((readonly Record<string, unknown>[]) | Error)[],
): ScriptedDatabase {
  const pending = [...outcomes];
  const statements: string[] = [];
  const beginCalls = { count: 0 };
  const tagged = vi.fn(async (
    strings: TemplateStringsArray,
  ) => {
    statements.push(strings.join("?"));
    const outcome = pending.shift();
    if (outcome === undefined) throw new Error("Unexpected SQL statement.");
    if (outcome instanceof Error) throw outcome;
    return outcome;
  });
  const sql = tagged as unknown as postgres.Sql;
  Object.assign(sql, {
    begin: async <T>(work: (transaction: postgres.TransactionSql) => Promise<T>) => {
      beginCalls.count += 1;
      return await work(sql as unknown as postgres.TransactionSql);
    },
    json: (value: unknown) => value,
  });
  return { beginCalls, sql, statements };
}

/** Builds a durable row fixture returned from the registry table. */
function storedRow(): RegistryRow {
  return {
    candidate_json: record.candidate,
    commitment_json: record.commitment,
    reserved_at: record.reservedAt,
  };
}

describe("PostgreSQL standard-pack successor registry", () => {
  it("inserts an initial commitment inside one transaction", async () => {
    const database = scriptedDatabase([[storedRow()]]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );

    await expect(registry.reserve(request)).resolves.toEqual({
      outcome: "reserved",
      record,
    });

    expect(database.beginCalls.count).toBe(1);
    expect(database.statements).toHaveLength(1);
    expect(database.statements[0]).toContain(
      "INSERT INTO standard_pack_successor_commitments",
    );
    expect(database.statements[0]).toContain(
      "ON CONFLICT (predecessor_index_digest) DO NOTHING",
    );
  });

  it("locks and replays an exact commitment after a duplicate insert", async () => {
    const database = scriptedDatabase([[], [storedRow()]]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );

    await expect(registry.reserve(request)).resolves.toEqual({
      outcome: "replayed",
      record,
    });

    expect(database.statements).toHaveLength(2);
    expect(database.statements[1]).toContain("FOR UPDATE");
  });

  it("replays a JSONB row whose nested object keys were reordered", async () => {
    const database = scriptedDatabase([[], [{
      candidate_json: reverseObjectKeys(record.candidate),
      commitment_json: reverseObjectKeys(record.commitment),
      reserved_at: record.reservedAt,
    }]]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );

    await expect(registry.reserve(request)).resolves.toEqual({
      outcome: "replayed",
      record,
    });
  });

  it("returns the locked original record when a successor forks the predecessor", async () => {
    const database = scriptedDatabase([[], [storedRow()]]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );
    const fork = successorForkRequest();

    await expect(registry.reserve(fork)).resolves.toEqual({
      outcome: "conflict",
      record,
    });
  });

  it("rehydrates an existing commitment without granting release authority", async () => {
    const database = scriptedDatabase([[storedRow()]]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );

    await expect(registry.read({
      predecessorIndexDigest: request.commitment.predecessorIndexDigest,
    })).resolves.toEqual(record);

    expect(database.statements[0]).toContain("SELECT candidate_json, commitment_json");
    expect(database.statements[0]).not.toContain("FOR UPDATE");
  });

  it("rejects malformed evidence before opening a transaction or issuing SQL", async () => {
    const database = scriptedDatabase([]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );
    const malformed = {
      ...request,
      candidate: {
        ...request.candidate,
        gitCandidate: { ...request.candidate.gitCandidate, revision: "HEAD" },
      },
    };

    await expect(registry.reserve(malformed as never)).rejects.toMatchObject({
      code: "SUCCESSOR_CANDIDATE_INVALID",
      retryable: false,
    });
    expect(database.beginCalls.count).toBe(0);
    expect(database.statements).toEqual([]);
  });

  it("rejects malformed predecessor lookups before issuing SQL", async () => {
    const database = scriptedDatabase([]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );

    await expect(registry.read({ predecessorIndexDigest: "not-a-digest" }))
      .rejects.toMatchObject({
        code: "SUCCESSOR_CANDIDATE_INVALID",
        retryable: false,
      });
    expect(database.statements).toEqual([]);
  });

  it("rejects stale request digests before opening a transaction or issuing SQL", async () => {
    const database = scriptedDatabase([]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );
    const staleDigest = {
      ...request,
      candidate: { ...request.candidate, candidateDigest: digest("0") },
    };

    await expect(registry.reserve(staleDigest)).rejects.toMatchObject({
      code: "SUCCESSOR_CANDIDATE_INVALID",
      retryable: false,
    });
    expect(database.beginCalls.count).toBe(0);
    expect(database.statements).toEqual([]);
  });

  it("rejects a stale request commitment digest before opening a transaction", async () => {
    const database = scriptedDatabase([]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );
    const commitmentDigest = digest("0");
    const candidateWithStaleCommitment = candidateWithCommitmentDigest(
      commitmentDigest,
    );
    const staleDigest = {
      ...request,
      candidate: candidateWithStaleCommitment,
      commitment: { ...request.commitment, commitmentDigest },
    };

    expect(candidateWithStaleCommitment.candidateDigest).toBe(
      digestWithout(candidateWithStaleCommitment, "candidateDigest"),
    );
    expect(staleDigest.commitment.commitmentDigest).not.toBe(
      digestWithout(staleDigest.commitment, "commitmentDigest"),
    );

    await expect(registry.reserve(staleDigest)).rejects.toMatchObject({
      code: "SUCCESSOR_CANDIDATE_INVALID",
      retryable: false,
    });
    expect(database.beginCalls.count).toBe(0);
    expect(database.statements).toEqual([]);
  });

  it("rejects a rehydrated row whose canonical candidate digest is stale", async () => {
    const database = scriptedDatabase([[
      {
        ...storedRow(),
        candidate_json: {
          ...record.candidate,
          candidateDigest: digest("0"),
        },
      },
    ]]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );

    await expect(registry.read({
      predecessorIndexDigest: request.commitment.predecessorIndexDigest,
    })).rejects.toMatchObject({
      code: "SUCCESSOR_REGISTRY_INTEGRITY_FAILURE",
      retryable: false,
    });
  });

  it("rejects a rehydrated row whose canonical commitment digest is stale", async () => {
    const commitmentDigest = digest("0");
    const candidateWithStaleCommitment = candidateWithCommitmentDigest(
      commitmentDigest,
    );
    const database = scriptedDatabase([[
      {
        ...storedRow(),
        candidate_json: candidateWithStaleCommitment,
        commitment_json: {
          ...record.commitment,
          commitmentDigest,
        },
      },
    ]]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );

    expect(candidateWithStaleCommitment.candidateDigest).toBe(
      digestWithout(candidateWithStaleCommitment, "candidateDigest"),
    );
    expect(commitmentDigest).not.toBe(
      digestWithout({ ...record.commitment, commitmentDigest }, "commitmentDigest"),
    );

    await expect(registry.read({
      predecessorIndexDigest: request.commitment.predecessorIndexDigest,
    })).rejects.toMatchObject({
      code: "SUCCESSOR_REGISTRY_INTEGRITY_FAILURE",
      retryable: false,
    });
  });

  it("recovers a secondary uniqueness violation in a new locked transaction", async () => {
    const uniqueViolation = Object.assign(
      new Error("unique violation"),
      { code: "23505" },
    );
    const database = scriptedDatabase([uniqueViolation, [storedRow()]]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );

    await expect(registry.reserve(request)).resolves.toEqual({
      outcome: "conflict",
      record,
    });
    expect(database.beginCalls.count).toBe(2);
    expect(database.statements[1]).toContain("successor_batch_digest");
    expect(database.statements[1]).toContain("commitment_digest");
    expect(database.statements[1]).toContain("FOR UPDATE");
  });

  it("rejects a secondary uniqueness conflict that cannot identify one record", async () => {
    const uniqueViolation = Object.assign(
      new Error("unique violation"),
      { code: "23505" },
    );
    const database = scriptedDatabase([uniqueViolation, []]);
    const registry = createStandardPackSuccessorRegistryPort(
      createPostgresStandardPackSuccessorCommitmentStore(database.sql),
    );

    await expect(registry.reserve(request)).rejects.toMatchObject({
      code: "SUCCESSOR_REGISTRY_INTEGRITY_FAILURE",
      retryable: false,
    });
  });
});

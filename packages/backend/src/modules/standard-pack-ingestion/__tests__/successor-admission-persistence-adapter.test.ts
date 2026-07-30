import { createHash } from "node:crypto";

import type {
  StandardPackSuccessorAdmissionPersistenceStore,
  StandardPackSuccessorAdmissionPersistenceTransaction,
  StandardPackSuccessorAdmissionReceiptStoreRow,
  StandardPackSuccessorAdmissionReplayStoreRow,
  StandardPackSuccessorCommitmentStoreReservation,
  StandardPackSuccessorCommitmentStoreRow,
} from "@reading-advantage/db";
import { describe, expect, it, vi } from "vitest";

import type {
  StandardPackSuccessorAdmissionReceipt,
  StandardPackSuccessorAdmissionReservation,
} from "../admission-contracts.js";
import { StandardPackSuccessorAdmissionError } from "../admission-errors.js";
import { createStandardPackSuccessorAdmissionPersistencePort } from "../successor-admission-persistence-adapter.js";

/** Creates one deterministic SHA-256-shaped fixture digest from a hexadecimal character. */
function digest(letter: string): string {
  return letter.repeat(64);
}

/** Serializes a JSON-compatible value with recursive key ordering. */
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
  throw new Error("Fixture must be JSON-compatible.");
}

/** Computes a canonical SHA-256 fixture digest after omitting one self-referential field. */
function digestWithout(value: Readonly<Record<string, unknown>>, omitted: string): string {
  const { [omitted]: _omitted, ...payload } = value;
  return createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
}

const baseCommitment = {
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
  ...baseCommitment,
  commitmentDigest: digestWithout(baseCommitment, "commitmentDigest"),
};

const baseCandidate = {
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
  ...baseCandidate,
  candidateDigest: digestWithout(baseCandidate, "candidateDigest"),
};

const reservation: StandardPackSuccessorAdmissionReservation = { candidate, commitment };

const receipt: StandardPackSuccessorAdmissionReceipt = {
  id: "5b57ed22-369d-46e3-a96f-514f7a7ff70e",
  schemaVersion: 1,
  commitmentDigest: commitment.commitmentDigest,
  candidateDigest: candidate.candidateDigest,
  actorId: "asset-release-admin",
  policyId: "standard-pack.successor-admission",
  idempotencyKeyFingerprint: digest("9"),
  requestInputDigest: digest("8"),
  correlationId: "0f941a87-0abe-4436-af6f-0e6807c67bc0",
  outcome: "reserved",
  safeAudit: {
    eventType: "standard-pack.successor-admission",
    outcome: "reserved",
    actorId: "asset-release-admin",
    policyId: "standard-pack.successor-admission",
    correlationId: "0f941a87-0abe-4436-af6f-0e6807c67bc0",
    predecessorIndexDigest: commitment.predecessorIndexDigest,
    successorBatchDigest: commitment.successorBatchDigest,
    candidateDigest: candidate.candidateDigest,
    commitmentDigest: commitment.commitmentDigest,
    idempotencyKeyFingerprint: digest("9"),
    requestInputDigest: digest("8"),
    recordedAt: "2026-07-30T15:00:02.000Z",
  },
  observability: {
    operation: "standard-pack.successor-admission",
    outcome: "reserved",
    actorId: "asset-release-admin",
    policyId: "standard-pack.successor-admission",
    correlationId: "0f941a87-0abe-4436-af6f-0e6807c67bc0",
    predecessorIndexDigest: commitment.predecessorIndexDigest,
    successorBatchDigest: commitment.successorBatchDigest,
    candidateDigest: candidate.candidateDigest,
    commitmentDigest: commitment.commitmentDigest,
    idempotencyKeyFingerprint: digest("9"),
    requestInputDigest: digest("8"),
  },
  recordedAt: "2026-07-30T15:00:02.000Z",
};

/** Builds one structurally valid alternate reservation for conflict classification tests. */
function alternateReservation(): StandardPackSuccessorAdmissionReservation {
  const commitmentDraft = {
    ...commitment,
    successorBatchId: "other-batch",
    successorBatchDigest: digest("7"),
    commitmentDigest: "",
  };
  const alternateCommitment = {
    ...commitmentDraft,
    commitmentDigest: digestWithout(commitmentDraft, "commitmentDigest"),
  };
  const candidateDraft = {
    ...candidate,
    successorBatchId: alternateCommitment.successorBatchId,
    successorBatchDigest: alternateCommitment.successorBatchDigest,
    commitmentDigest: alternateCommitment.commitmentDigest,
    candidateDigest: "",
  };
  return {
    candidate: {
      ...candidateDraft,
      candidateDigest: digestWithout(candidateDraft, "candidateDigest"),
    },
    commitment: alternateCommitment,
  };
}

/** Builds one raw immutable registry row from any structurally valid reservation. */
function registryRowFor(
  value: StandardPackSuccessorAdmissionReservation,
): StandardPackSuccessorCommitmentStoreRow {
  return {
    candidateJson: value.candidate,
    commitmentJson: value.commitment,
    reservedAt: "2026-07-30T15:00:01.000Z",
  };
}

/** Builds one raw immutable registry row from the default fixture reservation. */
function registryRow(): StandardPackSuccessorCommitmentStoreRow {
  return registryRowFor(reservation);
}

/** Builds one raw receipt row from the exact canonical receipt projection. */
function receiptRow(): StandardPackSuccessorAdmissionReceiptStoreRow {
  return {
    id: receipt.id,
    schemaVersion: receipt.schemaVersion,
    commitmentDigest: receipt.commitmentDigest,
    candidateDigest: receipt.candidateDigest,
    actorId: receipt.actorId,
    policyId: receipt.policyId,
    idempotencyKeyFingerprint: receipt.idempotencyKeyFingerprint,
    requestInputDigest: receipt.requestInputDigest,
    correlationId: receipt.correlationId,
    outcome: receipt.outcome,
    safeAuditJson: receipt.safeAudit,
    observabilityJson: receipt.observability,
    receiptJson: receipt,
    recordedAt: receipt.recordedAt,
  };
}

/** Creates one fake raw DB transaction whose calls can be inspected by the adapter tests. */
function createStoreTransaction(input: {
  readonly existingReceipt?: StandardPackSuccessorAdmissionReplayStoreRow | null;
  readonly reservation?: StandardPackSuccessorCommitmentStoreReservation;
  readonly appendRow?: StandardPackSuccessorAdmissionReceiptStoreRow;
  readonly reserveError?: Error;
} = {}) {
  return {
    readReceipt: vi.fn(async (): Promise<StandardPackSuccessorAdmissionReplayStoreRow | null> =>
      input.existingReceipt ?? null),
    reserveSuccessor: vi.fn(async () => {
      if (input.reserveError !== undefined) throw input.reserveError;
      return input.reservation ?? { outcome: "inserted" as const, row: registryRow() };
    }),
    appendReceipt: vi.fn(async () => input.appendRow ?? receiptRow()),
  } satisfies StandardPackSuccessorAdmissionPersistenceTransaction;
}

/** Creates an atomic raw store that rethrows callback errors and exposes the fake transaction. */
function createStore(transaction: StandardPackSuccessorAdmissionPersistenceTransaction): StandardPackSuccessorAdmissionPersistenceStore {
  return {
    transaction: async <T>(work: (active: StandardPackSuccessorAdmissionPersistenceTransaction) => Promise<T>) =>
      await work(transaction),
  };
}

/** Copies one JSON-compatible value while reversing object-key insertion order at every level. */
function reorderJson<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reorderJson) as T;
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, nested]) => [key, reorderJson(nested)]),
    ) as T;
  }
  return value;
}

describe("standard-pack successor admission persistence adapter", () => {
  it("maps an inserted registry reservation to a durable backend reservation and flattens all DB-owned columns", async () => {
    const raw = createStoreTransaction();
    const port = createStandardPackSuccessorAdmissionPersistencePort(createStore(raw));

    await port.transaction(async (transaction) => {
      await expect(transaction.reserveSuccessor(reservation)).resolves.toEqual({
        outcome: "reserved",
        record: {
          candidate,
          commitment,
          reservedAt: "2026-07-30T15:00:01.000Z",
        },
      });
    });

    expect(raw.reserveSuccessor).toHaveBeenCalledWith(expect.objectContaining({
      schemaVersion: 1,
      predecessorIndexDigest: commitment.predecessorIndexDigest,
      predecessorVersion: commitment.predecessorRelease.version,
      successorBatchId: commitment.successorBatchId,
      candidateRepositoryId: candidate.gitCandidate.repositoryId,
      candidateRevision: candidate.gitCandidate.revision,
      candidateTreeDigest: candidate.gitCandidate.treeDigest,
      descriptorDigest: candidate.descriptorDigest,
      sourcePacketDigest: candidate.sourcePacketDigest,
      candidateDigest: candidate.candidateDigest,
      commitmentDigest: commitment.commitmentDigest,
      candidateJson: candidate,
      commitmentJson: commitment,
    }));
  });

  it("classifies a JSONB-reordered exact predecessor retry as replayed", async () => {
    const raw = createStoreTransaction({
      reservation: {
        outcome: "predecessor-existing",
        row: {
          candidateJson: reorderJson(candidate),
          commitmentJson: reorderJson(commitment),
          reservedAt: new Date("2026-07-30T15:00:01.000Z"),
        },
      },
    });
    const port = createStandardPackSuccessorAdmissionPersistencePort(createStore(raw));

    await port.transaction(async (transaction) => {
      await expect(transaction.reserveSuccessor(reservation)).resolves.toMatchObject({ outcome: "replayed" });
    });
  });

  it("classifies secondary uniqueness and divergent predecessor rows as conflicts", async () => {
    const secondary = createStoreTransaction({
      reservation: { outcome: "secondary-existing", row: registryRowFor(alternateReservation()) },
    });
    const predecessor = createStoreTransaction({
      reservation: {
        outcome: "predecessor-existing",
        row: registryRowFor(alternateReservation()),
      },
    });

    await createStandardPackSuccessorAdmissionPersistencePort(createStore(secondary)).transaction(async (transaction) => {
      await expect(transaction.reserveSuccessor(reservation)).resolves.toMatchObject({ outcome: "conflict" });
    });
    await createStandardPackSuccessorAdmissionPersistencePort(createStore(predecessor)).transaction(async (transaction) => {
      await expect(transaction.reserveSuccessor(reservation)).resolves.toMatchObject({ outcome: "conflict" });
    });
  });

  it("reads one locked receipt with registry integrity validation across JSONB key reordering", async () => {
    const reorderedReceipt = reorderJson(receipt);
    const raw = createStoreTransaction({
      existingReceipt: {
        receipt: { ...receiptRow(), receiptJson: reorderedReceipt },
        registryRow: registryRow(),
      },
    });
    const port = createStandardPackSuccessorAdmissionPersistencePort(createStore(raw));

    await port.transaction(async (transaction) => {
      await expect(transaction.readReceipt({
        actorId: receipt.actorId,
        policyId: receipt.policyId,
        idempotencyKeyFingerprint: receipt.idempotencyKeyFingerprint,
      })).resolves.toEqual({
        receipt,
        registryRecord: {
          candidate,
          commitment,
          reservedAt: "2026-07-30T15:00:01.000Z",
        },
      });
    });
  });

  it("rejects malformed locked rows and receipt projections before command replay logic can trust them", async () => {
    const raw = createStoreTransaction({
      existingReceipt: {
        receipt: { ...receiptRow(), receiptJson: { ...receipt, actorId: "" } },
        registryRow: registryRow(),
      },
    });
    const port = createStandardPackSuccessorAdmissionPersistencePort(createStore(raw));

    await port.transaction(async (transaction) => {
      await expect(transaction.readReceipt({
        actorId: receipt.actorId,
        policyId: receipt.policyId,
        idempotencyKeyFingerprint: receipt.idempotencyKeyFingerprint,
      })).rejects.toMatchObject({
        code: "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
        retryable: false,
      } satisfies Partial<StandardPackSuccessorAdmissionError>);
    });
  });

  it("appends and requires the exact canonical receipt projection", async () => {
    const raw = createStoreTransaction();
    const port = createStandardPackSuccessorAdmissionPersistencePort(createStore(raw));

    await port.transaction(async (transaction) => {
      await expect(transaction.appendReceipt({ receipt })).resolves.toEqual(receipt);
    });

    expect(raw.appendReceipt).toHaveBeenCalledWith({
      id: receipt.id,
      schemaVersion: receipt.schemaVersion,
      commitmentDigest: receipt.commitmentDigest,
      candidateDigest: receipt.candidateDigest,
      actorId: receipt.actorId,
      policyId: receipt.policyId,
      idempotencyKeyFingerprint: receipt.idempotencyKeyFingerprint,
      requestInputDigest: receipt.requestInputDigest,
      correlationId: receipt.correlationId,
      outcome: receipt.outcome,
      safeAuditJson: receipt.safeAudit,
      observabilityJson: receipt.observability,
      receiptJson: receipt,
      recordedAt: receipt.recordedAt,
    });
  });

  it("preserves structured raw-store errors without wrapping them", async () => {
    const storageError = Object.assign(new Error("storage unavailable"), {
      code: "UNAVAILABLE" as const,
      retryable: true,
    });
    const raw = createStoreTransaction({ reserveError: storageError });
    const port = createStandardPackSuccessorAdmissionPersistencePort(createStore(raw));

    await port.transaction(async (transaction) => {
      await expect(transaction.reserveSuccessor(reservation)).rejects.toBe(storageError);
    });
  });
});

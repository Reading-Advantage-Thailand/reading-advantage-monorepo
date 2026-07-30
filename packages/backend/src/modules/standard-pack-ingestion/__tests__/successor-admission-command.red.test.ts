import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import * as successorAdmissionModule from "../index.js";
import {
  StandardPackSuccessorAdmissionError,
  standardPackSuccessorAdmissionInputSchema,
  standardPackSuccessorAdmissionReceiptSchema,
  standardPackSuccessorAdmissionTrustedContextSchema,
  type StandardPackImmutableGitCandidateVerification,
  type StandardPackSuccessorAdmissionCommand,
  type StandardPackSuccessorAdmissionCommandDependencies,
  type StandardPackSuccessorAdmissionInput,
  type StandardPackSuccessorAdmissionReceipt,
  type StandardPackSuccessorAdmissionReplayRecord,
  type StandardPackSuccessorAdmissionReservationResult,
  type StandardPackSuccessorAdmissionTransaction,
  type StandardPackSuccessorAdmissionTrustedContext,
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

const input: StandardPackSuccessorAdmissionInput = {
  schemaVersion: 1,
  candidate,
  commitment,
  idempotencyKey: "successor-admission-key-0001",
};

const context: StandardPackSuccessorAdmissionTrustedContext = {
  actorId: "asset-release-admin",
  policyId: "standard-pack.successor-admission",
  correlationId: "0f941a87-0abe-4436-af6f-0e6807c67bc0",
  requestedAt: "2026-07-30T15:00:00.000Z",
};

const requestIdentity = {
  idempotencyKeyFingerprint: digest("9"),
  requestInputDigest: digest("8"),
};

const record = {
  candidate,
  commitment,
  reservedAt: "2026-07-30T15:00:01.000Z",
};

const receipt: StandardPackSuccessorAdmissionReceipt = {
  id: "5b57ed22-369d-46e3-a96f-514f7a7ff70e",
  schemaVersion: 1,
  commitmentDigest: commitment.commitmentDigest,
  candidateDigest: candidate.candidateDigest,
  actorId: context.actorId,
  policyId: context.policyId,
  idempotencyKeyFingerprint: requestIdentity.idempotencyKeyFingerprint,
  requestInputDigest: requestIdentity.requestInputDigest,
  correlationId: context.correlationId,
  outcome: "reserved",
  safeAudit: {
    eventType: "standard-pack.successor-admission",
    outcome: "reserved",
    actorId: context.actorId,
    policyId: context.policyId,
    correlationId: context.correlationId,
    predecessorIndexDigest: commitment.predecessorIndexDigest,
    successorBatchDigest: commitment.successorBatchDigest,
    candidateDigest: candidate.candidateDigest,
    commitmentDigest: commitment.commitmentDigest,
    idempotencyKeyFingerprint: requestIdentity.idempotencyKeyFingerprint,
    requestInputDigest: requestIdentity.requestInputDigest,
    recordedAt: "2026-07-30T15:00:02.000Z",
  },
  observability: {
    operation: "standard-pack.successor-admission",
    outcome: "reserved",
    actorId: context.actorId,
    policyId: context.policyId,
    correlationId: context.correlationId,
    predecessorIndexDigest: commitment.predecessorIndexDigest,
    successorBatchDigest: commitment.successorBatchDigest,
    candidateDigest: candidate.candidateDigest,
    commitmentDigest: commitment.commitmentDigest,
    idempotencyKeyFingerprint: requestIdentity.idempotencyKeyFingerprint,
    requestInputDigest: requestIdentity.requestInputDigest,
  },
  recordedAt: "2026-07-30T15:00:02.000Z",
};

const verifiedCandidate: StandardPackImmutableGitCandidateVerification = {
  status: "verified",
  repositoryId: candidate.gitCandidate.repositoryId,
  revision: candidate.gitCandidate.revision,
  treeDigest: candidate.gitCandidate.treeDigest,
  candidateDigest: candidate.candidateDigest,
  descriptorDigest: candidate.descriptorDigest,
  sourcePacketDigest: candidate.sourcePacketDigest,
  commitmentDigest: commitment.commitmentDigest,
  verifiedAt: "2026-07-30T15:00:01.000Z",
};

/** Rehashes a candidate after changing evidence that is bound into its digest. */
function candidateWithSourcePacket(sourcePacketDigest: string) {
  const draft = {
    ...candidate,
    sourcePacketDigest,
    candidateDigest: "",
  };
  return {
    ...draft,
    candidateDigest: digestWithout(draft, "candidateDigest"),
  };
}

/** Builds command dependencies with transaction behavior explicit enough to prove the desired service ordering. */
function createDependencies(inputOptions: {
  readonly authorization?: "allowed" | "denied";
  readonly receipt?: StandardPackSuccessorAdmissionReplayRecord | null;
  readonly reservation?: StandardPackSuccessorAdmissionReservationResult;
  readonly verifierError?: Error;
  readonly appendError?: Error;
  readonly changedRequestInputDigest?: string;
} = {}) {
  const transaction: StandardPackSuccessorAdmissionTransaction = {
    readReceipt: vi.fn(async () => inputOptions.receipt ?? null),
    reserveSuccessor: vi.fn(async () => inputOptions.reservation ?? {
      outcome: "reserved" as const,
      record,
    }),
    appendReceipt: vi.fn(async ({ receipt: nextReceipt }) => {
      if (inputOptions.appendError !== undefined) throw inputOptions.appendError;
      return nextReceipt;
    }),
  };
  const rollbackCalls = { count: 0 };
  const dependencies: StandardPackSuccessorAdmissionCommandDependencies = {
    authorization: {
      authorize: vi.fn(async () => inputOptions.authorization === "denied"
        ? { outcome: "denied" as const, reasonCode: "POLICY_DENIED" as const }
        : { outcome: "allowed" as const }),
    },
    gitCandidateVerifier: {
      verify: vi.fn(async () => {
        if (inputOptions.verifierError !== undefined) throw inputOptions.verifierError;
        return verifiedCandidate;
      }),
    },
    hasher: {
      fingerprintIdempotencyKey: vi.fn(async () => requestIdentity.idempotencyKeyFingerprint),
      digestRequestInput: vi.fn(async (reservation) => (
        reservation.candidate.sourcePacketDigest === candidate.sourcePacketDigest
          ? requestIdentity.requestInputDigest
          : inputOptions.changedRequestInputDigest ?? digest("7")
      )),
    },
    persistence: {
      async transaction<T>(work: (active: StandardPackSuccessorAdmissionTransaction) => Promise<T>): Promise<T> {
        try {
          return await work(transaction);
        } catch (error) {
          rollbackCalls.count += 1;
          throw error;
        }
      },
    },
    audit: { append: vi.fn(async () => undefined) },
    observability: { emit: vi.fn() },
    createReceiptId: vi.fn(() => receipt.id),
    now: vi.fn(() => new Date(receipt.recordedAt)),
  };
  return { dependencies, rollbackCalls, transaction };
}

type ExpectedAdmissionCommandFactory = (
  dependencies: Readonly<StandardPackSuccessorAdmissionCommandDependencies>,
) => StandardPackSuccessorAdmissionCommand;

/** Resolves the Phase 3 factory that is intentionally absent until the Green implementation exists. */
function createCommand(
  dependencies: Readonly<StandardPackSuccessorAdmissionCommandDependencies>,
): StandardPackSuccessorAdmissionCommand {
  const factory = (successorAdmissionModule as unknown as {
    readonly createStandardPackSuccessorAdmissionCommand?: unknown;
  }).createStandardPackSuccessorAdmissionCommand;
  expect(factory).toBeTypeOf("function");
  return (factory as ExpectedAdmissionCommandFactory)(dependencies);
}

describe("standard-pack successor-admission contracts", () => {
  it("accepts untrusted evidence only when authorization remains in trusted context", () => {
    expect(standardPackSuccessorAdmissionInputSchema.safeParse(input).success).toBe(true);
    expect(standardPackSuccessorAdmissionInputSchema.safeParse({
      ...input,
      authorization: { actorId: context.actorId },
    }).success).toBe(false);
    expect(standardPackSuccessorAdmissionTrustedContextSchema.safeParse(context).success).toBe(true);
    expect(standardPackSuccessorAdmissionTrustedContextSchema.safeParse({
      ...context,
      correlationId: "apk-admission-0001",
    }).success).toBe(false);
    expect(standardPackSuccessorAdmissionReceiptSchema.safeParse(receipt).success).toBe(true);
    expect(standardPackSuccessorAdmissionReceiptSchema.safeParse({
      ...receipt,
      idempotencyKey: input.idempotencyKey,
    }).success).toBe(false);
  });
});

describe("standard-pack successor-admission command (red)", () => {
  it("denies authorization before Git verification or transaction persistence", async () => {
    const { dependencies, transaction } = createDependencies({ authorization: "denied" });
    const command = createCommand(dependencies);

    await expect(command.admit(input, context)).rejects.toMatchObject({
      code: "SUCCESSOR_ADMISSION_UNAUTHORIZED",
      retryable: false,
    });
    expect(dependencies.gitCandidateVerifier.verify).not.toHaveBeenCalled();
    expect(dependencies.persistence.transaction).not.toHaveBeenCalled();
    expect(transaction.readReceipt).not.toHaveBeenCalled();
  });

  it("rejects an immutable Git-verification failure before transaction persistence", async () => {
    const verifierError = new StandardPackSuccessorAdmissionError(
      "SUCCESSOR_ADMISSION_GIT_CANDIDATE_INVALID",
      "The immutable candidate cannot be verified.",
      false,
    );
    const { dependencies } = createDependencies({ verifierError });
    const command = createCommand(dependencies);

    await expect(command.admit(input, context)).rejects.toBe(verifierError);
    expect(dependencies.persistence.transaction).not.toHaveBeenCalled();
  });

  it("delegates rollback of a receipt append failure to the atomic persistence boundary", async () => {
    const receiptError = new Error("receipt append rejected");
    const { dependencies, rollbackCalls, transaction } = createDependencies({ appendError: receiptError });
    const command = createCommand(dependencies);

    await expect(command.admit(input, context)).rejects.toBe(receiptError);
    expect(transaction.reserveSuccessor).toHaveBeenCalledTimes(1);
    expect(transaction.appendReceipt).toHaveBeenCalledTimes(1);
    expect(rollbackCalls.count).toBe(1);
  });

  it("returns the original receipt for an exact idempotent replay without a new reservation", async () => {
    const { dependencies, transaction } = createDependencies({
      receipt: { receipt, registryRecord: record },
    });
    const command = createCommand(dependencies);

    await expect(command.admit(input, context)).resolves.toEqual({
      outcome: "replayed",
      receipt,
    });
    expect(dependencies.gitCandidateVerifier.verify).not.toHaveBeenCalled();
    expect(transaction.reserveSuccessor).not.toHaveBeenCalled();
    expect(transaction.appendReceipt).not.toHaveBeenCalled();
  });

  it("rejects changed evidence that reuses an idempotency key without another reservation", async () => {
    const { dependencies, transaction } = createDependencies({
      receipt: { receipt, registryRecord: record },
      changedRequestInputDigest: digest("7"),
    });
    const command = createCommand(dependencies);
    const changedInput: StandardPackSuccessorAdmissionInput = {
      ...input,
      candidate: candidateWithSourcePacket(digest("6")),
    };

    await expect(command.admit(changedInput, context)).rejects.toMatchObject({
      code: "SUCCESSOR_ADMISSION_IDEMPOTENCY_CONFLICT",
      retryable: false,
    });
    expect(transaction.reserveSuccessor).not.toHaveBeenCalled();
    expect(transaction.appendReceipt).not.toHaveBeenCalled();
  });

  it("does not append a receipt when the authoritative registry returns a divergent successor", async () => {
    const { dependencies, transaction } = createDependencies({
      reservation: { outcome: "conflict", record },
    });
    const command = createCommand(dependencies);

    await expect(command.admit(input, context)).rejects.toMatchObject({
      code: "SUCCESSOR_ADMISSION_REGISTRY_CONFLICT",
      retryable: false,
    });
    expect(transaction.appendReceipt).not.toHaveBeenCalled();
  });

  it("keeps the raw idempotency key out of receipts, audit events, and observability fields", async () => {
    const { dependencies, transaction } = createDependencies();
    const command = createCommand(dependencies);

    await expect(command.admit(input, context)).resolves.toMatchObject({
      outcome: "admitted",
      receipt: expect.objectContaining(requestIdentity),
    });
    const durableAndOperationalPayload = JSON.stringify({
      receiptAppend: transaction.appendReceipt.mock.calls,
      audit: dependencies.audit.append.mock.calls,
      observability: dependencies.observability.emit.mock.calls,
    });
    expect(durableAndOperationalPayload).not.toContain(input.idempotencyKey);
    expect(durableAndOperationalPayload).toContain(requestIdentity.idempotencyKeyFingerprint);
  });
});

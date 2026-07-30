import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type {
  StandardPackIngestionLedgerSuccessorAdmissionProof,
  StandardPackSuccessorAdmissionCommand,
  StandardPackSuccessorAdmissionInput,
  StandardPackSuccessorAdmissionResult,
  StandardPackSuccessorAdmissionTrustedContext,
  StandardPackSuccessorCommitment,
  StandardPackSuccessorRegistryPort,
  StandardPackSuccessorRegistryRecord,
} from "../index.js";
import {
  createStandardPackIngestionLedgerSuccessorAdmissionFacade,
  StandardPackSuccessorAdmissionError,
} from "../index.js";

/** Serializes JSON-compatible values with recursively sorted object keys. */
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
  throw new Error("Fixture payload must be JSON-compatible.");
}

/** Computes one canonical SHA-256 digest after excluding its self-referential field. */
function digestWithout(value: object, key: string): string {
  const payload = { ...(value as Record<string, unknown>) };
  delete payload[key];
  return createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
}

/** Creates a deterministic SHA-256-shaped fixture digest. */
function digest(letter: string): string {
  return letter.repeat(64);
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
    version: "2026.07.31",
    catalogDigest: digest("e"),
    sourceReceiptDigest: digest("f"),
  },
  commitmentDigest: "",
};

const commitment: StandardPackSuccessorCommitment = {
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

const trustedContext: StandardPackSuccessorAdmissionTrustedContext = {
  actorId: "asset-release-admin",
  policyId: "standard-pack.successor-admission",
  correlationId: "0f941a87-0abe-4436-af6f-0e6807c67bc0",
  requestedAt: "2026-07-31T01:00:00.000Z",
};

const proof: StandardPackIngestionLedgerSuccessorAdmissionProof = {
  input,
  trustedContext,
};

const predecessorIndex = {
  snapshotDigest: commitment.predecessorIndexDigest,
  predecessorRelease: commitment.predecessorRelease,
};

const record: StandardPackSuccessorRegistryRecord = {
  candidate,
  commitment,
  reservedAt: "2026-07-31T01:00:01.000Z",
};

/** Creates a valid alternate successor commitment, optionally with a different predecessor identity. */
function alternateCommitment(inputOptions: {
  readonly predecessorIndexDigest?: string;
  readonly predecessorRelease?: StandardPackSuccessorCommitment["predecessorRelease"];
} = {}): StandardPackSuccessorCommitment {
  const draft = {
    ...commitment,
    predecessorIndexDigest: inputOptions.predecessorIndexDigest ?? commitment.predecessorIndexDigest,
    predecessorRelease: inputOptions.predecessorRelease ?? commitment.predecessorRelease,
    successorBatchId: "competing-legacy-hero-batch",
    successorBatchDigest: digest("7"),
    successorRelease: {
      version: "2026.08.01",
      catalogDigest: digest("8"),
      sourceReceiptDigest: digest("9"),
    },
    commitmentDigest: "",
  };
  return {
    ...draft,
    commitmentDigest: digestWithout(draft, "commitmentDigest"),
  };
}

/** Creates a valid registry record for a supplied commitment. */
function recordFor(nextCommitment: StandardPackSuccessorCommitment): StandardPackSuccessorRegistryRecord {
  const candidateDraftForCommitment = {
    ...candidate,
    predecessorIndexDigest: nextCommitment.predecessorIndexDigest,
    predecessorRelease: nextCommitment.predecessorRelease,
    successorBatchId: nextCommitment.successorBatchId,
    successorBatchDigest: nextCommitment.successorBatchDigest,
    successorRelease: nextCommitment.successorRelease,
    commitmentDigest: nextCommitment.commitmentDigest,
    candidateDigest: "",
  };
  const nextCandidate = {
    ...candidateDraftForCommitment,
    candidateDigest: digestWithout(candidateDraftForCommitment, "candidateDigest"),
  };
  return {
    candidate: nextCandidate,
    commitment: nextCommitment,
    reservedAt: "2026-07-31T01:00:01.000Z",
  };
}

/** Creates a full valid Phase 3 proof for a supplied backend registry record. */
function proofFor(nextRecord: StandardPackSuccessorRegistryRecord): StandardPackIngestionLedgerSuccessorAdmissionProof {
  return {
    input: {
      ...input,
      candidate: nextRecord.candidate,
      commitment: nextRecord.commitment,
    },
    trustedContext,
  };
}

/** Creates facade dependencies with inspectable resolver, Phase 3 command, and durable registry boundaries. */
function createDependencies(inputOptions: {
  readonly commandError?: Error;
  readonly commandOutcomes?: readonly ("admitted" | "replayed")[];
  readonly record?: StandardPackSuccessorRegistryRecord | null;
  readonly resolverError?: Error;
  readonly resolverProof?: StandardPackIngestionLedgerSuccessorAdmissionProof;
} = {}) {
  const commandOutcomes = [...(inputOptions.commandOutcomes ?? ["admitted"])];
  const admit = vi.fn(async (
    _input: Readonly<StandardPackSuccessorAdmissionInput>,
    _context: Readonly<StandardPackSuccessorAdmissionTrustedContext>,
  ): Promise<Readonly<StandardPackSuccessorAdmissionResult>> => {
    if (inputOptions.commandError !== undefined) throw inputOptions.commandError;
    return {
      outcome: commandOutcomes.shift() ?? "replayed",
      receipt: {} as never,
    };
  });
  const read = vi.fn(async () => inputOptions.record === undefined ? record : inputOptions.record);
  const resolve = vi.fn(async () => {
    if (inputOptions.resolverError !== undefined) throw inputOptions.resolverError;
    return inputOptions.resolverProof ?? proof;
  });
  const registry = {
    read,
    reserve: vi.fn(),
  } satisfies StandardPackSuccessorRegistryPort;
  const admissionCommand = { admit } satisfies StandardPackSuccessorAdmissionCommand;
  const proofResolver = { resolve };
  return { admissionCommand, proofResolver, registry, read, resolve };
}

describe("standard-pack ingestion ledger successor-admission facade", () => {
  it("maps a durable read for any valid portable predecessor index without invoking the resolver or admission command", async () => {
    const genericPredecessorRelease = {
      version: "2026.08.01",
      catalogDigest: digest("0"),
      sourceReceiptDigest: digest("1"),
    };
    const genericCommitment = alternateCommitment({
      predecessorIndexDigest: digest("2"),
      predecessorRelease: genericPredecessorRelease,
    });
    const genericIndex = {
      snapshotDigest: genericCommitment.predecessorIndexDigest,
      predecessorRelease: genericPredecessorRelease,
    };
    const { admissionCommand, proofResolver, registry, read, resolve } = createDependencies({
      record: recordFor(genericCommitment),
    });
    const facade = createStandardPackIngestionLedgerSuccessorAdmissionFacade({
      admissionCommand,
      registry,
      proofResolver,
    });

    await expect(facade.readSuccessorCommitment(genericIndex)).resolves.toEqual(genericCommitment);
    expect(read).toHaveBeenCalledWith({
      predecessorIndexDigest: genericIndex.snapshotDigest,
    });
    expect(resolve).not.toHaveBeenCalled();
    expect(admissionCommand.admit).not.toHaveBeenCalled();
  });

  it("uses only a valid snapshot digest for generic reads when a portable historical release is not Phase 3 date-shaped", async () => {
    const historicalPortableIndex = {
      snapshotDigest: commitment.predecessorIndexDigest,
      predecessorRelease: {
        ...commitment.predecessorRelease,
        version: "historical-catalog-snapshot",
      },
    };
    const { admissionCommand, proofResolver, registry, read, resolve } = createDependencies();
    const facade = createStandardPackIngestionLedgerSuccessorAdmissionFacade({
      admissionCommand,
      registry,
      proofResolver,
    });

    await expect(facade.readSuccessorCommitment(historicalPortableIndex))
      .resolves.toEqual(commitment);
    expect(read).toHaveBeenCalledWith({
      predecessorIndexDigest: historicalPortableIndex.snapshotDigest,
    });
    expect(resolve).not.toHaveBeenCalled();
    expect(admissionCommand.admit).not.toHaveBeenCalled();
  });

  it("resolves the exact closed Phase 3 proof for admission and replay, then returns the durable commitment", async () => {
    const { admissionCommand, proofResolver, registry, read, resolve } = createDependencies({
      commandOutcomes: ["admitted", "replayed"],
    });
    const facade = createStandardPackIngestionLedgerSuccessorAdmissionFacade({
      admissionCommand,
      registry,
      proofResolver,
    });

    await expect(facade.reserveSuccessorCommitment(predecessorIndex, commitment))
      .resolves.toEqual(commitment);
    await expect(facade.reserveSuccessorCommitment(predecessorIndex, commitment))
      .resolves.toEqual(commitment);

    expect(resolve).toHaveBeenNthCalledWith(1, { predecessorIndex, commitment });
    expect(resolve).toHaveBeenNthCalledWith(2, { predecessorIndex, commitment });
    expect(admissionCommand.admit).toHaveBeenNthCalledWith(1, input, trustedContext);
    expect(admissionCommand.admit).toHaveBeenNthCalledWith(2, input, trustedContext);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("rejects a mismatched resolver proof before invoking the Phase 3 command", async () => {
    const mismatchedProof = proofFor(recordFor(alternateCommitment()));
    const { admissionCommand, proofResolver, registry, read, resolve } = createDependencies({
      resolverProof: mismatchedProof,
    });
    const facade = createStandardPackIngestionLedgerSuccessorAdmissionFacade({
      admissionCommand,
      registry,
      proofResolver,
    });

    await expect(facade.reserveSuccessorCommitment(predecessorIndex, commitment))
      .rejects.toMatchObject({
        code: "SUCCESSOR_ADMISSION_EVIDENCE_INVALID",
        retryable: false,
      });
    expect(resolve).toHaveBeenCalledWith({ predecessorIndex, commitment });
    expect(admissionCommand.admit).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it("maps an untyped resolver failure to the public retryable error without invoking admission", async () => {
    const { admissionCommand, proofResolver, registry, read, resolve } = createDependencies({
      resolverError: new Error("secret resolver credential rejected"),
    });
    const facade = createStandardPackIngestionLedgerSuccessorAdmissionFacade({
      admissionCommand,
      registry,
      proofResolver,
    });

    await expect(facade.reserveSuccessorCommitment(predecessorIndex, commitment))
      .rejects.toMatchObject({
        code: "SUCCESSOR_ADMISSION_UNAVAILABLE",
        retryable: true,
        message: "Successor-admission proof resolution is temporarily unavailable.",
      });
    expect(resolve).toHaveBeenCalledWith({ predecessorIndex, commitment });
    expect(admissionCommand.admit).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it("rejects a mismatched portable index before resolving and a mismatched commitment proof before admission", async () => {
    const { admissionCommand, proofResolver, registry, read, resolve } = createDependencies();
    const facade = createStandardPackIngestionLedgerSuccessorAdmissionFacade({
      admissionCommand,
      registry,
      proofResolver,
    });

    await expect(facade.reserveSuccessorCommitment({
      ...predecessorIndex,
      snapshotDigest: digest("f"),
    }, commitment)).rejects.toMatchObject({
      code: "SUCCESSOR_ADMISSION_EVIDENCE_INVALID",
      retryable: false,
    });
    await expect(facade.reserveSuccessorCommitment(predecessorIndex, {
      ...commitment,
      successorBatchDigest: digest("e"),
    })).rejects.toMatchObject({
      code: "SUCCESSOR_ADMISSION_EVIDENCE_INVALID",
      retryable: false,
    });
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(admissionCommand.admit).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it("maps a durable registry conflict to its recorded commitment for the ledger divergence check", async () => {
    const conflict = new StandardPackSuccessorAdmissionError(
      "SUCCESSOR_ADMISSION_REGISTRY_CONFLICT",
      "A different successor is already committed for this predecessor index.",
      false,
    );
    const durableConflict = alternateCommitment();
    const { admissionCommand, proofResolver, registry, read } = createDependencies({
      commandError: conflict,
      record: recordFor(durableConflict),
    });
    const facade = createStandardPackIngestionLedgerSuccessorAdmissionFacade({
      admissionCommand,
      registry,
      proofResolver,
    });

    await expect(facade.reserveSuccessorCommitment(predecessorIndex, commitment))
      .resolves.toEqual(durableConflict);
    expect(admissionCommand.admit).toHaveBeenCalledWith(input, trustedContext);
    expect(read).toHaveBeenCalledWith({
      predecessorIndexDigest: predecessorIndex.snapshotDigest,
    });
  });

  it("preserves a non-conflict Phase 3 error without reading or leaking another commitment", async () => {
    const unavailable = new StandardPackSuccessorAdmissionError(
      "SUCCESSOR_ADMISSION_UNAVAILABLE",
      "Successor admission processing is temporarily unavailable.",
      true,
    );
    const { admissionCommand, proofResolver, registry, read } = createDependencies({
      commandError: unavailable,
    });
    const facade = createStandardPackIngestionLedgerSuccessorAdmissionFacade({
      admissionCommand,
      registry,
      proofResolver,
    });

    await expect(facade.reserveSuccessorCommitment(predecessorIndex, commitment))
      .rejects.toBe(unavailable);
    expect(read).not.toHaveBeenCalled();
  });
});

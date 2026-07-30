import { describe, expect, expectTypeOf, it } from "vitest";

import {
  standardPackSuccessorCommitmentLookupSchema,
  standardPackSuccessorRegistryRecordSchema,
  standardPackSuccessorReservationRequestSchema,
  type StandardPackSuccessorRegistryPort,
  type StandardPackSuccessorReservationResult,
} from "../index.js";

/** Creates one deterministic SHA-256-shaped fixture digest from a hexadecimal character. */
const digest = (letter: string): string => letter.repeat(64);

const commitment = {
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
  commitmentDigest: digest("1"),
};

const request = {
  authorization: {
    policyId: "standard-pack.successor-registry.reserve" as const,
    actorId: "asset-release-admin",
  },
  candidate: {
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
    candidateDigest: digest("5"),
    commitmentDigest: commitment.commitmentDigest,
  },
  commitment,
};

/** Deliberately unsafe isolated-process stand-in used to establish the Phase 2 red behavior. */
function createProcessLocalRegistry(): StandardPackSuccessorRegistryPort {
  const records = new Map<string, unknown>();
  return {
    async read(lookup) {
      return (records.get(lookup.predecessorIndexDigest) as never) ?? null;
    },
    async reserve(candidate) {
      const key = candidate.commitment.predecessorIndexDigest;
      const record = {
        candidate: candidate.candidate,
        commitment: candidate.commitment,
        reservedAt: "2026-07-30T14:00:00.000Z",
      };
      records.set(key, record);
      return { outcome: "reserved", record } as const;
    },
  };
}

describe("standard-pack successor-registry contract matrix", () => {
  it("defines provider-neutral read and compare-and-reserve operations", () => {
    expectTypeOf<keyof StandardPackSuccessorRegistryPort>().toEqualTypeOf<
      "read" | "reserve"
    >();
    expectTypeOf<StandardPackSuccessorRegistryPort["reserve"]>()
      .returns.toEqualTypeOf<Promise<Readonly<StandardPackSuccessorReservationResult>>>();
  });

  it("rejects malformed candidate, Git, and cross-commitment evidence before reservation", () => {
    expect(standardPackSuccessorReservationRequestSchema.safeParse(request).success).toBe(true);
    expect(standardPackSuccessorReservationRequestSchema.safeParse({
      ...request,
      candidate: { ...request.candidate, gitCandidate: { ...request.candidate.gitCandidate, revision: "HEAD" } },
    }).success).toBe(false);
    expect(standardPackSuccessorReservationRequestSchema.safeParse({
      ...request,
      candidate: { ...request.candidate, sourcePacketDigest: "not-a-digest" },
    }).success).toBe(false);
    expect(standardPackSuccessorReservationRequestSchema.safeParse({
      ...request,
      candidate: { ...request.candidate, successorBatchDigest: digest("9") },
    }).success).toBe(false);
    expect(standardPackSuccessorCommitmentLookupSchema.safeParse({
      predecessorIndexDigest: "bad",
      extra: true,
    }).success).toBe(false);
    expect(standardPackSuccessorRegistryRecordSchema.safeParse({
      candidate: { ...request.candidate, successorBatchId: "unbound-batch" },
      commitment,
      reservedAt: "2026-07-30T14:00:00.000Z",
    }).success).toBe(false);
  });

  it.skip("Phase 2: rejects a malformed candidate at the provider boundary without reserving it", async () => {
    const registry = createProcessLocalRegistry();
    const malformed = {
      ...request,
      candidate: { ...request.candidate, gitCandidate: { ...request.candidate.gitCandidate, revision: "HEAD" } },
    };

    await expect(registry.reserve(malformed as never)).rejects.toThrow();
    await expect(registry.read({ predecessorIndexDigest: request.commitment.predecessorIndexDigest }))
      .resolves.toBeNull();
  });

  it.skip("Phase 2: rejects a fork when two independently constructed processes target one predecessor", async () => {
    const firstProcess = createProcessLocalRegistry();
    const secondProcess = createProcessLocalRegistry();
    const fork = {
      ...request,
      candidate: {
        ...request.candidate,
        successorBatchId: "legacy-mage-batch",
        successorBatchDigest: digest("6"),
        successorRelease: {
          version: "2026.07.31",
          catalogDigest: digest("7"),
          sourceReceiptDigest: digest("8"),
        },
        commitmentDigest: digest("9"),
      },
      commitment: {
        ...commitment,
        successorBatchId: "legacy-mage-batch",
        successorBatchDigest: digest("6"),
        successorRelease: {
          version: "2026.07.31",
          catalogDigest: digest("7"),
          sourceReceiptDigest: digest("8"),
        },
        commitmentDigest: digest("9"),
      },
    };

    await expect(firstProcess.reserve(request)).resolves.toMatchObject({ outcome: "reserved" });
    await expect(secondProcess.reserve(fork)).resolves.toMatchObject({ outcome: "conflict" });
  });
});

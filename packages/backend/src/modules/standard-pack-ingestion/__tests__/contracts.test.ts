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
});

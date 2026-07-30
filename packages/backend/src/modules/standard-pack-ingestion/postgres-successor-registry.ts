import { createHash } from "node:crypto";

import {
  type DatabaseJsonObject,
  StandardPackSuccessorCommitmentStoreError,
  type StandardPackSuccessorCommitmentStore,
  type StandardPackSuccessorCommitmentStoreInput,
  type StandardPackSuccessorCommitmentStoreRow,
} from "@reading-advantage/db";
import { ZodError } from "zod";

import {
  standardPackSuccessorCommitmentLookupSchema,
  standardPackSuccessorRegistryRecordSchema,
  standardPackSuccessorReservationRequestSchema,
  type StandardPackSuccessorCommitmentLookup,
  type StandardPackSuccessorCandidate,
  type StandardPackSuccessorCommitment,
  type StandardPackSuccessorRegistryRecord,
  type StandardPackSuccessorReservationRequest,
  type StandardPackSuccessorReservationResult,
} from "./contracts.js";
import {
  StandardPackSuccessorRegistryError,
  type StandardPackSuccessorRegistryErrorCode,
} from "./errors.js";
import type { StandardPackSuccessorRegistryPort } from "./port.js";

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
  throw new Error("Successor registry digest payload contains a non-JSON value.");
}

/** Calculates a lowercase SHA-256 digest for canonical JSON evidence. */
function canonicalDigest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

/** Removes the self-referential candidate digest from its hash payload. */
function candidateDigestPayload(
  candidate: Readonly<StandardPackSuccessorCandidate>,
): Omit<StandardPackSuccessorCandidate, "candidateDigest"> {
  const { candidateDigest: _candidateDigest, ...payload } = candidate;
  return payload;
}

/** Removes the self-referential commitment digest from its hash payload. */
function commitmentDigestPayload(
  commitment: Readonly<StandardPackSuccessorCommitment>,
): Omit<StandardPackSuccessorCommitment, "commitmentDigest"> {
  const { commitmentDigest: _commitmentDigest, ...payload } = commitment;
  return payload;
}

/** Verifies the canonical candidate and commitment digests for one correlated record. */
function assertDigestIntegrity(
  candidate: Readonly<StandardPackSuccessorCandidate>,
  commitment: Readonly<StandardPackSuccessorCommitment>,
  errorCode: StandardPackSuccessorRegistryErrorCode,
  message: string,
): void {
  if (
    candidate.candidateDigest !== canonicalDigest(candidateDigestPayload(candidate))
    || commitment.commitmentDigest !== canonicalDigest(commitmentDigestPayload(commitment))
  ) {
    throw new StandardPackSuccessorRegistryError(errorCode, message, false);
  }
}

/** Converts one PostgreSQL timestamp representation into the record contract form. */
function reservedAtIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/** Rehydrates and validates one durable storage row before exposing it through the port. */
function decodeRecord(
  row: Readonly<StandardPackSuccessorCommitmentStoreRow>,
): StandardPackSuccessorRegistryRecord {
  const decoded = standardPackSuccessorRegistryRecordSchema.safeParse({
    candidate: row.candidateJson,
    commitment: row.commitmentJson,
    reservedAt: reservedAtIso(row.reservedAt),
  });
  if (!decoded.success) {
    throw new StandardPackSuccessorRegistryError(
      "SUCCESSOR_REGISTRY_INTEGRITY_FAILURE",
      "Stored successor commitment does not satisfy the durable registry contract.",
      false,
    );
  }
  assertDigestIntegrity(
    decoded.data.candidate,
    decoded.data.commitment,
    "SUCCESSOR_REGISTRY_INTEGRITY_FAILURE",
    "Stored successor commitment digest does not match its canonical payload.",
  );
  return decoded.data;
}

/** Determines whether a durable record exactly repeats a validated request. */
function isExactReplay(
  record: Readonly<StandardPackSuccessorRegistryRecord>,
  request: Readonly<StandardPackSuccessorReservationRequest>,
): boolean {
  return canonicalJson(record.candidate) === canonicalJson(request.candidate)
    && canonicalJson(record.commitment) === canonicalJson(request.commitment);
}

/** Maps a DB-store failure to a boundary-safe registry error. */
function databaseError(error: unknown): StandardPackSuccessorRegistryError {
  if (error instanceof StandardPackSuccessorRegistryError) return error;
  if (
    error instanceof StandardPackSuccessorCommitmentStoreError
    && error.code === "INTEGRITY_FAILURE"
  ) {
    return new StandardPackSuccessorRegistryError(
      "SUCCESSOR_REGISTRY_INTEGRITY_FAILURE",
      "Successor registry durable storage failed an integrity check.",
      false,
    );
  }
  return new StandardPackSuccessorRegistryError(
    "SUCCESSOR_REGISTRY_UNAVAILABLE",
    "Successor registry persistence is temporarily unavailable.",
    true,
  );
}

/** Validates reservation evidence before any durable-store operation starts. */
function validateRequest(
  candidate: Readonly<StandardPackSuccessorReservationRequest>,
): StandardPackSuccessorReservationRequest {
  try {
    const request = standardPackSuccessorReservationRequestSchema.parse(candidate);
    assertDigestIntegrity(
      request.candidate,
      request.commitment,
      "SUCCESSOR_CANDIDATE_INVALID",
      "Successor candidate digest does not match its canonical payload.",
    );
    return request;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new StandardPackSuccessorRegistryError(
        "SUCCESSOR_CANDIDATE_INVALID",
        "Successor candidate evidence does not satisfy the registry contract.",
        false,
      );
    }
    throw error;
  }
}

/** Validates one lookup before any durable-store read executes. */
function validateLookup(
  candidate: Readonly<StandardPackSuccessorCommitmentLookup>,
): StandardPackSuccessorCommitmentLookup {
  try {
    return standardPackSuccessorCommitmentLookupSchema.parse(candidate);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new StandardPackSuccessorRegistryError(
        "SUCCESSOR_CANDIDATE_INVALID",
        "Successor commitment lookup does not satisfy the registry contract.",
        false,
      );
    }
    throw error;
  }
}

/** Converts a validated backend request into flat, provider-neutral storage values. */
function toStoreInput(
  request: Readonly<StandardPackSuccessorReservationRequest>,
): StandardPackSuccessorCommitmentStoreInput {
  const { candidate, commitment } = request;
  return {
    schemaVersion: commitment.schemaVersion,
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
    candidateJson: candidate as unknown as DatabaseJsonObject,
    commitmentJson: commitment as unknown as DatabaseJsonObject,
  };
}

/**
 * Creates a backend registry port that validates and classifies durable DB-store outcomes.
 * @param store Provider-neutral successor commitment persistence boundary.
 * @returns Durable compare-and-reserve and read operations for successor commitments.
 */
export function createStandardPackSuccessorRegistryPort(
  store: StandardPackSuccessorCommitmentStore,
): StandardPackSuccessorRegistryPort {
  return Object.freeze({
    async read(
      candidate: Readonly<StandardPackSuccessorCommitmentLookup>,
    ): Promise<Readonly<StandardPackSuccessorRegistryRecord> | null> {
      const lookup = validateLookup(candidate);
      try {
        const row = await store.read(lookup.predecessorIndexDigest);
        return row === null ? null : decodeRecord(row);
      } catch (error) {
        throw databaseError(error);
      }
    },

    async reserve(
      candidate: Readonly<StandardPackSuccessorReservationRequest>,
    ): Promise<Readonly<StandardPackSuccessorReservationResult>> {
      const request = validateRequest(candidate);
      try {
        const result = await store.reserve(toStoreInput(request));
        const record = decodeRecord(result.row);
        if (result.outcome === "inserted") {
          return { outcome: "reserved", record };
        }
        if (result.outcome === "predecessor-existing" && isExactReplay(record, request)) {
          return { outcome: "replayed", record };
        }
        return { outcome: "conflict", record };
      } catch (error) {
        throw databaseError(error);
      }
    },
  });
}

import { createHash } from "node:crypto";

import type {
  DatabaseJsonObject,
  StandardPackSuccessorAdmissionPersistenceStore,
  StandardPackSuccessorAdmissionPersistenceTransaction,
  StandardPackSuccessorAdmissionReceiptAppendInput,
  StandardPackSuccessorAdmissionReceiptLookupInput,
  StandardPackSuccessorAdmissionReceiptStoreRow,
  StandardPackSuccessorAdmissionReplayStoreRow,
  StandardPackSuccessorCommitmentStoreInput,
  StandardPackSuccessorCommitmentStoreReservation,
  StandardPackSuccessorCommitmentStoreRow,
} from "@reading-advantage/db";
import { z, ZodError } from "zod";

import {
  standardPackSuccessorAdmissionDigestSchema,
  standardPackSuccessorAdmissionReceiptAppendSchema,
  standardPackSuccessorAdmissionReceiptSchema,
  type StandardPackSuccessorAdmissionReceipt,
  type StandardPackSuccessorAdmissionReceiptLookup,
  type StandardPackSuccessorAdmissionReplayRecord,
  type StandardPackSuccessorAdmissionReservation,
  type StandardPackSuccessorAdmissionReservationResult,
} from "./admission-contracts.js";
import { StandardPackSuccessorAdmissionError } from "./admission-errors.js";
import type {
  StandardPackSuccessorAdmissionPersistencePort,
  StandardPackSuccessorAdmissionTransaction,
} from "./admission-port.js";
import {
  standardPackSuccessorCandidateSchema,
  standardPackSuccessorCommitmentSchema,
  standardPackSuccessorRegistryRecordSchema,
  type StandardPackSuccessorCandidate,
  type StandardPackSuccessorCommitment,
  type StandardPackSuccessorRegistryRecord,
} from "./contracts.js";

const identifierSchema = z.string().min(1).max(160).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u);

const reservationSchema = z.strictObject({
  candidate: standardPackSuccessorCandidateSchema,
  commitment: standardPackSuccessorCommitmentSchema,
}).superRefine((value, context) => {
  const { candidate, commitment } = value;
  const correlations: readonly [boolean, string][] = [
    [candidate.predecessorIndexDigest === commitment.predecessorIndexDigest, "candidate.predecessorIndexDigest"],
    [candidate.predecessorRelease.version === commitment.predecessorRelease.version, "candidate.predecessorRelease.version"],
    [candidate.predecessorRelease.catalogDigest === commitment.predecessorRelease.catalogDigest, "candidate.predecessorRelease.catalogDigest"],
    [candidate.predecessorRelease.sourceReceiptDigest === commitment.predecessorRelease.sourceReceiptDigest, "candidate.predecessorRelease.sourceReceiptDigest"],
    [candidate.successorBatchId === commitment.successorBatchId, "candidate.successorBatchId"],
    [candidate.successorBatchDigest === commitment.successorBatchDigest, "candidate.successorBatchDigest"],
    [candidate.successorRelease.version === commitment.successorRelease.version, "candidate.successorRelease.version"],
    [candidate.successorRelease.catalogDigest === commitment.successorRelease.catalogDigest, "candidate.successorRelease.catalogDigest"],
    [candidate.successorRelease.sourceReceiptDigest === commitment.successorRelease.sourceReceiptDigest, "candidate.successorRelease.sourceReceiptDigest"],
    [candidate.commitmentDigest === commitment.commitmentDigest, "candidate.commitmentDigest"],
  ];
  for (const [matches, path] of correlations) {
    if (!matches) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: path.split("."),
        message: "Successor admission candidate must bind the exact commitment identity",
      });
    }
  }
});

const receiptLookupSchema = z.strictObject({
  actorId: identifierSchema,
  policyId: identifierSchema,
  idempotencyKeyFingerprint: standardPackSuccessorAdmissionDigestSchema,
});

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
  throw new Error("Successor admission evidence contains a non-JSON value.");
}

/** Calculates the canonical SHA-256 digest for one immutable evidence projection. */
function canonicalDigest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

/** Removes the self-referential candidate digest from its canonical hashing payload. */
function candidateDigestPayload(
  candidate: Readonly<StandardPackSuccessorCandidate>,
): Omit<StandardPackSuccessorCandidate, "candidateDigest"> {
  const { candidateDigest: _candidateDigest, ...payload } = candidate;
  return payload;
}

/** Removes the self-referential commitment digest from its canonical hashing payload. */
function commitmentDigestPayload(
  commitment: Readonly<StandardPackSuccessorCommitment>,
): Omit<StandardPackSuccessorCommitment, "commitmentDigest"> {
  const { commitmentDigest: _commitmentDigest, ...payload } = commitment;
  return payload;
}

/** Builds a safe non-retryable error for malformed durable or adapter-bound evidence. */
function evidenceFailure(
  code: "SUCCESSOR_ADMISSION_EVIDENCE_INVALID" | "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
  message: string,
): StandardPackSuccessorAdmissionError {
  return new StandardPackSuccessorAdmissionError(code, message, false);
}

/** Verifies self-authenticating candidate and commitment digests at the backend persistence boundary. */
function assertDigestIntegrity(
  candidate: Readonly<StandardPackSuccessorCandidate>,
  commitment: Readonly<StandardPackSuccessorCommitment>,
  code: "SUCCESSOR_ADMISSION_EVIDENCE_INVALID" | "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
  message: string,
): void {
  if (
    candidate.candidateDigest !== canonicalDigest(candidateDigestPayload(candidate))
    || commitment.commitmentDigest !== canonicalDigest(commitmentDigestPayload(commitment))
  ) {
    throw evidenceFailure(code, message);
  }
}

/** Validates a reservation before it reaches the raw durable persistence store. */
function parseReservation(
  value: unknown,
): StandardPackSuccessorAdmissionReservation {
  try {
    const reservation = reservationSchema.parse(value);
    assertDigestIntegrity(
      reservation.candidate,
      reservation.commitment,
      "SUCCESSOR_ADMISSION_EVIDENCE_INVALID",
      "Successor admission reservation evidence has invalid canonical digests.",
    );
    return reservation;
  } catch (error) {
    if (error instanceof ZodError) {
      throw evidenceFailure(
        "SUCCESSOR_ADMISSION_EVIDENCE_INVALID",
        "Successor admission reservation evidence does not satisfy the durable contract.",
      );
    }
    throw error;
  }
}

/** Validates a hash-only receipt lookup before it reaches the raw durable persistence store. */
function parseReceiptLookup(
  value: unknown,
): StandardPackSuccessorAdmissionReceiptLookup {
  try {
    return receiptLookupSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw evidenceFailure(
        "SUCCESSOR_ADMISSION_EVIDENCE_INVALID",
        "Successor admission receipt lookup does not satisfy the durable contract.",
      );
    }
    throw error;
  }
}

/** Converts a validated reservation into the flattened provider-neutral values owned by the DB store. */
function toStoreInput(
  reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
): StandardPackSuccessorCommitmentStoreInput {
  const { candidate, commitment } = reservation;
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

/** Converts one Date-or-string database timestamp to strict UTC output without leaking invalid values. */
function isoTimestamp(value: Date | string): string {
  try {
    return value instanceof Date ? value.toISOString() : value;
  } catch {
    return "";
  }
}

/** Rehydrates and validates a raw registry row before the command can use it. */
function decodeRegistryRecord(
  row: Readonly<StandardPackSuccessorCommitmentStoreRow>,
): StandardPackSuccessorRegistryRecord {
  const parsed = standardPackSuccessorRegistryRecordSchema.safeParse({
    candidate: row.candidateJson,
    commitment: row.commitmentJson,
    reservedAt: isoTimestamp(row.reservedAt),
  });
  if (!parsed.success) {
    throw evidenceFailure(
      "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
      "Stored successor-admission registry evidence is invalid.",
    );
  }
  assertDigestIntegrity(
    parsed.data.candidate,
    parsed.data.commitment,
    "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
    "Stored successor-admission registry evidence has invalid canonical digests.",
  );
  return parsed.data;
}

/** Determines whether a predecessor-existing row is the exact candidate-and-commitment retry. */
function isExactReservationReplay(
  record: Readonly<StandardPackSuccessorRegistryRecord>,
  reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
): boolean {
  return canonicalJson(record.candidate) === canonicalJson(reservation.candidate)
    && canonicalJson(record.commitment) === canonicalJson(reservation.commitment);
}

/** Classifies the raw DB-store reservation outcome at the backend command port boundary. */
function toReservationResult(
  result: Readonly<StandardPackSuccessorCommitmentStoreReservation>,
  reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
): StandardPackSuccessorAdmissionReservationResult {
  const record = decodeRegistryRecord(result.row);
  if (result.outcome === "inserted") return { outcome: "reserved", record };
  if (result.outcome === "predecessor-existing" && isExactReservationReplay(record, reservation)) {
    return { outcome: "replayed", record };
  }
  return { outcome: "conflict", record };
}

/** Converts a strict receipt projection to the raw append-only DB-store column contract. */
function toReceiptAppendInput(
  receipt: Readonly<StandardPackSuccessorAdmissionReceipt>,
): StandardPackSuccessorAdmissionReceiptAppendInput {
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
    safeAuditJson: receipt.safeAudit as unknown as DatabaseJsonObject,
    observabilityJson: receipt.observability as unknown as DatabaseJsonObject,
    receiptJson: receipt as unknown as DatabaseJsonObject,
    recordedAt: receipt.recordedAt,
  };
}

/** Rehydrates a receipt row and rejects any mismatch between its flat and JSON projections. */
function decodeReceiptRow(
  row: Readonly<StandardPackSuccessorAdmissionReceiptStoreRow>,
): StandardPackSuccessorAdmissionReceipt {
  const parsed = standardPackSuccessorAdmissionReceiptSchema.safeParse(row.receiptJson);
  if (!parsed.success) {
    throw evidenceFailure(
      "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
      "Stored successor-admission receipt projection is invalid.",
    );
  }
  const receipt = parsed.data;
  const flatProjection = {
    id: row.id,
    schemaVersion: row.schemaVersion,
    commitmentDigest: row.commitmentDigest,
    candidateDigest: row.candidateDigest,
    actorId: row.actorId,
    policyId: row.policyId,
    idempotencyKeyFingerprint: row.idempotencyKeyFingerprint,
    requestInputDigest: row.requestInputDigest,
    correlationId: row.correlationId,
    outcome: row.outcome,
    safeAudit: row.safeAuditJson,
    observability: row.observabilityJson,
    recordedAt: isoTimestamp(row.recordedAt),
  };
  if (canonicalJson(receipt) !== canonicalJson(flatProjection)) {
    throw evidenceFailure(
      "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
      "Stored successor-admission receipt columns do not match their JSON projection.",
    );
  }
  return receipt;
}

/** Rehydrates one locked receipt and its linked registry evidence before command replay evaluation. */
function decodeReplayRecord(
  row: Readonly<StandardPackSuccessorAdmissionReplayStoreRow>,
): StandardPackSuccessorAdmissionReplayRecord {
  const receipt = decodeReceiptRow(row.receipt);
  const registryRecord = decodeRegistryRecord(row.registryRow);
  if (
    receipt.candidateDigest !== registryRecord.candidate.candidateDigest
    || receipt.commitmentDigest !== registryRecord.commitment.commitmentDigest
  ) {
    throw evidenceFailure(
      "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
      "Stored successor-admission receipt does not match its reserved successor.",
    );
  }
  return { receipt, registryRecord };
}

/** Validates a receipt append request before it reaches immutable persistence. */
function parseReceiptAppend(
  value: unknown,
): StandardPackSuccessorAdmissionReceipt {
  try {
    return standardPackSuccessorAdmissionReceiptAppendSchema.parse(value).receipt;
  } catch (error) {
    if (error instanceof ZodError) {
      throw evidenceFailure(
        "SUCCESSOR_ADMISSION_EVIDENCE_INVALID",
        "Successor-admission receipt append does not satisfy the durable contract.",
      );
    }
    throw error;
  }
}

/** Validates that a returned immutable receipt exactly preserves the requested canonical projection. */
function assertExactAppendedReceipt(
  expected: Readonly<StandardPackSuccessorAdmissionReceipt>,
  row: Readonly<StandardPackSuccessorAdmissionReceiptStoreRow>,
): StandardPackSuccessorAdmissionReceipt {
  const receipt = decodeReceiptRow(row);
  if (canonicalJson(receipt) !== canonicalJson(expected)) {
    throw evidenceFailure(
      "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
      "Successor-admission receipt persistence did not preserve the requested projection.",
    );
  }
  return receipt;
}

/** Wraps raw DB-store transaction operations in the backend's provider-neutral admission persistence port. */
function transactionFor(
  transaction: StandardPackSuccessorAdmissionPersistenceTransaction,
): StandardPackSuccessorAdmissionTransaction {
  return {
    async readReceipt(
      lookup: Readonly<StandardPackSuccessorAdmissionReceiptLookup>,
    ): Promise<Readonly<StandardPackSuccessorAdmissionReplayRecord> | null> {
      const parsedLookup = parseReceiptLookup(lookup);
      const row = await transaction.readReceipt(parsedLookup as StandardPackSuccessorAdmissionReceiptLookupInput);
      return row === null ? null : decodeReplayRecord(row);
    },

    async reserveSuccessor(
      reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
    ): Promise<Readonly<StandardPackSuccessorAdmissionReservationResult>> {
      const parsedReservation = parseReservation(reservation);
      const result = await transaction.reserveSuccessor(toStoreInput(parsedReservation));
      return toReservationResult(result, parsedReservation);
    },

    async appendReceipt(input): Promise<Readonly<StandardPackSuccessorAdmissionReceipt>> {
      const receipt = parseReceiptAppend(input);
      return assertExactAppendedReceipt(
        receipt,
        await transaction.appendReceipt(toReceiptAppendInput(receipt)),
      );
    },
  };
}

/**
 * Creates the provider-neutral backend adapter over the DB-owned raw successor-admission persistence store.
 * @param store Raw atomic store that owns database access, locking, and transaction rollback.
 * @returns A backend transaction port that validates and classifies only domain-safe persistence values.
 */
export function createStandardPackSuccessorAdmissionPersistencePort(
  store: StandardPackSuccessorAdmissionPersistenceStore,
): StandardPackSuccessorAdmissionPersistencePort {
  return Object.freeze({
    async transaction<T>(
      work: (transaction: StandardPackSuccessorAdmissionTransaction) => Promise<T>,
    ): Promise<T> {
      return await store.transaction(async (rawTransaction) =>
        await work(transactionFor(rawTransaction)));
    },
  });
}

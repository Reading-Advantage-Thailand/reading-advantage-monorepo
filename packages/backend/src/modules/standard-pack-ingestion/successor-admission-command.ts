import { ZodError } from "zod";

import {
  standardPackImmutableGitCandidateVerificationSchema,
  standardPackSuccessorAdmissionIdempotencyIdentitySchema,
  standardPackSuccessorAdmissionInputSchema,
  standardPackSuccessorAdmissionObservabilitySchema,
  standardPackSuccessorAdmissionReceiptSchema,
  standardPackSuccessorAdmissionResultSchema,
  standardPackSuccessorAdmissionSafeAuditSchema,
  standardPackSuccessorAdmissionTrustedContextSchema,
  type StandardPackImmutableGitCandidateVerification,
  type StandardPackSuccessorAdmissionIdempotencyIdentity,
  type StandardPackSuccessorAdmissionInput,
  type StandardPackSuccessorAdmissionObservability,
  type StandardPackSuccessorAdmissionReceipt,
  type StandardPackSuccessorAdmissionReservation,
  type StandardPackSuccessorAdmissionResult,
  type StandardPackSuccessorAdmissionSafeAudit,
  type StandardPackSuccessorAdmissionTrustedContext,
} from "./admission-contracts.js";
import { StandardPackSuccessorAdmissionError } from "./admission-errors.js";
import type {
  StandardPackSuccessorAdmissionCommand,
  StandardPackSuccessorAdmissionCommandDependencies,
} from "./admission-port.js";
import { standardPackSuccessorRegistryRecordSchema } from "./contracts.js";

/** Converts a Zod boundary failure into a safe successor-admission error. */
function invalidEvidence(message: string): StandardPackSuccessorAdmissionError {
  return new StandardPackSuccessorAdmissionError(
    "SUCCESSOR_ADMISSION_EVIDENCE_INVALID",
    message,
    false,
  );
}

/** Validates untrusted caller input before it reaches an authorization or durable boundary. */
function parseInput(value: unknown): StandardPackSuccessorAdmissionInput {
  try {
    return standardPackSuccessorAdmissionInputSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw invalidEvidence("Successor admission evidence does not satisfy the command contract.");
    }
    throw error;
  }
}

/** Validates trusted transport context before it reaches authorization or persistence. */
function parseTrustedContext(value: unknown): StandardPackSuccessorAdmissionTrustedContext {
  try {
    return standardPackSuccessorAdmissionTrustedContextSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new StandardPackSuccessorAdmissionError(
        "SUCCESSOR_ADMISSION_UNAUTHORIZED",
        "Trusted successor-admission context is invalid.",
        false,
      );
    }
    throw error;
  }
}

/** Builds the candidate and commitment pair whose immutable identity is admitted. */
function reservationFor(
  input: Readonly<StandardPackSuccessorAdmissionInput>,
): StandardPackSuccessorAdmissionReservation {
  return {
    candidate: input.candidate,
    commitment: input.commitment,
  };
}

/** Maps a failed dependency operation to a public-safe temporary-unavailable error. */
function unavailable(message: string): StandardPackSuccessorAdmissionError {
  return new StandardPackSuccessorAdmissionError(
    "SUCCESSOR_ADMISSION_UNAVAILABLE",
    message,
    true,
  );
}

/** Maps an untyped command dependency failure to the public successor-admission error contract. */
function mapCommandError(error: unknown): StandardPackSuccessorAdmissionError {
  if (error instanceof StandardPackSuccessorAdmissionError) return error;
  return unavailable("Successor-admission processing is temporarily unavailable.");
}

/** Produces durable hash-only identity fields without propagating the raw idempotency key. */
async function idempotencyIdentityFor(
  dependencies: Readonly<StandardPackSuccessorAdmissionCommandDependencies>,
  rawIdempotencyKey: string,
  reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
): Promise<StandardPackSuccessorAdmissionIdempotencyIdentity> {
  try {
    const [idempotencyKeyFingerprint, requestInputDigest] = await Promise.all([
      dependencies.hasher.fingerprintIdempotencyKey(rawIdempotencyKey),
      dependencies.hasher.digestRequestInput(reservation),
    ]);
    return standardPackSuccessorAdmissionIdempotencyIdentitySchema.parse({
      idempotencyKeyFingerprint,
      requestInputDigest,
    });
  } catch (error) {
    if (error instanceof StandardPackSuccessorAdmissionError) throw error;
    throw unavailable("Successor-admission idempotency identity is temporarily unavailable.");
  }
}

/** Validates that a read-only Git verifier resolved precisely the supplied candidate evidence. */
function assertVerifiedCandidate(
  value: unknown,
  reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
): StandardPackImmutableGitCandidateVerification {
  try {
    const verification = standardPackImmutableGitCandidateVerificationSchema.parse(value);
    const { candidate, commitment } = reservation;
    if (
      verification.repositoryId !== candidate.gitCandidate.repositoryId
      || verification.revision !== candidate.gitCandidate.revision
      || verification.treeDigest !== candidate.gitCandidate.treeDigest
      || verification.candidateDigest !== candidate.candidateDigest
      || verification.descriptorDigest !== candidate.descriptorDigest
      || verification.sourcePacketDigest !== candidate.sourcePacketDigest
      || verification.commitmentDigest !== commitment.commitmentDigest
    ) {
      throw new ZodError([]);
    }
    return verification;
  } catch (error) {
    if (error instanceof StandardPackSuccessorAdmissionError) throw error;
    throw new StandardPackSuccessorAdmissionError(
      "SUCCESSOR_ADMISSION_GIT_CANDIDATE_INVALID",
      "The immutable Git candidate does not match the supplied successor evidence.",
      false,
    );
  }
}

/** Runs a read-only immutable-candidate check without permitting Git mutation or publication. */
async function verifyCandidate(
  dependencies: Readonly<StandardPackSuccessorAdmissionCommandDependencies>,
  reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
): Promise<void> {
  try {
    const verification = await dependencies.gitCandidateVerifier.verify(reservation);
    assertVerifiedCandidate(verification, reservation);
  } catch (error) {
    if (error instanceof StandardPackSuccessorAdmissionError) throw error;
    throw new StandardPackSuccessorAdmissionError(
      "SUCCESSOR_ADMISSION_GIT_CANDIDATE_INVALID",
      "The immutable Git candidate cannot be verified.",
      false,
    );
  }
}

/** Validates a durable receipt-and-registry pair before an idempotent replay can be returned. */
function parseReplayRecord(value: unknown): {
  readonly receipt: StandardPackSuccessorAdmissionReceipt;
  readonly candidateDigest: string;
  readonly commitmentDigest: string;
} {
  if (typeof value !== "object" || value === null) {
    throw new StandardPackSuccessorAdmissionError(
      "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
      "Stored successor-admission receipt is invalid.",
      false,
    );
  }
  const replay = value as Readonly<Record<string, unknown>>;
  const parsedReceipt = standardPackSuccessorAdmissionReceiptSchema.safeParse(replay.receipt);
  const parsedRegistryRecord = standardPackSuccessorRegistryRecordSchema.safeParse(replay.registryRecord);
  if (!parsedReceipt.success || !parsedRegistryRecord.success) {
    throw new StandardPackSuccessorAdmissionError(
      "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
      "Stored successor-admission receipt is invalid.",
      false,
    );
  }
  const receipt = parsedReceipt.data;
  const candidateDigest = parsedRegistryRecord.data.candidate.candidateDigest;
  const commitmentDigest = parsedRegistryRecord.data.commitment.commitmentDigest;
  if (
    receipt.candidateDigest !== candidateDigest
    || receipt.commitmentDigest !== commitmentDigest
  ) {
    throw new StandardPackSuccessorAdmissionError(
      "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
      "Stored successor-admission receipt does not match its reserved successor.",
      false,
    );
  }
  return { receipt, candidateDigest, commitmentDigest };
}

/** Returns whether one valid durable receipt is an exact retry of this command request. */
function isExactReplay(
  replay: Readonly<ReturnType<typeof parseReplayRecord>>,
  reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
  context: Readonly<StandardPackSuccessorAdmissionTrustedContext>,
  identity: Readonly<StandardPackSuccessorAdmissionIdempotencyIdentity>,
): boolean {
  const { receipt } = replay;
  return receipt.actorId === context.actorId
    && receipt.policyId === context.policyId
    && receipt.idempotencyKeyFingerprint === identity.idempotencyKeyFingerprint
    && receipt.requestInputDigest === identity.requestInputDigest
    && receipt.candidateDigest === reservation.candidate.candidateDigest
    && receipt.commitmentDigest === reservation.commitment.commitmentDigest
    && replay.candidateDigest === reservation.candidate.candidateDigest
    && replay.commitmentDigest === reservation.commitment.commitmentDigest;
}

/** Converts a dependency instant to the strict UTC timestamp form required by receipt storage. */
function timestampNow(
  dependencies: Readonly<StandardPackSuccessorAdmissionCommandDependencies>,
): string {
  try {
    const value = dependencies.now();
    if (Number.isNaN(value.getTime())) throw new Error("Invalid timestamp");
    return value.toISOString();
  } catch {
    throw unavailable("Successor-admission time source is temporarily unavailable.");
  }
}

/** Builds one redacted audit and observability pair without retaining the raw idempotency key. */
function outcomeMetadata(
  outcome: "reserved" | "replayed",
  reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
  context: Readonly<StandardPackSuccessorAdmissionTrustedContext>,
  identity: Readonly<StandardPackSuccessorAdmissionIdempotencyIdentity>,
  recordedAt: string,
): {
  readonly safeAudit: StandardPackSuccessorAdmissionSafeAudit;
  readonly observability: StandardPackSuccessorAdmissionObservability;
} {
  const common = {
    outcome,
    actorId: context.actorId,
    policyId: context.policyId,
    correlationId: context.correlationId,
    predecessorIndexDigest: reservation.commitment.predecessorIndexDigest,
    successorBatchDigest: reservation.commitment.successorBatchDigest,
    candidateDigest: reservation.candidate.candidateDigest,
    commitmentDigest: reservation.commitment.commitmentDigest,
    idempotencyKeyFingerprint: identity.idempotencyKeyFingerprint,
    requestInputDigest: identity.requestInputDigest,
  };
  const safeAudit = standardPackSuccessorAdmissionSafeAuditSchema.parse({
    eventType: "standard-pack.successor-admission",
    ...common,
    recordedAt,
  });
  const observability = standardPackSuccessorAdmissionObservabilitySchema.parse({
    operation: "standard-pack.successor-admission",
    ...common,
  });
  return { safeAudit, observability };
}

/** Builds the durable receipt projection for a newly recorded registry reservation. */
function receiptFor(
  dependencies: Readonly<StandardPackSuccessorAdmissionCommandDependencies>,
  outcome: "reserved" | "replayed",
  reservation: Readonly<StandardPackSuccessorAdmissionReservation>,
  context: Readonly<StandardPackSuccessorAdmissionTrustedContext>,
  identity: Readonly<StandardPackSuccessorAdmissionIdempotencyIdentity>,
): StandardPackSuccessorAdmissionReceipt {
  try {
    const recordedAt = timestampNow(dependencies);
    const metadata = outcomeMetadata(outcome, reservation, context, identity, recordedAt);
    return standardPackSuccessorAdmissionReceiptSchema.parse({
      id: dependencies.createReceiptId(),
      schemaVersion: 1,
      commitmentDigest: reservation.commitment.commitmentDigest,
      candidateDigest: reservation.candidate.candidateDigest,
      actorId: context.actorId,
      policyId: context.policyId,
      idempotencyKeyFingerprint: identity.idempotencyKeyFingerprint,
      requestInputDigest: identity.requestInputDigest,
      correlationId: context.correlationId,
      outcome,
      ...metadata,
      recordedAt,
    });
  } catch (error) {
    if (error instanceof StandardPackSuccessorAdmissionError) throw error;
    throw new StandardPackSuccessorAdmissionError(
      "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
      "Successor-admission receipt cannot be constructed.",
      false,
    );
  }
}

/** Serializes JSON-compatible receipt data with recursively sorted object keys. */
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
  throw new Error("Receipt projection contains a non-JSON value.");
}

/** Ensures the persistence adapter returned the exact append-only projection that was requested. */
function assertAppendedReceipt(
  expected: Readonly<StandardPackSuccessorAdmissionReceipt>,
  value: unknown,
): StandardPackSuccessorAdmissionReceipt {
  const parsed = standardPackSuccessorAdmissionReceiptSchema.safeParse(value);
  if (!parsed.success || canonicalJson(parsed.data) !== canonicalJson(expected)) {
    throw new StandardPackSuccessorAdmissionError(
      "SUCCESSOR_ADMISSION_RECEIPT_FAILURE",
      "Successor-admission receipt persistence did not preserve the requested projection.",
      false,
    );
  }
  return parsed.data;
}

/** Mirrors a newly durable admission best-effort without changing its canonical receipt outcome. */
async function mirrorDurableAdmission(
  dependencies: Readonly<StandardPackSuccessorAdmissionCommandDependencies>,
  result: Readonly<StandardPackSuccessorAdmissionResult>,
): Promise<void> {
  if (result.outcome !== "admitted") return;
  try {
    await dependencies.audit.append(result.receipt.safeAudit);
  } catch {
    // The immutable receipt remains the audit record when an external mirror is unavailable.
  }
  try {
    dependencies.observability.emit(result.receipt.observability);
  } catch {
    // Operational mirroring must not turn an already durable admission into a false failure.
  }
}

/**
 * Creates the transport-independent command that verifies and atomically records one immutable successor admission.
 * @param dependencies Provider-neutral authorization, verification, persistence, audit, and observability boundaries.
 * @returns A command that never writes or publishes a Git release.
 */
export function createStandardPackSuccessorAdmissionCommand(
  dependencies: Readonly<StandardPackSuccessorAdmissionCommandDependencies>,
): StandardPackSuccessorAdmissionCommand {
  return Object.freeze({
    async admit(
      untrustedInput: Readonly<StandardPackSuccessorAdmissionInput>,
      trustedContext: Readonly<StandardPackSuccessorAdmissionTrustedContext>,
    ): Promise<Readonly<StandardPackSuccessorAdmissionResult>> {
      try {
        const input = parseInput(untrustedInput);
        const context = parseTrustedContext(trustedContext);
        const reservation = reservationFor(input);
        const authorization = await dependencies.authorization.authorize({
          context,
          candidate: reservation.candidate,
          commitment: reservation.commitment,
        });
        if (authorization.outcome !== "allowed") {
          throw new StandardPackSuccessorAdmissionError(
            "SUCCESSOR_ADMISSION_UNAUTHORIZED",
            "The trusted actor is not authorized to admit this successor candidate.",
            false,
          );
        }

        const identity = await idempotencyIdentityFor(
          dependencies,
          input.idempotencyKey,
          reservation,
        );
        const result = await dependencies.persistence.transaction(async (transaction) => {
          const existing = await transaction.readReceipt({
            actorId: context.actorId,
            policyId: context.policyId,
            idempotencyKeyFingerprint: identity.idempotencyKeyFingerprint,
          });
          if (existing !== null) {
            const replay = parseReplayRecord(existing);
            if (!isExactReplay(replay, reservation, context, identity)) {
              throw new StandardPackSuccessorAdmissionError(
                "SUCCESSOR_ADMISSION_IDEMPOTENCY_CONFLICT",
                "The idempotency key was already used for different successor evidence.",
                false,
              );
            }
            return standardPackSuccessorAdmissionResultSchema.parse({
              outcome: "replayed",
              receipt: replay.receipt,
            });
          }

          await verifyCandidate(dependencies, reservation);
          const reservationResult = await transaction.reserveSuccessor(reservation);
          if (reservationResult.outcome === "conflict") {
            throw new StandardPackSuccessorAdmissionError(
              "SUCCESSOR_ADMISSION_REGISTRY_CONFLICT",
              "A different successor is already committed for this predecessor index.",
              false,
            );
          }
          const receipt = receiptFor(
            dependencies,
            reservationResult.outcome,
            reservation,
            context,
            identity,
          );
          const appendedReceipt = assertAppendedReceipt(
            receipt,
            await transaction.appendReceipt({ receipt }),
          );
          return standardPackSuccessorAdmissionResultSchema.parse({
            outcome: "admitted",
            receipt: appendedReceipt,
          });
        });
        await mirrorDurableAdmission(dependencies, result);
        return result;
      } catch (error) {
        throw mapCommandError(error);
      }
    },
  });
}

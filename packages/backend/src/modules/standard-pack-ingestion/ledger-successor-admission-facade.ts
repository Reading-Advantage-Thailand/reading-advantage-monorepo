import { z, ZodError } from "zod";

import {
  standardPackSuccessorAdmissionInputSchema,
  standardPackSuccessorAdmissionTrustedContextSchema,
  type StandardPackSuccessorAdmissionInput,
  type StandardPackSuccessorAdmissionTrustedContext,
} from "./admission-contracts.js";
import { StandardPackSuccessorAdmissionError } from "./admission-errors.js";
import type { StandardPackSuccessorAdmissionCommand } from "./admission-port.js";
import {
  standardPackReleaseIdentitySchema,
  standardPackSuccessorCommitmentSchema,
  type StandardPackReleaseIdentity,
  type StandardPackSuccessorCommitment,
} from "./contracts.js";
import type { StandardPackSuccessorRegistryPort } from "./port.js";

/** Runtime boundary for the predecessor snapshot digest used by a generic durable lookup. */
const ledgerPredecessorLookupSchema = z.object({
  snapshotDigest: z.string().regex(/^[a-f0-9]{64}$/u),
});

/** Runtime boundary for the complete predecessor identity required to reserve a successor. */
const ledgerPredecessorReservationIndexSchema = z.object({
  snapshotDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  predecessorRelease: standardPackReleaseIdentitySchema,
});

/** Narrow lookup identity accepted by generic durable successor reads. */
export interface StandardPackIngestionLedgerPredecessorLookupBoundary {
  /** Hash of the exact immutable predecessor-index payload. */
  readonly snapshotDigest: string;
}

/** Narrow structural predecessor identity required before the facade can reserve a successor. */
export interface StandardPackIngestionLedgerPredecessorIndexBoundary
  extends StandardPackIngestionLedgerPredecessorLookupBoundary {
  /** Exact catalog release that the predecessor index pins for Phase 3 proof binding. */
  readonly predecessorRelease: Readonly<StandardPackReleaseIdentity>;
}

/** Narrow structural successor-registry surface consumed by the portable play-kit ledger. */
export interface StandardPackIngestionLedgerSuccessorRegistryBoundary {
  /**
   * Reads the current durable successor commitment using only its immutable predecessor snapshot digest.
   * @param predecessorIndex Portable lookup identity; release fields are intentionally ignored for generic reads.
   * @returns The durable commitment or undefined while the predecessor is still open.
   */
  readonly readSuccessorCommitment: (
    predecessorIndex: Readonly<StandardPackIngestionLedgerPredecessorLookupBoundary>,
  ) => Promise<unknown | undefined>;
  /**
   * Resolves closed backend evidence and admits the exact portable successor commitment.
   * @param predecessorIndex Portable predecessor index whose identity the resolver must bind.
   * @param commitment Portable successor commitment the resolver must prove exactly.
   * @returns The durable commitment for the predecessor, including an existing conflicting commitment.
   */
  readonly reserveSuccessorCommitment: (
    predecessorIndex: Readonly<StandardPackIngestionLedgerPredecessorIndexBoundary>,
    commitment: Readonly<StandardPackSuccessorCommitment>,
  ) => Promise<unknown>;
}

/** Closed backend evidence and trusted execution data that the ledger facade never exposes. */
export interface StandardPackIngestionLedgerSuccessorAdmissionProof {
  /** Full Phase 3 candidate and commitment evidence with its opaque idempotency key. */
  readonly input: Readonly<StandardPackSuccessorAdmissionInput>;
  /** Authenticated transport context supplied independently of play-kit evidence. */
  readonly trustedContext: Readonly<StandardPackSuccessorAdmissionTrustedContext>;
}

/** Backend-only resolver that captures an immutable admission proof after the ledger supplies its public identity. */
export interface StandardPackIngestionLedgerSuccessorAdmissionProofResolver {
  /**
   * Resolves the opaque Phase 3 proof for one ledger reservation attempt.
   * @param request Public portable ledger identity that the returned proof must exactly bind.
   * @returns Untrusted resolver output that the facade validates before calling the admission command.
   */
  resolve(request: Readonly<{
    readonly predecessorIndex: Readonly<StandardPackIngestionLedgerPredecessorIndexBoundary>;
    readonly commitment: Readonly<StandardPackSuccessorCommitment>;
  }>): Promise<unknown>;
}

/** Dependencies needed to adapt a backend admission command to the portable ledger registry shape. */
export interface StandardPackIngestionLedgerSuccessorAdmissionFacadeDependencies {
  /** Full transport-independent Phase 3 admission command. */
  readonly admissionCommand: StandardPackSuccessorAdmissionCommand;
  /** Durable successor registry used only to map records back to a ledger commitment. */
  readonly registry: StandardPackSuccessorRegistryPort;
  /** Backend-only source for opaque candidate, idempotency, and trusted-context evidence. */
  readonly proofResolver: StandardPackIngestionLedgerSuccessorAdmissionProofResolver;
}

/** Serializes a JSON-compatible value with recursively sorted object keys. */
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
  throw new Error("Successor admission proof contains a non-JSON value.");
}

/** Builds a public-safe non-retryable error for invalid ledger identity or resolver evidence. */
function evidenceMismatch(): StandardPackSuccessorAdmissionError {
  return new StandardPackSuccessorAdmissionError(
    "SUCCESSOR_ADMISSION_EVIDENCE_INVALID",
    "Ingestion ledger successor evidence does not match the admission proof.",
    false,
  );
}

/** Builds a public-safe temporary error when a resolver or registry cannot complete safely. */
function unavailable(message: string): StandardPackSuccessorAdmissionError {
  return new StandardPackSuccessorAdmissionError(
    "SUCCESSOR_ADMISSION_UNAVAILABLE",
    message,
    true,
  );
}

/** Parses only the immutable predecessor digest required for a generic durable lookup. */
function parsePredecessorLookup(
  value: unknown,
): StandardPackIngestionLedgerPredecessorLookupBoundary {
  try {
    return ledgerPredecessorLookupSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) throw evidenceMismatch();
    throw error;
  }
}

/** Parses the complete predecessor identity required before a closed Phase 3 reservation. */
function parsePredecessorReservationIndex(
  value: unknown,
): StandardPackIngestionLedgerPredecessorIndexBoundary {
  try {
    return ledgerPredecessorReservationIndexSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) throw evidenceMismatch();
    throw error;
  }
}

/** Parses a portable ledger commitment before it reaches a backend-only proof resolver. */
function parseCommitment(value: unknown): StandardPackSuccessorCommitment {
  try {
    return standardPackSuccessorCommitmentSchema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) throw evidenceMismatch();
    throw error;
  }
}

/** Parses opaque resolver output into the complete Phase 3 admission proof. */
function parseProof(value: unknown): StandardPackIngestionLedgerSuccessorAdmissionProof {
  if (typeof value !== "object" || value === null) throw evidenceMismatch();
  const record = value as Readonly<Record<string, unknown>>;
  try {
    return {
      input: standardPackSuccessorAdmissionInputSchema.parse(record.input),
      trustedContext: standardPackSuccessorAdmissionTrustedContextSchema.parse(
        record.trustedContext,
      ),
    };
  } catch (error) {
    if (error instanceof ZodError) throw evidenceMismatch();
    throw error;
  }
}

/** Ensures a portable predecessor index names the exact predecessor identity in a commitment. */
function assertPredecessorMatchesCommitment(
  predecessorIndex: Readonly<StandardPackIngestionLedgerPredecessorIndexBoundary>,
  commitment: Readonly<StandardPackSuccessorCommitment>,
): void {
  if (
    predecessorIndex.snapshotDigest !== commitment.predecessorIndexDigest
    || predecessorIndex.predecessorRelease.version !== commitment.predecessorRelease.version
    || predecessorIndex.predecessorRelease.catalogDigest !== commitment.predecessorRelease.catalogDigest
    || predecessorIndex.predecessorRelease.sourceReceiptDigest
      !== commitment.predecessorRelease.sourceReceiptDigest
  ) {
    throw evidenceMismatch();
  }
}

/** Requires a resolver or durable value to be byte-for-byte equivalent to the ledger commitment. */
function assertExactCommitment(
  actual: Readonly<StandardPackSuccessorCommitment>,
  expected: Readonly<StandardPackSuccessorCommitment>,
): void {
  if (canonicalJson(actual) !== canonicalJson(expected)) throw evidenceMismatch();
}

/** Resolves and validates the opaque Phase 3 proof without exposing its raw idempotency material. */
async function resolveProof(
  resolver: StandardPackIngestionLedgerSuccessorAdmissionProofResolver,
  predecessorIndex: Readonly<StandardPackIngestionLedgerPredecessorIndexBoundary>,
  commitment: Readonly<StandardPackSuccessorCommitment>,
): Promise<StandardPackIngestionLedgerSuccessorAdmissionProof> {
  try {
    const proof = parseProof(await resolver.resolve({ predecessorIndex, commitment }));
    assertExactCommitment(proof.input.commitment, commitment);
    return proof;
  } catch (error) {
    if (error instanceof StandardPackSuccessorAdmissionError) throw error;
    throw unavailable("Successor-admission proof resolution is temporarily unavailable.");
  }
}

/** Reads one durable commitment using only the immutable predecessor lookup digest. */
async function readDurableCommitmentForLookup(
  registry: StandardPackSuccessorRegistryPort,
  predecessorIndex: Readonly<StandardPackIngestionLedgerPredecessorLookupBoundary>,
): Promise<StandardPackSuccessorCommitment | undefined> {
  const record = await registry.read({ predecessorIndexDigest: predecessorIndex.snapshotDigest });
  if (record === null) return undefined;
  const commitment = parseCommitment(record.commitment);
  if (commitment.predecessorIndexDigest !== predecessorIndex.snapshotDigest) {
    throw evidenceMismatch();
  }
  return commitment;
}

/** Reads one durable commitment and verifies its complete predecessor identity before reservation logic uses it. */
async function readDurableCommitment(
  registry: StandardPackSuccessorRegistryPort,
  predecessorIndex: Readonly<StandardPackIngestionLedgerPredecessorIndexBoundary>,
): Promise<StandardPackSuccessorCommitment | undefined> {
  const commitment = await readDurableCommitmentForLookup(registry, predecessorIndex);
  if (commitment === undefined) return undefined;
  assertPredecessorMatchesCommitment(predecessorIndex, commitment);
  return commitment;
}

/**
 * Creates a backend facade that structurally satisfies the portable play-kit successor-registry interface.
 * @param dependencies Phase 3 command, durable registry reader, and a backend-only asynchronous proof resolver.
 * @returns A generic ledger-compatible registry that never exposes raw idempotency material or Git mutation operations.
 */
export function createStandardPackIngestionLedgerSuccessorAdmissionFacade(
  dependencies: Readonly<StandardPackIngestionLedgerSuccessorAdmissionFacadeDependencies>,
): StandardPackIngestionLedgerSuccessorRegistryBoundary {
  return Object.freeze({
    async readSuccessorCommitment(
      predecessorIndex: Readonly<StandardPackIngestionLedgerPredecessorLookupBoundary>,
    ): Promise<unknown | undefined> {
      const parsedPredecessorIndex = parsePredecessorLookup(predecessorIndex);
      return await readDurableCommitmentForLookup(dependencies.registry, parsedPredecessorIndex);
    },

    async reserveSuccessorCommitment(
      predecessorIndex: Readonly<StandardPackIngestionLedgerPredecessorIndexBoundary>,
      commitment: Readonly<StandardPackSuccessorCommitment>,
    ): Promise<unknown> {
      const parsedPredecessorIndex = parsePredecessorReservationIndex(predecessorIndex);
      const parsedCommitment = parseCommitment(commitment);
      assertPredecessorMatchesCommitment(parsedPredecessorIndex, parsedCommitment);
      const proof = await resolveProof(
        dependencies.proofResolver,
        parsedPredecessorIndex,
        parsedCommitment,
      );
      try {
        await dependencies.admissionCommand.admit(proof.input, proof.trustedContext);
      } catch (error) {
        if (
          !(error instanceof StandardPackSuccessorAdmissionError)
          || error.code !== "SUCCESSOR_ADMISSION_REGISTRY_CONFLICT"
        ) {
          throw error;
        }
        const conflictingCommitment = await readDurableCommitment(
          dependencies.registry,
          parsedPredecessorIndex,
        );
        if (conflictingCommitment === undefined) {
          throw unavailable(
            "Successor admission conflict could not be resolved from durable registry state.",
          );
        }
        return conflictingCommitment;
      }

      const durableCommitment = await readDurableCommitment(
        dependencies.registry,
        parsedPredecessorIndex,
      );
      if (durableCommitment === undefined) {
        throw unavailable(
          "Successor admission did not produce a durable registry commitment.",
        );
      }
      assertExactCommitment(durableCommitment, parsedCommitment);
      return durableCommitment;
    },
  });
}

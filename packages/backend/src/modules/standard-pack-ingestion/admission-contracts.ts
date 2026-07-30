import { z } from "zod";

import {
  standardPackSuccessorCandidateSchema,
  standardPackSuccessorCommitmentSchema,
  type StandardPackSuccessorCandidate,
  type StandardPackSuccessorCommitment,
  type StandardPackSuccessorRegistryRecord,
  type StandardPackSuccessorReservationResult,
} from "./contracts.js";

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const identifierSchema = z.string().min(1).max(160).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u);
const correlationIdSchema = z.string().uuid();

/** Runtime-safe SHA-256 digest used for request and idempotency identities. */
export const standardPackSuccessorAdmissionDigestSchema = digestSchema;

/** Exact digest representation safe to persist in a receipt, audit event, or log field. */
export type StandardPackSuccessorAdmissionDigest = z.infer<
  typeof standardPackSuccessorAdmissionDigestSchema
>;

/** Untrusted caller input accepted by the successor-admission command. */
export const standardPackSuccessorAdmissionInputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  candidate: standardPackSuccessorCandidateSchema,
  commitment: standardPackSuccessorCommitmentSchema,
  idempotencyKey: z.string().min(16).max(200),
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

/** Validated caller-supplied evidence that intentionally excludes authorization context. */
export type StandardPackSuccessorAdmissionInput = z.infer<
  typeof standardPackSuccessorAdmissionInputSchema
>;

/** Trusted execution context supplied by a transport adapter after authentication. */
export const standardPackSuccessorAdmissionTrustedContextSchema = z.strictObject({
  actorId: identifierSchema,
  policyId: z.literal("standard-pack.successor-admission"),
  correlationId: correlationIdSchema,
  requestedAt: z.string().datetime({ offset: true }),
});

/** Authenticated context that the untrusted command input cannot manufacture. */
export type StandardPackSuccessorAdmissionTrustedContext = z.infer<
  typeof standardPackSuccessorAdmissionTrustedContextSchema
>;

/** Hash-only identity that maps exactly to the admission receipt persistence columns. */
export const standardPackSuccessorAdmissionIdempotencyIdentitySchema = z.strictObject({
  idempotencyKeyFingerprint: digestSchema,
  requestInputDigest: digestSchema,
});

/** Idempotency identity safe for a receipt, audit event, or observability event. */
export type StandardPackSuccessorAdmissionIdempotencyIdentity = z.infer<
  typeof standardPackSuccessorAdmissionIdempotencyIdentitySchema
>;

/** Immutable Git-candidate verifier result that intentionally contains no publication operation. */
export const standardPackImmutableGitCandidateVerificationSchema = z.strictObject({
  status: z.literal("verified"),
  repositoryId: identifierSchema,
  revision: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u),
  treeDigest: digestSchema,
  candidateDigest: digestSchema,
  descriptorDigest: digestSchema,
  sourcePacketDigest: digestSchema,
  commitmentDigest: digestSchema,
  verifiedAt: z.string().datetime({ offset: true }),
});

/** Read-only verification evidence for a pre-existing immutable Git candidate revision. */
export type StandardPackImmutableGitCandidateVerification = z.infer<
  typeof standardPackImmutableGitCandidateVerificationSchema
>;

/** Receipt outcomes accepted by the durable successor-admission receipt table. */
export const standardPackSuccessorAdmissionReceiptOutcomeSchema = z.enum([
  "reserved",
  "replayed",
]);

/** Immutable registry outcome recorded with one persisted admission receipt. */
export type StandardPackSuccessorAdmissionReceiptOutcome = z.infer<
  typeof standardPackSuccessorAdmissionReceiptOutcomeSchema
>;

/** Redacted immutable audit payload embedded exactly in a persisted receipt projection. */
export const standardPackSuccessorAdmissionSafeAuditSchema = z.strictObject({
  eventType: z.literal("standard-pack.successor-admission"),
  outcome: standardPackSuccessorAdmissionReceiptOutcomeSchema,
  actorId: identifierSchema,
  policyId: identifierSchema,
  correlationId: correlationIdSchema,
  predecessorIndexDigest: digestSchema,
  successorBatchDigest: digestSchema,
  candidateDigest: digestSchema,
  commitmentDigest: digestSchema,
  idempotencyKeyFingerprint: digestSchema,
  requestInputDigest: digestSchema,
  recordedAt: z.string().datetime({ offset: true }),
});

/** Safe append-only audit data that deliberately excludes raw idempotency material. */
export type StandardPackSuccessorAdmissionSafeAudit = z.infer<
  typeof standardPackSuccessorAdmissionSafeAuditSchema
>;

/** Structured observability payload embedded exactly in a persisted receipt projection. */
export const standardPackSuccessorAdmissionObservabilitySchema = z.strictObject({
  operation: z.literal("standard-pack.successor-admission"),
  outcome: standardPackSuccessorAdmissionReceiptOutcomeSchema,
  actorId: identifierSchema,
  policyId: identifierSchema,
  correlationId: correlationIdSchema,
  predecessorIndexDigest: digestSchema,
  successorBatchDigest: digestSchema,
  candidateDigest: digestSchema,
  commitmentDigest: digestSchema,
  idempotencyKeyFingerprint: digestSchema,
  requestInputDigest: digestSchema,
});

/** Structured safe observability fields for one persisted successor-admission outcome. */
export type StandardPackSuccessorAdmissionObservability = z.infer<
  typeof standardPackSuccessorAdmissionObservabilitySchema
>;

/** Canonical JSON projection persisted by standard_pack_successor_admission_receipts. */
export const standardPackSuccessorAdmissionReceiptSchema = z.strictObject({
  id: z.string().uuid(),
  schemaVersion: z.literal(1),
  commitmentDigest: digestSchema,
  candidateDigest: digestSchema,
  actorId: identifierSchema,
  policyId: identifierSchema,
  idempotencyKeyFingerprint: digestSchema,
  requestInputDigest: digestSchema,
  correlationId: correlationIdSchema,
  outcome: standardPackSuccessorAdmissionReceiptOutcomeSchema,
  safeAudit: standardPackSuccessorAdmissionSafeAuditSchema,
  observability: standardPackSuccessorAdmissionObservabilitySchema,
  recordedAt: z.string().datetime({ offset: true }),
});

/** Durable receipt proving one accepted candidate was reserved without exposing a raw key. */
export type StandardPackSuccessorAdmissionReceipt = z.infer<
  typeof standardPackSuccessorAdmissionReceiptSchema
>;

/** Safe output of the transport-independent successor-admission command. */
export const standardPackSuccessorAdmissionResultSchema = z.strictObject({
  outcome: z.enum(["admitted", "replayed"]),
  receipt: standardPackSuccessorAdmissionReceiptSchema,
});

/** Command result for a newly admitted candidate or an exact idempotent replay. */
export type StandardPackSuccessorAdmissionResult = z.infer<
  typeof standardPackSuccessorAdmissionResultSchema
>;

/** Minimal data required to append an immutable successor-admission receipt. */
export const standardPackSuccessorAdmissionReceiptAppendSchema = z.strictObject({
  receipt: standardPackSuccessorAdmissionReceiptSchema,
});

/** Receipt append request that contains only the durable table's canonical JSON projection. */
export type StandardPackSuccessorAdmissionReceiptAppend = z.infer<
  typeof standardPackSuccessorAdmissionReceiptAppendSchema
>;

/** Candidate and commitment pair reserved inside the admission transaction. */
export interface StandardPackSuccessorAdmissionReservation {
  /** Immutable candidate that must already pass read-only Git verification. */
  readonly candidate: Readonly<StandardPackSuccessorCandidate>;
  /** Exact candidate-bound commitment that may be reserved once. */
  readonly commitment: Readonly<StandardPackSuccessorCommitment>;
}

/** Receipt read key that maps to the receipt table's actor-policy-fingerprint uniqueness constraint. */
export interface StandardPackSuccessorAdmissionReceiptLookup {
  /** Trusted actor whose receipt namespace is being resolved. */
  readonly actorId: string;
  /** Reviewed authorization policy whose receipt namespace is being resolved. */
  readonly policyId: string;
  /** Fingerprint of the opaque idempotency key. */
  readonly idempotencyKeyFingerprint: StandardPackSuccessorAdmissionDigest;
}

/** Existing durable receipt paired with its reservation record for an exact replay check. */
export interface StandardPackSuccessorAdmissionReplayRecord {
  /** Immutable admission receipt retained for this actor-policy-fingerprint tuple. */
  readonly receipt: Readonly<StandardPackSuccessorAdmissionReceipt>;
  /** Durable successor record whose digests the receipt must repeat. */
  readonly registryRecord: Readonly<StandardPackSuccessorRegistryRecord>;
}

/** Reservation result returned from the transaction-owned registry operation. */
export type StandardPackSuccessorAdmissionReservationResult =
  StandardPackSuccessorReservationResult;

import { z } from "zod";

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const identifierSchema = z.string().min(1).max(160).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u);
const releaseVersionSchema = z.string().min(1).max(80).regex(/^[0-9]{4}\.[0-9]{2}\.[0-9]{2}(?:-[a-z0-9][a-z0-9.-]{0,63})?$/u);
const gitObjectIdSchema = z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u);

/** Exact immutable catalog release identity used at one successor-registry boundary. */
export const standardPackReleaseIdentitySchema = z.strictObject({
  version: releaseVersionSchema,
  catalogDigest: digestSchema,
  sourceReceiptDigest: digestSchema,
});

/** Exact immutable catalog release identity used at one successor-registry boundary. */
export type StandardPackReleaseIdentity = z.infer<typeof standardPackReleaseIdentitySchema>;

/** Hash-bound Git revision that the registry may reference but never writes or publishes. */
export const standardPackImmutableGitCandidateSchema = z.strictObject({
  repositoryId: identifierSchema,
  revision: gitObjectIdSchema,
  treeDigest: digestSchema,
});

/** Immutable Git revision identity for a pre-existing candidate artifact tree. */
export type StandardPackImmutableGitCandidate = z.infer<typeof standardPackImmutableGitCandidateSchema>;

/** Canonical one-way commitment between one predecessor index and one successor batch. */
export const standardPackSuccessorCommitmentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  predecessorIndexDigest: digestSchema,
  predecessorRelease: standardPackReleaseIdentitySchema,
  successorBatchId: identifierSchema,
  successorBatchDigest: digestSchema,
  successorRelease: standardPackReleaseIdentitySchema,
  commitmentDigest: digestSchema,
});

/** Exact immutable commitment that an authoritative registry can reserve once. */
export type StandardPackSuccessorCommitment = z.infer<typeof standardPackSuccessorCommitmentSchema>;

/** Evidence identity that the backend requires before it can reserve a successor. */
export const standardPackSuccessorCandidateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  gitCandidate: standardPackImmutableGitCandidateSchema,
  predecessorIndexDigest: digestSchema,
  predecessorRelease: standardPackReleaseIdentitySchema,
  successorBatchId: identifierSchema,
  successorBatchDigest: digestSchema,
  successorRelease: standardPackReleaseIdentitySchema,
  descriptorDigest: digestSchema,
  sourcePacketDigest: digestSchema,
  candidateDigest: digestSchema,
  commitmentDigest: digestSchema,
});

/** Immutable candidate identity correlated to the source, descriptor, releases, and commitment. */
export type StandardPackSuccessorCandidate = z.infer<typeof standardPackSuccessorCandidateSchema>;

/** Declared authorization subject for the later server-side reserve command. */
export const standardPackSuccessorRegistryAuthorizationSchema = z.strictObject({
  policyId: z.literal("standard-pack.successor-registry.reserve"),
  actorId: identifierSchema,
});

/** Authorization claim supplied only by a trusted backend command boundary. */
export type StandardPackSuccessorRegistryAuthorization = z.infer<typeof standardPackSuccessorRegistryAuthorizationSchema>;

/** Determines whether one candidate repeats every commitment identity that the durable registry keys. */
function candidateMatchesCommitment(
  candidate: StandardPackSuccessorCandidate,
  commitment: StandardPackSuccessorCommitment,
): boolean {
  return candidate.predecessorIndexDigest === commitment.predecessorIndexDigest
    && candidate.predecessorRelease.version === commitment.predecessorRelease.version
    && candidate.predecessorRelease.catalogDigest === commitment.predecessorRelease.catalogDigest
    && candidate.predecessorRelease.sourceReceiptDigest === commitment.predecessorRelease.sourceReceiptDigest
    && candidate.successorBatchId === commitment.successorBatchId
    && candidate.successorBatchDigest === commitment.successorBatchDigest
    && candidate.successorRelease.version === commitment.successorRelease.version
    && candidate.successorRelease.catalogDigest === commitment.successorRelease.catalogDigest
    && candidate.successorRelease.sourceReceiptDigest === commitment.successorRelease.sourceReceiptDigest
    && candidate.commitmentDigest === commitment.commitmentDigest;
}

/** Validates a correlated reservation request without granting product or release authority. */
export const standardPackSuccessorReservationRequestSchema = z.strictObject({
  authorization: standardPackSuccessorRegistryAuthorizationSchema,
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
        message: "Successor candidate must bind the exact reserved commitment identity",
      });
    }
  }
});

/** Input required to compare and reserve exactly one immutable successor commitment. */
export type StandardPackSuccessorReservationRequest = z.infer<typeof standardPackSuccessorReservationRequestSchema>;

/** Immutable registry record returned after a successful reservation or exact retry. */
export const standardPackSuccessorRegistryRecordSchema = z.strictObject({
  candidate: standardPackSuccessorCandidateSchema,
  commitment: standardPackSuccessorCommitmentSchema,
  reservedAt: z.string().datetime({ offset: true }),
}).refine(
  ({ candidate, commitment }) => candidateMatchesCommitment(candidate, commitment),
  "Stored successor record must bind the exact candidate and commitment identity",
);

/** Durable record that correlates the exact Git candidate and sole successor commitment. */
export type StandardPackSuccessorRegistryRecord = z.infer<typeof standardPackSuccessorRegistryRecordSchema>;

/** Explicit compare-and-reserve outcome, including an existing conflicting commitment. */
export const standardPackSuccessorReservationResultSchema = z.discriminatedUnion("outcome", [
  z.strictObject({ outcome: z.literal("reserved"), record: standardPackSuccessorRegistryRecordSchema }),
  z.strictObject({ outcome: z.literal("replayed"), record: standardPackSuccessorRegistryRecordSchema }),
  z.strictObject({ outcome: z.literal("conflict"), record: standardPackSuccessorRegistryRecordSchema }),
]);

/** Result returned when a registry reserves, replays, or rejects one candidate. */
export type StandardPackSuccessorReservationResult = z.infer<typeof standardPackSuccessorReservationResultSchema>;

/** Lookup key for one global predecessor index commitment. */
export const standardPackSuccessorCommitmentLookupSchema = z.strictObject({
  predecessorIndexDigest: digestSchema,
});

/** Exact lookup identity accepted by a successor registry. */
export type StandardPackSuccessorCommitmentLookup = z.infer<typeof standardPackSuccessorCommitmentLookupSchema>;

import { createHash } from "node:crypto";
import { z } from "zod";

const nonEmptyStringSchema = z.string().trim().min(1).max(256);
const uuidSchema = z.string().uuid();
const probabilitySchema = z.number().finite().min(0).max(1);
const revisionSchema = z.number().int().min(0);
const isoDateTimeSchema = z.string().datetime({ offset: true });

const orchestrationEvidenceSchema = z.strictObject({
  id: nonEmptyStringSchema,
  schoolId: uuidSchema,
  studentId: uuidSchema,
  objectiveId: nonEmptyStringSchema,
  variantKey: nonEmptyStringSchema,
  sourceId: nonEmptyStringSchema,
  evidenceOrdinal: revisionSchema,
  evidenceType: nonEmptyStringSchema,
  validated: z.literal(true),
  correctedStrength: probabilitySchema,
  coverage: probabilitySchema,
  confidence: probabilitySchema,
  attempts: revisionSchema,
});

/** Runtime contract for an auditable, atomic mastery evidence commit. */
export const masteryEvidenceCommitInputSchema = z
  .strictObject({
    schoolId: uuidSchema,
    studentId: uuidSchema,
    idempotencyKey: uuidSchema,
    audit: z.strictObject({
      actorId: uuidSchema,
      requestId: nonEmptyStringSchema,
      source: nonEmptyStringSchema,
      occurredAt: isoDateTimeSchema,
    }),
    versions: z.strictObject({
      contractVersion: nonEmptyStringSchema,
      graphRelease: nonEmptyStringSchema,
      paramsVersion: nonEmptyStringSchema,
    }),
    expectedRevisions: z.strictObject({
      card: revisionSchema,
      state: revisionSchema,
    }),
    evidence: z.array(orchestrationEvidenceSchema).max(512).optional(),
    card: z.strictObject({
      id: nonEmptyStringSchema,
      schoolId: uuidSchema,
      studentId: uuidSchema,
      objectiveId: nonEmptyStringSchema,
      variantKey: nonEmptyStringSchema,
      revision: revisionSchema,
    }),
    review: z.strictObject({
      id: nonEmptyStringSchema,
      schoolId: uuidSchema,
      studentId: uuidSchema,
      cardId: nonEmptyStringSchema,
      submissionId: nonEmptyStringSchema,
      reviewedAt: isoDateTimeSchema,
    }),
    state: z.strictObject({
      id: nonEmptyStringSchema,
      schoolId: uuidSchema,
      studentId: uuidSchema,
      objectiveId: nonEmptyStringSchema,
      revision: revisionSchema,
      mastery: probabilitySchema,
      retention: probabilitySchema,
    }),
  })
  .superRefine((input, context) => {
    const ownedRecords = [input.card, input.review, input.state, ...(input.evidence ?? [])];
    for (const [index, record] of ownedRecords.entries()) {
      if (record.schoolId !== input.schoolId) {
        context.addIssue({
          code: "custom",
          message: "Every mastery record must belong to the commit school.",
          path: ["schoolOwnership", index],
        });
      }
      if (record.studentId !== input.studentId) {
        context.addIssue({
          code: "custom",
          message: "Every mastery record must belong to the commit student.",
          path: ["studentOwnership", index],
        });
      }
    }
    if (input.review.cardId !== input.card.id) {
      context.addIssue({
        code: "custom",
        message: "The review must reference the committed card.",
        path: ["review", "cardId"],
      });
    }
  });

/** Runtime contract for a human-approved calibration release. */
export const masteryCalibrationApprovalInputSchema = z.strictObject({
  schoolId: uuidSchema,
  domain: nonEmptyStringSchema,
  ageBand: nonEmptyStringSchema,
  paramsVersion: nonEmptyStringSchema,
  optimizerVersion: nonEmptyStringSchema,
  incumbentVersion: nonEmptyStringSchema,
  reviewCount: z.number().int().min(0),
  studentCount: z.number().int().min(0),
  holdoutLogLoss: z.number().finite().min(0),
  incumbentLogLoss: z.number().finite().min(0),
  approvedBy: uuidSchema,
  approvedAt: isoDateTimeSchema,
  audit: z.strictObject({
    actorId: uuidSchema,
    requestId: nonEmptyStringSchema,
    source: nonEmptyStringSchema,
  }),
});

/** Parsed input for atomic mastery evidence orchestration. */
export type MasteryEvidenceCommitInput = z.infer<typeof masteryEvidenceCommitInputSchema>;

/** Parsed input for a human-approved mastery calibration. */
export type MasteryCalibrationApprovalInput = z.infer<
  typeof masteryCalibrationApprovalInputSchema
>;

/** Stable result returned by the evidence commit orchestration. */
export type MasteryEvidenceCommitResult =
  | { status: "no_evidence" }
  | {
      status: "applied" | "replayed";
      commitId: string;
      digest: string;
      recordIds: Readonly<Record<string, string>>;
      cardRevision: number;
      stateRevision: number;
    };

/** Transaction operations required by mastery evidence orchestration. */
export interface MasteryEvidenceTransaction {
  /** Finds an existing school-scoped idempotency receipt. */
  findCommit(schoolId: string, idempotencyKey: string): Promise<StoredMasteryCommit | null>;
  /** Appends one immutable evidence record. */
  insertEvidence(record: Record<string, unknown>): Promise<void>;
  /** Appends one immutable review record. */
  appendReview(record: Record<string, unknown>): Promise<void>;
  /** Applies a card mutation only at the expected revision. */
  compareAndSwapCard(record: Record<string, unknown>, expectedRevision: number): Promise<number>;
  /** Applies a state mutation only at the expected revision. */
  compareAndSwapState(record: Record<string, unknown>, expectedRevision: number): Promise<number>;
  /** Appends the immutable idempotency receipt. */
  insertCommit(record: StoredMasteryCommit): Promise<void>;
  /** Appends one approved calibration artifact. */
  insertCalibration(record: Record<string, unknown>): Promise<void>;
}

/** Serializable transaction boundary required by mastery orchestration. */
export interface MasteryTransactionalPersistence {
  /** Runs an operation atomically, using serializable isolation when supported. */
  transaction<T>(
    operation: (transaction: MasteryEvidenceTransaction) => Promise<T>,
    options?: { isolationLevel?: "serializable" },
  ): Promise<T>;
}

/** Dependencies injected into the mastery evidence use case. */
export interface CommitMasteryEvidenceDependencies {
  /** Provider-neutral atomic persistence boundary. */
  persistence: MasteryTransactionalPersistence;
  /** Returns the current ISO timestamp. */
  clock(): string;
  /** Returns a new ID for an orchestration-owned record. */
  idFactory(kind: "commit" | "evidence" | "review"): string;
}

/** Dependencies injected into calibration approval. */
export interface ApproveMasteryCalibrationDependencies {
  /** Provider-neutral atomic persistence boundary. */
  persistence: MasteryTransactionalPersistence;
  /** Returns the current ISO timestamp. */
  clock(): string;
  /** Returns a new calibration record ID. */
  idFactory(kind: "calibration"): string;
}

/** Immutable idempotency receipt stored inside the transaction. */
export interface StoredMasteryCommit {
  /** School owning the receipt. */
  schoolId: string;
  /** Client-supplied idempotency key. */
  idempotencyKey: string;
  /** Canonical digest of the validated request. */
  digest: string;
  /** Receipt status at the time it was applied. */
  status: "applied" | "replayed" | "no_evidence";
  /** Stable commit identifier. */
  commitId?: string;
  /** Stable IDs of records covered by the receipt. */
  recordIds?: Readonly<Record<string, string>>;
  /** Applied card revision. */
  cardRevision?: number;
  /** Applied objective-state revision. */
  stateRevision?: number;
}

/** Stable domain error for an idempotency key reused by a different request. */
export class MasteryIdempotencyDigestConflictError extends Error {
  /** Stable machine-readable error code. */
  readonly code = "IDEMPOTENCY_DIGEST_CONFLICT" as const;

  /** Creates a provider-neutral idempotency digest conflict. */
  constructor() {
    super("The mastery idempotency key is already bound to another request.");
    this.name = "MasteryIdempotencyDigestConflictError";
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function digestInput(input: MasteryEvidenceCommitInput): string {
  const payload = JSON.stringify(canonicalize(input));
  return `sha256:${createHash("sha256").update(payload).digest("hex")}`;
}

function replayResult(commit: StoredMasteryCommit): MasteryEvidenceCommitResult {
  if (
    !commit.commitId ||
    !commit.recordIds ||
    commit.cardRevision === undefined ||
    commit.stateRevision === undefined
  ) {
    throw new Error("Stored mastery receipt is incomplete.");
  }
  return {
    status: "replayed",
    commitId: commit.commitId,
    digest: commit.digest,
    recordIds: commit.recordIds,
    cardRevision: commit.cardRevision,
    stateRevision: commit.stateRevision,
  };
}

/**
 * Persists validated mastery evidence, review, card, state, and receipt atomically.
 * @param input Untrusted evidence bundle to validate before opening a transaction.
 * @param dependencies Provider-neutral persistence, clock, and ID capabilities.
 * @returns An applied or replayed receipt, or an explicit no-evidence result.
 * @throws When validation, idempotency, persistence, or optimistic concurrency fails.
 */
export async function commitMasteryEvidence(
  input: unknown,
  dependencies: CommitMasteryEvidenceDependencies,
): Promise<MasteryEvidenceCommitResult> {
  const parsed = masteryEvidenceCommitInputSchema.parse(input);
  if (!parsed.evidence || parsed.evidence.length === 0) {
    return { status: "no_evidence" };
  }

  const evidence = parsed.evidence;
  const digest = digestInput(parsed);
  return dependencies.persistence.transaction(
    async (transaction) => {
      const existing = await transaction.findCommit(parsed.schoolId, parsed.idempotencyKey);
      if (existing) {
        if (existing.digest !== digest) {
          throw new MasteryIdempotencyDigestConflictError();
        }
        return replayResult(existing);
      }

      const commitId = dependencies.idFactory("commit");
      const recordIds: Readonly<Record<string, string>> = {
        card: parsed.card.id,
        review: parsed.review.id,
        evidence: evidence.map((record) => record.id).join(","),
        state: parsed.state.id,
      };

      await transaction.appendReview({
        ...parsed.review,
        audit: parsed.audit,
        versions: parsed.versions,
        createdAt: dependencies.clock(),
      });
      for (const evidenceRecord of evidence) {
        await transaction.insertEvidence({
          ...evidenceRecord,
          audit: parsed.audit,
          versions: parsed.versions,
          createdAt: dependencies.clock(),
        });
      }
      const cardRevision = await transaction.compareAndSwapCard(
        { ...parsed.card, audit: parsed.audit, versions: parsed.versions },
        parsed.expectedRevisions.card,
      );
      const stateRevision = await transaction.compareAndSwapState(
        { ...parsed.state, audit: parsed.audit, versions: parsed.versions },
        parsed.expectedRevisions.state,
      );
      const receipt: StoredMasteryCommit = {
        schoolId: parsed.schoolId,
        idempotencyKey: parsed.idempotencyKey,
        digest,
        status: "applied",
        commitId,
        recordIds,
        cardRevision,
        stateRevision,
      };
      await transaction.insertCommit(receipt);
      return {
        status: "applied" as const,
        commitId,
        digest,
        recordIds,
        cardRevision,
        stateRevision,
      };
    },
    { isolationLevel: "serializable" },
  );
}

/**
 * Persists a human-approved calibration artifact without learner evidence mutation.
 * @param input Untrusted calibration approval and audit metadata.
 * @param dependencies Provider-neutral persistence, clock, and ID capabilities.
 * @returns The approved calibration identifier and status.
 * @throws When validation or persistence fails.
 */
export async function approveMasteryCalibration(
  input: unknown,
  dependencies: ApproveMasteryCalibrationDependencies,
): Promise<{ calibrationId: string; status: "approved" }> {
  const parsed = masteryCalibrationApprovalInputSchema.parse(input);
  const calibrationId = dependencies.idFactory("calibration");
  await dependencies.persistence.transaction(
    async (transaction) => {
      await transaction.insertCalibration({
        id: calibrationId,
        ...parsed,
        createdAt: dependencies.clock(),
      });
    },
    { isolationLevel: "serializable" },
  );
  return { calibrationId, status: "approved" };
}

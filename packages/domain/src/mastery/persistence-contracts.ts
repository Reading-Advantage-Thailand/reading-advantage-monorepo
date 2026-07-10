import { z } from "zod";

/** Version of the portable mastery persistence contract. */
export const MASTERY_PERSISTENCE_CONTRACT_VERSION = "mastery.persistence.v1" as const;

const opaqueIdentifierSchema = z.string().trim().min(1).max(256);
const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.string().datetime({ offset: true });
const probabilitySchema = z.number().finite().min(0).max(1);
const counterSchema = z.number().int().min(0);
const positiveCounterSchema = z.number().int().positive();
const sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

/** Version and source metadata required on persisted mastery decisions. */
export const masteryProvenanceSchema = z.strictObject({
  normativeSpecVersion: opaqueIdentifierSchema,
  engineContractVersion: opaqueIdentifierSchema,
  graphRelease: opaqueIdentifierSchema,
  configVersion: opaqueIdentifierSchema,
  paramsVersion: opaqueIdentifierSchema,
  adapterVersion: z.literal(MASTERY_PERSISTENCE_CONTRACT_VERSION),
});

/** Audit identity attached to a mastery persistence operation. */
export const masteryAuditSchema = z.strictObject({
  actorId: opaqueIdentifierSchema,
  requestId: opaqueIdentifierSchema,
  sourceId: opaqueIdentifierSchema,
  correlationId: opaqueIdentifierSchema,
});

/** Portable persisted FSRS card record. */
export const masteryCardRecordSchema = z.strictObject({
  id: uuidSchema,
  schoolId: uuidSchema,
  studentId: opaqueIdentifierSchema,
  objectiveId: opaqueIdentifierSchema,
  variantKey: opaqueIdentifierSchema,
  state: z.enum(["new", "learning", "review", "relearning"]),
  stability: z.number().finite().min(0),
  difficulty: z.number().finite().min(0).max(10),
  dueAt: isoDateTimeSchema,
  lastReviewedAt: isoDateTimeSchema.nullable(),
  reps: counterSchema,
  lapses: counterSchema,
  revision: counterSchema,
  paramsVersion: opaqueIdentifierSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

/** Immutable persisted review-log record. */
export const masteryReviewRecordSchema = z.strictObject({
  id: uuidSchema,
  schoolId: uuidSchema,
  cardId: uuidSchema,
  studentId: opaqueIdentifierSchema,
  submissionId: opaqueIdentifierSchema,
  rating: z.enum(["again", "hard", "good", "easy"]),
  beforeState: z.enum(["new", "learning", "review", "relearning"]),
  afterState: z.enum(["new", "learning", "review", "relearning"]),
  evidenceReasons: z.array(opaqueIdentifierSchema).max(128),
  paramsVersion: opaqueIdentifierSchema,
  reviewedAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
});

/** Immutable corrected evidence record used by mastery state projection. */
export const masteryEvidenceRecordSchema = z.strictObject({
  id: uuidSchema,
  schoolId: uuidSchema,
  studentId: opaqueIdentifierSchema,
  objectiveId: opaqueIdentifierSchema,
  variantKey: opaqueIdentifierSchema,
  sourceId: opaqueIdentifierSchema,
  evidenceOrdinal: counterSchema,
  evidenceType: opaqueIdentifierSchema,
  correctedStrength: probabilitySchema,
  practiceCoverage: probabilitySchema,
  confidence: probabilitySchema,
  attemptCount: counterSchema,
  supportMetadata: z.strictObject({
    revealSteps: counterSchema,
    misconceptionTags: z.array(opaqueIdentifierSchema).max(128),
  }),
  provenance: masteryProvenanceSchema,
  createdAt: isoDateTimeSchema,
});

/** Optimistically versioned objective mastery-state record. */
export const masteryStateRecordSchema = z.strictObject({
  id: uuidSchema,
  schoolId: uuidSchema,
  studentId: opaqueIdentifierSchema,
  objectiveId: opaqueIdentifierSchema,
  masteryState: z.enum([
    "unseen",
    "introduced",
    "practicing",
    "proficient",
    "mastered",
  ]),
  mastery: probabilitySchema,
  retention: probabilitySchema,
  evidenceConfidence: probabilitySchema,
  graphRelease: opaqueIdentifierSchema,
  revision: counterSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

/** Immutable placement estimate and its seed provenance. */
export const masteryPlacementRecordSchema = z.strictObject({
  id: uuidSchema,
  schoolId: uuidSchema,
  studentId: opaqueIdentifierSchema,
  objectiveId: opaqueIdentifierSchema,
  estimate: probabilitySchema,
  confidence: z.enum(["low", "medium", "high"]),
  evidenceType: opaqueIdentifierSchema,
  graphRelease: opaqueIdentifierSchema,
  seedProvenance: masteryProvenanceSchema,
  replacedByDirectEvidence: z.boolean(),
  createdAt: isoDateTimeSchema,
});

/** Calibration model provenance retained for reproducible release approval. */
export const masteryCalibrationProvenanceSchema = z.strictObject({
  engineVersion: opaqueIdentifierSchema,
  fsrsVersion: opaqueIdentifierSchema,
  calibrationVersion: opaqueIdentifierSchema,
  policyVersion: opaqueIdentifierSchema,
  paramsVersion: opaqueIdentifierSchema,
  algorithmVersion: opaqueIdentifierSchema,
  optimizerVersion: opaqueIdentifierSchema,
});

/** Calibration evaluation metric set compared during release approval. */
export const masteryCalibrationMetricsSchema = z.strictObject({
  logLoss: z.number().finite().min(0),
});

const calibrationArtifactSchema = z.strictObject({
  id: uuidSchema,
  paramsVersion: opaqueIdentifierSchema,
  optimizerVersion: opaqueIdentifierSchema,
  incumbentParamsVersion: opaqueIdentifierSchema,
  weights: z.array(z.number().finite()).min(1).max(64),
  reviewCount: positiveCounterSchema,
  studentCount: positiveCounterSchema,
  trainingReviewCount: positiveCounterSchema,
  holdoutReviewCount: positiveCounterSchema,
  candidateMetrics: masteryCalibrationMetricsSchema,
  incumbentMetrics: masteryCalibrationMetricsSchema,
  volumeGatePassed: z.literal(true),
  evaluationGatePassed: z.literal(true),
  provenance: masteryCalibrationProvenanceSchema,
});

const calibrationApprovalSchema = z.strictObject({
  approvedBy: opaqueIdentifierSchema,
  approvedAt: isoDateTimeSchema,
  decision: z.literal("approved"),
});

/** Runtime contract for a fully evidenced human-approved calibration release. */
export const masteryCalibrationApprovalInputSchema = z
  .strictObject({
    contractVersion: z.literal(MASTERY_PERSISTENCE_CONTRACT_VERSION),
    schoolId: uuidSchema,
    idempotencyKey: opaqueIdentifierSchema,
    domain: opaqueIdentifierSchema,
    ageBand: opaqueIdentifierSchema,
    artifact: calibrationArtifactSchema,
    approval: calibrationApprovalSchema,
    audit: masteryAuditSchema,
  })
  .superRefine((input, context) => {
    if (
      input.artifact.trainingReviewCount + input.artifact.holdoutReviewCount !==
      input.artifact.reviewCount
    ) {
      context.addIssue({
        code: "custom",
        path: ["artifact", "reviewCount"],
        message: "Training and holdout volume must equal total review volume.",
      });
    }
    if (
      input.artifact.candidateMetrics.logLoss >=
      input.artifact.incumbentMetrics.logLoss
    ) {
      context.addIssue({
        code: "custom",
        path: ["artifact", "candidateMetrics", "logLoss"],
        message: "The candidate calibration must improve incumbent log loss.",
      });
    }
    if (input.approval.approvedBy !== input.audit.actorId) {
      context.addIssue({
        code: "custom",
        path: ["approval", "approvedBy"],
        message: "The approving actor must match the audit actor.",
      });
    }
  });

/** Immutable calibration artifact and release-governance decision. */
export const masteryCalibrationRecordSchema = z.strictObject({
  id: uuidSchema,
  schoolId: uuidSchema,
  idempotencyKey: opaqueIdentifierSchema,
  domain: opaqueIdentifierSchema,
  ageBand: opaqueIdentifierSchema,
  artifact: calibrationArtifactSchema,
  approval: calibrationApprovalSchema,
  audit: masteryAuditSchema,
  createdAt: isoDateTimeSchema,
});

/** Stable IDs returned from an applied or replayed commit. */
export const masteryCommitRecordIdsSchema = z.strictObject({
  card: uuidSchema,
  review: uuidSchema,
  evidence: z.array(uuidSchema).min(1).max(512),
  state: uuidSchema,
  placement: uuidSchema,
});

/** Immutable idempotency receipt for an atomic mastery commit. */
export const masteryCommitRecordSchema = z.strictObject({
  id: uuidSchema,
  schoolId: uuidSchema,
  studentId: opaqueIdentifierSchema,
  idempotencyKey: opaqueIdentifierSchema,
  contractVersion: z.literal(MASTERY_PERSISTENCE_CONTRACT_VERSION),
  requestDigest: sha256Schema,
  resultDigest: sha256Schema,
  status: z.literal("applied"),
  cardRevision: counterSchema,
  stateRevision: counterSchema,
  recordIds: masteryCommitRecordIdsSchema,
  provenance: masteryProvenanceSchema,
  audit: masteryAuditSchema,
  createdAt: isoDateTimeSchema,
});

/** Input for reading one school's complete mastery persistence snapshot. */
export const masterySnapshotInputSchema = z.strictObject({ schoolId: uuidSchema });

/** Parsed, deterministic view returned by a mastery persistence adapter. */
export const masterySnapshotSchema = z.strictObject({
  cards: z.array(masteryCardRecordSchema),
  reviews: z.array(masteryReviewRecordSchema),
  evidence: z.array(masteryEvidenceRecordSchema),
  states: z.array(masteryStateRecordSchema),
  placements: z.array(masteryPlacementRecordSchema),
  calibrations: z.array(masteryCalibrationRecordSchema),
  commits: z.array(masteryCommitRecordSchema),
});

/** Runtime-validated canonical command for atomically persisting mastery evidence. */
export const commitMasteryEvidenceInputSchema = z
  .strictObject({
    contractVersion: z.literal(MASTERY_PERSISTENCE_CONTRACT_VERSION),
    schoolId: uuidSchema,
    studentId: opaqueIdentifierSchema,
    idempotencyKey: opaqueIdentifierSchema,
    expectedRevisions: z.strictObject({
      card: counterSchema.nullable(),
      state: counterSchema.nullable(),
    }),
    provenance: masteryProvenanceSchema,
    audit: masteryAuditSchema,
    records: z.strictObject({
      card: masteryCardRecordSchema,
      review: masteryReviewRecordSchema,
      evidence: z.array(masteryEvidenceRecordSchema).min(1).max(512),
      state: masteryStateRecordSchema,
      placement: masteryPlacementRecordSchema,
    }),
  })
  .superRefine((input, context) => {
    const records = [
      input.records.card,
      input.records.review,
      ...input.records.evidence,
      input.records.state,
      input.records.placement,
    ];
    for (const [index, record] of records.entries()) {
      if (record.schoolId !== input.schoolId) {
        context.addIssue({
          code: "custom",
          path: ["records", index, "schoolId"],
          message: "Every mastery record must belong to the command school.",
        });
      }
      if (record.studentId !== input.studentId) {
        context.addIssue({
          code: "custom",
          path: ["records", index, "studentId"],
          message: "Every mastery record must belong to the command student.",
        });
      }
    }
    if (input.records.review.cardId !== input.records.card.id) {
      context.addIssue({
        code: "custom",
        path: ["records", "review", "cardId"],
        message: "The review must reference the committed card.",
      });
    }
  });

/** Runtime-validated result of an applied or replayed mastery commit. */
export const commitMasteryEvidenceResultSchema = z.strictObject({
  status: z.enum(["applied", "replayed"]),
  commitId: uuidSchema,
  resultDigest: sha256Schema,
  cardRevision: counterSchema,
  stateRevision: counterSchema,
  recordIds: masteryCommitRecordIdsSchema,
});

/** Runtime-validated result of an approved calibration release. */
export const approveMasteryCalibrationResultSchema = z.strictObject({
  calibrationId: uuidSchema,
  status: z.literal("approved"),
});

/** Parsed mastery provenance metadata. */
export type MasteryProvenance = z.infer<typeof masteryProvenanceSchema>;
/** Parsed mastery audit metadata. */
export type MasteryAudit = z.infer<typeof masteryAuditSchema>;
/** Parsed persisted card record. */
export type MasteryCardRecord = z.infer<typeof masteryCardRecordSchema>;
/** Parsed persisted review record. */
export type MasteryReviewRecord = z.infer<typeof masteryReviewRecordSchema>;
/** Parsed persisted evidence record. */
export type MasteryEvidenceRecord = z.infer<typeof masteryEvidenceRecordSchema>;
/** Parsed persisted objective-state record. */
export type MasteryStateRecord = z.infer<typeof masteryStateRecordSchema>;
/** Parsed persisted placement record. */
export type MasteryPlacementRecord = z.infer<typeof masteryPlacementRecordSchema>;
/** Parsed persisted calibration record. */
export type MasteryCalibrationRecord = z.infer<typeof masteryCalibrationRecordSchema>;
/** Parsed persisted idempotency receipt. */
export type MasteryCommitRecord = z.infer<typeof masteryCommitRecordSchema>;
/** Parsed school-scoped snapshot request. */
export type MasterySnapshotInput = z.infer<typeof masterySnapshotInputSchema>;
/** Parsed school-scoped persistence snapshot. */
export type MasterySnapshot = z.infer<typeof masterySnapshotSchema>;
/** Parsed canonical atomic mastery commit input. */
export type CommitMasteryEvidenceInput = z.infer<typeof commitMasteryEvidenceInputSchema>;
/** Parsed atomic mastery commit result. */
export type CommitMasteryEvidenceResult = z.infer<typeof commitMasteryEvidenceResultSchema>;
/** Parsed calibration approval input. */
export type ApproveMasteryCalibrationInput = z.infer<
  typeof masteryCalibrationApprovalInputSchema
>;
/** Parsed calibration approval result. */
export type ApproveMasteryCalibrationResult = z.infer<
  typeof approveMasteryCalibrationResultSchema
>;

import { z } from "zod";

/** Version of the portable mastery persistence contract. */
export const MASTERY_PERSISTENCE_CONTRACT_VERSION = "mastery.persistence.v1" as const;

const identifierSchema = z.string().trim().min(1).max(256);
const isoDateTimeSchema = z.string().datetime({ offset: true });
const probabilitySchema = z.number().finite().min(0).max(1);
const counterSchema = z.number().int().min(0);

/** Version and source metadata required on persisted mastery decisions. */
export const masteryProvenanceSchema = z.strictObject({
  normativeSpecVersion: identifierSchema,
  engineContractVersion: identifierSchema,
  graphRelease: identifierSchema,
  configVersion: identifierSchema,
  paramsVersion: identifierSchema,
  adapterVersion: z.literal(MASTERY_PERSISTENCE_CONTRACT_VERSION),
});

/** Audit identity attached to an atomic mastery persistence commit. */
export const masteryAuditSchema = z.strictObject({
  actorId: identifierSchema,
  requestId: identifierSchema,
  sourceId: identifierSchema,
  correlationId: identifierSchema,
});

/** Portable persisted FSRS card record. */
export const masteryCardRecordSchema = z.strictObject({
  id: identifierSchema,
  schoolId: identifierSchema,
  studentId: identifierSchema,
  objectiveId: identifierSchema,
  variantKey: identifierSchema,
  state: z.enum(["new", "learning", "review", "relearning"]),
  stability: z.number().finite().min(0),
  difficulty: z.number().finite().min(0).max(10),
  dueAt: isoDateTimeSchema,
  lastReviewedAt: isoDateTimeSchema.nullable(),
  reps: counterSchema,
  lapses: counterSchema,
  revision: counterSchema,
  paramsVersion: identifierSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

/** Immutable persisted review-log record. */
export const masteryReviewRecordSchema = z.strictObject({
  id: identifierSchema,
  schoolId: identifierSchema,
  cardId: identifierSchema,
  studentId: identifierSchema,
  submissionId: identifierSchema,
  rating: z.enum(["again", "hard", "good", "easy"]),
  beforeState: z.enum(["new", "learning", "review", "relearning"]),
  afterState: z.enum(["new", "learning", "review", "relearning"]),
  evidenceReasons: z.array(identifierSchema).max(128),
  paramsVersion: identifierSchema,
  reviewedAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
});

/** Immutable corrected evidence record used by mastery state projection. */
export const masteryEvidenceRecordSchema = z.strictObject({
  id: identifierSchema,
  schoolId: identifierSchema,
  studentId: identifierSchema,
  objectiveId: identifierSchema,
  variantKey: identifierSchema,
  sourceId: identifierSchema,
  evidenceOrdinal: counterSchema,
  evidenceType: identifierSchema,
  correctedStrength: probabilitySchema,
  practiceCoverage: probabilitySchema,
  confidence: probabilitySchema,
  attemptCount: counterSchema,
  supportMetadata: z.strictObject({
    revealSteps: counterSchema,
    misconceptionTags: z.array(identifierSchema).max(128),
  }),
  provenance: masteryProvenanceSchema,
  createdAt: isoDateTimeSchema,
});

/** Optimistically versioned objective mastery-state record. */
export const masteryStateRecordSchema = z.strictObject({
  id: identifierSchema,
  schoolId: identifierSchema,
  studentId: identifierSchema,
  objectiveId: identifierSchema,
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
  graphRelease: identifierSchema,
  revision: counterSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

/** Immutable placement estimate and its seed provenance. */
export const masteryPlacementRecordSchema = z.strictObject({
  id: identifierSchema,
  schoolId: identifierSchema,
  studentId: identifierSchema,
  objectiveId: identifierSchema,
  estimate: probabilitySchema,
  confidence: z.enum(["low", "medium", "high"]),
  evidenceType: identifierSchema,
  graphRelease: identifierSchema,
  seedProvenance: masteryProvenanceSchema,
  replacedByDirectEvidence: z.boolean(),
  createdAt: isoDateTimeSchema,
});

/** Immutable calibration artifact and release-governance decision. */
export const masteryCalibrationRecordSchema = z.strictObject({
  id: identifierSchema,
  schoolId: identifierSchema,
  domain: identifierSchema,
  ageBand: identifierSchema,
  paramsVersion: identifierSchema,
  optimizerVersion: identifierSchema,
  incumbentParamsVersion: identifierSchema,
  weights: z.array(z.number().finite()).min(1).max(64),
  volumeGatePassed: z.boolean(),
  evaluationGatePassed: z.boolean(),
  humanReleaseApproved: z.boolean(),
  provenance: masteryProvenanceSchema,
  createdAt: isoDateTimeSchema,
});

/** Stable IDs returned from an applied or replayed commit. */
export const masteryCommitRecordIdsSchema = z.strictObject({
  card: identifierSchema,
  review: identifierSchema,
  evidence: z.array(identifierSchema).min(1).max(512),
  state: identifierSchema,
  placement: identifierSchema,
  calibration: identifierSchema,
});

/** Immutable idempotency receipt for an atomic mastery commit. */
export const masteryCommitRecordSchema = z.strictObject({
  id: identifierSchema,
  schoolId: identifierSchema,
  studentId: identifierSchema,
  idempotencyKey: identifierSchema,
  contractVersion: z.literal(MASTERY_PERSISTENCE_CONTRACT_VERSION),
  requestDigest: z.string().regex(/^sha256:[A-Za-z0-9._:-]+$/),
  resultDigest: z.string().regex(/^sha256:[A-Za-z0-9._:-]+$/),
  status: z.literal("applied"),
  cardRevision: counterSchema,
  stateRevision: counterSchema,
  recordIds: masteryCommitRecordIdsSchema,
  provenance: masteryProvenanceSchema,
  audit: masteryAuditSchema,
  createdAt: isoDateTimeSchema,
});

/** Input for reading one school's complete mastery persistence snapshot. */
export const masterySnapshotInputSchema = z.strictObject({
  schoolId: identifierSchema,
});

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

/** Runtime-validated command for atomically persisting mastery evidence. */
export const commitMasteryEvidenceInputSchema = z.strictObject({
  contractVersion: z.literal(MASTERY_PERSISTENCE_CONTRACT_VERSION),
  schoolId: identifierSchema,
  studentId: identifierSchema,
  idempotencyKey: identifierSchema,
  requestDigest: z.string().regex(/^sha256:[A-Za-z0-9._:-]+$/),
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
    calibration: masteryCalibrationRecordSchema,
  }),
});

/** Runtime-validated result of an applied or replayed mastery commit. */
export const commitMasteryEvidenceResultSchema = z.strictObject({
  status: z.enum(["applied", "replayed"]),
  commitId: identifierSchema,
  resultDigest: z.string().regex(/^sha256:[A-Za-z0-9._:-]+$/),
  cardRevision: counterSchema,
  stateRevision: counterSchema,
  recordIds: masteryCommitRecordIdsSchema,
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
/** Parsed atomic mastery commit input. */
export type CommitMasteryEvidenceInput = z.infer<typeof commitMasteryEvidenceInputSchema>;
/** Parsed atomic mastery commit result. */
export type CommitMasteryEvidenceResult = z.infer<typeof commitMasteryEvidenceResultSchema>;


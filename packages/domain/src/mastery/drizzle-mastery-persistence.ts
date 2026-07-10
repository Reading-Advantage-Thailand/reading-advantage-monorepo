import { createHash } from "node:crypto";
import type { DB } from "@reading-advantage/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import {
  approveMasteryCalibrationResultSchema,
  commitMasteryEvidenceInputSchema,
  commitMasteryEvidenceResultSchema,
  masteryCalibrationApprovalInputSchema,
  masteryCalibrationRecordSchema,
  masteryCommitRecordSchema,
  masterySnapshotInputSchema,
  masterySnapshotSchema,
  type ApproveMasteryCalibrationInput,
  type ApproveMasteryCalibrationResult,
  type CommitMasteryEvidenceInput,
  type CommitMasteryEvidenceResult,
  type MasteryCalibrationRecord,
  type MasteryCardRecord,
  type MasteryCommitRecord,
  type MasteryEvidenceRecord,
  type MasteryPlacementRecord,
  type MasteryReviewRecord,
  type MasterySnapshot,
  type MasterySnapshotInput,
  type MasteryStateRecord,
} from "./persistence-contracts.js";
import {
  MasteryPersistenceError,
  type MasteryPersistencePort,
} from "./persistence-ports.js";
import type { TenantDB } from "../db-contract.js";

type DbModule = typeof import("@reading-advantage/db");
type MasteryCardRow = DbModule["masteryCards"]["$inferSelect"];
type MasteryReviewRow = DbModule["masteryReviews"]["$inferSelect"];
type MasteryEvidenceRow = DbModule["masteryEvidence"]["$inferSelect"];
type MasteryStateRow = DbModule["masteryStates"]["$inferSelect"];
type MasteryPlacementRow = DbModule["masteryPlacements"]["$inferSelect"];
type MasteryCalibrationRow = DbModule["masteryCalibrations"]["$inferSelect"];
type MasteryCommitRow = DbModule["masteryCommits"]["$inferSelect"];

async function loadDbModule(): Promise<DbModule> {
  return import("@reading-advantage/db");
}

/** Construction options for the provider-neutral Drizzle mastery adapter. */
export interface DrizzleMasteryPersistenceOptions {
  /** Schema-aware Drizzle database instance. */
  db: unknown;
  /** Authenticated tenant that permanently scopes this adapter. */
  tenant: { schoolId: string } | null;
  /** Authenticated actor that must match every write audit. */
  actorId: string;
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new MasteryPersistenceError(
      "VALIDATION_ERROR",
      `Mastery persistence input failed validation: ${parsed.error.issues
        .map((issue) => issue.path.join(".") || "root")
        .join(", ")}`,
    );
  }
  return parsed.data;
}

function iso(value: Date): string {
  return value.toISOString();
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

function digest(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`;
}

function uuidFromDigest(value: string): string {
  const hex = value.replace(/^sha256:/, "").padEnd(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(
    17,
    20,
  )}-${hex.slice(20, 32)}`;
}

function assertOwnership(input: CommitMasteryEvidenceInput): void {
  const records = [
    input.records.card,
    input.records.review,
    ...input.records.evidence,
    input.records.state,
    input.records.placement,
  ];
  if (records.some((record) => record.schoolId !== input.schoolId)) {
    throw new MasteryPersistenceError(
      "TENANT_SCOPE_ERROR",
      "Every mastery record must belong to the commit school.",
    );
  }
  const studentRecords = [
    input.records.card,
    input.records.review,
    ...input.records.evidence,
    input.records.state,
    input.records.placement,
  ];
  if (studentRecords.some((record) => record.studentId !== input.studentId)) {
    throw new MasteryPersistenceError(
      "TENANT_SCOPE_ERROR",
      "Every student-owned mastery record must belong to the commit student.",
    );
  }
  if (input.records.review.cardId !== input.records.card.id) {
    throw new MasteryPersistenceError(
      "VALIDATION_ERROR",
      "The review card must match the committed card.",
    );
  }
}

function cardFromRow(row: MasteryCardRow): MasteryCardRecord {
  return {
    id: row.id,
    schoolId: row.schoolId,
    studentId: row.studentId,
    objectiveId: row.objectiveId,
    variantKey: row.variantKey,
    state: row.state as MasteryCardRecord["state"],
    stability: row.stability,
    difficulty: row.difficulty,
    dueAt: iso(row.dueDate),
    lastReviewedAt: row.lastReview ? iso(row.lastReview) : null,
    reps: row.reps,
    lapses: row.lapses,
    revision: row.revision,
    paramsVersion: row.paramsVersion,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function reviewFromRow(row: MasteryReviewRow): MasteryReviewRecord {
  return {
    id: row.id,
    schoolId: row.schoolId,
    cardId: row.cardId,
    studentId: row.studentId,
    submissionId: row.submissionId,
    rating: row.rating as MasteryReviewRecord["rating"],
    beforeState: row.stateBeforeJson.state as MasteryReviewRecord["beforeState"],
    afterState: row.stateAfterJson.state as MasteryReviewRecord["afterState"],
    evidenceReasons: row.evidenceJson.evidenceReasons as string[],
    paramsVersion: row.paramsVersion,
    reviewedAt: iso(row.reviewedAt),
    createdAt: iso(row.createdAt),
  };
}

function evidenceFromRow(
  row: MasteryEvidenceRow,
): MasteryEvidenceRecord {
  return {
    id: row.id,
    schoolId: row.schoolId,
    studentId: row.studentId,
    objectiveId: row.objectiveId,
    variantKey: row.variantKey,
    sourceId: row.sourceId,
    evidenceOrdinal: row.evidenceOrdinal,
    evidenceType: row.evidenceType,
    correctedStrength: row.retentionStrength,
    practiceCoverage: row.practiceCoverage,
    confidence: row.evidenceConfidence,
    attemptCount: row.attemptCount,
    supportMetadata:
      row.provenanceJson.supportMetadata as MasteryEvidenceRecord["supportMetadata"],
    provenance: row.provenanceJson.provenance as MasteryEvidenceRecord["provenance"],
    createdAt: iso(row.createdAt),
  };
}

function stateFromRow(row: MasteryStateRow): MasteryStateRecord {
  return {
    id: row.id,
    schoolId: row.schoolId,
    studentId: row.studentId,
    objectiveId: row.objectiveId,
    masteryState: row.masteryState as MasteryStateRecord["masteryState"],
    mastery: row.masteryLevel,
    retention: row.liveRetention,
    evidenceConfidence: row.evidenceConfidence,
    graphRelease: row.graphRelease,
    revision: row.revision,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function placementFromRow(
  row: MasteryPlacementRow,
): MasteryPlacementRecord {
  return {
    id: row.id,
    schoolId: row.schoolId,
    studentId: row.studentId,
    objectiveId: row.objectiveId,
    estimate: row.masteryEstimate,
    confidence: row.confidence as MasteryPlacementRecord["confidence"],
    evidenceType: row.evidenceType,
    graphRelease: row.graphRelease,
    seedProvenance:
      row.seedProvenanceJson as MasteryPlacementRecord["seedProvenance"],
    replacedByDirectEvidence: row.replacedByDirectAt !== null,
    createdAt: iso(row.createdAt),
  };
}

function calibrationFromRow(
  row: MasteryCalibrationRow,
): MasteryCalibrationRecord {
  const stored = row.fsrsParametersJson.record;
  return parseOrThrow(masteryCalibrationRecordSchema, stored);
}

function commitFromRow(row: MasteryCommitRow): MasteryCommitRecord {
  return parseOrThrow(masteryCommitRecordSchema, row.resultJson);
}

function providerCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { code?: unknown; cause?: { code?: unknown } };
  const code = candidate.code ?? candidate.cause?.code;
  return typeof code === "string" ? code : undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return providerCode(error) === "23505";
}

function portableFailure(error: unknown): never {
  if (error instanceof MasteryPersistenceError) throw error;
  if (isUniqueViolation(error)) {
    throw new MasteryPersistenceError(
      "APPEND_ONLY_CONFLICT",
      "An immutable mastery record conflicts with persisted data.",
      { cause: error },
    );
  }
  const code = providerCode(error);
  if (code === "40001" || code === "ECONNREFUSED") {
    throw new MasteryPersistenceError(
      "PERSISTENCE_UNAVAILABLE",
      "The mastery persistence service is temporarily unavailable.",
    );
  }
  if (code === "ETIMEDOUT") {
    throw new MasteryPersistenceError(
      "PERSISTENCE_TIMEOUT",
      "The mastery persistence operation timed out.",
    );
  }
  if (code === "42P01") {
    throw new MasteryPersistenceError(
      "MISSING_MIGRATION",
      "The mastery persistence schema is not available.",
    );
  }
  throw new MasteryPersistenceError(
    "INTERNAL_ERROR",
    "The mastery persistence operation could not be applied.",
  );
}

class DrizzleMasteryPersistence implements MasteryPersistencePort {
  private readonly db: DB;
  private readonly schoolId: string;
  private readonly actorId: string;
  private tenantDbPromise: Promise<TenantDB> | undefined;

  constructor(options: DrizzleMasteryPersistenceOptions) {
    if (!options.tenant?.schoolId || !options.actorId.trim()) {
      throw new MasteryPersistenceError(
        "TENANT_SCOPE_ERROR",
        "An authenticated tenant and actor are required.",
      );
    }
    this.db = options.db as DB;
    this.schoolId = options.tenant.schoolId;
    this.actorId = options.actorId;
  }

  private scopedDb(): Promise<TenantDB> {
    this.tenantDbPromise ??= import("../db-contract.js").then(
      ({ createTenantDB }) =>
        createTenantDB(this.db, { schoolId: this.schoolId }),
    );
    return this.tenantDbPromise;
  }

  private assertSchool(schoolId: string): void {
    if (schoolId !== this.schoolId) {
      throw new MasteryPersistenceError(
        "TENANT_SCOPE_ERROR",
        "The mastery operation is outside the authenticated tenant.",
      );
    }
  }

  private assertActor(actorId: string): void {
    if (actorId !== this.actorId) {
      throw new MasteryPersistenceError(
        "TENANT_SCOPE_ERROR",
        "The mastery audit actor does not match the authenticated actor.",
      );
    }
  }

  private async findReplay(
    schoolId: string,
    idempotencyKey: string,
    requestDigest: string,
  ): Promise<CommitMasteryEvidenceResult | null> {
    const { masteryCommits } = await loadDbModule();
    const tenantDb = await this.scopedDb();
    const [existing] = await tenantDb
      .select()
      .from(masteryCommits)
      .where(
        and(
          eq(masteryCommits.schoolId, schoolId),
          eq(masteryCommits.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (!existing) return null;
    const commit = commitFromRow(existing);
    if (commit.requestDigest !== requestDigest) {
      throw new MasteryPersistenceError(
        "IDEMPOTENCY_CONFLICT",
        "The idempotency key is already bound to a different request.",
      );
    }
    return parseOrThrow(commitMasteryEvidenceResultSchema, {
      status: "replayed",
      commitId: commit.id,
      resultDigest: commit.resultDigest,
      cardRevision: commit.cardRevision,
      stateRevision: commit.stateRevision,
      recordIds: commit.recordIds,
    });
  }

  async readSnapshot(input: MasterySnapshotInput): Promise<MasterySnapshot> {
    const parsed = parseOrThrow(masterySnapshotInputSchema, input);
    this.assertSchool(parsed.schoolId);
    try {
      const tenantDb = await this.scopedDb();
      const {
        masteryCalibrations,
        masteryCards,
        masteryCommits,
        masteryEvidence,
        masteryPlacements,
        masteryReviews,
        masteryStates,
      } = await loadDbModule();
      const [cards, reviews, evidence, states, placements, calibrations, commits] =
        await Promise.all([
          tenantDb
            .select()
            .from(masteryCards)
            .where(eq(masteryCards.schoolId, parsed.schoolId))
            .orderBy(asc(masteryCards.id)),
          tenantDb
            .select()
            .from(masteryReviews)
            .where(eq(masteryReviews.schoolId, parsed.schoolId))
            .orderBy(asc(masteryReviews.id)),
          tenantDb
            .select()
            .from(masteryEvidence)
            .where(eq(masteryEvidence.schoolId, parsed.schoolId))
            .orderBy(asc(masteryEvidence.id)),
          tenantDb
            .select()
            .from(masteryStates)
            .where(eq(masteryStates.schoolId, parsed.schoolId))
            .orderBy(asc(masteryStates.id)),
          tenantDb
            .select()
            .from(masteryPlacements)
            .where(eq(masteryPlacements.schoolId, parsed.schoolId))
            .orderBy(asc(masteryPlacements.id)),
          tenantDb
            .select()
            .from(masteryCalibrations)
            .where(eq(masteryCalibrations.schoolId, parsed.schoolId))
            .orderBy(asc(masteryCalibrations.id)),
          tenantDb
            .select()
            .from(masteryCommits)
            .where(eq(masteryCommits.schoolId, parsed.schoolId))
            .orderBy(asc(masteryCommits.id)),
        ]);
      return parseOrThrow(masterySnapshotSchema, {
        cards: cards.map(cardFromRow),
        reviews: reviews.map(reviewFromRow),
        evidence: evidence.map(evidenceFromRow),
        states: states.map(stateFromRow),
        placements: placements.map(placementFromRow),
        calibrations: calibrations.map(calibrationFromRow),
        commits: commits.map(commitFromRow),
      });
    } catch (error) {
      return portableFailure(error);
    }
  }

  async commitMasteryEvidence(
    input: CommitMasteryEvidenceInput,
  ): Promise<CommitMasteryEvidenceResult> {
    const parsed = parseOrThrow(commitMasteryEvidenceInputSchema, input);
    this.assertSchool(parsed.schoolId);
    this.assertActor(parsed.audit.actorId);
    assertOwnership(parsed);
    const requestDigest = digest(parsed);
    try {
      const tenantDb = await this.scopedDb();
      const {
        masteryCards,
        masteryCommits,
        masteryEvidence,
        masteryPlacements,
        masteryReviews,
        masteryStates,
      } = await loadDbModule();
      return await tenantDb.transaction(
        async (transaction) => {
          const existingRows = await transaction
            .select()
            .from(masteryCommits)
            .where(
              and(
                eq(masteryCommits.schoolId, parsed.schoolId),
                eq(masteryCommits.idempotencyKey, parsed.idempotencyKey),
              ),
            )
            .limit(1);
          const existing = existingRows[0];
          if (existing) {
            const commit = commitFromRow(existing);
            if (commit.requestDigest !== requestDigest) {
              throw new MasteryPersistenceError(
                "IDEMPOTENCY_CONFLICT",
                "The idempotency key is already bound to a different request.",
              );
            }
            return parseOrThrow(commitMasteryEvidenceResultSchema, {
              status: "replayed",
              commitId: commit.id,
              resultDigest: commit.resultDigest,
              cardRevision: commit.cardRevision,
              stateRevision: commit.stateRevision,
              recordIds: commit.recordIds,
            });
          }

          const [reviewCollision, evidenceCollisions, placementCollision] =
            await Promise.all([
              transaction
                .select({ id: masteryReviews.id })
                .from(masteryReviews)
                .where(
                  and(
                    eq(masteryReviews.schoolId, parsed.schoolId),
                    eq(masteryReviews.id, parsed.records.review.id),
                  ),
                )
                .limit(1),
              transaction
                .select({ id: masteryEvidence.id })
                .from(masteryEvidence)
                .where(
                  and(
                    eq(masteryEvidence.schoolId, parsed.schoolId),
                    inArray(
                      masteryEvidence.id,
                      parsed.records.evidence.map((record) => record.id),
                    ),
                  ),
                ),
              transaction
                .select({ id: masteryPlacements.id })
                .from(masteryPlacements)
                .where(
                  and(
                    eq(masteryPlacements.schoolId, parsed.schoolId),
                    eq(masteryPlacements.id, parsed.records.placement.id),
                  ),
                )
                .limit(1),
            ]);
          if (
            reviewCollision.length > 0 ||
            evidenceCollisions.length > 0 ||
            placementCollision.length > 0
          ) {
            throw new MasteryPersistenceError(
              "APPEND_ONLY_CONFLICT",
              "An immutable mastery record ID already exists.",
            );
          }

          const [currentCard] = await transaction
            .select({
              revision: masteryCards.revision,
              studentId: masteryCards.studentId,
              objectiveId: masteryCards.objectiveId,
              variantKey: masteryCards.variantKey,
            })
            .from(masteryCards)
            .where(
              and(
                eq(masteryCards.schoolId, parsed.schoolId),
                eq(masteryCards.id, parsed.records.card.id),
              ),
            )
            .limit(1);
          const [currentState] = await transaction
            .select({
              revision: masteryStates.revision,
              studentId: masteryStates.studentId,
              objectiveId: masteryStates.objectiveId,
            })
            .from(masteryStates)
            .where(
              and(
                eq(masteryStates.schoolId, parsed.schoolId),
                eq(masteryStates.id, parsed.records.state.id),
              ),
            )
            .limit(1);
          if (
            currentCard &&
            (currentCard.studentId !== parsed.studentId ||
              currentCard.objectiveId !== parsed.records.card.objectiveId ||
              currentCard.variantKey !== parsed.records.card.variantKey)
          ) {
            throw new MasteryPersistenceError(
              "APPEND_ONLY_CONFLICT",
              "An existing mastery card cannot be retargeted.",
            );
          }
          if (
            currentState &&
            (currentState.studentId !== parsed.studentId ||
              currentState.objectiveId !== parsed.records.state.objectiveId)
          ) {
            throw new MasteryPersistenceError(
              "APPEND_ONLY_CONFLICT",
              "An existing mastery state cannot be retargeted.",
            );
          }
          const cardCurrentRevision = currentCard?.revision ?? null;
          const stateCurrentRevision = currentState?.revision ?? null;
          if (
            cardCurrentRevision !== parsed.expectedRevisions.card ||
            parsed.records.card.revision !== (currentCard ? currentCard.revision + 1 : 0) ||
            stateCurrentRevision !== parsed.expectedRevisions.state ||
            parsed.records.state.revision !== (currentState ? currentState.revision + 1 : 0)
          ) {
            throw new MasteryPersistenceError(
              "REVISION_CONFLICT",
              "A mastery card or objective-state revision is stale.",
            );
          }

          const cardValues = {
            id: parsed.records.card.id,
            schoolId: parsed.schoolId,
            studentId: parsed.studentId,
            objectiveId: parsed.records.card.objectiveId,
            variantKey: parsed.records.card.variantKey,
            stability: parsed.records.card.stability,
            difficulty: parsed.records.card.difficulty,
            state: parsed.records.card.state,
            dueDate: new Date(parsed.records.card.dueAt),
            elapsedDays: 0,
            scheduledDays: 0,
            reps: parsed.records.card.reps,
            lapses: parsed.records.card.lapses,
            lastReview: parsed.records.card.lastReviewedAt
              ? new Date(parsed.records.card.lastReviewedAt)
              : null,
            paramsVersion: parsed.records.card.paramsVersion,
            revision: parsed.records.card.revision,
            createdAt: new Date(parsed.records.card.createdAt),
            updatedAt: new Date(parsed.records.card.updatedAt),
          };
          if (currentCard) {
            const updated = await transaction
              .update(masteryCards)
              .set(cardValues)
              .where(
                and(
                  eq(masteryCards.schoolId, parsed.schoolId),
                  eq(masteryCards.id, parsed.records.card.id),
                  eq(masteryCards.revision, parsed.expectedRevisions.card!),
                ),
              )
              .returning({ id: masteryCards.id });
            if (updated.length !== 1) {
              throw new MasteryPersistenceError(
                "REVISION_CONFLICT",
                "The mastery card revision changed concurrently.",
              );
            }
          } else {
            await transaction.insert(masteryCards).values(cardValues);
          }

          await transaction.insert(masteryReviews).values({
            id: parsed.records.review.id,
            schoolId: parsed.schoolId,
            cardId: parsed.records.review.cardId,
            studentId: parsed.studentId,
            submissionId: parsed.records.review.submissionId,
            rating: parsed.records.review.rating,
            evidenceJson: { evidenceReasons: parsed.records.review.evidenceReasons },
            stateBeforeJson: { state: parsed.records.review.beforeState },
            stateAfterJson: { state: parsed.records.review.afterState },
            paramsVersion: parsed.records.review.paramsVersion,
            reviewedAt: new Date(parsed.records.review.reviewedAt),
            createdAt: new Date(parsed.records.review.createdAt),
          });
          await transaction.insert(masteryEvidence).values(
            parsed.records.evidence.map((record) => ({
              id: record.id,
              schoolId: parsed.schoolId,
              reviewId: parsed.records.review.id,
              studentId: parsed.studentId,
              objectiveId: record.objectiveId,
              variantKey: record.variantKey,
              sourceId: record.sourceId,
              evidenceOrdinal: record.evidenceOrdinal,
              evidenceType: record.evidenceType,
              retentionStrength: record.correctedStrength,
              practiceCoverage: record.practiceCoverage,
              evidenceConfidence: record.confidence,
              attemptCount: record.attemptCount,
              provenanceJson: {
                provenance: record.provenance,
                supportMetadata: record.supportMetadata,
              },
              observedAt: new Date(record.createdAt),
              createdAt: new Date(record.createdAt),
            })),
          );

          const stateValues = {
            id: parsed.records.state.id,
            schoolId: parsed.schoolId,
            studentId: parsed.studentId,
            objectiveId: parsed.records.state.objectiveId,
            masteryState: parsed.records.state.masteryState,
            masteryLevel: parsed.records.state.mastery,
            liveRetention: parsed.records.state.retention,
            evidenceConfidence: parsed.records.state.evidenceConfidence,
            graphRelease: parsed.records.state.graphRelease,
            revision: parsed.records.state.revision,
            createdAt: new Date(parsed.records.state.createdAt),
            updatedAt: new Date(parsed.records.state.updatedAt),
          };
          if (currentState) {
            const updated = await transaction
              .update(masteryStates)
              .set(stateValues)
              .where(
                and(
                  eq(masteryStates.schoolId, parsed.schoolId),
                  eq(masteryStates.id, parsed.records.state.id),
                  eq(masteryStates.revision, parsed.expectedRevisions.state!),
                ),
              )
              .returning({ id: masteryStates.id });
            if (updated.length !== 1) {
              throw new MasteryPersistenceError(
                "REVISION_CONFLICT",
                "The mastery state revision changed concurrently.",
              );
            }
          } else {
            await transaction.insert(masteryStates).values(stateValues);
          }

          await transaction.insert(masteryPlacements).values({
            id: parsed.records.placement.id,
            schoolId: parsed.schoolId,
            studentId: parsed.studentId,
            objectiveId: parsed.records.placement.objectiveId,
            masteryEstimate: parsed.records.placement.estimate,
            confidence: parsed.records.placement.confidence,
            evidenceType: parsed.records.placement.evidenceType,
            graphRelease: parsed.records.placement.graphRelease,
            sourceId: parsed.audit.sourceId,
            seedProvenanceJson: parsed.records.placement.seedProvenance,
            replacedByDirectAt: parsed.records.placement.replacedByDirectEvidence
              ? new Date(parsed.records.placement.createdAt)
              : null,
            placedAt: new Date(parsed.records.placement.createdAt),
            createdAt: new Date(parsed.records.placement.createdAt),
            updatedAt: new Date(parsed.records.placement.createdAt),
          });
          const recordIds = {
            card: parsed.records.card.id,
            review: parsed.records.review.id,
            evidence: parsed.records.evidence.map((record) => record.id),
            state: parsed.records.state.id,
            placement: parsed.records.placement.id,
          };
          const commitId = uuidFromDigest(requestDigest);
          const resultDigest = digest({
            commitId,
            recordIds,
            cardRevision: parsed.records.card.revision,
            stateRevision: parsed.records.state.revision,
          });
          const result = parseOrThrow(commitMasteryEvidenceResultSchema, {
            status: "applied",
            commitId,
            resultDigest,
            cardRevision: parsed.records.card.revision,
            stateRevision: parsed.records.state.revision,
            recordIds,
          });
          const commit = parseOrThrow(masteryCommitRecordSchema, {
            id: result.commitId,
            schoolId: parsed.schoolId,
            studentId: parsed.studentId,
            idempotencyKey: parsed.idempotencyKey,
            contractVersion: parsed.contractVersion,
            requestDigest,
            resultDigest: result.resultDigest,
            status: "applied",
            cardRevision: result.cardRevision,
            stateRevision: result.stateRevision,
            recordIds,
            provenance: parsed.provenance,
            audit: parsed.audit,
            createdAt: parsed.records.review.createdAt,
          });
          await transaction.insert(masteryCommits).values({
            id: commit.id,
            schoolId: commit.schoolId,
            studentId: commit.studentId,
            idempotencyKey: commit.idempotencyKey,
            requestId: commit.audit.requestId,
            actorId: commit.audit.actorId,
            sourceType: commit.provenance.normativeSpecVersion,
            sourceId: commit.audit.sourceId,
            contractVersion: commit.contractVersion,
            graphRelease: commit.provenance.graphRelease,
            paramsVersion: commit.provenance.paramsVersion,
            status: commit.status,
            resultDigest: commit.resultDigest,
            resultJson: commit,
            createdAt: new Date(commit.createdAt),
            updatedAt: new Date(commit.createdAt),
          });
          return result;
        },
        { isolationLevel: "serializable" },
      );
    } catch (error) {
      if (isUniqueViolation(error) || providerCode(error) === "40001") {
        try {
          const replay = await this.findReplay(
            parsed.schoolId,
            parsed.idempotencyKey,
            requestDigest,
          );
          if (replay) return replay;
        } catch (replayError) {
          if (replayError instanceof MasteryPersistenceError) throw replayError;
        }
      }
      return portableFailure(error);
    }
  }

  async approveMasteryCalibration(
    input: ApproveMasteryCalibrationInput,
  ): Promise<ApproveMasteryCalibrationResult> {
    const parsed = parseOrThrow(masteryCalibrationApprovalInputSchema, input);
    this.assertSchool(parsed.schoolId);
    this.assertActor(parsed.audit.actorId);
    const requestDigest = digest(parsed);
    try {
      const tenantDb = await this.scopedDb();
      const { masteryCalibrations } = await loadDbModule();
      return await tenantDb.transaction(
        async (transaction) => {
          const [existing] = await transaction
            .select()
            .from(masteryCalibrations)
            .where(
              and(
                eq(masteryCalibrations.schoolId, parsed.schoolId),
                eq(masteryCalibrations.domain, parsed.domain),
                eq(masteryCalibrations.ageBand, parsed.ageBand),
                eq(
                  masteryCalibrations.paramsVersion,
                  parsed.artifact.paramsVersion,
                ),
              ),
            )
            .limit(1);
          if (existing) {
            const storedDigest = existing.fsrsParametersJson.requestDigest;
            if (storedDigest !== requestDigest) {
              throw new MasteryPersistenceError(
                "IDEMPOTENCY_CONFLICT",
                "The calibration release is already bound to different evidence.",
              );
            }
            return parseOrThrow(approveMasteryCalibrationResultSchema, {
              calibrationId: existing.id,
              status: "approved",
            });
          }

          const record = parseOrThrow(masteryCalibrationRecordSchema, {
            id: parsed.artifact.id,
            schoolId: parsed.schoolId,
            idempotencyKey: parsed.idempotencyKey,
            domain: parsed.domain,
            ageBand: parsed.ageBand,
            artifact: parsed.artifact,
            approval: parsed.approval,
            audit: parsed.audit,
            createdAt: parsed.approval.approvedAt,
          });
          await transaction.insert(masteryCalibrations).values({
            id: record.id,
            schoolId: record.schoolId,
            domain: record.domain,
            ageBand: record.ageBand,
            paramsVersion: record.artifact.paramsVersion,
            optimizerVersion: record.artifact.optimizerVersion,
            incumbentParamsVersion: record.artifact.incumbentParamsVersion,
            fsrsParametersJson: { record, requestDigest },
            reviewCount: record.artifact.reviewCount,
            studentCount: record.artifact.studentCount,
            volumeGatePassed: record.artifact.volumeGatePassed,
            improvesIncumbent: record.artifact.evaluationGatePassed,
            humanReleaseApproved: true,
            releaseEligible: true,
            createdAt: new Date(record.createdAt),
            updatedAt: new Date(record.createdAt),
          });
          return parseOrThrow(approveMasteryCalibrationResultSchema, {
            calibrationId: record.id,
            status: "approved",
          });
        },
        { isolationLevel: "serializable" },
      );
    } catch (error) {
      return portableFailure(error);
    }
  }
}

/**
 * Creates a school-scoped, provider-neutral mastery persistence adapter over Drizzle.
 * @param options Database, authenticated tenant, and authenticated actor binding.
 * @returns A mastery persistence port backed by atomic PostgreSQL transactions.
 */
export function createDrizzleMasteryPersistence(
  options: DrizzleMasteryPersistenceOptions,
): MasteryPersistencePort {
  return new DrizzleMasteryPersistence(options);
}

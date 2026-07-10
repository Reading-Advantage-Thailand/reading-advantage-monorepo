import type { z } from "zod";
import {
  commitMasteryEvidenceInputSchema,
  commitMasteryEvidenceResultSchema,
  masteryCommitRecordSchema,
  masterySnapshotInputSchema,
  masterySnapshotSchema,
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

interface StoreState {
  cards: Map<string, MasteryCardRecord>;
  reviews: Map<string, MasteryReviewRecord>;
  evidence: Map<string, MasteryEvidenceRecord>;
  states: Map<string, MasteryStateRecord>;
  placements: Map<string, MasteryPlacementRecord>;
  calibrations: Map<string, MasteryCalibrationRecord>;
  commits: Map<string, MasteryCommitRecord>;
  receipts: Map<
    string,
    {
      requestDigest: string;
      result: CommitMasteryEvidenceResult;
    }
  >;
}

function emptyState(): StoreState {
  return {
    cards: new Map(),
    reviews: new Map(),
    evidence: new Map(),
    states: new Map(),
    placements: new Map(),
    calibrations: new Map(),
    commits: new Map(),
    receipts: new Map(),
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
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

function receiptKey(schoolId: string, idempotencyKey: string): string {
  return `${schoolId}\u0000${idempotencyKey}`;
}

function orderedSchoolRows<T extends { id: string; schoolId: string }>(
  rows: Iterable<T>,
  schoolId: string,
): T[] {
  return [...rows]
    .filter((row) => row.schoolId === schoolId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(clone);
}

function assertSchoolOwnership(input: CommitMasteryEvidenceInput): void {
  const records = [
    input.records.card,
    input.records.review,
    ...input.records.evidence,
    input.records.state,
    input.records.placement,
    input.records.calibration,
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

function assertAppendOnly(
  state: StoreState,
  input: CommitMasteryEvidenceInput,
): void {
  const collisions = [
    state.reviews.has(input.records.review.id),
    input.records.evidence.some((record) => state.evidence.has(record.id)),
    state.placements.has(input.records.placement.id),
    state.calibrations.has(input.records.calibration.id),
  ];
  if (collisions.some(Boolean)) {
    throw new MasteryPersistenceError(
      "APPEND_ONLY_CONFLICT",
      "An immutable mastery record ID already exists.",
    );
  }
}

function assertRevision(
  current: { revision: number } | undefined,
  expected: number | null,
  next: number,
  label: string,
): void {
  const currentRevision = current?.revision ?? null;
  const validNext = current ? current.revision + 1 : 0;
  if (currentRevision !== expected || next !== validNext) {
    throw new MasteryPersistenceError(
      "REVISION_CONFLICT",
      `${label} revision does not match the current persisted revision.`,
    );
  }
}

function copyState(state: StoreState): StoreState {
  return {
    cards: new Map(state.cards),
    reviews: new Map(state.reviews),
    evidence: new Map(state.evidence),
    states: new Map(state.states),
    placements: new Map(state.placements),
    calibrations: new Map(state.calibrations),
    commits: new Map(state.commits),
    receipts: new Map(state.receipts),
  };
}

class InMemoryMasteryPersistence implements MasteryPersistencePort {
  private state = emptyState();

  async readSnapshot(input: MasterySnapshotInput): Promise<MasterySnapshot> {
    const parsed = parseOrThrow(masterySnapshotInputSchema, input);
    return parseOrThrow(masterySnapshotSchema, {
      cards: orderedSchoolRows(this.state.cards.values(), parsed.schoolId),
      reviews: orderedSchoolRows(this.state.reviews.values(), parsed.schoolId),
      evidence: orderedSchoolRows(this.state.evidence.values(), parsed.schoolId),
      states: orderedSchoolRows(this.state.states.values(), parsed.schoolId),
      placements: orderedSchoolRows(
        this.state.placements.values(),
        parsed.schoolId,
      ),
      calibrations: orderedSchoolRows(
        this.state.calibrations.values(),
        parsed.schoolId,
      ),
      commits: orderedSchoolRows(this.state.commits.values(), parsed.schoolId),
    });
  }

  async commitMasteryEvidence(
    input: CommitMasteryEvidenceInput,
  ): Promise<CommitMasteryEvidenceResult> {
    const parsed = parseOrThrow(commitMasteryEvidenceInputSchema, input);
    assertSchoolOwnership(parsed);

    const key = receiptKey(parsed.schoolId, parsed.idempotencyKey);
    const existingReceipt = this.state.receipts.get(key);
    if (existingReceipt) {
      if (existingReceipt.requestDigest !== parsed.requestDigest) {
        throw new MasteryPersistenceError(
          "IDEMPOTENCY_CONFLICT",
          "The idempotency key is already bound to a different request.",
        );
      }
      return parseOrThrow(commitMasteryEvidenceResultSchema, {
        ...clone(existingReceipt.result),
        status: "replayed",
      });
    }

    assertAppendOnly(this.state, parsed);
    assertRevision(
      this.state.cards.get(parsed.records.card.id),
      parsed.expectedRevisions.card,
      parsed.records.card.revision,
      "Card",
    );
    assertRevision(
      this.state.states.get(parsed.records.state.id),
      parsed.expectedRevisions.state,
      parsed.records.state.revision,
      "State",
    );

    const recordIds = {
      card: parsed.records.card.id,
      review: parsed.records.review.id,
      evidence: parsed.records.evidence.map((record) => record.id),
      state: parsed.records.state.id,
      placement: parsed.records.placement.id,
      calibration: parsed.records.calibration.id,
    };
    const result = parseOrThrow(commitMasteryEvidenceResultSchema, {
      status: "applied",
      commitId: `commit:${parsed.idempotencyKey}`,
      resultDigest: parsed.requestDigest,
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
      requestDigest: parsed.requestDigest,
      resultDigest: result.resultDigest,
      status: "applied",
      cardRevision: result.cardRevision,
      stateRevision: result.stateRevision,
      recordIds,
      provenance: parsed.provenance,
      audit: parsed.audit,
      createdAt: parsed.records.review.createdAt,
    });

    const next = copyState(this.state);
    next.cards.set(parsed.records.card.id, clone(parsed.records.card));
    next.reviews.set(parsed.records.review.id, clone(parsed.records.review));
    for (const evidence of parsed.records.evidence) {
      next.evidence.set(evidence.id, clone(evidence));
    }
    next.states.set(parsed.records.state.id, clone(parsed.records.state));
    next.placements.set(
      parsed.records.placement.id,
      clone(parsed.records.placement),
    );
    next.calibrations.set(
      parsed.records.calibration.id,
      clone(parsed.records.calibration),
    );
    next.commits.set(commit.id, clone(commit));
    next.receipts.set(key, {
      requestDigest: parsed.requestDigest,
      result: clone(result),
    });
    this.state = next;

    return clone(result);
  }
}

/**
 * Creates a fresh provider-neutral in-memory mastery persistence adapter.
 * @returns An empty adapter implementing the shared persistence port.
 */
export function createInMemoryMasteryPersistence(): MasteryPersistencePort {
  return new InMemoryMasteryPersistence();
}

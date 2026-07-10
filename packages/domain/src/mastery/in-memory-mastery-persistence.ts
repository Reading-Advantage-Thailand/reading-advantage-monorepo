import { createHash } from "node:crypto";
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

interface StoreState {
  cards: Map<string, MasteryCardRecord>;
  reviews: Map<string, MasteryReviewRecord>;
  evidence: Map<string, MasteryEvidenceRecord>;
  states: Map<string, MasteryStateRecord>;
  placements: Map<string, MasteryPlacementRecord>;
  calibrations: Map<string, MasteryCalibrationRecord>;
  commits: Map<string, MasteryCommitRecord>;
  receipts: Map<string, { requestDigest: string; result: CommitMasteryEvidenceResult }>;
  calibrationReceipts: Map<string, { requestDigest: string; result: ApproveMasteryCalibrationResult }>;
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
    calibrationReceipts: new Map(),
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
  const payload = JSON.stringify(canonicalize(value));
  return `sha256:${createHash("sha256").update(payload).digest("hex")}`;
}

function uuidFromDigest(value: string): string {
  const hex = value.replace(/^sha256:/, "").padEnd(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(
    17,
    20,
  )}-${hex.slice(20, 32)}`;
}

function withoutCallerAssertions(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const command = clone(input as Record<string, unknown>);
  delete command.requestDigest;
  if (command.records && typeof command.records === "object") {
    delete (command.records as Record<string, unknown>).calibration;
  }
  return command;
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

function assertAppendOnly(state: StoreState, input: CommitMasteryEvidenceInput): void {
  const collisions = [
    state.reviews.has(input.records.review.id),
    input.records.evidence.some((record) => state.evidence.has(record.id)),
    state.placements.has(input.records.placement.id),
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
    calibrationReceipts: new Map(state.calibrationReceipts),
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
      placements: orderedSchoolRows(this.state.placements.values(), parsed.schoolId),
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
    const parsed = parseOrThrow(
      commitMasteryEvidenceInputSchema,
      withoutCallerAssertions(input),
    );
    const requestDigest = digest(parsed);
    const key = receiptKey(parsed.schoolId, parsed.idempotencyKey);
    const existingReceipt = this.state.receipts.get(key);
    if (existingReceipt) {
      if (existingReceipt.requestDigest !== requestDigest) {
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
      resultDigest,
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
    next.placements.set(parsed.records.placement.id, clone(parsed.records.placement));
    next.commits.set(commit.id, clone(commit));
    next.receipts.set(key, { requestDigest, result: clone(result) });
    this.state = next;
    return clone(result);
  }

  async approveMasteryCalibration(
    input: ApproveMasteryCalibrationInput,
  ): Promise<ApproveMasteryCalibrationResult> {
    const parsed = parseOrThrow(masteryCalibrationApprovalInputSchema, input);
    const key = receiptKey(parsed.schoolId, parsed.idempotencyKey);
    const requestDigest = digest(parsed);
    const existing = this.state.calibrationReceipts.get(key);
    if (existing) {
      if (existing.requestDigest !== requestDigest) {
        throw new MasteryPersistenceError(
          "IDEMPOTENCY_CONFLICT",
          "The calibration idempotency key is already bound to another request.",
        );
      }
      return clone(existing.result);
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
    if (this.state.calibrations.has(record.id)) {
      throw new MasteryPersistenceError(
        "APPEND_ONLY_CONFLICT",
        "An immutable calibration record ID already exists.",
      );
    }
    const result = parseOrThrow(approveMasteryCalibrationResultSchema, {
      calibrationId: record.id,
      status: "approved",
    });
    const next = copyState(this.state);
    next.calibrations.set(record.id, clone(record));
    next.calibrationReceipts.set(key, { requestDigest, result: clone(result) });
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

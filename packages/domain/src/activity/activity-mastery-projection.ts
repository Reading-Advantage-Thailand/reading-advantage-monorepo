import { createHash } from "node:crypto";
import type { ActivityPracticeSubmissionEnvelope } from "@reading-advantage/activity-runtime";
import { processReview, type SrsCardState } from "@reading-advantage/srs-engine";
import { commitMasteryEvidence } from "../mastery/commit-evidence.js";
import {
  MASTERY_PERSISTENCE_CONTRACT_VERSION,
  type CommitMasteryEvidenceInput,
  type CommitMasteryEvidenceResult,
  type MasterySnapshot,
} from "../mastery/persistence-contracts.js";
import type { MasteryPersistencePort } from "../mastery/persistence-ports.js";

function uuidFor(value: string): string {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function ratingFor(value: "Again" | "Hard" | "Good" | "Easy"): "again" | "hard" | "good" | "easy" {
  return value.toLowerCase() as "again" | "hard" | "good" | "easy";
}

function cardState(snapshot: MasterySnapshot, schoolId: string, studentId: string, submission: ActivityPracticeSubmissionEnvelope, now: string): { card: SrsCardState; revision: number | null; createdAt: string } {
  const prior = snapshot.cards.find((candidate) => candidate.studentId === studentId && candidate.objectiveId === submission.analytics.objectiveId && candidate.variantKey === submission.analytics.variantKey);
  if (!prior) return {
    card: { cardId: uuidFor(`${schoolId}:${studentId}:${submission.analytics.objectiveId}:${submission.analytics.variantKey}:card`), studentId, objectiveId: submission.analytics.objectiveId, variantKey: submission.analytics.variantKey, stability: 0, difficulty: 0, state: "new", dueDate: now, elapsedDays: 0, scheduledDays: 0, reps: 0, lapses: 0, lastReview: null, createdAt: now, updatedAt: now },
    revision: null, createdAt: now,
  };
  return {
    card: { cardId: prior.id, studentId, objectiveId: prior.objectiveId, variantKey: prior.variantKey, stability: prior.stability, difficulty: prior.difficulty, state: prior.state, dueDate: prior.dueAt, elapsedDays: 0, scheduledDays: 0, reps: prior.reps, lapses: prior.lapses, lastReview: prior.lastReviewedAt, createdAt: prior.createdAt, updatedAt: prior.updatedAt },
    revision: prior.revision, createdAt: prior.createdAt,
  };
}

/**
 * Builds the canonical mastery command for one verified activity submission.
 * @param schoolId Authenticated school tenant identifier.
 * @param studentId Authenticated learner identifier.
 * @param submission Server-verified practice.v1 activity evidence.
 * @param snapshot Current school-scoped mastery snapshot.
 * @param now Server-owned projection timestamp.
 * @returns Idempotent mastery persistence command with SRS and evidence records.
 */
export function buildActivityMasteryCommand(schoolId: string, studentId: string, submission: ActivityPracticeSubmissionEnvelope, snapshot: MasterySnapshot, now: string): CommitMasteryEvidenceInput {
  const sourceId = submission.analytics.submissionId;
  const current = cardState(snapshot, schoolId, studentId, submission, now);
  const review = processReview({ card: current.card, submission: submission as unknown as Parameters<typeof processReview>[0]["submission"], now });
  const priorState = snapshot.states.find((candidate) => candidate.studentId === studentId && candidate.objectiveId === submission.analytics.objectiveId);
  const earned = submission.parts.reduce((sum, part) => sum + (part.score ?? (part.isCorrect ? 1 : 0)), 0);
  const possible = submission.parts.reduce((sum, part) => sum + (part.maxScore ?? 1), 0);
  const strength = possible > 0 ? Math.max(0, Math.min(1, earned / possible)) : 0;
  const priorWeight = priorState ? priorState.revision + 1 : 0;
  const mastery = priorState ? ((priorState.mastery * priorWeight) + strength) / (priorWeight + 1) : strength;
  const stateRevision = priorState?.revision ?? null;
  const provenance = {
    normativeSpecVersion: "kst-srs.v3.2", engineContractVersion: "srs.contract.v2",
    graphRelease: submission.analytics.graphVersion, configVersion: "activity-mastery.v1",
    paramsVersion: "fsrs-default.v1", adapterVersion: MASTERY_PERSISTENCE_CONTRACT_VERSION,
  } as const;
  const cardRevision = current.revision === null ? 0 : current.revision + 1;
  const nextStateRevision = stateRevision === null ? 0 : stateRevision + 1;
  const stateId = priorState?.id ?? uuidFor(`${schoolId}:${studentId}:${submission.analytics.objectiveId}:state`);
  const placementConfidence = submission.analytics.evidenceConfidence >= 0.8 ? "high" : submission.analytics.evidenceConfidence >= 0.5 ? "medium" : "low";
  const supportReasons = review.reviewLog.evidence && "reasons" in review.reviewLog.evidence ? review.reviewLog.evidence.reasons : [];
  return {
    contractVersion: MASTERY_PERSISTENCE_CONTRACT_VERSION, schoolId, studentId,
    idempotencyKey: `activity:${sourceId}`,
    expectedRevisions: { card: current.revision, state: stateRevision }, provenance,
    audit: { actorId: studentId, requestId: `activity:${sourceId}`, sourceId, correlationId: `activity:${submission.activityId}:${sourceId}` },
    records: {
      card: { id: review.updatedCard.cardId, schoolId, studentId, objectiveId: review.updatedCard.objectiveId, variantKey: review.updatedCard.variantKey, state: review.updatedCard.state, stability: review.updatedCard.stability, difficulty: review.updatedCard.difficulty, dueAt: review.updatedCard.dueDate, lastReviewedAt: review.updatedCard.lastReview, reps: review.updatedCard.reps, lapses: review.updatedCard.lapses, revision: cardRevision, paramsVersion: provenance.paramsVersion, createdAt: current.createdAt, updatedAt: now },
      review: { id: uuidFor(`${sourceId}:review`), schoolId, cardId: review.updatedCard.cardId, studentId, submissionId: sourceId, rating: ratingFor(review.rating), beforeState: review.reviewLog.stateBefore.state, afterState: review.reviewLog.stateAfter.state, evidenceReasons: supportReasons, paramsVersion: provenance.paramsVersion, reviewedAt: now, createdAt: now },
      evidence: [{ id: uuidFor(`${sourceId}:evidence:0`), schoolId, studentId, objectiveId: submission.analytics.objectiveId, variantKey: submission.analytics.variantKey, sourceId, evidenceOrdinal: 0, evidenceType: `activity_${submission.mode}`, correctedStrength: strength, practiceCoverage: Math.min(1, possible), confidence: submission.analytics.evidenceConfidence, attemptCount: submission.analytics.attemptNumber, supportMetadata: { revealSteps: submission.analytics.revealsUsed, misconceptionTags: [] }, provenance, createdAt: now }],
      state: { id: stateId, schoolId, studentId, objectiveId: submission.analytics.objectiveId, masteryState: mastery >= 0.9 ? "mastered" : mastery >= 0.75 ? "proficient" : "practicing", mastery, retention: strength, evidenceConfidence: submission.analytics.evidenceConfidence, graphRelease: submission.analytics.graphVersion, revision: nextStateRevision, createdAt: priorState?.createdAt ?? now, updatedAt: now },
      placement: { id: uuidFor(`${sourceId}:placement`), schoolId, studentId, objectiveId: submission.analytics.objectiveId, estimate: mastery, confidence: placementConfidence, evidenceType: `activity_direct:${sourceId}`, graphRelease: submission.analytics.graphVersion, seedProvenance: provenance, replacedByDirectEvidence: true, createdAt: now },
    },
  };
}

/**
 * Projects one verified activity submission through the canonical Mastery service.
 * @param schoolId Authenticated school tenant identifier.
 * @param studentId Authenticated learner identifier.
 * @param submission Server-verified practice.v1 activity evidence.
 * @param persistence School- and actor-scoped mastery persistence adapter.
 * @param now Server-owned projection timestamp.
 * @returns Stable applied or replayed mastery commit receipt.
 */
export async function projectActivitySubmissionToMastery(schoolId: string, studentId: string, submission: ActivityPracticeSubmissionEnvelope, persistence: MasteryPersistencePort, now: string): Promise<CommitMasteryEvidenceResult> {
  const snapshot = await persistence.readSnapshot({ schoolId });
  const idempotencyKey = `activity:${submission.analytics.submissionId}`;
  const existing = snapshot.commits.find((candidate) => candidate.studentId === studentId && candidate.idempotencyKey === idempotencyKey);
  if (existing) {
    const evidence = snapshot.evidence.find((candidate) => candidate.id === existing.recordIds.evidence[0]);
    const earned = submission.parts.reduce((sum, part) => sum + (part.score ?? (part.isCorrect ? 1 : 0)), 0);
    const possible = submission.parts.reduce((sum, part) => sum + (part.maxScore ?? 1), 0);
    const strength = possible > 0 ? Math.max(0, Math.min(1, earned / possible)) : 0;
    if (!evidence || evidence.sourceId !== submission.analytics.submissionId || evidence.objectiveId !== submission.analytics.objectiveId || evidence.variantKey !== submission.analytics.variantKey || evidence.correctedStrength !== strength || evidence.practiceCoverage !== Math.min(1, possible) || evidence.confidence !== submission.analytics.evidenceConfidence) {
      throw new Error(`Activity mastery idempotency conflict: ${submission.analytics.submissionId}`);
    }
    return { status: "replayed", commitId: existing.id, resultDigest: existing.resultDigest, cardRevision: existing.cardRevision, stateRevision: existing.stateRevision, recordIds: existing.recordIds };
  }
  return commitMasteryEvidence(buildActivityMasteryCommand(schoolId, studentId, submission, snapshot, now), { persistence });
}

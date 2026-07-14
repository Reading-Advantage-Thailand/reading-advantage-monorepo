import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  codecampPrReviewAttempts,
  codecampPrReviewObjectiveEvidence,
  codecampPrReviews,
  codecampExerciseRepos,
  codecampModules,
} from "@reading-advantage/db/schema";
import { codecampAPKUnit, curriculumBindings } from "@reading-advantage/codecamp-knowledge";
import { activitySchema } from "@reading-advantage/activity-runtime";
import { assessCheckpointAttempt } from "@reading-advantage/activity-runtime/server";
import type { TenantDB } from "../db-contract.js";
import type { ReviewGenerationProvenance, ReviewResult } from "./review-exercise.js";
import { projectActivitySubmissionToMastery } from "../activity/activity-mastery-projection.js";
import type { MasteryPersistencePort } from "../mastery/persistence-ports.js";

/** Immutable schema version for the PR review response stored in evidence attempts. */
export const PR_REVIEW_RESPONSE_SCHEMA_VERSION = "codecamp.pr-review-response.v1";
/** Prompt policy version for the advisory Codecamp PR-review prompt. */
export const PR_REVIEW_PROMPT_VERSION = "codecamp.pr-review-prompt.v1";

/** One advisory objective row derived from a semantically validated PR review. */
export interface AdvisoryObjectiveEvidence {
  objectiveId: string;
  variantKey: string;
  score: number;
  confidence: number;
  rubricDimensions: Record<string, unknown>;
  misconceptionTags: string[];
  evidenceReferences: Record<string, unknown>;
  supportHistory: Record<string, unknown>;
}

/** Input required to persist an immutable advisory PR-review attempt. */
export interface RecordAdvisoryPrReviewAttemptInput {
  reviewId: string;
  headSha: string;
  idempotencyKey: string;
  provenance: ReviewGenerationProvenance | null;
  review: ReviewResult;
  trustedContext: Record<string, unknown>;
}

/** Result of an idempotent advisory-attempt write. */
export interface RecordPrReviewAttemptResult {
  attemptId: string | null;
  created: boolean;
}

/** One objective-level summary from an earlier immutable PR review attempt. */
export interface PriorPrReviewObjectiveSummary {
  objectiveId: string;
  variantKey: string;
  score: number;
  confidence: number;
  evidenceState: "advisory" | "validated" | "rejected";
}

/** A bounded, safe revision summary that may inform a later review prompt. */
export interface PriorPrReviewAttemptSummary {
  headSha: string;
  attemptStatus: "advisory" | "validated" | "failed";
  evidenceAuthority: "advisory_model" | "trusted_deterministic";
  objectives: PriorPrReviewObjectiveSummary[];
}

/** A reviewed, assessed repository objective that can receive PR evidence. */
export interface GraphBoundPrObjective {
  activityId: string;
  objectiveId: string;
  variantKey: string;
  variantFamily: string;
  evidenceWeight: number;
  rubricRefs: string[];
  misconceptionTags: string[];
  graphVersion: string;
}

/** Evaluator-attested deterministic result required before a PR can enter mastery. */
export interface VerifiedPrObjectiveResult {
  objectiveId: string;
  score: number;
  confidence: number;
  passed: boolean;
  evidenceReferences: Record<string, unknown>;
  supportHistory: Record<string, unknown>;
}

/** Input for projecting one evaluator-attested repository objective through the canonical mastery service. */
export interface ProjectVerifiedPrObjectiveInput extends VerifiedPrObjectiveResult {
  submissionId: string;
  attemptNumber: number;
  submittedAt: string;
  headSha: string;
}

/** Input required to retain an immutable evaluator-attested PR revision before mastery projection. */
export interface RecordTrustedPrReviewAttemptInput {
  reviewId: string;
  headSha: string;
  idempotencyKey: string;
  moduleSlug: string;
  trustedContext: Record<string, unknown>;
  evaluatorEvidence: Record<string, unknown>;
  objectives: VerifiedPrObjectiveResult[];
}

/**
 * Resolves the only graph-authorized objectives for a module's pull-request repository.
 * @param moduleSlug Published Codecamp module that owns the exercise repository.
 * @returns Assessed independent-practice objectives, or an empty list when no reviewed PR binding exists.
 */
export function resolveGraphBoundPrObjectives(moduleSlug: string): GraphBoundPrObjective[] {
  if (moduleSlug === "apk-game-creation") {
    return [{
      activityId: codecampAPKUnit.youdo.activityId,
      objectiveId: codecampAPKUnit.youdo.objectiveId,
      variantKey: codecampAPKUnit.youdo.variantKey,
      variantFamily: "apk.apk-contract.independent-construction",
      evidenceWeight: 0.5,
      rubricRefs: [codecampAPKUnit.youdo.rubric.rubricId],
      misconceptionTags: ["apk-contract"],
      graphVersion: codecampAPKUnit.graphVersion,
    }];
  }
  return curriculumBindings.bindings
    .filter((binding) => binding.source.moduleSlug === moduleSlug
      && binding.activityKind === "repository"
      && binding.evidenceMode === "assessed"
      && binding.evidenceSource === "pull-request"
      && binding.practiceMode === "independent"
      && binding.variantId !== null
      && binding.variantFamily !== null)
    .flatMap((binding) => binding.objectiveIds.map((objectiveId) => ({
      activityId: binding.activityId,
      objectiveId,
      variantKey: binding.variantId!,
      variantFamily: binding.variantFamily!,
      evidenceWeight: binding.evidenceWeight,
      rubricRefs: [...binding.rubricRefs],
      misconceptionTags: [...binding.misconceptionTags],
      graphVersion: curriculumBindings.graphVersion,
    })));
}

/**
 * Lists bounded, tenant-scoped summaries of earlier immutable PR review attempts.
 * @param args Database, authorized worker, tenant, and reviewed revision identity.
 * @returns Earlier attempt statuses and objective scores without prompts, comments, or hidden context.
 * @throws When the caller lacks review authority or supplies malformed identifiers.
 */
export async function listPriorPrReviewAttempts(args: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { reviewId: string; excludeHeadSha: string | null };
}): Promise<PriorPrReviewAttemptSummary[]> {
  assertCan(args.user, "admin:dashboard", args.tenant);
  if (!/^[0-9a-f-]{36}$/i.test(args.input.reviewId)) throw new Error("PR review history requires a valid review ID");
  if (args.input.excludeHeadSha !== null && !/^[0-9a-f]{40}$/i.test(args.input.excludeHeadSha)) throw new Error("PR review history requires a valid excluded head SHA");
  const rawDb = args.db.unscoped("PR review history is tenant-scoped through immutable attempt tenant keys");
  const predicates = [
    eq(codecampPrReviewAttempts.reviewId, args.input.reviewId),
    eq(codecampPrReviewAttempts.tenantKey, args.tenant.schoolId ?? "codecamp"),
  ];
  if (args.input.excludeHeadSha !== null) predicates.push(ne(codecampPrReviewAttempts.headSha, args.input.excludeHeadSha));
  const attempts = await rawDb.select({
    id: codecampPrReviewAttempts.id,
    headSha: codecampPrReviewAttempts.headSha,
    attemptStatus: codecampPrReviewAttempts.attemptStatus,
    evidenceAuthority: codecampPrReviewAttempts.evidenceAuthority,
  }).from(codecampPrReviewAttempts).where(and(...predicates)).orderBy(desc(codecampPrReviewAttempts.createdAt)).limit(5);
  const attemptIds = attempts.map(({ id }) => id);
  const objectives = attemptIds.length === 0
    ? []
    : await rawDb.select({
      attemptId: codecampPrReviewObjectiveEvidence.attemptId,
      objectiveId: codecampPrReviewObjectiveEvidence.objectiveId,
      variantKey: codecampPrReviewObjectiveEvidence.variantKey,
      score: codecampPrReviewObjectiveEvidence.score,
      confidence: codecampPrReviewObjectiveEvidence.confidence,
      evidenceState: codecampPrReviewObjectiveEvidence.evidenceState,
    }).from(codecampPrReviewObjectiveEvidence).where(inArray(codecampPrReviewObjectiveEvidence.attemptId, attemptIds));
  const attemptStatuses = new Set(["advisory", "validated", "failed"]);
  const evidenceAuthorities = new Set(["advisory_model", "trusted_deterministic"]);
  const evidenceStates = new Set(["advisory", "validated", "rejected"]);
  return attempts.flatMap((attempt) => {
    if (!attemptStatuses.has(attempt.attemptStatus) || !evidenceAuthorities.has(attempt.evidenceAuthority)) return [];
    return [{
      headSha: attempt.headSha,
      attemptStatus: attempt.attemptStatus as PriorPrReviewAttemptSummary["attemptStatus"],
      evidenceAuthority: attempt.evidenceAuthority as PriorPrReviewAttemptSummary["evidenceAuthority"],
      objectives: objectives.flatMap((objective) => objective.attemptId === attempt.id && evidenceStates.has(objective.evidenceState)
        ? [{
          objectiveId: objective.objectiveId,
          variantKey: objective.variantKey,
          score: objective.score,
          confidence: objective.confidence,
          evidenceState: objective.evidenceState as PriorPrReviewObjectiveSummary["evidenceState"],
        }]
        : []),
    }];
  });
}

/**
 * Projects one evaluator-attested PR result through the same activity, SRS, and mastery command path as other verified work.
 * @param schoolId Mastery tenant identifier.
 * @param studentId Learner who owns the reviewed pull request.
 * @param binding Graph-authorized objective and variant binding.
 * @param input Deterministic evaluator result; model-only feedback must never call this function.
 * @param persistence Canonical mastery persistence port.
 * @returns Idempotent applied or replayed mastery receipt.
 * @throws When the binding, evaluator result, or SHA cannot prove an independent passing submission.
 */
export async function projectVerifiedPrObjectiveToMastery(
  schoolId: string,
  studentId: string,
  binding: GraphBoundPrObjective,
  input: ProjectVerifiedPrObjectiveInput,
  persistence: MasteryPersistencePort,
) {
  if (!/^[0-9a-f]{40}$/i.test(input.headSha)) throw new Error("Verified PR evidence requires a GitHub head SHA");
  if (input.objectiveId !== binding.objectiveId) throw new Error("Verified PR evidence objective is not authorized by the repository binding");
  if (!Number.isInteger(input.score) || input.score < 0 || input.score > 100) throw new Error("Verified PR score must be an integer from 0 through 100");
  if (!Number.isInteger(input.confidence) || input.confidence < 0 || input.confidence > 100) throw new Error("Verified PR confidence must be an integer from 0 through 100");
  if (!input.passed || input.score < 80) throw new Error("Only passing deterministic PR evidence may project mastery");
  if (!input.submissionId.trim() || !Number.isInteger(input.attemptNumber) || input.attemptNumber < 1) throw new Error("Verified PR evidence requires a stable submission identity and attempt number");

  const activity = activitySchema.parse({
    schemaVersion: "activity.v1", activityId: binding.activityId, activityVersion: "1.0.0",
    graphVersion: binding.graphVersion, objectiveId: binding.objectiveId, variantKey: binding.variantKey,
    mode: "independent_practice", title: { en: "Verified pull-request evidence" },
    accessibility: { transcriptRequired: true, captionsRequired: true, nonVideoAlternativeResourceId: "diagram.pr-evidence" },
    resources: [
      { kind: "video", resourceId: "video.pr-evidence", provider: "youtube", videoId: "pr-evidence", captionsAvailable: true, transcriptResourceId: "transcript.pr-evidence", segments: [{ segmentId: "verified-pr", label: { en: "Verified PR evidence" }, startSeconds: 0, endSeconds: 1 }] },
      { kind: "transcript", resourceId: "transcript.pr-evidence", language: "en", text: "Evaluator-attested deterministic PR evidence." },
      { kind: "diagram", resourceId: "diagram.pr-evidence", assetId: "codecamp.pr.evidence.v1", alt: { en: "Evaluator-attested deterministic pull-request evidence" } },
    ],
    checkpoints: [{ checkpointId: "verified-pr", stepId: "verified-pr", objectiveId: binding.objectiveId, variantKey: binding.variantKey, trigger: { resourceId: "video.pr-evidence", segmentId: "verified-pr" }, question: { kind: "free_text", prompt: { en: "Verified PR outcome" }, acceptedAnswers: ["approved"] }, feedback: { correct: { en: "Verified independent practice recorded." }, incorrect: { en: "Address evaluator-requested revisions." } }, remediation: [{ kind: "diagram", resourceId: "diagram.pr-evidence" }], evidence: { behavior: "assessed", weight: binding.evidenceWeight }, gate: "answer_before_continue" }],
    tutorialSteps: [],
  });
  const assessed = assessCheckpointAttempt(activity, {
    eventId: `pr:${input.submissionId}:${input.headSha}`, checkpointId: "verified-pr", submissionId: input.submissionId,
    attemptNumber: input.attemptNumber, answer: "approved", submittedAt: input.submittedAt,
    hintsUsed: 0, revealsUsed: 0, interventionLevel: 0, evidenceConfidence: input.confidence / 100, timingMs: 0,
  });
  return projectActivitySubmissionToMastery(schoolId, studentId, assessed.submission, persistence, input.submittedAt);
}

/**
 * Stores evaluator-attested deterministic PR evidence without accepting any model output as authority.
 * @param params Tenant-scoped database, authorized evaluator, and one immutable PR revision.
 * @returns The idempotent attempt receipt used by subsequent mastery projection.
 * @throws When objectives do not exactly match the reviewed repository's graph binding.
 */
export async function recordTrustedPrReviewAttempt({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: RecordTrustedPrReviewAttemptInput;
}): Promise<RecordPrReviewAttemptResult> {
  assertCan(user, "admin:dashboard", tenant);
  if (!/^[0-9a-f]{40}$/i.test(input.headSha)) throw new Error("PR review attempt requires a GitHub head SHA");
  if (!input.idempotencyKey.trim()) throw new Error("PR review attempt requires an idempotency key");
  const authorized = new Map(resolveGraphBoundPrObjectives(input.moduleSlug).map((binding) => [binding.objectiveId, binding]));
  if (authorized.size === 0) throw new Error("No assessed pull-request binding exists for this module");
  if (input.objectives.length !== authorized.size || new Set(input.objectives.map(({ objectiveId }) => objectiveId)).size !== input.objectives.length) throw new Error("Trusted PR evidence must cover every graph-bound objective exactly once");
  for (const objective of input.objectives) {
    if (!authorized.has(objective.objectiveId)) throw new Error("Trusted PR evidence contains an objective outside the repository binding");
    if (!Number.isInteger(objective.score) || objective.score < 0 || objective.score > 100) throw new Error("Verified PR score must be an integer from 0 through 100");
    if (!Number.isInteger(objective.confidence) || objective.confidence < 0 || objective.confidence > 100) throw new Error("Verified PR confidence must be an integer from 0 through 100");
  }
  return db.transaction(async (transactionDb) => {
    const tenantTransaction = transactionDb as unknown as TenantDB;
    const rawDb = tenantTransaction.unscoped("trusted PR attempts are scoped through the review owner and graph-bound repository module");
    const [review] = await rawDb.select({
      id: codecampPrReviews.id,
      userId: codecampPrReviews.userId,
      moduleSlug: codecampModules.slug,
    }).from(codecampPrReviews)
      .innerJoin(codecampExerciseRepos, eq(codecampExerciseRepos.id, codecampPrReviews.exerciseRepoId))
      .innerJoin(codecampModules, eq(codecampModules.id, codecampExerciseRepos.moduleId))
      .where(eq(codecampPrReviews.id, input.reviewId)).limit(1);
    if (!review) throw new Error("Review not found");
    if (review.moduleSlug !== input.moduleSlug) throw new Error("Trusted PR evidence module does not match the reviewed repository");
    const [attempt] = await rawDb.insert(codecampPrReviewAttempts).values({
      reviewId: review.id, tenantKey: tenant.schoolId ?? "codecamp", userId: review.userId,
      headSha: input.headSha, idempotencyKey: input.idempotencyKey,
      attemptStatus: "validated", evidenceAuthority: "trusted_deterministic",
      modelAlias: null, resolvedModel: null, providerRequestId: null, providerResponseId: null,
      promptVersion: "trusted-evaluator.v1", responseSchemaVersion: "trusted-pr-evidence.v1",
      rubricVersion: "graph-bound", graphVersion: curriculumBindings.graphVersion,
      usageJson: null, latencyMs: null, trustedContextJson: input.trustedContext,
      evidenceJson: input.evaluatorEvidence, errorDiagnosticsJson: null,
    }).onConflictDoNothing().returning({ id: codecampPrReviewAttempts.id });
    if (!attempt) return { attemptId: null, created: false };
    await rawDb.insert(codecampPrReviewObjectiveEvidence).values(input.objectives.map((objective) => {
      const binding = authorized.get(objective.objectiveId)!;
      return {
        attemptId: attempt.id, objectiveId: objective.objectiveId, variantKey: binding.variantKey,
        score: objective.score, confidence: objective.confidence,
        rubricDimensionsJson: { rubricRefs: binding.rubricRefs },
        misconceptionTagsJson: binding.misconceptionTags,
        evidenceReferencesJson: objective.evidenceReferences,
        supportHistoryJson: objective.supportHistory,
        evidenceState: "validated",
      };
    })).onConflictDoNothing();
    return { attemptId: attempt.id, created: true };
  });
}

/**
 * Builds the advisory APK objective evidence that is safe to retain but cannot affect mastery.
 * @param review Semantically validated review result returned for the APK exercise.
 * @param references Trusted repository and worker references associated with the review revision.
 * @returns A single graph-bound advisory evidence row, or no rows for a non-APK review.
 */
export function buildAdvisoryAPKObjectiveEvidence(
  review: ReviewResult,
  references: Record<string, unknown>,
): AdvisoryObjectiveEvidence[] {
  if (!review.apkEvaluation) return [];
  const objective = review.objectiveEvidence.find(({ objectiveId }) => objectiveId === codecampAPKUnit.youdo.objectiveId);
  if (!objective) throw new Error("APK advisory evidence requires graph-bound objective output");
  return [{
    objectiveId: codecampAPKUnit.youdo.objectiveId,
    variantKey: codecampAPKUnit.youdo.variantKey,
    score: objective.score,
    confidence: objective.confidence,
    rubricDimensions: { dimensions: review.apkEvaluation.dimensions },
    misconceptionTags: objective.misconceptionTags,
    evidenceReferences: { ...references, references: objective.references },
    supportHistory: { source: "advisory-model", supportEvents: [] },
  }];
}

/**
 * Derives advisory evidence only from the reviewed repository's graph bindings.
 * @param review Semantically validated structured model output.
 * @param moduleSlug Repository-owning Codecamp module slug resolved by the database.
 * @param references Trusted worker/repository references associated with this revision.
 * @returns Immutable advisory rows, never trusted mastery evidence.
 * @throws When objective output is not an exact match for the repository binding.
 */
export function buildAdvisoryPrObjectiveEvidence(
  review: ReviewResult,
  moduleSlug: string,
  references: Record<string, unknown>,
): AdvisoryObjectiveEvidence[] {
  const bindings = new Map(resolveGraphBoundPrObjectives(moduleSlug).map((binding) => [binding.objectiveId, binding]));
  if (bindings.size === 0) {
    if (review.objectiveEvidence.length > 0) throw new Error("Advisory review contains objective evidence for an unbound repository");
    return [];
  }
  if (review.objectiveEvidence.length !== bindings.size || new Set(review.objectiveEvidence.map(({ objectiveId }) => objectiveId)).size !== review.objectiveEvidence.length) {
    throw new Error("Advisory review must cover every graph-bound objective exactly once");
  }
  return review.objectiveEvidence.map((objective) => {
    const binding = bindings.get(objective.objectiveId);
    if (!binding) throw new Error("Advisory review contains an objective outside the repository binding");
    return {
      objectiveId: objective.objectiveId,
      variantKey: binding.variantKey,
      score: objective.score,
      confidence: objective.confidence,
      rubricDimensions: review.apkEvaluation?.rubricId === codecampAPKUnit.youdo.rubric.rubricId
        ? { dimensions: review.apkEvaluation.dimensions }
        : { rubricRefs: binding.rubricRefs },
      misconceptionTags: objective.misconceptionTags,
      evidenceReferences: { ...references, references: objective.references },
      supportHistory: { source: "advisory-model", supportEvents: [] },
    };
  });
}

/**
 * Persists a validated model review as immutable advisory evidence without changing mastery or SRS state.
 * @param params Tenant-scoped database, authorized service user, and validated revision evidence.
 * @returns Whether the revision created a new attempt or was already persisted idempotently.
 * @throws When the caller is unauthorized, the review does not exist, or the evidence violates the advisory contract.
 */
export async function recordAdvisoryPrReviewAttempt({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: RecordAdvisoryPrReviewAttemptInput;
}): Promise<RecordPrReviewAttemptResult> {
  assertCan(user, "admin:dashboard", tenant);
  if (!/^[0-9a-f]{40}$/i.test(input.headSha)) throw new Error("PR review attempt requires a GitHub head SHA");
  if (!input.idempotencyKey.trim()) throw new Error("PR review attempt requires an idempotency key");
  return db.transaction(async (transactionDb) => {
    const tenantTransaction = transactionDb as unknown as TenantDB;
    const rawDb = tenantTransaction.unscoped("PR review attempts are scoped through the owning review user and tenant key");
    const [review] = await rawDb.select({ id: codecampPrReviews.id, userId: codecampPrReviews.userId, moduleSlug: codecampModules.slug })
      .from(codecampPrReviews)
      .innerJoin(codecampExerciseRepos, eq(codecampExerciseRepos.id, codecampPrReviews.exerciseRepoId))
      .innerJoin(codecampModules, eq(codecampModules.id, codecampExerciseRepos.moduleId))
      .where(eq(codecampPrReviews.id, input.reviewId))
      .limit(1);
    if (!review) throw new Error("Review not found");
    const objectives = buildAdvisoryPrObjectiveEvidence(input.review, review.moduleSlug, input.trustedContext);
    const graphVersion = resolveGraphBoundPrObjectives(review.moduleSlug)[0]?.graphVersion ?? "unbound.v1";

    const [attempt] = await rawDb.insert(codecampPrReviewAttempts).values({
      reviewId: review.id,
      tenantKey: tenant.schoolId ?? "codecamp",
      userId: review.userId,
      headSha: input.headSha,
      idempotencyKey: input.idempotencyKey,
      attemptStatus: "advisory",
      evidenceAuthority: "advisory_model",
      modelAlias: input.provenance?.requestedModel ?? null,
      resolvedModel: input.provenance?.resolvedModel ?? null,
      providerRequestId: input.provenance?.requestId ?? null,
      providerResponseId: input.provenance?.responseId ?? null,
      promptVersion: PR_REVIEW_PROMPT_VERSION,
      responseSchemaVersion: PR_REVIEW_RESPONSE_SCHEMA_VERSION,
      rubricVersion: input.review.apkEvaluation?.rubricId ?? "none",
      graphVersion,
      usageJson: input.provenance?.usage ?? null,
      latencyMs: input.provenance?.latencyMs ?? null,
      trustedContextJson: input.trustedContext,
      evidenceJson: {
        summary: input.review.summary,
        comments: input.review.comments,
        apkEvaluation: input.review.apkEvaluation ?? null,
        objectiveEvidence: input.review.objectiveEvidence,
      },
      errorDiagnosticsJson: null,
    }).onConflictDoNothing().returning({ id: codecampPrReviewAttempts.id });
    if (!attempt) return { attemptId: null, created: false };

    if (objectives.length > 0) {
      await rawDb.insert(codecampPrReviewObjectiveEvidence).values(objectives.map((objective) => ({
        attemptId: attempt.id,
        objectiveId: objective.objectiveId,
        variantKey: objective.variantKey,
        score: objective.score,
        confidence: objective.confidence,
        rubricDimensionsJson: objective.rubricDimensions,
        misconceptionTagsJson: objective.misconceptionTags,
        evidenceReferencesJson: objective.evidenceReferences,
        supportHistoryJson: objective.supportHistory,
        evidenceState: "advisory",
      }))).onConflictDoNothing();
    }
    return { attemptId: attempt.id, created: true };
  });
}

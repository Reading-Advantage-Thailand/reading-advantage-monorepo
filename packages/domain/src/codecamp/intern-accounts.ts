import { eq, and, inArray, desc } from "drizzle-orm";
import { z } from "zod";
import {
  users, accounts, codecampModules, codecampLessons, codecampCurriculumAssignments,
  codecampUserProgress, codecampExerciseRepos, codecampPrReviews,
  codecampTutorEvidenceJoins, codecampTutorInterventions, codecampTutorResourceUses,
  auditEvents, codecampPrReviewAttempts, codecampPrReviewObjectiveEvidence, reviewJobs,
} from "@reading-advantage/db/schema";
import { hashPassword } from "@reading-advantage/auth";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { CODECAMP_APK_CURRICULUM_VERSION, isCodecampAPKCurriculumReleased } from "./curriculum-assignments.js";
import {
  CODECAMP_PR_REVIEW_OVERRIDE_AUDIT_ACTION,
  prReviewOverrideAuditMetadataSchema,
} from "./pr-review-overrides.js";
import type { PrReviewOperationalStatus } from "@reading-advantage/types";

const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const PR_REVIEW_ATTEMPT_STATUS_SCHEMA = z.enum(["advisory", "validated", "failed"]);
const PR_REVIEW_EVIDENCE_AUTHORITY_SCHEMA = z.enum(["advisory_model", "trusted_deterministic"]);
const PR_REVIEW_EVIDENCE_STATE_SCHEMA = z.enum(["advisory", "validated", "rejected"]);

type ReviewStatus = "pending" | "reviewed" | "needs_changes" | "approved";
type ReviewJobSnapshot = Pick<typeof reviewJobs.$inferSelect, "reviewId" | "status" | "attempts" | "lastError">;

/**
 * Durable marker written into `review_jobs.last_error` when the worker
 * settles a `skipped_generated` outcome. The read path derives
 * `prReviewOperationalStatus` from this prefix without a schema migration.
 */
export const REVIEW_JOB_SKIPPED_GENERATED_MARKER = "[SKIPPED_GENERATED]";

/**
 * Derives the administrator-facing queue state without changing the
 * editorial review status stored on the PR review.
 * @param reviewStatus Editorial status persisted on the PR review row.
 * @param job Matching durable review job, when one exists. May carry the
 *   durable `lastError` marker so a `succeeded` job can still report
 *   `skipped` when the diff was entirely generated artifacts.
 * @returns Queue state for pending editorial reviews, or null after editorial review.
 */
export function derivePrReviewOperationalStatus(
  reviewStatus: ReviewStatus,
  job: ReviewJobSnapshot | null,
): PrReviewOperationalStatus | null {
  if (reviewStatus !== "pending") return null;
  if (!job) return "pending";
  // A succeeded job whose `lastError` carries the durable skip marker is
  // visibly `skipped` rather than awaiting the editorial projection.
  if (job.status === "succeeded" && typeof job.lastError === "string" && job.lastError.startsWith(REVIEW_JOB_SKIPPED_GENERATED_MARKER)) {
    return "skipped";
  }
  if (job.status === "claimed" || (job.status === "pending" && job.attempts === 0)) return "processing";
  if (job.status === "pending") return "retrying";
  if (job.status === "dead" || job.status === "failed") return "failed";
  // A succeeded job with a still-pending editorial row is awaiting the
  // editorial projection, so it remains visibly pending rather than hidden.
  return "pending";
}

/**
 * Derives the plain-language failure reason for a review whose durable job
 * ended in a terminal failure or a generated-artifact skip.
 * @param job Matching durable review job, when one exists.
 * @returns The terminal reason, or null when no terminal reason applies.
 */
export function derivePrReviewFailureReason(
  job: { status: string; lastError: string | null } | null,
): string | null {
  if (!job) return null;
  if (job.status === "dead" || job.status === "failed") {
    return typeof job.lastError === "string" && job.lastError.length > 0 ? job.lastError : null;
  }
  if (job.status === "succeeded" && typeof job.lastError === "string" && job.lastError.startsWith(REVIEW_JOB_SKIPPED_GENERATED_MARKER)) {
    return job.lastError;
  }
  return null;
}

/** Aggregated tutor support context that is safe to show to an administrator. */
export interface TutorSupportSummary {
  /** Total persisted learner-visible interventions. */
  totalInterventions: number;
  /** Number of server-verified outcomes attributed to an intervention. */
  verifiedFollowUps: number;
  /** Number of curated resource actions recorded by the learner. */
  resourceUses: number;
  /** Counts of bounded intervention levels, indexed by their learner-visible name. */
  levels: Record<"diagnostic" | "conceptual_hint" | "location_hint" | "partial_scaffold" | "worked_example", number>;
  /** Explicit misconception tags, aggregated without learner messages or model reasoning. */
  misconceptionTags: Array<{ tag: string; count: number }>;
  /** Latest intervention timestamp, if the learner has requested support. */
  latestInterventionAt: Date | null;
}

const TUTOR_LEVEL_NAMES = ["diagnostic", "conceptual_hint", "location_hint", "partial_scaffold", "worked_example"] as const;

/**
 * Builds a safe teacher-facing summary from immutable tutor audit records.
 * @param interventions Learner-visible intervention audit rows.
 * @param resourceUses Trusted resource-action audit rows for those interventions.
 * @param evidenceJoins Verified-outcome joins for those interventions.
 * @returns Counts and tags that explain support history without exposing messages or reasoning.
 */
export function summarizeTutorSupport(
  interventions: readonly { id: string; interventionLevel: number; misconceptionTagsJson: string[]; createdAt: Date }[],
  resourceUses: readonly { interventionId: string }[],
  evidenceJoins: readonly { interventionId: string }[],
): TutorSupportSummary {
  const levels: TutorSupportSummary["levels"] = {
    diagnostic: 0,
    conceptual_hint: 0,
    location_hint: 0,
    partial_scaffold: 0,
    worked_example: 0,
  };
  const tagCounts = new Map<string, number>();
  for (const intervention of interventions) {
    const level = TUTOR_LEVEL_NAMES[intervention.interventionLevel];
    if (level) levels[level] += 1;
    for (const tag of intervention.misconceptionTagsJson) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return {
    totalInterventions: interventions.length,
    verifiedFollowUps: evidenceJoins.length,
    resourceUses: resourceUses.length,
    levels,
    misconceptionTags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag)),
    latestInterventionAt: interventions.reduce<Date | null>((latest, intervention) => latest === null || intervention.createdAt > latest ? intervention.createdAt : latest, null),
  };
}

/**
 * Creates a new INTERN account with hashed password.
 */
export async function createInternAccount({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
  input: { username: string; name: string; password: string; githubUsername?: string | null };
}) {
  assertCan(user, "admin:dashboard", tenant);

  if (!PASSWORD_COMPLEXITY.test(input.password)) {
    throw new Error("Password must contain at least one uppercase letter, one lowercase letter, and one digit");
  }

  // INTERN accounts are global (schoolId=null) — query without tenant scoping.
  const rawDb = db.unscoped("intern accounts are global — no schoolId by design");

  const lowerUsername = input.username.toLowerCase();
  const normalizedGithubUsername = (input.githubUsername || input.username).replace(/^@/, "").toLowerCase();

  const [existing] = await rawDb.select().from(users).where(eq(users.username, lowerUsername)).limit(1);
  if (existing) throw new Error("Username already exists");

  const [existingGithubUser] = await rawDb.select({ id: users.id }).from(users)
    .where(eq(users.githubUsername, normalizedGithubUsername)).limit(1);
  if (existingGithubUser) throw new Error("GitHub username already exists");

  const passwordHash = await hashPassword(input.password);
  const userId = crypto.randomUUID();

  const result = await rawDb.transaction(async (tx) => {
    const [created] = await tx.insert(users)
      .values({
        id: userId, username: lowerUsername, displayUsername: input.username, name: input.name,
        role: "INTERN", schoolId: null, xp: 0, level: 1, cefrLevel: "A1", githubUsername: normalizedGithubUsername,
      })
      .returning();

    await tx.insert(accounts).values({
      id: `${userId}_credential`, userId, providerId: "credential", password: passwordHash,
    });
    if (isCodecampAPKCurriculumReleased()) {
      await tx.insert(codecampCurriculumAssignments).values({ userId, curriculumVersion: CODECAMP_APK_CURRICULUM_VERSION });
    }

    return created;
  });

  return result;
}

/**
 * Updates the GitHub username for an intern account.
 */
export async function updateInternGithubUsername({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { userId: string; githubUsername: string | null };
}) {
  assertCan(user, "admin:dashboard", tenant);

  // INTERN accounts are global — query without tenant scoping.
  const rawDb = db.unscoped("intern accounts are global — no schoolId by design");

  const [intern] = await rawDb.select({ id: users.id }).from(users)
    .where(and(eq(users.id, input.userId), eq(users.role, "INTERN"))).limit(1);
  if (!intern) throw new Error("Intern not found");

  const normalizedUsername = input.githubUsername ? input.githubUsername.replace(/^@/, "").toLowerCase() : null;
  const [result] = await rawDb.update(users).set({ githubUsername: normalizedUsername })
    .where(eq(users.id, input.userId)).returning();
  return result;
}

/**
 * Lists all intern accounts with progress summaries.
 */
export async function listInterns({
  db, user, tenant,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
}) {
  assertCan(user, "admin:dashboard", tenant);

  // INTERN accounts are global — query without tenant scoping.
  const rawDb = db.unscoped("intern accounts are global — no schoolId by design");

  const interns = await rawDb.select().from(users).where(eq(users.role, "INTERN")).orderBy(users.createdAt);

  const modules = await rawDb.select().from(codecampModules).where(eq(codecampModules.status, "published")).orderBy(codecampModules.order);
  const curriculumAssignments = await rawDb.select().from(codecampCurriculumAssignments);
  const apkLearnerIds = new Set(curriculumAssignments.filter(({ curriculumVersion }) => curriculumVersion === CODECAMP_APK_CURRICULUM_VERSION).map(({ userId }) => userId));
  const moduleIds = modules.map((m) => m.id);
  const internIds = interns.map((i) => i.id);

  const allProgress = moduleIds.length > 0 && internIds.length > 0
    ? await rawDb.select().from(codecampUserProgress)
        .where(and(inArray(codecampUserProgress.moduleId, moduleIds), inArray(codecampUserProgress.userId, internIds)))
    : [];

  const allLessons = moduleIds.length > 0
    ? await rawDb.select().from(codecampLessons).where(inArray(codecampLessons.moduleId, moduleIds))
    : [];

  const allRepos = moduleIds.length > 0
    ? await rawDb.select().from(codecampExerciseRepos).where(inArray(codecampExerciseRepos.moduleId, moduleIds))
    : [];

  const allReviews = internIds.length > 0
    ? await rawDb.select().from(codecampPrReviews).where(inArray(codecampPrReviews.userId, internIds))
    : [];
  const allReviewJobs = allReviews.length > 0
    ? await rawDb.select({
      reviewId: reviewJobs.reviewId,
      status: reviewJobs.status,
      attempts: reviewJobs.attempts,
      lastError: reviewJobs.lastError,
    }).from(reviewJobs).where(inArray(reviewJobs.reviewId, allReviews.map(({ id }) => id)))
    : [];
  const reviewJobsByReviewId = new Map<string, ReviewJobSnapshot>();
  for (const job of allReviewJobs) {
    if (job.reviewId) reviewJobsByReviewId.set(job.reviewId, job);
  }

  return interns.map((intern) => {
    const availableModules = apkLearnerIds.has(intern.id) ? modules : modules.filter(({ slug }) => slug !== "apk-game-creation");
    const availableModuleIds = new Set(availableModules.map(({ id }) => id));
    const availableLessons = allLessons.filter(({ moduleId }) => availableModuleIds.has(moduleId));
    const internProgress = allProgress.filter((p) => p.userId === intern.id && availableModuleIds.has(p.moduleId));
    const completedModules = new Set(internProgress.filter((p) => p.status === "completed").map((p) => p.moduleId)).size;
    const quizScores = internProgress.filter((p) => { const l = availableLessons.find((l) => l.id === p.lessonId); return p.score > 0 && l?.type === "quiz"; }).map((p) => p.score);
    const quizAverage = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;

    const internReviews = allReviews.filter((r) => r.userId === intern.id);
    const operationalStatuses = internReviews.map((review) => derivePrReviewOperationalStatus(
      review.reviewStatus,
      reviewJobsByReviewId.get(review.id) ?? null,
    ));
    const pending = operationalStatuses.filter((status) => status === "pending").length;
    const processing = operationalStatuses.filter((status) => status === "processing").length;
    const retrying = operationalStatuses.filter((status) => status === "retrying").length;
    const failed = operationalStatuses.filter((status) => status === "failed").length;
    const approved = internReviews.filter((r) => r.reviewStatus === "approved").length;
    const latestPrReview = [...internReviews].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

    const lastActive = internProgress.length > 0
      ? [...internProgress].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0].updatedAt
      : null;

    const totalLessons = availableLessons.length;
    const completedLessons = internProgress.filter((p) => p.status === "completed").length;
    const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const currentModule = availableModules.find((mod) => {
      const moduleLessons = availableLessons.filter((lesson) => lesson.moduleId === mod.id);
      if (moduleLessons.length === 0) return false;
      const completedForModule = internProgress.filter((p) => p.moduleId === mod.id && p.status === "completed").length;
      return completedForModule < moduleLessons.length;
    }) ?? null;
    const currentModuleHasReview = currentModule ? allRepos.some((repo) => repo.moduleId === currentModule.id) : false;
    const reviewExpectation = latestPrReview ? "review_received" as const : currentModuleHasReview ? "awaiting_pr" as const : "not_expected_yet" as const;

    return {
      userId: intern.id, name: intern.name, username: intern.username,
      overallProgress, completedModules, totalModules: availableModules.length, quizAverage,
      prReviewsPending: pending, prReviewsProcessing: processing, prReviewsRetrying: retrying, prReviewsFailed: failed,
      prReviewsApproved: approved, reviewExpectation,
      latestPrReview: latestPrReview ? {
        prUrl: latestPrReview.prUrl,
        reviewStatus: latestPrReview.reviewStatus,
        operationalStatus: derivePrReviewOperationalStatus(
          latestPrReview.reviewStatus,
          reviewJobsByReviewId.get(latestPrReview.id) ?? null,
        ),
        llmReviewSummary: latestPrReview.llmReviewSummary,
        createdAt: latestPrReview.createdAt,
      } : null,
      lastActiveAt: lastActive,
    };
  });
}

/**
 * Returns detailed progress for a single intern.
 */
export async function getInternProgress({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { userId: string };
}) {
  assertCan(user, "admin:dashboard", tenant);

  // INTERN accounts are global — query without tenant scoping.
  const rawDb = db.unscoped("intern accounts are global — no schoolId by design");

  const [intern] = await rawDb.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!intern || intern.role !== "INTERN") throw new Error("Intern not found");

  const publishedModules = await rawDb.select().from(codecampModules).where(eq(codecampModules.status, "published")).orderBy(codecampModules.order);
  const [curriculumAssignment] = await rawDb.select().from(codecampCurriculumAssignments).where(and(eq(codecampCurriculumAssignments.userId, input.userId), eq(codecampCurriculumAssignments.curriculumVersion, CODECAMP_APK_CURRICULUM_VERSION))).limit(1);
  const modules = curriculumAssignment ? publishedModules : publishedModules.filter(({ slug }) => slug !== "apk-game-creation");
  const moduleIds = modules.map((m) => m.id);
  const lessons = moduleIds.length > 0 ? await rawDb.select().from(codecampLessons).where(inArray(codecampLessons.moduleId, moduleIds)) : [];
  const progress = await rawDb.select().from(codecampUserProgress).where(eq(codecampUserProgress.userId, input.userId));
  const exerciseRepos = moduleIds.length > 0 ? await rawDb.select().from(codecampExerciseRepos).where(inArray(codecampExerciseRepos.moduleId, moduleIds)) : [];
  const reviews = await rawDb.select().from(codecampPrReviews).where(eq(codecampPrReviews.userId, input.userId)).orderBy(desc(codecampPrReviews.createdAt));
  const tutorInterventions = await rawDb.select({
    id: codecampTutorInterventions.id,
    interventionLevel: codecampTutorInterventions.interventionLevel,
    misconceptionTagsJson: codecampTutorInterventions.misconceptionTagsJson,
    createdAt: codecampTutorInterventions.createdAt,
  }).from(codecampTutorInterventions).where(and(
    eq(codecampTutorInterventions.userId, input.userId),
    eq(codecampTutorInterventions.tenantKey, tenant.schoolId ?? "codecamp"),
  ));
  const tutorInterventionIds = tutorInterventions.map(({ id }) => id);
  const tutorResourceUses = tutorInterventionIds.length > 0
    ? await rawDb.select({ interventionId: codecampTutorResourceUses.interventionId }).from(codecampTutorResourceUses).where(inArray(codecampTutorResourceUses.interventionId, tutorInterventionIds))
    : [];
  const tutorEvidenceJoins = tutorInterventionIds.length > 0
    ? await rawDb.select({ interventionId: codecampTutorEvidenceJoins.interventionId }).from(codecampTutorEvidenceJoins).where(inArray(codecampTutorEvidenceJoins.interventionId, tutorInterventionIds))
    : [];
  const prReviewAttempts = await rawDb.select({
    id: codecampPrReviewAttempts.id,
    reviewId: codecampPrReviewAttempts.reviewId,
    headSha: codecampPrReviewAttempts.headSha,
    attemptStatus: codecampPrReviewAttempts.attemptStatus,
    evidenceAuthority: codecampPrReviewAttempts.evidenceAuthority,
    modelAlias: codecampPrReviewAttempts.modelAlias,
    resolvedModel: codecampPrReviewAttempts.resolvedModel,
    createdAt: codecampPrReviewAttempts.createdAt,
  }).from(codecampPrReviewAttempts).where(and(
    eq(codecampPrReviewAttempts.userId, input.userId),
    eq(codecampPrReviewAttempts.tenantKey, tenant.schoolId ?? "codecamp"),
  )).orderBy(desc(codecampPrReviewAttempts.createdAt));
  const prReviewAttemptIds = prReviewAttempts.map(({ id }) => id);
  const prReviewObjectiveEvidence = prReviewAttemptIds.length > 0
    ? await rawDb.select({
      attemptId: codecampPrReviewObjectiveEvidence.attemptId,
      objectiveId: codecampPrReviewObjectiveEvidence.objectiveId,
      variantKey: codecampPrReviewObjectiveEvidence.variantKey,
      score: codecampPrReviewObjectiveEvidence.score,
      confidence: codecampPrReviewObjectiveEvidence.confidence,
      evidenceState: codecampPrReviewObjectiveEvidence.evidenceState,
    }).from(codecampPrReviewObjectiveEvidence).where(inArray(codecampPrReviewObjectiveEvidence.attemptId, prReviewAttemptIds))
    : [];
  const overrideEvents = prReviewAttemptIds.length > 0
    ? await rawDb.select({
      id: auditEvents.id,
      actorUserId: auditEvents.actorUserId,
      actorRole: auditEvents.actorRole,
      targetId: auditEvents.targetId,
      metadata: auditEvents.metadata,
      createdAt: auditEvents.createdAt,
    }).from(auditEvents).where(and(
      eq(auditEvents.action, CODECAMP_PR_REVIEW_OVERRIDE_AUDIT_ACTION),
      eq(auditEvents.targetType, "codecamp_pr_review_attempt"),
      inArray(auditEvents.targetId, prReviewAttemptIds),
    )).orderBy(desc(auditEvents.createdAt))
    : [];
  const reviewJobsForReviews = reviews.length > 0
    ? await rawDb.select({
      reviewId: reviewJobs.reviewId,
      status: reviewJobs.status,
      attempts: reviewJobs.attempts,
      lastError: reviewJobs.lastError,
    }).from(reviewJobs).where(inArray(reviewJobs.reviewId, reviews.map(({ id }) => id)))
    : [];
  const reviewJobsByReviewId = new Map<string, ReviewJobSnapshot>();
  for (const job of reviewJobsForReviews) {
    if (job.reviewId) reviewJobsByReviewId.set(job.reviewId, job);
  }
  const overridesByAttempt = new Map<string, Array<{
    id: string;
    actorUserId: string | null;
    actorRole: string | null;
    correctedDisposition: "pass" | "revise";
    reason: string;
    correctedObjectives: Array<{ objectiveId: string; correctedScore: number; correctedConfidence: number; reason: string }>;
    createdAt: Date;
  }>>();
  for (const event of overrideEvents) {
    const metadata = prReviewOverrideAuditMetadataSchema.safeParse(event.metadata);
    if (!event.targetId || !metadata.success) continue;
    const entries = overridesByAttempt.get(event.targetId) ?? [];
    entries.push({
      id: event.id,
      actorUserId: event.actorUserId,
      actorRole: event.actorRole,
      correctedDisposition: metadata.data.correctedDisposition,
      reason: metadata.data.reason,
      correctedObjectives: metadata.data.correctedObjectives,
      createdAt: event.createdAt,
    });
    overridesByAttempt.set(event.targetId, entries);
  }
  const safePrReviewAttempts = prReviewAttempts.flatMap((attempt) => {
    const attemptStatus = PR_REVIEW_ATTEMPT_STATUS_SCHEMA.safeParse(attempt.attemptStatus);
    const evidenceAuthority = PR_REVIEW_EVIDENCE_AUTHORITY_SCHEMA.safeParse(attempt.evidenceAuthority);
    if (!attemptStatus.success || !evidenceAuthority.success) return [];
    return [{
      ...attempt,
      attemptStatus: attemptStatus.data,
      evidenceAuthority: evidenceAuthority.data,
      objectives: prReviewObjectiveEvidence.flatMap((objective) => {
        if (objective.attemptId !== attempt.id) return [];
        const evidenceState = PR_REVIEW_EVIDENCE_STATE_SCHEMA.safeParse(objective.evidenceState);
        return evidenceState.success ? [{ ...objective, evidenceState: evidenceState.data }] : [];
      }).sort((left, right) => left.objectiveId.localeCompare(right.objectiveId)),
      overrides: overridesByAttempt.get(attempt.id) ?? [],
    }];
  });

  const moduleBreakdown = modules.map((mod) => {
    const modLessons = lessons.filter((l) => l.moduleId === mod.id);
    const modProgress = progress.filter((p) => p.moduleId === mod.id);
    const completed = modProgress.filter((p) => p.status === "completed").length;
    const avgScore = modProgress.length > 0 ? Math.round(modProgress.reduce((s, p) => s + p.score, 0) / modProgress.length) : 0;
    const moduleRepos = exerciseRepos.filter((repo) => repo.moduleId === mod.id);
    const moduleRepoIds = new Set(moduleRepos.map((repo) => repo.id));
    const latestModuleReview = reviews.filter((review) => moduleRepoIds.has(review.exerciseRepoId)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
    const latestModuleReviewOperationalStatus = latestModuleReview
      ? derivePrReviewOperationalStatus(
        latestModuleReview.reviewStatus,
        reviewJobsByReviewId.get(latestModuleReview.id) ?? null,
      )
      : null;

    return {
      moduleId: mod.id, title: mod.title, completed, totalLessons: modLessons.length, avgScore,
      reviewExpected: moduleRepos.length > 0, reviewReceived: latestModuleReview !== null,
      latestPrUrl: latestModuleReview?.prUrl ?? null,
      latestPrReviewStatus: latestModuleReview?.reviewStatus ?? null,
      latestPrReviewOperationalStatus: latestModuleReviewOperationalStatus,
    };
  });

  const reportedReviews = reviews.map((review) => ({
    ...review,
    operationalStatus: derivePrReviewOperationalStatus(
      review.reviewStatus,
      reviewJobsByReviewId.get(review.id) ?? null,
    ),
    failureReason: derivePrReviewFailureReason(
      reviewJobsByReviewId.get(review.id) ?? null,
    ),
  }));

  return {
    userId: intern.id, name: intern.name, username: intern.username, githubUsername: intern.githubUsername ?? null,
    moduleBreakdown,
    quizScores: progress.filter((p) => { const l = lessons.find((l) => l.id === p.lessonId); return p.score > 0 && l?.type === "quiz"; })
      .map((p) => ({ lessonId: p.lessonId, lessonTitle: lessons.find((l) => l.id === p.lessonId)?.title ?? "Lesson", score: p.score })),
    prReviews: reportedReviews,
    prReviewAttempts: safePrReviewAttempts,
    tutorSupport: summarizeTutorSupport(tutorInterventions, tutorResourceUses, tutorEvidenceJoins),
  };
}

import { eq, and, desc, sql } from "drizzle-orm";
import {
  codecampPrReviews, codecampExerciseRepos, codecampLessons, codecampModules,
  codecampWebhookEvents,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { updateUserProgress } from "./progress.js";
import { createActivitySessionRecord } from "@reading-advantage/activity-runtime";
import { assessCheckpointAttempt } from "@reading-advantage/activity-runtime/server";
import { createCodecampAPKIndependentActivity } from "@reading-advantage/codecamp-knowledge";
import { codecampAPKUnit } from "@reading-advantage/codecamp-knowledge";
import { masteryCards } from "@reading-advantage/db/schema";
import { DrizzleActivityPersistence } from "../activity/drizzle-activity-persistence.js";
import { CODECAMP_MASTERY_SCHOOL_ID } from "../activity/drizzle-activity-persistence.js";
import { apkPrEvaluationSchema, isPassingAPKPrEvaluation, type APKPrEvaluation } from "./review-exercise.js";
import { assertCodecampModuleAssigned } from "./curriculum-assignments.js";

export type CodecampWebhookEventOutcome = "ignored" | "failed";

/**
 * In-process cache of `x-github-delivery` ids that have already been
 * processed by this Node process. Used by `logWebhookEvent` to short-circuit
 * duplicate deliveries before they reach the DB. The cache is intentionally
 * process-local because the dedup window is short and the same delivery id
 * should never reappear after process restart; durable dedup comes from the
 * DB SELECT below plus the unique index on `codecamp_webhook_events.delivery_id`.
 */
const processedDeliveryIds = new Set<string>();

function publicPrReview(row: typeof codecampPrReviews.$inferSelect) {
  const { rubricEvaluationJson: _rubricEvaluationJson, ...publicRow } = row;
  return publicRow;
}

/**
 * Lists all PR reviews submitted by the current user.
 *
 * `codecamp_pr_reviews` is classified as REFERENTIAL (no `schoolId` column);
 * the query is scoped manually by `userId`.
 */
export async function getPrReviewsForUser({
  db, user, tenant,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
}) {
  assertCan(user, "codecamp:read", tenant);

  const rawDb = db.unscoped("codecamp pr-reviews scoped by userId");

  return (await rawDb.select().from(codecampPrReviews)
    .where(eq(codecampPrReviews.userId, user.id)).orderBy(desc(codecampPrReviews.createdAt))).map(publicPrReview);
}

/**
 * Creates a new PR review record after validation.
 *
 * `codecamp_exercise_repos` and `codecamp_pr_reviews` are REFERENTIAL; the
 * prUrl uniqueness check relies on the `codecamp_pr_reviews_pr_url_unique`
 * index on `pr_url`.
 */
export async function createPrReview({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { exerciseRepoId: string; prUrl: string };
}) {
  assertCan(user, "codecamp:submit", tenant);

  const rawDb = db.unscoped("codecamp pr-reviews/exercise_repos scoped by prUrl and exerciseRepoId");

  const [repo] = await rawDb.select({ id: codecampExerciseRepos.id, moduleId: codecampExerciseRepos.moduleId, repoUrl: codecampExerciseRepos.repoUrl, moduleSlug: codecampModules.slug })
    .from(codecampExerciseRepos).innerJoin(codecampModules, eq(codecampModules.id, codecampExerciseRepos.moduleId)).where(eq(codecampExerciseRepos.id, input.exerciseRepoId)).limit(1);
  if (!repo) throw new Error("Exercise repo not found");
  if (repo.moduleSlug === "apk-game-creation") await assertCodecampModuleAssigned(db, user.id, repo.moduleId);

  let prUrlObj: URL;
  try { prUrlObj = new URL(input.prUrl); } catch { throw new Error("Invalid PR URL"); }
  if (prUrlObj.hostname !== "github.com") throw new Error("PR URL must be a GitHub URL");
  const prPathParts = prUrlObj.pathname.split("/").filter(Boolean);
  if (prPathParts.length < 4 || prPathParts[2] !== "pull" || isNaN(Number(prPathParts[3]))) {
    throw new Error("Invalid PR URL: must be a GitHub pull request URL (e.g. https://github.com/owner/repo/pull/123)");
  }

  const normalizedExerciseUrl = repo.repoUrl.replace(/\.git$/, "").replace(/\/$/, "").toLowerCase();
  const prTargetUrl = `https://github.com/${prPathParts[0]}/${prPathParts[1]}`.toLowerCase();
  if (prTargetUrl !== normalizedExerciseUrl) {
    const repoName = normalizedExerciseUrl.split("/").pop() ?? "the exercise repo";
    throw new Error(`PR URL must be for the ${repoName} repository`);
  }

  const [existing] = await rawDb.select({ id: codecampPrReviews.id }).from(codecampPrReviews)
    .where(eq(codecampPrReviews.prUrl, input.prUrl)).limit(1);
  if (existing) throw new Error("A review for this PR URL already exists");

  const [result] = await rawDb.insert(codecampPrReviews)
    .values({ exerciseRepoId: input.exerciseRepoId, userId: user.id, prUrl: input.prUrl, reviewStatus: "pending" })
    .returning();
  return result ? publicPrReview(result) : result;
}

/**
 * Updates the status and optional LLM review summary of a PR review.
 *
 * `codecamp_pr_reviews` is REFERENTIAL; updates are scoped by `reviewId`.
 */
export async function updatePrReview({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
  input: { reviewId: string; reviewStatus: "pending" | "reviewed" | "needs_changes" | "approved"; llmReviewSummary?: string; rubricEvaluation?: unknown };
}) {
  assertCan(user, "admin:dashboard", tenant);

  const rawDb = db.unscoped("codecamp pr-reviews scoped by reviewId");

  let apkEvaluation: APKPrEvaluation | null = null;
  if (input.reviewStatus === "approved") {
    const [target] = await rawDb.select({ moduleSlug: codecampModules.slug }).from(codecampPrReviews)
      .innerJoin(codecampExerciseRepos, eq(codecampExerciseRepos.id, codecampPrReviews.exerciseRepoId))
      .innerJoin(codecampModules, eq(codecampModules.id, codecampExerciseRepos.moduleId))
      .where(eq(codecampPrReviews.id, input.reviewId)).limit(1);
    if (!target) throw new Error("Review not found");
    if (target.moduleSlug === "apk-game-creation") {
      apkEvaluation = apkPrEvaluationSchema.parse(input.rubricEvaluation);
      if (!isPassingAPKPrEvaluation(apkEvaluation)) throw new Error("APK PR does not meet the authored rubric and required checks");
    }
  }

  const [result] = await rawDb.update(codecampPrReviews)
    .set({
      reviewStatus: input.reviewStatus,
      llmReviewSummary: input.llmReviewSummary ?? null,
      rubricEvaluationJson: apkEvaluation,
      reviewedAt: input.reviewStatus !== "pending" ? new Date() : sql`${codecampPrReviews.reviewedAt}`,
    })
    .where(eq(codecampPrReviews.id, input.reviewId)).returning();

  if (!result) throw new Error("Review not found");
  if (result.reviewStatus === "approved") await projectApprovedAPKReview(db, result);
  return publicPrReview(result);
}

async function projectApprovedAPKReview(db: TenantDB, review: typeof codecampPrReviews.$inferSelect): Promise<void> {
  const rawDb = db.unscoped("approved APK PR projection resolves the review repository module");
  const [repository] = await rawDb.select({ moduleSlug: codecampModules.slug }).from(codecampExerciseRepos)
    .innerJoin(codecampModules, eq(codecampModules.id, codecampExerciseRepos.moduleId))
    .where(eq(codecampExerciseRepos.id, review.exerciseRepoId)).limit(1);
  if (repository?.moduleSlug !== "apk-game-creation") return;
  const activity = createCodecampAPKIndependentActivity("en");
  const actor = { learnerId: review.userId, schoolId: null, tenantKey: "codecamp" } as const;
  const persistence = new DrizzleActivityPersistence(db);
  const sessionId = review.id;
  const existing = await persistence.getOwnedSession(actor, sessionId);
  if (!existing) await persistence.createSession(createActivitySessionRecord({ sessionId, actor, activityId: activity.activityId, activityVersion: activity.activityVersion, startedAt: (review.reviewedAt ?? new Date()).toISOString() }));
  const assessment = assessCheckpointAttempt(activity, { eventId: `pr-review:${review.id}:approved`, checkpointId: "checkpoint.apk.pr-approved", submissionId: `pr-review:${review.id}`, attemptNumber: 1, answer: "approved", submittedAt: (review.reviewedAt ?? new Date()).toISOString(), hintsUsed: 0, revealsUsed: 0, interventionLevel: 0, evidenceConfidence: 1, timingMs: 0 });
  await persistence.recordAssessment(actor, sessionId, assessment);
  const approvedAt = review.reviewedAt ?? new Date();
  await rawDb.insert(masteryCards).values(codecampAPKUnit.srsFollowUps.map(({ objectiveId, variantKey, afterDays }) => ({
    schoolId: CODECAMP_MASTERY_SCHOOL_ID, studentId: review.userId, objectiveId, variantKey,
    stability: 0, difficulty: 0, state: "new", dueDate: new Date(approvedAt.getTime() + afterDays * 24 * 60 * 60 * 1000),
    elapsedDays: 0, scheduledDays: afterDays, reps: 0, lapses: 0, lastReview: null, paramsVersion: "fsrs-default.v1",
  }))).onConflictDoNothing();
}

/**
 * Marks the exercise lesson as completed for an approved PR review.
 *
 * `codecamp_pr_reviews`, `codecamp_exercise_repos`, and `codecamp_lessons`
 * are REFERENTIAL; the lookup is keyed by the reviewId FK chain.
 */
export async function completeApprovedPrReviewLesson({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { reviewId: string };
}) {
  assertCan(user, "admin:dashboard", tenant);

  const rawDb = db.unscoped("codecamp pr-reviews/exercise_repos/lessons scoped by reviewId FK chain");

  const [review] = await rawDb.select().from(codecampPrReviews)
    .where(eq(codecampPrReviews.id, input.reviewId)).limit(1);
  if (!review) throw new Error("Review not found");
  if (review.reviewStatus !== "approved") throw new Error("Review is not approved");

  const [repo] = await rawDb.select().from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.id, review.exerciseRepoId)).limit(1);
  if (!repo) throw new Error("Exercise repo not found");

  const lessons = await rawDb.select().from(codecampLessons)
    .where(eq(codecampLessons.moduleId, repo.moduleId)).orderBy(codecampLessons.order);
  const exerciseLesson = lessons.find((lesson) => lesson.type === "exercise");
  if (!exerciseLesson) throw new Error("Exercise lesson not found");

  const reviewOwner = { id: review.userId, username: review.userId, name: null, role: "INTERN" as const, schoolId: null, xp: 0, level: 1, cefrLevel: "A1" };
  return updateUserProgress({ db, user: reviewOwner, tenant, input: { lessonId: exerciseLesson.id, status: "completed", score: 100 } });
}

/**
 * Looks up a PR review by its PR URL.
 *
 * `codecamp_pr_reviews` is REFERENTIAL; the query is scoped by `prUrl`
 * (and additionally by `userId` for non-system callers).
 */
export async function getPrReviewByPrUrl({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { prUrl: string };
}) {
  assertCan(user, "codecamp:read", tenant);

  const rawDb = db.unscoped("codecamp pr-reviews scoped by prUrl and userId");

  const conditions = [eq(codecampPrReviews.prUrl, input.prUrl)];
  if (user.role !== "SYSTEM") conditions.push(eq(codecampPrReviews.userId, user.id));

  const [result] = await rawDb.select().from(codecampPrReviews)
    .where(and(...conditions)).limit(1);
  return result ? publicPrReview(result) : null;
}

/**
 * Logs a GitHub webhook event for diagnostic purposes.
 *
 * `codecamp_webhook_events` is REFERENTIAL; rows are inserted with the
 * delivery id so the webhook handler can deduplicate redeliveries.
 *
 * Delivery-id idempotency is enforced in two layers:
 *   1. In-process Set (`processedDeliveryIds`) for same-process concurrency.
 *   2. SELECT-before-INSERT on `delivery_id` for cross-process durability.
 *
 * When a duplicate deliveryId is observed we short-circuit and return null
 * so callers do not double-log the same `x-github-delivery`.
 */
export async function logWebhookEvent({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
  input: { deliveryId?: string | null; event: string; action?: string | null; repoUrl?: string | null; prUrl?: string | null; githubUsername?: string | null; outcome: CodecampWebhookEventOutcome; reason: string; payload?: unknown };
}) {
  assertCan(user, "admin:dashboard", tenant);

  // Layer 1: same-process in-memory dedup.
  if (input.deliveryId && processedDeliveryIds.has(input.deliveryId)) {
    return null;
  }

  const rawDb = db.unscoped("codecamp webhook events keyed by deliveryId for idempotency");

  // Layer 2: durable SELECT-before-INSERT for cross-process dedup.
  if (input.deliveryId) {
    const [existing] = await rawDb.select().from(codecampWebhookEvents)
      .where(eq(codecampWebhookEvents.deliveryId, input.deliveryId))
      .orderBy(desc(codecampWebhookEvents.createdAt))
      .limit(1);
    if (existing) {
      processedDeliveryIds.add(input.deliveryId);
      return existing;
    }
  }

  // Optimistically mark the delivery id as in-flight so a concurrent retry
  // with the same id short-circuits at Layer 1 while we are awaiting the
  // INSERT. If the INSERT throws we roll back the in-memory marker so a
  // future redelivery can retry.
  if (input.deliveryId) {
    processedDeliveryIds.add(input.deliveryId);
  }

  try {
    const [result] = await rawDb.insert(codecampWebhookEvents)
      .values({
        deliveryId: input.deliveryId ?? null, event: input.event, action: input.action ?? null,
        repoUrl: input.repoUrl ?? null, prUrl: input.prUrl ?? null, githubUsername: input.githubUsername ?? null,
        outcome: input.outcome, reason: input.reason, payloadJson: input.payload ?? null,
      })
      .returning();
    return result ?? null;
  } catch (err) {
    if (input.deliveryId) {
      processedDeliveryIds.delete(input.deliveryId);
    }
    throw err;
  }
}

/**
 * Lists recent GitHub webhook events.
 */
export async function listWebhookEvents({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { limit?: number };
}) {
  assertCan(user, "admin:dashboard", tenant);

  const rawDb = db.unscoped("codecamp webhook events list keyed by createdAt desc");

  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const rows = await rawDb.select().from(codecampWebhookEvents)
    .orderBy(desc(codecampWebhookEvents.createdAt)).limit(limit);

  return rows.map((row) => ({ ...row, outcome: row.outcome === "failed" ? "failed" as const : "ignored" as const }));
}

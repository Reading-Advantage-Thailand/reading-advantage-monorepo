import { eq, and, desc, sql } from "drizzle-orm";
import {
  codecampPrReviews, codecampExerciseRepos, codecampLessons,
  codecampWebhookEvents,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { updateUserProgress } from "./progress.js";

export type CodecampWebhookEventOutcome = "ignored" | "failed";

/**
 * Lists all PR reviews submitted by the current user.
 */
export async function getPrReviewsForUser({
  db, user, tenant,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
}) {
  assertCan(user, "codecamp:read", tenant);
  return db.select().from(codecampPrReviews)
    .where(eq(codecampPrReviews.userId, user.id)).orderBy(desc(codecampPrReviews.createdAt));
}

/**
 * Creates a new PR review record after validation.
 */
export async function createPrReview({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { exerciseRepoId: string; prUrl: string };
}) {
  assertCan(user, "codecamp:submit", tenant);

  const [repo] = await db.select({ id: codecampExerciseRepos.id, moduleId: codecampExerciseRepos.moduleId, repoUrl: codecampExerciseRepos.repoUrl })
    .from(codecampExerciseRepos).where(eq(codecampExerciseRepos.id, input.exerciseRepoId)).limit(1);
  if (!repo) throw new Error("Exercise repo not found");

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

  const [existing] = await db.select({ id: codecampPrReviews.id }).from(codecampPrReviews)
    .where(eq(codecampPrReviews.prUrl, input.prUrl)).limit(1);
  if (existing) throw new Error("A review for this PR URL already exists");

  const [result] = await db.insert(codecampPrReviews)
    .values({ exerciseRepoId: input.exerciseRepoId, userId: user.id, prUrl: input.prUrl, reviewStatus: "pending" })
    .returning();
  return result;
}

/**
 * Updates the status and optional LLM review summary of a PR review.
 */
export async function updatePrReview({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
  input: { reviewId: string; reviewStatus: "pending" | "reviewed" | "needs_changes" | "approved"; llmReviewSummary?: string };
}) {
  assertCan(user, "admin:dashboard", tenant);

  const [result] = await db.update(codecampPrReviews)
    .set({
      reviewStatus: input.reviewStatus,
      llmReviewSummary: input.llmReviewSummary ?? null,
      reviewedAt: input.reviewStatus !== "pending" ? new Date() : sql`${codecampPrReviews.reviewedAt}`,
    })
    .where(eq(codecampPrReviews.id, input.reviewId)).returning();

  if (!result) throw new Error("Review not found");
  return result;
}

/**
 * Marks the exercise lesson as completed for an approved PR review.
 */
export async function completeApprovedPrReviewLesson({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { reviewId: string };
}) {
  assertCan(user, "admin:dashboard", tenant);

  const [review] = await db.select().from(codecampPrReviews)
    .where(eq(codecampPrReviews.id, input.reviewId)).limit(1);
  if (!review) throw new Error("Review not found");
  if (review.reviewStatus !== "approved") throw new Error("Review is not approved");

  const [repo] = await db.select().from(codecampExerciseRepos)
    .where(eq(codecampExerciseRepos.id, review.exerciseRepoId)).limit(1);
  if (!repo) throw new Error("Exercise repo not found");

  const lessons = await db.select().from(codecampLessons)
    .where(eq(codecampLessons.moduleId, repo.moduleId)).orderBy(codecampLessons.order);
  const exerciseLesson = lessons.find((lesson) => lesson.type === "exercise");
  if (!exerciseLesson) throw new Error("Exercise lesson not found");

  const reviewOwner = { id: review.userId, username: review.userId, name: null, role: "INTERN" as const, schoolId: null, xp: 0, level: 1, cefrLevel: "A1" };
  return updateUserProgress({ db, user: reviewOwner, tenant, input: { lessonId: exerciseLesson.id, status: "completed", score: 100 } });
}

/**
 * Looks up a PR review by its PR URL.
 */
export async function getPrReviewByPrUrl({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant; input: { prUrl: string };
}) {
  assertCan(user, "codecamp:read", tenant);

  const conditions = [eq(codecampPrReviews.prUrl, input.prUrl)];
  if (user.role !== "SYSTEM") conditions.push(eq(codecampPrReviews.userId, user.id));

  const [result] = await db.select().from(codecampPrReviews)
    .where(and(...conditions)).limit(1);
  return result ?? null;
}

/**
 * Logs a GitHub webhook event for diagnostic purposes.
 */
export async function logWebhookEvent({
  db, user, tenant, input,
}: {
  db: TenantDB; user: UserContext; tenant: Tenant;
  input: { deliveryId?: string | null; event: string; action?: string | null; repoUrl?: string | null; prUrl?: string | null; githubUsername?: string | null; outcome: CodecampWebhookEventOutcome; reason: string; payload?: unknown };
}) {
  assertCan(user, "admin:dashboard", tenant);

  const [result] = await db.insert(codecampWebhookEvents)
    .values({
      deliveryId: input.deliveryId ?? null, event: input.event, action: input.action ?? null,
      repoUrl: input.repoUrl ?? null, prUrl: input.prUrl ?? null, githubUsername: input.githubUsername ?? null,
      outcome: input.outcome, reason: input.reason, payloadJson: input.payload ?? null,
    })
    .returning();
  return result;
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

  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const rows = await db.select().from(codecampWebhookEvents)
    .orderBy(desc(codecampWebhookEvents.createdAt)).limit(limit);

  return rows.map((row) => ({ ...row, outcome: row.outcome === "failed" ? "failed" as const : "ignored" as const }));
}

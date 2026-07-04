/**
 * Admin DLQ endpoints for the webhook review-job queue (track_id:
 * `webhook_review_reliability_20260605`).
 *
 * - `listDeadReviewJobs({ db, user, tenant, input })` — list jobs in the
 *   dead-letter state (default `status: "dead"`); paginated.
 * - `requeueReviewJob({ db, user, tenant, input })` — reset a dead job to
 *   `pending` with `attempts = 0` so the worker picks it up on the next
 *   tick.
 *
 * Both functions require admin privileges (`admin:dashboard` permission
 * per `assertCan`); the tRPC `adminProcedure` middleware enforces this
 * before the call reaches the function body.
 *
 * Tenancy: `review_jobs` is REFERENTIAL (no `schoolId`); we read/write
 * through `db.unscoped("reason")`.
 */
import { and, eq, desc, sql } from "drizzle-orm";
import type { TenantDB } from "../db-contract.js";
import type { UserContext, Tenant } from "@reading-advantage/auth";
import { assertCan } from "@reading-advantage/auth";
import { reviewJobs } from "@reading-advantage/db/schema";

/**
 * Filter for `listDeadReviewJobs`. Defaults to `status: "dead"`; admins
 * may broaden to inspect other states during incident triage.
 */
export interface ListReviewJobsInput {
  status?: "pending" | "claimed" | "succeeded" | "failed" | "dead";
  limit?: number;
  offset?: number;
}

/**
 * The canonical `review_jobs` row shape (minus the unused `payload_json`
 * and `delivery_id` columns, which can be large).
 */
export interface ReviewJobRow {
  id: string;
  prOwner: string;
  prRepo: string;
  prPullNumber: number;
  prUrl: string;
  status: "pending" | "claimed" | "succeeded" | "failed" | "dead";
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  claimedAt: Date | null;
  claimedBy: string | null;
  reviewId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lists review jobs matching the given status filter (default: `dead`).
 * Sorted by `updated_at` desc so the freshest DLQ entries surface first.
 * `limit` is clamped to `[1, 100]`; `offset` is clamped to `[0, ∞)`.
 *
 * @param deps - Standard domain deps (db + user + tenant + input).
 * @returns Array of `ReviewJobRow` entries (possibly empty).
 */
export async function listDeadReviewJobs({
  db,
  user,
  tenant,
  input = {},
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input?: ListReviewJobsInput;
}): Promise<ReviewJobRow[]> {
  assertCan(user, "admin:dashboard", tenant);
  const rawDb = db.unscoped(
    "review_jobs has no schoolId; codecamp is global (track_id: webhook_review_reliability_20260605)",
  );
  const status = input.status ?? "dead";
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);

  const rows = await rawDb
    .select()
    .from(reviewJobs)
    .where(eq(reviewJobs.status, status))
    .orderBy(desc(reviewJobs.updatedAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    id: row.id,
    prOwner: row.prOwner,
    prRepo: row.prRepo,
    prPullNumber: row.prPullNumber,
    prUrl: row.prUrl,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    nextAttemptAt: row.nextAttemptAt,
    lastError: row.lastError,
    claimedAt: row.claimedAt,
    claimedBy: row.claimedBy,
    reviewId: row.reviewId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/**
 * Input for `requeueReviewJob`.
 */
export interface RequeueReviewJobInput {
  jobId: string;
}

/**
 * Resets a `dead` (or otherwise stuck) job back to `pending` so the
 * worker claims it on the next tick. Sets `attempts = 0`,
 * `next_attempt_at = now()`, `last_error = null`, `claimed_at = null`,
 * `claimed_by = null` — a clean re-run.
 *
 * The job's status is left at `pending` regardless of its prior state
 * (`dead`, `failed`, even `succeeded` if the admin wants to re-review).
 *
 * @param deps - Standard domain deps (db + user + tenant + input).
 * @returns The updated `ReviewJobRow`.
 * @throws If no job with the given `jobId` exists.
 */
export async function requeueReviewJob({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: RequeueReviewJobInput;
}): Promise<ReviewJobRow> {
  assertCan(user, "admin:dashboard", tenant);
  const rawDb = db.unscoped(
    "review_jobs has no schoolId; codecamp is global (track_id: webhook_review_reliability_20260605)",
  );
  const now = new Date();
  const [row] = await rawDb
    .update(reviewJobs)
    .set({
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
      lastError: null,
      claimedAt: null,
      claimedBy: null,
      updatedAt: now,
    })
    .where(eq(reviewJobs.id, input.jobId))
    .returning();
  if (!row) {
    throw new Error("Review job not found");
  }
  return {
    id: row.id,
    prOwner: row.prOwner,
    prRepo: row.prRepo,
    prPullNumber: row.prPullNumber,
    prUrl: row.prUrl,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    nextAttemptAt: row.nextAttemptAt,
    lastError: row.lastError,
    claimedAt: row.claimedAt,
    claimedBy: row.claimedBy,
    reviewId: row.reviewId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
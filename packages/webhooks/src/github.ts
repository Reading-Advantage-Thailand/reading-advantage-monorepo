import { Hono } from "hono";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import * as codecamp from "@reading-advantage/domain/codecamp";
import { getUserByGithubUsername } from "@reading-advantage/domain/users";
import { githubWebhookPayloadSchema } from "@reading-advantage/types";
import {
  parsePrUrl,
  verifyWebhookSignature,
  MAX_TIMESTAMP_SKEW_SECONDS,
} from "./github-client";
import { enqueueReviewJob, runWorkerTick } from "./review-worker";

const github = new Hono();

/**
 * In-process cache of GitHub delivery ids already processed by this Node
 * process. The synchronous lookup at the top of the webhook handler is the
 * first dedup layer; durable dedup comes from `codecamp_webhook_events`
 * (lookup-before-insert) plus the unique index on `delivery_id` that
 * migration 0025 adds.
 */
const processedDeliveryIds = new Set<string>();

/**
 * Tracked post-ACK durable worker ticks keyed by delivery ID. The Map gives
 * observability for the deferred work while ensuring webhook handling never
 * bypasses the worker's idempotency, persistence, retry, or comment path.
 */
const backgroundReviewJobs = new Map<string, Promise<unknown>>();

const systemUser = {
  id: "system",
  username: "system",
  name: "System",
  role: "SYSTEM" as const,
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const globalTenant = { schoolId: null as string | null };

/**
 * Logs a webhook event to the database for diagnostic purposes.
 * @param input - The event data to log including deliveryId, event type, action, repo/PR URLs, outcome, and reason.
 * @returns void (logs to DB, swallows errors gracefully).
 */
async function logWebhookEvent(input: {
  deliveryId?: string | null;
  event: string;
  action?: string | null;
  repoUrl?: string | null;
  prUrl?: string | null;
  githubUsername?: string | null;
  outcome: "ignored" | "failed";
  reason: string;
  payload?: unknown;
}) {
  try {
    await codecamp.logWebhookEvent({
      db: createTenantDB(db, globalTenant),
      user: systemUser,
      tenant: globalTenant,
      input,
    });
  } catch (err) {
    console.error("[GitHub Webhook] Failed to log webhook diagnostic:", err);
  }
}

// ─── Webhook Handler ──────────────────────────────────────

/**
 * POST /webhooks/github/pr
 *
 * Handles GitHub pull request webhook events.
 * Validates signature, parses the payload, creates/updates PR review records,
 * and triggers LLM code review.
 */
github.post("/pr", async (c) => {
  // Synchronous dedup at the very top of the handler, before any await, so
  // concurrent deliveries with the same x-github-delivery id see each other
  // and the second one short-circuits to a 200 without doing any DB work.
  const deliveryId = c.req.header("x-github-delivery");
  if (deliveryId && processedDeliveryIds.has(deliveryId)) {
    return c.json({ received: true, idempotent: true, deliveryId }, 200);
  }
  // Mark the id as in-flight synchronously. If subsequent validation
  // rejects this delivery we remove it again below; otherwise it stays so
  // a redelivery is recognized as a duplicate.
  if (deliveryId) {
    processedDeliveryIds.add(deliveryId);
  }

  const signature = c.req.header("x-hub-signature-256");
  if (!signature) {
    if (deliveryId) processedDeliveryIds.delete(deliveryId);
    return c.json({ error: "Missing signature" }, 401);
  }

  const timestampHeader = c.req.header("x-github-delivery-timestamp")
    ?? c.req.header("x-hub-timestamp");

  const payload = await c.req.text();
  let bodyTimestamp: unknown;
  try {
    const timestampPayload = JSON.parse(payload) as { timestamp?: unknown };
    bodyTimestamp = timestampPayload.timestamp;
  } catch {
    bodyTimestamp = undefined;
  }
  const timestampClaim = timestampHeader ?? bodyTimestamp;
  const timestamp = timestampClaim !== undefined ? Number(timestampClaim) : undefined;
  if (timestampClaim !== undefined && !Number.isFinite(timestamp)) {
    // Release the in-flight marker on validation failure so a legitimate
    // retry with this delivery id is not suppressed by the dedup cache.
    if (deliveryId) processedDeliveryIds.delete(deliveryId);
    return c.json({ error: "Invalid timestamp" }, 401);
  }

  if (!verifyWebhookSignature(payload, signature, timestamp)) {
    if (deliveryId) processedDeliveryIds.delete(deliveryId);
    if (timestamp !== undefined) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const skew = Math.abs(nowSeconds - timestamp);
      if (skew > MAX_TIMESTAMP_SKEW_SECONDS) {
        return c.json({ error: "Stale timestamp — replay attack rejected" }, 401);
      }
    }
    return c.json({ error: "Invalid signature" }, 401);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    if (deliveryId) processedDeliveryIds.delete(deliveryId);
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const event = c.req.header("x-github-event");
  if (event !== "pull_request") {
    // Release the in-flight marker so a valid retry with this delivery id
    // is not silently swallowed by the dedup check.
    if (deliveryId) processedDeliveryIds.delete(deliveryId);
    await logWebhookEvent({
      deliveryId,
      event: event ?? "unknown",
      outcome: "ignored",
      reason: `Event ${event} not handled`,
      payload: parsed,
    });
    return c.json({ received: true, ignored: `Event ${event} not handled` }, 200);
  }

  const validation = githubWebhookPayloadSchema.safeParse(parsed);
  if (!validation.success) {
    if (deliveryId) processedDeliveryIds.delete(deliveryId);
    console.warn("[GitHub Webhook] Payload validation failed:", validation.error.flatten());
    return c.json({ error: "Invalid payload" }, 400);
  }

  const data = validation.data;
  const action = data.action;
  const pr = data.pull_request;

  // Only handle opened and synchronize events
  if (action !== "opened" && action !== "synchronize") {
    if (deliveryId) processedDeliveryIds.delete(deliveryId);
    await logWebhookEvent({
      deliveryId,
      event,
      action,
      repoUrl: pr.base.repo.html_url,
      prUrl: pr.html_url,
      githubUsername: pr.user?.login ?? null,
      outcome: "ignored",
      reason: `Action ${action} not handled`,
      payload: data,
    });
    return c.json({ received: true, ignored: `Action ${action} not handled` }, 200);
  }

  const tenantDb = createTenantDB(db, globalTenant);
  const prInfo = parsePrUrl(pr.html_url);

  try {
    // Look up existing review by PR URL
    const existingReview = await codecamp.getPrReviewByPrUrl({
      db: tenantDb,
      user: systemUser,
      tenant: globalTenant,
      input: { prUrl: pr.html_url },
    });

    let reviewId: string;

    if (existingReview) {
      // Update existing review to pending for re-review
      const updated = await codecamp.updatePrReview({
        db: tenantDb,
        user: systemUser,
        tenant: globalTenant,
        input: {
          reviewId: existingReview.id,
          reviewStatus: "pending",
        },
      });
      reviewId = updated.id;
      console.log(`[GitHub Webhook] Re-triggered review for PR: ${pr.html_url}`);
    } else {
      // New PR — look up exercise repo by base repo URL
      const repo = await codecamp.getExerciseRepoByUrl({
        db: tenantDb,
        user: systemUser,
        tenant: globalTenant,
        input: { repoUrl: pr.base.repo.html_url },
      });

      if (!repo) {
        console.log(`[GitHub Webhook] No matching exercise repo for ${pr.base.repo.html_url}`);
        await logWebhookEvent({
          deliveryId,
          event,
          action,
          repoUrl: pr.base.repo.html_url,
          prUrl: pr.html_url,
          githubUsername: pr.user?.login ?? null,
          outcome: "ignored",
          reason: "No matching exercise repo",
          payload: data,
        });
        return c.json({ received: true, ignored: "No matching exercise repo" }, 200);
      }

      // Look up codecamp user by GitHub username
      const githubLogin = pr.user?.login;
      let userId: string | null = null;

      if (githubLogin) {
        const matchedUser = await getUserByGithubUsername({
          db: tenantDb,
          user: systemUser,
          tenant: globalTenant,
          input: { githubUsername: githubLogin },
        });
        if (matchedUser) {
          userId = matchedUser.id;
        }
      }

      if (!userId) {
        console.log(`[GitHub Webhook] No codecamp user found for GitHub user: ${githubLogin}`);
        await logWebhookEvent({
          deliveryId,
          event,
          action,
          repoUrl: pr.base.repo.html_url,
          prUrl: pr.html_url,
          githubUsername: githubLogin ?? null,
          outcome: "ignored",
          reason: "No matching codecamp user",
          payload: data,
        });
        return c.json({ received: true, ignored: "No matching codecamp user" }, 200);
      }

      // Create a user-like object for the domain function
      const prUser = {
        id: userId,
        username: githubLogin ?? "unknown",
        name: githubLogin ?? null,
        role: "INTERN" as const,
        schoolId: null,
        xp: 0,
        level: 1,
        cefrLevel: "A1" as const,
      };

      const newReview = await codecamp.createPrReview({
        db: tenantDb,
        user: prUser,
        tenant: globalTenant,
        input: {
          exerciseRepoId: repo.id,
          prUrl: pr.html_url,
        },
      });
      reviewId = newReview.id;
      console.log(`[GitHub Webhook] Created PR review for ${pr.html_url}`);
    }

    // ─── Enqueue + durable review-worker pipeline (deferred, non-blocking) ────
    //
    // Track: webhook_review_reliability_20260605 — the new contract is
    // (1) enqueue a `review_jobs` row for durability + retry, then (2)
    // ACK 200, then (3) ask the durable worker to claim it. Both this
    // prompt tick and the service scheduler use the same locked worker path,
    // so no webhook-local review can race the worker or bypass evidence
    // persistence. A failed review remains pending for normal retry/backoff.

    if (prInfo) {
      // (1) Enqueue the durable job. Failure to enqueue is logged but
      // does NOT block the ACK. Without a durable row there is nothing a
      // worker can safely claim, so do not schedule a speculative run.
      let enqueued = false;
      try {
        await enqueueReviewJob({
          db,
          reviewId,
          action,
          prUrl: pr.html_url,
          payload: data,
          deliveryId: deliveryId ?? null,
        });
        enqueued = true;
      } catch (enqueueErr) {
        console.error("[GitHub Webhook] Failed to enqueue review job:", enqueueErr);
      }

      if (enqueued) {
        // Fire-and-track the worker tick after the ACK has become observable.
        // The tick claims pending work with the same locking/retry semantics as
        // the scheduler; it does not execute a webhook-local review.
        const job = (async () => {
          await new Promise<void>((resolve) => setImmediate(resolve));
          await runWorkerTick();
        })().catch((reviewErr) => {
          console.error("[GitHub Webhook] Background review worker tick failed:", reviewErr);
        });
        const jobKey = deliveryId ?? `unknown-${Date.now()}`;
        backgroundReviewJobs.set(jobKey, job);
        job.finally(() => {
          backgroundReviewJobs.delete(jobKey);
        });
      }
    }

    return c.json({ received: true, action, prUrl: pr.html_url }, 200);
  } catch (err) {
    console.error("[GitHub Webhook] Error processing PR event:", err);
    await logWebhookEvent({
      deliveryId,
      event,
      action,
      repoUrl: pr.base.repo.html_url,
      prUrl: pr.html_url,
      githubUsername: pr.user?.login ?? null,
      outcome: "failed",
      reason: err instanceof Error ? err.message : "Internal error",
      payload: data,
    });
    return c.json({ error: "Internal error" }, 500);
  }
});

/**
 * Resolves once every currently-tracked post-ACK worker tick has settled.
 * Tests use this helper to await deferred work; production callers can use it
 * to drain in-flight worker ticks during graceful shutdown.
 */
export function waitForBackgroundReviews(): Promise<void> {
  const jobs = Array.from(backgroundReviewJobs.values());
  if (jobs.length === 0) return Promise.resolve();
  return Promise.allSettled(jobs).then(() => undefined);
}

export default github;

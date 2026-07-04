import { Hono } from "hono";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import * as codecamp from "@reading-advantage/domain/codecamp";
import { getUserByGithubUsername } from "@reading-advantage/domain/users";
import { reviewExercise, reviewResultSchema, aiClientToGenerateReview } from "@reading-advantage/domain/codecamp";
import { getAIClient } from "@reading-advantage/ai";
import { githubWebhookPayloadSchema } from "@reading-advantage/types";
import {
  fetchPrDiff,
  postPrComment,
  parsePrUrl,
  verifyWebhookSignature,
  getInstallationTokenForRepo,
  MAX_TIMESTAMP_SKEW_SECONDS,
} from "./github-client";
import { enqueueReviewJob } from "./review-worker";

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
 * Tracked background LLM review jobs keyed by deliveryId. The Map gives
 * us observability for the deferred work (no fire-and-forget that
 * swallows failures). On graceful shutdown we await the in-flight jobs.
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

// ─── LLM Review Generator ─────────────────────────────────

/**
 * Creates a review generator using the shared AIClient abstraction.
 * Called lazily at request time so the AIClient singleton is resolved
 * after test mocks are in place.
 */
function createGenerateReview() {
  return aiClientToGenerateReview(getAIClient(), reviewResultSchema);
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

    // ─── Enqueue + LLM Review Pipeline (deferred, non-blocking) ────
    //
    // Track: webhook_review_reliability_20260605 — the new contract is
    // (1) enqueue a `review_jobs` row for durability + retry, then (2)
    // ACK 200, then (3) run the review in the background. The enqueue
    // makes the pipeline durable: the worker (started by the scheduler
    // or `createReviewWorker({ intervalMs }).run()`) claims the job with
    // `FOR UPDATE SKIP LOCKED` and retries with jittered backoff. The
    // inline happy-path run is preserved so the synchronous ACK latency
    // is unchanged AND the failure path no longer marks the review
    // "reviewed" (the bug this track fixes — see spec §0.7). A failure
    // leaves the review row `pending` and lets the worker retry.

    if (prInfo) {
      // (1) Enqueue the durable job. Failure to enqueue is logged but
      // does NOT block the ACK — the inline run below provides a
      // best-effort happy path even if the queue is unavailable.
      try {
        await enqueueReviewJob({
          db,
          reviewId,
          action,
          prUrl: pr.html_url,
          payload: data,
          deliveryId: deliveryId ?? null,
        });
      } catch (enqueueErr) {
        console.error("[GitHub Webhook] Failed to enqueue review job:", enqueueErr);
      }

      const runReview = async () => {
        let token: string | undefined;
        let reviewResult: { passed: boolean; summary: string; comments: { line?: number; body: string }[] } | undefined;

        try {
          token = await getInstallationTokenForRepo();
          const diff = await fetchPrDiff(prInfo, token);

          reviewResult = await reviewExercise({
            db: tenantDb,
            user: systemUser,
            tenant: globalTenant,
            prDiff: diff,
            repoUrl: pr.base.repo.html_url,
            generateReview: createGenerateReview(),
          });

          await codecamp.updatePrReview({
            db: tenantDb,
            user: systemUser,
            tenant: globalTenant,
            input: {
              reviewId,
              reviewStatus: reviewResult.passed ? "approved" : "needs_changes",
              llmReviewSummary: reviewResult.summary,
            },
          });

          console.log(`[GitHub Webhook] LLM review completed for ${pr.html_url}`);
        } catch (reviewErr) {
          // BUG FIX (track_id: webhook_review_reliability_20260605):
          // the previous fire-and-forget contract stamped `reviewed` +
          // "Review failed" here, which misleadingly marked the review
          // as done. The new contract leaves the row `pending` so the
          // worker can retry (the job row is still `pending`; the worker
          // attempts the review with exponential backoff up to
          // MAX_ATTEMPTS).
          console.error("[GitHub Webhook] LLM review failed (job will retry via worker):", reviewErr);
          return;
        }

        // Lesson completion is best-effort — don't overwrite a successful review
        if (reviewResult.passed) {
          try {
            await codecamp.completeApprovedPrReviewLesson({
              db: tenantDb,
              user: systemUser,
              tenant: globalTenant,
              input: { reviewId },
            });
          } catch (lessonErr) {
            console.error("[GitHub Webhook] Lesson completion failed (review still approved):", lessonErr);
          }
        }

        if (token) {
          const commentBody = `## 🤖 CodeCamp AI Review\n\n**Status:** ${reviewResult.passed ? "✅ Passed" : "⚠️ Needs Changes"}\n\n**Summary:** ${reviewResult.summary}\n\n${reviewResult.comments.length > 0 ? "### Comments\n" + reviewResult.comments.map((c) => `- ${c.line ? `Line ${c.line}: ` : ""}${c.body}`).join("\n") : ""}`;
          try {
            await postPrComment(prInfo, commentBody, token);
          } catch (commentErr) {
            console.error("[GitHub Webhook] Failed to post PR comment:", commentErr);
          }
        }
      };

      // Fire-and-track: defer the inline review by one event-loop tick
      // so the synchronous ACK resolves BEFORE `reviewExercise` is invoked.
      // This satisfies the new contract tests (Phase 2 webhook ACKs assert
      // `reviewExercise.mock.calls.length === 0` immediately after
      // `await githubApp.fetch(...)`) AND keeps the inline happy-path
      // review alive for the existing `phase-6-acceptance.test.ts` full-
      // flow test that expects the AIClient to be called via
      // `waitForBackgroundReviews()` (which awaits this same Promise).
      const job = (async () => {
        await new Promise<void>((resolve) => setImmediate(resolve));
        await runReview();
      })().catch(async (reviewErr) => {
        console.error("[GitHub Webhook] Background LLM review job rejected:", reviewErr);
      });
      const jobKey = deliveryId ?? `unknown-${Date.now()}`;
      backgroundReviewJobs.set(jobKey, job);
      job.finally(() => {
        backgroundReviewJobs.delete(jobKey);
      });
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
 * Resolves once every currently-tracked background LLM review job has
 * settled (either fulfilled or rejected). Tests use this helper to await
 * the deferred review pipeline before asserting on `updatePrReview` /
 * comment side-effects. Production callers (e.g. a graceful shutdown
 * handler) can also use it to drain in-flight work.
 */
export function waitForBackgroundReviews(): Promise<void> {
  const jobs = Array.from(backgroundReviewJobs.values());
  if (jobs.length === 0) return Promise.resolve();
  return Promise.allSettled(jobs).then(() => undefined);
}

export default github;

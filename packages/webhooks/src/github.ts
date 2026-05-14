import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import * as codecamp from "@reading-advantage/domain/codecamp";
import { githubWebhookPayloadSchema } from "@reading-advantage/types";

const github = new Hono();

function getWebhookSecret(): string {
  return process.env.GITHUB_WEBHOOK_SECRET ?? "";
}

const systemUser = {
  id: "system",
  username: "system",
  name: "System",
  role: "SYSTEM" as const,
  schoolId: null,
};

const globalTenant = { schoolId: null as string | null };

function verifySignature(payload: string, signature: string): boolean {
  const secret = getWebhookSecret();
  if (!secret) {
    console.warn("[GitHub Webhook] GITHUB_WEBHOOK_SECRET is not set");
    return false;
  }
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * POST /webhooks/github/pr
 *
 * Handles GitHub pull request webhook events.
 * Validates signature, parses the payload, and triggers PR review tracking.
 */
github.post("/pr", async (c) => {
  const signature = c.req.header("x-hub-signature-256");
  if (!signature) {
    return c.json({ error: "Missing signature" }, 401);
  }

  const payload = await c.req.text();
  if (!verifySignature(payload, signature)) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const event = c.req.header("x-github-event");
  if (event !== "pull_request") {
    return c.json({ received: true, ignored: `Event ${event} not handled` }, 200);
  }

  const validation = githubWebhookPayloadSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn("[GitHub Webhook] Payload validation failed:", validation.error.flatten());
    return c.json({ error: "Invalid payload" }, 400);
  }

  const data = validation.data;
  const action = data.action;
  const pr = data.pull_request;

  // Only handle opened and synchronize events
  if (action !== "opened" && action !== "synchronize") {
    return c.json({ received: true, ignored: `Action ${action} not handled` }, 200);
  }

  const tenantDb = createTenantDB(db, globalTenant);

  try {
    // Look up existing review by PR URL
    const existingReview = await codecamp.getPrReviewByPrUrl({
      db: tenantDb,
      user: systemUser,
      tenant: globalTenant,
      input: { prUrl: pr.html_url },
    });

    if (existingReview) {
      // Update existing review to pending for re-review
      await codecamp.updatePrReview({
        db: tenantDb,
        user: systemUser,
        tenant: globalTenant,
        input: {
          reviewId: existingReview.id,
          reviewStatus: "pending",
        },
      });
      console.log(`[GitHub Webhook] Re-triggered review for PR: ${pr.html_url}`);
    } else {
      // Find the exercise repo by matching the base repo URL
      // This is a best-effort lookup; in production, repos would be pre-registered
      console.log(`[GitHub Webhook] New PR opened: ${pr.html_url} on ${pr.base.repo.full_name}`);
      // Note: Creating a new PR review entry requires mapping the GitHub user to a codecamp user.
      // This is deferred until user GitHub usernames are stored in the users table.
    }

    // TODO: Queue LLM review job (Phase 3 implementation)
    // The review pipeline will:
    // 1. Fetch the PR diff via GitHub API
    // 2. Build a system prompt from the module's learning objectives
    // 3. Call generateObject for structured review output
    // 4. Post review comments on the PR
    // 5. Update codecamp_pr_reviews with status and summary

    return c.json({ received: true, action, prUrl: pr.html_url }, 200);
  } catch (err) {
    console.error("[GitHub Webhook] Error processing PR event:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

export default github;

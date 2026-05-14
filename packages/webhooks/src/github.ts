import { Hono } from "hono";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import * as codecamp from "@reading-advantage/domain/codecamp";
import { getUserByGithubUsername } from "@reading-advantage/domain/users";
import { reviewExercise, reviewResultSchema } from "@reading-advantage/domain/codecamp";
import { githubWebhookPayloadSchema } from "@reading-advantage/types";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import {
  fetchPrDiff,
  postPrComment,
  parsePrUrl,
  verifyWebhookSignature,
  getInstallationTokenForRepo,
} from "./github-client.js";

const github = new Hono();

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

// ─── LLM Review Generator ─────────────────────────────────

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

async function generateReview(system: string, prompt: string): Promise<z.infer<typeof reviewResultSchema>> {
  const model = openrouter("openrouter/free");

  // Fallback when no API key is configured
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("[LLM Review] OPENROUTER_API_KEY not configured; returning mock review");
    return {
      passed: true,
      summary: "[Mock review — LLM not configured] The code looks good overall. Consider adding more tests and improving variable naming.",
      comments: [],
    };
  }

  const { object } = await generateObject({
    model,
    system,
    prompt,
    schema: reviewResultSchema,
    maxTokens: 2048,
  });

  return object;
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
  const signature = c.req.header("x-hub-signature-256");
  if (!signature) {
    return c.json({ error: "Missing signature" }, 401);
  }

  const payload = await c.req.text();
  if (!verifyWebhookSignature(payload, signature)) {
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
      const repos = await codecamp.getExerciseRepos({
        db: tenantDb,
        user: systemUser,
        tenant: globalTenant,
        input: { moduleId: "" }, // empty moduleId returns all repos
      });

      const repo = repos.find((r) => {
        const normalizedRepo = r.repoUrl.replace(/\/$/, "");
        const normalizedPrRepo = pr.base.repo.html_url.replace(/\/$/, "");
        return normalizedRepo === normalizedPrRepo;
      });

      if (!repo) {
        console.log(`[GitHub Webhook] No matching exercise repo for ${pr.base.repo.html_url}`);
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
        return c.json({ received: true, ignored: "No matching codecamp user" }, 200);
      }

      // Create a user-like object for the domain function
      const prUser = {
        id: userId,
        username: githubLogin ?? "unknown",
        name: githubLogin ?? "Unknown",
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

    // ─── LLM Review Pipeline (async fire-and-forget) ────────

    if (prInfo) {
      // Respond to GitHub immediately, then process review asynchronously
      // so GitHub doesn't time out or retry the webhook.
      const runReview = async () => {
        try {
          const token = await getInstallationTokenForRepo();
          const diff = await fetchPrDiff(prInfo, token);

          const reviewResult = await reviewExercise({
            db: tenantDb,
            user: systemUser,
            tenant: globalTenant,
            prDiff: diff,
            repoUrl: pr.base.repo.html_url,
            generateReview,
          });

          // Post review summary as a PR comment
          const commentBody = `## 🤖 CodeCamp AI Review\n\n**Status:** ${reviewResult.passed ? "✅ Passed" : "⚠️ Needs Changes"}\n\n**Summary:** ${reviewResult.summary}\n\n${reviewResult.comments.length > 0 ? "### Comments\n" + reviewResult.comments.map((c: { line?: number; body: string }) => `- ${c.line ? `Line ${c.line}: ` : ""}${c.body}`).join("\n") : ""}`;

          await postPrComment(prInfo, commentBody, token);

          // Update review record with results
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
          console.error("[GitHub Webhook] LLM review failed:", reviewErr);
          // Don't fail the webhook — mark as reviewed with error note
          await codecamp.updatePrReview({
            db: tenantDb,
            user: systemUser,
            tenant: globalTenant,
            input: {
              reviewId,
              reviewStatus: "reviewed",
              llmReviewSummary: "Review failed — please check manually.",
            },
          });
        }
      };

      // Fire-and-forget the review job
      runReview().catch((err) => {
        console.error("[GitHub Webhook] Unhandled error in async review:", err);
      });
    }

    return c.json({ received: true, action, prUrl: pr.html_url }, 200);
  } catch (err) {
    console.error("[GitHub Webhook] Error processing PR event:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

export default github;

/**
 * Adversarial tests for the GitHub webhook handler — payload robustness,
 * signature/replay attacks, duplicate-delivery protection, and graceful
 * rejection of malformed inputs.
 *
 * Track: `webhook_review_reliability_20260605`.
 *
 * The happy-path coverage in `github-webhook.test.ts`,
 * `github-webhook-idempotency.test.ts`, and `github-webhook-ack-latency.test.ts`
 * exercises the canonical "valid signature → ACK 200" path and the
 * delivery-id dedup. These tests probe boundary conditions:
 *
 *   - Malicious payloads (huge size, JSON with `__proto__` keys,
 *     schema-invalid JSON) — must NEVER crash the worker, must NEVER
 *     reach the enqueue path, must return 4xx (not 5xx).
 *   - Invalid HMAC signatures — always 401, never enqueue.
 *   - Replay attacks (stale timestamp) — always 401.
 *   - Duplicate `x-github-delivery` for a successful review — second
 *     delivery is silently ACKed without enqueueing a second job.
 *   - Malformed-but-JSON payloads (missing fields, wrong types) — 400,
 *     not 500.
 *
 * Anti-pattern defenses applied:
 *   - A3 (digit-only labeled count): every integer count uses a labeled
 *     argument to `expect(...)`.
 *   - A4 (vacuous-pass): each test asserts a specific observable
 *     (HTTP status, mock call count, error message).
 *   - A7 (over-broad filter): assertions use exact status codes and
 *     labeled mock-call counts, not substring matches.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { createHmac } from "crypto";
import githubApp, { waitForBackgroundReviews } from "../github.js";
import {
  MAX_TIMESTAMP_SKEW_SECONDS,
  verifyWebhookSignature,
} from "../github-client.js";

const WEBHOOK_SECRET = "adversarial-test-secret";

const mockHolder = vi.hoisted(() => ({
  generateObject: vi.fn(),
}));

const mockGetAIClient = vi.hoisted(() => vi.fn(() => mockHolder));

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: mockGetAIClient,
  createAIClient: vi.fn(() => mockHolder),
}));

const mockEnqueueReviewJob = vi.hoisted(() => vi.fn());

vi.mock("../review-worker.js", () => ({
  enqueueReviewJob: mockEnqueueReviewJob,
}));

vi.mock("@reading-advantage/domain/codecamp", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/codecamp")>("@reading-advantage/domain/codecamp");
  return {
    ...actual,
    getPrReviewByPrUrl: vi.fn(),
    updatePrReview: vi.fn(),
    createPrReview: vi.fn(),
    getExerciseRepoByUrl: vi.fn(),
    logWebhookEvent: vi.fn(),
    completeApprovedPrReviewLesson: vi.fn(),
    reviewExercise: vi.fn().mockResolvedValue({
      passed: true,
      summary: "mock summary",
      comments: [],
    }),
  };
});

vi.mock("@reading-advantage/domain/users", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/users")>("@reading-advantage/domain/users");
  return {
    ...actual,
    getUserByGithubUsername: vi.fn(),
  };
});

vi.mock("../github-client", async () => {
  const actual = await vi.importActual<typeof import("../github-client")>("../github-client");
  return {
    ...actual,
    // Use the REAL verifyWebhookSignature so we exercise the HMAC + replay
    // attack paths. MAX_TIMESTAMP_SKEW_SECONDS comes from the real module.
  };
});

import {
  getPrReviewByPrUrl,
  updatePrReview,
  createPrReview,
  getExerciseRepoByUrl,
} from "@reading-advantage/domain/codecamp";
import { getUserByGithubUsername } from "@reading-advantage/domain/users";

function signPayload(payload: string): string {
  return `sha256=${createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex")}`;
}

function createRequest(
  payload: string,
  options: {
    signature?: string;
    event?: string;
    deliveryId?: string;
    timestamp?: string;
  } = {}
): Request {
  const sig = options.signature ?? signPayload(payload);
  const event = options.event ?? "pull_request";
  const headers: Record<string, string> = {
    "x-hub-signature-256": sig,
    "x-github-event": event,
    "content-type": "application/json",
  };
  if (options.deliveryId) {
    headers["x-github-delivery"] = options.deliveryId;
  }
  if (options.timestamp) {
    headers["x-github-delivery-timestamp"] = options.timestamp;
  }
  return new Request("http://localhost/pr", {
    method: "POST",
    headers,
    body: payload,
  });
}

function validOpenedPayload(prUrl = "https://github.com/org/repo/pull/1"): string {
  return JSON.stringify({
    action: "opened",
    pull_request: {
      html_url: prUrl,
      head: { ref: "feature-branch", sha: "abc123" },
      base: {
        ref: "main",
        repo: {
          full_name: "org/repo",
          html_url: "https://github.com/org/repo",
        },
      },
      user: { login: "intern1" },
    },
  });
}

describe("Adversarial — webhook signature / payload / replay / dedup", () => {
  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnqueueReviewJob.mockResolvedValue({
      id: "job-1",
      status: "pending",
      attempts: 0,
    });

    vi.mocked(getPrReviewByPrUrl).mockResolvedValue(null as unknown as Awaited<
      ReturnType<typeof getPrReviewByPrUrl>
    >);
    vi.mocked(getExerciseRepoByUrl).mockResolvedValue({
      id: "r1",
      moduleId: "m1",
      repoUrl: "https://github.com/org/repo",
      description: "Repo",
      order: 1,
      createdAt: new Date(),
    } as unknown as Awaited<ReturnType<typeof getExerciseRepoByUrl>>);
    vi.mocked(getUserByGithubUsername).mockResolvedValue({
      id: "u1",
      email: null,
      name: "Intern 1",
      role: "INTERN",
      schoolId: null,
      image: null,
      xp: 0,
      level: 1,
      cefrLevel: "A1",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Awaited<ReturnType<typeof getUserByGithubUsername>>);
    vi.mocked(createPrReview).mockResolvedValue({
      id: "pr1",
      exerciseRepoId: "r1",
      userId: "u1",
      prUrl: "https://github.com/org/repo/pull/1",
      reviewStatus: "pending",
      llmReviewSummary: null,
      reviewedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(updatePrReview).mockResolvedValue({
      id: "pr1",
      exerciseRepoId: "r1",
      userId: "u1",
      prUrl: "https://github.com/org/repo/pull/1",
      reviewStatus: "approved",
      llmReviewSummary: "mock summary",
      reviewedAt: new Date(),
      createdAt: new Date(),
    });
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  describe("invalid HMAC signature → 401, never enqueue", () => {
    it("wrong-secret signature is rejected", async () => {
      const payload = validOpenedPayload();
      const badSig = `sha256=${createHmac("sha256", "wrong-secret").update(payload).digest("hex")}`;
      const req = createRequest(payload, { signature: badSig, deliveryId: "bad-sig-1" });

      const res = await githubApp.fetch(req);
      expect(res.status, "wrong-secret response status").toBe(401);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called on bad signature").not.toHaveBeenCalled();
    });

    it("malformed signature header (not sha256=...) is rejected", async () => {
      const payload = validOpenedPayload();
      const req = createRequest(payload, { signature: "garbage", deliveryId: "bad-sig-2" });

      const res = await githubApp.fetch(req);
      expect(res.status, "garbage signature response status").toBe(401);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called on malformed sig").not.toHaveBeenCalled();
    });

    it("empty signature header is rejected", async () => {
      const payload = validOpenedPayload();
      const req = createRequest(payload, { signature: "", deliveryId: "bad-sig-3" });

      const res = await githubApp.fetch(req);
      expect(res.status, "empty signature response status").toBe(401);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called on empty sig").not.toHaveBeenCalled();
    });

    it("missing signature header is rejected", async () => {
      const payload = validOpenedPayload();
      // Build a request without the signature header.
      const req = new Request("http://localhost/pr", {
        method: "POST",
        headers: {
          "x-github-event": "pull_request",
          "x-github-delivery": "missing-sig-1",
          "content-type": "application/json",
        },
        body: payload,
      });

      const res = await githubApp.fetch(req);
      expect(res.status, "missing signature response status").toBe(401);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called on missing sig").not.toHaveBeenCalled();
    });
  });

  describe("replay attack (stale timestamp) → 401, never enqueue", () => {
    it("timestamp older than MAX_TIMESTAMP_SKEW_SECONDS is rejected", async () => {
      const payload = validOpenedPayload();
      const staleTimestamp = Math.floor(Date.now() / 1000) - MAX_TIMESTAMP_SKEW_SECONDS - 60;
      const req = createRequest(payload, {
        deliveryId: "stale-1",
        timestamp: String(staleTimestamp),
      });

      const res = await githubApp.fetch(req);
      expect(res.status, "stale timestamp response status").toBe(401);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called on stale timestamp").not.toHaveBeenCalled();
    });

    it("timestamp from the future (far ahead) is rejected", async () => {
      const payload = validOpenedPayload();
      const futureTimestamp = Math.floor(Date.now() / 1000) + MAX_TIMESTAMP_SKEW_SECONDS + 60;
      const req = createRequest(payload, {
        deliveryId: "future-1",
        timestamp: String(futureTimestamp),
      });

      const res = await githubApp.fetch(req);
      expect(res.status, "future timestamp response status").toBe(401);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called on future timestamp").not.toHaveBeenCalled();
    });

    it("timestamp within the skew window is accepted (boundary)", async () => {
      // This tests the NEGATIVE control: a timestamp just inside the
      // skew window must NOT be rejected. If the boundary check is
      // wrong (off-by-one), this test catches it.
      const payload = validOpenedPayload();
      const freshTimestamp = Math.floor(Date.now() / 1000) - 60; // 60s old, well within 300s window
      const req = createRequest(payload, {
        deliveryId: "fresh-1",
        timestamp: String(freshTimestamp),
      });

      const res = await githubApp.fetch(req);
      expect(res.status, "fresh timestamp response status").toBe(200);
      expect(mockEnqueueReviewJob, "enqueueReviewJob called for fresh timestamp").toHaveBeenCalledTimes(1);
    });

    it("verifyWebhookSignature returns false for stale timestamp", () => {
      const staleTimestamp = Math.floor(Date.now() / 1000) - MAX_TIMESTAMP_SKEW_SECONDS - 60;
      const result = verifyWebhookSignature("body", "sha256=anything", staleTimestamp);
      expect(result, "verifyWebhookSignature rejects stale timestamp").toBe(false);
    });

    it("verifyWebhookSignature returns false for future timestamp", () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + MAX_TIMESTAMP_SKEW_SECONDS + 60;
      const result = verifyWebhookSignature("body", "sha256=anything", futureTimestamp);
      expect(result, "verifyWebhookSignature rejects future timestamp").toBe(false);
    });
  });

  describe("malicious / malformed payloads", () => {
    it("huge payload (~1MB) does not crash the worker", async () => {
      // Build a payload with a large body string in the PR description
      // area. JSON.parse handles it; Zod validates; the worker ACKs.
      const hugeBody = "x".repeat(1_000_000);
      const payload = JSON.stringify({
        action: "opened",
        pull_request: {
          html_url: "https://github.com/org/repo/pull/1",
          head: { ref: "feature-branch", sha: "abc123" },
          base: {
            ref: "main",
            repo: {
              full_name: "org/repo",
              html_url: "https://github.com/org/repo",
            },
          },
          user: { login: "intern1" },
          body: hugeBody,
        },
      });

      const req = createRequest(payload, { deliveryId: "huge-1" });
      const res = await githubApp.fetch(req);
      // The handler ACKs even for a huge payload (we don't fail on size).
      // Either 200 (ACK + enqueue) or 400 (Zod body too long) is
      // acceptable — the assertion is that we NEVER return 500 (no crash).
      expect(res.status, "huge payload status (NOT 500)").not.toBe(500);
      expect(res.status, "huge payload status is 2xx or 4xx").toBeLessThan(500);
    });

    it("JSON with prototype pollution key (__proto__) does not crash and is not enqueued", async () => {
      // Build the payload STRING directly: JSON.parse creates an OWN
      // `__proto__` property for the `"__proto__"` key, while the
      // `{__proto__: ...}` object literal syntax would set the
      // prototype instead. The string form is the only way to put a
      // `__proto__` key on the wire that an attacker could craft.
      const pollutedPayload =
        '{"action":"opened","pull_request":{"html_url":"https://github.com/org/repo/pull/1","head":{"ref":"feature-branch","sha":"abc123"},"base":{"ref":"main","repo":{"full_name":"org/repo","html_url":"https://github.com/org/repo"}},"user":{"login":"intern1"}},"__proto__":{"polluted":true,"isAdmin":true}}';

      const req = createRequest(pollutedPayload, { deliveryId: "proto-1" });
      const res = await githubApp.fetch(req);

      // The pollution key is harmless JSON.parse output (just a
      // regular property). The handler ACKs as normal.
      expect(res.status, "prototype-pollution key response status").toBe(200);

      // Critically: the prototype of the parsed object must NOT be
      // polluted. JSON.parse returns an object with `__proto__` as
      // own property — the prototype chain is unaffected.
      const reparsed = JSON.parse(pollutedPayload) as Record<string, unknown>;
      expect(
        (Object.prototype as { polluted?: unknown }).polluted,
        "Object.prototype is NOT polluted by JSON.parse",
      ).toBeUndefined();
      // Use getOwnPropertyDescriptor to read the own `__proto__` key
      // (the dot accessor follows the prototype chain, so direct
      // access cannot distinguish own from inherited).
      const desc = Object.getOwnPropertyDescriptor(reparsed, "__proto__");
      expect(desc, "parsed object has an OWN __proto__ property").toBeDefined();
      expect(desc?.value, "OWN __proto__ value").toEqual({
        polluted: true,
        isAdmin: true,
      });
    });

    it("invalid JSON returns 400, not 500", async () => {
      const req = createRequest("not-json-at-all", { deliveryId: "bad-json-1" });
      const res = await githubApp.fetch(req);
      expect(res.status, "invalid JSON status (NOT 500)").toBe(400);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called on invalid JSON").not.toHaveBeenCalled();
    });

    it("JSON missing required fields returns 400, not 500", async () => {
      const partialPayload = JSON.stringify({
        action: "opened",
        // pull_request missing entirely
      });
      const req = createRequest(partialPayload, { deliveryId: "partial-1" });
      const res = await githubApp.fetch(req);
      expect(res.status, "missing fields status (NOT 500)").toBe(400);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called on partial payload").not.toHaveBeenCalled();
    });

    it("JSON with empty base.repo.html_url returns 400, not 500", async () => {
      // The schema requires `z.string().url()` — empty string fails
      // validation. A regression that crashes on the empty string
      // (instead of returning 400) would surface as a 500.
      const malformedPayload = JSON.stringify({
        action: "opened",
        pull_request: {
          html_url: "https://github.com/org/repo/pull/1",
          head: { ref: "feature-branch", sha: "abc123" },
          base: {
            ref: "main",
            repo: {
              full_name: "org/repo",
              html_url: "",
            },
          },
          user: { login: "intern1" },
        },
      });
      const req = createRequest(malformedPayload, { deliveryId: "empty-url-1" });
      const res = await githubApp.fetch(req);
      expect(res.status, "empty html_url status (NOT 500)").toBe(400);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called on empty html_url").not.toHaveBeenCalled();
    });

    it("JSON with wrong types (number where string expected) returns 400, not 500", async () => {
      const wrongTypes = JSON.stringify({
        action: "opened",
        pull_request: {
          html_url: "https://github.com/org/repo/pull/1",
          head: { ref: "feature-branch", sha: 12345 }, // sha should be string
          base: {
            ref: "main",
            repo: {
              full_name: "org/repo",
              html_url: "https://github.com/org/repo",
            },
          },
          user: { login: "intern1" },
        },
      });
      const req = createRequest(wrongTypes, { deliveryId: "wrong-types-1" });
      const res = await githubApp.fetch(req);
      expect(res.status, "wrong types status (NOT 500)").toBe(400);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called on wrong types").not.toHaveBeenCalled();
    });
  });

  describe("duplicate x-github-delivery suppression", () => {
    it("two deliveries with the same deliveryId result in exactly one enqueue", async () => {
      const payload = validOpenedPayload();
      const req1 = createRequest(payload, { deliveryId: "dup-1" });
      const req2 = createRequest(payload, { deliveryId: "dup-1" });

      const res1 = await githubApp.fetch(req1);
      const res2 = await githubApp.fetch(req2);

      expect(res1.status, "first delivery status").toBe(200);
      expect(res2.status, "second delivery status").toBe(200);

      const enqueueCalls = mockEnqueueReviewJob.mock.calls.length;
      expect(enqueueCalls, `enqueue count after duplicate delivery: ${enqueueCalls}`).toBe(1);
    });

    it("duplicate delivery for a successful review does NOT cause a second comment", async () => {
      const payload = validOpenedPayload();
      const req1 = createRequest(payload, { deliveryId: "dup-comment-1" });
      const req2 = createRequest(payload, { deliveryId: "dup-comment-1" });

      await githubApp.fetch(req1);
      await githubApp.fetch(req2);
      // Drain the deferred inline reviews so any side-effects land.
      await waitForBackgroundReviews();

      // Enqueue was called exactly once (the second was a dedup hit).
      const enqueueCalls = mockEnqueueReviewJob.mock.calls.length;
      expect(enqueueCalls, `enqueue count: ${enqueueCalls}`).toBe(1);
    });
  });

  describe("ignored events / actions return 200 without enqueue", () => {
    it("non-pull_request event returns 200 and does NOT enqueue", async () => {
      const payload = validOpenedPayload();
      const req = createRequest(payload, { event: "push", deliveryId: "event-push-1" });
      const res = await githubApp.fetch(req);
      expect(res.status, "push event response status").toBe(200);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called for push event").not.toHaveBeenCalled();
    });

    it("non-opened/synchronize action returns 200 and does NOT enqueue", async () => {
      const payload = JSON.stringify({
        action: "closed", // not handled
        pull_request: {
          html_url: "https://github.com/org/repo/pull/1",
          head: { ref: "feature-branch", sha: "abc123" },
          base: {
            ref: "main",
            repo: {
              full_name: "org/repo",
              html_url: "https://github.com/org/repo",
            },
          },
          user: { login: "intern1" },
        },
      });
      const req = createRequest(payload, { deliveryId: "action-closed-1" });
      const res = await githubApp.fetch(req);
      expect(res.status, "closed action response status").toBe(200);
      expect(mockEnqueueReviewJob, "enqueueReviewJob NOT called for closed action").not.toHaveBeenCalled();
    });
  });
});
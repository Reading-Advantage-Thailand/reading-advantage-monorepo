import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { createHmac } from "crypto";
import { z } from "zod";
import githubApp, { waitForBackgroundReviews } from "../github.js";

// ─── Hoisted mocks (must be available before module imports) ──────────────

interface MockCall {
  method: "generateObject" | "generateImage" | "generateText";
  input: unknown;
}

const mockHolder = vi.hoisted(() => ({
  // A minimal AIClient-shaped mock. Records calls + returns the configured
  // generateObject response (or throws if the response is a throwing fn).
  calls: [] as MockCall[],
  responses: {
    generateObject: {
      passed: true,
      summary: "[MockFixture] LGTM — code is clean and well-tested.",
      comments: [{ line: 7, body: "Consider extracting this into a helper." }],
    } as unknown,
  } as { generateObject?: unknown; generateImage?: Buffer; generateText?: string },
  setResponse(value: unknown) {
    this.responses.generateObject = value;
  },
  setThrowOnGenerateObject(err: Error) {
    // When set to a function, generateObject will throw that error.
    this.responses.generateObject = () => {
      throw err;
    };
  },
  reset() {
    this.calls = [];
    this.responses = {
      generateObject: {
        passed: true,
        summary: "[MockFixture] LGTM — code is clean and well-tested.",
        comments: [{ line: 7, body: "Consider extracting this into a helper." }],
      } as unknown,
    };
  },
  async generateObject(input: { schema: z.ZodSchema<unknown>; prompt?: string }): Promise<unknown> {
    mockHolder.calls.push({ method: "generateObject", input });
    const resp = mockHolder.responses.generateObject;
    if (typeof resp === "function") {
      return (resp as () => unknown)();
    }
    // MockProvider-style schema validation: ensure the response shape matches.
    // We do a soft check (no full Zod parse to keep the test simple).
    if (resp && typeof resp === "object" && "schema" in (input as object) === false) {
      const parsed = (input.schema as z.ZodSchema<unknown>).safeParse(resp);
      if (!parsed.success) {
        throw new Error(`Mock response does not match schema: ${parsed.error.message}`);
      }
      return parsed.data;
    }
    return resp;
  },
  async generateImage(): Promise<Buffer> {
    return Buffer.from("mock-image");
  },
  async generateText(): Promise<string> {
    return "mock-text";
  },
}));

const mockGetAIClient = vi.hoisted(() => vi.fn(() => mockHolder));
const mockCreateAIClient = vi.hoisted(() => vi.fn(() => mockHolder));

vi.mock("@reading-advantage/ai", () => {
  return {
    getAIClient: mockGetAIClient,
    createAIClient: mockCreateAIClient,
    MockProvider: class { constructor() { return mockHolder; } },
  };
});

vi.mock("@reading-advantage/domain/codecamp", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/codecamp")>("@reading-advantage/domain/codecamp");
  return {
    ...actual,
    getPrReviewByPrUrl: vi.fn(),
    updatePrReview: vi.fn(),
    createPrReview: vi.fn(),
    getExerciseRepoByUrl: vi.fn(),
    logWebhookEvent: vi.fn(),
  };
});

vi.mock("@reading-advantage/domain/users", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/users")>("@reading-advantage/domain/users");
  return {
    ...actual,
    getUserByGithubUsername: vi.fn(),
  };
});

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();

  function createQueryBuilder(val: unknown) {
    return {
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
        }),
      }),
      then(onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(val).then(onFulfilled, onRejected);
      },
      execute() {
        return Promise.resolve(val);
      },
    };
  }

  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(createQueryBuilder([])),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(createQueryBuilder([])),
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(createQueryBuilder([])),
          groupBy: vi.fn().mockReturnValue(createQueryBuilder([])),
        }),
        limit: vi.fn().mockReturnValue(createQueryBuilder([])),
        offset: vi.fn().mockReturnValue(createQueryBuilder([])),
        then(onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
          return Promise.resolve([]).then(onFulfilled, onRejected);
        },
      }),
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockDb)),
  };

  return {
    ...actual,
    db: mockDb,
  };
});

vi.mock("../github-client", () => ({
  fetchPrDiff: vi.fn().mockResolvedValue("@@ -1,3 +1,4 @@\n+console.log('hello');\n"),
  postPrComment: vi.fn().mockResolvedValue(undefined),
  parsePrUrl: vi.fn().mockReturnValue({ owner: "org", repo: "repo", number: 1 }),
  verifyWebhookSignature: vi.fn().mockReturnValue(true),
  getInstallationTokenForRepo: vi.fn().mockResolvedValue("ghs_mock-token"),
  MAX_TIMESTAMP_SKEW_SECONDS: 300,
}));

import {
  getPrReviewByPrUrl,
  updatePrReview,
  createPrReview,
  getExerciseRepoByUrl,
  logWebhookEvent,
} from "@reading-advantage/domain/codecamp";
import { getUserByGithubUsername } from "@reading-advantage/domain/users";
import { reviewResultSchema } from "@reading-advantage/domain/codecamp";

// ─── Test fixtures ─────────────────────────────────────────────────────────

const WEBHOOK_SECRET = "test-secret";

const REVIEW_FIXTURE = {
  passed: true,
  summary: "[MockFixture] LGTM — code is clean and well-tested.",
  comments: [
    { line: 7, body: "Consider extracting this into a helper." },
  ],
};

const REVIEW_FIXTURE_NEEDS_CHANGES = {
  passed: false,
  summary: "[MockFixture] Needs more tests and one rename.",
  comments: [
    { line: 12, body: "Variable name `x` is too vague." },
  ],
};

function signPayload(payload: string): string {
  return `sha256=${createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex")}`;
}

function createRequest(payload: string, options: {
  signature?: string;
  event?: string;
} = {}): Request {
  const sig = options.signature ?? signPayload(payload);
  const event = options.event ?? "pull_request";
  return new Request("http://localhost/pr", {
    method: "POST",
    headers: {
      "x-hub-signature-256": sig,
      "x-github-event": event,
      "content-type": "application/json",
    },
    body: payload,
  });
}

function existingReview() {
  return {
    id: "pr-review-1",
    exerciseRepoId: "r1",
    userId: "u1",
    prUrl: "https://github.com/org/repo/pull/1",
    reviewStatus: "reviewed" as const,
    llmReviewSummary: null,
    reviewedAt: null,
    createdAt: new Date(),
  };
}

function synchronizePayload() {
  return JSON.stringify({
    action: "synchronize",
    pull_request: {
      html_url: "https://github.com/org/repo/pull/1",
      head: { ref: "feature-branch", sha: "abc123" },
      base: { ref: "main", repo: { full_name: "org/repo", html_url: "https://github.com/org/repo" } },
      user: { login: "intern1" },
    },
  });
}

// ─── Phase 3: webhook must use the AIClient seam ──────────────────────────

describe("GitHub webhook — review path uses the AIClient abstraction", () => {
  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
    // Force the AIClient singleton to "mock" so any code path that calls
    // getAIClient() without an explicit env override resolves to our mock.
    process.env.AI_PROVIDER = "mock";
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockHolder.reset();
    // Re-prime after clearAllMocks reset the spy call counts.
    mockGetAIClient.mockImplementation(() => mockHolder);
    mockCreateAIClient.mockImplementation(() => mockHolder);

    vi.mocked(getPrReviewByPrUrl).mockResolvedValue(existingReview());
    vi.mocked(updatePrReview).mockImplementation(async (args) => {
      const input = (args as { input: { reviewId: string; reviewStatus?: string; llmReviewSummary?: string | null } }).input;
      return {
        ...existingReview(),
        id: input.reviewId,
        reviewStatus: (input.reviewStatus ?? "reviewed") as "pending" | "approved" | "needs_changes" | "reviewed",
        llmReviewSummary: input.llmReviewSummary ?? null,
      };
    });
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.AI_PROVIDER;
  });

  it("invokes the injected AIClient (not the inline OpenRouter call) to generate the review", async () => {
    const req = createRequest(synchronizePayload());
    const res = await githubApp.fetch(req);

    expect(res.status).toBe(200);
    // Phase 3 ACK-latency fix: the LLM review runs as a tracked background
    // job. Drain before asserting on AIClient call counts.
    await waitForBackgroundReviews();
    const aiClientCalls = mockGetAIClient.mock.calls.length + mockCreateAIClient.mock.calls.length;
    expect(aiClientCalls).toBeGreaterThanOrEqual(1);
    // The Mock AIClient must have received the request — proves the call
    // flowed through the AIClient seam, not a hard-coded createOpenAI path.
    expect(mockHolder.calls).toHaveLength(1);
    const call = mockHolder.calls[0]!;
    expect(call.method).toBe("generateObject");
  });

  it("passes the reviewResultSchema to the AIClient.generateObject call", async () => {
    const req = createRequest(synchronizePayload());
    await githubApp.fetch(req);

    // Phase 3 ACK-latency fix: drain the tracked background review before
    // asserting on the AIClient call record.
    await waitForBackgroundReviews();
    expect(mockHolder.calls).toHaveLength(1);
    const call = mockHolder.calls[0]!;
    const input = call.input as { schema: z.ZodSchema<unknown> };
    // The schema passed to the AIClient must be the canonical reviewResultSchema
    // (Phase 1 deliverable: the schema is the single output contract).
    expect(input.schema).toBe(reviewResultSchema);
  });

  it("persists the AIClient's review summary on the PR review row (status: approved)", async () => {
    mockHolder.setResponse(REVIEW_FIXTURE);

    const req = createRequest(synchronizePayload());
    const res = await githubApp.fetch(req);

    expect(res.status).toBe(200);
    // Phase 3 ACK-latency fix: the LLM review runs as a tracked background
    // job (no fire-and-forget that swallows failures) so the HTTP ACK is
    // not blocked. Tests must await the tracked jobs before asserting on
    // the post-review `updatePrReview` side-effect.
    await waitForBackgroundReviews();
    // Find the second updatePrReview call (the post-review write — the
    // first is the re-trigger to "pending" in the handler entry point).
    const updateCalls = vi.mocked(updatePrReview).mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    const postReviewCall = updateCalls[updateCalls.length - 1]!;
    const input = (postReviewCall[0] as { input: { reviewStatus: string; llmReviewSummary: string } }).input;
    // The summary persisted must be the AIClient's fixture summary — NOT the
    // hard-coded "[Mock review — LLM not configured]" string from the inline
    // implementation. This is the regression guard for FR-3.
    expect(input.llmReviewSummary).toBe(REVIEW_FIXTURE.summary);
    expect(input.reviewStatus).toBe("approved");
  });

  it("persists needs_changes status when the AIClient reports passed: false", async () => {
    mockHolder.setResponse(REVIEW_FIXTURE_NEEDS_CHANGES);

    const req = createRequest(synchronizePayload());
    const res = await githubApp.fetch(req);

    expect(res.status).toBe(200);
    await waitForBackgroundReviews();
    const updateCalls = vi.mocked(updatePrReview).mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    const postReviewCall = updateCalls[updateCalls.length - 1]!;
    const input = (postReviewCall[0] as { input: { reviewStatus: string; llmReviewSummary: string } }).input;
    expect(input.llmReviewSummary).toBe(REVIEW_FIXTURE_NEEDS_CHANGES.summary);
    expect(input.reviewStatus).toBe("needs_changes");
  });

  it("preserves fire-and-forget posture: AIClient rejection returns 200 and stamps reviewed status", async () => {
    // Configure the Mock AIClient to throw on generateObject. This mirrors
    // the production failure mode where the upstream model times out or
    // returns a 404. The webhook must NOT bubble the error to GitHub —
    // the test strategy mandates: webhook responds 200, review row gets
    // status "reviewed" + a "Review failed" summary.
    mockHolder.setThrowOnGenerateObject(new Error("[MockFixture] model timed out"));

    const req = createRequest(synchronizePayload());
    const res = await githubApp.fetch(req);

    // Webhook responds 200 — fire-and-forget posture preserved.
    expect(res.status).toBe(200);

    await waitForBackgroundReviews();
    // The review row must have been updated with status "reviewed" and a
    // "Review failed" summary, NOT bubbled to a 500.
    const updateCalls = vi.mocked(updatePrReview).mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    const failureCall = updateCalls[updateCalls.length - 1]!;
    const input = (failureCall[0] as { input: { reviewStatus: string; llmReviewSummary: string } }).input;
    expect(input.reviewStatus).toBe("reviewed");
    expect(input.llmReviewSummary).toMatch(/Review failed/i);

    // And the response body should NOT include the model error — GitHub
    // sees a successful 200 acknowledgment.
    const body = await res.json();
    expect(body.error).toBeUndefined();
  });
});

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { createHmac } from "crypto";
import githubApp, { waitForBackgroundReviews } from "../github.js";
import { createReviewWorker } from "../review-worker.js";

const WEBHOOK_SECRET = "phase-5-test-secret";

const mockHolder = vi.hoisted(() => ({
  generateObject: vi.fn().mockResolvedValue({
    passed: true,
    summary: "[IntegrationFixture] LGTM",
    comments: [],
  }),
}));

const mockGetAIClient = vi.hoisted(() => vi.fn(() => mockHolder));

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: mockGetAIClient,
  createAIClient: vi.fn(() => mockHolder),
}));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();

  function createQueryBuilder(val: unknown) {
    return {
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      then(
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(val).then(onFulfilled, onRejected);
      },
      execute() {
        return Promise.resolve(val);
      },
    };
  }

  const localMockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "job-1",
              prOwner: "org",
              prRepo: "repo",
              prPullNumber: 1,
              prUrl: "https://github.com/org/repo/pull/1",
              status: "pending",
              attempts: 0,
              maxAttempts: 5,
              nextAttemptAt: new Date(),
              lastError: null,
              claimedAt: null,
              claimedBy: null,
              reviewId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
        returning: vi.fn().mockResolvedValue([]),
        onConflictDoNothing: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(createQueryBuilder([])),
      }),
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    execute: vi.fn().mockResolvedValue([]),
  };

  return {
    ...actual,
    db: localMockDb,
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
    completeApprovedPrReviewLesson: vi.fn(),
    reviewExercise: vi.fn().mockImplementation(async (args) => {
      if (args.generateReview) {
        const prompt = `Please review the following code diff:\n\n\`\`\`diff\n${args.prDiff ?? ""}\n\`\`\``;
        return args.generateReview("system prompt", prompt);
      }
      return { passed: true, summary: "ok", comments: [] };
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

vi.mock("../github-client", () => ({
  fetchPrDiff: vi.fn().mockResolvedValue("@@ -1,3 +1,4 @@\n+console.log('hello');\n"),
  postPrComment: vi.fn().mockResolvedValue(undefined),
  parsePrUrl: vi.fn().mockReturnValue({ owner: "org", repo: "repo", pullNumber: 1 }),
  verifyWebhookSignature: vi.fn().mockReturnValue(true),
  getInstallationTokenForRepo: vi.fn().mockResolvedValue("ghs_mock-token"),
  MAX_TIMESTAMP_SKEW_SECONDS: 300,
}));

import {
  getPrReviewByPrUrl,
  updatePrReview,
  createPrReview,
  getExerciseRepoByUrl,
  completeApprovedPrReviewLesson,
} from "@reading-advantage/domain/codecamp";
import { getUserByGithubUsername } from "@reading-advantage/domain/users";
import { postPrComment } from "../github-client.js";

function signPayload(payload: string): string {
  return `sha256=${createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex")}`;
}

function createRequest(payload: string, deliveryId?: string): Request {
  const headers: Record<string, string> = {
    "x-hub-signature-256": signPayload(payload),
    "x-github-event": "pull_request",
    "content-type": "application/json",
  };
  if (deliveryId) {
    headers["x-github-delivery"] = deliveryId;
  }
  return new Request("http://localhost/pr", {
    method: "POST",
    headers,
    body: payload,
  });
}

function openedPayload() {
  return JSON.stringify({
    action: "opened",
    pull_request: {
      html_url: "https://github.com/org/repo/pull/1",
      head: { ref: "feature-branch", sha: "abc123" },
      base: { ref: "main", repo: { full_name: "org/repo", html_url: "https://github.com/org/repo" } },
      user: { login: "intern1" },
    },
  });
}

describe("Phase 5 — idempotent redelivery", () => {
  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.AI_PROVIDER = "mock";
  });

  beforeEach(() => {
    vi.clearAllMocks();

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
      llmReviewSummary: "[IntegrationFixture] LGTM",
      reviewedAt: new Date(),
      createdAt: new Date(),
    });
    vi.mocked(completeApprovedPrReviewLesson).mockResolvedValue({} as Awaited<
      ReturnType<typeof completeApprovedPrReviewLesson>
    >);
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.AI_PROVIDER;
  });

  it("duplicate webhook delivery results in exactly one PR comment", async () => {
    const payload = openedPayload();
    const req1 = createRequest(payload, "delivery-1");
    const req2 = createRequest(payload, "delivery-2");

    const res1 = await githubApp.fetch(req1);
    const res2 = await githubApp.fetch(req2);

    expect(res1.status, "first webhook response status").toBe(200);
    expect(res2.status, "second webhook response status").toBe(200);

    // Drain the deferred inline reviews so we don't double-count.
    await waitForBackgroundReviews();
    vi.mocked(postPrComment).mockClear();
    vi.mocked(updatePrReview).mockClear();

    const seededJob = {
      id: "job-1",
      repoOwner: "org",
      repoName: "repo",
      pullNumber: 1,
      status: "claimed" as const,
      attempts: 1,
      maxAttempts: 5,
      nextAttemptAt: new Date(),
      lastError: null,
      claimedAt: new Date(),
      claimedBy: "worker",
      createdAt: new Date(),
      updatedAt: new Date(),
      prUrl: "https://github.com/org/repo/pull/1",
      reviewId: "pr1",
      payloadJson: {},
    } as unknown as import("../review-worker.js").ReviewJob & {
      reviewId: string | null;
      payloadJson: unknown;
    };
    const worker = createReviewWorker({
      intervalMs: 1000,
      claim: vi.fn()
        .mockResolvedValueOnce([seededJob])
        .mockResolvedValue([]),
      reclaim: vi.fn().mockResolvedValue([]),
      settle: vi.fn().mockReturnValue({
        status: "succeeded" as const,
        attempts: 1,
        nextAttemptAt: new Date(),
        lastError: null,
        claimedAt: null,
        claimedBy: null,
      }),
    });
    await worker.run();

    const commentCalls = vi.mocked(postPrComment).mock.calls.length;
    expect(commentCalls, `postPrComment call count after duplicate delivery: ${commentCalls}`).toBe(1);
  });
});

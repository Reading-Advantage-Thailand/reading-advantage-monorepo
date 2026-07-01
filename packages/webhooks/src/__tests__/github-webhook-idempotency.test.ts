import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { createHmac } from "crypto";
import githubApp from "../github.js";

const WEBHOOK_SECRET = "test-secret";

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: vi.fn(() => ({ generateObject: vi.fn() })),
  createOpenAI: vi.fn(() => (model: string) => model),
  streamText: vi.fn(),
}));

vi.mock("@reading-advantage/domain/codecamp", async () => {
  const actual =
    await vi.importActual<typeof import("@reading-advantage/domain/codecamp")>("@reading-advantage/domain/codecamp");
  return {
    ...actual,
    getPrReviewByPrUrl: vi.fn(),
    updatePrReview: vi.fn(),
    createPrReview: vi.fn(),
    getExerciseRepoByUrl: vi.fn(),
    logWebhookEvent: vi.fn(),
    completeApprovedPrReviewLesson: vi.fn(),
    reviewExercise: vi.fn(),
  };
});

vi.mock("@reading-advantage/domain/users", async () => {
  const actual =
    await vi.importActual<typeof import("@reading-advantage/domain/users")>("@reading-advantage/domain/users");
  return {
    ...actual,
    getUserByGithubUsername: vi.fn(),
  };
});

import {
  getPrReviewByPrUrl,
  updatePrReview,
  createPrReview,
  getExerciseRepoByUrl,
  reviewExercise,
  completeApprovedPrReviewLesson,
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

describe("GitHub webhook idempotency by delivery id", () => {
  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it("does not create two reviews for two deliveries with the same delivery id", async () => {
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
    } as Awaited<ReturnType<typeof getExerciseRepoByUrl>>);
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
    } as Awaited<ReturnType<typeof getUserByGithubUsername>>);
    vi.mocked(updatePrReview).mockResolvedValue({
      id: "pr1",
      exerciseRepoId: "r1",
      userId: "u1",
      prUrl: "https://github.com/org/repo/pull/1",
      reviewStatus: "pending",
      llmReviewSummary: null,
      reviewedAt: null,
      createdAt: new Date(),
    } as Awaited<ReturnType<typeof updatePrReview>>);
    vi.mocked(reviewExercise).mockResolvedValue({
      passed: true,
      summary: "Looks good",
      comments: [],
    });
    vi.mocked(completeApprovedPrReviewLesson).mockResolvedValue({} as Awaited<
      ReturnType<typeof completeApprovedPrReviewLesson>
    >);

    // Defer createPrReview resolution so both concurrent deliveries enter the
    // handler before either completes. This reproduces the race where two
    // identical deliveries both see no existing review.
    const resolvers: Array<() => void> = [];
    vi.mocked(createPrReview).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(() =>
            resolve({
              id: "pr1",
              exerciseRepoId: "r1",
              userId: "u1",
              prUrl: "https://github.com/org/repo/pull/1",
              reviewStatus: "pending",
              llmReviewSummary: null,
              reviewedAt: null,
              createdAt: new Date(),
            })
          );
        })
    );

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
      },
    });

    const deliveryId = "dup-delivery-001";
    const req1 = createRequest(payload, { deliveryId });
    const req2 = createRequest(payload, { deliveryId });

    const resPromise1 = githubApp.fetch(req1);
    const resPromise2 = githubApp.fetch(req2);

    // Release any deferred createPrReview resolvers on a tick so the first
    // (and, if idempotency is broken, the second) delivery can complete.
    // This prevents a correct idempotent handler from being held up by the
    // deferred mock, while still allowing us to count how many times the
    // review was actually created.
    const releaseInterval = setInterval(() => resolvers.forEach((resolve) => resolve()), 50);

    const [res1, res2] = await Promise.all([resPromise1, resPromise2]);

    clearInterval(releaseInterval);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const createCallCount = vi.mocked(createPrReview).mock.calls.length;
    const webhookPathExecutedCount = createCallCount > 0 ? 1 : 0;
    const duplicateDeliveryCount = Math.max(0, createCallCount - 1);

    expect({
      webhookPathExecutedCount,
      duplicateDeliveryCount,
    }).toEqual({
      webhookPathExecutedCount: 1,
      duplicateDeliveryCount: 0,
    });
  });
});

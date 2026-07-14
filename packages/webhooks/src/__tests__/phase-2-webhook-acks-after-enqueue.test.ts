import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { createHmac } from "crypto";
import githubApp from "../github.js";

const WEBHOOK_SECRET = "test-secret";

const { mockEnqueueReviewJob } = vi.hoisted(() => ({
  mockEnqueueReviewJob: vi.fn().mockResolvedValue({
    id: "job-1",
    status: "pending",
    attempts: 0,
  }),
}));
const mockRunWorkerTick = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("../review-worker.js", () => ({
  enqueueReviewJob: mockEnqueueReviewJob,
  runWorkerTick: mockRunWorkerTick,
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
    reviewExercise: vi.fn().mockResolvedValue({
      passed: true,
      summary: "mock summary",
      comments: [],
    }),
    completeApprovedPrReviewLesson: vi.fn().mockResolvedValue(undefined),
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
  fetchPrCheckEvidence: vi.fn().mockResolvedValue({ availability: "unavailable", reason: "github_check_runs_unavailable", checkRuns: [] }),
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
  reviewExercise,
} from "@reading-advantage/domain/codecamp";
import { getUserByGithubUsername } from "@reading-advantage/domain/users";

function signPayload(payload: string): string {
  return `sha256=${createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex")}`;
}

function createRequest(payload: string): Request {
  return new Request("http://localhost/pr", {
    method: "POST",
    headers: {
      "x-hub-signature-256": signPayload(payload),
      "x-github-event": "pull_request",
      "content-type": "application/json",
    },
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

describe("Phase 2 — webhook ACKs after enqueue", () => {
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
      reviewStatus: "pending",
      llmReviewSummary: null,
      reviewedAt: null,
      createdAt: new Date(),
    });
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it("returns HTTP 200 synchronously after enqueue", async () => {
    const req = createRequest(openedPayload());
    const res = await githubApp.fetch(req);

    expect(res.status, "webhook response status").toBe(200);
  });

  it("calls enqueueReviewJob exactly once", async () => {
    const req = createRequest(openedPayload());
    await githubApp.fetch(req);

    const enqueueCalls = mockEnqueueReviewJob.mock.calls.length;
    expect(enqueueCalls, `enqueueReviewJob call count: ${enqueueCalls}`).toBe(1);
  });

  it("does NOT call reviewExercise inline in the webhook handler", async () => {
    const req = createRequest(openedPayload());
    await githubApp.fetch(req);

    const reviewCalls = vi.mocked(reviewExercise).mock.calls.length;
    expect(reviewCalls, `reviewExercise inline call count: ${reviewCalls}`).toBe(0);
  });
});

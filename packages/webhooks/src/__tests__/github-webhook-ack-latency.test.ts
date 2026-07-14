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

describe("GitHub webhook ACK latency", () => {
  beforeAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it("returns HTTP 200 before the LLM review promise resolves", async () => {
    let reviewResolved = false;
    let resolveReview: (value: { passed: boolean; summary: string; comments: { line?: number; body: string }[]; objectiveEvidence: [] }) => void = () => {};
    const reviewPromise = new Promise<{
      passed: boolean;
      summary: string;
      comments: { line?: number; body: string }[];
      objectiveEvidence: [];
    }>((resolve) => {
      resolveReview = (value) => {
        reviewResolved = true;
        resolve(value);
      };
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
      reviewStatus: "reviewed",
      llmReviewSummary: null,
      reviewedAt: new Date(),
      createdAt: new Date(),
    });
    vi.mocked(reviewExercise).mockImplementation(() => reviewPromise);
    vi.mocked(completeApprovedPrReviewLesson).mockResolvedValue({} as Awaited<
      ReturnType<typeof completeApprovedPrReviewLesson>
    >);

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

    const req = createRequest(payload, { deliveryId: "ack-latency-001" });
    const responsePromise: Promise<Response> = Promise.resolve(
      githubApp.fetch(req) as Promise<Response>
    );

    const timeoutPromise: Promise<never> = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("ACK blocked by LLM review")),
        500
      );
    });

    let raceResult: string;
    // Capture whether the LLM review had already resolved at the exact moment
    // the HTTP ACK won the race. This snapshot must be taken BEFORE the finally
    // block resolves the deferred review promise.
    let reviewResolvedWhenAcked = true;
    try {
      const ackPromise: Promise<string> = responsePromise.then(
        () => "ack" as const
      );
      const raced: string = await Promise.race<string>([
        ackPromise,
        timeoutPromise,
      ]);
      raceResult = raced;
      reviewResolvedWhenAcked = reviewResolved;
    } finally {
      // Always unblock the handler so we do not leave a dangling promise.
      resolveReview({ passed: true, summary: "ok", comments: [], objectiveEvidence: [] });
      await responsePromise;
    }

    expect(raceResult).toBe("ack");
    expect(reviewResolvedWhenAcked).toBe(false);
  });
});

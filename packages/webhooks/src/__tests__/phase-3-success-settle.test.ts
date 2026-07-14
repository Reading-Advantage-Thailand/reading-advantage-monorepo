import { describe, it, expect, vi, beforeEach } from "vitest";
import { processJob, renderAdvisoryObjectiveEvidence, settleJob } from "../review-worker.js";

interface SettleJobInput {
  id: string;
  attempts: number;
  maxAttempts: number;
  status?: string;
}

const mockUpdate = vi.fn().mockResolvedValue([]);
const mockDb = {
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: mockUpdate,
      }),
    }),
  }),
  // Minimal stub for `db.unscoped("...").select().from(...)` lookups
  // inside the real `reviewExercise` (codecamp module resolution). Tests
  // that need richer query mocks should extend this base.
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
};

const activeRollout = () => ({
  mode: "active" as const,
  runModel: true,
  mayPublishFeedback: true,
  canaryPercent: 100,
  approvedBy: "assessment-owner",
  approvalRequired: false,
});

vi.mock("@reading-advantage/domain/codecamp", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/codecamp")>("@reading-advantage/domain/codecamp");
  return {
    ...actual,
    updatePrReview: vi.fn().mockResolvedValue({
      id: "review-1",
      reviewStatus: "reviewed",
      reviewedAt: new Date(),
    }),
    listPriorPrReviewAttempts: vi.fn().mockResolvedValue([]),
    recordAdvisoryPrReviewAttempt: vi.fn().mockResolvedValue({ attemptId: "attempt-1", created: true }),
  };
});

vi.mock("../github-client", () => ({
  postPrComment: vi.fn().mockResolvedValue(undefined),
  fetchPrDiff: vi.fn().mockResolvedValue("diff"),
  fetchPrCheckEvidence: vi.fn().mockResolvedValue({ availability: "unavailable", reason: "github_check_runs_unavailable", checkRuns: [] }),
  getInstallationTokenForRepo: vi.fn().mockResolvedValue("token"),
}));

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: vi.fn(() => ({
    generateObject: vi.fn().mockResolvedValue({
      passed: true,
      summary: "Great work",
      comments: [],
    }),
  })),
}));

import { listPriorPrReviewAttempts, recordAdvisoryPrReviewAttempt, updatePrReview } from "@reading-advantage/domain/codecamp";
import { postPrComment } from "../github-client.js";

describe("Phase 3 — success settle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders graph-bound evidence as advisory feedback without an approval claim", () => {
    expect(renderAdvisoryObjectiveEvidence({
      passed: false,
      summary: "Revise the branch workflow.",
      comments: [],
      apkEvaluation: undefined,
      objectiveEvidence: [{
        objectiveId: "codecamp.workflow.skill.git-branches",
        score: 55,
        confidence: 70,
        misconceptionTags: ["branch-workflow-confusion"],
        references: [{ filePath: "README.md", startLine: 1, endLine: 2, testName: null }],
      }],
    })).toContain("55/100 advisory score");
  });

  it("success sets status to succeeded and stamps reviewedAt", async () => {
    const job = {
      id: "job-1",
      reviewId: "review-1",
      repoOwner: "org",
      repoName: "repo",
      pullNumber: 1,
      status: "claimed",
      attempts: 0,
      maxAttempts: 5,
      payloadJson: {},
    };

    await processJob(job as unknown as Parameters<typeof processJob>[0], {
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      resolveRollout: activeRollout,
    });

    expect(updatePrReview, "updatePrReview call count").toHaveBeenCalledTimes(1);
    const updateCall = vi.mocked(updatePrReview).mock.calls[0]![0] as {
      input: { reviewStatus: string; llmReviewSummary?: string };
    };
    expect(updateCall.input.reviewStatus, "LLM review remains advisory").toBe("reviewed");

    const postCalls = vi.mocked(postPrComment).mock.calls.length;
    expect(postCalls, `postPrComment call count: ${postCalls}`).toBe(1);
  });

  it("forwards the complete APK rubric evaluation through the durable worker", async () => {
    const apkEvaluation = {
      rubricId: "apk.rubric.independent-cartridge" as const,
      dimensions: ["objective", "contract", "tests", "accessibility"].map((dimensionId) => ({ dimensionId, score: 1, evidence: `${dimensionId} evidence` })),
      requiredChecks: ["manifest ABI", "deterministic educational logic", "keyboard-equivalent input", "unit tests", "browser smoke test"].map((check) => ({ check, passed: true, evidence: `${check} evidence` })),
      totalScore: 1,
    };
    const update = vi.fn().mockResolvedValue({ id: "review-apk", reviewStatus: "reviewed" });
    await processJob({ id: "job-apk", reviewId: "review-apk", repoOwner: "org", repoName: "repo", pullNumber: 2, status: "claimed", attempts: 0, maxAttempts: 5, payloadJson: {} } as unknown as Parameters<typeof processJob>[0], {
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      updatePrReview: update,
      getAIClient: () => ({ generateObject: vi.fn().mockResolvedValue({ passed: true, summary: "APK passes", comments: [], apkEvaluation }) }),
      resolveRollout: activeRollout,
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ input: expect.objectContaining({ reviewStatus: "reviewed", rubricEvaluation: apkEvaluation }) }));
  });

  it("settleJob returns succeeded payload for a passing result", () => {
    const settled = settleJob(
      { id: "job-1", attempts: 0, maxAttempts: 5 } as unknown as SettleJobInput,
      null,
      { baseDelayMs: 1000, maxJitterMs: 100 },
    );

    expect(settled.status, "settled status").toBe("succeeded");
    expect(settled.lastError, "settled lastError").toBeNull();
  });

  it("records validated advisory provenance before marking a headed revision reviewed", async () => {
    const reviewJob = {
      id: "job-provenance", reviewId: "review-provenance", repoOwner: "org", repoName: "repo", pullNumber: 3,
      status: "claimed", attempts: 0, maxAttempts: 5,
      payloadJson: { pull_request: { head: { sha: "a".repeat(40) } } },
    };
    const getAIClient = () => ({
      generateObject: vi.fn(),
      generateObjectWithProvenance: vi.fn().mockResolvedValue({
        object: { passed: true, summary: "Advisory only", comments: [] },
        provenance: {
          provider: "openrouter", requestedModel: "~x-ai/grok-latest", resolvedModel: "x-ai/grok-4.1-fast",
          requestId: "request-1", responseId: "response-1", latencyMs: 12,
          usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, reasoningTokens: null, cachedInputTokens: null },
        },
      }),
    });

    await processJob(reviewJob as unknown as Parameters<typeof processJob>[0], {
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      getAIClient,
      resolveRollout: activeRollout,
    });

    expect(recordAdvisoryPrReviewAttempt).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        reviewId: "review-provenance",
        headSha: "a".repeat(40),
        provenance: expect.objectContaining({ resolvedModel: "x-ai/grok-4.1-fast" }),
      }),
    }));
    const recordOrder = vi.mocked(recordAdvisoryPrReviewAttempt).mock.invocationCallOrder.at(-1)!;
    const updateOrder = vi.mocked(updatePrReview).mock.invocationCallOrder.at(-1)!;
    expect(recordOrder).toBeLessThan(updateOrder);
  });

  it("passes bounded deterministic GitHub check evidence into the review context", async () => {
    const generateObject = vi.fn().mockResolvedValue({ passed: true, summary: "Checks are green", comments: [] });
    await processJob({
      id: "job-checks", reviewId: "review-checks", repoOwner: "org", repoName: "repo", pullNumber: 4,
      status: "claimed", attempts: 0, maxAttempts: 5,
      payloadJson: { pull_request: { head: { sha: "b".repeat(40) } } },
    } as unknown as Parameters<typeof processJob>[0], {
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      getAIClient: () => ({ generateObject }),
      fetchCheckEvidence: vi.fn().mockResolvedValue({
        availability: "available", reason: null,
        checkRuns: [{ name: "unit tests", status: "completed", conclusion: "success", detailsUrl: "https://github.com/org/repo/runs/4" }],
      }),
    });

    expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining("Trusted deterministic check context"),
    }));
    expect(generateObject.mock.calls[0]![0].prompt).toContain("unit tests");
  });

  it("includes prior immutable attempt summaries while excluding the current revision", async () => {
    vi.mocked(listPriorPrReviewAttempts).mockResolvedValue([{
      headSha: "a".repeat(40), attemptStatus: "advisory", evidenceAuthority: "advisory_model",
      objectives: [{ objectiveId: "codecamp.workflow.skill.git-branches", variantKey: "git-github-repository", score: 62, confidence: 71, evidenceState: "advisory" }],
    }] as Awaited<ReturnType<typeof listPriorPrReviewAttempts>>);
    const generateObject = vi.fn().mockResolvedValue({ passed: true, summary: "Revise the branch", comments: [] });

    await processJob({
      id: "job-history", reviewId: "review-history", repoOwner: "org", repoName: "repo", pullNumber: 5,
      status: "claimed", attempts: 0, maxAttempts: 5,
      payloadJson: { pull_request: { head: { sha: "b".repeat(40) } } },
    } as unknown as Parameters<typeof processJob>[0], {
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      getAIClient: () => ({ generateObject }),
      fetchCheckEvidence: vi.fn().mockResolvedValue({ availability: "unavailable", reason: "github_check_runs_unavailable", checkRuns: [] }),
    });

    expect(generateObject.mock.calls[0]![0].prompt).toContain("Previous immutable attempt summaries");
    expect(generateObject.mock.calls[0]![0].prompt).toContain("git-github-repository");
  });

  it("keeps unapproved shadow results private while retaining immutable advisory evidence", async () => {
    const update = vi.fn().mockResolvedValue({ id: "review-shadow", reviewStatus: "reviewed" });
    await processJob({
      id: "job-shadow", reviewId: "review-shadow", repoOwner: "org", repoName: "repo", pullNumber: 6,
      status: "claimed", attempts: 0, maxAttempts: 5,
      payloadJson: { pull_request: { head: { sha: "c".repeat(40) } } },
    } as unknown as Parameters<typeof processJob>[0], {
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      updatePrReview: update,
      resolveRollout: () => ({
        mode: "shadow",
        runModel: true,
        mayPublishFeedback: false,
        canaryPercent: 10,
        approvedBy: null,
        approvalRequired: true,
      }),
    });

    expect(recordAdvisoryPrReviewAttempt).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ reviewId: "review-shadow" }),
    }));
    expect(update).not.toHaveBeenCalled();
    expect(postPrComment).not.toHaveBeenCalled();
  });

  it("publishes an approved canary job selected by its stable durable ID", async () => {
    const update = vi.fn().mockResolvedValue({ id: "review-canary", reviewStatus: "reviewed" });
    await processJob({
      id: "job-canary", reviewId: "review-canary", repoOwner: "org", repoName: "repo", pullNumber: 7,
      status: "claimed", attempts: 0, maxAttempts: 5, payloadJson: {},
    } as unknown as Parameters<typeof processJob>[0], {
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      updatePrReview: update,
      resolveRollout: () => ({
        mode: "canary",
        runModel: true,
        mayPublishFeedback: true,
        canaryPercent: 100,
        approvedBy: "assessment-owner",
        approvalRequired: false,
      }),
    });

    expect(update).toHaveBeenCalledOnce();
    expect(postPrComment).toHaveBeenCalledOnce();
  });

  it("skips provider work entirely when rollout is disabled", async () => {
    const generateObject = vi.fn();
    await processJob({
      id: "job-disabled", reviewId: "review-disabled", repoOwner: "org", repoName: "repo", pullNumber: 8,
      status: "claimed", attempts: 0, maxAttempts: 5, payloadJson: {},
    } as unknown as Parameters<typeof processJob>[0], {
      db: mockDb as unknown as import("@reading-advantage/db").DB,
      getAIClient: () => ({ generateObject }),
      resolveRollout: () => ({
        mode: "disabled",
        runModel: false,
        mayPublishFeedback: false,
        canaryPercent: 10,
        approvedBy: null,
        approvalRequired: false,
      }),
    });

    expect(generateObject).not.toHaveBeenCalled();
    expect(recordAdvisoryPrReviewAttempt).not.toHaveBeenCalled();
    expect(updatePrReview).not.toHaveBeenCalled();
    expect(postPrComment).not.toHaveBeenCalled();
  });
});

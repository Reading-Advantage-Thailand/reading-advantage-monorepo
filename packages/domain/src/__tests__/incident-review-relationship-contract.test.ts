import { describe, expect, it, vi } from "vitest";

const tables = vi.hoisted(() => ({
  codecampExerciseRepos: Symbol("codecampExerciseRepos"),
  codecampModules: Symbol("codecampModules"),
  codecampPrReviews: Symbol("codecampPrReviews"),
}));

vi.mock("@reading-advantage/auth", () => ({
  assertCan: vi.fn(),
}));

vi.mock("@reading-advantage/codecamp-knowledge", () => ({
  codecampAPKUnit: {
    youdo: {
      objectiveId: "codecamp.apk.game-creation",
      variantKey: "apk-game-creation-repository",
      rubric: { rubricId: "apk.rubric.independent-cartridge", dimensions: [] },
      requiredChecks: [],
    },
  },
  curriculumBindings: {
    bindings: [{
      source: { moduleSlug: "git-github" },
      activityKind: "repository",
      evidenceMode: "assessed",
      evidenceSource: "pull-request",
      practiceMode: "independent",
      variantId: "git-github-repository",
      objectiveIds: ["codecamp.workflow.skill.git-branches"],
      misconceptionTags: ["branch-workflow-confusion"],
    }],
  },
}));

vi.mock("@reading-advantage/db/schema", () => tables);

import {
  codecampExerciseRepos,
  codecampModules,
  codecampPrReviews,
} from "@reading-advantage/db/schema";
import { reviewExercise } from "../codecamp/review-exercise.js";

const systemUser = {
  id: "review-worker",
  username: "review-worker",
  name: "Review Worker",
  role: "SYSTEM" as const,
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const globalTenant = { schoolId: null };
const reviewId = "a8c42f09-54be-4c24-8cd8-88adcb73a161";
const module = {
  id: "a5f6a03d-8c34-445c-a6a4-0a751aa1ac21",
  title: "GitHub collaboration",
  description: "Use a topic branch for pull requests.",
  slug: "git-github",
  order: 3,
  phase: "A",
  status: "published",
  createdAt: new Date("2026-08-10T00:00:00.000Z"),
  updatedAt: new Date("2026-08-10T00:00:00.000Z"),
};

/**
 * Builds a mock database that can resolve a review's authoritative module
 * through codecamp_pr_reviews -> codecamp_exercise_repos -> codecamp_modules.
 */
function createRelationshipDb() {
  const reviewContext = {
    reviewId,
    exerciseRepoId: "1c1f03b6-6874-4bf1-85c4-59b8a34287e4",
    moduleId: module.id,
    moduleSlug: module.slug,
  };

  const from = vi.fn((table: unknown) => {
    const rows = table === codecampPrReviews
      ? [reviewContext]
      : table === codecampModules
        ? [module]
        : [];
    const query = {
      innerJoin: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
    };
    query.innerJoin.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.limit.mockResolvedValue(rows);
    return query;
  });

  return {
    unscoped: vi.fn(() => ({ select: vi.fn(() => ({ from })) })),
    from,
  };
}

const diff = "diff --git a/README.md b/README.md\n@@ -1 +1 @@\n-old\n+new";

describe("incident repair — review relationship objective contract", () => {
  it("uses reviewId's persisted module instead of a lowercased reconstructed repository URL", async () => {
    const db = createRelationshipDb();
    const generateReview = vi.fn().mockResolvedValue({
      passed: false,
      summary: "Add a topic branch before opening the pull request.",
      comments: [],
      objectiveEvidence: [],
    });

    await expect(reviewExercise({
      db,
      user: systemUser,
      tenant: globalTenant,
      prDiff: diff,
      // This emulates the worker's normalized queue key. It must not be used
      // for curriculum identity because production stores the owner in mixed case.
      repoUrl: "https://github.com/reading-advantage-thailand/reading-advantage/pull",
      reviewId,
      generateReview,
    } as Parameters<typeof reviewExercise>[0])).rejects.toThrow(
      "Review output must cover every graph-bound objective exactly once",
    );

    expect(generateReview).toHaveBeenCalledWith(
      expect.stringContaining("Authorized objective evidence only"),
      expect.any(String),
    );
    expect(db.from).toHaveBeenCalledWith(codecampPrReviews);
    expect(db.from).not.toHaveBeenCalledWith(codecampExerciseRepos);
  });

  it("rejects duplicate graph-bound objective evidence before accepting the model result", async () => {
    const db = createRelationshipDb();
    const objectiveEvidence = {
      objectiveId: "codecamp.workflow.skill.git-branches",
      score: 55,
      confidence: 70,
      misconceptionTags: ["branch-workflow-confusion"],
      references: [{ filePath: "README.md", startLine: 1, endLine: 1, testName: null }],
    };

    await expect(reviewExercise({
      db,
      user: systemUser,
      tenant: globalTenant,
      prDiff: diff,
      reviewId,
      generateReview: vi.fn().mockResolvedValue({
        passed: false,
        summary: "Use one topic branch per pull request.",
        comments: [],
        objectiveEvidence: [objectiveEvidence, objectiveEvidence],
      }),
    } as Parameters<typeof reviewExercise>[0])).rejects.toThrow(
      "Review output must cover every graph-bound objective exactly once",
    );
  });
});

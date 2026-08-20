import { describe, it, expect, vi } from "vitest";
import {
  CodecampPrReviewContractError,
  reviewExercise,
  type ReviewContractFailureKind,
} from "../codecamp/review-exercise.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const admin = {
  id: "a1",
  username: "admin1",
  name: "Admin",
  role: "ADMIN" as const,
  schoolId: "s1",
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const globalTenant = { schoolId: null };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, globalTenant);
}

const reviewedDiff = "diff --git a/README.md b/README.md\n@@ -1 +1,2 @@\n-old\n+new\n+another";

const gitModuleRow = {
  id: "m-git",
  title: "Git and GitHub",
  description: "Repository workflow",
  slug: "git-github",
  order: 1,
  phase: "A",
  status: "published",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const AUTHORIZED_OBJECTIVE_ID = "codecamp.workflow.skill.git-branches";

const correctReview = {
  passed: true,
  summary: "Correct review",
  comments: [],
  objectiveEvidence: [{
    objectiveId: AUTHORIZED_OBJECTIVE_ID,
    score: 80,
    confidence: 80,
    misconceptionTags: [],
    references: [{ filePath: "README.md", startLine: 1, endLine: 2, testName: null }],
  }],
};

const wrongObjectiveReview = {
  passed: true,
  summary: "Omits the bound objective",
  comments: [],
  objectiveEvidence: [],
};

/**
 * Phase 2 (Red) tests for the model-shape repair loop.
 *
 * Behavior lands in Phase 3. The current code does not retry on
 * model-shape failures, so all assertions about a second / bounded
 * generator call are RED.
 */
describe("reviewExercise model-shape repair loop (FR-5)", () => {
  it("a generator that omits one bound objective on call 1 and is correct on call 2 produces a review", async () => {
    const db = createMockDb({ selectResults: [gitModuleRow] });
    const generateReview = vi.fn()
      .mockResolvedValueOnce(wrongObjectiveReview)
      .mockResolvedValueOnce(correctReview);

    const result = await reviewExercise({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      prDiff: reviewedDiff,
      moduleId: gitModuleRow.id,
      generateReview,
    });

    expect(result.passed).toBe(true);
    expect(result.objectiveEvidence).toHaveLength(1);
    expect(result.objectiveEvidence[0]!.objectiveId).toBe(AUTHORIZED_OBJECTIVE_ID);
    expect(generateReview, "repair loop must call the generator at least twice").toHaveBeenCalledTimes(2);
  });

  it("a generator wrong three times throws a CodecampPrReviewContractError with kind=model_shape", async () => {
    const db = createMockDb({ selectResults: [gitModuleRow] });
    const generateReview = vi.fn().mockResolvedValue(wrongObjectiveReview);

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: reviewedDiff,
        moduleId: gitModuleRow.id,
        generateReview,
      });
      throw new Error("reviewExercise must throw after exhausting the repair loop");
    } catch (error) {
      expect(error, "exhausted repair loop must surface a contract error").toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "exhausted loop must carry kind=model_shape").toBe<ReviewContractFailureKind>("model_shape");
      expect(typed.retryable, "exhausted loop must surface a retryable failure").toBe(true);
    }
  });

  it("the repair prompt names the violated rule and every authorized objective identifier", async () => {
    const db = createMockDb({ selectResults: [gitModuleRow] });
    const generateReview = vi.fn()
      .mockResolvedValueOnce(wrongObjectiveReview)
      .mockResolvedValueOnce(correctReview);

    await reviewExercise({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      prDiff: reviewedDiff,
      moduleId: gitModuleRow.id,
      generateReview,
    });

    expect(generateReview, "repair loop must call the generator twice").toHaveBeenCalledTimes(2);
    const repairPrompt = generateReview.mock.calls[1]![1] as string;
    expect(repairPrompt, "repair prompt must name the violated rule").toMatch(/every graph-bound objective exactly once/);
    expect(repairPrompt, "repair prompt must name every authorized objective identifier").toContain(AUTHORIZED_OBJECTIVE_ID);
  });

  it("the loop makes at most three generator calls in total (initial + up to two repairs)", async () => {
    const db = createMockDb({ selectResults: [gitModuleRow] });
    const generateReview = vi.fn().mockResolvedValue(wrongObjectiveReview);

    let thrown: unknown;
    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: reviewedDiff,
        moduleId: gitModuleRow.id,
        generateReview,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown, "exhausted loop must throw").toBeInstanceOf(CodecampPrReviewContractError);
    const typed = thrown as CodecampPrReviewContractError;
    expect(typed.kind, "exhausted failure must be classified model_shape").toBe<ReviewContractFailureKind>("model_shape");
    expect(
      generateReview.mock.calls.length,
      `generator call count: ${generateReview.mock.calls.length}`,
    ).toBeLessThanOrEqual(3);
  });
});

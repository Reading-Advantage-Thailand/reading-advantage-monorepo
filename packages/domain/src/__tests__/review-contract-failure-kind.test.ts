import { describe, it, expect, vi } from "vitest";
import {
  CodecampPrReviewContractError,
  isCodecampPrReviewContractError,
  reviewExercise,
  type ReviewContractFailureKind,
} from "../codecamp/review-exercise.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";
import { codecampAPKUnit } from "@reading-advantage/codecamp-knowledge";

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

const REVIEW_ID = "11111111-1111-4111-8111-111111111111";
const REVIEW_ID_MISSING = "22222222-2222-4222-8222-222222222222";

const reviewedDiff = "diff --git a/README.md b/README.md\n@@ -1 +1,2 @@\n-old\n+new\n+another";

/**
 * Phase 2 (Red) tests for `CodecampPrReviewContractError.kind` classification.
 *
 * Behavior lands in Phase 3. Today every throw defaults to
 * `kind="input_safety"` / `retryable=false`, so the model-shape tests
 * are RED.
 */
describe("CodecampPrReviewContractError model_shape classification (FR-5)", () => {
  it('"Review output must cover every graph-bound objective exactly once" -> kind="model_shape", retryable=true', async () => {
    const moduleRow = {
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
    const db = createMockDb({ selectResults: [moduleRow] });
    const generateReview = vi.fn().mockResolvedValue({
      passed: true,
      summary: "All clear",
      comments: [],
      // Empty objectiveEvidence violates the "exactly once" rule.
      objectiveEvidence: [],
    });

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: reviewedDiff,
        moduleId: moduleRow.id,
        generateReview,
      });
      throw new Error("reviewExercise must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "kind classification").toBe<ReviewContractFailureKind>("model_shape");
      expect(typed.retryable, "retryable flag").toBe(true);
      expect(typed.message).toMatch(/every graph-bound objective exactly once/);
    }
  });

  it('"Review output references a file outside the reviewed diff" -> kind="model_shape", retryable=true', async () => {
    const moduleRow = {
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
    const db = createMockDb({ selectResults: [moduleRow] });
    const generateReview = vi.fn().mockResolvedValue({
      passed: true,
      summary: "Cites a phantom file",
      comments: [],
      objectiveEvidence: [{
        objectiveId: "codecamp.workflow.skill.git-branches",
        score: 80,
        confidence: 80,
        misconceptionTags: [],
        references: [{ filePath: "secrets/.env", startLine: 1, endLine: 1, testName: null }],
      }],
    });

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: reviewedDiff,
        moduleId: moduleRow.id,
        generateReview,
      });
      throw new Error("reviewExercise must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "kind classification").toBe<ReviewContractFailureKind>("model_shape");
      expect(typed.retryable, "retryable flag").toBe(true);
      expect(typed.message).toMatch(/file outside the reviewed diff/);
    }
  });

  it('"Review output references lines outside the changed diff hunk" -> kind="model_shape", retryable=true', async () => {
    const moduleRow = {
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
    const db = createMockDb({ selectResults: [moduleRow] });
    const generateReview = vi.fn().mockResolvedValue({
      passed: true,
      summary: "Cites a phantom line",
      comments: [],
      objectiveEvidence: [{
        objectiveId: "codecamp.workflow.skill.git-branches",
        score: 80,
        confidence: 80,
        misconceptionTags: [],
        references: [{ filePath: "README.md", startLine: 99, endLine: 99, testName: null }],
      }],
    });

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: reviewedDiff,
        moduleId: moduleRow.id,
        generateReview,
      });
      throw new Error("reviewExercise must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "kind classification").toBe<ReviewContractFailureKind>("model_shape");
      expect(typed.retryable, "retryable flag").toBe(true);
      expect(typed.message).toMatch(/lines outside the changed diff hunk/);
    }
  });

  it('"Review output contains objective evidence for an unbound repository" -> kind="model_shape", retryable=true', async () => {
    const moduleRow = {
      id: "m-unbound",
      title: "Unbound module",
      description: "No PR binding",
      slug: "unbound-no-binding",
      order: 1,
      phase: "A",
      status: "published",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const db = createMockDb({ selectResults: [moduleRow] });
    const generateReview = vi.fn().mockResolvedValue({
      passed: true,
      summary: "Hallucinated objective",
      comments: [],
      objectiveEvidence: [{
        objectiveId: "codecamp.workflow.skill.git-branches",
        score: 80,
        confidence: 80,
        misconceptionTags: [],
        references: [{ filePath: "README.md", startLine: 1, endLine: 1, testName: null }],
      }],
    });

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: reviewedDiff,
        moduleId: moduleRow.id,
        generateReview,
      });
      throw new Error("reviewExercise must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "kind classification").toBe<ReviewContractFailureKind>("model_shape");
      expect(typed.retryable, "retryable flag").toBe(true);
      expect(typed.message).toMatch(/objective evidence for an unbound repository/);
    }
  });

  it('"APK objective evidence must match the authored rubric score" -> kind="model_shape", retryable=true', async () => {
    const moduleRow = {
      id: "m-apk",
      title: "APK Game Creation",
      description: "Independent transfer",
      slug: "apk-game-creation",
      order: 20,
      phase: "D",
      status: "published",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const evaluation = {
      rubricId: "apk.rubric.independent-cartridge" as const,
      dimensions: ["objective", "contract", "tests", "accessibility"].map((dimensionId) => ({
        dimensionId: dimensionId as "objective" | "contract" | "tests" | "accessibility",
        score: 1,
        evidence: `${dimensionId} evidence`,
      })),
      requiredChecks: codecampAPKUnit.youdo.requiredChecks.map((check) => ({ check, passed: true, evidence: `${check} verified.` })),
      totalScore: 1,
    };
    const db = createMockDb({ selectResults: [moduleRow] });
    // Mismatch: objective score 90 but totalScore*100 = 100.
    const generateReview = vi.fn().mockResolvedValue({
      passed: true,
      summary: "Mismatched APK score",
      comments: [],
      apkEvaluation: evaluation,
      objectiveEvidence: [{
        objectiveId: codecampAPKUnit.youdo.objectiveId,
        score: 90,
        confidence: 80,
        misconceptionTags: [],
        references: [{ filePath: "src/cartridge.ts", startLine: 1, endLine: 1, testName: null }],
      }],
    });

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: reviewedDiff,
        moduleId: moduleRow.id,
        generateReview,
      });
      throw new Error("reviewExercise must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "kind classification").toBe<ReviewContractFailureKind>("model_shape");
      expect(typed.retryable, "retryable flag").toBe(true);
      expect(typed.message).toMatch(/APK objective evidence must match the authored rubric score/);
    }
  });
});

describe("CodecampPrReviewContractError input_safety classification (FR-5)", () => {
  it('"PR diff appears to contain a secret and cannot be reviewed" -> kind="input_safety", retryable=false', async () => {
    const db = createMockDb();
    const generateReview = vi.fn();

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: "diff --git a/a.ts b/a.ts\n+const token = 'ghp_123456789012345678901234567890123456';",
        generateReview,
      });
      throw new Error("reviewExercise must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "kind classification").toBe<ReviewContractFailureKind>("input_safety");
      expect(typed.retryable, "retryable flag").toBe(false);
      expect(typed.message).toMatch(/secret/);
    }
  });

  it('"PR diff contains binary content and cannot be reviewed" -> kind="input_safety", retryable=false', async () => {
    const db = createMockDb();
    const generateReview = vi.fn();

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: "diff --git a/image.png b/image.png\nGIT binary patch\nliteral 4",
        generateReview,
      });
      throw new Error("reviewExercise must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "kind classification").toBe<ReviewContractFailureKind>("input_safety");
      expect(typed.retryable, "retryable flag").toBe(false);
      expect(typed.message).toMatch(/binary/);
    }
  });

  it('"PR diff is too large for safe review" -> kind="input_safety", retryable=false', async () => {
    const db = createMockDb();
    const generateReview = vi.fn();

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: `diff --git a/a.ts b/a.ts\n${"x".repeat(200_001)}`,
        generateReview,
      });
      throw new Error("reviewExercise must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "kind classification").toBe<ReviewContractFailureKind>("input_safety");
      expect(typed.retryable, "retryable flag").toBe(false);
      expect(typed.message).toMatch(/too large/);
    }
  });

  it('"Review relationship requires a valid review ID" -> kind="input_safety", retryable=false', async () => {
    const db = createMockDb();
    const generateReview = vi.fn();

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: reviewedDiff,
        reviewId: "not-a-uuid",
        generateReview,
      });
      throw new Error("reviewExercise must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "kind classification").toBe<ReviewContractFailureKind>("input_safety");
      expect(typed.retryable, "retryable flag").toBe(false);
      expect(typed.message).toMatch(/requires a valid review ID/);
    }
  });

  it('"Review relationship <id> could not resolve an exercise repository and module" -> kind="input_safety", retryable=false', async () => {
    const db = createMockDb({ selectResults: [] });
    const generateReview = vi.fn();

    try {
      await reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: reviewedDiff,
        reviewId: REVIEW_ID_MISSING,
        generateReview,
      });
      throw new Error("reviewExercise must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CodecampPrReviewContractError);
      const typed = error as CodecampPrReviewContractError;
      expect(typed.kind, "kind classification").toBe<ReviewContractFailureKind>("input_safety");
      expect(typed.retryable, "retryable flag").toBe(false);
      expect(typed.message).toMatch(/could not resolve an exercise repository/);
    }
  });
});

describe("isCodecampPrReviewContractError structural shape", () => {
  it("returns true for a contract failure carrying the structural marker (input_safety branch)", () => {
    const failure = new CodecampPrReviewContractError("any input safety", undefined, "input_safety");
    expect(isCodecampPrReviewContractError(failure), "input_safety contract error must satisfy the type guard").toBe(true);
  });

  it("returns true for a contract failure constructed without an explicit kind (default input_safety)", () => {
    const failure = new CodecampPrReviewContractError("legacy default");
    expect(isCodecampPrReviewContractError(failure), "default-kind contract error must satisfy the type guard").toBe(true);
  });

  it("returns false for an arbitrary Error without the structural marker", () => {
    expect(isCodecampPrReviewContractError(new Error("plain"))).toBe(false);
  });

  it("returns false for null / undefined / non-object values", () => {
    expect(isCodecampPrReviewContractError(null)).toBe(false);
    expect(isCodecampPrReviewContractError(undefined)).toBe(false);
    expect(isCodecampPrReviewContractError("string")).toBe(false);
  });
});

// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { SalesError } from "../errors.js";

const { mockRegister } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
}));

vi.mock("@reading-advantage/auth", () => ({
  ROLES: {
    SALES_REP: "SALES_REP",
    SALES_ADMIN: "SALES_ADMIN",
  },
  registerDomainModulePermissions: mockRegister,
}));

import { SALES_PERMISSIONS, registerSalesPermissions } from "../permissions.js";
import {
  aiClientToEvaluateRoleplay,
  scoreRoleplayEvaluation,
} from "../roleplay-evaluator.js";

describe("permissions.ts — FR-6 single source of truth", () => {
  it("derives the registerDomainModulePermissions keys from SALES_PERMISSIONS (no duplicate literal)", () => {
    mockRegister.mockClear();
    registerSalesPermissions();

    expect(
      mockRegister,
      "permissions.ts must call registerDomainModulePermissions exactly once at module load.",
    ).toHaveBeenCalledTimes(1);

    const arg = mockRegister.mock.calls[0][0] as {
      moduleName: string;
      keys: Array<{ key: string; roles: readonly string[] }>;
    };
    expect(arg.moduleName).toBe("sales");

    const expectedKeys = Object.keys(SALES_PERMISSIONS);
    const actualKeys = arg.keys.map((k) => k.key).sort();
    expect(actualKeys).toEqual(expectedKeys.sort());

    for (const entry of arg.keys) {
      const expectedRoles = SALES_PERMISSIONS[entry.key as keyof typeof SALES_PERMISSIONS];
      expect(
        Array.from(entry.roles).sort(),
        `Role list for ${entry.key} must match SALES_PERMISSIONS.`,
      ).toEqual(Array.from(expectedRoles).sort());
    }
  });
});

describe("roleplay-evaluator.ts — FR-5 error cause propagation", () => {
  it("EVALUATION_FAILED carries the primary and fallback error causes when both paths reject", async () => {
    const primaryError = new Error("primary model 504 gateway timeout");
    const fallbackError = new Error("fallback model 401 unauthorized");

    const aiClient = {
      generateObjectFromMedia: vi
        .fn()
        .mockRejectedValueOnce(primaryError)
        .mockRejectedValueOnce(fallbackError),
    };

    const evaluate = aiClientToEvaluateRoleplay(aiClient);

    let thrown: unknown;
    try {
      await evaluate(
        { buffer: Buffer.from(""), mimeType: "audio/webm" },
        {
          id: "s1",
          lessonId: "l1",
          personaName: "CFO",
          personaRole: "Finance",
          situation: "Cost review",
          objective: "Defend budget",
          prospectContextJson: {},
          rubricId: "r1",
          order: 1,
          createdAt: new Date(),
        },
        {
          id: "r1",
          name: "Default",
          criteriaJson: [],
          reviewStatus: "approved",
          createdAt: new Date(),
        },
        ["excerpt-1", "excerpt-2"],
      );
    } catch (err) {
      thrown = err;
    }

    expect(thrown, "The evaluator must throw when both paths fail.").toBeInstanceOf(SalesError);
    const salesError = thrown as SalesError & { code: string; cause?: unknown };
    expect(salesError.code).toBe("EVALUATION_FAILED");

    expect(
      salesError.cause,
      "FR-5: the SalesError must carry a `cause` with both the primary and fallback errors so " +
        "operators can debug two-tier LLM failures (the previous code discarded both).",
    ).toBeDefined();
    const cause = salesError.cause as { primaryError?: unknown; fallbackError?: unknown };
    expect(cause.primaryError).toBe(primaryError);
    expect(cause.fallbackError).toBe(fallbackError);
  });
});
describe("roleplay-evaluator.ts — overall score and pass computed from the rubric", () => {
  const rubricCriteria = [
    { criterion: "Asked discovery questions", weight: 0.3, passingScore: 70, sourceRef: "s1" },
    { criterion: "Listened actively", weight: 0.25, passingScore: 70, sourceRef: "s2" },
    { criterion: "Did not pitch early", weight: 0.25, passingScore: 80, sourceRef: "s3" },
    { criterion: "Asked for a next step", weight: 0.2, passingScore: 70, sourceRef: "s4" },
  ];
  /** Builds a model evaluation with the given criterion scores and model-claimed totals. */
  const modelResult = (
    criteria: Array<{ criterion: string; score: number }>,
    claimed = { overallScore: 80, passed: true },
  ) => ({
    ...claimed,
    criteria: criteria.map((c) => ({ ...c, feedback: `feedback for ${c.criterion}` })),
    summary: "summary",
    strengths: [],
    weaknesses: [],
    suggestedNextAction: "next",
    transcriptExcerpt: "excerpt",
  });
  const scenario = {
    id: "s1",
    lessonId: "l1",
    personaName: "Parent",
    personaRole: "Parent",
    situation: "Placement result",
    objective: "Recommend a book",
    prospectContextJson: {},
    rubricId: "r1",
    order: 1,
    createdAt: new Date(),
  };
  const rubric = {
    id: "r1",
    name: "Rubric",
    criteriaJson: rubricCriteria,
    reviewStatus: "approved" as const,
    createdAt: new Date(),
  };

  it("replaces the model's overall score and pass with the weighted mean and per-criterion gates", () => {
    // Observed 2026-10-15: the model claimed 80 and a pass for criteria 0, 75, 45, 60.
    const result = scoreRoleplayEvaluation(
      modelResult(rubricCriteria.map((c, i) => ({ criterion: c.criterion, score: [0, 75, 45, 60][i]! }))),
      rubricCriteria,
    );
    expect(result.overallScore).toBe(42); // 0×0.3 + 75×0.25 + 45×0.25 + 60×0.2 = 42
    expect(result.passed).toBe(false);
  });

  it("fails when one criterion is under its passing score even if the overall score is high", () => {
    const result = scoreRoleplayEvaluation(
      modelResult(rubricCriteria.map((c, i) => ({ criterion: c.criterion, score: [100, 90, 79, 100][i]! }))),
      rubricCriteria,
    );
    expect(result.overallScore).toBe(92);
    expect(result.passed).toBe(false);
  });

  it("passes when every criterion meets its passing score", () => {
    const result = scoreRoleplayEvaluation(
      modelResult(rubricCriteria.map((c) => ({ criterion: c.criterion, score: 80 })), { overallScore: 10, passed: false }),
      rubricCriteria,
    );
    expect(result.overallScore).toBe(80);
    expect(result.passed).toBe(true);
  });

  it("matches criteria by name in rubric order and scores a missing criterion as 0", () => {
    const result = scoreRoleplayEvaluation(
      modelResult([
        { criterion: "  asked for a NEXT step ", score: 90 },
        { criterion: "Asked discovery questions", score: 100 },
        { criterion: "Listened actively", score: 80 },
      ]),
      rubricCriteria,
    );
    expect(result.criteria.map((c) => [c.criterion, c.score])).toEqual([
      ["Asked discovery questions", 100],
      ["Listened actively", 80],
      ["Did not pitch early", 0],
      ["Asked for a next step", 90],
    ]);
    expect(result.criteria[2]!.feedback).toBe("Not evaluated.");
    expect(result.overallScore).toBe(68); // 30 + 20 + 0 + 18
    expect(result.passed).toBe(false);
  });

  it("uses equal weights and a 70 pass mark when the rubric has no criteria", () => {
    expect(
      scoreRoleplayEvaluation(modelResult([{ criterion: "a", score: 90 }, { criterion: "b", score: 70 }]), []),
    ).toMatchObject({ overallScore: 80, passed: true });
    expect(scoreRoleplayEvaluation(modelResult([]), [])).toMatchObject({ overallScore: 0, passed: false });
  });

  it("applies the computed score on the primary and the fallback path", async () => {
    const claimed = modelResult(rubricCriteria.map((c) => ({ criterion: c.criterion, score: 50 })));
    const primary = aiClientToEvaluateRoleplay({
      generateObjectFromMedia: vi.fn().mockResolvedValue(claimed),
    });
    const fallback = aiClientToEvaluateRoleplay({
      generateObjectFromMedia: vi
        .fn()
        .mockRejectedValueOnce(new Error("primary down"))
        .mockResolvedValueOnce(claimed),
    });
    const audio = { buffer: Buffer.from("a"), mimeType: "audio/webm" };

    await expect(primary(audio, scenario, rubric, [])).resolves.toMatchObject({ overallScore: 50, passed: false });
    await expect(fallback(audio, scenario, rubric, [])).resolves.toMatchObject({ overallScore: 50, passed: false });
  });
});

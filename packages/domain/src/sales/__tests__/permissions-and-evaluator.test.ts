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
import { aiClientToEvaluateRoleplay } from "../roleplay-evaluator.js";

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
    const fallbackError = new Error("fallback STT 401 unauthorized");

    const aiClient = {
      generateObjectFromMedia: vi.fn().mockRejectedValue(primaryError),
      transcribeAudio: vi.fn().mockRejectedValue(fallbackError),
      generateObject: vi.fn(),
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
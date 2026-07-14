import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import {
  reviewExercise,
  reviewResultSchema,
  aiClientToGenerateReview,
  type AIClientLike,
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

/**
 * Build a minimal `AIClientLike` mock that satisfies the structural shape
 * the `aiClientToGenerateReview` adapter depends on. Keeps the test
 * decoupled from `@reading-advantage/ai` (the domain package must remain
 * free of AI provider dependencies per `review-exercise.ts`).
 */
function makeAIClientMock(impl: (input: { schema: z.ZodSchema<unknown>; prompt: string }) => Promise<unknown>): AIClientLike {
  return {
    generateObject: vi.fn().mockImplementation(impl),
  };
}

class FakeAIClientError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "AIClientError";
    this.code = code;
  }
}

describe("aiClientToGenerateReview adapter", () => {
  it("returns a callback that calls client.generateObject with the provided schema and combined prompt", async () => {
    const reviewResult = {
      passed: true,
      summary: "LGTM",
      comments: [{ line: 3, body: "Consider naming the variable." }],
    };
    const client = makeAIClientMock(async () => reviewResult);

    const generateReview = aiClientToGenerateReview(client, reviewResultSchema);
    const result = await generateReview(
      "You are a code reviewer.",
      "Please review:\n```diff\n+const x = 1;\n```"
    );

    expect(client.generateObject).toHaveBeenCalledTimes(1);
    const callArg = (client.generateObject as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as { schema: z.ZodSchema<unknown>; prompt: string };
    expect(callArg.schema).toBe(reviewResultSchema);
    expect(callArg.prompt).toContain("You are a code reviewer.");
    expect(callArg.prompt).toContain("Please review:");
    expect(callArg.prompt).toContain("```diff");
    expect(result).toEqual(reviewResult);
  });

  it("propagates an AIClientError thrown by the underlying client (does not swallow it)", async () => {
    const providerError = new FakeAIClientError("model timed out", "PROVIDER_ERROR");
    const client = makeAIClientMock(async () => {
      throw providerError;
    });

    const generateReview = aiClientToGenerateReview(client, reviewResultSchema);

    await expect(
      generateReview("system", "prompt")
    ).rejects.toBe(providerError);
  });
});

describe("reviewExercise with AIClient-backed callback", () => {
  it("returns the typed review for a sample diff when the AIClient produces a valid result", async () => {
    const reviewResult = {
      passed: false,
      summary: "Needs more tests.",
      comments: [{ body: "Add a unit test for the new helper." }],
      objectiveEvidence: [],
    };
    const client = makeAIClientMock(async () => reviewResult);
    const generateReview = aiClientToGenerateReview(client, reviewResultSchema);
    const db = createMockDb();

    const result = await reviewExercise({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      prDiff: "diff --git a/file.ts b/file.ts\n+const x = 1;",
      generateReview,
    });

    expect(result).toEqual(reviewResult);
    expect(client.generateObject).toHaveBeenCalledTimes(1);
  });

  it("surfaces a model error from the AIClient to the caller of reviewExercise", async () => {
    const providerError = new FakeAIClientError("schema mismatch", "PROVIDER_ERROR");
    const client = makeAIClientMock(async () => {
      throw providerError;
    });
    const generateReview = aiClientToGenerateReview(client, reviewResultSchema);
    const db = createMockDb();

    await expect(
      reviewExercise({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        prDiff: "diff",
        generateReview,
      })
    ).rejects.toBe(providerError);
  });
});

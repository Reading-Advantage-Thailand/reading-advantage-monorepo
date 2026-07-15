import { describe, expect, it } from "vitest";
import { z } from "zod";
import { OpenRouterProvider } from "./openrouter.js";

const reviewResultSchema = z.object({
  passed: z.boolean(),
  summary: z.string(),
  comments: z.array(
    z.object({
      line: z.number().optional(),
      body: z.string(),
    })
  ),
});

describe("OpenRouter capability preflight", () => {
  it.skipIf(!process.env.OPENROUTER_API_KEY)(
    "production review alias supports forced-tool structured output",
    async () => {
      const reviewModel = process.env.CODECAMP_PR_REVIEW_MODEL ?? "~x-ai/grok-latest";
      const provider = new OpenRouterProvider({
        apiKey: process.env.OPENROUTER_API_KEY!,
        model: reviewModel,
      });

      const result = await provider.generateObjectWithProvenance({
        schema: reviewResultSchema,
        prompt:
          "Review this diff:\n```diff\n+console.log('hello')\n```",
        maxTokens: 2048,
      });

      expect(result.provenance.requestedModel).toBe(reviewModel);
      expect(result.object).toHaveProperty("passed");
      expect(typeof result.object.passed).toBe("boolean");
      expect(result.object).toHaveProperty("summary");
      expect(typeof result.object.summary).toBe("string");
      expect(result.object).toHaveProperty("comments");
      expect(Array.isArray(result.object.comments)).toBe(true);
    },
    30_000
  );
});

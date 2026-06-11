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
    "configured review model supports forced-tool structured output",
    async () => {
      const provider = new OpenRouterProvider({
        apiKey: process.env.OPENROUTER_API_KEY!,
        model: "x-ai/grok-build-0.1",
      });

      const result = await provider.generateObject({
        schema: reviewResultSchema,
        prompt:
          "Review this diff:\n```diff\n+console.log('hello')\n```",
        maxTokens: 2048,
      });

      expect(result).toHaveProperty("passed");
      expect(typeof result.passed).toBe("boolean");
      expect(result).toHaveProperty("summary");
      expect(typeof result.summary).toBe("string");
      expect(result).toHaveProperty("comments");
      expect(Array.isArray(result.comments)).toBe(true);
    },
    30_000
  );
});

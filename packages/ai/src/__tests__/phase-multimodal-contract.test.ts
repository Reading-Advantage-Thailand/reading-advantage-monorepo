import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { AIClient, GenerateObjectFromMediaInput } from "../types.js";
import { createTestClient, MockProvider } from "../providers/mock.js";

const rubricSchema = z.object({
  overallScore: z.number(),
  passed: z.boolean(),
  criteria: z.array(z.object({ criterion: z.string(), score: z.number(), feedback: z.string() })),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestedNextAction: z.string(),
  transcriptExcerpt: z.string(),
});

const cannedEvaluation = {
  overallScore: 1,
  passed: true,
  criteria: [],
  summary: "mock",
  strengths: [],
  weaknesses: [],
  suggestedNextAction: "mock",
  transcriptExcerpt: "mock transcript",
};

describe("generateObjectFromMedia contract", () => {
  it("is declared on the AIClient interface", () => {
    // Compile-time assertion: every AIClient must implement generateObjectFromMedia.
    type HasMethod = AIClient extends { generateObjectFromMedia: unknown }
      ? true
      : false;
    const _check: HasMethod = true;
    expect(_check).toBe(true);
  });

  it("GenerateObjectFromMediaInput carries schema, prompt, and media", () => {
    const input: GenerateObjectFromMediaInput<{ ok: boolean }> = {
      schema: z.object({ ok: z.boolean() }),
      prompt: "evaluate",
      media: { buffer: Buffer.from("audio"), mimeType: "audio/webm" },
    };
    expect(input.media.mimeType).toBe("audio/webm");
    expect(input.prompt).toBe("evaluate");
  });

  it("MockProvider.generateObjectFromMedia returns a canned, schema-validated result", async () => {
    const provider = new MockProvider({ generateObjectFromMedia: cannedEvaluation });
    const result = await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "evaluate this roleplay",
      media: { buffer: Buffer.from("audio-bytes"), mimeType: "audio/webm" },
    });
    expect(result).toEqual(cannedEvaluation);
    expect(result.transcriptExcerpt).toBe("mock transcript");
  });

  it("MockProvider.generateObjectFromMedia logs the call", async () => {
    const provider = createTestClient({ generateObjectFromMedia: cannedEvaluation });
    await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "p",
      media: { buffer: Buffer.from([1, 2, 3]), mimeType: "audio/webm" },
    });
    const last = provider.calls.at(-1);
    expect(last?.method).toBe("generateObjectFromMedia");
  });

  it("MockProvider.generateObjectFromMedia throws ProviderNotConfiguredError when no response is configured", async () => {
    const provider = new MockProvider({});
    await expect(
      provider.generateObjectFromMedia({
        schema: rubricSchema,
        prompt: "p",
        media: { buffer: Buffer.from(""), mimeType: "audio/webm" },
      })
    ).rejects.toThrow(/not configured/);
  });

  it("MockProvider.generateObjectFromMedia throws SchemaValidationError when the canned output is invalid", async () => {
    const provider = new MockProvider({ generateObjectFromMedia: { overallScore: "not a number" } });
    await expect(
      provider.generateObjectFromMedia({
        schema: rubricSchema,
        prompt: "p",
        media: { buffer: Buffer.from(""), mimeType: "audio/webm" },
      })
    ).rejects.toThrow(/schema validation/);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenRouterProvider } from "./openrouter.js";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn((id: string) => `resolved:${id}`)),
}));

import { generateObject } from "ai";

const schema = z.object({ answer: z.string() });

describe("OpenRouterProvider generation provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the requested model and provider response provenance without changing generateObject", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { answer: "42" },
      response: {
        id: "response-123",
        modelId: "x-ai/grok-4.1-fast",
        timestamp: new Date("2026-07-12T00:00:00.000Z"),
        headers: { "x-request-id": "request-456" },
      },
      usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20 },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    expect(provider.generateObjectWithProvenance).toBeTypeOf("function");

    const result = await provider.generateObjectWithProvenance({
      schema,
      prompt: "Review the exercise.",
      model: "~x-ai/grok-latest",
    });

    expect(result.object).toEqual({ answer: "42" });
    expect(result.provenance).toMatchObject({
      provider: "openrouter",
      requestedModel: "~x-ai/grok-latest",
      resolvedModel: "x-ai/grok-4.1-fast",
      responseId: "response-123",
      requestId: "request-456",
      usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20 },
    });
    expect(result.provenance.latencyMs).toBeGreaterThanOrEqual(0);
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({ model: "resolved:~x-ai/grok-latest" })
    );
  });

  it("preserves absent provider response metadata as null", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { answer: "fallback" },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      model: "xiaomi/mimo-v2.5",
    });
    const result = await provider.generateObjectWithProvenance({
      schema,
      prompt: "Help with this activity.",
    });

    expect(result.provenance).toEqual({
      provider: "openrouter",
      requestedModel: "xiaomi/mimo-v2.5",
      resolvedModel: null,
      responseId: null,
      requestId: null,
      usage: {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        reasoningTokens: null,
        cachedInputTokens: null,
      },
      latencyMs: expect.any(Number),
    });
  });
});

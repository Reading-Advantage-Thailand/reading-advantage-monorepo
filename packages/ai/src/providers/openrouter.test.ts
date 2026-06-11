import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenRouterProvider } from "./openrouter.js";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  experimental_generateImage: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() =>
    Object.assign(vi.fn((id: string) => `resolved:${id}`), {
      image: vi.fn((id: string) => `image:${id}`),
    })
  ),
}));

import { generateObject, generateText } from "ai";

const testSchema = z.object({ answer: z.string() });

describe("OpenRouterProvider", () => {
  describe("generateObject", () => {
    it("delegates to AI SDK generateObject with the configured model", async () => {
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: { answer: "42" },
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 5 },
      } as unknown as Awaited<ReturnType<typeof generateObject>>);

      const provider = new OpenRouterProvider({
        apiKey: "test-key",
        model: "x-ai/grok-build-0.1",
      });

      const result = await provider.generateObject({
        schema: testSchema,
        prompt: "what is the answer",
      });

      expect(result).toEqual({ answer: "42" });
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "what is the answer",
          maxRetries: 1,
        })
      );
    });

    it("wraps SDK errors in AIClientError with PROVIDER_ERROR code", async () => {
      vi.mocked(generateObject).mockRejectedValueOnce(
        new Error("rate limited")
      );

      const provider = new OpenRouterProvider({
        apiKey: "test-key",
        model: "x-ai/grok-build-0.1",
      });

      await expect(
        provider.generateObject({
          schema: testSchema,
          prompt: "test",
        })
      ).rejects.toThrow("OpenRouter generateObject failed: rate limited");
    });
  });

  describe("generateText", () => {
    it("delegates to AI SDK generateText", async () => {
      vi.mocked(generateText).mockResolvedValueOnce({
        text: "hello world",
        finishReason: "stop",
        usage: { promptTokens: 5, completionTokens: 3 },
      } as unknown as Awaited<ReturnType<typeof generateText>>);

      const provider = new OpenRouterProvider({ apiKey: "test-key" });

      const result = await provider.generateText({ prompt: "say hello" });

      expect(result).toBe("hello world");
    });
  });

  describe("model-ID prefix stripping", () => {
    it("strips the openrouter/ prefix from model IDs", async () => {
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: { answer: "stripped" },
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 5 },
      } as unknown as Awaited<ReturnType<typeof generateObject>>);

      const provider = new OpenRouterProvider({
        apiKey: "test-key",
        model: "openrouter/anthropic/claude-3.5-sonnet",
      });

      await provider.generateObject({
        schema: testSchema,
        prompt: "test",
      });

      const mockCreateOpenAI = vi.mocked(
        (await import("@ai-sdk/openai")).createOpenAI
      );
      const clientFactory = mockCreateOpenAI.mock.results[0]?.value;
      expect(clientFactory).toBeDefined();
      // The model ID passed to the SDK should have the openrouter/ prefix stripped
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "resolved:anthropic/claude-3.5-sonnet",
        })
      );
    });

    it("does not strip model IDs without the openrouter/ prefix", async () => {
      vi.mocked(generateText).mockResolvedValueOnce({
        text: "ok",
        finishReason: "stop",
        usage: { promptTokens: 5, completionTokens: 3 },
      } as unknown as Awaited<ReturnType<typeof generateText>>);

      const provider = new OpenRouterProvider({
        apiKey: "test-key",
        model: "x-ai/grok-build-0.1",
      });

      await provider.generateText({ prompt: "test" });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "resolved:x-ai/grok-build-0.1",
        })
      );
    });
  });

  describe("baseURL configuration", () => {
    it("configures the OpenAI client with OpenRouter baseURL", async () => {
      const mockCreateOpenAI = vi.mocked(
        (await import("@ai-sdk/openai")).createOpenAI
      );

      new OpenRouterProvider({
        apiKey: "test-key",
        model: "x-ai/grok-build-0.1",
      });

      expect(mockCreateOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "test-key",
          baseURL: "https://openrouter.ai/api/v1",
        })
      );
    });
  });
});

import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenAIProvider } from "./openai.js";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  experimental_generateImage: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => {
    const modelFn = vi.fn((id: string) => `resolved:${id}`);
    return modelFn;
  }),
}));

import { generateObject, generateText, experimental_generateImage } from "ai";

const testSchema = z.object({ answer: z.string() });

describe("OpenAIProvider", () => {
  describe("generateObject", () => {
    it("delegates to AI SDK generateObject with the configured model", async () => {
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: { answer: "42" },
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 5 },
      } as any);

      const provider = new OpenAIProvider({
        apiKey: "test-key",
        model: "gpt-4o",
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
  });

  describe("generateText", () => {
    it("delegates to AI SDK generateText", async () => {
      vi.mocked(generateText).mockResolvedValueOnce({
        text: "hello world",
        finishReason: "stop",
        usage: { promptTokens: 5, completionTokens: 3 },
      } as any);

      const provider = new OpenAIProvider({ apiKey: "test-key" });

      const result = await provider.generateText({ prompt: "say hello" });

      expect(result).toBe("hello world");
    });
  });

  describe("generateImage", () => {
    it("delegates to AI SDK experimental_generateImage", async () => {
      const imageBase64 = Buffer.from("fake-image").toString("base64");
      vi.mocked(experimental_generateImage).mockResolvedValueOnce({
        image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
        images: [],
        warnings: [],
      } as any);

      const provider = new OpenAIProvider({
        apiKey: "test-key",
        imageModel: "dall-e-3",
      });

      const result = await provider.generateImage({ prompt: "a cat" });

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe("fake-image");
    });

    it("resolves model through this.client for credential injection", async () => {
      const imageBase64 = Buffer.from("test").toString("base64");
      vi.mocked(experimental_generateImage).mockResolvedValueOnce({
        image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
        images: [],
        warnings: [],
      } as any);

      const provider = new OpenAIProvider({
        apiKey: "test-key",
        imageModel: "dall-e-3",
      });

      await provider.generateImage({ prompt: "test" });

      expect(experimental_generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "resolved:dall-e-3",
        })
      );
    });
  });
});

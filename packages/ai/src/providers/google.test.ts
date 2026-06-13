import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GoogleProvider } from "./google.js";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  experimental_generateImage: vi.fn(),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() =>
    Object.assign(vi.fn((id: string) => `google:${id}`), {
      image: vi.fn((id: string) => `image:${id}`),
    })
  ),
}));

import { generateObject, generateText, experimental_generateImage } from "ai";

const testSchema = z.object({ answer: z.string() });

describe("GoogleProvider", () => {
  describe("generateObject", () => {
    it("delegates to AI SDK generateObject with the configured model", async () => {
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: { answer: "gemini-output" },
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 5 },
      } as unknown as Awaited<ReturnType<typeof generateObject>>);

      const provider = new GoogleProvider({
        apiKey: "test-key",
        model: "gemini-2.5-flash",
      });

      const result = await provider.generateObject({
        schema: testSchema,
        prompt: "what is the answer",
      });

      expect(result).toEqual({ answer: "gemini-output" });
    });
  });

  describe("generateText", () => {
    it("delegates to AI SDK generateText", async () => {
      vi.mocked(generateText).mockResolvedValueOnce({
        text: "hello from gemini",
        finishReason: "stop",
        usage: { promptTokens: 5, completionTokens: 3 },
      } as unknown as Awaited<ReturnType<typeof generateText>>);

      const provider = new GoogleProvider({ apiKey: "test-key" });

      const result = await provider.generateText({ prompt: "say hello" });

      expect(result).toBe("hello from gemini");
    });
  });

  describe("generateImage", () => {
    it("delegates to AI SDK generateImage", async () => {
      const imageBase64 = Buffer.from("fake-google-image").toString("base64");
      vi.mocked(experimental_generateImage).mockResolvedValueOnce({
        image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
        images: [],
        warnings: [],
      } as unknown as Awaited<ReturnType<typeof experimental_generateImage>>);

      const provider = new GoogleProvider({ apiKey: "test-key" });

      const result = await provider.generateImage({ prompt: "a diagram" });

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe("fake-google-image");
    });

    it("resolves model through this.client for credential injection", async () => {
      const imageBase64 = Buffer.from("test").toString("base64");
      vi.mocked(experimental_generateImage).mockResolvedValueOnce({
        image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
        images: [],
        warnings: [],
      } as unknown as Awaited<ReturnType<typeof experimental_generateImage>>);

      const provider = new GoogleProvider({ apiKey: "test-key" });

      await provider.generateImage({ prompt: "test" });

      expect(experimental_generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "image:gemini-2.0-flash-preview-image-generation",
        })
      );
    });
  });
});

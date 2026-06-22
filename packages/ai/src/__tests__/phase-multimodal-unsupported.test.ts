import { describe, expect, it } from "vitest";
import { OpenAIProvider } from "../providers/openai.js";
import { UnsupportedError } from "../errors.js";
import { z } from "zod";

const schema = z.object({ result: z.string() });

describe("OpenAIProvider.generateObjectFromMedia (unsupported)", () => {
  it("throws UnsupportedError pointing to the openrouter or google provider", async () => {
    const provider = new OpenAIProvider({ apiKey: "test-key" });
    await expect(
      provider.generateObjectFromMedia({
        schema,
        prompt: "p",
        media: { buffer: Buffer.from("audio"), mimeType: "audio/webm" },
      })
    ).rejects.toThrow(UnsupportedError);

    await expect(
      provider.generateObjectFromMedia({
        schema,
        prompt: "p",
        media: { buffer: Buffer.from("audio"), mimeType: "audio/webm" },
      })
    ).rejects.toThrow(
      /generateObjectFromMedia requires the openrouter or google provider/
    );
  });

  it("the error carries the UNSUPPORTED code", async () => {
    const provider = new OpenAIProvider({ apiKey: "test-key" });
    try {
      await provider.generateObjectFromMedia({
        schema,
        prompt: "p",
        media: { buffer: Buffer.from("audio"), mimeType: "audio/webm" },
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedError);
      expect((err as UnsupportedError).code).toBe("UNSUPPORTED");
    }
  });
});

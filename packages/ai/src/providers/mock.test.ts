import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MockProvider } from "./mock.js";
import { ProviderNotConfiguredError, SchemaValidationError } from "../errors.js";

const testSchema = z.object({
  name: z.string(),
  score: z.number(),
});

describe("MockProvider", () => {
  describe("generateObject", () => {
    it("returns the configured response when schema passes", async () => {
      const provider = new MockProvider({
        generateObject: { name: "test", score: 42 },
      });

      const result = await provider.generateObject({
        schema: testSchema,
        prompt: "test prompt",
      });

      expect(result).toEqual({ name: "test", score: 42 });
    });

    it("validates the response against the schema", async () => {
      const provider = new MockProvider({
        generateObject: { name: 123, score: "bad" },
      });

      await expect(
        provider.generateObject({ schema: testSchema, prompt: "test" })
      ).rejects.toThrow(SchemaValidationError);
    });

    it("throws ProviderNotConfiguredError when no response configured", async () => {
      const provider = new MockProvider();

      await expect(
        provider.generateObject({ schema: testSchema, prompt: "test" })
      ).rejects.toThrow(ProviderNotConfiguredError);
    });
  });

  describe("generateImage", () => {
    it("returns the configured buffer", async () => {
      const buffer = Buffer.from("fake-image-data");
      const provider = new MockProvider({ generateImage: buffer });

      const result = await provider.generateImage({ prompt: "test" });

      expect(result).toBe(buffer);
    });

    it("throws when no response configured", async () => {
      const provider = new MockProvider();

      await expect(
        provider.generateImage({ prompt: "test" })
      ).rejects.toThrow(ProviderNotConfiguredError);
    });
  });

  describe("generateText", () => {
    it("returns the configured string", async () => {
      const provider = new MockProvider({ generateText: "hello world" });

      const result = await provider.generateText({ prompt: "test" });

      expect(result).toBe("hello world");
    });

    it("throws when no response configured", async () => {
      const provider = new MockProvider();

      await expect(
        provider.generateText({ prompt: "test" })
      ).rejects.toThrow(ProviderNotConfiguredError);
    });
  });

  describe("call log", () => {
    it("records all calls in order", async () => {
      const provider = new MockProvider({
        generateObject: { name: "a", score: 1 },
        generateText: "response",
      });

      await provider.generateObject({
        schema: testSchema,
        prompt: "first",
      });
      await provider.generateText({ prompt: "second" });

      expect(provider.calls).toHaveLength(2);
      expect(provider.calls[0].method).toBe("generateObject");
      expect(provider.calls[1].method).toBe("generateText");
    });
  });
});

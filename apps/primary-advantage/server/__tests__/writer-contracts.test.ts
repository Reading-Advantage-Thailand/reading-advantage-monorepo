// @vitest-environment node
/**
 * Behavioral replacement for the static writer-contracts grep test.
 *
 * Instead of asserting on source text, these tests invoke the real
 * generators with a mocked internal AI adapter and assert the adapter
 * receives the expected calls and options.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  uploadToBucket: vi.fn(),
  createLogFile: vi.fn(),
}));

vi.mock("@reading-advantage/ai/internal-sdk", () => ({
  generateObject: (...args: unknown[]) => mocks.generateObject(...args),
  generateText: (...args: unknown[]) => mocks.generateText(...args),
}));

vi.mock("@/utils/openai", () => ({
  openai: vi.fn(() => "test-openai-model"),
  openaiModel: "test-openai-model",
}));

vi.mock("@/utils/google", () => ({
  google: vi.fn(() => "test-google-model"),
  googleImage: "test-google-image",
  googleModelLite: "test-google-lite",
  googleModel: "test-google-model",
}));

vi.mock("@/utils/storage", () => ({
  uploadToBucket: (...args: unknown[]) => mocks.uploadToBucket(...args),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      unlinkSync: vi.fn(),
    },
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

import { generateStoryContent } from "../utils/generators/story-generator";
import { generateImage } from "../utils/generators/image-generator";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Primary writer contracts", () => {
  it("routes story generation through the internal adapter with the current token limit", async () => {
    const story = { title: "Test Story", chapters: [] };
    mocks.generateObject.mockResolvedValue({ object: story });

    const result = await generateStoryContent({
      cefrLevel: "A1",
      genre: "adventure",
      topic: "cats",
    });

    expect(result).toEqual(story);
    expect(mocks.generateObject).toHaveBeenCalledTimes(1);
    expect(mocks.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 8192 }),
    );
  });

  it("routes image generation through the internal adapter", async () => {
    mocks.generateObject.mockResolvedValue({
      object: {
        prompt: ["scene one", "scene two", "scene three"],
        mainCharacter: "a brave cat",
      },
    });
    mocks.generateText.mockResolvedValue({
      files: [
        { base64: Buffer.from("image-1").toString("base64") },
        { base64: Buffer.from("image-2").toString("base64") },
        { base64: Buffer.from("image-3").toString("base64") },
      ],
    });
    mocks.uploadToBucket.mockResolvedValue(undefined);

    const result = await generateImage(
      { imageDesc: "a brave cat", articleId: "article-1", passage: "..." },
      1,
    );

    expect(result.success).toBe(true);
    expect(result.imageUrls).toHaveLength(3);
    expect(mocks.generateObject).toHaveBeenCalledTimes(1);
    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    expect(mocks.uploadToBucket).toHaveBeenCalledTimes(3);
  });
});

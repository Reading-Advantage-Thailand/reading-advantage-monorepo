import { describe, expect, it, vi } from "vitest";

import { createConfiguredSpeechObjectResolver } from "../games/speech-preparation.js";
import {
  prepareEnglishAnswerSpeechBatch,
  type SpeechPreparationFilePort,
} from "../games/speech-preparation-batch.js";

const GENERATED_AUDIO = Uint8Array.from([1, 2, 3]);

function identity(text: string, fileName: string): string {
  return `${JSON.stringify({
    schemaVersion: 1,
    text,
    sourceLocale: "en-US",
    voice: "English_expressive_narrator",
    model: "speech-2.8-hd",
    speed: 0.9,
    language: "English",
    format: "mp3",
    fileName,
  }, null, 2)}\n`;
}

function createMemoryFiles(initial: Record<string, Uint8Array | string> = {}) {
  const values = new Map<string, Uint8Array | string>(Object.entries(initial));
  const files: SpeechPreparationFilePort = {
    ensureDirectory: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn(async (path) => values.has(path)),
    readText: vi.fn(async (path) => {
      const value = values.get(path);
      if (typeof value !== "string") throw new Error(`Missing text: ${path}`);
      return value;
    }),
    remove: vi.fn(async (path) => { values.delete(path); }),
    rename: vi.fn(async (from, to) => {
      const value = values.get(from);
      if (value === undefined) throw new Error(`Missing source: ${from}`);
      values.set(to, value);
      values.delete(from);
    }),
    writeText: vi.fn(async (path, value) => { values.set(path, value); }),
  };
  return {
    files,
    values,
    writeBytes: (path: string, value: Uint8Array) => values.set(path, value),
  };
}

describe("prepareEnglishAnswerSpeechBatch", () => {
  it("generates distinct English terms sequentially and collapses exact duplicates", async () => {
    const memory = createMemoryFiles();
    let active = 0;
    let maximumActive = 0;
    const synthesize = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      memory.writeBytes(outputPath, GENERATED_AUDIO);
      active -= 1;
    });
    const validate = vi.fn().mockResolvedValue(true);

    const result = await prepareEnglishAnswerSpeechBatch({
      input: [
        { term: "ice cream", translation: "ไอศกรีม" },
        { term: "Ice cream", translation: "ไอศกรีม" },
        { term: "ice cream", translation: "ของหวาน" },
      ],
      outputDirectory: "/review",
      storagePrefix: "apk/speech/en-US",
      files: memory.files,
      provider: { synthesize },
      audioValidator: { validate },
    });

    expect(maximumActive).toBe(1);
    expect(synthesize).toHaveBeenCalledTimes(2);
    expect(validate).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ generatedClipCount: 2, reusedClipCount: 0, duplicateTermCount: 1 });
    expect(result.manifest).toEqual({
      schemaVersion: 1,
      clips: [
        { text: "ice cream", sourceLocale: "en-US", key: "apk/speech/en-US/000-ice-cream.mp3", mediaType: "audio/mpeg" },
        { text: "Ice cream", sourceLocale: "en-US", key: "apk/speech/en-US/001-ice-cream.mp3", mediaType: "audio/mpeg" },
      ],
    });
    expect(memory.values.get("/review/000-ice-cream.mp3.identity.json"))
      .toBe(identity("ice cream", "000-ice-cream.mp3"));
    expect(JSON.parse(memory.values.get(result.manifestPath) as string)).toEqual(result.manifest);
  });

  it.each([
    ["empty input", []],
    ["unknown item field", [{ term: "river", translation: "แม่น้ำ", audioUrl: "x" }]],
    ["blank term", [{ term: " ", translation: "แม่น้ำ" }]],
    ["too many items", Array.from({ length: 51 }, (_, index) => ({ term: `term ${index}`, translation: "คำ" }))],
  ])("rejects %s before file or provider work", async (_label, input) => {
    const memory = createMemoryFiles();
    const synthesize = vi.fn();

    await expect(prepareEnglishAnswerSpeechBatch({
      input,
      outputDirectory: "/review",
      storagePrefix: "apk/speech/en-US",
      files: memory.files,
      provider: { synthesize },
      audioValidator: { validate: vi.fn() },
    })).rejects.toThrow();
    expect(memory.files.ensureDirectory).not.toHaveBeenCalled();
    expect(synthesize).not.toHaveBeenCalled();
  });

  it("removes partial output and skips the manifest after generation fails", async () => {
    const memory = createMemoryFiles();
    const synthesize = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      memory.writeBytes(outputPath, GENERATED_AUDIO);
      throw new Error("provider failed");
    });

    await expect(prepareEnglishAnswerSpeechBatch({
      input: [{ term: "river", translation: "แม่น้ำ" }],
      outputDirectory: "/review",
      storagePrefix: "apk/speech/en-US",
      files: memory.files,
      provider: { synthesize },
      audioValidator: { validate: vi.fn() },
    })).rejects.toThrow("provider failed");
    expect(memory.values.has("/review/000-river.mp3.partial")).toBe(false);
    expect(memory.values.has("/review/english-answer-speech-manifest.draft.json")).toBe(false);
  });

  it("does not reuse a decoded clip when its exact term identity changed", async () => {
    const memory = createMemoryFiles({
      "/review/000-cafe.mp3": GENERATED_AUDIO,
      "/review/000-cafe.mp3.identity.json": identity("café", "000-cafe.mp3"),
    });
    const synthesize = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      memory.writeBytes(outputPath, GENERATED_AUDIO);
    });
    const validate = vi.fn().mockResolvedValue(true);

    const result = await prepareEnglishAnswerSpeechBatch({
      input: [{ term: "cafe", translation: "ร้านกาแฟ" }],
      outputDirectory: "/review",
      storagePrefix: "apk/speech/en-US",
      files: memory.files,
      provider: { synthesize },
      audioValidator: { validate },
    });

    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ generatedClipCount: 1, reusedClipCount: 0 });
    expect(memory.values.get("/review/000-cafe.mp3.identity.json"))
      .toBe(identity("cafe", "000-cafe.mp3"));
  });

  it("does not reuse colliding filenames after their exact terms are reordered", async () => {
    const memory = createMemoryFiles({
      "/review/000-cafe.mp3": GENERATED_AUDIO,
      "/review/000-cafe.mp3.identity.json": identity("café", "000-cafe.mp3"),
      "/review/001-cafe.mp3": GENERATED_AUDIO,
      "/review/001-cafe.mp3.identity.json": identity("cafe", "001-cafe.mp3"),
    });
    const synthesize = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      memory.writeBytes(outputPath, GENERATED_AUDIO);
    });

    const result = await prepareEnglishAnswerSpeechBatch({
      input: [
        { term: "cafe", translation: "ร้านกาแฟ" },
        { term: "café", translation: "ร้านกาแฟ" },
      ],
      outputDirectory: "/review",
      storagePrefix: "apk/speech/en-US",
      files: memory.files,
      provider: { synthesize },
      audioValidator: { validate: vi.fn().mockResolvedValue(true) },
    });

    expect(synthesize).toHaveBeenCalledTimes(2);
    expect(result.reusedClipCount).toBe(0);
  });

  it("does not complete a generated file when the decoder rejects it", async () => {
    const memory = createMemoryFiles();
    const synthesize = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      memory.writeBytes(outputPath, GENERATED_AUDIO);
    });

    await expect(prepareEnglishAnswerSpeechBatch({
      input: [{ term: "river", translation: "แม่น้ำ" }],
      outputDirectory: "/review",
      storagePrefix: "apk/speech/en-US",
      files: memory.files,
      provider: { synthesize },
      audioValidator: { validate: vi.fn().mockResolvedValue(false) },
    })).rejects.toThrow("Speech provider produced invalid audio at index 0");
    expect(memory.values.has("/review/000-river.mp3.partial")).toBe(false);
    expect(memory.values.has("/review/000-river.mp3")).toBe(false);
    expect(memory.values.has("/review/000-river.mp3.identity.json")).toBe(false);
  });

  it("regenerates a leftover partial clip instead of treating it as complete", async () => {
    const memory = createMemoryFiles({
      "/review/000-river.mp3.partial": GENERATED_AUDIO,
    });
    const synthesize = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      memory.writeBytes(outputPath, GENERATED_AUDIO);
    });

    const result = await prepareEnglishAnswerSpeechBatch({
      input: [{ term: "river", translation: "แม่น้ำ" }],
      outputDirectory: "/review",
      storagePrefix: "apk/speech/en-US",
      files: memory.files,
      provider: { synthesize },
      audioValidator: { validate: vi.fn().mockResolvedValue(true) },
    });

    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(result.generatedClipCount).toBe(1);
  });

  it("regenerates decoded audio when its settings identity differs", async () => {
    const mismatchedIdentity = JSON.parse(identity("river", "000-river.mp3"));
    mismatchedIdentity.voice = "another-voice";
    const memory = createMemoryFiles({
      "/review/000-river.mp3": GENERATED_AUDIO,
      "/review/000-river.mp3.identity.json": JSON.stringify(mismatchedIdentity),
    });
    const synthesize = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      memory.writeBytes(outputPath, GENERATED_AUDIO);
    });

    const result = await prepareEnglishAnswerSpeechBatch({
      input: [{ term: "river", translation: "แม่น้ำ" }],
      outputDirectory: "/review",
      storagePrefix: "apk/speech/en-US",
      files: memory.files,
      provider: { synthesize },
      audioValidator: { validate: vi.fn().mockResolvedValue(true) },
    });

    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(result.reusedClipCount).toBe(0);
  });

  it("regenerates a matching clip when the decoder finds no audio frames", async () => {
    const memory = createMemoryFiles({
      "/review/000-river.mp3": GENERATED_AUDIO,
      "/review/000-river.mp3.identity.json": identity("river", "000-river.mp3"),
    });
    const synthesize = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      memory.writeBytes(outputPath, GENERATED_AUDIO);
    });
    const validate = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const result = await prepareEnglishAnswerSpeechBatch({
      input: [{ term: "river", translation: "แม่น้ำ" }],
      outputDirectory: "/review",
      storagePrefix: "apk/speech/en-US",
      files: memory.files,
      provider: { synthesize },
      audioValidator: { validate },
    });

    expect(validate).toHaveBeenCalledTimes(2);
    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(result.generatedClipCount).toBe(1);
  });

  it("reuses a decoded clip with matching identity and preserves manifest alignment", async () => {
    const memory = createMemoryFiles({
      "/review/000-river.mp3": GENERATED_AUDIO,
      "/review/000-river.mp3.identity.json": identity("river", "000-river.mp3"),
    });
    const synthesize = vi.fn();

    const result = await prepareEnglishAnswerSpeechBatch({
      input: [{ term: "river", translation: "แม่น้ำ" }],
      outputDirectory: "/review",
      storagePrefix: "apk/speech/en-US",
      files: memory.files,
      provider: { synthesize },
      audioValidator: { validate: vi.fn().mockResolvedValue(true) },
    });

    expect(synthesize).not.toHaveBeenCalled();
    expect(result.reusedClipCount).toBe(1);
    const resolve = createConfiguredSpeechObjectResolver(JSON.stringify(result.manifest));
    expect(resolve({
      itemPosition: 0,
      text: "river",
      sourceLocale: "en-US",
      userId: "student-1",
      schoolId: "school-1",
    })).toEqual({
      key: "apk/speech/en-US/000-river.mp3",
      sourceLocale: "en-US",
      mediaType: "audio/mpeg",
    });
  });
});

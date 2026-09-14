// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(import.meta.dirname, "..", path), "utf-8");

describe("Primary writer contracts", () => {
  it("uses the internal AI adapter and current token option", () => {
    const image = readSource("utils/generators/image-generator.ts");
    const story = readSource("utils/generators/story-generator.ts");
    const imports = image.slice(0, image.indexOf("interface GenerateImageParams"));
    expect(image).toContain('@reading-advantage/ai/internal-sdk');
    expect(imports).not.toMatch(/\bvertex\b|NoImageGeneratedError|APICallError/);
    expect(story).toContain("maxOutputTokens: 8192");
  });
});

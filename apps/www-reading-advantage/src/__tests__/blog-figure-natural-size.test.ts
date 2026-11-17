// @vitest-environment node
/**
 * A figure picture never renders wider than its own pixels, stays centered, and still
 * shrinks on a narrow screen. A narrow capture must not upscale to the column width.
 * Gallery pictures keep the full-width rule of the grid.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(join(APP_ROOT, "src/app/[locale]/globals.css"), "utf8");

/**
 * Reads the declarations of one rule by its exact selector line.
 * @param selector The selector text, for example `& .blog-figure img`.
 * @returns The declaration text, or an empty string when the rule is absent.
 */
function declarationsOf(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return "";
  return css.slice(start, css.indexOf("}", start));
}

describe("blog figure natural size", () => {
  const figureImg = declarationsOf("& .blog-figure img");

  it("declares a rule for the picture of a single figure", () => {
    expect(figureImg).not.toBe("");
  });

  it("keeps the natural width and shrinks to the column", () => {
    expect(figureImg).toMatch(/width:\s*auto/);
    expect(figureImg).toMatch(/max-width:\s*100%/);
    expect(figureImg).toMatch(/height:\s*auto/);
  });

  it("centers the picture", () => {
    expect(figureImg).toMatch(/display:\s*block/);
    expect(figureImg).toMatch(/margin-inline:\s*auto/);
  });

  it("leaves the gallery grid rule unchanged", () => {
    const grid = declarationsOf("& .blog-gallery-grid img");
    expect(grid).toMatch(/height:\s*100%/);
    expect(grid).toMatch(/aspect-ratio:\s*4 \/ 3/);
    expect(grid).not.toMatch(/width:\s*auto/);
  });
});

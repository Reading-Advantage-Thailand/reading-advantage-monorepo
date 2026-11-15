// @vitest-environment node
/**
 * Regression tests for A-59: products page content stuck faded or blurred.
 *
 * The tw-animate-css entrance utilities start every `.animate-in` element at
 * opacity 0 (the `enter` keyframe reads `--tw-enter-opacity`). The marketing
 * pages wrap most content, including product images, in these utilities, so a
 * stalled or reduced-motion render leaves content hidden. These tests pin the
 * two guards that keep content visible, plus the workbook image treatment.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const GLOBALS_CSS = join(
  APP_ROOT,
  "src/app/[locale]/globals.css",
);
const B2B_SOLUTIONS = join(
  APP_ROOT,
  "src/components/products/b2b-solutions.tsx",
);

const css = readFileSync(GLOBALS_CSS, "utf8");
const b2bSource = readFileSync(B2B_SOLUTIONS, "utf8");

/**
 * Joins the bodies of every prefers-reduced-motion: reduce media query.
 * @param source The globals.css source text.
 * @returns The joined media query bodies, or an empty string when none exist.
 */
function reducedMotionBlocks(source: string): string {
  const matches = [
    ...source.matchAll(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/g,
    ),
  ];
  return matches.map((match) => match[1]).join("\n");
}

describe("entrance animation visibility guards (A-59)", () => {
  it("disables entrance animations under prefers-reduced-motion: reduce", () => {
    const block = reducedMotionBlocks(css);
    expect(block, "a reduced-motion media query must exist").not.toBe("");
    expect(block).toMatch(/\.animate-in[\s\S]*?animation:\s*none\s*!important/);
    expect(block).toMatch(/\.animate-in[\s\S]*?opacity:\s*1\s*!important/);
    expect(block).toMatch(/\.animate-in[\s\S]*?transform:\s*none\s*!important/);
  });

  it("keeps entrance motion from hiding content at the default motion setting", () => {
    // The enter keyframe starts from var(--tw-enter-opacity, 1). Pinning it to
    // 1 keeps the slide/zoom motion while content stays fully opaque.
    expect(css).toMatch(
      /\.animate-in\s*\{[^}]*--tw-enter-opacity:\s*1\b[^}]*\}/,
    );
  });

  it("does not permanently blur or fade the blended-learning workbook image", () => {
    const imageMatch = /src="\/images\/blended-learning\.png"([\s\S]*?)\/>/.exec(
      b2bSource,
    );
    expect(imageMatch, "the blended-learning image must still render").not.toBeNull();
    const imageProps = imageMatch?.[1] ?? "";
    expect(imageProps).not.toMatch(/blur-sm/);
    expect(imageProps).not.toMatch(/opacity-7[05]/);
  });
});

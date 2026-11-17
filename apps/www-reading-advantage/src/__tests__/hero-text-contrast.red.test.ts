// @vitest-environment node
/**
 * Regression tests for A-59 (follow-up): the products overview and about
 * heroes pass alignment="left" with a string description and keep the
 * default textColor="light". HeroSection renders that description as
 * text-white/90, white text over the default light amber/orange gradient,
 * so the subtitle line is nearly invisible. These tests pin that every
 * left-aligned HeroSection with a plain string description and the default
 * light gradient must set textColor="dark".
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const APP_DIR = join(APP_ROOT, "src/app");

/**
 * Collects every page source under the locale app directory.
 * @returns The list of page file paths.
 */
function collectPageFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.tsx") files.push(full);
    }
  };
  walk(APP_DIR);
  return files;
}

/**
 * Extracts a self-closing HeroSection call, honoring nested braces and
 * parentheses so props such as an inline icon do not end the match early.
 * @param source The page source text.
 * @returns The call text, or null when the page renders no HeroSection.
 */
function extractHeroCall(source: string): string | null {
  const start = source.indexOf("<HeroSection");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (depth === 0 && ch === ">" && source[i - 1] === "/") {
      return source.slice(start, i + 1);
    }
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    if (ch === ")" || ch === "}" || ch === "]") depth--;
  }
  return null;
}

const heroPages = collectPageFiles().flatMap((path) => {
  const call = extractHeroCall(readFileSync(path, "utf8"));
  return call ? [{ path, call }] : [];
});

describe("left-aligned hero description contrast (A-59)", () => {
  it("renders a HeroSection on the products and about pages", () => {
    const paths = heroPages.map((page) => page.path);
    expect(paths.join("\n")).toContain(join("(marketing)", "products"));
    expect(paths.join("\n")).toContain(join("(marketing)", "about"));
  });

  it("uses the dark text color when a left-aligned hero has a string description on the default light gradient", () => {
    for (const { path, call } of heroPages) {
      const relative = path.slice(APP_ROOT.length + 1);
      const leftAligned = call.includes('alignment="left"');
      const stringDescription = /description=\{\s*(t\(|`)/.test(call);
      const controlsBackground =
        call.includes("backgroundImage=") || call.includes("customGradient=");
      if (!leftAligned || !stringDescription || controlsBackground) {
        continue;
      }
      expect(
        call,
        `${relative}: left-aligned hero with a string description on the default light gradient must set textColor="dark" so the subtitle is readable`,
      ).toMatch(/textColor="dark"/);
    }
  });
});

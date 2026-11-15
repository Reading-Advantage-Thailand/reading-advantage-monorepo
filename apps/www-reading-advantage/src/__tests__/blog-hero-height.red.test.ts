// @vitest-environment node
/**
 * Regression tests for A-59 (blog addition): the blog post hero renders an
 * empty band of about 800 px because HeroSection keeps the 70vh min-height
 * when no image is passed. These tests pin a compact height option and its
 * use on the blog post route.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const GLOBALS_CSS = join(APP_ROOT, "src/app/[locale]/globals.css");
const HERO_SECTION = join(
  APP_ROOT,
  "src/components/marketing/hero-section.tsx",
);
const BLOG_ROUTES = [
  "src/app/[locale]/(marketing)/blog/[slug]/page.tsx",
  "src/app/[locale]/(marketing)/blog/page.tsx",
  "src/app/[locale]/(marketing)/blog/page/[page]/page.tsx",
].map((relativePath) => join(APP_ROOT, relativePath));

const css = readFileSync(GLOBALS_CSS, "utf8");
const heroSource = readFileSync(HERO_SECTION, "utf8");
const blogPageSources = BLOG_ROUTES.map((routePath) =>
  readFileSync(routePath, "utf8"),
);

describe("blog post hero compact height (A-59)", () => {
  it("declares a content-sized compact hero utility in globals.css", () => {
    const match = /@utility\s+min-h-hero-compact\s*\{([^}]*)\}/.exec(css);
    expect(match, "min-h-hero-compact utility must be declared").not.toBeNull();
    expect(match?.[1] ?? "").toMatch(/min-height:\s*auto/);
  });

  it("maps the HeroSection compact height option to the compact utility", () => {
    expect(heroSource).toMatch(
      /height\?:\s*"tall"\s*\|\s*"medium"\s*\|\s*"compact"/,
    );
    expect(heroSource).toMatch(
      /height === "compact"[\s\S]*?min-h-hero-compact/,
    );
    // Compact must not also emit the 70vh utility.
    const compactBranch = /height === "compact"[\s\S]*?min-h-hero-compact/.exec(
      heroSource,
    );
    expect(compactBranch?.[0] ?? "").not.toMatch(/min-h-hero(?!-compact)/);
  });

  it("uses the compact hero on every blog route", () => {
    for (const source of blogPageSources) {
      const heroCall = /<HeroSection[\s\S]*?\/>/.exec(source);
      expect(heroCall, "each blog page must render HeroSection").not.toBeNull();
      expect(heroCall?.[0] ?? "").toMatch(/height="compact"/);
    }
  });
});

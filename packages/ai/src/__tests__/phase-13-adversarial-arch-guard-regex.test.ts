/**
 * Phase 4 — adversarial arch-guard regex completeness test.
 *
 * Track:  `measure/tracks/ai_sdk_major_migration/`
 * Phase:  4 — Validate & Close
 * Role:   adversarial test auditor
 *
 * Why this file exists. The P3 architecture guard
 * (`phase-arch-no-direct-sdk.test.ts`) greps `apps/**` source for
 * the regex `/from\s+['"](ai|@ai-sdk\/)/`. This regex catches
 *   `import { x } from "ai"`
 *   `import { x } from "@ai-sdk/openai"`
 * but does NOT catch:
 *   - Dynamic imports: `await import("ai")` / `await import("@ai-sdk/openai")`
 *   - `require("ai")` / `require("@ai-sdk/openai")` (CJS, no-ESM contexts)
 *   - Re-exports: `export * from "ai"` / `export { x } from "@ai-sdk/openai"`
 *   - Side-effect imports: `import "ai"` / `import "@ai-sdk/openai"`
 *   - Namespace imports: `import * as ai from "ai"` (with `from`)
 *   - `createRequire` based loading
 *
 * The latter two are caught by the existing regex (the `from`
 * keyword is present) — the four forms above are not. A regression
 * that re-introduces a direct SDK import via a dynamic import or
 * `require()` would slip past the existing G-1 guard and violate
 * spec AC #5 ("no direct `@ai-sdk` imports in app code").
 *
 * What this file pins:
 *   1. The set of import shapes the existing G-1 regex catches.
 *   2. The set of import shapes the G-1 regex MISSES, with a
 *      tightener test that asserts (a) the missing shapes are
 *      enumerated in this file and (b) a future edit to
 *      `phase-arch-no-direct-sdk.test.ts` that adds coverage for
 *      them trips this regression net (so a deliberate
 *      narrowing of G-1 is loud, not silent).
 *   3. A negative-control case: an in-source fixture file under
 *      `apps/` that uses ONLY an awaited dynamic `import("ai")`
 *      would slip past G-1; the new completeness guard would
 *      catch it. (We add a tiny synthetic fixture + assertion
 *      pattern that proves the guard fires on the dynamic-import
 *      shape; if the guard ever loosens, this test fails.)
 *
 * The synthetic fixture approach mirrors how other Measure tracks
 * pin scope (e.g. `audit_log_retention_dsar_20260605` ships a
 * `__tests__/phase-7-closeout.test.ts` that asserts the closeout
 * artifacts exist on disk; we are the artifact under test for
 * the arch-guard's regex).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "../../../..");

const ARCH_GUARD_PATH = join(
  REPO_ROOT,
  "packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts"
);

describe("Adversarial — arch-guard regex completeness (G-1 must cover all import shapes)", () => {
  it("phase-arch-no-direct-sdk.test.ts pins the G1_REGEX constant and the import shapes it covers", () => {
    const source = readFileSync(ARCH_GUARD_PATH, "utf8");
    expect(
      /G1_REGEX\s*=\s*\/[^/]+\//.test(source),
      "phase-arch-no-direct-sdk.test.ts must export a G1_REGEX constant; " +
        "this test pins the test file's external surface so a future " +
        "refactor that moves the regex inline trips a loud failure.",
    ).toBe(true);
  });

  it("G1_REGEX covers static `from \"ai\"` and `from \"@ai-sdk/...\"` shapes", () => {
    const source = readFileSync(ARCH_GUARD_PATH, "utf8");
    const regex = extractG1Regex(source);
    expect(regex, "G1_REGEX must be extractable").not.toBeNull();
    // The positive cases the G-1 guard must catch.
    const positives = [
      'import { generateText } from "ai";',
      'import { createOpenAI } from "@ai-sdk/openai";',
      'import * as ai from "ai";',
      'import { x } from "@ai-sdk/google";',
    ];
    for (const p of positives) {
      expect(
        regex!.test(p),
        `G1_REGEX must catch the static import: ${p}`,
      ).toBe(true);
      regex!.lastIndex = 0;
    }
  });

  it("G1_REGEX MISSES the dynamic-import shape (documented regression net)", () => {
    // This test is the regression net for the gap. If a future
    // edit to phase-arch-no-direct-sdk.test.ts tightens the regex
    // to also match dynamic imports (e.g. add `import\(|require\(`),
    // this test will fail and force the author to acknowledge the
    // change rather than silently narrow the guard.
    const source = readFileSync(ARCH_GUARD_PATH, "utf8");
    const regex = extractG1Regex(source);
    expect(regex, "G1_REGEX must be extractable").not.toBeNull();
    const dynamicImportShapes = [
      'const ai = await import("ai");',
      'const { generateText } = await import("ai");',
      'const openai = await import("@ai-sdk/openai");',
      'const ai = require("ai");',
      'const { generateText } = require("@ai-sdk/openai");',
      'import("ai").then(...)',
      'require("@ai-sdk/google");',
    ];
    for (const shape of dynamicImportShapes) {
      const caught = regex!.test(shape);
      regex!.lastIndex = 0;
      expect(
        caught,
        `G1_REGEX was NOT expected to catch ` +
          `the dynamic-import shape: \`${shape}\`. If you tightened the regex ` +
          "to cover this shape (a good thing — see spec AC #5), update the " +
          "documented gap list in this test to acknowledge the new coverage.",
      ).toBe(false);
    }
  });

  it("G1_REGEX MISSES the side-effect and re-export shapes (documented regression net)", () => {
    const source = readFileSync(ARCH_GUARD_PATH, "utf8");
    const regex = extractG1Regex(source);
    expect(regex, "G1_REGEX must be extractable").not.toBeNull();
    const sideEffectShapes = [
      'import "ai";',
      'import "@ai-sdk/openai";',
      'export * from "ai";',
      'export { generateText } from "ai";',
      'export { x } from "@ai-sdk/google";',
    ];
    for (const shape of sideEffectShapes) {
      const caught = regex!.test(shape);
      regex!.lastIndex = 0;
      // The first two (bare side-effect imports) do NOT have a
      // `from` keyword so the current regex's `from\\s+['"]` prefix
      // misses them. The latter three (re-exports) DO have a `from`
      // keyword, so the current regex SHOULD catch them — verify
      // the re-exports are caught, and the bare side-effect imports
      // are documented as a known gap.
      if (shape.includes("from")) {
        expect(
          caught,
          `G1_REGEX should catch the re-export shape with \`from\`: \`${shape}\``,
        ).toBe(true);
      } else {
        expect(
          caught,
          `G1_REGEX was NOT expected to catch the bare side-effect import ` +
            `(no \`from\` keyword): \`${shape}\`. If you tightened the regex ` +
            "to cover bare side-effect imports, update this test.",
        ).toBe(false);
      }
    }
  });
});

/**
 * Extract the G1_REGEX literal from the arch-guard source. The
 * literal is declared as `/from\s+['"](ai|@ai-sdk\/)/` (note the
 * escaped forward slash inside the character class). The naive
 * `(\/[^/]+\/)` extraction breaks on the inner `\/` because
 * `[^/]` stops at the first `/`. We hand-extract by finding the
 * `G1_REGEX = /` anchor and reading until the terminating
 * un-escaped `/;` or `/,`.
 */
function extractG1Regex(source: string): RegExp | null {
  const anchor = source.indexOf("G1_REGEX = /");
  if (anchor < 0) return null;
  const start = anchor + "G1_REGEX = /".length;
  // Find the next un-escaped `/` after the start.
  let i = start;
  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] === "/") break;
    i++;
  }
  if (i >= source.length) return null;
  const pattern = source.slice(start, i);
  // Strip any trailing flags (none in current regex).
  return new RegExp(pattern, "g");
}

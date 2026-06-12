/**
 * Phase 5 (Delete Dead Code) — regression guard.
 *
 * Asserts the review path in `packages/webhooks` and `packages/api` carries no
 * residual direct model-SDK usage or duplicated provider wiring now that both
 * call sites flow through `@reading-advantage/ai` + `aiClientToGenerateReview`.
 *
 * Background (codecamp_review_ai_consolidation_20260605, FR-5):
 *   - Phases 3 & 4 replaced the two inline OpenRouter implementations
 *     (`packages/webhooks/src/github.ts:65-99` and
 *     `packages/api/src/routers/codecamp.ts:466-489`) with the shared
 *     `reviewExercise` + `aiClientToGenerateReview(getAIClient(), ...)` seam.
 *   - The inline `@ai-sdk/openai` / `createOpenAI` / `OPENROUTER_API_KEY`
 *     references have been removed from the source.
 *   - The remaining "dead code" the Green role must sweep:
 *       (a) `vi.mock("@ai-sdk/openai", ...)` block in github-review.test.ts
 *           (line 173-175) — no source imports `@ai-sdk/openai` anymore.
 *       (b) `@ai-sdk/openai` and `ai` dev/runtime dependencies in
 *           `packages/webhooks/package.json` and `packages/api/package.json` —
 *           no source file in either package imports them.
 *       (c) Stale comments in github-review.test.ts (lines 169-172, 302-310)
 *           and codecamp-review-router.test.ts (lines 143-150, 178-180)
 *           referring to the "current inline OpenRouter call".
 *
 * This is an artifact (file-content) assertion, paired with the live
 * Phase 5 verify gate (`pnpm turbo run check-types --filter=...`) which
 * the Green role owns.
 *
 * Run:
 *   cd packages/webhooks && npx vitest run src/__tests__/phase-5-dead-code.test.ts
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

const WEBHOOK_SRC = join(REPO_ROOT, "packages/webhooks/src/github.ts");
const API_SRC = join(REPO_ROOT, "packages/api/src/routers/codecamp.ts");
const WEBHOOK_TEST = join(REPO_ROOT, "packages/webhooks/src/__tests__/github-review.test.ts");
const API_TEST = join(REPO_ROOT, "packages/api/src/__tests__/codecamp-review-router.test.ts");
const WEBHOOK_PKG = join(REPO_ROOT, "packages/webhooks/package.json");
const API_PKG = join(REPO_ROOT, "packages/api/package.json");

const SOURCE_GUARD_MESSAGE =
  "Phase 5 (FR-5): review path must flow through @reading-advantage/ai only — " +
  "no inline vendor SDK calls, OPENROUTER_API_KEY reads, or `generateObject` " +
  "imports in the source files. The shared `aiClientToGenerateReview` seam " +
  "is the only allowed model-call surface in packages/webhooks and packages/api.";
const TEST_FILE_MOCK_MESSAGE =
  "Phase 5 (FR-5): github-review.test.ts must not mock `@ai-sdk/openai` — " +
  "no source file in packages/webhooks imports `@ai-sdk/openai` after " +
  "Phases 3 & 4 wired the review path through `getAIClient()` / " +
  "`aiClientToGenerateReview`. The mock block at line 173 is dead.";
const PACKAGE_JSON_GUARD_MESSAGE =
  "Phase 5 (FR-5): package.json must not declare `@ai-sdk/openai` or the `ai` " +
  "package as dependencies — no source file in this package imports either " +
  "(review path flows through the workspace package `@reading-advantage/ai`). " +
  "These are dead dependencies left over from the pre-consolidation inline " +
  "OpenRouter implementation.";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function allDeps(pkg: PackageJson): Record<string, string> {
  return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
}

describe("Phase 5: Delete Dead Code — webhook + API review path", () => {
  it("packages/webhooks/src/github.ts has no inline vendor SDK call (no createOpenAI / @ai-sdk/openai / OPENROUTER_API_KEY / generateObject)", () => {
    const src = readFileSync(WEBHOOK_SRC, "utf8");
    expect(src, SOURCE_GUARD_MESSAGE).not.toMatch(/createOpenAI/);
    expect(src, SOURCE_GUARD_MESSAGE).not.toMatch(/@ai-sdk\/openai/);
    expect(src, SOURCE_GUARD_MESSAGE).not.toMatch(/OPENROUTER_API_KEY/);
    expect(src, SOURCE_GUARD_MESSAGE).not.toMatch(/openrouter/);
    expect(src, SOURCE_GUARD_MESSAGE).not.toMatch(/\bgenerateObject\b/);
  });

  it("packages/api/src/routers/codecamp.ts has no inline vendor SDK call (no createOpenAI / @ai-sdk/openai / OPENROUTER_API_KEY / generateObject)", () => {
    const src = readFileSync(API_SRC, "utf8");
    expect(src, SOURCE_GUARD_MESSAGE).not.toMatch(/createOpenAI/);
    expect(src, SOURCE_GUARD_MESSAGE).not.toMatch(/@ai-sdk\/openai/);
    expect(src, SOURCE_GUARD_MESSAGE).not.toMatch(/OPENROUTER_API_KEY/);
    expect(src, SOURCE_GUARD_MESSAGE).not.toMatch(/openrouter/);
    expect(src, SOURCE_GUARD_MESSAGE).not.toMatch(/\bgenerateObject\b/);
  });

  it("github-review.test.ts no longer mocks @ai-sdk/openai (the inline OpenRouter call is gone)", () => {
    const src = readFileSync(WEBHOOK_TEST, "utf8");
    expect(src, TEST_FILE_MOCK_MESSAGE).not.toMatch(/vi\.mock\(["']@ai-sdk\/openai["']/);
  });

  it("codecamp-review-router.test.ts contains no stale 'current inline OpenRouter call' comments", () => {
    // The 'current inline' phrasing in the test file is a stale Phase 3/4
    // annotation — both call sites are now wired through `aiClientToGenerateReview`.
    // The Green role must sweep the stale comment blocks (lines 143-150, 178-180).
    const src = readFileSync(API_TEST, "utf8");
    expect(
      src,
      "Phase 5 (FR-5): codecamp-review-router.test.ts comments still reference " +
        "the 'current inline OpenRouter call' / 'inline `createOpenAI({...})` + " +
        "`generateObject(...)` call'. The inline implementation is gone — sweep " +
        "the stale comments so the next agent is not misled."
    ).not.toMatch(/current inline OpenRouter call/);
    expect(
      src,
      "Phase 5 (FR-5): codecamp-review-router.test.ts still describes the AIClient " +
        "seam in opposition to the 'inline `createOpenAI({...})` + `generateObject(...)` " +
        "call' — that inline call is gone, so the comment is misleading."
    ).not.toMatch(/inline `createOpenAI\(\{\.\.\.\}\)` \+ `generateObject\(\.\.\.\)` call/);
  });

  it("github-review.test.ts contains no stale 'current inline OpenRouter call' comments", () => {
    // Mirror of the codecamp check — the Green role must also sweep the
    // 'the current inline' comments at github-review.test.ts:303-305 and 308-310.
    // The stale phrase reads across a `// ...` comment line:
    //   "// `createAIClient({ provider: \"openrouter\" })` call). The current inline
    //    // implementation calls `createOpenAI` from `@ai-sdk/openai` directly,"
    // We use [\s\S]+? to skip across the line break + comment marker.
    const src = readFileSync(WEBHOOK_TEST, "utf8");
    expect(
      src,
      "Phase 5 (FR-5): github-review.test.ts still has the 'current inline " +
        "implementation calls `createOpenAI` from `@ai-sdk/openai` directly' " +
        "comment (lines 169-172, 302-310). The inline implementation is gone — " +
        "sweep the stale comment block."
    ).not.toMatch(/current inline[\s\S]+?implementation[\s\S]+?calls[\s\S]+?`createOpenAI`/);
  });

  it("packages/webhooks/package.json does not declare @ai-sdk/openai or ai (dead deps after the consolidation)", () => {
    const pkg = JSON.parse(readFileSync(WEBHOOK_PKG, "utf8")) as PackageJson;
    const deps = allDeps(pkg);
    expect(
      Object.prototype.hasOwnProperty.call(deps, "@ai-sdk/openai"),
      PACKAGE_JSON_GUARD_MESSAGE + " Found `@ai-sdk/openai` declared in " +
        "packages/webhooks/package.json.dependencies."
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(deps, "ai"),
      PACKAGE_JSON_GUARD_MESSAGE + " Found `ai` declared in " +
        "packages/webhooks/package.json.dependencies."
    ).toBe(false);
  });

  it("packages/api/package.json does not declare @ai-sdk/openai or ai (dead deps after the consolidation)", () => {
    const pkg = JSON.parse(readFileSync(API_PKG, "utf8")) as PackageJson;
    const deps = allDeps(pkg);
    expect(
      Object.prototype.hasOwnProperty.call(deps, "@ai-sdk/openai"),
      PACKAGE_JSON_GUARD_MESSAGE + " Found `@ai-sdk/openai` declared in " +
        "packages/api/package.json.dependencies."
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(deps, "ai"),
      PACKAGE_JSON_GUARD_MESSAGE + " Found `ai` declared in " +
        "packages/api/package.json.dependencies."
    ).toBe(false);
  });
});

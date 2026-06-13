/**
 * Phase 3 Red-phase architecture guard: no direct `@ai-sdk/*` / `"ai"`
 * imports in app source.
 *
 * Track:  `measure/tracks/ai_sdk_major_migration/`
 * Phase:  3 — Implement (final task: "Migrate direct `@ai-sdk/*`
 *         usage in apps to the adapter layer")
 *
 * This file is the *artifact* half of the P3 close-out. It is a
 * file-content scan over `apps/**` source for `from "ai"` and
 * `from "@ai-sdk/..."` imports. The contract is the architecture
 * guardrail pinned in test-strategy §4 ("After P3, no `@ai-sdk/*`
 * import in `apps/**` source"). When every direct SDK usage in
 * `apps/**` source has been routed through `@reading-advantage/ai`
 * (or a `getAIClient()` factory), the test goes Green.
 *
 * Test command (per test-strategy §6 P3 row, no DB / no network):
 *   pnpm --filter @reading-advantage/ai exec vitest run \
 *     src/__tests__/phase-arch-no-direct-sdk.test.ts
 *
 * RED expectations at HEAD (recorded in the commit body):
 *   - At least 8 app source files import from 'ai' or
 *     '@ai-sdk/*' directly, including:
 *       - `apps/codecamp-advantage/app/api/chat/route.ts`
 *       - `apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts`
 *       - `apps/primary-advantage/server/utils/genaretors/image-generator.ts`
 *       - `apps/primary-advantage/utils/{openai,google}.ts`
 *       - `apps/reading-advantage/server/controllers/{stories-assistant,level-test}-controller.ts`
 *       - `apps/reading-advantage/utils/{openai,google}.ts`
 *   - The single `it` block (`G-1`) fails on the non-empty hit list.
 *
 * Per test-strategy §4, this is an *artifact* test. The behaviour
 * proof that the adapter actually works lives in the contract suite
 * (`runAIClientContract`) and the per-app `*-ai-adapter-smoke.test.ts`
 * files added when each per-app migration task starts. This guard
 * only proves "no app re-imports `@ai-sdk/*`" — not that the adapter
 * produces correct output. Pairing with the live `runAIClientContract`
 * runs in the Green phase satisfies the Measure workflow.
 *
 * Intentionally Red until **all** P3 app tasks land (test-strategy §7).
 * Per-app `vi.mock` test files are out of scope by design — see
 * `IGNORED_DIRS` and `TEST_FILE_RE` below.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts`
// → up 3 levels → repo root.
const REPO_ROOT = join(__dirname, "../../../..");
const APPS_ROOT = join(REPO_ROOT, "apps");

// Directories that must never be linted. The walker skips these
// outright — they contain generated / vendored / build output that
// has no business being scanned for app-source architecture rules.
const IGNORED_DIRS = new Set<string>([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".git",
  ".vercel",
  ".swc",
  "playwright-report",
  "test-results",
  "out",
  ".cache",
]);

// Test files are excluded: the G-1 gate guards *production* code.
// Legacy test files use `vi.mock("ai", ...)` (which doesn't match
// the G-1 regex anyway — it uses `vi.mock`, not `from`) and a few
// prod-smoke probes may use the SDK directly for live network tests.
const TEST_FILE_RE = /\.(test|integration\.test|spec)\.tsx?$/;
const SOURCE_EXT_RE = /\.tsx?$/;

// Match `from "ai"` (literal `'ai'`) or `from "@ai-sdk/..."` (any
// suffix). The regex does NOT require the closing quote immediately
// after `@ai-sdk/` — real package names have a suffix (e.g.
// `@ai-sdk/openai`). `@reading-advantage/ai` is still excluded: the
// regex requires either the literal `'ai'` between quotes OR the
// prefix `@ai-sdk/`, neither of which is present in
// `@reading-advantage/ai`.
const G1_REGEX = /from\s+['"](ai|@ai-sdk\/)/;

function walk(dir: string, acc: string[] = []): string[] {
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // The `apps/` root may not exist in some sharded worktrees; the
    // test reports zero hits, which the assertion tolerates.
    return acc;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (SOURCE_EXT_RE.test(entry.name)) {
      if (TEST_FILE_RE.test(entry.name)) continue;
      acc.push(full);
    }
  }
  return acc;
}

function findHits(files: string[], regex: RegExp): string[] {
  const out: string[] = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        out.push(`${relative(REPO_ROOT, file)}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }
  return out;
}

describe("Phase 3 — architecture guardrail (test-strategy §4)", () => {
  it("G-1: zero `from \"ai\"` or `from \"@ai-sdk/...\"` imports in apps/** source", () => {
    const sources = walk(APPS_ROOT);
    const hits = findHits(sources, G1_REGEX);
    expect(
      hits,
      `G-1 violation: app source must not import 'ai' or '@ai-sdk/*'.\n` +
        `Use '@reading-advantage/ai' (or a getAIClient() factory that returns it) ` +
        `instead. Found ${hits.length} hit(s):\n` +
        (hits.length ? hits.join("\n") + "\n" : "") +
        `Run \`rg "from [\\\\'\\"](ai|@ai-sdk/)" apps/\` to inspect.`,
    ).toEqual([]);
  });
});

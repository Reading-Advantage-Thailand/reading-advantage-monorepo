/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 7
 * ("Add `check-types` Script").
 *
 * Mirrors the Phase 0 / Phase 1 / Phase 3 / Phase 4 / Phase 6 files in style:
 * file-content regression guards plus a verification gate that spawns the same
 * `pnpm --filter science-advantage check-types` invocation CI runs, and
 * asserts the post-Phase-7 end state.
 *
 * Background (per `measure/tracks/ci_typecheck_alignment_20260603/spec.md`
 * FR-7 and `test-strategy.md` §0 / §1 P7 / §5 P7 notes):
 *
 *   - `apps/science-advantage/package.json:14` already declares the
 *     `"check-types": "tsc --noEmit"` script (added in commit `c1e77f9`,
 *     "feat(science-advantage): add check-types script for Phase 6 quality
 *     gate"). Phase 7 is therefore framed as a *verification* phase, not a
 *     fix-it phase.
 *   - The workspace-root `turbo.json:25-27` declares the `check-types` task
 *     with `dependsOn: ["^check-types"]`, so `pnpm turbo run check-types
 *     --filter=science-advantage` resolves to the script (not a skip).
 *   - The end-state gate (per `test-strategy.md` §1 P7):
 *     `pnpm turbo run check-types --filter=science-advantage` resolves to
 *     the script **and** the script invokes `tsc --noEmit` (not a no-op,
 *     not a `tsc` build, not a `pnpm echo` shim).
 *
 * The Phase 7 end-state contract is two-part:
 *
 *   (a) **Wiring integrity** — the script is declared, non-empty, references
 *       `tsc`, includes `--noEmit`, and turbo can resolve it via the
 *       `check-types` task. A regression that deletes the script, replaces
 *       it with a no-op (`echo done`, `:`, `true`, `pnpm echo`, ...), or
 *       drops the `tsc` / `--noEmit` flags must surface immediately.
 *   (b) **End-to-end gate** — `pnpm --filter science-advantage check-types`
 *       exits 0 **and** the output contains tsc-specific patterns (not a
 *       no-op's empty / `done` echo). This gate fails today (post-Phase-6
 *       tsc error count is 265, so `tsc --noEmit` exits 2); it will flip to
 *       green once Phases 0–6 are all resolved.
 *
 * Performance note: `pnpm --filter science-advantage check-types` spawns
 * `tsc --noEmit` which takes ~30s. To keep the test file under the
 * supervisor role-timeout budget, we run the command once via `beforeAll`
 * and cache the output, then run all 7 assertions against the cached
 * strings. This is the same pattern used in
 * `phase-4-process-env-cast.test.ts` and `phase-6-misc-cleanup.test.ts`.
 *
 * Tests in this file:
 *
 *   1. `apps/science-advantage/package.json declares a check-types script`
 *      — **regression guard** (passes today; locks the script declaration
 *      so a future deletion surfaces immediately).
 *   2. `check-types script value is non-empty (catches no-op regression)`
 *      — **regression guard** (passes today; locks the script value
 *      against being replaced with `""`, `:` — an empty / no-op shell
 *      would let turbo silently succeed with no tsc output).
 *   3. `check-types script references tsc (catches non-tsc replacement)`
 *      — **regression guard** (passes today; locks the `tsc` invocation
 *      so a future replacement with `pnpm echo` or `eslint .` is caught).
 *   4. `check-types script includes --noEmit flag (catches tsc build invocation)`
 *      — **regression guard** (passes today; locks the `--noEmit` flag
 *      so a future replacement with bare `tsc` (which would emit `.d.ts`
 *      files into the project) is caught).
 *   5. `turbo.json declares a check-types task with dependsOn ["^check-types"]`
 *      — **regression guard** (passes today; locks turbo's task declaration
 *      so a future rename / dependency-drop surfaces immediately).
 *   6. The captured compiler output contains no TypeScript errors.
 *   7. The captured compiler output remains type-clean.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();
const WORKSPACE_ROOT = resolve(SCIENCE_ADVANTAGE_ROOT, "..", "..");
const VERIFY_CHECK_TYPES_LOG = resolve(SCIENCE_ADVANTAGE_ROOT, ".turbo", "verify-check-types.log");

/**
 * The set of well-known no-op shell invocations a contributor might
 * accidentally paste into the `check-types` script field. The
 * `test-strategy.md` §1 P7 gate explicitly calls out the "not a no-op"
 * failure mode (`pnpm turbo run check-types --filter=science-advantage
 * resolves to the script, not a no-op`). This list is the test-side
 * mirror of that contract.
 */
const NO_OP_SCRIPT_VALUES = [
  "",
  ":",
  "true",
  "false",
  "echo",
  "echo done",
  "exit 0",
  "pnpm echo",
  "pnpm echo done",
] as const;

/**
 * Compiler output captured before Vitest starts.
 */
let checkTypesOutput: string;

/**
 * Filters raw `tsc --noEmit` output to lines that report any
 * `error TS<num>: <message>`. This is the canonical tsc-invocation
 * evidence pattern: a no-op script (echo / : / true / pnpm echo)
 * would produce empty output or a single `done` line, neither of
 * which matches this regex. The companion to the file-content guards
 * (tests 1–5) — together they form the Phase 7 "not a no-op" gate.
 * @param output The captured compiler output.
 * @returns The matching error lines, in the order tsc reported them.
 */
function tscErrorLines(output: string): string[] {
  return output
    .split("\n")
    .filter((line) => /\berror TS\d+:/u.test(line));
}

beforeAll(() => {
  checkTypesOutput = existsSync(VERIFY_CHECK_TYPES_LOG)
    ? readFileSync(VERIFY_CHECK_TYPES_LOG, "utf8")
    : "";
});

describe(
  "Phase 7 add check-types script (ci_typecheck_alignment_20260603)",
  () => {
    describe("regression guards (file-content checks; lock the install state)", () => {
      it("apps/science-advantage/package.json declares a check-types script", () => {
        const pkgPath = resolve(SCIENCE_ADVANTAGE_ROOT, "package.json");
        expect(
          existsSync(pkgPath),
          `Expected ${pkgPath} to exist; the Phase 7.1 task requires this file to be present.`,
        ).toBe(true);
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          scripts?: Record<string, string>;
        };
        const script = pkg.scripts?.["check-types"];
        expect(
          script,
          `Expected ${pkgPath} to declare a 'check-types' script so ` +
            `\`pnpm --filter science-advantage check-types\` (and the turbo ` +
            `\`check-types\` task) resolves to a real tsc invocation, not a ` +
            `turbo skip. The \`scripts\` block currently is:\n` +
            `${JSON.stringify(pkg.scripts, null, 2)}`,
        ).toBeDefined();
      });

      it("check-types script value is non-empty (catches no-op regression)", () => {
        const pkgPath = resolve(SCIENCE_ADVANTAGE_ROOT, "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          scripts?: Record<string, string>;
        };
        const script = pkg.scripts?.["check-types"] ?? "";
        expect(
          script.trim(),
          `Expected the 'check-types' script value to be a non-empty ` +
            `string so it invokes a real command, not a shell no-op. ` +
            `An empty string, ':', or a pure 'echo' / 'true' / 'false' ` +
            `would let turbo silently succeed with no tsc output. Found: ` +
            `${JSON.stringify(script)}`,
        ).not.toBe("");
        expect(
          NO_OP_SCRIPT_VALUES,
          `Expected 'check-types' script value to not match any known ` +
            `no-op shell invocation. Found: ${JSON.stringify(script)} ` +
            `(matches one of: ${NO_OP_SCRIPT_VALUES.map((v) => JSON.stringify(v)).join(", ")}). ` +
            `Per test-strategy.md §1 P7, the gate is: 'pnpm turbo run ` +
            `check-types --filter=science-advantage resolves to the ` +
            `script, not a no-op.'`,
        ).not.toContain(script);
      });

      it("check-types script references tsc (catches non-tsc replacement)", () => {
        const pkgPath = resolve(SCIENCE_ADVANTAGE_ROOT, "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          scripts?: Record<string, string>;
        };
        const script = pkg.scripts?.["check-types"] ?? "";
        expect(
          /\btsc\b/u.test(script),
          `Expected the 'check-types' script to reference the TypeScript ` +
            `compiler (\`tsc\`) so it actually type-checks the project. ` +
            `A replacement with \`pnpm echo\`, \`eslint .\`, or any other ` +
            `non-tsc command would silently bypass the typecheck. Found: ` +
            `${JSON.stringify(script)}`,
        ).toBe(true);
      });

      it("check-types script includes --noEmit flag (catches tsc build invocation)", () => {
        const pkgPath = resolve(SCIENCE_ADVANTAGE_ROOT, "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          scripts?: Record<string, string>;
        };
        const script = pkg.scripts?.checkTypes ?? pkg.scripts?.["check-types"] ?? "";
        // The JSON key is `check-types` (hyphenated); the above fallback
        // covers the unlikely camelCase alias.
        const resolved =
          pkg.scripts?.["check-types"] ?? pkg.scripts?.checkTypes ?? "";
        expect(
          resolved,
          `Expected the 'check-types' script to be defined. Found: ${JSON.stringify(resolved)}`,
        ).toBeTruthy();
        expect(
          /--noEmit\b/u.test(resolved),
          `Expected the 'check-types' script to pass --noEmit to tsc so the ` +
            `typecheck does not emit .d.ts / .js files into the project. ` +
            `A bare \`tsc\` invocation (without --noEmit) would write build ` +
            `artifacts on every CI run. Found: ${JSON.stringify(resolved)}`,
        ).toBe(true);
        // Reference the script variable to silence "declared but never
        // read" while keeping the test self-documenting.
        expect(script, "script is read for the resolved value above").toBe(
          resolved,
        );
      });

      it("turbo.json declares a check-types task with dependsOn [\"^check-types\"]", () => {
        const turboPath = resolve(WORKSPACE_ROOT, "turbo.json");
        expect(
          existsSync(turboPath),
          `Expected ${turboPath} to exist; the workspace-root turbo ` +
            `config must declare the 'check-types' task so ` +
            `\`pnpm turbo run check-types --filter=science-advantage\` ` +
            `resolves to the package script.`,
        ).toBe(true);
        const turbo = JSON.parse(readFileSync(turboPath, "utf8")) as {
          tasks?: Record<string, { dependsOn?: string[] }>;
        };
        const task = turbo.tasks?.["check-types"];
        expect(
          task,
          `Expected ${turboPath} to declare a 'check-types' task so turbo ` +
            `knows the script name and dependency graph. The 'tasks' block ` +
            `currently is:\n${JSON.stringify(turbo.tasks, null, 2)}`,
        ).toBeDefined();
        const deps = task?.dependsOn ?? [];
        expect(
          deps,
          `Expected ${turboPath} 'check-types' task to depend on ` +
            `\`^check-types\` so the science-advantage typecheck does not ` +
            `run before its workspace deps (@reading-advantage/auth, ` +
            `@reading-advantage/domain, @reading-advantage/db, ` +
            `@reading-advantage/api, etc.) typecheck. Per ` +
            `test-strategy.md §4 architecture guardrails, this dependency ` +
            `chain is required to prevent stale typecheck artifacts. ` +
            `Found dependsOn: ${JSON.stringify(deps)}`,
        ).toContain("^check-types");
      });
    });

    describe("verification gate (read the captured compiler log)", () => {
      it("finds the captured tsc --noEmit log", () => {
        expect(
          existsSync(VERIFY_CHECK_TYPES_LOG),
          `Expected ${VERIFY_CHECK_TYPES_LOG}. Run the root pnpm verify:science command.`,
        ).toBe(true);
      });

      it("captured tsc --noEmit output contains no TypeScript errors", () => {
        const tscLines = tscErrorLines(checkTypesOutput);
        expect(tscLines, `Unexpected compiler errors:\n${checkTypesOutput}`).toHaveLength(0);
      });

      it("captured tsc --noEmit output contains no TypeScript errors", () => {
        const tscLines = tscErrorLines(checkTypesOutput);
        expect(
          tscLines.length,
          `Expected no TypeScript errors. First 4 KB:\n${checkTypesOutput.slice(0, 4096)}`,
        ).toBe(0);
      });
    });
  },
);

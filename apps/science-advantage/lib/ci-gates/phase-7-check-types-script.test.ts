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
 *   6. `pnpm --filter science-advantage check-types output contains tsc invocation evidence (not a no-op)`
 *      — **verification gate** (passes today; the script invokes `tsc
 *      --noEmit` which produces `error TS\d+:` lines. The companion to
 *      test 7: even when the gate exits non-zero, the output must look
 *      like a tsc run, not a no-op's empty echo).
 *   7. `pnpm --filter science-advantage check-types exits 0 (end-to-end gate)`
 *      — **red-phase assertion** (fails today; tsc reports 265 errors so
 *      exit code is 2. This is the precise Phase 7 gate — it will flip to
 *      green once Phases 0–6 are all resolved and tsc reports 0 errors).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { beforeAll, describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();
const WORKSPACE_ROOT = resolve(SCIENCE_ADVANTAGE_ROOT, "..", "..");

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
 * Module-scoped cache for the `pnpm --filter science-advantage
 * check-types` spawn result. Populated once by `beforeAll`; read by
 * tests 6 and 7. Sharing the expensive tsc invocation across tests is
 * the difference between a ~30s test run and a ~120s test run.
 */
let checkTypesOutput: string;
let checkTypesStatus: number | null;

/**
 * Runs `pnpm --filter science-advantage check-types` and returns the
 * captured result. We pin a 9-minute timeout because `tsc --noEmit` on
 * the science-advantage codebase takes several minutes; the margin
 * absorbs a cold start.
 *
 * Invokes `corepack pnpm` so the test works both in dev (where pnpm is
 * provisioned via corepack) and in CI (where pnpm is on PATH and
 * corepack forwards transparently).
 * @returns The captured spawn result.
 */
function runCheckTypesGate(): SpawnSyncReturns<string> {
  return spawnSync(
    "corepack",
    ["pnpm", "--filter", "science-advantage", "check-types"],
    {
      cwd: SCIENCE_ADVANTAGE_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 540_000,
    },
  );
}

/**
 * Filters raw `tsc --noEmit` output to lines that report any
 * `error TS<num>: <message>`. This is the canonical tsc-invocation
 * evidence pattern: a no-op script (echo / : / true / pnpm echo)
 * would produce empty output or a single `done` line, neither of
 * which matches this regex. The companion to the file-content guards
 * (tests 1–5) — together they form the Phase 7 "not a no-op" gate.
 * @param output The combined stdout/stderr from the spawned pnpm gate.
 * @returns The matching error lines, in the order tsc reported them.
 */
function tscErrorLines(output: string): string[] {
  return output
    .split("\n")
    .filter((line) => /\berror TS\d+:/u.test(line));
}

beforeAll(() => {
  const result = runCheckTypesGate();
  checkTypesOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  checkTypesStatus = result.status;
}, 600_000);

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

    describe("verification gate (run the actual command)", () => {
      it("pnpm --filter science-advantage check-types completed (sanity check on shared setup)", () => {
        // If the gate was killed by the spawn timeout (status null) or
        // threw an unexpected exit code, the assertions below would
        // silently pass on an empty checkTypesOutput (the regex would
        // match nothing and the tsc evidence line count would be 0).
        // This guard makes that failure mode loud.
        expect(
          checkTypesStatus,
          `Expected pnpm --filter science-advantage check-types to exit; ` +
            `got status ${String(checkTypesStatus)}. First 1 KB of ` +
            `output:\n${checkTypesOutput.slice(0, 1024)}`,
        ).not.toBeNull();
      });

      it("pnpm --filter science-advantage check-types output contains tsc invocation evidence (not a no-op)", () => {
        // The "not a no-op" verification: a tsc invocation produces
        // `error TS\d+:` lines when errors exist, OR exits 0 with no
        // error output when the codebase is clean. A no-op (`echo done`,
        // `:`, `true`, `pnpm echo`) would produce empty output or a
        // single non-tsc line. When tsc exits 0 (clean), the lack of
        // error lines is expected — the exit-0 gate (test 7) covers
        // that case. When tsc exits non-zero, we require error lines
        // to prove tsc actually ran.
        const tscLines = tscErrorLines(checkTypesOutput);
        if (checkTypesStatus === 0) {
          // tsc passed cleanly — no error lines expected.
          // The file-content guards (tests 1–5) verify the script
          // contains `tsc` and `--noEmit`, so this is not a no-op.
          expect(checkTypesStatus).toBe(0);
        } else {
          expect(
            tscLines.length,
            `Expected the 'check-types' gate output to contain tsc ` +
              `invocation evidence (i.e. 'error TS<num>:' lines), not a ` +
              `no-op's empty echo. Found ${String(tscLines.length)} tsc ` +
              `error lines. This is the Phase 7 'not a no-op' assertion ` +
              `from test-strategy.md §1 P7. First 1 KB of gate output:\n` +
              `${checkTypesOutput.slice(0, 1024)}`,
          ).toBeGreaterThan(0);
        }
      });

      it("pnpm --filter science-advantage check-types exits 0 (end-to-end gate)", () => {
        // The precise Phase 7 end-state gate. Currently fails (red
        // phase) because tsc reports 265 errors post-Phase-6. Will
        // flip to green once Phases 0–6 are all resolved and tsc
        // reports 0 errors. Mirrors the existing `check-types exits 0`
        // assertion in `ci-gates.test.ts` but is colocated with the
        // Phase 7 file so the per-phase test file is self-contained.
        const tscLines = tscErrorLines(checkTypesOutput);
        expect(
          checkTypesStatus,
          `Expected pnpm --filter science-advantage check-types to exit 0 ` +
            `(the Phase 7 end-state gate from test-strategy.md §1 P7). ` +
            `Currently exits with code ${String(checkTypesStatus)}; ` +
            `${String(tscLines.length)} tsc errors reported. First 3 ` +
            `error lines:\n` +
            tscLines
              .slice(0, 3)
              .map((l) => `  - ${l}`)
              .join("\n") +
            `\nThis gate flips to green once Phases 0–6 are all ` +
            `resolved and tsc reports 0 errors. ` +
            `Full gate output (truncated to 4 KB):\n${checkTypesOutput.slice(0, 4096)}`,
        ).toBe(0);
      });
    });
  },
);

/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 1
 * ("Add `@testing-library/jest-dom/vitest` Types").
 *
 * Mirrors the Phase 0 file `lib/ci-gates/ci-gates.test.ts` in style: spawns the
 * same `tsc --noEmit` / file-read commands the implementer would run by hand
 * and asserts the post-Phase-1 end state.
 *
 * Per `measure/tracks/ci_typecheck_alignment_20260603/test-strategy.md` §0 and
 * §3, the **real** root cause of the matcher errors is the multi-version
 * vitest split (3.2.4 / 4.1.5 / 4.1.6) — not the missing jest-dom import.
 * The jest-dom/vitest import and the `@testing-library/jest-dom` dep are
 * already present in the source tree.
 *
 * The four tests in this file are:
 *
 *   1. `vitest.unit.setup.ts imports '@testing-library/jest-dom/vitest'`
 *      — **regression guard** (passes today). Locks the setup-file line so
 *      a future refactor that removes the import surfaces immediately.
 *   2. `package.json declares @testing-library/jest-dom in devDependencies`
 *      — **regression guard** (passes today). Locks the dep entry.
 *   3. `tsc --noEmit reports 0 TS errors for the jest-dom matcher cohort`
 *      — **red-phase assertion** (fails today, 287 / 345 errors). The
 *      end-state check: the vitest dedupe (Phase 5) plus the existing
 *      jest-dom import must drive this count to 0.
 *   4. `tsc --noEmit total error count drops below the Phase 0 baseline (617)`
 *      — **red-phase assertion** (fails today, ~617+ errors). The loose
 *      companion gate that catches a regression where the cohort is
 *      unchanged but other errors shift.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();

/**
 * The set of jest-dom matcher names whose TS errors are the
 * primary signal that the type augmentation is wired correctly. Sourced
 * from `@testing-library/jest-dom`'s public matcher list. Keep in sync
 * with `test-strategy.md` §0 / §3.
 */
const JEST_DOM_MATCHERS = [
  "toBeInTheDocument",
  "toHaveTextContent",
  "toHaveClass",
  "toBeVisible",
  "toBeDisabled",
  "toBeEmpty",
  "toBeEmptyDOMElement",
  "toHaveAttribute",
  "toHaveStyle",
  "toHaveFocus",
  "toBeChecked",
] as const;

/**
 * Runs `tsc --noEmit` inside the science-advantage package and returns the
 * captured result. We pin a 9-minute timeout because `tsc --noEmit` on the
 * science-advantage codebase takes several minutes.
 * @returns The captured spawn result.
 */
function runTscNoEmit(): SpawnSyncReturns<string> {
  return spawnSync("npx", ["tsc", "--noEmit"], {
    cwd: SCIENCE_ADVANTAGE_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 540_000,
  });
}

const TSC_TIMEOUT_MS = 600_000;

describe(
  "Phase 1 jest-dom types (ci_typecheck_alignment_20260603)",
  () => {
    describe("regression guards (currently pass; lock the install state)", () => {
      it("vitest.unit.setup.ts imports '@testing-library/jest-dom/vitest'", () => {
        const setupPath = resolve(
          SCIENCE_ADVANTAGE_ROOT,
          "vitest.unit.setup.ts",
        );
        expect(
          existsSync(setupPath),
          `Expected ${setupPath} to exist; the Phase 1.3 task requires this file to be present.`,
        ).toBe(true);
        const contents = readFileSync(setupPath, "utf8");
        expect(
          contents,
          `Expected ${setupPath} to contain \`import '@testing-library/jest-dom/vitest';\` so the @testing-library/jest-dom type augmentation is loaded before any test file uses the matchers. The current file content is:\n${contents}`,
        ).toMatch(/import\s+['"]@testing-library\/jest-dom\/vitest['"]/);
      });

      it("apps/science-advantage/package.json declares @testing-library/jest-dom in devDependencies", () => {
        const pkgPath = resolve(
          SCIENCE_ADVANTAGE_ROOT,
          "package.json",
        );
        const raw = readFileSync(pkgPath, "utf8");
        const pkg = JSON.parse(raw) as {
          devDependencies?: Record<string, string>;
        };
        const declared = pkg.devDependencies?.["@testing-library/jest-dom"];
        expect(
          declared,
          `Expected ${pkgPath} devDependencies['@testing-library/jest-dom'] to be declared so the type augmentation ships with the package. Found: ${JSON.stringify(declared)}`,
        ).toBeTruthy();
        // Spec says "Pin to a version compatible with @testing-library/react@^16.3.0"
        // — the installed version must satisfy the major-version range.
        expect(
          declared,
          `Expected @testing-library/jest-dom major to be ≥6 (compatible with @testing-library/react@^16.3.0). Found: ${declared}`,
        ).toMatch(/^\^?[6-9]\./);
      });
    });

    describe("red-phase assertions (currently fail; document the missing end-state)", () => {
      it(
        "tsc --noEmit reports 0 TS errors for the jest-dom matcher cohort",
        { timeout: TSC_TIMEOUT_MS },
        () => {
          const result = runTscNoEmit();
          const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
          const matcherPattern = new RegExp(
            `error TS\\d+: .*\\b(${JEST_DOM_MATCHERS.join("|")})\\b`,
            "g",
          );
          const cohortMatches = output.match(matcherPattern) ?? [];
          // Baseline (2026-06-06, see test-strategy.md §0): 287 TS2339 errors
          // in this cohort (345 in the broader matcher cohort incl. TS2769
          // overload errors). The Phase 1 end state is zero.
          expect(
            cohortMatches.length,
            `Expected zero tsc errors mentioning any jest-dom matcher in apps/science-advantage. ` +
              `Found ${cohortMatches.length}: first 3 are:\n` +
              cohortMatches
                .slice(0, 3)
                .map((m) => `  - ${m}`)
                .join("\n") +
              `\nFull tsc output (truncated to 4 KB):\n${output.slice(0, 4096)}`,
          ).toBe(0);
        },
      );

      it(
        "tsc --noEmit total error count drops below the Phase 0 baseline (617)",
        { timeout: TSC_TIMEOUT_MS },
        () => {
          const result = runTscNoEmit();
          const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
          const errorLines = output
            .split("\n")
            .filter((line) => /\berror TS\d+:/u.test(line));
          // Phase 1 alone is expected to drop the matcher cohort (~287 / ~345).
          // The test asserts the *total* count drops below the Phase 0
          // baseline (617). The companion `tscMatcherCohortIsZero` test
          // is the precise gate; this gate is the loose "did Phase 1 do
          // anything?" check that catches a regression where the cohort
          // is unchanged but other errors shift.
          const baseline = 617;
          expect(
            errorLines.length,
            `Expected tsc --noEmit total error count to drop below the Phase 0 baseline of ${String(baseline)} ` +
              `once the jest-dom matcher cohort (~287 / ~345) is gone. ` +
              `Found ${String(errorLines.length)} errors. ` +
              `First 3:\n` +
              errorLines
                .slice(0, 3)
                .map((l) => `  - ${l}`)
                .join("\n") +
              `\nFull tsc output (truncated to 4 KB):\n${output.slice(0, 4096)}`,
          ).toBeLessThan(baseline);
        },
      );
    });
  },
);

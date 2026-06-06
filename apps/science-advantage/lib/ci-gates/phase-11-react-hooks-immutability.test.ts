/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 11
 * ("Fix 4 `react-hooks/immutability` Errors").
 *
 * Mirrors the Phase 0 / Phase 1 / Phase 3 / Phase 4 / Phase 6 / Phase 7 /
 * Phase 8 / Phase 9 / Phase 10 files in style: file-content regression
 * guards plus a file-scoped ESLint gate. The test does not require a
 * running database (the only test-data concern is React component code,
 * which is read-only file content) so it runs in <1s via the standard
 * targeted vitest command:
 *
 *   pnpm --filter science-advantage exec vitest run --config
 *     vitest.unit.config.ts lib/ci-gates/phase-11-react-hooks-immutability.test.ts
 *
 * Background (per `measure/tracks/ci_typecheck_alignment_20260603/spec.md`
 * FR-11, `test-strategy.md` §1 row P11 / §3 cross-phase note / §5 P11):
 *
 *   - The file
 *     `apps/science-advantage/components/features/teacher/analytics/student-lesson-detail-analytics.tsx`
 *     currently has 1 ESLint error (rule: `react-hooks/immutability`)
 *     reported at line 151 with the message "Cannot access variable
 *     before it is declared" for the `fetchAnalytics` const used inside
 *     a `useEffect` but declared lower in the same component body. The
 *     error report spans the access site (line 151), the declaration
 *     (lines 155-183), and a secondary site (line 186,
 *     `const newExpanded = new Set(expandedAttempts);` inside
 *     `toggleAttemptExpand`).
 *   - The original Phase 11 plan calls the count "4 errors" because the
 *     spec was written when the cohort of `react-hooks/immutability`
 *     errors was thought to all live in this one file. As of 2026-06-07
 *     the cohort is actually spread across 4 files in the analytics
 *     folder (`class-analytics-overview.tsx:100`,
 *     `lesson-detail-analytics.tsx:155`, `student-detail-analytics.tsx:143`,
 *     and `student-lesson-detail-analytics.tsx:151` — 1 ESLint error per
 *     file). The Phase 11 plan tasks name only
 *     `student-lesson-detail-analytics.tsx`; the other 3 sibling files
 *     are out of scope for this phase and would be addressed in a
 *     follow-up phase. The test file is therefore scoped to the named
 *     file via file-content assertions and a file-scoped ESLint gate
 *     (test 6) so it does not over-constrain the supervisor or
 *     regress when the sibling files are addressed.
 *   - Per `test-strategy.md` §3 cross-phase note "P11 `useCallback`
 *     choice": "the most idiomatic React fix is `useCallback` with
 *     `[studentId, lessonId]` deps and a `useEffect` that triggers on
 *     mount + dep change. Hoisting as a plain `function` would
 *     re-create the function each render and re-trigger the
 *     `useEffect` infinitely — **do not hoist without `useCallback`**."
 *   - Per `test-strategy.md` §5 P11: "wrap `fetchAnalytics` in
 *     `useCallback(async () => { ... }, [studentId, lessonId])` and
 *     reference it from the `useEffect` deps array." After the fix,
 *     the `// eslint-disable-next-line react-hooks/exhaustive-deps`
 *     comment becomes unnecessary and should be removed.
 *
 * The Phase 11 end-state contract is five-part:
 *
 *   (a) **React import** — `useCallback` is added to the
 *       `import { ... } from 'react'` line at the top of the file.
 *   (b) **`fetchAnalytics` definition** — the const is now produced
 *       by `useCallback(async () => { ... }, [studentId, lessonId])`
 *       rather than a plain `const async () => { ... }` arrow. The
 *       callback body is unchanged.
 *   (c) **`useEffect` deps** — the dep array references `fetchAnalytics`
 *       directly (so the exhaustive-deps rule is satisfied and the
 *       `// eslint-disable-next-line` disable is no longer needed).
 *   (d) **Eslint-disable comment** — the
 *       `// eslint-disable-next-line react-hooks/exhaustive-deps`
 *       comment is removed (it was masking the underlying forward
 *       reference; with the `useCallback` fix, the rule is satisfied
 *       legitimately and the disable is dead code).
 *   (e) **Lint rule compliance** — the file no longer triggers the
 *       `react-hooks/immutability` rule (file-scoped ESLint gate,
 *       test 6). The companion regression guard at test 7 confirms
 *       the public export `StudentLessonDetailAnalytics` is
 *       preserved so the fix does not silently break the component's
 *       API.
 *
 * Tests in this file:
 *
 *   1. `React import: useCallback is added to the destructured imports`
 *      — **red-phase assertion** (fails today; the file imports
 *      `useState, useEffect` only, not `useCallback`).
 *   2. `fetchAnalytics is wrapped in useCallback (not a plain const
 *      arrow)`
 *      — **red-phase assertion** (fails today; the file declares
 *      `const fetchAnalytics = async () => { ... }`).
 *   3. `fetchAnalytics useCallback declares [studentId, lessonId] as
 *      its dependency array`
 *      — **red-phase assertion** (fails today; the file has no
 *      `useCallback(...)` invocation so there are no deps).
 *   4. `useEffect references fetchAnalytics in its dependency array`
 *      — **red-phase assertion** (fails today; the dep array is
 *      `[studentId, lessonId]` and does not include `fetchAnalytics`).
 *   5. `// eslint-disable-next-line react-hooks/exhaustive-deps
 *      comment is removed`
 *      — **red-phase assertion** (fails today; the comment is on
 *      line 152, masking the forward reference).
 *   6. `ESLint reports no react-hooks/immutability violations in this
 *      file (file-scoped lint gate)`
 *      — **red-phase assertion** (fails today; the file has 1
 *      `react-hooks/immutability` violation per
 *      `npx eslint components/features/teacher/analytics/student-lesson-detail-analytics.tsx`).
 *   7. `StudentLessonDetailAnalytics is still exported (regression
 *      guard for the public API; passes today)`
 *      — **regression guard** (passes today; locks the export so a
 *      future refactor that drops the named export surfaces
 *      immediately).
 *
 * The test is scoped to the React-syntax / file-content changes
 * only. The behavioural verification of "no stale closure" and
 * "refetches when `studentId`/`lessonId` change" (per
 * `test-strategy.md` §1 P11) is an integration-level concern that
 * is better covered by the next-level smoke test
 * (`pnpm --filter science-advantage test`); the file-content
 * assertions plus the file-scoped lint gate (test 6) are
 * sufficient to pin the end-state for the Red phase.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  spawnSync,
  type SpawnSyncReturns,
} from "node:child_process";
import { beforeAll, describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();

/**
 * The Phase 11 target file. Resolved via `process.cwd()` (the
 * science-advantage package root) + a relative path. The file is
 * the only file the Phase 11 plan tasks modify; sibling analytics
 * files with the same pattern are out of scope for Phase 11
 * (see file header note).
 */
const TARGET_FILE_PATH = resolve(
  SCIENCE_ADVANTAGE_ROOT,
  "components",
  "features",
  "teacher",
  "analytics",
  "student-lesson-detail-analytics.tsx",
);

/**
 * The exact 1-line import the Phase 11 fix must produce (or its
 * equivalent in any whitespace / quote style). Anchored to the
 * install state (verified 2026-06-07): the import line is single-
 * quoted and destructures `useState, useEffect` from `'react'`. The
 * fix must add `useCallback` to the destructured list. We use a
 * regex (not `includes`) so the test tolerates formatting drift
 * (whitespace, trailing comma, semicolon).
 */
const EXPECTED_IMPORT_PATTERN =
  /^import\s*\{[^}]*\buseCallback\b[^}]*\}\s*from\s*['"]react['"]/mu;

/**
 * The exact 1-line shape the Phase 11 fix must produce for
 * `fetchAnalytics`: it must be a `useCallback` call, not a plain
 * `const` arrow. The regex tolerates whitespace and a trailing
 * semicolon. It deliberately does NOT match
 * `const fetchAnalytics = async () => {` (the current shape)
 * because the leading identifier on the LHS is `const fetchAnalytics`
 * for both, but the RHS of the equal sign is the discriminator:
 * `useCallback` for the fixed shape, `async` for the broken shape.
 */
const EXPECTED_USE_CALLBACK_PATTERN =
  /\buseCallback\s*\(\s*async\s*\(/u;

/**
 * The dependency array for the `useCallback` wrapping
 * `fetchAnalytics`. Per `test-strategy.md` §3 cross-phase note
 * "P11 `useCallback` choice", the deps are `[studentId,
 * lessonId]` — exactly the same deps the current (buggy)
 * `useEffect` uses, so when the `useEffect` re-runs on
 * `studentId`/`lessonId` change it triggers a re-wrap of
 * `fetchAnalytics`, which is then reflected in the `useEffect`'s
 * own deps array (which now references `fetchAnalytics`). This
 * pattern is the canonical "lift a callback that closes over
 * component-scoped identifiers" idiom.
 */
const EXPECTED_USE_CALLBACK_DEPS_PATTERN =
  /useCallback\s*\(\s*async\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\s*studentId\s*,\s*lessonId\s*\]\s*\)/u;

/**
 * The exact comment line the Phase 11 fix must remove. The
 * `// eslint-disable-next-line react-hooks/exhaustive-deps` is
 * currently sitting between the `useEffect` body and its dep
 * array at line 152 of the file. After the `useCallback` fix, the
 * rule is satisfied legitimately and the comment becomes dead
 * code; it must be removed so a future reader is not misled into
 * thinking the dep array is intentionally incomplete.
 */
const ESLINT_DISABLE_COMMENT =
  "eslint-disable-next-line react-hooks/exhaustive-deps";

describe(
  "Phase 11 fix 4 react-hooks/immutability errors (ci_typecheck_alignment_20260603)",
  () => {
    let targetFileContent: string;

    /**
     * Read the target file once for all assertions. The file is
     * small (~460 lines) and read-only, so the cost is negligible.
     * Caching the content lets every assertion produce a precise
     * failure message that includes the offending line range.
     */
    beforeAll(() => {
      expect(
        existsSync(TARGET_FILE_PATH),
        `Expected ${TARGET_FILE_PATH} to exist; the Phase 11 task ` +
          `requires this file to be present. If the file was moved or ` +
          `deleted, the science-advantage teacher analytics route is ` +
          `broken and this track cannot proceed.`,
      ).toBe(true);
      targetFileContent = readFileSync(TARGET_FILE_PATH, "utf8");
    });

    describe(
      "file-content red-phase assertions (currently fail; flip green when Phase 11 is implemented)",
      () => {
        it("React import: useCallback is added to the destructured imports", () => {
          expect(
            EXPECTED_IMPORT_PATTERN.test(targetFileContent),
            `Expected ${TARGET_FILE_PATH} to import \`useCallback\` from ` +
              `the 'react' module. Per test-strategy.md \u00a73 cross-phase ` +
              `note "P11 \`useCallback\` choice", the recommended fix is ` +
              `\`useCallback(fetchAnalytics, [studentId, lessonId])\` ` +
              `(NOT hoisting as a plain function). The fix must add ` +
              `\`useCallback\` to the existing destructured import line ` +
              `at the top of the file (the install state imports only ` +
              `\`useState, useEffect\`). File content:\n${targetFileContent}`,
          ).toBe(true);
        });

        it("fetchAnalytics is wrapped in useCallback (not a plain const arrow)", () => {
          expect(
            EXPECTED_USE_CALLBACK_PATTERN.test(targetFileContent),
            `Expected ${TARGET_FILE_PATH} to declare ` +
              `\`fetchAnalytics\` via \`useCallback(async () => { ... })\` ` +
              `rather than \`const fetchAnalytics = async () => { ... }\`. ` +
              `Per test-strategy.md \u00a73, "Hoisting as a plain ` +
              `\`function\` would re-create the function each render and ` +
              `re-trigger the \`useEffect\` infinitely \u2014 **do not hoist ` +
              `without \`useCallback\`**". The \`useCallback\` wrapping ` +
              `stabilises the function reference so the \`useEffect\`'s ` +
              `dep-array (\`[fetchAnalytics]\`) does not re-fire on every ` +
              `render. File content:\n${targetFileContent}`,
          ).toBe(true);
        });

        it("fetchAnalytics useCallback declares [studentId, lessonId] as its dependency array", () => {
          expect(
            EXPECTED_USE_CALLBACK_DEPS_PATTERN.test(targetFileContent),
            `Expected ${TARGET_FILE_PATH} to declare the \`useCallback\` ` +
              `wrapping \`fetchAnalytics\` with the dependency array ` +
              `\`[studentId, lessonId]\`. Per test-strategy.md \u00a73 ` +
              `cross-phase note, the deps are exactly \`[studentId, ` +
              `lessonId]\` so the callback re-creates when either prop ` +
              `changes \u2014 matching the current (buggy) \`useEffect\` ` +
              `trigger conditions. File content:\n${targetFileContent}`,
          ).toBe(true);
        });

        it("useEffect references fetchAnalytics in its dependency array", () => {
          // The useEffect block: `useEffect(() => { fetchAnalytics(); }, [deps]);`.
          // We match the open paren, the body up to the closing `},`, and the
          // dep array. The discriminator is the dep array contents.
          const useEffectDepPattern =
            /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?fetchAnalytics\s*\(\s*\)\s*;?[\s\S]*?\}\s*,\s*\[([^\]]*)\]\s*\)/u;
          const match = useEffectDepPattern.exec(targetFileContent);
          expect(
            match,
            `Expected ${TARGET_FILE_PATH} to declare a \`useEffect\` ` +
              `that calls \`fetchAnalytics()\` and passes a dependency ` +
              `array. The install state has such a \`useEffect\` on ` +
              `lines 150-153. After the Phase 11 fix, the dep array ` +
              `must include \`fetchAnalytics\` so the ` +
              `react-hooks/exhaustive-deps rule is satisfied without ` +
              `the current eslint-disable comment. If the regex did not ` +
              `match, the \`useEffect\` is missing or the body was ` +
              `rewritten in a way that the test cannot follow \u2014 see ` +
              `the test strategy for the canonical shape. File content:\n` +
              `${targetFileContent}`,
          ).not.toBeNull();
          const deps = match![1] ?? "";
          // Normalise: strip whitespace, drop a trailing comment.
          const depsTrimmed = deps
            .replace(/\/\*[\s\S]*?\*\//gu, "")
            .replace(/\/\/.*$/gum, "")
            .trim();
          expect(
            /\bfetchAnalytics\b/u.test(depsTrimmed),
            `Expected the \`useEffect\` dependency array to reference ` +
              `\`fetchAnalytics\`. The install state (verified 2026-06-07) ` +
              `has \`[studentId, lessonId]\` only; the Phase 11 fix must ` +
              `add \`fetchAnalytics\` to that array (canonical: ` +
              `\`[fetchAnalytics]\` with \`useCallback\` deps ` +
              `\`[studentId, lessonId]\` carrying the prop change). ` +
              `Captured dep array content: \`${depsTrimmed}\`. File ` +
              `content:\n${targetFileContent}`,
          ).toBe(true);
        });

        it(`${ESLINT_DISABLE_COMMENT} comment is removed`, () => {
          expect(
            !targetFileContent.includes(ESLINT_DISABLE_COMMENT),
            `Expected ${TARGET_FILE_PATH} to NOT contain the comment ` +
              `\`// ${ESLINT_DISABLE_COMMENT}\`. The install state (verified ` +
              `2026-06-07) has the comment on line 152, masking the ` +
              `forward reference of \`fetchAnalytics\` from the ` +
              `\`useEffect\`'s dep array. After the Phase 11 fix ` +
              `(\`useCallback\` wrapping + \`fetchAnalytics\` in the dep ` +
              `array), the rule is satisfied legitimately and the disable ` +
              `comment is dead code \u2014 it must be removed so a future ` +
              `reader is not misled. File content:\n${targetFileContent}`,
          ).toBe(true);
        });
      },
    );

    describe(
      "file-scoped lint gate (currently fails; flips green when the rule no longer fires in the target file)",
      () => {
        let lintResult: SpawnSyncReturns<string>;

        /**
         * Run the file-scoped ESLint invocation once and cache the
         * output. We use `--no-warn-ignored` so the output is
         * limited to the target file's violations. We disable
         * every rule except `react-hooks/immutability` so the gate
         * is not contaminated by sibling-file violations
         * (`@typescript-eslint/ban-ts-comment` in
         * `lib/ai/image-generator.ts`, etc.) that are out of scope
         * for Phase 11. We invoke the direct binary
         * (`./node_modules/.bin/eslint`) rather than `npx eslint`
         * to skip the npx package-resolution overhead (~8s on a
         * warm cache) and stay under the 30s hook-timeout budget.
         * The 30s timeout is the second argument to `beforeAll`;
         * the default 10s is too short for a cold-cache spawn
         * (~20s) and even on a warm cache (`~6s`) we want a safety
         * margin.
         */
        beforeAll(
          () => {
            lintResult = spawnSync(
              "./node_modules/.bin/eslint",
              [
                "--no-color",
                "--no-warn-ignored",
                "--rule",
                '{"react-hooks/immutability": "error"}',
                "--rule",
                '{"@typescript-eslint/no-unused-vars": "off"}',
                "--rule",
                '{"@typescript-eslint/no-explicit-any": "off"}',
                "--rule",
                '{"@typescript-eslint/ban-ts-comment": "off"}',
                TARGET_FILE_PATH,
              ],
              {
                cwd: SCIENCE_ADVANTAGE_ROOT,
                encoding: "utf8",
              },
            );
          },
          30000,
        );

        it("ESLint reports no react-hooks/immutability violations in the target file", () => {
          const combinedOutput = `${lintResult.stdout ?? ""}${lintResult.stderr ?? ""}`;
          // The eslint output for a single file with one
          // `react-hooks/immutability` violation contains the file
          // path, the line:col coordinate, the word "error", and
          // the rule name. We assert on the rule name only \u2014 a
          // file with zero violations will not mention the rule
          // name in its output (eslint only prints rule names for
          // rules that fire).
          const immutabilityViolationReported = /\breact-hooks\/immutability\b/u.test(
            combinedOutput,
          );
          expect(
            immutabilityViolationReported,
            `Expected \`npx eslint ${TARGET_FILE_PATH}\` to report zero ` +
              `\`react-hooks/immutability\` violations. The install state ` +
              `(verified 2026-06-07) reports 1 violation: ` +
              `"\`fetchAnalytics\` accessed before it is declared" on ` +
              `line 151. After the Phase 11 fix (\`useCallback\` wrapping ` +
              `+ \`fetchAnalytics\` in the \`useEffect\` dep array), the ` +
              `forward reference is resolved and the rule is satisfied. ` +
              `ESLint stdout:\n${lintResult.stdout ?? ""}\n` +
              `ESLint stderr:\n${lintResult.stderr ?? ""}\n` +
              `ESLint exit code: ${String(lintResult.status)}`,
          ).toBe(false);
        });
      },
    );

    describe(
      "regression guards (currently pass; lock the install state so a future cleanup cannot silently neuter the fix)",
      () => {
        it("StudentLessonDetailAnalytics is still exported (regression guard for the public API)", () => {
          // The component is consumed by the teacher analytics
          // route; dropping the named export would break the
          // route render. The export declaration is the canonical
          // "named function export" form
          // (`export function StudentLessonDetailAnalytics({...})`).
          // A future refactor that converts the export to
          // `export const StudentLessonDetailAnalytics = ...`
          // would also satisfy the consumer but is a more
          // substantial refactor \u2014 the test allows either shape
          // by matching on the symbol name, not the export
          // keyword.
          const exportPattern =
            /\bexport\s+(?:async\s+)?function\s+StudentLessonDetailAnalytics\b/u;
          const constExportPattern =
            /\bexport\s+const\s+StudentLessonDetailAnalytics\b/u;
          const isExported =
            exportPattern.test(targetFileContent) ||
            constExportPattern.test(targetFileContent);
          expect(
            isExported,
            `Expected ${TARGET_FILE_PATH} to export ` +
              `\`StudentLessonDetailAnalytics\` as a named symbol. The ` +
              `install state (verified 2026-06-07) has the canonical ` +
              `\`export function StudentLessonDetailAnalytics({...})\` ` +
              `shape on line 137. The Phase 11 fix must preserve the ` +
              `export so the teacher analytics route keeps rendering. ` +
              `If a future refactor drops the export, the analytics page ` +
              `will render a blank module and this guard will fail loud. ` +
              `File content:\n${targetFileContent}`,
          ).toBe(true);
        });
      },
    );
  },
);

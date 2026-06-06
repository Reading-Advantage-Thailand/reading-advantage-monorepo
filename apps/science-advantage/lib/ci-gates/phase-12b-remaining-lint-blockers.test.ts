/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 12B
 * ("Close Remaining Lint Blockers (react-hooks/immutability siblings +
 * ban-ts-comment)").
 *
 * Mirrors the Phase 11 (`react-hooks/immutability` for
 * `student-lesson-detail-analytics.tsx`) and Phase 12
 * (`@typescript-eslint/no-unused-vars` for `lib/gamification/badges.ts`)
 * test files in style: per-target file content red-phase assertions,
 * a file-scoped ESLint gate, and a regression guard that locks the
 * public export. The test does not require a running database, does
 * not spawn `tsc` or `pnpm turbo run`, and is scoped to the four
 * files Phase 12B is responsible for so the targeted vitest command
 * runs in <30s on a warm cache:
 *
 *   pnpm --filter science-advantage exec vitest run --config
 *     vitest.unit.config.ts lib/ci-gates/phase-12b-remaining-lint-blockers.test.ts
 *
 * Background (per `measure/tracks/ci_typecheck_alignment_20260603/plan.md`
 * Phase 12B / `test-strategy.md` §1 row P11 / §3 cross-phase note
 * "P11 `useCallback` choice" / §5 P11):
 *
 *   - Phase 11 closed the
 *     `react-hooks/immutability` violation in the single file named
 *     in the original spec (`student-lesson-detail-analytics.tsx`)
 *     by wrapping `fetchAnalytics` in `useCallback(async () => { ... },
 *     [studentId, lessonId])` and referencing `fetchAnalytics` from
 *     the `useEffect` dep array. As of 2026-06-07 the
 *     `react-hooks/immutability` rule still fires once per file
 *     across **three** sibling analytics files in the same folder
 *     (verified via `npx eslint .`):
 *       * `class-analytics-overview.tsx:100` — `useEffect` deps
 *         `[classId]`, `fetchAnalytics` declared below on line 104
 *         (closes over `classId`).
 *       * `lesson-detail-analytics.tsx:155` — `useEffect` deps
 *         `[classId, lessonId]`, `fetchAnalytics` declared below on
 *         line 159 (closes over `classId, lessonId`).
 *       * `student-detail-analytics.tsx:143` — `useEffect` deps
 *         `[classId, studentId]`, `fetchAnalytics` declared below on
 *         line 147 (closes over `classId, studentId`).
 *     The recommended fix is identical to the Phase 11 fix that
 *     already worked: wrap the `fetchAnalytics` arrow in
 *     `useCallback(async () => { ... }, [<file-specific-deps>])`,
 *     add `useCallback` to the React import, set the `useEffect`
 *     dep array to `[fetchAnalytics]`, and remove the now-
 *     unnecessary `// eslint-disable-next-line
 *     react-hooks/exhaustive-deps` comment.
 *   - A **fourth** pre-existing lint error sits in
 *     `lib/ai/image-generator.ts:144`: a
 *     `@typescript-eslint/ban-ts-comment` violation on
 *     `// @ts-ignore -- ai is a transitive dep available at runtime
 *     via @reading-advantage/ai` (the `@ts-ignore` directive sits
 *     above `const { experimental_generateImage } = await
 *     import('ai');`). The recommended fix is to replace `@ts-ignore`
 *     with `@ts-expect-error` and preserve the trailing reason
 *     comment (or add a new one) so the suppression still documents
 *     why the next line is intentionally untyped.
 *
 * These 4 remaining lint errors are the **sole blocker** keeping the
 * Phase 13 lint umbrella gate (spec AC-14, `pnpm turbo run lint
 * --filter=science-advantage` exits 0) RED. The Phase 12B plan
 * task is the single Red-phase assertion: a file-scoped lint gate
 * that catches each of the 4 violations independently so a Green
 * fix that closes 3 of 4 still fails loud.
 *
 * Per `test-strategy.md` §3 cross-phase note "P11 `useCallback`
 * choice": the most idiomatic React fix is `useCallback` with the
 * file-specific deps and a `useEffect` that triggers on mount + dep
 * change. **Do not hoist as a plain function** — that would
 * re-create the function each render and re-trigger the `useEffect`
 * infinitely. After wrapping in `useCallback`, the `useEffect` deps
 * should reference `fetchAnalytics` directly, the
 * `// eslint-disable-next-line react-hooks/exhaustive-deps` disable
 * becomes unnecessary and must be removed, and `useCallback` must
 * be added to the `import { ... } from 'react'` line.
 *
 * The Phase 12B end-state contract is five-part, applied per file:
 *
 *   (a) **React import** — `useCallback` is added to the
 *       `import { ... } from 'react'` line at the top of the file
 *       (analytics files only — the image-generator file is a
 *       server-side helper that does not import React).
 *   (b) **`fetchAnalytics` definition** — the const is now produced
 *       by `useCallback(async () => { ... }, [<file-specific-deps>])`
 *       rather than a plain `const async () => { ... }` arrow. The
 *       callback body is unchanged. The file-specific deps are
 *       `[classId]` for `class-analytics-overview.tsx`,
 *       `[classId, lessonId]` for `lesson-detail-analytics.tsx`, and
 *       `[classId, studentId]` for `student-detail-analytics.tsx`.
 *   (c) **`useEffect` deps** — the dep array references
 *       `fetchAnalytics` directly (so the
 *       `react-hooks/exhaustive-deps` rule is satisfied and the
 *       `// eslint-disable-next-line` disable is no longer needed).
 *   (d) **Eslint-disable comment** — the
 *       `// eslint-disable-next-line react-hooks/exhaustive-deps`
 *       comment is removed from the analytics file (it was masking
 *       the forward reference; with the `useCallback` fix the rule
 *       is satisfied legitimately and the disable is dead code).
 *   (e) **Lint rule compliance** — the file no longer triggers the
 *       offending rule (file-scoped ESLint gate, one per file).
 *       The 3 analytics files use a `--rule` override scoping to
 *       `react-hooks/immutability` only (other rules are silenced
 *       to avoid contamination from sibling-file violations). The
 *       `lib/ai/image-generator.ts` gate uses a `--rule` override
 *       scoping to `@typescript-eslint/ban-ts-comment` only.
 *
 * For the image-generator file the per-file contract is
 * one-part:
 *
 *   (f) **`@ts-ignore` → `@ts-expect-error`** — the
 *       `@typescript-eslint/ban-ts-comment` directive is replaced;
 *       the trailing reason comment (`-- ai is a transitive dep
 *       available at runtime via @reading-advantage/ai`) is
 *       preserved (a future maintainer removing the suppression
 *       would otherwise lose the documentation of *why* the
 *       suppression exists).
 *
 * Tests in this file (4 file groups × 7 tests per analytics file +
 * 1 image-generator group × 3 tests = 24 tests total):
 *
 *   For each of the 3 analytics files
 *   (`class-analytics-overview.tsx`, `lesson-detail-analytics.tsx`,
 *   `student-detail-analytics.tsx`):
 *
 *     1. `React import: useCallback is added to the destructured
 *        imports` — **red-phase assertion** (fails today; the
 *        file imports `useState, useEffect` only, not
 *        `useCallback`).
 *     2. `fetchAnalytics is wrapped in useCallback (not a plain
 *        const arrow)` — **red-phase assertion** (fails today;
 *        the file declares `const fetchAnalytics = async () => {
 *        ... }`).
 *     3. `fetchAnalytics useCallback declares [<file-deps>] as its
 *        dependency array` — **red-phase assertion** (fails today;
 *        the file has no `useCallback(...)` invocation so there
 *        are no deps).
 *     4. `useEffect references fetchAnalytics in its dependency
 *        array` — **red-phase assertion** (fails today; the dep
 *        array is `[<file-deps>]` and does not include
 *        `fetchAnalytics`).
 *     5. `// eslint-disable-next-line
 *        react-hooks/exhaustive-deps comment is removed` —
 *        **red-phase assertion** (fails today; the comment is
 *        present, masking the forward reference).
 *     6. `ESLint reports no react-hooks/immutability violations in
 *        the target file (file-scoped lint gate)` — **red-phase
 *        assertion** (fails today; 1 violation per file).
 *     7. `<ComponentName> is still exported (regression guard for
 *        the public API)` — **regression guard** (passes today;
 *        locks the named export so a future refactor that drops
 *        it surfaces immediately).
 *
 *   For `lib/ai/image-generator.ts`:
 *
 *     8. `image-generator.ts uses @ts-expect-error (not
 *        @ts-ignore)` — **red-phase assertion** (fails today; the
 *        file uses `@ts-ignore`).
 *     9. `ESLint reports no @typescript-eslint/ban-ts-comment
 *        violations in the target file (file-scoped lint gate)` —
 *        **red-phase assertion** (fails today; 1 violation).
 *     10. `generateLessonDiagram is still exported (regression
 *         guard for the public API)` — **regression guard**
 *         (passes today; locks the named export).
 *
 * The test is scoped to the React-syntax / file-content changes
 * only. The behavioural verification of "no stale closure" and
 * "refetches when the prop change" (per `test-strategy.md` §1
 * P11) is an integration-level concern that is better covered by
 * the next-level smoke test (`pnpm --filter science-advantage
 * test`); the file-content assertions plus the file-scoped lint
 * gate (tests 6, 9) are sufficient to pin the end-state for the
 * Red phase.
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
 * Configuration for one of the three analytics files. The four
 * fields are the file's relative path, the existing `useEffect`
 * dep list (for use in the `useCallback` dep array — per
 * `test-strategy.md` §3 cross-phase note, the `useCallback` deps
 * must match the `useEffect` deps so a prop change re-creates both
 * in lockstep), the named public export that must be preserved
 * across the fix, and the canonical component name (used in test
 * titles and failure messages).
 *
 * Verified 2026-06-07 by reading the install state of the three
 * files:
 *   - `class-analytics-overview.tsx:99-102` — `useEffect(() => {
 *     fetchAnalytics(); }, [classId])`
 *   - `lesson-detail-analytics.tsx:154-157` — `useEffect(() => {
 *     fetchAnalytics(); }, [classId, lessonId])`
 *   - `student-detail-analytics.tsx:142-145` — `useEffect(() => {
 *     fetchAnalytics(); }, [classId, studentId])`
 */
const ANALYTICS_TARGETS = [
  {
    relativePath:
      "components/features/teacher/analytics/class-analytics-overview.tsx",
    componentName: "ClassAnalyticsOverview",
    useCallbackDeps: ["classId"],
  },
  {
    relativePath:
      "components/features/teacher/analytics/lesson-detail-analytics.tsx",
    componentName: "LessonDetailAnalytics",
    useCallbackDeps: ["classId", "lessonId"],
  },
  {
    relativePath:
      "components/features/teacher/analytics/student-detail-analytics.tsx",
    componentName: "StudentDetailAnalytics",
    useCallbackDeps: ["classId", "studentId"],
  },
] as const;

/**
 * Absolute path to `lib/ai/image-generator.ts`. The Phase 12B
 * `ban-ts-comment` fix is local to a single line (line 144) so a
 * single absolute path is enough; the relative path is used in
 * the lint-output assertions and in the failure messages.
 */
const IMAGE_GENERATOR_TARGET = {
  absolutePath: resolve(
    SCIENCE_ADVANTAGE_ROOT,
    "lib",
    "ai",
    "image-generator.ts",
  ),
  relativePath: "lib/ai/image-generator.ts",
  publicExport: "generateLessonDiagram",
} as const;

/**
 * The comment line that the Phase 12B fix must remove from each
 * analytics file. The `// eslint-disable-next-line
 * react-hooks/exhaustive-deps` is currently sitting between the
 * `useEffect` body and its dep array in each file, masking the
 * forward reference of `fetchAnalytics` from the `useEffect`'s
 * dep array. After the `useCallback` fix the rule is satisfied
 * legitimately and the disable becomes dead code; it must be
 * removed so a future reader is not misled.
 */
const ESLINT_DISABLE_COMMENT =
  "eslint-disable-next-line react-hooks/exhaustive-deps";

/**
 * Build the `useCallback` deps-array regex for a specific
 * `useCallback` deps list. The pattern tolerates any whitespace
 * and either `[a, b]` or `[ a, b ]` shapes. The deps MUST appear
 * in the order specified in `ANALYTICS_TARGETS[i].useCallbackDeps`
 * (the order matches the existing `useEffect` dep list, which
 * matches the prop order in the component function signature).
 */
function buildUseCallbackDepsRegex(
  deps: readonly string[],
): RegExp {
  const depsPattern = deps
    .map((dep) => `\\s*${dep}\\s*`)
    .join("\\s*,\\s*");
  return new RegExp(
    `useCallback\\s*\\(\\s*async\\s*\\(\\s*\\)\\s*=>\\s*\\{[\\s\\S]*?\\}\\s*,\\s*\\[\\s*${depsPattern}\\s*\\]\\s*\\)`,
    "u",
  );
}

describe(
  "Phase 12B close remaining lint blockers (ci_typecheck_alignment_20260603)",
  () => {
    for (const target of ANALYTICS_TARGETS) {
      const absolutePath = resolve(
        SCIENCE_ADVANTAGE_ROOT,
        target.relativePath,
      );
      const useCallbackDepsRegex = buildUseCallbackDepsRegex(
        target.useCallbackDeps,
      );

      describe(
        `${target.relativePath} (${target.useCallbackDeps.join(", ")})`,
        () => {
          let targetFileContent: string;
          let lintResult: SpawnSyncReturns<string>;

          /**
           * Read the target file once and run the file-scoped
           * ESLint invocation once for all assertions. We invoke
           * the direct binary (`./node_modules/.bin/eslint`)
           * rather than `npx eslint` to skip the npx
           * package-resolution overhead (~8s on a warm cache) and
           * stay under the 30s hook-timeout budget. We use
           * `--rule` overrides to scope to
           * `react-hooks/immutability` only (with the other
           * `@typescript-eslint` rules disabled) so the gate is
           * not contaminated by sibling-file violations
           * (`@typescript-eslint/ban-ts-comment` in
           * `lib/ai/image-generator.ts`, etc.) that are out of
           * scope for this per-file test.
           */
          beforeAll(
            () => {
              expect(
                existsSync(absolutePath),
                `Expected ${absolutePath} to exist; the Phase 12B ` +
                  `task requires this file to be present. If the ` +
                  `file was moved or deleted, the science-advantage ` +
                  `teacher analytics route is broken and this track ` +
                  `cannot proceed.`,
              ).toBe(true);
              targetFileContent = readFileSync(absolutePath, "utf8");
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
                  absolutePath,
                ],
                {
                  cwd: SCIENCE_ADVANTAGE_ROOT,
                  encoding: "utf8",
                },
              );
            },
            30000,
          );

          describe(
            "file-content red-phase assertions (currently fail; flip green when Phase 12B is implemented)",
            () => {
              it("React import: useCallback is added to the destructured imports", () => {
                const importPattern =
                  /^import\s*\{[^}]*\buseCallback\b[^}]*\}\s*from\s*['"]react['"]/mu;
                expect(
                  importPattern.test(targetFileContent),
                  `Expected ${absolutePath} to import \`useCallback\` from ` +
                    `the 'react' module. Per test-strategy.md \u00a73 cross-phase ` +
                    `note "P11 \`useCallback\` choice", the recommended fix is ` +
                    `\`useCallback(fetchAnalytics, [${target.useCallbackDeps.join(", ")}])\` ` +
                    `(NOT hoisting as a plain function). The fix must add ` +
                    `\`useCallback\` to the existing destructured import line ` +
                    `at the top of the file (the install state imports only ` +
                    `\`useState, useEffect\`). File content:\n${targetFileContent}`,
                ).toBe(true);
              });

              it("fetchAnalytics is wrapped in useCallback (not a plain const arrow)", () => {
                const useCallbackPattern = /\buseCallback\s*\(\s*async\s*\(/u;
                expect(
                  useCallbackPattern.test(targetFileContent),
                  `Expected ${absolutePath} to declare ` +
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

              it(`fetchAnalytics useCallback declares [${target.useCallbackDeps.join(", ")}] as its dependency array`, () => {
                expect(
                  useCallbackDepsRegex.test(targetFileContent),
                  `Expected ${absolutePath} to declare the \`useCallback\` ` +
                    `wrapping \`fetchAnalytics\` with the dependency array ` +
                    `\`[${target.useCallbackDeps.join(", ")}]\`. Per test-strategy.md \u00a73 ` +
                    `cross-phase note, the deps are exactly the same as the ` +
                    `existing (buggy) \`useEffect\` dep list so the callback ` +
                    `re-creates when the relevant prop changes \u2014 matching the ` +
                    `trigger conditions the buggy code already had. File content:\n` +
                    `${targetFileContent}`,
                ).toBe(true);
              });

              it("useEffect references fetchAnalytics in its dependency array", () => {
                const useEffectDepPattern =
                  /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?fetchAnalytics\s*\(\s*\)\s*;?[\s\S]*?\}\s*,\s*\[([^\]]*)\]\s*\)/u;
                const match = useEffectDepPattern.exec(targetFileContent);
                expect(
                  match,
                  `Expected ${absolutePath} to declare a \`useEffect\` ` +
                    `that calls \`fetchAnalytics()\` and passes a dependency ` +
                    `array. The install state has such a \`useEffect\` with ` +
                    `deps \`[${target.useCallbackDeps.join(", ")}]\`. After the ` +
                    `Phase 12B fix, the dep array must include \`fetchAnalytics\` ` +
                    `so the \`react-hooks/exhaustive-deps\` rule is satisfied ` +
                    `without the current eslint-disable comment. If the regex ` +
                    `did not match, the \`useEffect\` is missing or the body was ` +
                    `rewritten in a way that the test cannot follow. File content:\n` +
                    `${targetFileContent}`,
                ).not.toBeNull();
                const deps = match![1] ?? "";
                const depsTrimmed = deps
                  .replace(/\/\*[\s\S]*?\*\//gu, "")
                  .replace(/\/\/.*$/gum, "")
                  .trim();
                expect(
                  /\bfetchAnalytics\b/u.test(depsTrimmed),
                  `Expected the \`useEffect\` dependency array to reference ` +
                    `\`fetchAnalytics\`. The install state (verified 2026-06-07) ` +
                    `has \`[${target.useCallbackDeps.join(", ")}]\` only; the Phase 12B ` +
                    `fix must add \`fetchAnalytics\` to that array (canonical: ` +
                    `\`[fetchAnalytics]\` with \`useCallback\` deps \`[${target.useCallbackDeps.join(", ")}]\` ` +
                    `carrying the prop change). Captured dep array content: ` +
                    `\`${depsTrimmed}\`. File content:\n${targetFileContent}`,
                ).toBe(true);
              });

              it(`${ESLINT_DISABLE_COMMENT} comment is removed`, () => {
                expect(
                  !targetFileContent.includes(ESLINT_DISABLE_COMMENT),
                  `Expected ${absolutePath} to NOT contain the comment ` +
                    `\`// ${ESLINT_DISABLE_COMMENT}\`. The install state ` +
                    `(verified 2026-06-07) has the comment in the file, ` +
                    `masking the forward reference of \`fetchAnalytics\` from ` +
                    `the \`useEffect\`'s dep array. After the Phase 12B fix ` +
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
              it("ESLint reports no react-hooks/immutability violations in the target file", () => {
                const combinedOutput = `${lintResult.stdout ?? ""}${lintResult.stderr ?? ""}`;
                const immutabilityViolationReported =
                  /\breact-hooks\/immutability\b/u.test(combinedOutput);
                expect(
                  immutabilityViolationReported,
                  `Expected \`./node_modules/.bin/eslint --no-warn-ignored ` +
                    `${target.relativePath}\` to report zero ` +
                    `\`react-hooks/immutability\` violations. The install state ` +
                    `(verified 2026-06-07) reports 1 violation on this file: ` +
                    `"\`fetchAnalytics\` accessed before it is declared". After ` +
                    `the Phase 12B fix (\`useCallback\` wrapping + ` +
                    `\`fetchAnalytics\` in the \`useEffect\` dep array), the ` +
                    `forward reference is resolved and the rule is satisfied. ` +
                    `ESLint stdout:\n${lintResult.stdout ?? ""}\n` +
                    `ESLint stderr:\n${lintResult.stderr ?? ""}\n` +
                    `ESLint exit code: ${String(lintResult.status)}`,
                ).toBe(false);
              });
            },
          );

          describe(
            "regression guard (currently passes; locks the public API so a future fix cannot silently drop the export)",
            () => {
              it(`${target.componentName} is still exported (regression guard for the public API)`, () => {
                const exportPattern = new RegExp(
                  `\\bexport\\s+(?:async\\s+)?function\\s+${target.componentName}\\b`,
                  "u",
                );
                const constExportPattern = new RegExp(
                  `\\bexport\\s+const\\s+${target.componentName}\\b`,
                  "u",
                );
                const isExported =
                  exportPattern.test(targetFileContent) ||
                  constExportPattern.test(targetFileContent);
                expect(
                  isExported,
                  `Expected ${absolutePath} to export ` +
                    `\`${target.componentName}\` as a named symbol. The install ` +
                    `state (verified 2026-06-07) has the canonical ` +
                    `\`export function ${target.componentName}({...})\` shape. ` +
                    `The Phase 12B fix must preserve the export so the teacher ` +
                    `analytics route keeps rendering. If a future refactor drops ` +
                    `the export, the analytics page will render a blank module and ` +
                    `this guard will fail loud. File content:\n${targetFileContent}`,
                ).toBe(true);
              });
            },
          );
        },
      );
    }

    describe(
      `${IMAGE_GENERATOR_TARGET.relativePath} (@ts-ignore -> @ts-expect-error)`,
      () => {
        let targetFileContent: string;
        let lintResult: SpawnSyncReturns<string>;

        beforeAll(
          () => {
            expect(
              existsSync(IMAGE_GENERATOR_TARGET.absolutePath),
              `Expected ${IMAGE_GENERATOR_TARGET.absolutePath} to exist; ` +
                `the Phase 12B task requires this file to be present. If the ` +
                `file was moved or deleted, the science-advantage image ` +
                `generation pipeline is broken and this track cannot proceed.`,
            ).toBe(true);
            targetFileContent = readFileSync(
              IMAGE_GENERATOR_TARGET.absolutePath,
              "utf8",
            );
            lintResult = spawnSync(
              "./node_modules/.bin/eslint",
              [
                "--no-color",
                "--no-warn-ignored",
                "--rule",
                '{"@typescript-eslint/ban-ts-comment": "error"}',
                "--rule",
                '{"react-hooks/immutability": "off"}',
                "--rule",
                '{"@typescript-eslint/no-unused-vars": "off"}',
                "--rule",
                '{"@typescript-eslint/no-explicit-any": "off"}',
                IMAGE_GENERATOR_TARGET.absolutePath,
              ],
              {
                cwd: SCIENCE_ADVANTAGE_ROOT,
                encoding: "utf8",
              },
            );
          },
          30000,
        );

        describe(
          "file-content red-phase assertion (currently fails; flips green when @ts-ignore is replaced with @ts-expect-error)",
          () => {
            it(`${IMAGE_GENERATOR_TARGET.relativePath} uses @ts-expect-error (not @ts-ignore)`, () => {
              const tsIgnorePattern = /@ts-ignore\b/u;
              const tsExpectErrorPattern = /@ts-expect-error\b/u;
              expect(
                tsExpectErrorPattern.test(targetFileContent),
                `Expected ${IMAGE_GENERATOR_TARGET.absolutePath} to contain ` +
                  `\`@ts-expect-error\` (replacing the install-state ` +
                  `\`@ts-ignore\` on line 144). The ` +
                  `\`@typescript-eslint/ban-ts-comment\` rule is satisfied by ` +
                  `\`@ts-expect-error\` because that directive itself fails ` +
                  `type-check if the next line is error-free (a self-checking ` +
                  `suppression); \`@ts-ignore\` silently does nothing when the ` +
                  `next line compiles, so it is a footgun and the lint rule ` +
                  `rejects it. The trailing reason comment (` +
                  `"-- ai is a transitive dep available at runtime via " +
                  "@reading-advantage/ai") MUST be preserved so a future ` +
                  `maintainer does not lose the documentation of *why* the ` +
                  `suppression exists. If the regex did not match, the ` +
                  `directive is missing entirely; the next assertion checks ` +
                  `that the @ts-ignore is gone. File content:\n${targetFileContent}`,
              ).toBe(true);
              expect(
                !tsIgnorePattern.test(targetFileContent),
                `Expected ${IMAGE_GENERATOR_TARGET.absolutePath} to NOT contain ` +
                  `\`@ts-ignore\`. The install state (verified 2026-06-07) has ` +
                  `\`// @ts-ignore -- ai is a transitive dep available at ` +
                  `runtime via @reading-advantage/ai\` on line 144, which the ` +
                  `\`@typescript-eslint/ban-ts-comment\` rule rejects. The fix ` +
                  `must replace \`@ts-ignore\` with \`@ts-expect-error\` (the ` +
                  `self-checking variant). If the regex matched, the old ` +
                  `directive is still present alongside the new one. File ` +
                  `content:\n${targetFileContent}`,
              ).toBe(true);
            });
          },
        );

        describe(
          "file-scoped lint gate (currently fails; flips green when the rule no longer fires in the target file)",
          () => {
            it(`ESLint reports no @typescript-eslint/ban-ts-comment violations in the target file`, () => {
              const combinedOutput = `${lintResult.stdout ?? ""}${lintResult.stderr ?? ""}`;
              const banTsCommentReported =
                /@typescript-eslint\/ban-ts-comment\b/u.test(combinedOutput);
              expect(
                banTsCommentReported,
                `Expected \`./node_modules/.bin/eslint --no-warn-ignored ` +
                  `${IMAGE_GENERATOR_TARGET.relativePath}\` to report zero ` +
                  `\`@typescript-eslint/ban-ts-comment\` violations. The ` +
                  `install state (verified 2026-06-07) reports 1 violation on ` +
                  `line 144: \`@ts-ignore\` must be replaced with ` +
                  `\`@ts-expect-error\`. The trailing reason comment must be ` +
                  `preserved. ESLint stdout:\n${lintResult.stdout ?? ""}\n` +
                  `ESLint stderr:\n${lintResult.stderr ?? ""}\n` +
                  `ESLint exit code: ${String(lintResult.status)}`,
              ).toBe(false);
            });
          },
        );

        describe(
          "regression guard (currently passes; locks the public API so a future fix cannot silently drop the export)",
          () => {
            it(`${IMAGE_GENERATOR_TARGET.publicExport} is still exported (regression guard for the public API)`, () => {
              const exportPattern = new RegExp(
                `\\bexport\\s+(?:async\\s+)?function\\s+${IMAGE_GENERATOR_TARGET.publicExport}\\b`,
                "u",
              );
              const constExportPattern = new RegExp(
                `\\bexport\\s+const\\s+${IMAGE_GENERATOR_TARGET.publicExport}\\b`,
                "u",
              );
              const isExported =
                exportPattern.test(targetFileContent) ||
                constExportPattern.test(targetFileContent);
              expect(
                isExported,
                `Expected ${IMAGE_GENERATOR_TARGET.absolutePath} to export ` +
                  `\`${IMAGE_GENERATOR_TARGET.publicExport}\` as a named ` +
                  `symbol. The install state (verified 2026-06-07) has the ` +
                  `canonical \`export async function ` +
                  `${IMAGE_GENERATOR_TARGET.publicExport}(request: ` +
                  `DiagramRequest): Promise<GenerateDiagramResult>\` shape on ` +
                  `line 141. The Phase 12B fix must preserve the export so the ` +
                  `image-generation pipeline keeps working. If a future refactor ` +
                  `drops the export, the diagram endpoint silently fails and ` +
                  `this guard will fail loud. File content:\n${targetFileContent}`,
              ).toBe(true);
            });
          },
        );
      },
    );
  },
);

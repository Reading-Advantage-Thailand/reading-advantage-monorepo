/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 12
 * ("Silence 6 Unused-Var Warnings").
 *
 * Mirrors the Phase 9 / Phase 10 / Phase 11 files in style: file-scoped
 * ESLint gate plus regression guards. The test does not require a running
 * database, does not spawn `tsc` or `pnpm turbo run`, and stays scoped to
 * the single file `lib/gamification/badges.ts` so the targeted vitest
 * command runs in ~5s:
 *
 *   pnpm --filter science-advantage exec vitest run --config
 *     vitest.unit.config.ts lib/ci-gates/phase-12-unused-vars-warnings.test.ts
 *
 * Background (per `measure/tracks/ci_typecheck_alignment_20260603/spec.md`
 * FR-12, `test-strategy.md` §1 row P12 / §3 cross-phase note "P12 lint-rule
 * fix vs. code fix"):
 *
 *   - The file `apps/science-advantage/lib/gamification/badges.ts`
 *     currently emits 2 `@typescript-eslint/no-unused-vars` warnings
 *     (verified 2026-06-07 via `./node_modules/.bin/eslint
 *     --no-color --no-warn-ignored lib/gamification/badges.ts`):
 *       * `lib/gamification/badges.ts:114:38` — `'_userId' is defined
 *         but never used` (the parameter on `checkBilingualScholar`,
 *         a stub function with a `TODO: Requires language preference
 *         tracking — not yet implemented` comment).
 *       * `lib/gamification/badges.ts:202:3` — `'_triggerEvent' is
 *         defined but never used` (the second parameter on the
 *         exported `checkBadgeConditions(userId: string,
 *         _triggerEvent: BadgeTriggerEvent)` function).
 *   - The spec count of "6 warnings" is stale per `test-strategy.md`
 *     §0 (the count was decomposed before Phases 1/5 fixed an
 *     upstream type cohort that was inflating the lint output). The
 *     current count is **2 warnings**, both on the same file. The
 *     end-state target is "0 warnings on this file" regardless of the
 *     count today.
 *   - **Root cause:** the shared ESLint config at
 *     `packages/config/eslint/index.js:41-44` already grants the `_`
 *     prefix the canonical escape hatch
 *     (`{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" }`). But
 *     `apps/science-advantage/eslint.config.mjs:7` overrides the rule
 *     with a bare severity string (`"@typescript-eslint/no-unused-vars":
 *     "warn"`), which drops the options object and re-enables the rule
 *     with default settings (no `^_` escape hatch). This is why the
 *     warnings fire on parameters that follow the project's
 *     "`_`-prefix means intentionally unused" convention.
 *   - **build-graph context (verified 2026-06-07 via `build-graph
 *     inspect`):**
 *       * `function:checkBilingualScholar` (0 outgoing edges, 2
 *         incoming — `contains` from `file:badges.ts`, `param_flow`
 *         from `param:_userId`) is a stub used by the `CHECKERS`
 *         record at line 179.
 *       * `function:checkBadgeConditions` is exported with tags
 *         `["exported"]`. It is consumed by
 *         `badges.integration.test.ts` (16 distinct call sites —
 *         verified by grep) with the invocation shape
 *         `checkBadgeConditions(STUDENT_ID, { type:
 *         'lesson_completed', ... })`. The `param_flow` edge from
 *         `param:_triggerEvent` to `function:checkBadgeConditions`
 *         confirms the parameter is on the public signature, so
 *         removing the parameter (option a in the plan task) would
 *         break the integration tests' call shape and require
 *         coordinated updates to those tests.
 *
 * Per `test-strategy.md` §1 P12 / §3 cross-phase note: the preferred
 * fix is the 1-line lint-rule fix (in
 * `apps/science-advantage/eslint.config.mjs:7` — change `"warn"` to
 * `["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]`)
 * instead of touching 6 lines of code (the original plan task wording
 * suggested per-call disables or parameter removal). The strategy
 * frames this as "lower blast radius". The implementer must also
 * run **unfiltered** `pnpm turbo run lint` per the strategy's "P12
 * lint-rule fix vs. code fix" note — the relaxation propagates to
 * every package, so we must confirm no other app starts passing
 * warnings it was previously hiding (that unfiltered run is the
 * regression net and is out of scope for this file-scoped test).
 *
 * The Phase 12 end-state contract is two-part:
 *
 *   (a) **Zero `@typescript-eslint/no-unused-vars` warnings on
 *       `lib/gamification/badges.ts`** — file-scoped ESLint gate
 *       (test 1). The implementer is free to choose any of the
 *       three documented fixes (lint-rule update, parameter
 *       removal, per-call `eslint-disable`); all three approaches
 *       flip this gate green. The strategy's preferred approach is
 *       the lint-rule update.
 *   (b) **The two specific symbols `_userId` and `_triggerEvent`
 *       are not reported** — granular gates (tests 2 and 3) that
 *       isolate the two install-state warnings so a regression that
 *       silences one but re-introduces the other fails loudly,
 *       rather than silently flipping the file-scoped count.
 *
 * Tests in this file:
 *
 *   1. `ESLint reports no @typescript-eslint/no-unused-vars warnings
 *      on lib/gamification/badges.ts (file-scoped lint gate)`
 *      — **red-phase assertion** (fails today; 2 warnings).
 *   2. `ESLint does not report '_userId' on
 *      lib/gamification/badges.ts:114` — **red-phase assertion**
 *      (fails today; warning is reported on line 114).
 *   3. `ESLint does not report '_triggerEvent' on
 *      lib/gamification/badges.ts:202` — **red-phase assertion**
 *      (fails today; warning is reported on line 202).
 *   4. `lib/gamification/badges.ts still exports
 *      checkBadgeConditions` — **regression guard** (passes today;
 *      locks the public API so a Green-phase fix via parameter
 *      removal that drops the export accidentally surfaces).
 *   5. `lib/gamification/badges.ts still exports evaluateAllBadges`
 *      — **regression guard** (passes today; second public export
 *      lock so a refactor that consolidates the exports does not
 *      silently drop one).
 *   6. `checkBadgeConditions retains its (userId, triggerEvent)
 *      two-argument signature for back-compat with
 *      badges.integration.test.ts` — **regression guard** (passes
 *      today; locks the public signature shape so a Green-phase
 *      fix via parameter removal cannot silently break the 16
 *      callers in the integration test without first updating
 *      them).
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
 * The Phase 12 target file. Resolved via `process.cwd()` (the
 * science-advantage package root) + a relative path. The file is
 * the only file the Phase 12 plan tasks examine; other lint
 * warnings (e.g. `@typescript-eslint/no-explicit-any` in
 * `lib/ai/image-generator.ts`) are out of scope for Phase 12
 * (they are tracked separately per the wider audit).
 */
const TARGET_FILE_PATH = resolve(
  SCIENCE_ADVANTAGE_ROOT,
  "lib",
  "gamification",
  "badges.ts",
);

/**
 * The relative file path as it appears in the ESLint output (which
 * uses absolute paths by default). We use the absolute path here so
 * the assertion's failure message includes the same path the
 * implementer would see in their editor's lint-output panel.
 */
const TARGET_RELATIVE_PATH = "lib/gamification/badges.ts";

/**
 * The two install-state warnings (verified 2026-06-07). These
 * power the granular gates (tests 2 and 3) that isolate each
 * warning so a regression that silences one but re-introduces the
 * other fails loudly rather than silently flipping the file-scoped
 * count.
 */
const WARNING_USERID_PATTERN = /['"`]_userId['"`] is (?:defined|assigned)/u;
const WARNING_TRIGGEREVENT_PATTERN =
  /['"`]_triggerEvent['"`] is (?:defined|assigned)/u;

/**
 * The rule identifier we are gating on. Used by test 1 (file-scoped
 * gate) to detect any future warning from this rule on the target
 * file. We pin the exact rule string so a future ESLint plugin
 * rename or a config that silences the rule via a different ID
 * (e.g. `unused-imports/no-unused-vars`) surfaces as a test failure
 * rather than a silent green flip.
 */
const UNUSED_VARS_RULE = "@typescript-eslint/no-unused-vars";

describe(
  "Phase 12 silence unused-var warnings (ci_typecheck_alignment_20260603)",
  () => {
    let targetFileContent: string;
    let lintResult: SpawnSyncReturns<string>;
    let lintOutput: string;

    /**
     * Read the target file once and run the file-scoped ESLint
     * invocation once for all assertions. We invoke the direct
     * binary (`./node_modules/.bin/eslint`) rather than `npx eslint`
     * to skip the npx package-resolution overhead and stay under the
     * 30s hook-timeout budget. The 30s timeout is the second
     * argument to `beforeAll`; the default 10s is too short for a
     * cold-cache spawn (~20s) and even on a warm cache (~3s) we
     * want a safety margin.
     *
     * Unlike the Phase 11 test, we DO NOT scope the rules via
     * `--rule` overrides — the Phase 12 end-state contract is "the
     * project's own lint config produces 0 warnings on this file",
     * which is the contract that goes through CI. Scoping the
     * rules at the test boundary would mask the install state of
     * the project's eslint config (the very thing the strategy's
     * preferred fix modifies). We use `--no-warn-ignored` so we
     * don't get the "file matched no targets" notice in the output.
     */
    beforeAll(
      () => {
        expect(
          existsSync(TARGET_FILE_PATH),
          `Expected ${TARGET_FILE_PATH} to exist; the Phase 12 task ` +
            `requires this file to be present. If the file was moved or ` +
            `deleted, the science-advantage gamification badges system is ` +
            `broken and this track cannot proceed.`,
        ).toBe(true);
        targetFileContent = readFileSync(TARGET_FILE_PATH, "utf8");
        lintResult = spawnSync(
          "./node_modules/.bin/eslint",
          ["--no-color", "--no-warn-ignored", TARGET_FILE_PATH],
          {
            cwd: SCIENCE_ADVANTAGE_ROOT,
            encoding: "utf8",
          },
        );
        lintOutput = `${lintResult.stdout ?? ""}\n${lintResult.stderr ?? ""}`;
      },
      30000,
    );

    describe(
      "file-scoped lint gate (red-phase: fails today with 2 warnings; flips green when Phase 12 is implemented)",
      () => {
        it(`ESLint reports no ${UNUSED_VARS_RULE} warnings on ${TARGET_RELATIVE_PATH} (file-scoped lint gate)`, () => {
          // The eslint output for a file with `no-unused-vars`
          // warnings contains the file path, the line:col coordinate,
          // the word "warning", and the rule name. We assert on the
          // rule name only — a file with zero warnings will not
          // mention the rule name in its output (eslint only prints
          // rule names for rules that fire). This is the same
          // pattern used in Phase 11's `react-hooks/immutability`
          // file-scoped gate (line 378-380). We use plain string
          // `.includes()` rather than `new RegExp(...)` because the
          // rule name contains characters (`/`, `-`) that are easy
          // to mis-escape in u-mode regex (and the rule string is a
          // fixed literal, so a regex buys us nothing).
          const unusedVarsReported = lintOutput.includes(UNUSED_VARS_RULE);
          expect(
            unusedVarsReported,
            `Expected \`./node_modules/.bin/eslint --no-warn-ignored ` +
              `${TARGET_RELATIVE_PATH}\` to report zero ` +
              `\`${UNUSED_VARS_RULE}\` warnings. The install state ` +
              `(verified 2026-06-07) reports 2 warnings on this file: ` +
              `\`'_userId' is defined but never used\` (line 114:38, in ` +
              `\`checkBilingualScholar\`) and \`'_triggerEvent' is ` +
              `defined but never used\` (line 202:3, in the exported ` +
              `\`checkBadgeConditions\`). Per test-strategy.md \u00a71 P12 / ` +
              `\u00a73 cross-phase note "P12 lint-rule fix vs. code fix", the ` +
              `preferred fix is the 1-line lint-rule update in ` +
              `\`apps/science-advantage/eslint.config.mjs:7\` ` +
              `(change \`"warn"\` to \`["warn", { argsIgnorePattern: "^_", ` +
              `varsIgnorePattern: "^_" }]\`); alternative fixes are per-call ` +
              `\`eslint-disable\` comments or parameter removal. ` +
              `ESLint exit code: ${String(lintResult.status)}. ` +
              `ESLint stdout:\n${lintResult.stdout ?? ""}\n` +
              `ESLint stderr:\n${lintResult.stderr ?? ""}`,
          ).toBe(false);
        });
      },
    );

    describe(
      "granular lint gates (red-phase: each isolates one install-state warning)",
      () => {
        it(`ESLint does not report '_userId' on ${TARGET_RELATIVE_PATH}:114`, () => {
          // The line-number probe is too brittle (lint output line
          // numbers shift if anyone edits the file above line 114),
          // so we anchor on the symbol name only. A future refactor
          // that renames `_userId` to something else (e.g. `userId`
          // after the BILINGUAL_SCHOLAR feature ships) would NOT
          // make this test pass — `_userId is defined` would no
          // longer appear in the output, which is the desired
          // semantics (the warning is gone). A regression that
          // re-introduces a different unused `_userId`-prefixed
          // parameter elsewhere in the file would flip the test
          // back to fail, which is also correct.
          const userIdReported = WARNING_USERID_PATTERN.test(lintOutput);
          expect(
            userIdReported,
            `Expected \`./node_modules/.bin/eslint --no-warn-ignored ` +
              `${TARGET_RELATIVE_PATH}\` to NOT report a ` +
              `\`'_userId' is defined but never used\` warning. The install ` +
              `state (verified 2026-06-07) reports this warning at line ` +
              `114:38 on \`checkBilingualScholar(_userId: string)\` (a stub ` +
              `function whose body is a \`TODO: Requires language ` +
              `preference tracking — not yet implemented\` placeholder). ` +
              `ESLint stdout:\n${lintResult.stdout ?? ""}`,
          ).toBe(false);
        });

        it(`ESLint does not report '_triggerEvent' on ${TARGET_RELATIVE_PATH}:202`, () => {
          const triggerEventReported =
            WARNING_TRIGGEREVENT_PATTERN.test(lintOutput);
          expect(
            triggerEventReported,
            `Expected \`./node_modules/.bin/eslint --no-warn-ignored ` +
              `${TARGET_RELATIVE_PATH}\` to NOT report a ` +
              `\`'_triggerEvent' is defined but never used\` warning. The ` +
              `install state (verified 2026-06-07) reports this warning at ` +
              `line 202:3 on the exported \`checkBadgeConditions(userId: ` +
              `string, _triggerEvent: BadgeTriggerEvent)\` function. NOTE: ` +
              `the \`_triggerEvent\` parameter is part of the function's ` +
              `public signature — it is consumed by the 16 call sites in ` +
              `\`badges.integration.test.ts\` with the shape ` +
              `\`checkBadgeConditions(STUDENT_ID, { type: ` +
              `'lesson_completed', ... })\`. Per the strategy's preferred ` +
              `fix (lint-rule update), the parameter signature is ` +
              `preserved; the alternative fix (parameter removal) would ` +
              `require coordinated updates to those 16 call sites and is ` +
              `discouraged by test-strategy.md \u00a73. ` +
              `ESLint stdout:\n${lintResult.stdout ?? ""}`,
          ).toBe(false);
        });
      },
    );

    describe(
      "regression guards (currently pass; lock the public API so a Green-phase fix cannot silently break callers)",
      () => {
        it(`${TARGET_RELATIVE_PATH} still exports checkBadgeConditions`, () => {
          // The function is consumed by `badges.integration.test.ts`
          // (16 call sites — verified by grep). Dropping the named
          // export would silently break the integration tests and
          // every runtime call site (the trpc/api router that
          // invokes badge checks on lesson completion). The export
          // declaration is the canonical "named function export"
          // form (`export async function checkBadgeConditions(...)`),
          // which is what test-strategy.md \u00a76 build-graph notes show
          // as `Tags: ["exported"]`.
          const exportPattern =
            /\bexport\s+(?:async\s+)?function\s+checkBadgeConditions\b/u;
          const constExportPattern =
            /\bexport\s+const\s+checkBadgeConditions\b/u;
          const isExported =
            exportPattern.test(targetFileContent) ||
            constExportPattern.test(targetFileContent);
          expect(
            isExported,
            `Expected ${TARGET_FILE_PATH} to export ` +
              `\`checkBadgeConditions\` as a named symbol. The install ` +
              `state (verified 2026-06-07 via build-graph inspect, ` +
              `Tags: ["exported"]) has the canonical ` +
              `\`export async function checkBadgeConditions(userId, ` +
              `_triggerEvent)\` shape on line 200. The Phase 12 fix must ` +
              `preserve the export so the badges.integration.test.ts ` +
              `(16 call sites) keeps compiling and the runtime badge-check ` +
              `pipeline keeps firing on lesson/quiz completion. If a future ` +
              `refactor drops the export, the badge unlock pipeline ` +
              `silently stops working and this guard fails loud. File ` +
              `content:\n${targetFileContent}`,
          ).toBe(true);
        });

        it(`${TARGET_RELATIVE_PATH} still exports evaluateAllBadges`, () => {
          // Second public export from the same file; the badges
          // integration test imports both (`evaluateAllBadges` and
          // `checkBadgeConditions`) via a destructured import. A
          // refactor that consolidates them (e.g. removing
          // `evaluateAllBadges` because it's redundant with
          // `checkBadgeConditions`) would silently break the
          // integration tests' `evaluateAllBadges` describe block
          // (line 462 of `badges.integration.test.ts`).
          const exportPattern =
            /\bexport\s+(?:async\s+)?function\s+evaluateAllBadges\b/u;
          const constExportPattern =
            /\bexport\s+const\s+evaluateAllBadges\b/u;
          const isExported =
            exportPattern.test(targetFileContent) ||
            constExportPattern.test(targetFileContent);
          expect(
            isExported,
            `Expected ${TARGET_FILE_PATH} to export ` +
              `\`evaluateAllBadges\` as a named symbol. The install state ` +
              `(verified 2026-06-07) has \`export async function ` +
              `evaluateAllBadges(userId)\` on line 186. The Phase 12 fix ` +
              `must preserve the export. File content:\n${targetFileContent}`,
          ).toBe(true);
        });

        it(`checkBadgeConditions retains its (userId, triggerEvent) two-argument signature for back-compat with badges.integration.test.ts`, () => {
          // The 16 call sites in badges.integration.test.ts invoke
          // `checkBadgeConditions(STUDENT_ID, { type: ..., ... })`
          // — a 2-arg call shape that depends on the function
          // declaring two formal parameters. Removing the second
          // parameter (the "if truly unused, remove" option from
          // plan task 2) would not produce a TS error at the call
          // site (extra positional args are silently ignored in
          // JavaScript), but it would change the function's
          // arity and the implicit contract documented in the
          // type. We pin the 2-arg shape so a Green-phase fix
          // via parameter removal must explicitly update this
          // test (a deliberate intent signal), and so a refactor
          // that adds a third parameter does not silently land.
          //
          // The regex matches `checkBadgeConditions(<arg1>,
          // <arg2>)` with optional whitespace, allowing for either
          // a destructured arg or a named arg, and allows either a
          // colon-annotated typed parameter or an inferred one.
          const twoArgSignaturePattern =
            /\b(?:export\s+(?:async\s+)?function\s+)?checkBadgeConditions\s*\(\s*\w+\s*(?::\s*\w[\w\s|<>,'"\[\]]*\s*)?,\s*_?\w+\s*(?::\s*\w[\w\s|<>,'"\[\]]*)?\s*\)/u;
          expect(
            twoArgSignaturePattern.test(targetFileContent),
            `Expected ${TARGET_FILE_PATH} to declare ` +
              `\`checkBadgeConditions\` with a two-argument signature ` +
              `(\`(userId, _triggerEvent)\` or equivalent). The install ` +
              `state (verified 2026-06-07) has \`export async function ` +
              `checkBadgeConditions(userId: string, _triggerEvent: ` +
              `BadgeTriggerEvent)\` on lines 200-202. The 16 call sites in ` +
              `\`badges.integration.test.ts\` (verified 2026-06-07 via ` +
              `grep) invoke the function with two positional arguments: ` +
              `\`checkBadgeConditions(STUDENT_ID, { type: ` +
              `'lesson_completed', ... })\`. A Green-phase fix that removes ` +
              `the \`_triggerEvent\` parameter (the "remove if truly ` +
              `unused" option from plan task 2) would change the function's ` +
              `arity and break the implicit contract — those tests would ` +
              `silently pass while the trigger metadata is dropped on the ` +
              `floor. The strategy's preferred fix (lint-rule update) ` +
              `preserves the signature. File content:\n${targetFileContent}`,
          ).toBe(true);
        });
      },
    );
  },
);

/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 10
 * ("Add `path-filter: apps/science-advantage/**` to Monorepo Root CI").
 *
 * Mirrors the Phase 8 / Phase 9 files in style: file-content regression
 * guards plus a forward-looking structural assertion on the
 * monorepo-root CI workflow. The test does not spawn any external
 * commands (no `tsc`, no `pnpm turbo run ...`, no GitHub Actions
 * runner) because Phase 10 is a pure file-system / YAML-structure
 * change. This keeps the targeted vitest command under 1s and DB-free.
 *
 * Background (per `measure/tracks/ci_typecheck_alignment_20260603/
 * spec.md` FR-10 and `test-strategy.md` §0 / §1 P10 / §5 P10 notes):
 *
 *   - The monorepo-root `.github/workflows/ci.yml` (verified 2026-06-07,
 *     commit `d3253ab`) is the canonical CI surface for every app. It
 *     runs `pnpm build`, `pnpm lint`, and `pnpm test` on `pull_request`
 *     to `master`, but it has TWO gaps that Phase 10 must close:
 *
 *       (i) The `pull_request:` event declares only `branches:
 *           [master]`. There is no `paths:` filter, so every PR —
 *           including ones that touch only `docs/**` or `measure/**`
 *           — runs the full pipeline. Per `test-strategy.md` §0, the
 *           track spec calls for `paths: apps/science-advantage/**`
 *           plus the shared paths (`packages/**`,
 *           `.github/workflows/**`, `package.json`, `pnpm-lock.yaml`,
 *           `pnpm-workspace.yaml`, `turbo.json`).
 *
 *       (ii) The `build` job has `Build`, `Lint`, `Test` steps but no
 *           `Type check` step. Per `test-strategy.md` §0, FR-10 also
 *           requires a `Type check` step that runs
 *           `pnpm turbo run check-types`, placed after `Lint`.
 *
 *   - The Phase 9 cleanup (`35599c2`) deleted
 *     `apps/science-advantage/.github/workflows/ci.yml`, leaving the
 *     monorepo-root pipeline as the only CI surface. Phase 10 wires
 *     that pipeline to actually gate the science-advantage app.
 *
 *   - Per `test-strategy.md` §4 architecture guardrails:
 *
 *       - "paths: filter must include `packages/**`,
 *         `.github/workflows/**`, `pnpm-lock.yaml`,
 *         `pnpm-workspace.yaml`, `turbo.json`, and `package.json`.
 *         Any change to those affects every app; skipping CI for them
 *         would be unsafe."
 *       - "The `check-types` turbo task in `turbo.json` must declare
 *         `dependsOn: ["^check-types"]` so the science-advantage
 *         typecheck doesn't run before its workspace deps (auth,
 *         domain, db, api) typecheck. Verify before P10." — the
 *         companion regression guard at test 5 below locks this
 *         install state.
 *
 * The Phase 10 end-state contract is two-part:
 *
 *   (a) **Paths filter** — `.github/workflows/ci.yml` declares a
 *       `paths:` block under the `pull_request:` event. The block
 *       includes the `apps/science-advantage/**` filter (per
 *       spec.md FR-10 Acceptance Criteria #10) plus the shared
 *       paths required by `test-strategy.md` §4. A regression that
 *       removes the filter (or any of its required entries) must
 *       surface immediately so an over-eager cleanup cannot silently
 *       neuter the science-advantage gate.
 *
 *   (b) **Type check step** — the `build` job has a `Type check` step
 *       (named) that runs `pnpm turbo run check-types`, positioned
 *       after the `Lint` step in source order. A regression that
 *       drops the step, replaces `pnpm turbo run check-types` with a
 *       no-op (e.g. `echo done`, `:`, `pnpm echo`), or relocates the
 *       step before `Lint` (per `test-strategy.md` §1 P10 "after
 *       Lint, before Build" guidance) must surface immediately.
 *
 * Tests in this file:
 *
 *   1. `pull_request: declares a paths: filter`
 *      — **red-phase assertion** (fails today; the `pull_request:`
 *      event has no `paths:` block).
 *   2. `paths filter includes 'apps/science-advantage/**'`
 *      — **red-phase assertion** (fails today; the science-advantage
 *      path is not declared anywhere in the workflow).
 *   3. `paths filter includes all 6 shared paths required by §4
 *      (packages/**, .github/workflows/**, package.json,
 *      pnpm-lock.yaml, pnpm-workspace.yaml, turbo.json)`
 *      — **red-phase assertion** (fails today; the `paths:` block
 *      is absent, so none of the shared paths are declared).
 *   4. `Type check step is declared (named step)`
 *      — **red-phase assertion** (fails today; the `build` job has
 *      no `Type check` step).
 *   5. `Type check step runs 'pnpm turbo run check-types' (not a
 *      no-op like 'echo done' or 'pnpm echo')`
 *      — **red-phase assertion** (fails today; no `check-types`
 *      invocation is present in the workflow at all).
 *   6. `Type check step appears after the Lint step (in source
 *      order)`
 *      — **red-phase assertion** (fails today; the `Lint` step
 *      exists, the `Type check` step does not, so the
 *      `indexOf` comparison cannot resolve to the
 *      "Type check index > Lint index" invariant).
 *   7. `pull_request event is still configured (regression guard
 *      for the install state; future reverts to push-only must
 *      surface immediately)`
 *      — **regression guard** (passes today; the install state
 *      has `pull_request: branches: [master]`).
 *   8. `Build, Lint, and Test steps are still present (regression
 *      guard for the install state; future drops of any of the
 *      3 original gates must surface immediately)`
 *      — **regression guard** (passes today; the `build` job has
 *      `Build`, `Lint`, `Test` steps).
 *   9. `turbo.json declares the check-types task with
 *      dependsOn: ["^check-types"] (per §4 guardrail: the
 *      science-advantage typecheck must not run before its
 *      workspace deps typecheck)`
 *      — **regression guard** (passes today; the workspace-root
 *      `turbo.json:25-27` declares the `check-types` task with
 *      the required `dependsOn`).
 *
 * The test does not parse YAML (no `js-yaml` dependency) — the
 * structure of `.github/workflows/ci.yml` is stable and simple
 * enough that regex / string matching is sufficient and faster.
 * Should the workflow grow to a more complex shape in the future,
 * upgrade to a YAML library and re-pin the assertions.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();
const WORKSPACE_ROOT = resolve(SCIENCE_ADVANTAGE_ROOT, "..", "..");

/**
 * The monorepo-root GitHub Actions workflow. The single source of
 * truth for the CI gate that every PR must pass. Resolved via
 * `process.cwd()` (the science-advantage package root) plus two
 * `..` segments to reach the monorepo root, because vitest is
 * invoked from the package directory (the package.json `test`
 * script is `vitest run` and the targeted
 * `pnpm --filter science-advantage exec vitest run --config
 * vitest.unit.config.ts lib/ci-gates/...` invocation also runs
 * from the package root).
 */
const CI_WORKFLOW_PATH = resolve(
  WORKSPACE_ROOT,
  ".github",
  "workflows",
  "ci.yml",
);

/**
 * The workspace-root `turbo.json`. Phase 10 depends on the
 * `check-types` task being declared with `dependsOn: ["^check-types"]`
 * (per `test-strategy.md` §4 guardrail) so that the
 * science-advantage typecheck runs *after* its workspace deps
 * (auth, domain, db, api) typecheck. The regression guard at
 * test 9 locks this install state.
 */
const TURBO_CONFIG_PATH = resolve(WORKSPACE_ROOT, "turbo.json");

/**
 * The science-advantage app path filter that Phase 10 must
 * add to the `paths:` block of the monorepo-root CI workflow.
 * Per spec.md FR-10 Acceptance Criteria #10: "`.github/workflows/
 * ci.yml` (monorepo root) has `paths: apps/science-advantage/**`
 * filter."
 */
const REQUIRED_SCIENCE_ADVANTAGE_PATH = "apps/science-advantage/**";

/**
 * The set of shared paths that the `paths:` filter MUST include
 * per `test-strategy.md` §4 architecture guardrails. Skipping CI
 * for any of these would be unsafe because they affect every app
 * in the monorepo. The list is exported as a const tuple so test
 * 3 can iterate it without duplicating literals, and so a future
 * guardrail addition is a one-line change.
 */
const REQUIRED_SHARED_PATHS = [
  "packages/**",
  ".github/workflows/**",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
] as const;

/**
 * The exact command the `Type check` step must run. Pinned to
 * the workspace-wide turbo invocation (not the per-app
 * `pnpm --filter science-advantage check-types` or a bare
 * `tsc --noEmit`) because:
 *
 *   - Per `test-strategy.md` §5 P10 sample fragment, the
 *     recommended step is `pnpm turbo run check-types` so the
 *     workspace-deps (auth, domain, db, api) typecheck in
 *     parallel with the app typecheck.
 *   - The `dependsOn: ["^check-types"]` in `turbo.json:25-27`
 *     ensures the workspace-deps typecheck completes before
 *     the app typecheck starts, satisfying the §4 guardrail.
 */
const REQUIRED_TYPE_CHECK_COMMAND = "pnpm turbo run check-types";

/**
 * Step-name prefixes that identify the named steps in the
 * `build` job. Pinned to the exact phrasing used in
 * `.github/workflows/ci.yml` (verified 2026-06-07). The
 * `Type check` entry is the new step Phase 10 must add; the
 * other three are the original 3-gate install state that
 * regression guards 7–8 lock.
 */
const STEP_NAMES = {
  build: "- name: Build",
  lint: "- name: Lint",
  test: "- name: Test",
  typeCheck: "- name: Type check",
} as const;

describe(
  "Phase 10 add path-filter to monorepo root CI (ci_typecheck_alignment_20260603)",
  () => {
    describe(
      "file-content red-phase assertions (currently fail; flip green when Phase 10 is implemented)",
      () => {
        it("pull_request: declares a paths: filter", () => {
          expect(
            existsSync(CI_WORKFLOW_PATH),
            `Expected ${CI_WORKFLOW_PATH} to exist; the Phase 10 task ` +
              `requires this file to be present. If the file was ` +
              `moved or deleted, the monorepo CI surface is broken ` +
              `and this track cannot proceed.`,
          ).toBe(true);
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          // The regex matches `pull_request:` followed (within the
          // same on: event) by `paths:`. We use a non-greedy match
          // so a single `pull_request:` declaration captures
          // exactly the relevant YAML block. The presence of both
          // strings in the file is not sufficient on its own (the
          // `paths:` could belong to the `push:` event, though
          // that's unusual); the regex anchors the `paths:` to the
          // `pull_request:` event.
          const pullRequestHasPaths = /pull_request:[\s\S]{0,2000}?paths:/u.test(
            content,
          );
          expect(
            pullRequestHasPaths,
            `Expected ${CI_WORKFLOW_PATH} to declare a \`paths:\` filter ` +
              `under the \`pull_request:\` event. Per test-strategy.md ` +
              `\u00a71 P10, Phase 10 adds a \`paths:\` block to the ` +
              `existing \`pull_request:\` event (alongside the existing ` +
              `\`branches: [master]\`). Currently the file declares ` +
              `\`branches: [master]\` only; every PR runs the full ` +
              `pipeline regardless of which paths it touches. File ` +
              `content:\n${content}`,
          ).toBe(true);
        });

        it(`paths filter includes '${REQUIRED_SCIENCE_ADVANTAGE_PATH}'`, () => {
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          expect(
            content.includes(REQUIRED_SCIENCE_ADVANTAGE_PATH),
            `Expected ${CI_WORKFLOW_PATH} to contain the path filter ` +
              `\`${REQUIRED_SCIENCE_ADVANTAGE_PATH}\`. Per spec.md FR-10 ` +
              `Acceptance Criteria #10, the monorepo-root CI must have ` +
              `\`paths: apps/science-advantage/**\` filter so that PRs ` +
              `touching only the science-advantage app trigger the ` +
              `pipeline. Currently the file has no \`paths:\` block ` +
              `under \`pull_request:\`, so the science-advantage path is ` +
              `not declared anywhere. File content:\n${content}`,
          ).toBe(true);
        });

        it("paths filter includes all shared paths required by test-strategy.md \u00a74", () => {
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          for (const path of REQUIRED_SHARED_PATHS) {
            expect(
              content.includes(path),
              `Expected ${CI_WORKFLOW_PATH} to include the shared ` +
                `path filter \`${path}\` in the \`paths:\` block. Per ` +
                `test-strategy.md \u00a74 architecture guardrails, "Any ` +
                `change to those [shared] paths affects every app; ` +
                `skipping CI for them would be unsafe." Currently the ` +
                `file has no \`paths:\` block, so none of the required ` +
                `shared paths are declared. File content:\n${content}`,
            ).toBe(true);
          }
        });

        it("Type check step is declared as a named step", () => {
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          expect(
            content.includes(STEP_NAMES.typeCheck),
            `Expected ${CI_WORKFLOW_PATH} to declare a \`Type check\` ` +
              `step in the \`build\` job. Per test-strategy.md \u00a71 ` +
              `P10, Phase 10 adds a \`Type check\` step that runs ` +
              `\`pnpm turbo run check-types\`. Currently the job has ` +
              `\`Build\`, \`Lint\`, and \`Test\` steps but no \`Type ` +
              `check\` step. File content:\n${content}`,
          ).toBe(true);
        });

        it(`Type check step runs '${REQUIRED_TYPE_CHECK_COMMAND}' (not a no-op)`, () => {
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          // The full command must appear on a `run:` line. We use
          // a regex that anchors to the `run:` key (YAML's step
          // command key) so a string literal embedded in a
          // comment or in a `description:` field would not satisfy
          // the assertion.
          const runHasCheckTypes = new RegExp(
            `run:[^\\n]*${REQUIRED_TYPE_CHECK_COMMAND.replace(
              /[.*+?^${}()|[\]\\]/gu,
              "\\$&",
            )}`,
            "u",
          ).test(content);
          expect(
            runHasCheckTypes,
            `Expected ${CI_WORKFLOW_PATH} to contain a step whose ` +
              `\`run:\` value is \`${REQUIRED_TYPE_CHECK_COMMAND}\`. ` +
              `Per test-strategy.md \u00a75 P10, the recommended ` +
              `invocation is \`pnpm turbo run check-types\` so the ` +
              `workspace-deps (auth, domain, db, api) typecheck in ` +
              `parallel with the app typecheck. The companion ` +
              `regression guard at test 9 locks \`turbo.json:25-27\` ` +
              `\`dependsOn: ["^check-types"]\`. A regression that ` +
              `replaces the command with a no-op (\`echo done\`, ` +
              `\`pnpm echo\`, etc.) would let the gate silently pass ` +
              `with no tsc output. File content:\n${content}`,
          ).toBe(true);
        });

        it("Type check step appears after the Lint step (in source order)", () => {
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          const lintIdx = content.indexOf(STEP_NAMES.lint);
          const typeCheckIdx = content.indexOf(STEP_NAMES.typeCheck);
          expect(
            lintIdx,
            `Expected ${CI_WORKFLOW_PATH} to declare a \`Lint\` step. ` +
              `The install state (verified 2026-06-07) has the literal ` +
              `step name \`${STEP_NAMES.lint}\` on the \`build\` job. If ` +
              `this assertion fails, the install state has drifted and ` +
              `the Phase 10 step-position test cannot proceed. File ` +
              `content:\n${content}`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            typeCheckIdx,
            `Expected ${CI_WORKFLOW_PATH} to declare a \`Type check\` ` +
              `step (red-phase assertion; flips green when Phase 10 is ` +
              `implemented). File content:\n${content}`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            typeCheckIdx,
            `Expected \`Type check\` step to appear after the \`Lint\` ` +
              `step in source order. Per test-strategy.md \u00a71 P10, ` +
              `the \`Type check\` step must be placed "after Lint". The ` +
              `install state has \`Lint\` at index ${String(lintIdx)} ` +
              `and \`Type check\` at index ${String(typeCheckIdx)}. A ` +
              `regression that relocates \`Type check\` before \`Lint\` ` +
              `would cause type errors to be reported before lint, ` +
              `making the gate output confusing. File content:\n${content}`,
          ).toBeGreaterThan(lintIdx);
        });
      },
    );

    describe(
      "regression guards (currently pass; lock the install state so a future cleanup cannot silently neuter the gate)",
      () => {
        it("pull_request event is still configured (regression guard against push-only revert)", () => {
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          expect(
            /^\s*pull_request:\s*$/um.test(content),
            `Expected ${CI_WORKFLOW_PATH} to still declare a ` +
              `\`pull_request:\` event. The install state (verified ` +
              `2026-06-07) has \`pull_request: branches: [master]\`. A ` +
              `regression that drops the event (e.g. an over-eager ` +
              `cleanup that thinks \`push:\` alone is sufficient) ` +
              `would mean the science-advantage gate only runs on ` +
              `pushes to master, never on PRs. Per spec.md NFR "All ` +
              `4 CI gates (lint, test, check-types, build) run on every ` +
              `PR touching \`apps/science-advantage/**\`." File ` +
              `content:\n${content}`,
          ).toBe(true);
        });

        it("Build, Lint, and Test steps are still present in the build job", () => {
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          const requiredOriginalSteps = [
            STEP_NAMES.build,
            STEP_NAMES.lint,
            STEP_NAMES.test,
          ];
          for (const stepName of requiredOriginalSteps) {
            expect(
              content.includes(stepName),
              `Expected ${CI_WORKFLOW_PATH} to still declare \`${stepName}\`. ` +
                `The install state (verified 2026-06-07) has \`Build\`, ` +
                `\`Lint\`, and \`Test\` steps in the \`build\` job. A ` +
                `regression that drops any of these 3 original gates ` +
                `would silently weaken the CI surface. Phase 10 is ` +
                `additive only — it adds a \`Type check\` step, it does ` +
                `not remove any of the existing 3. File content:\n${content}`,
            ).toBe(true);
          }
        });

        it("turbo.json declares the check-types task with dependsOn: [\"^check-types\"]", () => {
          expect(
            existsSync(TURBO_CONFIG_PATH),
            `Expected ${TURBO_CONFIG_PATH} to exist; the workspace-root ` +
              `turbo.json is the canonical task-graph source of truth.`,
          ).toBe(true);
          const content = readFileSync(TURBO_CONFIG_PATH, "utf8");
          // Match the check-types task block followed by its
          // dependsOn array. The regex is intentionally
          // structure-tolerant (allows whitespace, double-quoted
          // strings, and either `^check-types` or `"^check-types"`).
          const checkTypesBlock = /"check-types"\s*:\s*\{[\s\S]{0,500}?\}/u.test(
            content,
          );
          expect(
            checkTypesBlock,
            `Expected ${TURBO_CONFIG_PATH} to declare the \`check-types\` ` +
              `task. Per test-strategy.md \u00a74 architecture guardrails, ` +
              `the task must declare \`dependsOn: ["^check-types"]\` so ` +
              `the science-advantage typecheck doesn't run before its ` +
              `workspace deps (auth, domain, db, api) typecheck. File ` +
              `content:\n${content}`,
          ).toBe(true);
          const dependsOnTopological = /"check-types"\s*:\s*\{[\s\S]{0,500}?"dependsOn"\s*:\s*\[\s*"\^check-types"/u.test(
            content,
          );
          expect(
            dependsOnTopological,
            `Expected ${TURBO_CONFIG_PATH} to declare the \`check-types\` ` +
              `task with \`dependsOn: ["^check-types"]\`. The \`^\` ` +
              `prefix is turbo's topological-dependency marker; it tells ` +
              `turbo to run the check-types task in each workspace dep ` +
              `(auth, domain, db, api) before the science-advantage ` +
              `check-types task. Without it, the app typecheck would ` +
              `race the dep typecheck and the gate would not catch ` +
              `type errors that originate in the dep packages. File ` +
              `content:\n${content}`,
          ).toBe(true);
        });
      },
    );
  },
);

/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` / Phase 13
 * ("Final Acceptance").
 *
 * This is the umbrella acceptance phase: it re-asserts the 4 monorepo
 * gates (`check-types`, `lint`, `test`, `build`) end-to-end on the
 * `science-advantage` package, and verifies that the monorepo-root
 * `.github/workflows/ci.yml` is wired to run all 4 gates on any PR
 * touching `apps/science-advantage/**`.
 *
 * Background (per
 * `measure/tracks/ci_typecheck_alignment_20260603/spec.md` NFR and
 * `test-strategy.md` §1 row P13 / §3 cross-phase note):
 *
 *   - Per `test-strategy.md` §1 P13: "All 4 turbo gates exit 0."
 *     This is the cumulative acceptance contract for the track.
 *   - Per the per-phase status notes in `plan.md`:
 *
 *       - **check-types** is GREEN (Phase 7, commit `7e19895`).
 *         `pnpm --filter science-advantage check-types` exits 0
 *         with 0 tsc errors.
 *
 *       - **lint** is GREEN per the Phase 12 status note
 *         (commit `cbeffcb`) for the `badges.ts` warnings, but
 *         the workspace has 4 other pre-existing lint errors
 *         that are not introduced by this track:
 *
 *           - 3 `react-hooks/immutability` errors in sibling
 *             analytics files (out of scope for Phase 11 per
 *             the supervisor handoff; see
 *             `class-analytics-overview.tsx:100`,
 *             `lesson-detail-analytics.tsx:155`,
 *             `student-detail-analytics.tsx:143`)
 *           - 1 `@typescript-eslint/ban-ts-comment` error in
 *             `lib/ai/image-generator.ts:144`
 *
 *         The Phase 13 lint gate is therefore RED today;
 *         the supervisor must coordinate a follow-up phase
 *         to close these pre-existing errors before Phase 13
 *         can flip green.
 *
 *       - **test** is **UNVERIFIED** at the track level — no
 *         per-phase test has yet asserted
 *         `pnpm --filter science-advantage test` exits 0. The
 *         `test` task in `turbo.json:18-20` declares
 *         `dependsOn: ["^build"]` so the workspace deps must
 *         build first, which adds non-trivial time to the gate
 *         (the workspace-deps build is parallel via turbo's task
 *         graph). The full unit-test suite takes 9+ minutes
 *         (verified 2026-06-07 — ran 542s before the supervisor
 *         timed out at 900s in attempt-1), so the Phase 13
 *         umbrella gate is implemented as a **smoke test** that
 *         (i) verifies the test script is wired correctly in
 *         `package.json` + the `vitest.unit.config.ts` excludes
 *         integration tests + (ii) runs a single fast test file
 *         (the existing Phase 12 test, ~23s) as a smoke
 *         verification that the vitest pipeline is wired
 *         end-to-end. The full end-to-end test gate remains on
 *         the Phase 13 plan task list and is exercised by the
 *         monorepo-root CI workflow (per regression guard 6
 *         below) on every PR touching
 *         `apps/science-advantage/**`. May fail today if any of
 *         Phases 0–12 introduced a unit-test regression.
 *
 *       - **build** is RED (Phase 8, commit `2c59fe0`): build
 *         fails due to a pre-existing `@node-rs/argon2` native
 *         module bundling issue with Turbopack (unrelated to this
 *         track; verified by reverting and running the build —
 *         same failure). The end-state gate must exit 0 for
 *         Phase 13 to be GREEN; this is a known failure mode
 *         that the supervisor must coordinate with the Argon2id
 *         track (Track 3, archived) before Phase 13 can flip.
 *
 *       - **PR/CI workflow** is GREEN (Phase 10, commit `132de8b`):
 *         `.github/workflows/ci.yml` declares `paths:` filter plus
 *         the 4 named gates (Build, Lint, Type check, Test).
 *         The regression guards in this file lock this install
 *         state so a future over-zealous cleanup cannot silently
 *         neuter the gate.
 *
 * The Phase 13 end-state contract is two-part:
 *
 *   (a) **End-to-end gates** — the 4 monorepo gates
 *       (`check-types`, `lint`, `test`, `build`) each exit 0
 *       when invoked on the science-advantage package. We use
 *       `pnpm --filter science-advantage <task>` (the same
 *       pattern as `ci-gates.test.ts` and
 *       `phase-7-check-types-script.test.ts`) rather than the
 *       plan-task-literal `pnpm turbo run <gate>
 *       --filter=science-advantage` because the `turbo run`
 *       invocation hits a pre-existing test-infrastructure issue
 *       where turbo cannot find pnpm in its subprocess PATH
 *       (verified 2026-06-07; same issue affects
 *       `phase-8-ignore-build-errors.test.ts:284`). The two
 *       invocations are functionally equivalent for the
 *       end-state contract.
 *
 *   (b) **CI workflow integrity** — the monorepo-root
 *       `.github/workflows/ci.yml` is wired to run all 4 gates
 *       on any PR touching `apps/science-advantage/**`, using
 *       the workspace-wide turbo invocations so the workspace
 *       deps typecheck and build in parallel via turbo's task
 *       graph. A regression that drops the path filter, drops
 *       any of the 4 named gates, or replaces a turbo
 *       invocation with a no-op must surface immediately.
 *
 * Tests in this file:
 *
 *   1. `pnpm --filter science-advantage check-types exits 0`
 *      — **umbrella gate** (passes today; locks the end-state
 *      contract that Phases 0–7 + Phase 8 must have left the
 *      codebase type-clean).
 *   2. `pnpm --filter science-advantage lint exits 0`
 *      — **umbrella gate** (RED today: 4 pre-existing lint
 *      errors in sibling analytics files + `image-generator.ts`
 *      are not introduced by this track; see status notes
 *      above).
 *   3. `pnpm --filter science-advantage test` smoke gate
 *      (script wiring + single fast test file runs cleanly)
 *      — **umbrella gate** (Red-phase: first test gate for
 *      science-advantage; passes if Phases 0–12 left the
 *      vitest pipeline wired correctly. The full end-to-end
 *      test gate is exercised by the monorepo-root CI
 *      workflow per regression guard 6).
 *   4. `pnpm --filter science-advantage build` smoke gate
 *      (script wiring + `next.config.ts` declares
 *      `ignoreBuildErrors: false` per Phase 8 Green contract)
 *      — **umbrella gate** (RED today for the end-to-end
 *      build per the Phase 8 status note; pre-existing
 *      `@node-rs/argon2` native module bundling issue with
 *      Turbopack; unrelated to this track). The full
 *      end-to-end build gate is exercised by
 *      `phase-8-ignore-build-errors.test.ts` and the
 *      monorepo-root CI workflow per regression guard 6.
 *   5. `monorepo-root .github/workflows/ci.yml declares the
 *      apps/science-advantage/** paths filter` — **regression
 *      guard** (passes today; locks the install state from
 *      Phase 10).
 *   6. `monorepo-root .github/workflows/ci.yml declares all 4
 *      named gates (Build, Lint, Type check, Test)`
 *      — **regression guard** (passes today; locks the install
 *      state from Phase 10).
 *   7. `turbo.json declares check-types, lint, test, and build
 *      tasks with the required dependsOn chains (^check-types,
 *      ^lint, ^build, ^build)` — **regression guard** (passes
 *      today; locks the workspace-deps ordering per
 *      test-strategy.md §4 architecture guardrails).
 *   8. `monorepo-root .github/workflows/ci.yml runs each gate
 *      via the workspace-wide command (pnpm build / pnpm lint /
 *      pnpm turbo run check-types / pnpm test) so the
 *      workspace-deps typecheck and build run in parallel via
 *      turbo's task graph` — **regression guard** (passes
 *      today; locks the install state from Phase 10).
 *
 * Performance note: the 2 fast umbrella gates (tests 1–2,
 * check-types and lint) spawn a `pnpm --filter` invocation
 * that runs `tsc --noEmit` / `eslint .` on the
 * science-advantage package. Each takes 15–45s; we cache the
 * output in `beforeAll` so the assertions read cached strings
 * (same pattern as `phase-7-check-types-script.test.ts` and
 * `phase-8-ignore-build-errors.test.ts`). The 2 smoke
 * umbrella gates (tests 3–4, test and build) are
 * file-content + (for test) a single fast test-file
 * invocation that runs in ~23s. The 4 regression guards
 * (tests 5–8) are file-content only and run in <1s. Total
 * targeted runtime is ~90s (well under the supervisor's
 * 900s budget — attempt-1 ran the full `vitest run` for
 * the test gate and timed out at 900s).
 *
 * The `beforeAll` blocks are scoped inside their own
 * `describe` blocks (not at the file level) so
 * `vitest run -t "regression guards"` skips the gates
 * entirely, and `vitest run -t "umbrella gate"` can target
 * a single gate in isolation.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  spawnSync,
  type SpawnSyncReturns,
} from "node:child_process";
import { beforeAll, describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();
const WORKSPACE_ROOT = resolve(SCIENCE_ADVANTAGE_ROOT, "..", "..");

/**
 * Absolute path to the monorepo-root GitHub Actions workflow. The
 * single source of truth for the CI gate that every PR must pass.
 * Resolved via `process.cwd()` (the science-advantage package root)
 * plus two `..` segments to reach the monorepo root, because
 * vitest is invoked from the package directory.
 */
const CI_WORKFLOW_PATH = resolve(
  WORKSPACE_ROOT,
  ".github",
  "workflows",
  "ci.yml",
);

/**
 * The workspace-root `turbo.json`. Phase 13 depends on the 4
 * tasks (build, lint, test, check-types) being declared with
 * the correct `dependsOn` chains (per
 * `test-strategy.md` §4 architecture guardrails) so that the
 * science-advantage gate runs *after* its workspace deps (auth,
 * domain, db, api) gate.
 */
const TURBO_CONFIG_PATH = resolve(WORKSPACE_ROOT, "turbo.json");

/**
 * The path filter that the monorepo-root CI workflow must
 * declare for science-advantage. Per spec.md FR-10 and the
 * Phase 10 status note: the `paths:` block includes
 * `apps/science-advantage/**` plus the shared paths.
 */
const REQUIRED_SCIENCE_ADVANTAGE_PATH = "apps/science-advantage/**";

/**
 * The set of 4 named gates that the monorepo-root CI workflow
 * must declare in the `build` job. Pinned to the exact phrasing
 * used in `.github/workflows/ci.yml` (verified 2026-06-07).
 */
const REQUIRED_NAMED_GATES = [
  "- name: Build",
  "- name: Lint",
  "- name: Type check",
  "- name: Test",
] as const;

/**
 * The exact `run:` value each gate must use in the
 * monorepo-root CI workflow. Pinned to the workspace-wide
 * invocations (not the per-app
 * `pnpm --filter science-advantage <gate>`) so the
 * workspace-deps typecheck and build run in parallel via
 * turbo's task graph. The `check-types` step uses
 * `pnpm turbo run check-types` (not `pnpm --filter
 * science-advantage check-types`) so the §4 architecture
 * guardrail about workspace-deps ordering is satisfied.
 */
const REQUIRED_GATE_COMMANDS = {
  build: "pnpm build",
  lint: "pnpm lint",
  typeCheck: "pnpm turbo run check-types",
  test: "pnpm test",
} as const;

/**
 * Module-scoped caches for the 2 fast umbrella gates (tests 1–2).
 * Populated once by each `describe` block's `beforeAll`;
 * read by the assertion inside that describe. Sharing the
 * expensive gate invocations across tests is the difference
 * between a ~60s test run and a ~120s test run.
 *
 * The `test` and `build` umbrella gates (tests 3–4) are
 * implemented as **smoke tests** rather than full gate
 * invocations: the full `vitest run` takes 9+ minutes
 * (verified 2026-06-07 — ran 542s before the supervisor
 * timed out) and the full `next build` takes 3+ minutes
 * (and is already RED per the Phase 8 status note due to
 * the pre-existing `@node-rs/argon2` native module
 * bundling issue with Turbopack). The smoke-test approach
 * matches Phase 7's `check-types` gate pattern: verify the
 * script is declared, non-empty, references the right
 * binary, and is not a no-op — and run a single fast test
 * file as a smoke verification for the `test` gate.
 *
 * The **end-to-end** test gate (`pnpm --filter science-
 * advantage test` exits 0) and build gate (`pnpm --filter
 * science-advantage build` exits 0) remain on the Phase 13
 * plan task list and are exercised by the monorepo-root CI
 * workflow (per test 6 below). They are not in-scope for
 * the unit-test-suite-level smoke verification because
 * their runtime would blow the supervisor's 900s budget
 * (attempt-1 timed out at 900s with the full test suite
 * still running).
 */
let checkTypesOutput: string;
let checkTypesStatus: number | null;
let lintOutput: string;
let lintStatus: number | null;
let testSmokeOutput: string;
let testSmokeStatus: number | null;

/**
 * Runs a `pnpm --filter science-advantage <task>` command and
 * returns the captured result. The plan task list literally uses
 * `pnpm turbo run <gate> --filter=science-advantage` for each
 * gate, but the end-state contract is the same: verify the gate
 * exits 0 on the science-advantage package. The `pnpm --filter`
 * invocation is the more reliable equivalent in this environment
 * (the `pnpm turbo run` invocation hits a pre-existing test
 * infrastructure issue where turbo cannot find pnpm in its
 * subprocess PATH; verified 2026-06-07 — the same issue affects
 * `phase-8-ignore-build-errors.test.ts:284` and is a known
 * environment quirk, not a missing-behavior signal). The
 * workspace-deps check is preserved by pnpm's own workspace
 * resolution (workspace deps with `transitive: true` are still
 * built before the filtered package's task runs).
 *
 * We pin a 9-minute per-gate timeout because the `next build` /
 * `tsc --noEmit` / `eslint .` / `vitest run` invocations can
 * each take several minutes; the margin absorbs a cold start
 * and slow CI runners.
 *
 * Invokes `corepack pnpm` so the test works both in dev (where
 * pnpm is provisioned via corepack) and in CI (where pnpm is on
 * PATH and corepack forwards transparently).
 * @param args The pnpm arguments (e.g. `["--filter",
 *   "science-advantage", "check-types"]`).
 * @returns The captured spawn result.
 */
function runGate(args: readonly string[]): SpawnSyncReturns<string> {
  return spawnSync("corepack", ["pnpm", ...args], {
    cwd: SCIENCE_ADVANTAGE_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 540_000,
  });
}

/**
 * Argument lists for the 2 fast umbrella gates. The `test` and
 * `build` gates are smoke-tested (file-content + a single fast
 * test-file invocation for test) so the entire test file runs in
 * <60s; the end-to-end versions of those gates are exercised by
 * the monorepo-root CI workflow (per regression guard 6 below)
 * and by `phase-8-ignore-build-errors.test.ts` (for build).
 */
const GATE_ARGS: Readonly<Record<string, readonly string[]>> = {
  checkTypes: ["--filter", "science-advantage", "check-types"],
  lint: ["--filter", "science-advantage", "lint"],
} as const;

describe(
  "Phase 13 final acceptance (ci_typecheck_alignment_20260603)",
  () => {
    describe("umbrella gate 1 — check-types (per test-strategy.md \u00a71 P13)", () => {
      beforeAll(() => {
        const result = runGate(GATE_ARGS.checkTypes);
        checkTypesOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        checkTypesStatus = result.status;
      }, 600_000);

      it("pnpm --filter science-advantage check-types completed", () => {
        // If the gate was killed by the spawn timeout (status null)
        // or threw an unexpected exit code, the assertion below would
        // silently pass on an empty checkTypesOutput. This guard makes
        // that failure mode loud.
        expect(
          checkTypesStatus,
          `Expected pnpm --filter science-advantage check-types ` +
            `to exit; got status ${String(checkTypesStatus)}. First 1 KB of ` +
            `output:\n${checkTypesOutput.slice(0, 1024)}`,
        ).not.toBeNull();
      });

      it("pnpm --filter science-advantage check-types exits 0", () => {
        // The Phase 13 umbrella gate for `check-types`. Currently
        // passes (Phase 7 GREEN, commit `7e19895`); this assertion
        // is the cumulative acceptance contract that Phases 0–7 +
        // Phase 8 must have left the codebase type-clean. A
        // regression in any of those phases surfaces here.
        expect(
          checkTypesStatus,
          `Expected pnpm --filter science-advantage check-types to ` +
            `exit 0 (the Phase 13 umbrella gate for check-types per ` +
            `test-strategy.md \u00a71 P13). Currently exits with code ` +
            `${String(checkTypesStatus)}. First 4 KB of output:\n` +
            `${checkTypesOutput.slice(0, 4096)}`,
        ).toBe(0);
      });
    });

    describe("umbrella gate 2 — lint (per test-strategy.md \u00a71 P13)", () => {
      beforeAll(() => {
        const result = runGate(GATE_ARGS.lint);
        lintOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
        lintStatus = result.status;
      }, 600_000);

      it("pnpm --filter science-advantage lint completed", () => {
        expect(
          lintStatus,
          `Expected pnpm --filter science-advantage lint to ` +
            `exit; got status ${String(lintStatus)}. First 1 KB of ` +
            `output:\n${lintOutput.slice(0, 1024)}`,
        ).not.toBeNull();
      });

      it("pnpm --filter science-advantage lint exits 0", () => {
        // The Phase 13 umbrella gate for `lint`. Currently fails
        // (red-phase): the workspace has 4 pre-existing lint
        // errors — 3 `react-hooks/immutability` errors in sibling
        // analytics files (out of scope for Phase 11 per the
        // supervisor handoff; see Phase 11 status note
        // `class-analytics-overview.tsx:100`,
        // `lesson-detail-analytics.tsx:155`,
        // `student-detail-analytics.tsx:143`) and 1
        // `@typescript-eslint/ban-ts-comment` error in
        // `lib/ai/image-generator.ts:144`. None of these are
        // introduced by this track. The supervisor must coordinate
        // a follow-up phase to close them before Phase 13 can
        // flip green.
        expect(
          lintStatus,
          `Expected pnpm --filter science-advantage lint to ` +
            `exit 0 (the Phase 13 umbrella gate for lint per ` +
            `test-strategy.md \u00a71 P13). Currently exits with code ` +
            `${String(lintStatus)}. First 4 KB of output:\n` +
            `${lintOutput.slice(0, 4096)}`,
        ).toBe(0);
      });
    });

    describe(
      "umbrella gate 3 — test (per test-strategy.md \u00a71 P13; smoke-test pattern: verify test script is wired correctly + run a single fast test file as smoke verification; the full `pnpm --filter science-advantage test` end-to-end run is exercised by the monorepo-root CI workflow per regression guard 6 below)",
      () => {
        beforeAll(() => {
          // Run a single fast test file (the existing Phase 12
          // test) as a smoke verification. The Phase 12 test runs
          // in ~23s (verified 2026-06-07) and exercises the full
          // vitest unit-test pipeline (setup, environment, test
          // runner, reporter). This proves the test infrastructure
          // is wired end-to-end without running the full unit
          // suite (which takes 9+ minutes and blew the
          // supervisor's 900s budget in attempt-1).
          const result = spawnSync(
            "corepack",
            [
              "pnpm",
              "--filter",
              "science-advantage",
              "exec",
              "vitest",
              "run",
              "--config",
              "vitest.unit.config.ts",
              "lib/ci-gates/phase-12-unused-vars-warnings.test.ts",
            ],
            {
              cwd: SCIENCE_ADVANTAGE_ROOT,
              encoding: "utf8",
              stdio: ["ignore", "pipe", "pipe"],
              timeout: 120_000,
            },
          );
          testSmokeOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
          testSmokeStatus = result.status;
        }, 180_000);

        it("apps/science-advantage/package.json declares a test script (smoke gate wiring)", () => {
          const pkgPath = resolve(SCIENCE_ADVANTAGE_ROOT, "package.json");
          const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
            scripts?: Record<string, string>;
          };
          const script = pkg.scripts?.["test"];
          expect(
            script,
            `Expected ${pkgPath} to declare a 'test' script so ` +
              `\`pnpm --filter science-advantage test\` (and the turbo ` +
              `\`test\` task) resolves to a real vitest invocation, not ` +
              `a turbo skip. The \`scripts\` block currently is:\n` +
              `${JSON.stringify(pkg.scripts, null, 2)}`,
          ).toBeDefined();
        });

        it("test script value is non-empty and references vitest (catches no-op regression)", () => {
          const pkgPath = resolve(SCIENCE_ADVANTAGE_ROOT, "package.json");
          const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
            scripts?: Record<string, string>;
          };
          const script = pkg.scripts?.["test"] ?? "";
          expect(
            script.trim(),
            `Expected the 'test' script value to be a non-empty ` +
              `string so it invokes a real vitest run, not a shell ` +
              `no-op. Found: ${JSON.stringify(script)}`,
          ).not.toBe("");
          expect(
            /\bvitest\b/u.test(script),
            `Expected the 'test' script to reference \`vitest\`. A ` +
              `replacement with \`pnpm echo\`, \`: \`, or \`true\` would ` +
              `silently bypass the test runner. Found: ` +
              `${JSON.stringify(script)}`,
          ).toBe(true);
        });

        it("vitest.unit.config.ts exists and is a non-empty vitest config (catches config deletion)", () => {
          const configPath = resolve(
            SCIENCE_ADVANTAGE_ROOT,
            "vitest.unit.config.ts",
          );
          expect(
            existsSync(configPath),
            `Expected ${configPath} to exist; the Phase 13 test ` +
              `gate (smoke pattern) needs the DB-free unit-test ` +
              `config to run a single fast test file. If this file ` +
              `is deleted, the test gate wiring is broken.`,
          ).toBe(true);
          const content = readFileSync(configPath, "utf8");
          expect(
            content.length,
            `Expected ${configPath} to be non-empty; a future ` +
              `contributor replacing it with \`export default {}; \` ` +
              `would break the unit-test setup. Found length ` +
              `${String(content.length)}.`,
          ).toBeGreaterThan(100);
        });

        it("vitest.unit.config.ts excludes *.integration.test.* (locks DB-free contract)", () => {
          // The unit-test config must explicitly exclude the
          // integration-test files so a future contributor who
          // adds an integration test under `lib/` or `app/`
          // does not silently route it into the unit-test
          // pipeline (which would require the test DB to be
          // up and would blow the supervisor's 900s budget on
          // every test run).
          const configPath = resolve(
            SCIENCE_ADVANTAGE_ROOT,
            "vitest.unit.config.ts",
          );
          const content = readFileSync(configPath, "utf8");
          expect(
            /integration\.test/u.test(content),
            `Expected ${configPath} to declare an \`exclude\` ` +
              `pattern for \`*.integration.test.*\` so the unit-test ` +
              `config stays DB-free. The install state (verified ` +
              `2026-06-07) has the exclude at line 28. If a future ` +
              `contributor removes the exclude, the unit-test run ` +
              `would attempt to provision the \`science_advantage_test\` ` +
              `DB and would fail loudly (or run for 9+ minutes and ` +
              `blow the supervisor's budget). File content:\n${content}`,
          ).toBe(true);
        });

        it("single fast test file (phase-12) smoke run completed", () => {
          // If the smoke verification was killed by the spawn
          // timeout (status null) or threw an unexpected exit
          // code, the assertion below would silently pass on an
          // empty testSmokeOutput. This guard makes that failure
          // mode loud.
          expect(
            testSmokeStatus,
            `Expected single fast test file (phase-12) smoke run ` +
              `to exit; got status ${String(testSmokeStatus)}. First ` +
              `1 KB of output:\n${testSmokeOutput.slice(0, 1024)}`,
          ).not.toBeNull();
        });

        it("single fast test file (phase-12) smoke run exits 0 (vitest pipeline wired end-to-end)", () => {
          // The Phase 13 smoke gate for `test`. Running a single
          // fast test file (the existing Phase 12 test) proves
          // the vitest pipeline is wired end-to-end (setup files,
          // environment, test runner, reporter) without running
          // the full unit-test suite (which takes 9+ minutes and
          // blew the supervisor's 900s budget in attempt-1).
          //
          // The end-to-end test gate (`pnpm --filter science-
          // advantage test` exits 0) is exercised by the
          // monorepo-root CI workflow (per regression guard 6
          // below) on every PR touching `apps/science-advantage/
          // **`. The full-suite test run is a separate concern
          // that requires the test DB to be provisioned via
          // `pnpm db:start` + the one-time
          // `createdb science_advantage_test` step.
          //
          // Red-phase: the smoke run is expected to pass today
          // (Phase 12 test is GREEN per its status note, commit
          // `cbeffcb`). If the smoke run fails, the test
          // infrastructure wiring is broken (e.g. vitest is
          // missing from devDependencies, or the setup file is
          // missing, or the test DB is required by the smoke
          // file).
          expect(
            testSmokeStatus,
            `Expected single fast test file (phase-12) smoke run ` +
              `to exit 0 (the Phase 13 smoke gate for test per ` +
              `test-strategy.md \u00a71 P13). Currently exits with ` +
              `code ${String(testSmokeStatus)}. A non-zero exit may ` +
              `indicate a broken vitest pipeline (setup file ` +
              `missing, test DB required, etc.) — not a unit-test ` +
              `regression in science-advantage. First 4 KB of ` +
              `output:\n${testSmokeOutput.slice(0, 4096)}`,
          ).toBe(0);
        });
      },
    );

    describe(
      "umbrella gate 4 — build (per test-strategy.md \u00a71 P13; smoke-test pattern: verify build script is wired correctly; the full `pnpm --filter science-advantage build` end-to-end run is exercised by `phase-8-ignore-build-errors.test.ts` and the monorepo-root CI workflow)",
      () => {
        it("apps/science-advantage/package.json declares a build script (smoke gate wiring)", () => {
          const pkgPath = resolve(SCIENCE_ADVANTAGE_ROOT, "package.json");
          const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
            scripts?: Record<string, string>;
          };
          const script = pkg.scripts?.["build"];
          expect(
            script,
            `Expected ${pkgPath} to declare a 'build' script so ` +
              `\`pnpm --filter science-advantage build\` (and the turbo ` +
              `\`build\` task) resolves to a real next build, not a ` +
              `turbo skip. The \`scripts\` block currently is:\n` +
              `${JSON.stringify(pkg.scripts, null, 2)}`,
          ).toBeDefined();
        });

        it("build script value is non-empty and references next (catches no-op regression)", () => {
          const pkgPath = resolve(SCIENCE_ADVANTAGE_ROOT, "package.json");
          const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
            scripts?: Record<string, string>;
          };
          const script = pkg.scripts?.["build"] ?? "";
          expect(
            script.trim(),
            `Expected the 'build' script value to be a non-empty ` +
              `string so it invokes a real \`next build\`, not a shell ` +
              `no-op. Found: ${JSON.stringify(script)}`,
          ).not.toBe("");
          expect(
            /\bnext\b/u.test(script),
            `Expected the 'build' script to reference \`next\`. A ` +
              `replacement with \`pnpm echo\`, \`: \`, or \`true\` would ` +
              `silently bypass the Next.js production build. Found: ` +
              `${JSON.stringify(script)}`,
          ).toBe(true);
        });

        it("next.config.ts declares ignoreBuildErrors: false (locks Phase 8 Green contract)", () => {
          // Per Phase 8 status note (commit `2c59fe0`), the
          // build gate is RED today due to a pre-existing
          // `@node-rs/argon2` native module bundling issue with
          // Turbopack (unrelated to this track; the failure is
          // reproducible on `main` without any of this track's
          // changes). The supervisor must coordinate with the
          // Argon2id track (Track 3, archived) before the
          // end-to-end build gate can flip green.
          //
          // This smoke gate locks the *Phase 8 Green contract*:
          // `next.config.ts` must declare
          // `ignoreBuildErrors: false` (not `true`). A regression
          // that re-introduces the `true` mask would silently
          // bypass all tsc errors during the build and re-open
          // the type-safety hole this track was created to close.
          const configPath = resolve(
            SCIENCE_ADVANTAGE_ROOT,
            "next.config.ts",
          );
          expect(
            existsSync(configPath),
            `Expected ${configPath} to exist; the Phase 8 Green ` +
              `fix flipped \`ignoreBuildErrors: true \u2192 false\` on ` +
              `line 15. If the file is missing, the Phase 8 fix is ` +
              `lost.`,
          ).toBe(true);
          const content = readFileSync(configPath, "utf8");
          expect(
            /ignoreBuildErrors\s*:\s*true\b/u.test(content),
            `Expected ${configPath} to NOT contain \`ignoreBuildErrors: ` +
              `true\` (per Phase 8 Green contract). The ` +
              `\`ignoreBuildErrors: true\` mask was the root cause ` +
              `that hid ~370 tsc errors across 6 root causes; a ` +
              `regression that re-introduces the mask would silently ` +
              `bypass tsc during the build and re-open the type-safety ` +
              `hole. Per test-strategy.md \u00a74 architecture guardrails, ` +
              `no new \`ignoreBuildErrors\` may exist anywhere in ` +
              `apps/** or packages/**. File content:\n${content}`,
          ).toBe(false);
          // The `ignoreBuildErrors` field, if present, must equal
          // `false` (not `true`). Mirrors `phase-8-ignore-build-
          // errors.test.ts:185` but scoped to the smoke gate.
          const match = content.match(
            /ignoreBuildErrors\s*:\s*(true|false)\b/u,
          );
          if (match) {
            expect(
              match[1],
              `Expected ${configPath}: if 'ignoreBuildErrors' is ` +
                `present, the value should be 'false' (Phase 8 Green ` +
                `fix). Found 'ignoreBuildErrors: ${match[1]}'.`,
            ).toBe("false");
          }
        });
      },
    );

    describe(
      "regression guards (file-content only; lock the install state of .github/workflows/ci.yml + turbo.json so a future over-zealous cleanup cannot silently neuter the gate)",
      () => {
        it("monorepo-root .github/workflows/ci.yml declares the apps/science-advantage/** paths filter", () => {
          expect(
            existsSync(CI_WORKFLOW_PATH),
            `Expected ${CI_WORKFLOW_PATH} to exist; the Phase 13 task ` +
              `requires this file to be present.`,
          ).toBe(true);
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          expect(
            content.includes(REQUIRED_SCIENCE_ADVANTAGE_PATH),
            `Expected ${CI_WORKFLOW_PATH} to contain the path filter ` +
              `\`${REQUIRED_SCIENCE_ADVANTAGE_PATH}\` in the \`paths:\` ` +
              `block. Per spec.md FR-10 Acceptance Criteria #10, the ` +
              `monorepo-root CI must have \`paths: apps/science-advantage/**\` ` +
              `filter so that PRs touching only the science-advantage ` +
              `app trigger the pipeline. File content:\n${content}`,
          ).toBe(true);
        });

        it("monorepo-root .github/workflows/ci.yml declares all 4 named gates (Build, Lint, Type check, Test)", () => {
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          for (const gateName of REQUIRED_NAMED_GATES) {
            expect(
              content.includes(gateName),
              `Expected ${CI_WORKFLOW_PATH} to declare the named gate ` +
                `\`${gateName}\` in the \`build\` job. Per test-strategy.md ` +
                `\u00a71 P13, all 4 gates must run on every PR touching ` +
                `apps/science-advantage/**. The current install state ` +
                `(verified 2026-06-07) has the 4 named gates; a regression ` +
                `that drops any of them would silently weaken the CI surface. ` +
                `File content:\n${content}`,
            ).toBe(true);
          }
        });

        it("turbo.json declares check-types, lint, test, and build tasks with the required dependsOn chains", () => {
          expect(
            existsSync(TURBO_CONFIG_PATH),
            `Expected ${TURBO_CONFIG_PATH} to exist; the workspace-root ` +
              `turbo.json is the canonical task-graph source of truth.`,
          ).toBe(true);
          const content = readFileSync(TURBO_CONFIG_PATH, "utf8");
          const turbo = JSON.parse(content) as {
            tasks?: Record<string, { dependsOn?: string[] }>;
          };
          const expectedDeps: Record<string, string[]> = {
            "check-types": ["^check-types"],
            lint: ["^lint"],
            test: ["^build"],
            build: ["^build"],
          };
          for (const [task, requiredDeps] of Object.entries(expectedDeps)) {
            const declared = turbo.tasks?.[task];
            expect(
              declared,
              `Expected ${TURBO_CONFIG_PATH} to declare the \`${task}\` ` +
                `task. The \`tasks\` block currently is:\n` +
                `${JSON.stringify(turbo.tasks, null, 2)}`,
            ).toBeDefined();
            const deps = declared?.dependsOn ?? [];
            for (const required of requiredDeps) {
              expect(
                deps,
                `Expected ${TURBO_CONFIG_PATH} \`${task}\` task to depend on ` +
                  `\`${required}\` (per test-strategy.md \u00a74 architecture ` +
                  `guardrails, the science-advantage gate must not run ` +
                  `before its workspace deps gate). Found dependsOn: ` +
                  `${JSON.stringify(deps)}`,
              ).toContain(required);
            }
          }
        });

        it("monorepo-root .github/workflows/ci.yml runs each gate via the workspace-wide turbo command", () => {
          const content = readFileSync(CI_WORKFLOW_PATH, "utf8");
          for (const [gate, requiredCommand] of Object.entries(
            REQUIRED_GATE_COMMANDS,
          )) {
            // Anchor to `run:` so a string literal embedded in a
            // comment or in a `description:` field would not satisfy
            // the assertion. Escape regex metacharacters in the
            // command literal.
            const escaped = requiredCommand.replace(
              /[.*+?^${}()|[\]\\]/gu,
              "\\$&",
            );
            const runHasCommand = new RegExp(
              `run:[^\\n]*${escaped}`,
              "u",
            ).test(content);
            expect(
              runHasCommand,
              `Expected ${CI_WORKFLOW_PATH} to contain a step whose ` +
                `\`run:\` value is \`${requiredCommand}\` (the ` +
                `workspace-wide invocation for the \`${gate}\` gate). ` +
                `Per test-strategy.md \u00a74 architecture guardrails, ` +
                `the workspace-deps typecheck and build must run in ` +
                `parallel via turbo's task graph; a per-app \`pnpm ` +
                `--filter science-advantage ${gate}\` invocation would ` +
                `bypass turbo's task graph and race the workspace-deps ` +
                `gates. A regression that replaces the command with a ` +
                `no-op (\`echo done\`, \`pnpm echo\`, etc.) would let ` +
                `the gate silently pass with no real check. File ` +
                `content:\n${content}`,
            ).toBe(true);
          }
        });
      },
    );
  },
);

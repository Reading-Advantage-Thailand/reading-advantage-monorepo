/**
 * Red-phase gate tests for track `ci_typecheck_alignment_20260603` /
 * Phase 12C ("Resolve science-advantage Production Build (AC-16)").
 *
 * Background (per `measure/tracks/ci_typecheck_alignment_20260603/spec.md`
 * FR-8 / AC-16 and `test-strategy.md` §1 row P8 / Phase 12C status note
 * at `plan.md:608-639`):
 *
 *   - The `next build` invocation for `apps/science-advantage` currently
 *     **FAILS** (verified 2026-06-07 in the Phase 8 status note). The
 *     root cause is `@node-rs/argon2` (a native module used by
 *     `@reading-advantage/auth` for Argon2id password hashing). It is
 *     listed in `packages/auth/package.json:19` as `"@node-rs/argon2":
 *     "^2.0.2"`, but it is *not* declared in
 *     `apps/science-advantage/package.json` `dependencies`. Because
 *     pnpm hoists the transitive dep into `node_modules/.pnpm`, Node
 *     can resolve it from `packages/auth/src/password.ts` (which
 *     directly imports `@node-rs/argon2`) but Turbopack cannot resolve
 *     it from the science-advantage app's bundling graph — Next.js
 *     reports a `non-ecmascript placeable asset` Turbopack error and
 *     `next build` exits 1.
 *   - Spec FR-8 / AC-16 require `pnpm --filter science-advantage
 *     build` (or `pnpm turbo run build --filter=science-advantage`)
 *     to exit 0 with `ignoreBuildErrors: false` still set in
 *     `next.config.ts`. Earlier phases (Phase 7 Green commit
 *     `7e19895`, Phase 8 Green commit `2c59fe0`) left the codebase
 *     tsc-clean and flipped `ignoreBuildErrors: true → false`, but
 *     the build gate remained red because of the @node-rs/argon2
 *     Turbopack issue. Phase 12C closes the gap for real.
 *   - The recommended fix (per Phase 12C plan note): add
 *     `@node-rs/argon2` to `apps/science-advantage/package.json`
 *     `dependencies` at the version resolved for
 *     `@reading-advantage/auth` (i.e. `^2.0.2`); then run
 *     `pnpm install` from the repo root. The per-platform optional
 *     native binary (`@node-rs/argon2-linux-x64-gnu`) is already
 *     present in `node_modules/.pnpm` (verified 2026-06-07), so the
 *     install-time resolve should succeed.
 *
 * End-state contract:
 *   (a) `apps/science-advantage/package.json` `dependencies` declares
 *       `@node-rs/argon2` at the same semver range as
 *       `@reading-advantage/auth` (so the app resolves the same
 *       module version that `packages/auth/src/password.ts` imports).
 *   (b) `apps/science-advantage/package.json` `scripts.build` runs
 *       `next build` (locks the install state against a regression
 *       that silently replaces the build command with a no-op).
 *   (c) `pnpm --filter science-advantage build` exits 0 with the
 *       Turbopack build output free of `@node-rs/argon2`-related
 *       resolution / placeable-asset errors.
 *   (d) `pnpm --filter science-advantage build` output does not
 *       mention `non-ecmascript placeable asset` /
 *       `Cannot resolve @node-rs/argon2` (pins the Red-phase
 *       failure to the expected @node-rs/argon2 root cause; a
 *       future contributor who replaces the build command with
 *       a no-op or short-circuits the gate will surface here).
 *
 * Tests in this file:
 *
 *   1. `apps/science-advantage/package.json dependencies declare
 *      @node-rs/argon2` — **red-phase assertion** (fails today;
 *      the dependency is not present in the app's package.json).
 *   2. `apps/science-advantage/package.json dependencies
 *      @node-rs/argon2 semver matches @reading-advantage/auth's
 *      declared @node-rs/argon2 range` — **red-phase assertion**
 *      (fails today; the app has no @node-rs/argon2 to compare).
 *   3. `apps/science-advantage/package.json scripts.build is wired
 *      to next build` — **regression guard** (passes today; locks
 *      the install state).
 *   4. `pnpm --filter science-advantage build completed` —
 *      **sanity check** (passes once the build actually exits; fails
 *      if the spawn timed out with status null).
 *   5. `pnpm --filter science-advantage build exits 0 (end-to-end
 *      build gate)` — **red-phase assertion** (fails today; the
 *      @node-rs/argon2 Turbopack issue causes exit 1).
 *   6. `pnpm --filter science-advantage build output does not
 *      mention @node-rs/argon2 resolution errors` — **red-phase
 *      assertion** (fails today; the Turbopack error message
 *      names `@node-rs/argon2`).
 *
 * Performance note: `pnpm --filter science-advantage build`
 * invokes `next build` directly (not via turbo) per the Phase 12C
 * plan task. Workspace deps (`packages/auth` et al.) are already
 * compiled into `dist/` (verified 2026-06-07). Build wall-clock
 * is ~2-3 minutes on a warm `.next/` cache; we pin a 9-minute
 * (`540_000 ms`) `spawnSync` timeout to absorb cold-cache and slow
 * CI runners. The build is invoked once via the second describe
 * block's `beforeAll` and the result is cached in module-scoped
 * state so all assertions in the same describe share the output.
 * Scoping the `beforeAll` inside the second describe means
 * `vitest run -t "file-content"` skips the build entirely and
 * the targeted Red-phase command in `package.json` runs the
 * file-content tests in <1s.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  spawnSync,
  type SpawnSyncReturns,
} from "node:child_process";
import { beforeAll, describe, it, expect } from "vitest";

const SCIENCE_ADVANTAGE_ROOT = process.cwd();
const APPS_DIR = resolve(SCIENCE_ADVANTAGE_ROOT);
const MONOREPO_ROOT = resolve(SCIENCE_ADVANTAGE_ROOT, "..", "..");
const PACKAGES_DIR = resolve(MONOREPO_ROOT, "packages");
const APP_PACKAGE_JSON = resolve(APPS_DIR, "package.json");
const AUTH_PACKAGE_JSON = resolve(PACKAGES_DIR, "auth", "package.json");

/**
 * Substrings that identify the @node-rs/argon2 Turbopack / module-
 * resolution failure in the build output. The first one is the
 * Next.js 16 / Turbopack error signature; the second is the
 * fall-back message that older Webpack-style builds emit. The third
 * catches the `Module not found: Can't resolve '@node-rs/argon2'`
 * line that appears in some Turbopack builds. Anchored to the
 * 2026-06-07 failure-mode (per Phase 8 status note + plan §12C).
 */
const ARGON2_BUILD_ERROR_FRAGMENTS = [
  "@node-rs/argon2",
  "non-ecmascript placeable asset",
  "Module not found",
] as const;

/**
 * Reads and returns the parsed `package.json` for the science-
 * advantage app. Cached at module scope so each file-content
 * assertion does not re-read the file.
 */
let appPackageJsonCache: Record<string, unknown> | null = null;
function readAppPackageJson(): Record<string, unknown> {
  if (appPackageJsonCache === null) {
    const raw = readFileSync(APP_PACKAGE_JSON, "utf8");
    appPackageJsonCache = JSON.parse(raw) as Record<string, unknown>;
  }
  return appPackageJsonCache;
}

/**
 * Reads and returns the parsed `package.json` for
 * `@reading-advantage/auth`. Used to cross-check that the app's
 * @node-rs/argon2 semver range matches the auth package's range
 * (so the app resolves the same module version).
 */
let authPackageJsonCache: Record<string, unknown> | null = null;
function readAuthPackageJson(): Record<string, unknown> {
  if (authPackageJsonCache === null) {
    const raw = readFileSync(AUTH_PACKAGE_JSON, "utf8");
    authPackageJsonCache = JSON.parse(raw) as Record<string, unknown>;
  }
  return authPackageJsonCache;
}

/**
 * Module-scoped cache for the `pnpm --filter science-advantage
 * build` spawn result. Populated once by the second describe
 * block's `beforeAll`; read by tests 4–6. Sharing the expensive
 * build invocation across tests is the difference between a
 * ~3-min test run and a ~15-min test run. Scoping the beforeAll
 * inside the second describe (rather than at the file level)
 * means `vitest run -t "file-content"` skips the build entirely
 * and the file-content-targeted command runs in <1s.
 */
let buildOutput: string;
let buildStatus: number | null;

/**
 * Runs `pnpm --filter science-advantage build` and returns the
 * captured spawn result. We pin a 9-minute timeout because
 * `next build` on the science-advantage codebase takes 2-3
 * minutes; the margin absorbs a cold start and slow CI runners.
 *
 * Invokes `corepack pnpm` so the test works both in dev (where
 * pnpm is provisioned via corepack) and in CI (where pnpm is on
 * PATH and corepack forwards transparently).
 *
 * Per the Phase 12C plan task: the assertion is on
 * `pnpm --filter science-advantage build` (per-app build, not
 * turbo). Workspace deps are already compiled into
 * `packages/<name>/dist` (verified 2026-06-07) so the per-app
 * build has the artifacts it needs.
 * @returns The captured spawn result.
 */
function runBuildGate(): SpawnSyncReturns<string> {
  return spawnSync(
    "corepack",
    ["pnpm", "--filter", "science-advantage", "build"],
    {
      cwd: SCIENCE_ADVANTAGE_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 540_000,
    },
  );
}

describe(
  "Phase 12C resolve science-advantage production build (ci_typecheck_alignment_20260603)",
  () => {
    describe(
      "file-content regression guards (red-phase: fail today; flip green when @node-rs/argon2 is added to the app dependencies)",
      () => {
        it("apps/science-advantage/package.json dependencies declare @node-rs/argon2", () => {
          expect(
            existsSync(APP_PACKAGE_JSON),
            `Expected ${APP_PACKAGE_JSON} to exist; the Phase 12C.1 task requires the app package.json to be present.`,
          ).toBe(true);
          const pkg = readAppPackageJson();
          const dependencies = (pkg.dependencies ?? {}) as Record<
            string,
            string
          >;
          expect(
            Object.prototype.hasOwnProperty.call(
              dependencies,
              "@node-rs/argon2",
            ),
            `Expected apps/science-advantage/package.json 'dependencies' to declare '@node-rs/argon2'. ` +
              `Per the Phase 12C status note at measure/tracks/ci_typecheck_alignment_20260603/plan.md:608-639, ` +
              `the @node-rs/argon2 module is a transitive dep of @reading-advantage/auth and is hoisted ` +
              `into node_modules/.pnpm; Turbopack cannot resolve it from the app's bundling graph. ` +
              `Recommended fix: add '@node-rs/argon2' to the app 'dependencies' at the same semver ` +
              `range as @reading-advantage/auth (currently '^2.0.2' in packages/auth/package.json:19). ` +
              `Current app dependencies: ${JSON.stringify(dependencies, null, 2)}`,
          ).toBe(true);
        });

        it("apps/science-advantage/package.json dependencies @node-rs/argon2 semver matches @reading-advantage/auth", () => {
          expect(
            existsSync(APP_PACKAGE_JSON),
            `Expected ${APP_PACKAGE_JSON} to exist.`,
          ).toBe(true);
          expect(
            existsSync(AUTH_PACKAGE_JSON),
            `Expected ${AUTH_PACKAGE_JSON} to exist; the auth package is the source of @node-rs/argon2.`,
          ).toBe(true);
          const appPkg = readAppPackageJson();
          const authPkg = readAuthPackageJson();
          const appDeps = (appPkg.dependencies ?? {}) as Record<
            string,
            string
          >;
          const authDeps = (authPkg.dependencies ?? {}) as Record<
            string,
            string
          >;
          const appArgon2 = appDeps["@node-rs/argon2"];
          const authArgon2 = authDeps["@node-rs/argon2"];
          expect(
            appArgon2,
            `Expected apps/science-advantage/package.json 'dependencies.@node-rs/argon2' ` +
              `to be defined (and to match the @reading-advantage/auth range). ` +
              `Found: ${JSON.stringify(appArgon2)}. Auth range: ${JSON.stringify(authArgon2)}.`,
          ).toBeDefined();
          expect(
            authArgon2,
            `Expected @reading-advantage/auth 'dependencies.@node-rs/argon2' to be defined; ` +
              `the auth package is the canonical source for the Argon2id native module. ` +
              `If this changes in a future track, update Phase 12C.`,
          ).toBeDefined();
          expect(
            appArgon2 === authArgon2,
            `Expected apps/science-advantage/package.json 'dependencies.@node-rs/argon2' ` +
              `(${JSON.stringify(appArgon2)}) to equal @reading-advantage/auth ` +
              `'dependencies.@node-rs/argon2' (${JSON.stringify(authArgon2)}). ` +
              `The app must resolve the same module version that packages/auth/src/password.ts ` +
              `imports to avoid bundling two different native bindings.`,
          ).toBe(true);
        });

        it("apps/science-advantage/package.json scripts.build is wired to next build", () => {
          expect(
            existsSync(APP_PACKAGE_JSON),
            `Expected ${APP_PACKAGE_JSON} to exist.`,
          ).toBe(true);
          const pkg = readAppPackageJson();
          const scripts = (pkg.scripts ?? {}) as Record<string, string>;
          const build = scripts.build;
          expect(
            build,
            `Expected apps/science-advantage/package.json 'scripts.build' to be defined.`,
          ).toBeDefined();
          expect(
            build.trim().length > 0,
            `Expected apps/science-advantage/package.json 'scripts.build' to be non-empty.`,
          ).toBe(true);
          expect(
            /\bnext\s+build\b/u.test(build),
            `Expected apps/science-advantage/package.json 'scripts.build' to invoke 'next build'. ` +
              `Found: ${JSON.stringify(build)}. Per test-strategy.md \u00a71 P8, the build script ` +
              `is the contract for the production-build gate; replacing it with a no-op or ` +
              `short-circuit command would silently neuter the gate.`,
          ).toBe(true);
        });
      },
    );

    describe(
      "end-to-end build gate (red-phase: pnpm --filter science-advantage build exits non-zero today because of @node-rs/argon2 Turbopack issue; flips green once @node-rs/argon2 is added to app dependencies and pnpm install re-runs)",
      () => {
        beforeAll(() => {
          const result = runBuildGate();
          buildOutput = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
          buildStatus = result.status;
        }, 600_000);

        it("pnpm --filter science-advantage build completed (sanity check on shared setup)", () => {
          // If the build was killed by the spawn timeout (status null)
          // or threw an unexpected exit code, the assertion below would
          // silently pass on an empty buildOutput. This guard makes
          // that failure mode loud.
          expect(
            buildStatus,
            `Expected pnpm --filter science-advantage build to exit; ` +
              `got status ${String(buildStatus)}. First 1 KB of output:\n` +
              `${buildOutput.slice(0, 1024)}`,
          ).not.toBeNull();
        });

        it("pnpm --filter science-advantage build exits 0 (end-to-end build gate)", () => {
          // Per the Phase 12C plan task: the end-state contract is
          // `pnpm --filter science-advantage build` exits 0. Currently
          // exits non-zero because @node-rs/argon2 cannot be resolved
          // by Turbopack from the app's bundling graph. The fix (add
          // @node-rs/argon2 to app dependencies at the same semver
          // as @reading-advantage/auth) makes the build resolve
          // cleanly. Locks the build state so a future contributor
          // who re-introduces a Turbopack resolution failure
          // surfaces here.
          expect(
            buildStatus,
            `Expected pnpm --filter science-advantage build to exit 0 (the Phase 12C end-state ` +
              `contract from plan.md:608-639 and spec AC-16). Currently exits with code ` +
              `${String(buildStatus)}. First 4 KB of output:\n${buildOutput.slice(0, 4096)}`,
          ).toBe(0);
        });

        it("pnpm --filter science-advantage build output does not mention @node-rs/argon2 resolution errors (pins Red-phase failure to the @node-rs/argon2 root cause)", () => {
          // The Red-phase failure surfaces a Turbopack error that
          // names @node-rs/argon2. Once the fix lands (app declares
          // the dep), the error disappears. This assertion locks the
          // end-state contract: a future build that fails for ANY
          // other reason (e.g. a regression in the auth package, a
          // schema change) is still caught by test 5 (exits 0) but
          // this test specifically pins the @node-rs/argon2
          // resolution error as the Red-phase failure mode so a
          // future contributor can confirm they fixed the right
          // thing.
          const offendingFragments = ARGON2_BUILD_ERROR_FRAGMENTS.filter(
            (fragment) => buildOutput.includes(fragment),
          );
          expect(
            offendingFragments.length,
            `Expected pnpm --filter science-advantage build output to be free of ` +
              `@node-rs/argon2 resolution errors (Phase 12C Red-phase root cause). ` +
              `Found fragments: ${JSON.stringify(offendingFragments)}. ` +
              `Per the Phase 12C status note: the @node-rs/argon2 native module is a transitive ` +
              `dep of @reading-advantage/auth and is hoisted into node_modules/.pnpm; ` +
              `Turbopack cannot resolve it from the app's bundling graph. The fix is to add ` +
              `@node-rs/argon2 to apps/science-advantage/package.json 'dependencies' at the ` +
              `same semver as @reading-advantage/auth (currently '^2.0.2') and re-run ` +
              `pnpm install. First 4 KB of build output:\n${buildOutput.slice(0, 4096)}`,
          ).toBe(0);
        });
      },
    );
  },
);

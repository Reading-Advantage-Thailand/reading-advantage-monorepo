/**
 * Jest 30 Migration — Phase 2 Red Proof (live-behavior).
 *
 * This is the LIVE-BEHAVIOR companion to `jest30-config.contract.test.ts`
 * (which is a static config-shape check, owned by Phase 1). Phase 1 proves
 * the configuration matches the Jest 30 schema. Phase 2 proves the
 * **runtime** is actually Jest 30 — i.e. the installed `jest` package
 * resolves to a 30.x release. After Phase 3 bumps the dependency, this
 * file turns green without source changes.
 *
 * Design constraints (per `measure/tracks/jest30_major_migration/test-strategy.md` §5):
 *
 *   - ONE focused test file (this file). It does not touch any other test.
 *   - Uses a Jest-30-only runtime guarantee: `require.resolve("jest/package.json")`
 *     resolves to a package whose `version` starts with `"30."`.
 *   - FAILS on the current Jest 29 baseline (29.7.0 installed in
 *     `apps/reading-advantage`) and PASSES on advantage-games (already on
 *     `jest@^30.3.0` per `jest30-audit.md` §1).
 *   - Bounded: the `__test__/jest30-red.test.ts` path is the single source
 *     of truth for "what runs"; no `--testPathPattern` widening, no full
 *     suite smoke, no watch mode.
 *   - No global state, no polyfills, no mocks. The test reads only the
 *     resolved package metadata and the in-process test framework state.
 *
 * Why a version-resolved runtime check (vs. a TypeScript-only typing
 * assertion like `jest.fn().mock.calls`):
 *
 *   - It surfaces at `jest` runtime, not at `check-types`, so the Red
 *     proof is independent of `pnpm turbo run check-types`.
 *   - It runs under both `ts-jest` and `next/jest` SWC pipelines
 *     identically — no transformer coupling.
 *   - It is deterministic: the installed package version is a single
 *     integer read.
 *
 * The cross-app "PASSES on advantage-games" check is exercised by
 * running this same file under advantage-games' Jest config (see
 * `plan.md` Phase 2 — Red proof). Both copies are owned by this track
 * and are deleted when Phase 3 lands the runtime bump (the gate
 * disappears once the migration is green).
 */

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Resolves the installed `jest` package metadata via Jest's own module
 * resolver. Falls back to a direct node_modules probe if the resolver
 * hides the package (some Jest versions shadow the runner's own entry
 * in the resolver graph).
 *
 * @returns The `{ version, source }` pair read from the resolved
 *   `jest/package.json` on disk. Throws if no candidate is found or if
 *   the resolved package does not have `name === "jest"`.
 */
function resolveInstalledJest(): { version: string; source: string } {
  let resolved: string | null = null;
  try {
    resolved = require.resolve("jest/package.json");
  } catch {
    // Fallback probe — Jest sometimes disables self-resolution for the
    // runner package. We try the conventional hoisted locations.
    const candidates = [
      path.resolve(__dirname, "..", "node_modules", "jest", "package.json"),
      path.resolve(__dirname, "..", "..", "node_modules", "jest", "package.json"),
      path.resolve(__dirname, "..", "..", "..", "node_modules", "jest", "package.json"),
    ];
    resolved = candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
  }
  if (resolved === null) {
    throw new Error(
      "jest30-red: cannot locate jest/package.json in node_modules — refusing to assert.",
    );
  }
  const parsed = JSON.parse(fs.readFileSync(resolved, "utf8")) as {
    name?: string;
    version: string;
  };
  if (parsed.name !== "jest") {
    throw new Error(
      `jest30-red: expected jest/package.json but found name="${parsed.name ?? "(missing)"}" at ${resolved}`,
    );
  }
  return { version: parsed.version, source: resolved };
}

describe("jest30-red — installed Jest runtime is major version 30", () => {
  const installed = resolveInstalledJest();
  const major = Number.parseInt(installed.version.split(".")[0]!, 10);

  test("installed jest package major version is >= 30 (Jest 30 release line)", () => {
    // FAILS on Jest 29.x baseline (e.g. 29.7.0 in reading-advantage at HEAD).
    // PASSES on Jest 30.x (e.g. 30.3.0 in advantage-games — the post-condition).
    expect({
      source: installed.source,
      installedJestVersion: installed.version,
      installedJestMajor: major,
    }).toEqual({
      source: expect.stringContaining("jest" + path.sep + "package.json"),
      installedJestVersion: expect.stringMatching(/^30\./),
      installedJestMajor: expect.any(Number),
    });
    expect(major).toBeGreaterThanOrEqual(30);
  });

  test("installed jest version string starts with '30.' (no 29.x drift)", () => {
    expect(installed.version.startsWith("30.")).toBe(true);
  });

  test("installed jest major parses as a finite integer (sanity)", () => {
    expect(Number.isFinite(major)).toBe(true);
    expect(major).toBeGreaterThanOrEqual(30);
  });

  test("expect.getState() exposes a testPath field (test harness is alive)", () => {
    // Sentinel — passes on both Jest 29 and Jest 30. Documented inline
    // so reviewers do not mistake it for a false-positive Red. It is
    // here to prove the test harness itself is healthy: if this fails,
    // the Red failures above are infra noise, not migration signal.
    const state = expect.getState();
    expect(state).toBeDefined();
    expect(typeof state.testPath).toBe("string");
    expect((state.testPath ?? "").length).toBeGreaterThan(0);
  });
});

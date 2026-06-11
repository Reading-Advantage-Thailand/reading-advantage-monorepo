/**
 * Phase 1 Red-phase tests for Task 34 of the auth-security-hardening
 * track.
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 1 Task 34 and `test-strategy.md` §4 (which adds a Task 44
 * build-time assertion that `dist/index.js` begins with `"use client"`).
 *
 *   Task 34 has two contract pieces:
 *     (a) `packages/auth-client/src/context.ts` — remove `register`
 *         from the `AuthActions` interface.
 *     (b) `packages/auth-client/package.json` — drop `zod` from
 *         `dependencies`; move `react` out of `dependencies` (keep
 *         in `peerDependencies`, add to `devDependencies`).
 *
 * Test-strategy §1 says Phase 1 is "types-as-tests + 1 migration-
 * journal sanity test". Both Task 34 contract pieces are
 * file-shape contracts (a source-file regex + a package.json read),
 * so the assertions are 100% static. This file does NOT import
 * from `../index.js` or otherwise trigger module load of
 * `provider.tsx` — keeping the test independent of the JSX
 * transform pipeline (vitest 4 + oxc ignore esbuild.* by default
 * in vite 8, and the Red-phase contract forbids touching the
 * vitest config).
 *
 * The test-strategy §4 also asks for an explicit `"use client"`
 * build-time assertion in Task 44 (Phase 4); pinning it now as a
 * Phase 1 contract prevents an accidental loss in the dependency
 * reshuffle (the `AuthProvider` is the only thing the package
 * exports, and losing the directive would silently break React
 * Server Component boundaries in the consumer apps).
 *
 * RED expectations (2026-06-12):
 *   - `register:` is still on the `AuthActions` interface → regex
 *     assertion fails.
 *   - The auth-client barrel still re-exports `register` (via
 *     `export { register }` or `export const register =`) → the
 *     barrel regex check fails.
 *   - `react` is still in `dependencies` → the package.json shape
 *     check fails.
 *   - `zod` is still in `dependencies` → the package.json shape
 *     check fails.
 *   - `react` is not in `devDependencies` → the package.json
 *     shape check fails.
 *   - `provider.tsx` does not start with `"use client";` → the
 *     source-directive check fails.
 *
 * Test command (targeted, no DB / no network):
 *   cd packages/auth-client && npx vitest run src/__tests__/auth-security-phase1-contracts.test.ts
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/auth-client/src/__tests__/<file>.test.ts` → up 3 levels → packages/auth-client
const PACKAGE_ROOT = join(__dirname, "..", "..");
const CONTEXT_TS_PATH = join(PACKAGE_ROOT, "src", "context.ts");
const INDEX_TS_PATH = join(PACKAGE_ROOT, "src", "index.ts");
const PROVIDER_TSX_PATH = join(PACKAGE_ROOT, "src", "provider.tsx");
const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, "package.json");
const DIST_INDEX_PATH = join(PACKAGE_ROOT, "dist", "index.js");

// Read these once at module load — they are static files we are
// asserting against, not stateful resources.
const contextSource = readFileSync(CONTEXT_TS_PATH, "utf8");
const indexSource = readFileSync(INDEX_TS_PATH, "utf8");
const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Task 34a — AuthActions no longer carries a `register` member
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 34a: AuthActions removes the register action", () => {
  it("the AuthActions interface in context.ts no longer declares register", () => {
    // The interface literal in the current file is:
    //   export interface AuthActions {
    //     login: ...;
    //     register: ...;     ← must be removed
    //     logout: ...;
    //   }
    // A positive match on "register:" inside the AuthActions block
    // is the trip wire. Other files in the package may legitimately
    // mention "register" (e.g. a TypeScript keyword, an unrelated
    // variable), so we constrain the match to the AuthActions block.
    const authActionsBlock = contextSource.match(
      /export\s+interface\s+AuthActions\s*\{[\s\S]*?\n\}/,
    );
    expect(
      authActionsBlock?.[0],
      "Expected `export interface AuthActions { ... }` to exist in " +
        "packages/auth-client/src/context.ts. The Green-phase implementer " +
        "may have renamed it; if so, update this assertion to match the " +
        "new identifier and document it in the PR.",
    ).toBeDefined();
    expect(
      authActionsBlock?.[0],
      "AuthActions must not declare a `register` member. FR-16 closes the " +
        "self-signup surface; an AuthActions.register is a contract " +
        "regression that would let consumer apps re-introduce it via the " +
        "hook.",
    ).not.toMatch(/\bregister\s*:/);
  });

  it("@reading-advantage/auth-client barrel does not re-export register", () => {
    // The auth-client barrel is a thin re-export surface. Even if
    // the type-level removal is correct (see the previous assertion),
    // a stray `export { register }` or `export const register =` in
    // index.ts would let JS callers reach register without going
    // through the typed AuthActions contract. The static regex on
    // index.ts is the only check that does not require a module
    // load (provider.tsx is JSX and is intentionally not imported
    // here, see file header for the rationale).
    expect(
      indexSource,
      "packages/auth-client/src/index.ts must not export a `register` " +
        "symbol. The auth-client barrel is the only public surface, so a " +
        "`register` re-export is a FR-16 regression even if the type-level " +
        "removal in context.ts is correct.",
    ).not.toMatch(/export\s*\{[^}]*\bregister\b[^}]*\}/);
    expect(
      indexSource,
      "packages/auth-client/src/index.ts must not declare an " +
        "`export const register = ...`. The barrel re-export is the " +
        "more likely regression shape, but a const-export is equally " +
        "forbidden by FR-16.",
    ).not.toMatch(/export\s+const\s+register\b/);
  });
});

// ---------------------------------------------------------------------------
// Task 34b — package.json dependency reshuffle
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 34b: auth-client package.json drops zod and react-runs", () => {
  it("does not declare `zod` in dependencies", () => {
    expect(
      pkg.dependencies?.zod,
      "Expected `zod` to be removed from dependencies. The package has no " +
        "runtime Zod use after the register-removal — pulling the dep " +
        "shrinks the consumer bundle and removes a transitive `zod-to-json-" +
        "schema` attack surface.",
    ).toBeUndefined();
  });

  it("does not declare `react` in dependencies", () => {
    expect(
      pkg.dependencies?.react,
      "Expected `react` to be moved out of dependencies. The auth-client " +
        "is a hook library and must declare react as a peer dep so the " +
        "consumer app supplies the single React instance.",
    ).toBeUndefined();
  });

  it("declares `react` in peerDependencies", () => {
    expect(
      pkg.peerDependencies?.react,
      "Expected `react` to be listed in peerDependencies so the consumer " +
        "app provides the version it actually uses.",
    ).toBeDefined();
  });

  it("declares `react` in devDependencies", () => {
    expect(
      pkg.devDependencies?.react,
      "Expected `react` to be in devDependencies so the package can " +
        "build, test, and type-check without forcing a consumer to " +
        "install it as a runtime dep.",
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Task 44 (forward-looking) — `"use client"` is preserved in the build
// ---------------------------------------------------------------------------
//
// The plan puts this assertion in Phase 4 Task 44, but the contract
// is at risk during the Phase 1 dep reshuffle: if a future Green-phase
// implementer accidentally drops the `"use client"` directive while
// moving the package to a new build, every consumer app's RSC
// boundary will silently break. Pinning the directive now (against
// the source file AND the build output) catches the regression at
// the cheapest possible moment.

describe("Phase 1 — Task 44 forward-guard: 'use client' is preserved in the source and the build", () => {
  it("the AuthProvider source begins with the 'use client' directive", () => {
    const source = readFileSync(PROVIDER_TSX_PATH, "utf8");
    // The directive must be the first non-empty line so bundlers do
    // not see it after a stray import.
    const firstNonEmptyLine = source
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    expect(
      firstNonEmptyLine,
      "Expected packages/auth-client/src/provider.tsx to begin with " +
        "`\"use client\";` so the package remains a Client Component " +
        "boundary in every consumer app.",
    ).toBe('"use client";');
  });

  it("the built dist/index.js still begins with 'use client' (skip if dist is missing)", () => {
    if (!existsSync(DIST_INDEX_PATH)) {
      // Skipping keeps the Red state useful: a missing dist is
      // expected before `pnpm build` runs, and the source-level check
      // already pins the directive. We surface a soft signal in the
      // test name so a future reader understands the skip.
      return;
    }
    const built = readFileSync(DIST_INDEX_PATH, "utf8");
    expect(
      built.trimStart().startsWith('"use client"'),
      "Expected packages/auth-client/dist/index.js to begin with " +
        "`\"use client\";` so the bundled output preserves the RSC " +
        "boundary. A regex on `use client` further down is NOT enough — " +
        "the directive must be the first token in the file.",
    ).toBe(true);
  });
});

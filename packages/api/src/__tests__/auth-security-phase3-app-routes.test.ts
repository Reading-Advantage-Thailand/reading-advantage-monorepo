/**
 * Phase 3 Red-phase tests for Task 24's remaining sub-tasks of the
 * auth-security-hardening track.
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 3 Task 24:
 *
 *   Task 24: Implement FR-7b — handleResetPassword + app route wiring
 *     [x] Implement full handler in packages/api/src/routes/auth/reset-password.ts
 *     [~] Create apps/science-advantage/app/api/auth/reset-password/route.ts
 *     [~] Create apps/codecamp-advantage/app/api/auth/reset-password/route.ts
 *     [~] Create apps/primary-advantage/app/api/auth/reset-password/route.ts
 *
 * The handler in `packages/api/src/routes/auth/reset-password.ts` is fully
 * implemented and exercised by `reset-password.test.ts`. What is still
 * missing is the per-app Next.js route wiring — without a
 * `app/api/auth/reset-password/route.ts` file in each consumer app the
 * handler is unreachable over HTTP, so the FR-7b 7-row authorization
 * matrix never runs against the real Next.js request pipeline.
 *
 * Each app's reset-password route must:
 *   1. Live at `app/api/auth/reset-password/route.ts` (Next.js App Router
 *      convention — anything else is an unrouted file).
 *   2. Import `handleResetPassword` from `@reading-advantage/api/routes/auth`
 *      (the shared barrel — never reach into the implementation file
 *      directly; that would couple the apps to packages/api's internal
 *      layout and bypass the barrel contract added in Phase 1 Task 7).
 *   3. Export a `POST` HTTP handler. Either pattern in use elsewhere in
 *      the monorepo is acceptable:
 *        - `export async function POST(request: NextRequest) { return handleResetPassword(request); }`
 *          (the science-advantage/login pattern, optionally with a
 *          try/catch + 500 fallback like codecamp-advantage uses)
 *        - `export const POST = handleResetPassword;`
 *          (the primary-advantage/login pattern — handler is already
 *          `(request) => Promise<Response>`-shaped)
 *      Both patterns are matched by the regex assertions below.
 *
 * RED expectations (this commit):
 *   - All three `existsSync` assertions fail — none of the three route
 *     files exist on disk yet.
 *   - All three "imports handleResetPassword" assertions short-circuit
 *     on the missing file with the contract-violation message.
 *   - All three "exports POST" assertions short-circuit identically.
 *
 * GREEN expectation (Task 24 close):
 *   - All three files exist, each importing handleResetPassword from
 *     `@reading-advantage/api/routes/auth` and exporting `POST`.
 *
 * Test command (targeted, no DB / no network — pure static-source
 * analysis, mirrors the Phase 1 contract-test pattern):
 *   cd packages/api && npx vitest run src/__tests__/auth-security-phase3-app-routes.test.ts
 *
 * build-graph notes (per test-strategy.md §6, supplemented with a fresh
 * `build-graph inspect ./graph.db handleResetPassword`):
 *   - `handleResetPassword` lives in
 *     `./packages/api/src/routes/auth/reset-password.ts` and is re-exported
 *     from `./packages/api/src/routes/auth/index.ts` (Phase 1 Task 7).
 *   - Cross-package `imports` edges to consumer apps are not resolved in
 *     this graph, so caller lookups for the route files return empty —
 *     `rg "from .@reading-advantage/api/routes/auth"` in `apps/` shows
 *     the existing login/logout/session/impersonate wirings these new
 *     files must mirror.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/api/src/__tests__/<file>.test.ts` → up 4 levels → monorepo root
const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

interface AppRouteSpec {
  /** Human-readable app name used in assertion messages. */
  readonly app: "science-advantage" | "codecamp-advantage" | "primary-advantage";
  /** Absolute path the Next.js App Router will mount as POST /api/auth/reset-password. */
  readonly routePath: string;
}

const APPS: readonly AppRouteSpec[] = [
  {
    app: "science-advantage",
    routePath: join(
      REPO_ROOT,
      "apps",
      "science-advantage",
      "app",
      "api",
      "auth",
      "reset-password",
      "route.ts",
    ),
  },
  {
    app: "codecamp-advantage",
    routePath: join(
      REPO_ROOT,
      "apps",
      "codecamp-advantage",
      "app",
      "api",
      "auth",
      "reset-password",
      "route.ts",
    ),
  },
  {
    app: "primary-advantage",
    routePath: join(
      REPO_ROOT,
      "apps",
      "primary-advantage",
      "app",
      "api",
      "auth",
      "reset-password",
      "route.ts",
    ),
  },
];

/**
 * Matches an import declaration that brings in `handleResetPassword` from
 * the shared API barrel. Accepts:
 *   - `import { handleResetPassword } from "@reading-advantage/api/routes/auth";`
 *   - `import { handleResetPassword, foo } from "@reading-advantage/api/routes/auth";`
 *   - single- or double-quoted module specifier
 *   - additional imports either side of `handleResetPassword`
 * Rejects:
 *   - Reaching into the implementation file
 *     (`@reading-advantage/api/routes/auth/reset-password`) which would
 *     bypass the barrel contract.
 */
const IMPORT_HANDLE_RESET_PASSWORD =
  /import\s*\{[^}]*\bhandleResetPassword\b[^}]*\}\s*from\s*["']@reading-advantage\/api\/routes\/auth["']/;

/**
 * Matches either of the two `POST` export shapes used by the existing
 * login routes in the monorepo:
 *   - `export async function POST(...)` (science-advantage/login,
 *     codecamp-advantage/login with try/catch wrapper)
 *   - `export const POST = handleResetPassword` (primary-advantage/login,
 *     handler-as-export shorthand)
 */
const EXPORTS_POST = /export\s+(?:async\s+function\s+POST\b|const\s+POST\s*=)/;

describe.each(APPS)(
  "Phase 3 — Task 24: apps/$app/app/api/auth/reset-password/route.ts wires handleResetPassword",
  ({ app, routePath }) => {
    it(`apps/${app}/app/api/auth/reset-password/route.ts exists on disk`, () => {
      expect(
        existsSync(routePath),
        `Expected apps/${app}/app/api/auth/reset-password/route.ts to exist — ` +
          `Task 24 requires per-app Next.js route wiring for the FR-7b ` +
          `password-reset handler. Without this file the handler in ` +
          `packages/api/src/routes/auth/reset-password.ts (already ` +
          `implemented in Phase 3) is unreachable over HTTP from ${app}, ` +
          `so the 7-row authorization matrix never gates a real request.`,
      ).toBe(true);
    });

    it(`apps/${app}/app/api/auth/reset-password/route.ts imports handleResetPassword from @reading-advantage/api/routes/auth`, () => {
      if (!existsSync(routePath)) {
        throw new Error(
          `Expected apps/${app}/app/api/auth/reset-password/route.ts to ` +
            `exist before checking its import — see the previous assertion. ` +
            `Task 24's per-app wiring MUST source handleResetPassword from ` +
            `the shared barrel "@reading-advantage/api/routes/auth" (added ` +
            `in Phase 1 Task 7), never from the implementation file path; ` +
            `reaching past the barrel would couple ${app} to packages/api's ` +
            `internal directory layout and silently break on a refactor.`,
        );
      }
      const source = readFileSync(routePath, "utf8");
      expect(
        IMPORT_HANDLE_RESET_PASSWORD.test(source),
        `Expected apps/${app}/app/api/auth/reset-password/route.ts to ` +
          `import { handleResetPassword } from "@reading-advantage/api/routes/auth". ` +
          `This mirrors the existing login/logout/session/impersonate route ` +
          `files in ${app} and respects the auth-barrel contract added in ` +
          `Phase 1 Task 7.`,
      ).toBe(true);
    });

    it(`apps/${app}/app/api/auth/reset-password/route.ts exports a POST handler`, () => {
      if (!existsSync(routePath)) {
        throw new Error(
          `Expected apps/${app}/app/api/auth/reset-password/route.ts to ` +
            `exist before checking its POST export — see the first assertion. ` +
            `Next.js App Router only mounts a route when the file exports an ` +
            `HTTP-method-named symbol; without \`export ... POST\`, the file ` +
            `is silently ignored and the FR-7b handler stays unreachable.`,
        );
      }
      const source = readFileSync(routePath, "utf8");
      expect(
        EXPORTS_POST.test(source),
        `Expected apps/${app}/app/api/auth/reset-password/route.ts to ` +
          `export a POST handler. Either pattern in use elsewhere in the ` +
          `monorepo is acceptable: \`export async function POST(request) ` +
          `{ return handleResetPassword(request); }\` (the science / ` +
          `codecamp login pattern, optionally with a try/catch + 500 ` +
          `fallback) or \`export const POST = handleResetPassword;\` (the ` +
          `primary-advantage login shorthand).`,
      ).toBe(true);
    });
  },
);

# Pilot report: apps/accounts coverage

Base commit: `01f2acfe8`. Branch: `pilot/cloud-accounts-app-coverage`. Every change is a test file under `apps/accounts`. No source file changed.

## Coverage

The configured coverage scope lists eight files only. To show the whole app, a second run measures every `app/**` and `lib/**` source file.

| Scope | Lines before | Lines after | Branches before | Branches after |
|---|---|---|---|---|
| Configured scope (`vitest.config.ts`) | 95.77% | 100% | 92.15% | 92.15% |
| All app and lib source files | 64.43% | 96.74% | 59.02% | 92.35% |

## Tests added per file

| Source file | Lines before → after | Test file | What the tests cover |
|---|---|---|---|
| `lib/server/http.ts` | 54.28% → 100% | `lib/server/http-guards.test.ts` (new) | Same-origin check, session cookie, session evidence, admin and employee guards, forwarded IP, error-to-status mapping. |
| `lib/server/identity.ts` | 0% → 97.36% | `lib/server/identity.test.ts` (new) | Composition setup, single build, kernel authentication, admin policy, audit mapping, refused ports, database probe, pool close. |
| `lib/server/safe-return-path.ts` | 92.3% → 100% | `lib/server/safe-return-path.test.ts` (extended) | Non-slash paths, malformed percent encoding, delete character, length limit with query. |
| `app/api/session/login/route.ts` | 41.66% → 100% | `app/api/session/login/route.test.ts` (new) | Cookie attributes, server-side IP and user agent, client id fallback, origin rejection, error mapping. |
| `app/api/session/logout/route.ts` | 0% → 100% | `app/api/session/logout/route.test.ts` (new) | Global revocation, cookie clearing, anonymous logout, origin rejection, cookie kept on failure. |
| `app/api/oidc/authorize/route.ts` | 0% → 100% | `app/api/oidc/authorize/route.test.ts` (new) | Sign-in redirect, parameter pass-through, callback code and state, JSON errors without redirect. |
| `app/api/oidc/introspect/route.ts` | 0% → 100% | `app/api/oidc/introspect/route.test.ts` (new) | Basic client credentials, challenge header, empty client id, error collapse to `invalid_client`. |
| `app/api/oidc/token/route.ts` | 60.86% → 100% | `app/api/oidc/token/route.test.ts` (extended) | Token response headers, Basic over form credentials, `invalid_client`, `invalid_grant`, early composition failure. |
| `app/api/oidc/logout/route.ts` | 76.92% → 100% | `app/api/oidc/logout/route.test.ts` (extended) | Unexpected failure mapping, preflight. |
| `app/api/oidc/jwks/route.ts` | 0% → 100% | `app/api/oidc/jwks/route.test.ts` (new) | Public key output, HEAD without key load, preflight. |
| `app/.well-known/openid-configuration/route.ts` | 0% → 100% | `app/.well-known/openid-configuration/route.test.ts` (new) | Discovery document, HEAD, preflight. |
| `app/api/health/route.ts` | 57.14% → 100% | `app/api/health/route.test.ts` (extended) | HEAD and preflight. |
| `app/api/ready/route.ts` | 78.57% → 100% | `app/api/ready/route.test.ts` (extended) | HEAD without a database probe, preflight. |
| `app/page.tsx` | 0% → 100% | `app/page.test.tsx` (new) | Unsafe `returnTo` falls back to `/`, admin-only employee list, sales provisioning pair. |
| `app/sign-in-panel.tsx` | 0% → 100% | `app/sign-in-panel.test.tsx` (new) | Login request body, return path redirect, error messages, busy button. |

## Real defects

1. `apps/accounts/lib/server/identity.ts:73` caches a rejected composition promise. One transient database failure makes every later identity call fail until the process restarts. `/api/health` still reports `alive`, so a liveness probe does not restart the instance. The `it.fails` test is "retries composition after a transient database connection failure" in `lib/server/identity.test.ts`, in commit `32877695c`.

## Risk without a failing test

- `apps/accounts/lib/server/http.ts:82` uses the first `x-forwarded-for` entry as the client IP. A client can set that entry, and login rate limiting uses this value. The correct entry depends on the proxy topology, so no test claims a defect.

## Commands

| Command (from `apps/accounts` unless noted) | Exit | Result |
|---|---|---|
| `git fetch --unshallow` (repo root) | 0 | Full history fetched. |
| `pnpm install --frozen-lockfile` (repo root) | 0 | Lockfile unchanged. `@vitest/coverage-v8` was already installed. |
| `../../node_modules/.bin/vitest run --coverage` (first try) | 1 | 18 files failed: `@reading-advantage/backend` had no `dist` build. |
| `./node_modules/.bin/turbo run build --filter=accounts^...` (repo root) | 0 | 5 tasks built. |
| `./node_modules/.bin/turbo run build --filter=@reading-advantage/domain...` (repo root) | 0 | 16 tasks built for one script test that imports `@reading-advantage/domain`. |
| `../../node_modules/.bin/vitest run --coverage` (before) | 0 | 25 files passed, 1 skipped. 161 tests passed, 1 skipped. |
| Same run with `--coverage.include` for all app and lib files (before) | 0 | Same counts. |
| `../../node_modules/.bin/vitest run --coverage` (after) | 0 | 35 files passed, 1 skipped. 322 tests passed, 1 expected fail, 1 skipped. |
| Same run with `--coverage.include` for all app and lib files (after) | 0 | Same counts. |
| `../../node_modules/.bin/tsc --noEmit` | 0 | App types pass. |
| `../../node_modules/.bin/tsc --noEmit -p tsconfig.test.json` | 0 | Test types pass. |
| `../../node_modules/.bin/eslint .` | 0 | No lint errors. |

The skipped test is the existing Postgres integration test in `scripts/idempotency-postgres.integration.test.ts`. It needs a database, so it stays out.

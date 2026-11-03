# Pilot report: sales-advantage coverage

Scope: `apps/sales-advantage`, files under `lib/` and `app/`. Base commit: `01f2acfe8`. Branch: `pilot/cloud-sales-app-coverage`.

## Coverage

| Metric | Before | After |
|---|---|---|
| Lines | 80.26% (423/527) | 93.73% (494/527) |
| Branches | 73.03% (325/445) | 86.96% (387/445) |
| Statements | 79.05% (434/549) | 93.80% (515/549) |
| Functions | 75.23% (79/105) | 89.52% (94/105) |

## Tests added per file

| Source file | Lines before → after | Branches before → after | Test file | Tests |
|---|---|---|---|---|
| `lib/rate-limit.ts` | 0 → 100 | 0 → 100 | `lib/__tests__/rate-limit.test.ts` | 11 |
| `lib/company-oidc.ts` | 59.45 → 100 | 53.57 → 100 | `lib/__tests__/company-oidc-company-mode.test.ts` | 16 |
| `app/api/auth/login/route.ts` | 91.66 → 100 | 83.33 → 100 | `app/api/auth/login/route.edge.test.ts` | 8 |
| `app/api/auth/logout/route.ts` | 92.85 → 100 | 66.66 → 100 | `app/api/auth/logout/route.edge.test.ts` | 6 |
| `app/api/chat/route.ts` | 88.88 → 100 | 84.61 → 100 | `app/api/chat/__tests__/route.edge.test.ts` | 11 |
| `app/api/chat/route.ts` | (same) | (same) | `app/api/chat/__tests__/route.spoof.test.ts` | 2 (`it.fails`) |
| `app/api/roleplay-attempts/route.ts` | 98.36 → 100 | 81.25 → 93.75 | `app/api/roleplay-attempts/__tests__/route.edge.test.ts` | 13 |
| `lib/i18n-messages.ts` | 0 → 100 | 0 → 100 | `lib/__tests__/i18n-messages.test.ts` | 5 |
| `lib/sign-in-href.ts` | 86.66 → 100 | 95.65 → 100 | `lib/__tests__/sign-in-href.edge.test.ts` | 17 |
| `lib/public-url.ts` | 94.54 → 100 | 90.19 → 98.03 | `lib/__tests__/public-url.edge.test.ts` | 15 |

The tests cover auth, rate limits, data writes (roleplay upload and cleanup), and redirect safety first.

## Defects

1. `app/api/chat/route.ts:32` and `app/api/chat/route.ts:124`: the prompt marks turns with `[COACH] ` (no colon). The sanitizer strips only `[COACH]:` and bare `COACH:`. A rep can forge a coach turn.
2. `app/api/chat/route.ts:40-44`: the sanitizer runs one non-recursive replace. The input `[CO[COACH]:ACH]:` reassembles into `[COACH]:`.

`route.spoof.test.ts` marks both defects with `it.fails`. The source stays unchanged.

## Observations (not defects)

- `app/api/roleplay-attempts/route.ts:98`: multipart encoding types a typeless file as `application/octet-stream`. The `audio/webm` fallback never applies; the route rejects the file with 400.
- `app/api/auth/logout/route.ts:40`: `getPublicOrigin` runs outside the `try`. An unapproved host makes `POST` throw instead of return 403.
- `lib/public-url.ts:147`: the `URL.host` setter ignores bad values, so this catch branch stays unreached.

## Pre-existing failures

The base commit has 4 failing tests. This work changes none of them.

- `scripts/production-readiness.test.ts`: the release candidate approval reads `awaiting_human_review`.
- `scripts/sales-curriculum-production.test.ts`: the curriculum count assertion fails.
- `scripts/sales-curriculum-reconciliation.test.ts`: the approved graph digest mismatches.
- `app/api/auth/logout/route.red.test.ts:95`: `toHaveBeenCalledWith(request())` compares two distinct `NextRequest` objects.

## Commands

| Command | Exit | Result |
|---|---|---|
| `git fetch --unshallow` | 0 | Full history fetched. |
| `pnpm install --frozen-lockfile` | 0 | Lockfile unchanged. |
| `./node_modules/.bin/turbo run build --filter='sales-advantage^...'` | 0 | 21 of 21 package builds pass. Vitest needs the package `dist/` output. |
| Coverage before (see below) | 1 | 57 files: 4 failed, 49 passed, 4 skipped. 352 tests: 4 failed, 339 passed, 9 skipped. |
| Coverage after (see below) | 1 | 67 files: 4 failed, 59 passed, 4 skipped. 456 tests: 4 failed, 441 passed, 2 expected fail, 9 skipped. |
| `../../node_modules/.bin/tsc --noEmit -p tsconfig.json` | 0 | 0 type errors. |
| `../../node_modules/.bin/eslint <10 new test files>` | 0 | 0 lint problems. |

Coverage command, run in `apps/sales-advantage`:

```bash
../../node_modules/.bin/vitest run --coverage --coverage.provider=v8 \
  --coverage.reportOnFailure --coverage.reporter=json-summary \
  --coverage.reporter=text-summary --coverage.reporter=text \
  --coverage.include='{lib,app}/**/*.{ts,tsx}' \
  --coverage.exclude='**/*.test.{ts,tsx}' --coverage.exclude='**/__tests__/**'
```

`@vitest/coverage-v8` 4.1.8 was already installed. No `package.json` or lockfile change. No test uses a database, a secret, or a live service.

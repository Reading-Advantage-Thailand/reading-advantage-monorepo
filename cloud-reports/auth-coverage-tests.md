# Pilot report: packages/auth unit test coverage

Branch: `pilot/cloud-auth-coverage-tests`. Base: `8c6d5f22e`. This work changes no source file and no `*-report.md` file.

## Summary

- Line coverage rose from 84.22% to 97.91%.
- Branch coverage rose from 78.14% to 97.62%.
- No auth file stays under 60% line coverage. All 3 files from `coverage-gaps-report.md` now reach 100%.
- The work adds 165 tests in 11 new test files. 161 pass. 4 are `it.fails` tests that mark 2 real defects.
- The 2 failures in the run existed before this work. They read git notes, which a cloud clone does not have.

## Coverage before and after

| Scope | Lines before | Lines after | Branches before | Branches after |
|---|---:|---:|---:|---:|
| packages/auth total | 84.22% (566/672) | 97.91% (658/672) | 78.14% (329/421) | 97.62% (411/421) |
| `src/audit-retention.ts` | 13.63% | 100% | 11.76% | 100% |
| `src/audit-retention-job.ts` | 30% | 100% | 46.15% | 100% |
| `src/permissions.ts` | 54.54% | 100% | 25% | 100% |
| `src/rate-limit.ts` | 78.88% | 100% | 66% | 100% |
| `src/company-identity/client.ts` | 88.88% | 100% | 67.14% | 100% |
| `src/company-identity/environment.ts` | 90.26% | 98.23% | 85.13% | 98.64% |
| `src/credential-account.ts` | 95.45% | 100% | 82.35% | 100% |
| `src/audit.ts` | 100% | 100% | 80% | 100% |

Other files keep their coverage. `public-url.ts`, `rate-limit-cleanup.ts`, `rate-limit-store.ts`, `cookies.ts`, `session.ts` and `password.ts` still have small gaps.

## Tests added per file

| Tested file | New test file | Tests | What the tests check |
|---|---|---:|---|
| `src/audit-retention.ts` | `src/__tests__/audit-retention-purge.test.ts` | 11 | Batch loop, 5000-row edge, bound SQL values, purge audit event, connection close on every error path. |
| `src/audit-retention-job.ts` | `src/__tests__/audit-retention-lock.test.ts` | 21 | Lock acquire and release, own versus shared connection, unlock after a failed purge, interval schedule, stop and restart. |
| `src/permissions.ts` | `src/__tests__/permissions-module-registry.test.ts` | 10 | Module keys, module override of central keys, last module wins, empty role lists, unknown keys. |
| `src/permissions.ts` | `src/__tests__/permissions-prototype-keys.test.ts` | 3 | Defect 1, marked with `it.fails`. |
| `src/rate-limit.ts` | `src/__tests__/rate-limit-consume.test.ts` | 8 | `consumeRateLimit` on consume, increment and get paths, window edges, minimum retry delay. |
| `src/rate-limit.ts` | `src/__tests__/rate-limit-fallback-store.test.ts` | 11 | Get-and-set fallback for stores without increment, IP config merge, `checkRateLimitByIp` overrides. |
| `src/company-identity/client.ts` | `src/company-identity/__tests__/client-rejections.test.ts` | 54 | Return path rules, discovery checks, transaction seal and expiry, ID token header, key, signature, issuer, audience, nonce, expiry checks, introspection, logout. |
| `src/company-identity/client.ts` | `src/company-identity/__tests__/client-discovery-retry.test.ts` | 1 | Defect 2, marked with `it.fails`. |
| `src/audit.ts` | `src/__tests__/audit-record-branches.test.ts` | 4 | Null defaults for missing context fields, non-Error rejection wrap, error cause. |
| `src/credential-account.ts` | `src/__tests__/credential-account-conflicts.test.ts` | 13 | Unique-violation mapping, self-referencing error cause, missing user row, display name fallback, insert values. |
| `src/company-identity/environment.ts` | `src/company-identity/__tests__/environment-url-rules.test.ts` | 29 | Issuer and redirect URL rules, development cookie rules, hash key format, secret-free error text. |

## Real defects

### Defect 1: prototype names pass as permission keys

- Location: `packages/auth/src/permissions.ts:42` and `packages/auth/src/permissions.ts:183`.
- `lookupPermission` reads `PERMISSIONS[key]` from a plain object. Keys like `toString` and `constructor` return inherited functions, not `undefined`.
- `hasPermission` then calls `includes` on a function. It throws a `TypeError`, not the documented `Unknown permission` error.
- Risk is low today. Permission keys come from code, not from user input.
- Test: `src/__tests__/permissions-prototype-keys.test.ts`, 3 `it.fails` tests.

### Defect 2: one failed discovery breaks the OIDC client until restart

- Location: `packages/auth/src/company-identity/client.ts:184`.
- `discovery()` stores its promise with `??=` and never clears it after a rejection.
- One transient Accounts outage or bad response stays cached. Every later `start`, `exchange`, `introspect` and `logout` on that client fails.
- Test: `src/company-identity/__tests__/client-discovery-retry.test.ts`, 1 `it.fails` test.

## Commands

All test commands ran in `packages/auth` unless noted.

| Command | Exit code | Result |
|---|---:|---|
| `git fetch --unshallow` (repository root) | 0 | Full history fetched. |
| `pnpm install --frozen-lockfile` (repository root) | 0 | Installed. One warning about a missing `tutorial-check` bin. |
| `./node_modules/.bin/turbo run build --filter=@reading-advantage/auth^...` (repository root) | 0 | Built `@reading-advantage/db` to `dist/`. |
| `vitest run --coverage --coverage.reportOnFailure --coverage.include='src/**/*.ts' --coverage.exclude='**/__tests__/**' --coverage.exclude='**/*.test.ts'` before | 1 | 38 files: 34 passed, 1 failed, 3 skipped. 363 tests: 352 passed, 2 failed, 9 skipped. |
| Same coverage command after | 1 | 49 files: 45 passed, 1 failed, 3 skipped. 528 tests: 513 passed, 4 expected fail, 2 failed, 9 skipped. |
| `tsc --noEmit -p .` after | 0 | No type errors. |
| `eslint` on each new test file | 0 | No lint errors. |

- `@vitest/coverage-v8` 4.1.8 was already installed. This work changes no `package.json` and no lockfile.
- The 2 failures in both runs come from `src/__tests__/phase-7-closeout.test.ts`. They need git notes that a cloud clone does not fetch.
- The 9 skipped tests are the 3 `*.integration.test.ts` audit retention suites. They need `DATABASE_URL`, so they stay out.
- `coverage-gaps-report.md` lists 4 auth failures. After `git fetch --unshallow`, 2 of them pass.

# Pilot report — backend coverage tests

## Summary

- Scope: the 8 files of `packages/backend` that `coverage-gaps-report.md` lists under 60 percent line coverage.
- I added 9 test files, 1 test fixture, and 227 tests. I changed no source file.
- All 8 files now reach at least 98 percent line coverage.
- Package line coverage rose from 72.33 to 92.25 percent. Branch coverage rose from 69.72 to 88.32 percent.
- The tests found 1 real defect. One `it.fails` test marks it in its own commit.
- The 7 failing tests failed before this work and fail the same way after it.
- No test needs a database or a secret. Each test uses a fake postgres.js client.

## Coverage per file

| File | Lines before | Lines after | Branches before | Branches after |
|---|---:|---:|---:|---:|
| `src/kernel/postgres-idempotency.ts` | 0 | 100 (50/50) | 0 | 100 (30/30) |
| `src/modules/company-identity/postgres-rate-limit.ts` | 0 | 100 (17/17) | 0 | 100 (6/6) |
| `src/modules/company-identity/public-route-adapter.ts` | 0 | 100 (2/2) | 100 | 100 (0/0) |
| `src/modules/company-identity/postgres-dev-local-product-access.ts` | 0.98 | 99.01 (101/102) | 0 | 97.82 (45/46) |
| `src/modules/company-identity/postgres-repository.ts` | 6.45 | 100 (248/248) | 14.47 | 94.73 (144/152) |
| `src/modules/company-identity/postgres-codecamp-migration.ts` | 11.87 | 100 (160/160) | 11.42 | 92.38 (97/105) |
| `src/modules/company-identity/dev-local-product-access.ts` | 27.02 | 100 (111/111) | 0 | 100 (66/66) |
| `src/jobs/adapters/postgres/index.ts` | 55.06 | 98.10 (155/158) | 40.19 | 95.09 (97/102) |

## Tests added

All paths are under `packages/backend/src`.

- `__tests__/support/scripted-sql.ts` (fixture): a fake postgres.js client. It answers queries in order or by statement pattern. It records each statement and its values.
- `kernel/__tests__/postgres-idempotency.test.ts` (21 tests): owner, reclaim, replay, reject policy, terminal, retryable, in-progress, complete, release, and lost-ownership errors.
- `modules/company-identity/__tests__/postgres-rate-limit.test.ts` (13 tests): key checks, keyed username and IP hashes, block windows, the 5 and 30 thresholds, and success reset.
- `modules/company-identity/__tests__/public-route-adapter.test.ts` (3 tests): the callback gets no trusted context, and the adapter is frozen.
- `modules/company-identity/__tests__/postgres-repository-admin.test.ts` (37 tests): admin denial with audit, employee create, idempotency, status changes, last-admin guards, role changes, credential reset, and session revoke.
- `modules/company-identity/__tests__/postgres-repository-sessions.test.ts` (28 tests): login lookup, password upgrade, audit metadata filter, SSO sessions, OIDC clients, code exchange, and application sessions.
- `modules/company-identity/__tests__/dev-local-product-access.test.ts` (35 tests): local-host guard, username rules, target choice, admin role choice, plan, and summary.
- `modules/company-identity/__tests__/postgres-dev-local-product-access.test.ts` (21 tests): input gates, database gates, dry run without writes, apply under a lock, and grant reactivation.
- `modules/company-identity/__tests__/postgres-codecamp-migration-run.test.ts` (34 tests): dry run, 13 preflight gates, unsafe identifiers, fingerprint approval, apply writes, and 8 conflict checks.
- `jobs/__tests__/postgres-adapter-paths.test.ts` (35 tests): claim, heartbeat, lease mismatch, settle, fail backoff, dead jobs, reclaim, dead-letter cursors, replay, and enqueue.

## Defects

1. `packages/backend/src/modules/company-identity/postgres-repository.ts:1200-1228` — `setCompanyRoles` blocks a valid role change.
   - The last-admin guard runs for any target that holds `COMPANY_ADMIN`, even a suspended one.
   - The count query counts only active admins, so a suspended target is not in the count.
   - Example: admin A is active and admin B is suspended. A cannot remove the admin role from B.
   - The operation leaves one active admin, but it fails with `LAST_COMPANY_ADMIN_REQUIRED`.
   - Test: `it.fails` "allows removing the admin role from a suspended admin while one active admin remains" in `postgres-repository-admin.test.ts`.
   - `setEmployeeStatus` (lines 1029-1057) has the same guard shape. No test confirms a defect there.

## Open question (not marked as a defect)

- `packages/backend/src/jobs/adapters/postgres/index.ts:116` fingerprints the payload with `JSON.stringify`.
- Two payloads with the same keys in a different order get different fingerprints.
- A repeat enqueue with reordered keys then returns `conflict`. This may be intended.

## Commands

All commands ran from the repository root unless a directory is named.

| Command | Exit code | Result |
|---|---:|---|
| `git fetch --unshallow` | 0 | Full history fetched. |
| `pnpm install --frozen-lockfile` | 0 | Lockfile unchanged. |
| `./node_modules/.bin/turbo run build --filter=@reading-advantage/backend^...` | 0 | 4 of 4 dependency builds passed. |
| Before, in `packages/backend`: `../../node_modules/.bin/vitest run --coverage --coverage.reportOnFailure --coverage.include='src/**/*.ts' --coverage.exclude='**/__tests__/**' --coverage.exclude='**/*.test.ts'` | 1 | Files: 4 failed, 50 passed, 7 skipped. Tests: 549 passed, 7 failed, 51 skipped (607). |
| After, the same command | 1 | Files: 4 failed, 59 passed, 7 skipped. Tests: 775 passed, 7 failed, 1 expected fail, 51 skipped (834). |
| In `packages/backend`: `../../node_modules/.bin/eslint .` | 0 | No lint errors. |
| In `packages/backend`: `../../node_modules/.bin/tsc --noEmit -p tsconfig.test.json` | 2 | 1 error, in `src/modules/accounting/__tests__/submissions.test.ts:252`. It was there before this work. |

## Failures that were there before this work

- `package-scaffold.test.ts` (1 test): the package has 8 export paths, but the test expects 7.
- `route-bindings.security.test.ts` (1 test): the import returns `ERR_MODULE_NOT_FOUND` because the backend `dist/` is not built.
- `postgres-admin-safety.integration.test.ts` (3 tests) and `postgres-company-scope.integration.test.ts` (2 tests): they need a database URL and do not skip without one.
- The coverage-gaps report names `durable-job-architecture.red.test.ts` as failing. It passed in this run.

## Rules kept

- I changed no source file, no lockfile, and no assertion that was already there.
- I added no `ts-ignore`, `ts-expect-error`, `eslint-disable`, or skip.
- Git log shows no track for the two dev-local files. Their commits use `company_identity_sso_20260715`, the track of the company-identity module.

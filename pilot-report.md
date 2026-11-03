# Pilot report: packages/backend check-types and unit tests

- Base commit: `01f2acfe8ae9d9ef88c2a62cb425992a00261bab`
- Branch: `pilot/cloud-backend-tests`
- Scope: I changed only files under `packages/backend`, plus this report.
- Command: `./node_modules/.bin/turbo run build check-types test --filter=@reading-advantage/backend`

## Setup

| Step | Exit |
|------|------|
| `git fetch --unshallow` | 0 |
| `pnpm install --frozen-lockfile` | 0. One warning: no bin for `activity-tutorial/dist/cli.js`, because that package was not built yet. |

## Runs

| # | When | Command | Exit | Result |
|---|------|---------|------|--------|
| 1 | before fix | the command | 2 | `@reading-advantage/db#check-types` failed (TS2307 ×7, TS7006 ×2) and turbo stopped. `advantage-play-kit` build and check-types were cut off with no error output. |
| 2 | before fix | the command `--continue` | 2 | backend check-types: 1 error (TS2820). backend test: 4 files failed, 50 passed, 7 skipped (61); 7 tests failed, 549 passed, 51 skipped (607). db check-types: same errors as run 1. |
| 3 | after fix | the command | 1 | backend test: 2 files failed, 52 passed, 7 skipped (61); 5 tests failed, 551 passed, 51 skipped (607). These are the 5 Postgres integration cases. Turbo stopped before it reported db check-types. 7 of 9 tasks succeeded. |
| 4 | after fix | the command `--continue` | 2 | backend check-types: exit 0. backend test: same counts as run 3. db check-types: same errors as run 1. 9 of 11 tasks succeeded. |

The command does not exit 0. The two remaining failures are outside what I was allowed to fix (see "Failures left").

## Errors fixed

### 1. TS2820 in `src/modules/accounting/__tests__/submissions.test.ts:252`

- Cause: commit `febc6a0dc` ("feat(backend): restrict settled currencies", track `accounting_structural_alignment_20260919`). It changed `currencySchema` in `finance-operations/contracts.ts` from `z.string().regex(/^[A-Z]{3}$/u)` to `z.enum(["THB", "USD", "JPY"])`. The test "rejects a money currency that is not uppercase ISO-4217" was added in `966019baf` (track `accounting_app_foundation_20260820`). It passes `currency: "usd"`, which is no longer allowed by the inferred input type.
- Fix (commit `18dea0403`): the test input is now `{ ... } as unknown as AccountingSubmissionInput`. The file already uses this cast pattern at line 122, and it casts another invalid input at line 218. The runtime value is still `"usd"`, and the assertions are unchanged: an `AccountingSubmissionError` with reason `invalid-input`, and no insert. The test still passes.
- Note: a plain `as AccountingSubmissionInput` cast fails with TS2352, so the cast must go through `unknown`.

### 2. `src/__tests__/package-scaffold.test.ts`: the export list is out of date

- What I saw: the test expects 7 export keys and `package.json` has 8. The brief described this as "5 vs 6", but `./accounting` is already in the expected list. The key that is not in the list is `./jobs/adapters/postgres`.
- Cause: commit `219d64287` ("feat(primary): request paths enqueue mastery evidence jobs", track `primary_mastery_evidence_20261006`) added the `./jobs/adapters/postgres` export to `packages/backend/package.json` and did not update the scaffold test. The test was last changed in `0e584d370`.
- Fix (commit `decb02f0b`): added `"./jobs/adapters/postgres"` to the expected sorted list, so it matches the committed `package.json`. I removed no assertion.

## Failures left

1. **`postgres-admin-safety.integration.test.ts` (3 tests) and `postgres-company-scope.integration.test.ts` (2 tests).** Both throw `COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL is required for PostgreSQL tests.` The throw is in `packages/db/src/company-identity/__tests__/test-postgres.ts:39`. Per the brief, there is no database in this run, so I left them as they are.

2. **`@reading-advantage/db#check-types` (outside backend, not fixed).** These errors are in `packages/db/src/__tests__/sales-phase2-review-a-durable.red.test.ts` and `sales-phase2-transaction-atomicity.red.test.ts`:
   - TS2307 ×7: the tests import `../../../domain/dist/...` and `../../../sales-knowledge/dist/index.js`.
   - TS7006 ×2: follow-on errors from the missing types.

   `db` has no dependency on `domain` or `sales-knowledge`, so turbo never builds their `dist` before `db:check-types` runs. On a clean clone those files do not exist.

   The errors come from commit `63f1ec7e8` ("test(sales): expose Phase 2 Review A gaps") and commit `628468dae` ("test(sales): expose projection atomicity gap"). Both are on track `sales_mastery_consumer_20260810`. `db:check-types` is upstream of backend check-types through `^check-types`, so this alone makes the command fail.

3. **Order-dependent test (outside backend, not fixed).** In run 2, `src/modules/company-identity/__tests__/route-bindings.security.test.ts` failed with "does not let a public backend subpath forge accounts route provenance": it expected `ERR_PACKAGE_PATH_NOT_EXPORTED` and got `ERR_MODULE_NOT_FOUND`.

   In `turbo.json`, `test` has `dependsOn: ["^build"]` and not the package's own `build`. The test imports the backend's own `dist` through its package export, so on a clean tree it runs while `tsc` is still writing `dist/`. The test passes once `dist/` exists: it passed when run alone and in runs 3 and 4.

   A durable fix is to add `"build"` to the `test` task's `dependsOn` in `turbo.json`. That file is outside `packages/backend`, so I did not change it.

## Branches and worktrees

- `pilot/cloud-backend-tests`: this work. It waits for owner review and merge.
- `claude/backend-cloud-tests-ju05ks`: the session's default branch, at the base commit, with no changes. Prune it if it is not used.
- I created no worktrees.

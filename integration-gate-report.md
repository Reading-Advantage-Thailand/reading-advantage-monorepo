# Cloud Integration Gate Report

Base: `01f2acfe8`. Branch: `pilot/cloud-integration-gate`. Head after merges: `a9911bb03`.
Machine: 4 CPUs, 15 GB memory, no swap. No database ran. No secret was used. No deploy ran.

## Verdict

- All 15 branches merge with no conflict.
- One merge pair breaks a test suite: `dead-code-safe-96` deletes a module that `domain-coverage-tests-2` tests.
- No task fails in B for a code reason that it did not fail for in A.
- Two tasks fail in B only under load. Both pass when they run alone.
- B fixes 13 tasks that fail in A.

## Merges

Each merge used `git merge --no-ff`. Each branch root report moved to `cloud-reports/<name>.md`.
A second root report moved to `cloud-reports/<name>-<kind>.md`.

| # | Branch | Result | Conflict files | Merge commit | Reports moved |
|---|---|---|---|---|---|
| 1 | zod-compat | merged | none | `4efd3d9af` | zod-compat.md |
| 2 | codecamp-tests | merged | none | `2f62dc741` | codecamp-tests.md |
| 3 | backend-tests | merged | none | `9180852a7` | backend-tests.md |
| 4 | db-contracts | merged | none | `28061abb9` | db-contracts.md |
| 5 | games-small | merged | none | `1b6244df1` | games-small.md |
| 6 | workbooks-app-tests | merged | none | `095199826` | workbooks-app-tests.md |
| 7 | api-coverage-tests | merged | none | `4b26c3431` | api-coverage-tests.md, api-coverage-tests-coverage-gaps.md |
| 8 | domain-coverage-tests-2 | merged | none | `206a7bb6a` | domain-coverage-tests-2.md |
| 9 | backend-coverage-tests | merged | none | `2cea64a7f` | backend-coverage-tests.md |
| 10 | auth-coverage-tests | merged | none | `c6696b6e3` | auth-coverage-tests.md |
| 11 | codecamp-app-coverage | merged | none | `d2025193b` | codecamp-app-coverage.md |
| 12 | primary-app-coverage | merged | none | `963b701da` | primary-app-coverage.md |
| 13 | dead-code-games3d | merged | none | `c47c57549` | dead-code-games3d.md, dead-code-games3d-dead-code.md |
| 14 | dead-code-safe-96 | merged | none | `e82a5bda4` | dead-code-safe-96.md |
| 15 | turbo-tooling | merged | none | `a9911bb03` | turbo-tooling.md |

Branches 7 to 10 share one `coverage-gaps-report.md` commit. Merge 7 brought it in, so later merges did not add it again.
Branches 13 and 14 share one `dead-code-report.md` commit in the same way.
No merge changes `pnpm-lock.yaml` or any `package.json`.

## New failures in B

A new failure is a task that passes in A and fails in B.

| Task | A | B | B alone | Cause |
|---|---|---|---|---|
| `@reading-advantage/api#test` | 0 | 1 | 0 | Load. A `beforeAll` hook times out at 10 s in `wave0-phase3-typed-errors.test.ts`. No branch causes it. |
| `accounting#test` | 0 | 1 | 0 | Load. `auth-import-surface.test.ts` times out at 5 s. No branch causes it. |

"B alone" means `turbo run <task> --filter=<package> --concurrency=1` on the merged head.

### New failing tests inside tasks that fail in both runs

| Package | Tests | Cause |
|---|---|---|
| `@reading-advantage/domain` | Suite `workbooks-coverage-proposal-repository.test.ts` (26 tests) does not load. | **`dead-code-safe-96`**, combined with `domain-coverage-tests-2`. |
| `primary-advantage` | 32 tests in `app/api/__tests__/preview-write-guard.test.ts`, plus 3 PGlite suites. | Load. All 110 tests pass alone. No branch causes them. |
| `@reading-advantage/backend` | 3 tests in `finance-task3-*.test.ts` time out at 5 s. | Load. All 38 tests pass alone. No branch causes them. |
| `vocabulary-games` | `AdvantageGamesAuthoringQc.test.tsx`. | Load. All 6 tests pass alone. No branch causes it. |

The domain cause: commit `39da855dc` in `dead-code-safe-96` deletes `packages/domain/src/workbooks/coverage-record.ts` and `ai-proposal.ts`.
Commit `566c84239` in `domain-coverage-tests-2` adds a test that imports `../workbooks/coverage-record.js`.
Each branch passes alone. Together the suite fails with "Cannot find module".
The suite passes at merge `c47c57549` (26 passed). It fails at merge `e82a5bda4`.

The `preview-write-guard` failures show ENOENT on `packages/sales-knowledge/dist/data/evidence/release-candidate.json`.
That ENOENT also occurs in A, in `primary-advantage` and `workbooks`. It is a base issue, not a merge issue.

Two `reading-advantage` jest suites look new by name only. Jest prints their duration in the name.
Both fail the same 3 tests at base and at the merged head.

## Failures that B fixes

| Task | A failure | Fix branch |
|---|---|---|
| `@reading-advantage/api#check-types` | Cannot find `@reading-advantage/domain`: no `dist` yet. | `turbo-tooling` (adds `^build` to `check-types`) |
| `@reading-advantage/webhooks#check-types` | Same missing `domain` build. | `turbo-tooling` |
| `@reading-advantage/db#check-types` | Cannot find `domain/dist/...`. | `turbo-tooling` (adds `domain#build` to `db#check-types`) |
| `@reading-advantage/mastery-runtime-compat#check-types` | Cannot find `domain/mastery/...`. | `turbo-tooling` |
| `accounts#check-types` | Cannot find `@reading-advantage/domain`. | `turbo-tooling` |
| `workbooks#check-types` | Cannot find `@reading-advantage/domain`, then implicit `any`. | `turbo-tooling` |
| `@reading-advantage/backend#check-types` | `"usd"` is not a currency type in `submissions.test.ts`. | `backend-tests` |
| `primary-advantage#check-types` | A: memory kill. Alone at base: blocked by `backend#check-types`. | `backend-tests` |
| `@reading-advantage/mastery-runtime-compat#test` | 5 release-artifact tests fail in `check-consumer.mjs`. | `zod-compat` |
| `codecamp-advantage#test` | 2 phase-10 session-expiry tests fail. | `codecamp-tests` |
| `workbooks#test` | jsdom suites fail on the sales-knowledge ENOENT. | `workbooks-app-tests` |
| `accounts#test` | `domain` entry is not built when the test starts. | `turbo-tooling`, by inference from build order. Not bisected. |
| `@reading-advantage/advantage-play-kit#test` | One integration test times out at 60 s. | None. No branch touches the package. Load. |

## Memory kills

Some tasks exit 137 when the kernel kills them for memory. Exit 137 says nothing about the code.

| Task | A | B | Base alone | Head alone |
|---|---|---|---|---|
| `primary-advantage#build` | 137 | 137 | 0 | 0 |
| `primary-advantage#check-types` | 137 | 0 | 2 (blocked by `backend#check-types`) | not run |
| `reading-advantage#check-types` | 137 | 2 | 2 | 1 |
| `sales-advantage#build` | 137 | 1 (copy race on `marketing/dist`) | 0 | 0 |

`reading-advantage#check-types` fails at base and head with the same 5 type errors. No merge touches those files.
Turbo exits 137 in both full runs because one task exits 137.

## Tasks that fail in both runs

`auth#test`, `backend#test`, `db#test`, `domain#test`, `sales-knowledge#test`, and `webhooks#test` fail in both runs.
`primary-advantage#lint`, `primary-advantage#test`, `reading-advantage#lint`, and `reading-advantage#test` fail in both runs.
`sales-advantage#test`, `science-advantage#test`, `vocabulary-games#test`, and `www-reading-advantage#lint` fail in both runs.
`db#test` drops from 43 to 33 failed tests. `sales-advantage#test` drops from 10 to 5 failed tests.
`science-advantage#test` needs Postgres on port 5432. No database ran, so it runs no test.

## it.fails tests that the branches add

Each test documents a known defect. It passes while the defect stays.

| Branch | File | Test |
|---|---|---|
| domain-coverage-tests-2 | `packages/domain/src/__tests__/science-lesson-slug-lookup.test.ts` | getLessonBySlug finds a lesson by its slug |
| domain-coverage-tests-2 | same | getLessonBySlug returns null for an unknown slug |
| domain-coverage-tests-2 | same | getStudentLessonProgress finds a lesson by its slug |
| domain-coverage-tests-2 | same | getStudentLessonProgress reports an unknown slug as a missing lesson |
| backend-coverage-tests | `packages/backend/src/modules/company-identity/__tests__/postgres-repository-admin.test.ts` | allows removing the admin role from a suspended admin while one active admin remains |
| auth-coverage-tests | `packages/auth/src/__tests__/permissions-prototype-keys.test.ts` | lookupPermission returns undefined for toString |
| auth-coverage-tests | same | lookupPermission returns undefined for constructor |
| auth-coverage-tests | same | hasPermission reports an unknown permission for toString |
| auth-coverage-tests | `packages/auth/src/company-identity/__tests__/client-discovery-retry.test.ts` | retries discovery on the next call after a 503 |
| primary-app-coverage | `apps/primary-advantage/actions/__tests__/flashcard-card-actions.test.ts` | gives a longer interval after a second correct review than after the first |
| primary-app-coverage | `apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/__tests__/review-route.test.ts` | accepts a second review of the same card |

No other branch adds an `it.fails` or `test.fails` test.

## Commands

`NODE_OPTIONS=--max-old-space-size=10240` was set for every turbo and test command.

| Step | Command | Exit | Time |
|---|---|---|---|
| Fetch | `git fetch --unshallow` | 0 | under 1 min |
| Fetch | `git fetch origin 'refs/heads/pilot/cloud-*:refs/remotes/origin/pilot/cloud-*'` | 0 | under 1 min |
| Install at base | `pnpm install --frozen-lockfile` | 0 | 35 s |
| Run A | `./node_modules/.bin/turbo run build check-types lint test --continue --summarize --log-order=grouped` | 137 | 28 m 50 s |
| Merges | 15 × `git merge --no-ff --no-commit origin/pilot/cloud-<name>`, then `git mv` and `git commit` | 0 each | under 1 min total |
| Install at head | `pnpm install --frozen-lockfile` | 0 | 22 s |
| Run B | same command as Run A | 137 | 25 m 55 s |
| Head alone | `turbo run test --filter=@reading-advantage/api --concurrency=1` | 0 | 35 s |
| Head alone | `turbo run test --filter=accounting --concurrency=1` | 0 | 21 s |
| Head alone | `turbo run check-types --filter=reading-advantage --concurrency=1` | 1 | 24 s |
| Head alone | `turbo run build --filter=sales-advantage --concurrency=1` | 0 | 33 s |
| Head alone | `turbo run build --filter=primary-advantage --concurrency=1` | 0 | 2 m 20 s |
| Base alone | `turbo run build --filter=primary-advantage --concurrency=1` | 0 | 1 m 53 s |
| Base alone | `turbo run check-types --filter=primary-advantage --concurrency=1` | 2 | 35 s |
| Base alone | `turbo run check-types --filter=reading-advantage --concurrency=1` | 2 | 1 m 21 s |
| Base alone | `turbo run build --filter=sales-advantage --concurrency=1` | 0 | 34 s |
| Bisect | `vitest run src/__tests__/workbooks-coverage-proposal-repository.test.ts` in `packages/domain` at `c47c57549` | 0 | under 1 min |
| Bisect | same at `e82a5bda4` | 1 | under 1 min |
| Head alone | `vitest run` on the 4 new failing `primary-advantage` files | 0 | under 15 min |
| Head alone | `vitest run` on the 3 new failing `backend` files | 0 | under 15 min |
| Head alone | `jest src/components/apk/AdvantageGamesAuthoringQc.test.tsx` in `apps/advantage-games` | 0 | under 15 min |
| Base and head | `jest` on the 2 `reading-advantage` suites | 1 both | under 15 min each |

Run A: 149 of 179 tasks pass, 0 cached. Run B: 160 of 179 tasks pass, 68 cached.
Run B reused the turbo cache from Run A for tasks with unchanged inputs. Failed tasks are never cached.
Test counts come from the Vitest `Tests` line or the Jest `Tests:` line in each task log.
A dash means the task prints no test line.

## Per-task results

### Run A

| Package | Task | Exit | Tests passed/failed/skipped |
|---|---|---|---|
| @reading-advantage/activity-react | build | 0 | - |
| @reading-advantage/activity-react | check-types | 0 | - |
| @reading-advantage/activity-react | lint | 0 | - |
| @reading-advantage/activity-react | test | 0 | 21/0/0 |
| @reading-advantage/activity-runtime | build | 0 | - |
| @reading-advantage/activity-runtime | check-types | 0 | - |
| @reading-advantage/activity-runtime | lint | 0 | - |
| @reading-advantage/activity-runtime | test | 0 | 66/0/0 |
| @reading-advantage/activity-tutorial | build | 0 | - |
| @reading-advantage/activity-tutorial | check-types | 0 | - |
| @reading-advantage/activity-tutorial | lint | 0 | - |
| @reading-advantage/activity-tutorial | test | 0 | 16/0/0 |
| @reading-advantage/advantage-play-kit | build | 0 | - |
| @reading-advantage/advantage-play-kit | check-types | 0 | - |
| @reading-advantage/advantage-play-kit | lint | 0 | - |
| @reading-advantage/advantage-play-kit | test | 1 | 753/1/0 |
| @reading-advantage/advantage-play-kit-3d | build | 0 | - |
| @reading-advantage/advantage-play-kit-3d | check-types | 0 | - |
| @reading-advantage/advantage-play-kit-3d | lint | 0 | - |
| @reading-advantage/advantage-play-kit-3d | test | 0 | 175/0/0 |
| @reading-advantage/ai | build | 0 | - |
| @reading-advantage/ai | check-types | 0 | - |
| @reading-advantage/ai | lint | 0 | - |
| @reading-advantage/ai | test | 0 | 258/0/3 |
| @reading-advantage/api | build | 0 | - |
| @reading-advantage/api | check-types | 2 | - |
| @reading-advantage/api | lint | 0 | - |
| @reading-advantage/api | test | 0 | 355/0/0 |
| @reading-advantage/architecture-enforcement | build | 0 | - |
| @reading-advantage/architecture-enforcement | check-types | 0 | - |
| @reading-advantage/architecture-enforcement | lint | 0 | - |
| @reading-advantage/architecture-enforcement | test | 0 | 251/0/0 |
| @reading-advantage/auth | build | 0 | - |
| @reading-advantage/auth | check-types | 0 | - |
| @reading-advantage/auth | lint | 0 | - |
| @reading-advantage/auth | test | 1 | 352/2/9 |
| @reading-advantage/auth-client | build | 0 | - |
| @reading-advantage/auth-client | check-types | 0 | - |
| @reading-advantage/auth-client | lint | 0 | - |
| @reading-advantage/auth-client | test | 0 | 32/0/0 |
| @reading-advantage/avatar-kit | build | 0 | - |
| @reading-advantage/avatar-kit | check-types | 0 | - |
| @reading-advantage/avatar-kit | lint | 0 | - |
| @reading-advantage/avatar-kit | test | 0 | 12/0/0 |
| @reading-advantage/backend | build | 0 | - |
| @reading-advantage/backend | check-types | 2 | - |
| @reading-advantage/backend | lint | 0 | - |
| @reading-advantage/backend | test | 1 | 548/8/51 |
| @reading-advantage/codecamp-knowledge | build | 0 | - |
| @reading-advantage/codecamp-knowledge | check-types | 0 | - |
| @reading-advantage/codecamp-knowledge | lint | 0 | - |
| @reading-advantage/codecamp-knowledge | test | 0 | 90/0/0 |
| @reading-advantage/config | test | 0 | 11/0/0 |
| @reading-advantage/db | build | 0 | - |
| @reading-advantage/db | check-types | 2 | - |
| @reading-advantage/db | lint | 0 | - |
| @reading-advantage/db | test | 1 | 1229/43/49 |
| @reading-advantage/domain | build | 0 | - |
| @reading-advantage/domain | check-types | 0 | - |
| @reading-advantage/domain | lint | 0 | - |
| @reading-advantage/domain | test | 1 | 2185/2/27 |
| @reading-advantage/game-cartridges | build | 0 | - |
| @reading-advantage/game-cartridges | check-types | 0 | - |
| @reading-advantage/game-cartridges | lint | 0 | - |
| @reading-advantage/game-cartridges | test | 0 | 800/0/0 |
| @reading-advantage/game-cartridges-3d | build | 0 | - |
| @reading-advantage/game-cartridges-3d | check-types | 0 | - |
| @reading-advantage/game-cartridges-3d | lint | 0 | - |
| @reading-advantage/game-cartridges-3d | test | 0 | 2011/0/0 |
| @reading-advantage/game-contracts | build | 0 | - |
| @reading-advantage/game-contracts | check-types | 0 | - |
| @reading-advantage/game-contracts | lint | 0 | - |
| @reading-advantage/game-contracts | test | 0 | 290/0/0 |
| @reading-advantage/integrations-github | build | 0 | - |
| @reading-advantage/integrations-github | check-types | 0 | - |
| @reading-advantage/integrations-github | lint | 0 | - |
| @reading-advantage/integrations-github | test | 0 | 6/0/0 |
| @reading-advantage/knowledge-space-core | build | 0 | - |
| @reading-advantage/knowledge-space-core | check-types | 0 | - |
| @reading-advantage/knowledge-space-core | lint | 0 | - |
| @reading-advantage/knowledge-space-core | test | 0 | 648/0/47 |
| @reading-advantage/knowledge-space-practice | build | 0 | - |
| @reading-advantage/knowledge-space-practice | check-types | 0 | - |
| @reading-advantage/knowledge-space-practice | lint | 0 | - |
| @reading-advantage/knowledge-space-practice | test | 0 | 422/0/0 |
| @reading-advantage/mastery-runtime-compat | build | 0 | - |
| @reading-advantage/mastery-runtime-compat | check-types | 2 | - |
| @reading-advantage/mastery-runtime-compat | lint | 0 | - |
| @reading-advantage/mastery-runtime-compat | test | 1 | 58/5/0 |
| @reading-advantage/practice-core | build | 0 | - |
| @reading-advantage/practice-core | check-types | 0 | - |
| @reading-advantage/practice-core | lint | 0 | - |
| @reading-advantage/practice-core | test | 0 | 202/0/0 |
| @reading-advantage/read-along | test | 0 | 99/0/0 |
| @reading-advantage/sales-knowledge | build | 0 | - |
| @reading-advantage/sales-knowledge | check-types | 0 | - |
| @reading-advantage/sales-knowledge | lint | 0 | - |
| @reading-advantage/sales-knowledge | test | 1 | 11/8/0 |
| @reading-advantage/scripts | test | 0 | - |
| @reading-advantage/session-service | build | 0 | - |
| @reading-advantage/session-service | check-types | 0 | - |
| @reading-advantage/session-service | lint | 0 | - |
| @reading-advantage/session-service | test | 0 | 26/0/7 |
| @reading-advantage/srs-engine | build | 0 | - |
| @reading-advantage/srs-engine | check-types | 0 | - |
| @reading-advantage/srs-engine | lint | 0 | - |
| @reading-advantage/srs-engine | test | 0 | 303/0/0 |
| @reading-advantage/storage | build | 0 | - |
| @reading-advantage/storage | check-types | 0 | - |
| @reading-advantage/storage | lint | 0 | - |
| @reading-advantage/storage | test | 0 | 82/0/0 |
| @reading-advantage/types | build | 0 | - |
| @reading-advantage/types | check-types | 0 | - |
| @reading-advantage/types | lint | 0 | - |
| @reading-advantage/types | test | 0 | 92/0/0 |
| @reading-advantage/ui | build | 0 | - |
| @reading-advantage/ui | lint | 0 | - |
| @reading-advantage/ui | test | 0 | 30/0/0 |
| @reading-advantage/utils | build | 0 | - |
| @reading-advantage/utils | lint | 0 | - |
| @reading-advantage/utils | test | 0 | 30/0/0 |
| @reading-advantage/webhooks | build | 0 | - |
| @reading-advantage/webhooks | check-types | 2 | - |
| @reading-advantage/webhooks | lint | 0 | - |
| @reading-advantage/webhooks | test | 1 | 235/5/3 |
| @reading-advantage/worker | build | 0 | - |
| @reading-advantage/worker | check-types | 0 | - |
| @reading-advantage/worker | lint | 0 | - |
| @reading-advantage/worker | test | 0 | 48/0/0 |
| accounting | build | 0 | - |
| accounting | check-types | 0 | - |
| accounting | lint | 0 | - |
| accounting | test | 0 | 271/0/0 |
| accounts | build | 0 | - |
| accounts | check-types | 2 | - |
| accounts | lint | 0 | - |
| accounts | test | 1 | 155/0/1 |
| activity-vinext-fixture | build | 0 | - |
| activity-vinext-fixture | check-types | 0 | - |
| codecamp-advantage | build | 0 | - |
| codecamp-advantage | check-types | 0 | - |
| codecamp-advantage | lint | 0 | - |
| codecamp-advantage | test | 1 | 1110/2/200 |
| marketing | build | 0 | - |
| marketing | check-types | 0 | - |
| marketing | lint | 0 | - |
| marketing | test | 0 | 573/0/0 |
| primary-advantage | build | 137 | - |
| primary-advantage | check-types | 137 | - |
| primary-advantage | lint | 1 | - |
| primary-advantage | test | 1 | 2765/9/0 |
| reading-advantage | build | 0 | - |
| reading-advantage | check-types | 137 | - |
| reading-advantage | lint | 1 | - |
| reading-advantage | test | 1 | 1059/4/0 |
| sales-advantage | build | 137 | - |
| sales-advantage | check-types | 0 | - |
| sales-advantage | lint | 0 | - |
| sales-advantage | test | 1 | 333/10/9 |
| science-advantage | build | 0 | - |
| science-advantage | check-types | 0 | - |
| science-advantage | lint | 0 | - |
| science-advantage | test | 1 | - |
| storytime | build | 0 | - |
| storytime | check-types | 0 | - |
| storytime | lint | 0 | - |
| storytime | test | 0 | 164/0/0 |
| vocabulary-games | build | 0 | - |
| vocabulary-games | check-types | 0 | - |
| vocabulary-games | lint | 0 | - |
| vocabulary-games | test | 1 | 1865/3/0 |
| workbooks | build | 0 | - |
| workbooks | check-types | 2 | - |
| workbooks | lint | 0 | - |
| workbooks | test | 1 | 210/0/0 |
| www-reading-advantage | build | 0 | - |
| www-reading-advantage | check-types | 0 | - |
| www-reading-advantage | lint | 1 | - |
| www-reading-advantage | test | 0 | 1715/0/0 |

### Run B

| Package | Task | Exit | Tests passed/failed/skipped |
|---|---|---|---|
| @reading-advantage/activity-react | build | 0 | - |
| @reading-advantage/activity-react | check-types | 0 | - |
| @reading-advantage/activity-react | lint | 0 | - |
| @reading-advantage/activity-react | test | 0 | 21/0/0 |
| @reading-advantage/activity-runtime | build | 0 | - |
| @reading-advantage/activity-runtime | check-types | 0 | - |
| @reading-advantage/activity-runtime | lint | 0 | - |
| @reading-advantage/activity-runtime | test | 0 | 66/0/0 |
| @reading-advantage/activity-tutorial | build | 0 | - |
| @reading-advantage/activity-tutorial | check-types | 0 | - |
| @reading-advantage/activity-tutorial | lint | 0 | - |
| @reading-advantage/activity-tutorial | test | 0 | 16/0/0 |
| @reading-advantage/advantage-play-kit | build | 0 | - |
| @reading-advantage/advantage-play-kit | check-types | 0 | - |
| @reading-advantage/advantage-play-kit | lint | 0 | - |
| @reading-advantage/advantage-play-kit | test | 0 | 754/0/0 |
| @reading-advantage/advantage-play-kit-3d | build | 0 | - |
| @reading-advantage/advantage-play-kit-3d | check-types | 0 | - |
| @reading-advantage/advantage-play-kit-3d | lint | 0 | - |
| @reading-advantage/advantage-play-kit-3d | test | 0 | 175/0/0 |
| @reading-advantage/ai | build | 0 | - |
| @reading-advantage/ai | check-types | 0 | - |
| @reading-advantage/ai | lint | 0 | - |
| @reading-advantage/ai | test | 0 | 258/0/3 |
| @reading-advantage/api | build | 0 | - |
| @reading-advantage/api | check-types | 0 | - |
| @reading-advantage/api | lint | 0 | - |
| @reading-advantage/api | test | 1 | 490/0/6 |
| @reading-advantage/architecture-enforcement | build | 0 | - |
| @reading-advantage/architecture-enforcement | check-types | 0 | - |
| @reading-advantage/architecture-enforcement | lint | 0 | - |
| @reading-advantage/architecture-enforcement | test | 0 | 251/0/0 |
| @reading-advantage/auth | build | 0 | - |
| @reading-advantage/auth | check-types | 0 | - |
| @reading-advantage/auth | lint | 0 | - |
| @reading-advantage/auth | test | 1 | 513/2/9 |
| @reading-advantage/auth-client | build | 0 | - |
| @reading-advantage/auth-client | check-types | 0 | - |
| @reading-advantage/auth-client | lint | 0 | - |
| @reading-advantage/auth-client | test | 0 | 32/0/0 |
| @reading-advantage/avatar-kit | build | 0 | - |
| @reading-advantage/avatar-kit | check-types | 0 | - |
| @reading-advantage/avatar-kit | lint | 0 | - |
| @reading-advantage/avatar-kit | test | 0 | 12/0/0 |
| @reading-advantage/backend | build | 0 | - |
| @reading-advantage/backend | check-types | 0 | - |
| @reading-advantage/backend | lint | 0 | - |
| @reading-advantage/backend | test | 1 | 772/10/51 |
| @reading-advantage/codecamp-knowledge | build | 0 | - |
| @reading-advantage/codecamp-knowledge | check-types | 0 | - |
| @reading-advantage/codecamp-knowledge | lint | 0 | - |
| @reading-advantage/codecamp-knowledge | test | 0 | 90/0/0 |
| @reading-advantage/config | test | 0 | 11/0/0 |
| @reading-advantage/db | build | 0 | - |
| @reading-advantage/db | check-types | 0 | - |
| @reading-advantage/db | lint | 0 | - |
| @reading-advantage/db | test | 1 | 1239/33/51 |
| @reading-advantage/domain | build | 0 | - |
| @reading-advantage/domain | check-types | 0 | - |
| @reading-advantage/domain | lint | 0 | - |
| @reading-advantage/domain | test | 1 | 2444/1/27 |
| @reading-advantage/game-cartridges | build | 0 | - |
| @reading-advantage/game-cartridges | check-types | 0 | - |
| @reading-advantage/game-cartridges | lint | 0 | - |
| @reading-advantage/game-cartridges | test | 0 | 800/0/0 |
| @reading-advantage/game-cartridges-3d | build | 0 | - |
| @reading-advantage/game-cartridges-3d | check-types | 0 | - |
| @reading-advantage/game-cartridges-3d | lint | 0 | - |
| @reading-advantage/game-cartridges-3d | test | 0 | 2011/0/0 |
| @reading-advantage/game-contracts | build | 0 | - |
| @reading-advantage/game-contracts | check-types | 0 | - |
| @reading-advantage/game-contracts | lint | 0 | - |
| @reading-advantage/game-contracts | test | 0 | 290/0/0 |
| @reading-advantage/integrations-github | build | 0 | - |
| @reading-advantage/integrations-github | check-types | 0 | - |
| @reading-advantage/integrations-github | lint | 0 | - |
| @reading-advantage/integrations-github | test | 0 | 6/0/0 |
| @reading-advantage/knowledge-space-core | build | 0 | - |
| @reading-advantage/knowledge-space-core | check-types | 0 | - |
| @reading-advantage/knowledge-space-core | lint | 0 | - |
| @reading-advantage/knowledge-space-core | test | 0 | 648/0/47 |
| @reading-advantage/knowledge-space-practice | build | 0 | - |
| @reading-advantage/knowledge-space-practice | check-types | 0 | - |
| @reading-advantage/knowledge-space-practice | lint | 0 | - |
| @reading-advantage/knowledge-space-practice | test | 0 | 422/0/0 |
| @reading-advantage/mastery-runtime-compat | build | 0 | - |
| @reading-advantage/mastery-runtime-compat | check-types | 0 | - |
| @reading-advantage/mastery-runtime-compat | lint | 0 | - |
| @reading-advantage/mastery-runtime-compat | test | 0 | 63/0/0 |
| @reading-advantage/practice-core | build | 0 | - |
| @reading-advantage/practice-core | check-types | 0 | - |
| @reading-advantage/practice-core | lint | 0 | - |
| @reading-advantage/practice-core | test | 0 | 202/0/0 |
| @reading-advantage/read-along | test | 0 | 99/0/0 |
| @reading-advantage/sales-knowledge | build | 0 | - |
| @reading-advantage/sales-knowledge | check-types | 0 | - |
| @reading-advantage/sales-knowledge | lint | 0 | - |
| @reading-advantage/sales-knowledge | test | 1 | 11/8/0 |
| @reading-advantage/scripts | test | 0 | - |
| @reading-advantage/session-service | build | 0 | - |
| @reading-advantage/session-service | check-types | 0 | - |
| @reading-advantage/session-service | lint | 0 | - |
| @reading-advantage/session-service | test | 0 | 26/0/7 |
| @reading-advantage/srs-engine | build | 0 | - |
| @reading-advantage/srs-engine | check-types | 0 | - |
| @reading-advantage/srs-engine | lint | 0 | - |
| @reading-advantage/srs-engine | test | 0 | 303/0/0 |
| @reading-advantage/storage | build | 0 | - |
| @reading-advantage/storage | check-types | 0 | - |
| @reading-advantage/storage | lint | 0 | - |
| @reading-advantage/storage | test | 0 | 82/0/0 |
| @reading-advantage/types | build | 0 | - |
| @reading-advantage/types | check-types | 0 | - |
| @reading-advantage/types | lint | 0 | - |
| @reading-advantage/types | test | 0 | 92/0/0 |
| @reading-advantage/ui | build | 0 | - |
| @reading-advantage/ui | lint | 0 | - |
| @reading-advantage/ui | test | 0 | 30/0/0 |
| @reading-advantage/utils | build | 0 | - |
| @reading-advantage/utils | lint | 0 | - |
| @reading-advantage/utils | test | 0 | 30/0/0 |
| @reading-advantage/webhooks | build | 0 | - |
| @reading-advantage/webhooks | check-types | 0 | - |
| @reading-advantage/webhooks | lint | 0 | - |
| @reading-advantage/webhooks | test | 1 | 235/5/3 |
| @reading-advantage/worker | build | 0 | - |
| @reading-advantage/worker | check-types | 0 | - |
| @reading-advantage/worker | lint | 0 | - |
| @reading-advantage/worker | test | 0 | 48/0/0 |
| accounting | build | 0 | - |
| accounting | check-types | 0 | - |
| accounting | lint | 0 | - |
| accounting | test | 1 | 270/1/0 |
| accounts | build | 0 | - |
| accounts | check-types | 0 | - |
| accounts | lint | 0 | - |
| accounts | test | 0 | 161/0/1 |
| activity-vinext-fixture | build | 0 | - |
| activity-vinext-fixture | check-types | 0 | - |
| codecamp-advantage | build | 0 | - |
| codecamp-advantage | check-types | 0 | - |
| codecamp-advantage | lint | 0 | - |
| codecamp-advantage | test | 0 | 1210/0/200 |
| marketing | build | 0 | - |
| marketing | check-types | 0 | - |
| marketing | lint | 0 | - |
| marketing | test | 0 | 573/0/0 |
| primary-advantage | build | 137 | - |
| primary-advantage | check-types | 0 | - |
| primary-advantage | lint | 1 | - |
| primary-advantage | test | 1 | 2886/38/10 |
| reading-advantage | build | 0 | - |
| reading-advantage | check-types | 2 | - |
| reading-advantage | lint | 1 | - |
| reading-advantage | test | 1 | 1060/3/0 |
| sales-advantage | build | 1 | - |
| sales-advantage | check-types | 0 | - |
| sales-advantage | lint | 0 | - |
| sales-advantage | test | 1 | 338/5/9 |
| science-advantage | build | 0 | - |
| science-advantage | check-types | 0 | - |
| science-advantage | lint | 0 | - |
| science-advantage | test | 1 | - |
| storytime | build | 0 | - |
| storytime | check-types | 0 | - |
| storytime | lint | 0 | - |
| storytime | test | 0 | 164/0/0 |
| vocabulary-games | build | 0 | - |
| vocabulary-games | check-types | 0 | - |
| vocabulary-games | lint | 0 | - |
| vocabulary-games | test | 1 | 1867/1/0 |
| workbooks | build | 0 | - |
| workbooks | check-types | 0 | - |
| workbooks | lint | 0 | - |
| workbooks | test | 0 | 266/0/0 |
| www-reading-advantage | build | 0 | - |
| www-reading-advantage | check-types | 0 | - |
| www-reading-advantage | lint | 1 | - |
| www-reading-advantage | test | 0 | 1715/0/0 |


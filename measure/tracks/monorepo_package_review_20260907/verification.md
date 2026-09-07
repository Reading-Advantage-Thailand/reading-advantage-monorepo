# Verification

## Baseline

The checkout already contained extensive changes before this track began.
The initial tracked diff and status are saved under `/tmp/monorepo-review-baseline*`.
The source baseline was commit `2ce752b32293708836cf3ce8c5f3a7eb75beb2cf` plus those existing changes.

The default pnpm command was a shim that downloaded another pnpm version.
The pinned pnpm 11.8.0 became available through an approved download.
Primary already declared a workspace dependency absent from the lockfile. Automatic installation therefore failed under the frozen-lockfile rule.
Tests used installed dependencies. The `pnpm_config_verify_deps_before_run=warn` setting prevented automatic installation.
Turbo required `--env-mode=loose` to preserve that setting in package commands.

The aggregate command was `CI=true pnpm turbo run test --concurrency=2 --env-mode=loose` with the pinned PATH and warning setting.
It failed at the config package console-count assertion. The same failure appeared in the independent package review.
The full log is `/tmp/monorepo-review-baseline-tests.log`.

## Focused verification

Implementation reports will record regression tests, package checks, and remaining failures.
The independent backend checks record results in `/tmp/monorepo-review-backend-test-results.json`.

## Additional backend checks

Each unit ran its configured Vitest suite with one worker and a five-minute limit.

| Unit | Result | Limit |
| --- | --- | --- |
| ai | 205 passed; 20 failed; 3 skipped | Existing manifest, lockfile, and historical artifact assertions failed. |
| backend | 549 passed; 7 failed; 51 skipped | Two contract assertions failed. Five tests require a PostgreSQL test URL. |
| db | 1101 passed; 63 failed; 49 skipped | Existing contract, build, fixture, and PostgreSQL configuration failures remain. |
| domain | Timed out | The default suite includes source and compiled tests. No completed summary exists. |
| storage | 82 passed | The complete suite passed. |
| types | 89 passed; 1 failed | A nested Vitest reporter command produced no JSON. |
| webhooks | Timed out | The suite included lease tests that exceeded their individual time limits. |
| worker | 45 passed; 3 failed initially | The sandbox blocked a loopback listener. |

An approved retry passed all four worker health tests. The other 44 worker tests passed in the initial run.
The retry command was `CI=true node ../../node_modules/vitest/vitest.mjs run src/__tests__/health-server.test.ts --maxWorkers=1 --no-file-parallelism`.
These results supplement the source evaluations. They do not establish a clean monorepo gate.

## Final integration checks

All three independent Astra reviews accepted the implemented findings.
The focused checks passed 153 tests: 72 backend tests, 46 shared-package tests, and 35 app tests.

The final aggregate test command still failed at the config console-count assertion.
The final log is `/tmp/monorepo-review-final-tests.log`.
The complete monorepo gate remains failing.

Primary and Reading type checks completed with an 8 GB heap and a five-minute limit.
Primary reported 131 diagnostics. Reading reported 82 diagnostics. None referenced this task's changed files.
The logs are `/tmp/monorepo-review-primary-types.log` and `/tmp/monorepo-review-reading-types.log`.
The source errors concern files outside the accepted repair assignments.

The 36 source, test, and package files had no overlap with the initial dirty-file list.
Scoped whitespace checks passed.
The task preserved existing changes and modified no framework versions or lockfiles.
Live PostgreSQL concurrency, browser behavior, and provider requests remain unverified.

The graph update completed for all 33 changed TypeScript files. The existing graph cache remains uncommitted.

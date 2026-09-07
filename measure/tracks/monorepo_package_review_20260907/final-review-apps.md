# Final app review

Verdict: Accept the A1–A6 changes within the reviewed scope. No findings remain.

The reviewer inspected the current source changes and their tests. Other changes remain outside this review.
The review applied the global instructions, Primary instructions, Measure specification, original findings, and Ponytail Rules.

## Findings and resolution

The first review found a TypeScript call mismatch in the new Primary tests.
The tests supplied request arguments to handlers that accept no arguments.
The implementation agent removed those arguments and added database access assertions.
The reviewer inspected the correction and reran both suites successfully.

## Source evidence

| Finding | Reviewed behavior |
| --- | --- |
| A1 | Both role debug handlers return 404. They import no database module and perform no database operation. |
| A2 | The school debug handler returns 404. The handler no longer reads licenses or returns license keys. |
| A3 | The tutor route selects the configured authentication mode. Company mode uses cookie introspection and verified principal resolution. |
| A3 | Revoked sessions return 401. Introspection failures return a sanitized response. Company mode rejects legacy evidence. |
| A4 | The obsolete signup handler returns 410 without parsing credentials or writing accounts. The registration route retains its shared handler. |
| A5 | Text cells neutralize formula prefixes after leading whitespace, including CR/LF. Numeric cells retain their existing encoding. |
| A6 | The route validates File and scalar values before audio reads or provider calls. Numeric inputs require complete positive integer strings. |

The app registration test verifies handler wiring. It does not independently exercise shared registration authorization.
The changes reuse existing adapters and add no dependencies, migrations, hashes, or provider interfaces.

## Independent verification

Each command ran from the corresponding app directory with a 60-second timeout.

| App | Command | Result |
| --- | --- | --- |
| Primary | `node ../../node_modules/vitest/vitest.mjs run app/api/debug/init-roles/__tests__ app/api/debug/school/__tests__ --maxWorkers=1 --no-file-parallelism` | 4 tests passed |
| Reading | `node ../../node_modules/jest/bin/jest.js --runInBand app/api/auth/signup/route.test.ts app/api/auth/register/route.test.ts` | 2 tests passed |
| Codecamp | `node ../../node_modules/vitest/vitest.mjs run app/api/tutor/intervention/route.test.ts --maxWorkers=1 --no-file-parallelism` | 10 tests passed |
| Accounting | `node ../../node_modules/vitest/vitest.mjs run app/api/submissions/export/route.test.ts --maxWorkers=1 --no-file-parallelism` | 11 tests passed |
| Sales | `node ../../node_modules/vitest/vitest.mjs run app/api/roleplay-attempts/__tests__/audio-upload-boundary.test.ts --maxWorkers=1 --no-file-parallelism` | 8 tests passed |

All 35 tests passed across seven suites. The scoped `git diff --check` passed.
An initial Jest command used a missing app-local executable. The corrected root executable passed.

## Static checks and limits

The implementation agent reported successful focused ESLint checks for all changed app files.
The reviewer read `implementation-apps.md` and confirmed that its results match the reported checks and independent test results.
Accounting reported one existing unused `guardDenied` warning and zero errors.
Codecamp, Sales, and Accounting type checks passed.
Primary type checking timed out after 120 seconds without output.
Reading type checking exhausted the Node 2 GB heap after approximately 113 seconds.
These two app type checks remain unverified. The review does not claim that aggregate checks passed.

Graph Caller Check: Skipped. The graph dated September 3 was stale during the September 7 review.
The reviewer inspected the changed handler signatures and corrected test calls directly.
This review covers backend routes. It includes no browser checks, production requests, commits, or deployments.

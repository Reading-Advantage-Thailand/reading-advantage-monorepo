# Verification

## Turbo task behavior

A disposable fixture used the installed Turbo 2.9.18 binary and pnpm 11.8.0.
The fixture declared a build and a verification task that depends on that build.

- A successful build created its log and output.
- A cached build restored the deleted log without another build invocation.
- Verification read the restored log successfully.
- A build failure returned exit 19 and prevented verification execution.

The initial fixture lacked output exclusions and caused a cache miss.
Adding the repository-equivalent ignored output directories resolved that fixture issue.

Logs: `/tmp/architecture-turbo-restored.log` and `/tmp/architecture-turbo-failure.log`.

## Application checks

The full Science configuration passed 16 import and tenant tests across four files.
It used the isolated PostgreSQL database `science_architecture_test` on localhost port 55439.
The initial compatibility import exceeded five seconds; the rerun passed with a 15-second test timeout.

Log: `/tmp/architecture-science-import-tests-final.log`.

Science runtime: 145 files passed, one file skipped; 1,595 tests passed and one test skipped.
The run completed in 363.94 seconds.
Log: `/tmp/architecture-science-runtime.log`.

Auth: 31 files passed, three skipped; 312 tests passed and nine integration tests skipped.
Log: `/tmp/architecture-auth-tests.log`.

Affected authentication routes passed across three applications:

- Codecamp: 28 tests across six files.
- Sales: 35 tests across nine files.
- Marketing: 22 tests across three files.

Logs: `/tmp/architecture-<app>-auth-tests.log`.
The Domain database contract and teacher suites passed 40 tests across two files.
Log: `/tmp/architecture-domain-tests.log`.

The graph update completed successfully for 32 changed TypeScript files.
The mixed existing graph remains outside the scoped commits.

The Science production build and all 137 CI verification tests passed.
The verification suite contains 17 files and completed in 301.12 seconds.
Turbo completed 21 tasks successfully; 14 dependency builds used the cache.
The full command completed in 7 minutes, 58.513 seconds.
Log: `/tmp/architecture-science-verify.log`.
The new build log contains no previous Sales-related whole-project tracing warning.

The configuration suite passed 11 tests across four files.
Log: `/tmp/architecture-config-tests.log`.

Affected lint and type checks passed all 50 Turbo tasks; 25 tasks used cached results.
The completed task log records a duration of 5 minutes, 50.466 seconds.
The terminal session ended unexpectedly while its child process continued to successful completion.
Log: `/tmp/architecture-static.log`.

The Measure generator passed with local subprocess access.
Generated route facts remain unchanged because this track changes no routes.
Its temporary output is preserved under `/tmp/architecture-generated-*`.

Measure doctor initially rejected an old active directory for an archived audit track.
Its five generated files matched the canonical archived files byte for byte.
The root preserved those duplicates under `/tmp/architecture-preserved-audit-fixtures-20260908` and removed the stale active directory.
The audit test now uses a temporary directory and passes all 71 tests.

The Codecamp, Sales, and Marketing builds passed all 25 Turbo tasks; 17 tasks used cached results.
Log: `/tmp/architecture-app-builds.log`.

The final Science verification passed 138 tests across 17 files.
Turbo completed all 21 tasks; 15 tasks used cached results.
The verification tests completed in 44.74 seconds after one compiler invocation.
The full command completed in 3 minutes, 30.248 seconds.
Log: `/tmp/architecture-science-verify-final.log`.
These durations include different cache states and do not constitute a controlled benchmark.

The final Science lint passed with zero errors and 16 existing warnings.
Log: `/tmp/architecture-science-lint-final.log`.

A second graph update covered 14 changed TypeScript files.
The scoped Measure marker check and review truthfulness check passed.
Global Measure checks still flag pending markers in eleven unrelated active tracks.
The catalog checks pass after duplicate fixture cleanup.
Astra accepted the existing candidate manifest refresh.
The normal architecture command accepted the manifest and retained default V1 policy.
It then reported 27 file-read errors from pre-existing Games deletions.
All 27 paths appear in the captured baseline status.
The command exited unsuccessfully; this report does not claim a clean global architecture check.
Log: `/tmp/architecture-boundary-check-final.log`.

The isolated baseline and final source comparisons each contain 637 findings and eight parse errors.
No new semantic findings appeared.
Four existing findings moved by one line.
The frozen V2 comparison retains 78 additions, one removal, and 48 renames.
Candidate status, empty reviews, empty baseline deltas, and frozen artifacts remain unchanged.

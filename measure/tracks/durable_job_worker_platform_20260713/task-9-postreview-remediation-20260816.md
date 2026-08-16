# Task 9 Post-Review Remediation — 2026-08-16

## Source

Source commit: `92f13c06cc2f026272103b0fd66681d7074d688d`.

The adapter parses verifier output with the strict replay evidence schema before
it opens a transaction. Invalid evidence cannot mutate a job or create an audit
row.

The JSON-safe contract rejects non-finite numbers, undefined values, dates,
bigints, functions, symbols, cycles, and class instances. Valid JSON values
retain their original type and content.

The repair test fake now implements `postgres.js` JSON parameters. It also
matches the current enum cast and retry query shape. These are compatibility
updates to the test double, not changed production assertions.

## Verification

- `task9-postreview-security.test.ts` and
  `postgres-adapter-repair-contract.test.ts`: 7/7 passed.
- Safe Task 9 command: 1 passed and 18 skipped.
- Disposable PostgreSQL 16 Task 9 command: 19/19 passed.
- Cleanup query returned 0 scratch databases. The disposable container was
  removed.
- Direct test TypeScript and Prettier checks passed.
- `pnpm --filter @reading-advantage/backend lint` attempted a root dependency
  install and timed out during unavailable registry downloads.
- `bash measure/doctor.sh` failed on existing deprecated `[ ]` markers in other
  tracks. This remediation did not edit those tracks.
- Serialized graph refresh remains pending orchestration support.

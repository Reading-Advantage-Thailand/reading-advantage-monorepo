# Data package failure review

This review inventories every failing file in the supplied logs. The domain and webhooks logs end before their final summaries.
Implementation files remain unchanged.

## Confirmed causes and repairs

- Domain reset fails on Sales Mastery append-only triggers. A focused host-proof run reproduced all nine failures.
- Later host-proof cases fail with duplicate school IDs because the failed reset retains fixtures.
- `packages/domain/src/__tests__/helpers/testDb.ts` excludes only the two successor registry tables.
- Migration 0053 adds three immutable Sales Mastery tables. Migration 0052 also adds immutable audit tables.
- Repair the fixture lifecycle while preserving immutable production triggers. Check cascading foreign keys before expanding reset exclusions.
- The DB mastery adversarial suite uses its own reset. It truncates the successor registry and fails before ten test bodies.
- Domain Vitest discovers compiled tests under `dist`. Restrict discovery to source tests and exclude generated output.
- Domain mastery, games, and phase-4 suites use the same PGlite harness. Their DATABASE_URL warning does not establish an external database requirement.
- The compiled activity integration failures require another focused run after source discovery and reset repairs.

- DB journal and wave2 checks report missing sentinel probes for 0050, 0054, 0055, and 0056.
- Add probes that reflect the current physical schema. Migration 0050 creates finance tables and functions. Migration 0056 later drops the finance tables.
- DB phase1 and phase2 snapshots still expect 27 schema files and 52 migrations. The current directories contain 28 and 57.
- Their lists reference removed `finance-operations.ts` and omit `jobs.ts` and `sales-mastery.ts`.
- Phase3 expects exactly 52 journal entries. Update snapshot scope against the governing contract, or assert the historical prefix explicitly.
- Sales progress incorrectly requires migration 0039 to remain the final journal entry. Find that entry by tag instead.
- Company identity boundary tests reject the added `default` export condition. Verify required conditions without rejecting compatible conditions.
- Company organization metadata omits `company_organizations_single_active_internal_company`. Include the implemented unique index in the expected contract.
- Backend scaffold expectations omit `./accounting`. Update the expected public entrypoints after checking the accounting module contract.
- Backend durable architecture expects two exceptions. The loaded v1 configuration has only the review-jobs schema exception.
- The v2 configuration contains both exceptions. Resolve the intended configuration before changing an exception assertion.

## Correction: migration 0052

The initial message incorrectly described 0052 as missing separators generally. The file already contains many statement separators.
The recorded test reports nine consecutive DDL pairs without separators. Its scanner requires inspection before any migration edit.
This evidence does not prove a production migration failure. Preserve the migration until the parser and runner behavior establish a defect.

## Environment and subprocess limits

Company identity PostgreSQL suites require `COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL` and disposable databases.
Topology tests also require transaction-mode PgBouncer on port 6432. Bootstrap tests require Docker or Podman.
These tests provide no behavioral verdict because setup fails. Their complete file inventory follows below.

DB migration-ceiling tests fail because tsx cannot create its IPC socket: `listen EPERM`.
Use a permitted runtime invocation, such as Node with the tsx import loader, before evaluating the migration assertion.

DB environment subprocess tests time out after five seconds. Their own child deadline is ten seconds.
Their exit listener can also finish before captured streams close. Wait for `close` and align deadlines before attributing failures to production guards.
The package ESM subprocess reports status zero with empty output. A direct native Node import succeeds and prints `imported`.
The nested Accounting guard command similarly captures no diagnostic. Its `pnpm` child needs direct reproduction and reliable output collection.

Webhooks closeout tests require Git notes on the latest commit touching an archived track.
Later documentation commits can change that selection. Check the actual closeout commit and note availability before modifying historical evidence.

## Webhook mock investigation

The original worker identity case times out. Three supersession cases time out, and one executes the real domain review-ID validator.
A focused run produced six failures: five timeouts and one real UUID validation error.
The test mocks `@reading-advantage/domain/codecamp`, but the worker uses a dynamic import of that package.
The stack reaches `packages/domain/dist/codecamp/pr-review-attempts.js` and rejects the fixture ID `review-1`.
Repair module resolution or mock interception first. Replacing the fixture ID alone would still permit unintended real domain execution.
The identity fixture also omits a current-claim seam and complete lease identity. Reevaluate it after restoring mock interception.

## Focused commands and results

Commands ran from the named package directories.

```sh
# packages/domain: 9 failed; reset trigger and subsequent duplicate fixture errors
node ../../node_modules/vitest/vitest.mjs run src/__tests__/games-host-proof-live.test.ts --maxWorkers=1
# packages/webhooks: 6 failed, 2 passed
node ../../node_modules/vitest/vitest.mjs run src/__tests__/incident-review-worker-identity.test.ts src/__tests__/incident-review-worker-supersession.test.ts --maxWorkers=1
# packages/db: 5 failed, 3 passed
node ../../node_modules/vitest/vitest.mjs run src/__tests__/env-guards.test.ts src/__tests__/package-esm-smoke.test.ts src/__tests__/main-journal-accounting-guard.adversarial.test.ts --maxWorkers=1
# Repository root: exit 0; prints imported
node --input-type=module -e 'await import("./packages/db/dist/index.js"); console.log("imported")'
```

Logs: `/tmp/resume-domain-direct.log`, `/tmp/resume-webhooks-direct.log`, and `/tmp/resume-db-direct.log`.
Initial pnpm invocations produced empty logs while running. Direct Node invocations completed and supplied the results above.
`build-graph inspect ./graph.db processJob` inspected the worker before source review.

## Complete recorded failing-file inventory

Counts describe the supplied run. They exclude unreported cases after truncated logs.

### packages/db

- src/__tests__/mastery-persistence-tenant-adversarial.test.ts (11 tests | 10 failed) 21903ms
- src/company-identity/__tests__/local-bootstrap.integration.test.ts (2 tests | 2 failed) 2934ms
- src/__tests__/env-guards.test.ts (4 tests | 3 failed) 17147ms
- src/company-identity/__tests__/schema-metadata.test.ts (79 tests | 1 failed) 2165ms
- src/__tests__/drizzle045-phase2-contracts-adversarial.test.ts (30 tests | 4 failed) 1029ms
- src/company-identity/__tests__/boundary-exports.test.ts (3 tests | 1 failed) 249ms
- src/__tests__/drizzle045-phase1-contracts-adversarial.test.ts (29 tests | 5 failed) 63ms
- src/__tests__/journal-integrity.test.ts (9 tests | 1 failed) 57ms
- src/__tests__/drizzle045-phase3-integration-gates.test.ts (12 tests | 1 failed) 48ms
- src/__tests__/sales-progress-activity-schema.test.ts (1 test | 1 failed) 19ms
- src/company-identity/__tests__/constraints.integration.test.ts (11 tests | 11 failed) 28ms
- src/company-identity/__tests__/privileges-audit.integration.test.ts (7 tests | 7 failed) 19ms
- src/__tests__/wave2-migration-seed-governance.test.ts (2 tests | 1 failed) 30ms
- src/company-identity/__tests__/connection-topology.integration.test.ts (6 tests | 6 failed) 17ms
- src/company-identity/__tests__/bootstrap.integration.test.ts (1 test | 1 failed) 12ms
- src/company-identity/__tests__/rollback.integration.test.ts (1 test | 1 failed) 13ms
- src/company-identity/__tests__/migration-fresh.integration.test.ts (1 test | 1 failed) 15ms
- src/company-identity/__tests__/product-isolation.integration.test.ts (1 test | 1 failed) 11ms
- src/company-identity/__tests__/migration-upgrade.integration.test.ts (1 test | 1 failed) 15ms
- src/company-identity/__tests__/secret-persistence.integration.test.ts (1 test | 1 failed) 16ms
- src/__tests__/main-journal-accounting-guard.adversarial.test.ts (1 test | 1 failed) 3254ms
- src/__tests__/package-esm-smoke.test.ts (3 tests | 1 failed) 1811ms
- src/__tests__/migration-ceiling-adversarial.test.ts (10 tests | 1 failed) 221ms

### packages/backend

- src/jobs/__tests__/durable-job-architecture.red.test.ts (2 tests | 1 failed) 1478ms
- src/modules/company-identity/__tests__/postgres-admin-safety.integration.test.ts (3 tests | 3 failed) 46ms
- src/modules/company-identity/__tests__/postgres-company-scope.integration.test.ts (2 tests | 2 failed) 22ms
- src/__tests__/package-scaffold.test.ts (1 test | 1 failed) 29ms

### packages/domain

- src/__tests__/phase-4-adversarial.test.ts (61 tests | 27 failed) 87792ms
- dist/activity/__tests__/activity-drizzle-integration.test.js (4 tests | 2 failed) 16041ms
- src/__tests__/games-host-proof-live.test.ts (9 tests | 9 failed) 14119ms
- src/__tests__/mastery-persistence-drizzle-adversarial.test.ts (17 tests | 17 failed) 28746ms
- src/__tests__/mastery-persistence.drizzle.test.ts (13 tests | 11 failed) 39030ms
- src/__tests__/games-live.test.ts (5 tests | 5 failed) 42105ms

### packages/webhooks

- src/__tests__/phase-7-closeout.test.ts (16 tests | 3 failed) 1980ms
- src/__tests__/incident-review-worker-identity.test.ts (1 test | 1 failed) 5070ms
- src/__tests__/incident-review-worker-supersession.test.ts (7 tests | 4 failed) 15453ms


## Orchestrator sentinel review

A sentinel must distinguish the migration from its preceding schema state.
An unrelated accounting table cannot prove that migration 0050 or 0056 ran.
Use a surviving artifact from 0050 and verify the table removals from 0056.

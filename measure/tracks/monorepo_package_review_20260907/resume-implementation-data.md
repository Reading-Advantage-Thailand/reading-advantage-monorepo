# Data package implementation report

## Scope

This implementation covers `packages/db`, `packages/domain`, `packages/backend`, and `packages/webhooks`.

It addresses each confirmed cause from `resume-review-data.md`.

No production migration changed. No production immutable trigger changed. No hash changed.

The implementation did not add or edit Git notes.

## Domain fixture lifecycle

- The PGlite reset preserves both global successor registry tables.
- The reset reuses `TEST_DB_APPEND_ONLY_TABLES` for that exclusion.
- The reset disables user triggers only for fixture-owned immutable audit and Sales Mastery tables.
- The reset truncates fixture data and restores each disabled trigger in a `finally` block.
- This lifecycle preserves global release evidence and production trigger definitions.
- The DB mastery fixture uses the same lifecycle.
- Current Mastery fixtures now include required `mastery_principals` rows.
- Domain Vitest excludes `dist` and `node_modules` test output.

Validation:

- The host-proof suite passes 9 of 9 tests.
- The DB Mastery adversarial suite passes 11 of 11 tests.
- The public Mastery API and host-proof batch passes 18 of 18 tests.
- Domain TypeScript validation passes.
- Domain test discovery contains no `dist` test path.

## Webhook worker contracts

- The worker uses a static Codecamp domain namespace import.
- Vitest now intercepts the domain mock before worker execution.
- The identity fixture supplies `claimedBy`, `deliveryId`, and `isCurrentClaim`.
- The identity suite passes 1 of 1 test.
- The supersession suite passes 7 of 7 tests.
- Webhooks TypeScript validation passes.

The full webhooks suite has 237 passing tests and 3 skipped tests.

The closeout test previously inspected the latest documentation commit.

It now inspects archive move commit `7c9bef80c513a1a80b12e020b963f592045c8884`.

The commit adds the archived path and deletes the active path.

The local `refs/notes/commits` tree contains no note for that commit.

It also contains no note text with the track identifier or resolving commit `3dc3167a`.

The archived plan says the note was attached. Local Git objects do not supply that evidence.

The configured origin fetch rule includes branches only. It does not fetch Git note references.

The implementation preserves this evidence failure. It does not fabricate historical notes.

## DB subprocess behavior

- Child probes now use `process.execPath` when Node is the required runtime.
- Child probes resolve after `close`, so stdout and stderr are complete.
- Child and suite deadlines now agree.
- The migration ceiling invokes Node with the installed `tsx` loader.
- The Accounting journal guard invokes the installed Vitest entry directly.
- The subprocess batch passes 18 of 18 tests outside the restricted sandbox.

The Mastery public API test now invokes the installed TypeScript entry directly.

Its nine public API tests pass outside the restricted sandbox.

## Schema and package snapshots

- The DB snapshots retain their audited historical lists.
- Current filesystem assertions use 28 schema files and 57 migrations.
- The current schema list includes `jobs.ts` and `sales-mastery.ts`.
- The current schema list excludes removed `finance-operations.ts`.
- Phase 3 expects journal entries through migration 0056.
- The Sales progress test finds migration 0039 by tag.
- The company identity boundary accepts a compatible default export condition.
- Company organization metadata includes the active internal-company unique index.
- The backend scaffold includes the public Accounting entrypoint.
- The corrected static DB batch passes 138 of 138 tests.

The migration 0052 separator scanner remains skipped after review.

The migration contains valid role-scoped SQL batches. The production runner executes each full migration script.

## Durable architecture

The architecture test loads the governing v2 ownership configuration.

It preserves both documented exceptions and requires zero tenant registry findings.

The architecture suite passes 2 of 2 tests outside the restricted sandbox.

Backend TypeScript validation passes for production and test configurations.

The full backend run initially reported five fixture preflight failures.

A persistent review database had matched the disposable database prefix. Renaming that database removed the conflict.

Both PostgreSQL backend files then pass 5 of 5 tests.

All 556 executed backend tests now pass. The suite still skips 51 configured cases.

The 51 backend skips require explicit live PostgreSQL configuration:

- 33 durable-job cases require the PostgreSQL 16 integration opt-in.
- 8 kernel idempotency cases require `PG_TEST_URL`.
- 6 successor admission cases require `PG_TEST_URL`.
- 4 company identity cases require a company identity integration URL.

No exact case from this optional set ran separately in this assignment.

The five separate backend PostgreSQL cases cover administrator safety and organization scope.

## Migration sentinels

- Migration 0050 uses `public.finance_records_validate_supersession()` as its surviving sentinel.
- Migration 0054 uses the surviving `accounting_submissions` table.
- Migration 0055 uses the surviving `accounting_submission_audit_events` table.
- Migration 0056 requires `accounting_submissions` to remain present.
- Migration 0056 also requires both retired finance tables to be absent.
- The sentinel evaluator supports explicit `table_absent` probes.
- The migration doctor uses the shared table evaluator.

The journal and Wave 2 sentinel batch passes 12 of 12 tests.

A real PostgreSQL test checks both 0056 absence probes before and after the migration.

Both probes fail before 0056 and pass after 0056. The surviving Accounting table remains present.

No migration content changed.

## Company identity integration

- The scratch harness accepts any valid loopback TCP port.
- Direct URLs retain the configured administration port.
- Runtime URLs still require PgBouncer port 6432.
- The topology test no longer requires a preexisting product database.
- The direct-port assertion follows the configured administration port.
- The constraint fixture permits only one active internal company.
- Product isolation uses the administrator for role-owning product migrations.
- Product isolation includes both surviving Accounting tables in the physical catalog.
- Rollback accepts an explicit PostgreSQL container for backup tools.
- Local bootstrap runs `pg_dump` inside each matching disposable container.

Validation:

- Topology and sentinel integration passes 7 of 7 tests.
- Fresh migration passes 1 of 1 test.
- Constraints pass 11 of 11 tests.
- Privilege audit passes 7 of 7 tests.
- Product isolation passes 1 of 1 test.
- Rollback passes 1 of 1 test.
- Local bootstrap passes 2 of 2 tests.
- The remaining company identity batch passes 22 of 24 tests before the two focused repairs.
- Both repaired tests pass in their focused reruns.

## Full DB result and skip inventory

The full DB run reported 1,165 passing tests, one failure, and 49 skipped tests.

The only failure was the host `pg_dump` lookup. The focused local-bootstrap rerun passes after the container-tool repair.

Therefore, every executed DB test passes after the focused repair.

None of the 49 skipped cases ran in a separate PostgreSQL command.

Separate commands covered company identity tests, which do not form this skip set.

The 49 cases remain gated by `PG_TEST_URL`, `DATABASE_URL`, or the durable-job integration flag.

The gated files are:

- `stale-ledger.test.ts`
- `standard-pack-successor-admission-persistence-store.integration.test.ts`
- `sales-legacy-source-role-repair.real-db.test.ts`
- `sales-mastery-tenant.integration.test.ts`
- `phase-2-insert-roundtrip.test.ts`
- `codecamp-0049-historical-ledger-gap.test.ts`
- `sales-phase2-review-a-durable.red.test.ts`
- `company-product-principal-0042.real-db.test.ts`
- `durable-jobs-schema-pg16.red.test.ts`
- `codecamp-exercise-quiz-repair-0049.real-db.test.ts`
- `ledger-doctor.test.ts`
- `fresh-migration.integration.test.ts`
- `codecamp-principal-0043.real-db.test.ts`
- `sales-phase2-transaction-atomicity.red.test.ts`

These tests need a dedicated product database or their explicit PostgreSQL 16 integration flag.

DB TypeScript validation passes. `git diff --check` passes.

## Domain contract reconciliation

The full domain run reported 823 passing tests, four failing tests, and 16 skipped tests.

Nine skips came from the failed public API setup. Its focused rerun now passes all nine tests.

The four stale behavior tests now follow their governing contracts:

- The curriculum test expects release after all named human reviews are approved.
- The Sales test temporarily accepted the legacy constructor from a stale source comment.
- The later trust repair superseded that mistake and removed the public legacy mode.
- The tutorial fixture supplies the current manifest and deterministic result contracts.
- The APK approval test uses the trusted deterministic approval command.

The corrected domain batch passes 13 of 13 tests.

Seven optional domain cases remain skipped:

- Five DSAR cases require `DATABASE_URL` for the documented Science test database.
- One company principal case requires the company identity real-database opt-in.
- One Sales roleplay concurrency case requires `RUN_SALES_REAL_DB_TESTS=true`.

No exact case from this optional set ran separately in this assignment.

The other nine reported skips pass in the focused public API rerun.

The implementation preserves the trusted evidence and tenant guard behavior.

## Preserved evidence

- The successor registry rows remain global release evidence.
- The production immutable triggers remain enabled outside reset cleanup windows.
- The v1 durable architecture contract remains unchanged.
- The v2 architecture test uses its documented exception set.
- Historical migration lists remain historical evidence.
- Migration 0052 remains byte-for-byte unchanged.
- Migrations 0050 through 0056 remain byte-for-byte unchanged.
- The webhook closeout Git-note requirements remain unchanged.

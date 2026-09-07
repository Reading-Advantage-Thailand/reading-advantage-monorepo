# CI database review

## Resolved High: Provide the Science test database

The root CI workflow declares no PostgreSQL service, database startup step, or database environment.
No other workflow or invoked setup script supplies that database.

The root test command runs Turbo's package tests.
Science's default Vitest configuration always runs its integration global setup.
That setup migrates the resolved test database before tests start.
The default connection targets `localhost:5432/science_advantage_test`.
The migration script migrates an existing database; it does not create the PostgreSQL service or database.
CI therefore cannot complete the required Science test gate as configured.

## Minimum correction

Add a PostgreSQL job service using the existing `postgres:16-alpine` version.
Create `science_advantage_test` through `POSTGRES_DB`.
Set the service user and password to `postgres`.
Map port 5432 to the runner.
Use `pg_isready` for the service health check.

Set the job's `DATABASE_URL` to `postgresql://postgres:postgres@127.0.0.1:5432/science_advantage_test`.
The existing Turbo configuration passes `DATABASE_URL` to package tasks.
The `_test` suffix prevents Science from deriving a second database name.
Science's global setup can retain responsibility for its migrations.
No test exclusion or migration bypass is needed.

## Build environment

The same `DATABASE_URL` supplies database configuration to build subprocesses.
The shared database client permits absent configuration during the recognized Next.js build phase.
An explicit URL also avoids environment-dependent PostgreSQL defaults.

Science's central environment schema does not require AI credentials at module initialization.
Reading's central environment schema uses optional credential values.
Accounts validates its identity configuration lazily during identity composition.
This bounded source review found no additional unconditional build credential requirement in those paths.
The running workspace build remains the final check for other build requirements.

## Verification limits

The review inspected both existing workflow files and their invoked root commands.
It inspected Science's default configuration, database resolver, global setup, and migration launcher.
It inspected the shared database client and selected application environment modules.
The review ran no database process, migration, build, or test suite.


## Correction review

The workflow now provides a `postgres:16-alpine` service and a matching job-level database URL.
The service creates `science_advantage_test`, maps port 5432, and includes a `pg_isready` health check.
A parsed YAML check confirmed matching database names, credentials, and port configuration.
The database name retains the `_test` suffix expected by Science.
The existing Turbo configuration passes the URL through `globalEnv`.
The correction preserves the complete test command and Science migration setup.
The High finding is closed.
No hosted CI run or database startup ran during this review.

The added Science CI assertions check the service image, database, credentials, port mapping, health check, and job-level URL.
They retain the existing build, lint, type-check, and test requirements.
The implementation agent reported six passing focused CI assertions.

## Expanded Company Identity fixture review

The expanded fixture is accepted.
No new finding appeared in the bounded source review.

The administrator URL targets the local `/postgres` database required by the scratch database helper.
The Test step supplies the actual PostgreSQL service container ID.
The rollback helper uses that value with `docker exec`, so it does not require a separate Compose container.

PgBouncer connects to the `postgres` service through the job's service network.
The runner reaches the pool through mapped port 6432.
The pool uses transaction mode, as the topology tests require.
The wildcard database mapping accommodates temporary scratch databases.

The YAML parser confirms that the dynamic auth query retains literal `$1`.
GitHub service environment values do not use Compose's dollar escaping.
The query resolves temporary PostgreSQL users instead of replacing them with one static runtime identity.
The authentication user supplies the privilege needed to read the catalog password data.

The listen variable matches the pinned-image result recorded in the track verification report.
The service health check uses the PgBouncer administrative database and the installed `psql` command.

Turbo's test environment explicitly declares both Company Identity fixture variables.
The existing global environment already includes `DATABASE_URL`.
The variables therefore survive strict environment filtering for the test tasks.
The added Phase 13 assertions preserve those requirements and all existing gate commands.

The implementation agent reported eight passing focused guards and a successful strict-mode dry run.
This review independently parsed the workflow and checked the consuming test helpers.
It ran no container, migration, hosted workflow, or heavy test command.

## Local scratch URL diagnosis

The later bootstrap failure came from the local invocation's `postgres://` protocol.
The scratch helper preserves that protocol when it derives the migration and runtime URLs.
The production connection validator requires `postgresql://`.
The generated scratch database name and role both match the validator's approved patterns.
A light URL check confirmed that only the protocol predicate fails.

Use `postgresql://` for the local administrator URL.
CI already uses that protocol.
No source change or broader connection contract is required for this failure.
The parent owns the corrected integration retry.

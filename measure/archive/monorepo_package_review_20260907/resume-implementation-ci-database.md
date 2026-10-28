# CI database fixture implementation

Date: 2026-09-08

## Result

The workspace CI job now starts isolated PostgreSQL and PgBouncer services.

The service creates `science_advantage_test` with the local `postgres` credentials.

The runner maps port 5432 and waits for `pg_isready` before steps start.

The job supplies this database URL to every Turbo gate:

```text
postgresql://postgres:postgres@localhost:5432/science_advantage_test
```

The existing build, lint, type, generator, cold-start, and test gates remain unchanged.

The Company Identity suites receive an admin URL for the disposable `/postgres` database.

The rollback suite receives the PostgreSQL service container ID in the Test step.

PgBouncer uses transaction mode on port 6432.

Its dynamic auth query preserves temporary role identities during permission tests.

The test task allows both required fixture variables through Turbo strict environment filtering.

Optional backend integration URLs remain unset.

## Validation

The focused Phase 13 workflow guards passed eight tests. Thirteen unrelated tests were skipped.

The command used the database-free unit configuration and one worker.

The `yaml` parser confirmed both services, the dynamic auth query, and the Turbo configuration.

A Turbo dry run confirmed both fixture variables reach the database test task in strict mode.

Commands:

```text
node ../../node_modules/vitest/vitest.mjs run --config vitest.unit.config.ts lib/ci-gates/phase-13-final-acceptance.test.ts -t "regression guards" --maxWorkers=1 --no-file-parallelism
node --input-type=module -e '<workflow and Turbo configuration parser>'
env COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres COMPANY_IDENTITY_TEST_POSTGRES_CONTAINER=fixture-container node node_modules/turbo/bin/turbo test --filter=@reading-advantage/db --dry=json --no-daemon
git diff --check -- .github/workflows/ci.yml turbo.json apps/science-advantage/lib/ci-gates/phase-13-final-acceptance.test.ts measure/tracks/monorepo_package_review_20260907/resume-implementation-ci-database.md
```

No remote workflow or heavy workspace gate ran.

## Changed files

- `.github/workflows/ci.yml`
- `apps/science-advantage/lib/ci-gates/phase-13-final-acceptance.test.ts`
- `turbo.json`
- `measure/tracks/monorepo_package_review_20260907/resume-implementation-ci-database.md`

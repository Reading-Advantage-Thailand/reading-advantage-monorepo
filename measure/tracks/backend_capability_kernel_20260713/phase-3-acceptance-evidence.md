# Phase 3 acceptance evidence

## Scope and identifiers

- Immutable `phase_base_sha`: `c1effc467109e6890907580ff0075919ab4267cd`
- Green implementation commit: `316bbe193`
- Historical Red commit: `569f4f2143810c403e2a15d1ea405cc64a933209`
- Red ancestry check: `569f4f214` is an ancestor of `phase_base_sha`.

The historical Red commit is outside `phase_base_sha..HEAD` because the phase
base follows the committed strategy evidence. The ancestor check preserves the
Red contract provenance.

## Green kernel proof

```bash
PG_TEST_URL=postgres://postgres:postgres@localhost:5432/postgres \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run src/kernel/__tests__
```

Result: 10 test files passed and 165 tests passed. No test skipped.
The PostgreSQL 16 container was `measure-audit-pg` using `postgres:16`.

The integration migration lookup now resolves from `import.meta.url`.
The same proof no longer depends on the working directory.

## Coverage evidence

```bash
PG_TEST_URL=postgres://postgres:postgres@localhost:5432/postgres \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run src/kernel/__tests__ --coverage
```

Result: 10 test files passed and 165 tests passed.
Kernel aggregate coverage was 95.48% statements, 92.76% branches, 100% functions,
and 95.46% lines. Every reported `src/kernel/**` file has at least 80% line coverage.
The added coverage regression tests cover request-context isolation and projection
rejection paths.

## Required focused subsets

`capability-idempotency-schema.test.ts`: 1 file and 2 tests passed.
`tenant-coverage.test.ts`: 1 file and 12 tests passed.

## R2 disposition: backend type gate

`pnpm --filter @reading-advantage/backend exec tsc --noEmit` passed.
`tsc --noEmit -p tsconfig.test.json` failed outside kernel scope.

The exact non-kernel source groups are:

- `src/modules/standard-pack-ingestion/__tests__/ledger-successor-admission-facade.playkit-lifecycle.test.ts`
  and 11 imported `packages/advantage-play-kit/src/assets/*` files: TS6059 rootDir.
- `src/modules/company-identity/__tests__/finance-task3-review-b.red.test.ts`:
  three TS2322 errors.
- `src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts`:
  one TS2345 error.
- `src/modules/planned-game-intake/__tests__/contracts.test.ts`:
  two TS2345/TS2322 errors.

These paths are outside the lease. The backend package owner must resolve them.

## R3 and R4 dispositions

`pnpm --filter @reading-advantage/db test` did not finish inside the first
120-second command limit. Before termination it showed unrelated migration,
Company Identity integration, durable-job, and schema-drift failures.
The kernel schema subset passed.

`pnpm --filter @reading-advantage/domain test` exited 1. Its failures include
`src/activity/__tests__/activity-drizzle-integration.test.ts`, its duplicate
`dist/activity` output, mastery persistence suites, and
`src/__tests__/phase-4-adversarial.test.ts`. The output reports live database
state collisions and the Finance append-only truncate guard. The kernel tenant
subset passed.

## R5 architecture disposition

`pnpm architecture:check` exited 1 with 137 new architecture debt additions.
The listed additions are outside the kernel lease.
`pnpm architecture:baseline:validate` exited 1 because
`measure/tracks/backend_architecture_enforcement_20260713/reconciliation-denominator-diff-audit.md`
is absent. The baseline tool cannot compare this phase.

## Doctor disposition

`bash measure/doctor.sh` exited 1. It reports deprecated `[ ]` task markers in
other active tracks. This track did not add those markers.

## Acceptance status

R1 is closed by the recorded coverage proof.
R6 and R7 records now exist, but R6 awaits owner acceptance.
R2, R3, R4, and R5 remain open. Phase 3 is not accepted.

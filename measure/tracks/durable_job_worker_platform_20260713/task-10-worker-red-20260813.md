# Task 10 Red Worker Lifecycle and Architecture — 2026-08-13

## Scope and status

This note records producer evidence for Task 10. The task remains `[~]` in
`plan.md`. The plan was not edited because the leased paths exclude it.

The phase base is `33d44fc81b84559c2ab7a48acfaf86554bf017a5`.
The role base is `2e476d76e419eb9d2b31c3298ba3f98d79c5a061`.
Both hashes resolve to commits. The role base is not the phase base.

The Red tests own these contracts:

- typed handler registration rejects duplicates and invalid schemas;
- startup parsing validates queue, worker, concurrency, polling, lease, and drain settings;
- one poll uses a bounded claim and handler concurrency;
- readiness opens after start and closes during SIGTERM drain;
- structured logs include correlation data without payload or provider secrets;
- persisted failures include only `code` and `safeSummary`;
- one declared polling scope binds claim and reclaim requests;
- each accepted envelope matches the declared polling scope;
- handler, heartbeat, settlement, and failure requests use the accepted envelope scope;
- a scope mismatch fails before handler execution;
- worker composition uses only the lifecycle job port;
- worker production source has no DB, schema, SQL, or job-table access;
- queue persistence signals stay under `packages/backend/src/jobs/adapters/postgres/`.

## Dirty-path classification

The two untracked worker Red tests were relevant leased work. Existing
`.opencode/**`, report, result, lockfile, and other-track paths were unrelated
user work or generated/ignorable output. All existing dirty paths were preserved.

## Red command

```text
CI=true pnpm --filter @reading-advantage/worker exec vitest run src/__tests__/worker-lifecycle.red.test.ts src/__tests__/worker-architecture.red.test.ts
```

Result: exit 1. The suite collected 11 tests. It reported 7 failed and 4
passed. The lifecycle file reported 6 expected failures. The architecture file
reported 1 expected failure and 4 passing static guards.

Every failure names the absent `services/worker/src/worker-composition.ts`
module. No failure names a database, harness, import transform, or unrelated
runtime defect.

## Tenant-scope amendment — 2026-08-14

The original 11-test result remains historical evidence for its exact source.
The later amendment corrects the polling-scope fixture.

The default Codecamp path now uses a global job and a global polling scope.
A separate tenant case supplies an explicit tenant polling scope.
It uses the accepted envelope scope for each lifecycle request.
A mismatch fails before handler execution.

The amended two-file suite collected 14 tests.
Nine tests failed only because `worker-composition.ts` is absent.
Five static architecture guards passed.

The installed TypeScript compiler and scoped ESLint check passed.
The exact worker-test diff check passed.
Task 10 remains `[~]` until Green and a fresh independent review pass.

The file `task-10-independent-review-result-20260813.json` reviews the earlier
11-test source at `22b4959`. It is historical and does not accept this amendment.

## Supporting gates

The existing Task 1 worker baseline passed:

```text
CI=true node node_modules/vitest/vitest.mjs run services/worker/src/__tests__/startup-config.test.ts services/worker/src/__tests__/health-server.test.ts services/worker/src/__tests__/oci-contract.test.ts --coverage --coverage.include='services/worker/src/{startup-config,health,oci-contract}.ts' --coverage.reporter=text
```

Result: exit 0. The suite reported 31 passed and 0 failed. Coverage was
98.94% statements, 90.90% branches, 100% functions, and 100% lines.

Focused worker typecheck and lint passed:

```text
pnpm --filter @reading-advantage/worker check-types
pnpm --filter @reading-advantage/worker lint
```

The exact leased-path diff check passed:

```text
git diff --check -- services/worker/src/__tests__/worker-lifecycle.red.test.ts services/worker/src/__tests__/worker-architecture.red.test.ts measure/tracks/durable_job_worker_platform_20260713/task-10-worker-red-20260813.md measure/tracks/durable_job_worker_platform_20260713/orchestration/phase2-task10-mid-red-role.log
```

## Handoff

The Green role must add the missing worker composition module. It must satisfy
the lifecycle contracts without adding direct persistence access to the worker.
The architecture guards must remain passing. Task 10 must remain `[~]` until
Green and independent review provide evidence.

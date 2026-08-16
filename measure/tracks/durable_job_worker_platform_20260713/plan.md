# Implementation Plan: Durable Job Worker Platform

## Dependencies and sequencing

Durable contract/test work that writes under `packages/backend/src/jobs/` starts
only after architecture-enforcement acceptance and the explicitly accepted
Backend Capability Kernel Task 1 `packages/backend` package-scaffold gate. Once
that structural gate passes, durable Phases 1–4 and Kernel Tasks 2 onward may
run concurrently; the executor is not a prerequisite. Phase 5 Task 18 remains
blocked until `backend_capability_kernel_20260713` publishes its fully accepted
public API.

## Phase 1: Existing Behavior Contract and Generic Schema

- [x] Task 1: Scaffold `services/worker` as `@reading-advantage/worker`: register `services/*` in `pnpm-workspace.yaml`, add package manifest/exports, build/lint/test/check-types/dev/`validate:oci` scripts, tsconfig, source/test roots, Turbo task compatibility, and provider-neutral OCI/health bootstrap before filtered commands run.
  - Evidence (2026-07-22; accepted parent-orchestrator scope): initial Red run failed all three suites on absent `startup-config`, `health`, and `oci-contract` modules; subsequent Docker Red cycles reproduced absent/overbroad build-context handling, hoisted-linker risk, non-deterministic package build invocation, and pnpm 11 non-injected deploy rejection.
  - Green: `CI=true node node_modules/vitest/vitest.mjs run services/worker/src/__tests__/startup-config.test.ts services/worker/src/__tests__/health-server.test.ts services/worker/src/__tests__/oci-contract.test.ts --coverage --coverage.include='services/worker/src/{startup-config,health,oci-contract}.ts' --coverage.reporter=text` passed 18/18 tests at 98.82% statements, 89.79% branches, 100% functions, and 100% lines.
  - Green: filtered Turbo `lint test check-types build` passed for `@reading-advantage/worker`; direct ESLint, TypeScript no-emit/build, dual-target `validate:oci`, architecture check, and `git diff --check` passed.
  - Image/runtime: local Podman 4.9 required the explicit equivalent `--ignorefile services/worker/Dockerfile.dockerignore`; the no-layer build produced image `sha256:159913bb9e8e7e04f1b5e38795dd312fbbed6ba6d54a6f7eeb5d33b05d6ddbdf` (169 MB, non-root `node`, `node dist/main.js`). A disposable container returned HTTP 200 from `/livez` and `/readyz` and was removed. The Podman OCI-format warning that Dockerfile `HEALTHCHECK` metadata is ignored does not affect the validated Cloud Run/ECS external-probe contract.
  - Boundary: this task adds startup config, health/readiness, package/OCI scaffolding only; it adds no polling, handler registry, queue/DB client, job-table access, or persistence lifecycle.
  - Independent review (2026-07-22): **FAIL; reopened.** `task-1-independent-review-20260722.md` records one High build-context/secret-boundary finding: `Dockerfile.dockerignore` re-includes ignored package artifacts and future `.env*` files, and the validator forbids adding safe nested exclusions. A scratch build proved `.turbo/turbo-lint.log` is admitted. The same review records passing tests, isolated coverage, lint/type/build, OCI targets, frozen lock, container probes, invalid-env, SIGTERM, and no Task 2+ leakage. Do not restore `[x]` until remediation and fresh independent PASS.
  - Producer remediation (2026-07-22; fresh independent re-review pending): `task-1-remediation-20260722.md` records Red/Green exclusion tests, order-sensitive mandatory exclusions for both admitted trees, a fresh builder-stage proof that `.env.*`, `.turbo`, and coverage counterexamples are absent, truthful one-command coverage for all three Task 1 modules (31/31 tests; 98.94% statements, 90.90% branches, 100% functions/lines), and rebuilt-image runtime gates for image `sha256:4f6ab4084cbe33ecbb7dae72a980910d7d193fdf7753836d364116c664f211b7`. Task 1 remains `[~]`; Task 2 is not unlocked by producer evidence.
  - Fresh independent re-review (2026-07-22): **PASS; `WKR-T1-H1` and `WKR-T1-L1` closed.** `task-1-independent-rereview-20260722.md` records an exact-ignore engine proof with zero forbidden context paths, truthful combined coverage (31/31; 98.94/90.90/100/100), uncached lint/type/build, dual-target OCI, frozen lock, exact-image runtime, cleanup, and no Task 2+ leakage. The reviewer did not mutate status; the parent-orchestrator acceptance below completed Task 1.
  - Parent-orchestrator acceptance (2026-07-22): **PASS.** The independent re-review closes every Task 1 finding with no new findings, all disposable proof files are absent, and the scoped worker/platform diff contains no Task 2 behavior. Task 1 is accepted complete; the already-active Phase 1 inventory/contract tasks may continue, while Phase 2 remains deferred behind the Phase 1 acceptance gate.
- [x] Task 2: Inventory current `review_jobs` schema, worker, webhook enqueue, admin replay, tenancy classification, env controls, and acceptance evidence, explicitly recording status-only CAS and all-state replay limitations.
  - Evidence (2026-07-22; accepted parent-orchestrator scope): `task-2-current-review-jobs-inventory-20260722.md` maps the current schema/migration, REFERENTIAL tenancy rationale, normalized PR-key enqueue, worker bootstrap/env controls, `FOR UPDATE SKIP LOCKED` claim, visibility reclaim, retry/dead transitions, webhook ACK/redelivery, and admin authorization/replay.
  - Executable baseline: webhooks 34 passed / 2 `DIRECT_DATABASE_URL`-gated skipped; DB 11 passed; domain 15 passed; API 38 passed; focused lint and webhooks typecheck exit 0. Multi-file webhooks/API runs were resource-inconclusive and are not counted; every counted result is a terminal per-file/package result.
  - Limitations frozen by tests: settlement renders only `[jobId, "claimed"]`, so a stale worker can settle after reclaim/re-claim; admin replay renders only `[jobId]` and resets every state, including an active `claimed` row. No replay audit event exists. Lease-token CAS, active-lease rejection, and replay audit remain intentional Task 3+ strengthenings.
  - Documentation cleanup: corrected the stale enqueue return description and the false claim that status-only CAS protects a reclaimed/re-claimed row. Historical 2026-07-04 acceptance receipts remain immutable; the inventory records their superseded five-minute/unwired-worker statements against current 15-minute/wired source truth.
- [x] Task 3: Define a compatibility matrix separating proven behavior from intentional lease-token CAS, active-lease replay rejection, and replay-audit strengthenings.
  - Evidence (2026-07-22; parent-orchestrator acceptance): `task-3-compatibility-matrix-20260722.md` grades every claim as current executable, historical PostgreSQL, source-only, or unproven; it fixes preservation requirements and intentional strengthenings for state mapping, normalized idempotency, active-lease-safe enqueue, lease-token CAS, heartbeat, retry/dead-letter, webhook ACK failure semantics, replay authorization/state/audit, tenancy, process boundaries, reversible adoption, and fail-closed PG16 proof.
  - Decisions: status-only settle, all-state active replay, claimed-row enqueue reset, and success ACK after enqueue failure are explicitly not preserved as target guarantees. Lease ownership, active-lease rejection, audit, and retryable enqueue failure are accepted safety/reliability strengthenings with counterexample tests assigned to Tasks 4–10.
  - Boundary: no production TypeScript, Zod contract, schema, migration, queue, or worker behavior changed in Task 3.
- [x] Task 4: Define Zod job payload/result/envelope and handler contracts plus enqueue/claim/heartbeat/settle/fail/replay ports; worker composition sees only these ports.
  - Evidence (2026-07-22): `task-4-contracts-and-ports-20260722.md` records Red missing-boundary evidence, the accepted provider-neutral Zod surface, least-privilege enqueue/worker/dead-letter/replay ports, and the Task 5 boundary.
  - Safety: every lifecycle request carries trusted tenant scope; running/dead attempts are bounded; lease mutations return explicit stale/no-op outcomes; replay requires `admin:dashboard` authorization evidence and rejects active leases.
  - Visibility: dead-letter listing is cursor-bounded and exposes payload-free summaries with only classified `code` and `safeSummary` error data.
  - Green: focused 9 files/26 tests, isolated 100/100/100/100 coverage, full backend 234 passed/7 skipped, production/test TypeScript, ESLint, build, scoped diff check, and reviewer architecture gate passed.
  - Independent review: initial dead-list/auth/tenant gaps and later artifact/attempt/parse findings were reproduced and closed; fresh final decision PASS with no blocking findings.
- [x] Task 5: Design schema/migration, tenant classification, indexes, lease token, idempotency scope, transition table, reversible `review_jobs` adoption, and the exact backend PostgreSQL adapter ownership root.
  - Design: `task-5-schema-adoption-design-20260722.md` fixes the exact adapter root at `packages/backend/src/jobs/adapters/postgres/` and specifies attempt/redelivery semantics, state checks, complete active-enqueue snapshots, indexes, tenant classification, append-only audit, adoption fencing, preflight, and reversible rollout.
  - Initial independent review: **FAIL** with six High findings covering max-attempt expiry, incomplete database state checks, incomplete active-enqueue snapshots, bypassable adoption control, non-total legacy backfill, and unenforced audit immutability.
  - Remediation and acceptance: all six findings were closed in immutable commit `2c4be6e4`; fresh independent re-review returned **PASS with no open Critical/High** in immutable commit `fb8c0d99`.
  - Boundary: Task 5 is design-only. It makes no schema, migration, PostgreSQL role/trigger, adapter, worker-loop, live-locking, cutover, or browser/runtime claim.

**Verification:** `CI=true pnpm --filter @reading-advantage/webhooks test -- review-worker github-webhook-ack-latency github-webhook-idempotency && pnpm --filter @reading-advantage/db test -- phase-1-review-jobs`

**Acceptance gate:** Existing behavior is executable evidence, not prose only;
the design preserves every matrix row and architecture baseline does not grow.

## Phase 2: Red Concurrency and Failure Tests

Strategy checkpoint (2026-08-13): the canonical Phase 2 test strategy is
committed at `8ca1f09bf4775bc9ca054c660fb3998d1bde5c85` as
`test-strategy.md`. It fixes the remediation contract for the independent FAIL
at review commit `b32cc7f2f` (`DWP-T6-H1/H2/L1`, `DWP-T7-H1/H2/L1`), sequences
the Task 7 harness API freeze before the Task 6 executable PG16 assertions,
authorizes Task 10 Red in parallel, and keeps Tasks 8/9 blocked until a fresh
independent re-review returns PASS for the exact remediated Task 6/7 artifact
set. The orchestrator captures the immutable `phase_base_sha` at the evidence
commit that adds this note and the strategy role log, per the strategy's
capture-point section; `role_base_sha` values are not valid phase bases.

Acceptance checkpoint (2026-08-14): the fresh joint review returned PASS for
Tasks 6 and 7. It found no open severity-ranked finding. The review is
`task-6-task-7-independent-rereview-20260814.md`. Task 8 now has accepted
source and live evidence. Task 9 remains deferred because no owner has supplied
its Red contract or live evidence. This foundation review does not close Phase 2.

- [x] Task 6: Add Red schema/migration/tenant-registry tests and invalid-transition counterexample fixtures. (`caf095c`)
- [x] Task 7: Build a deterministic isolated PostgreSQL 16 harness using two independent connections, exact migration setup and teardown, an explicit test-only URL, and fail-closed guards forbidding production/default URL fallback. (`897abfe`)
- [x] Task 8: Add Red concurrent claim, lease-token CAS, stale heartbeat/settle/fail, visibility reclaim, and restart tests on the PG16 harness. (source: `b8b0dce713f4d3f2d17ad0e922ff65a5c1f20b3e`)
  - Final correctness ACCEPT (2026-08-15; source commit `b8b0dce713f4d3f2d17ad0e922ff65a5c1f20b3e`): the two-file manifest contains `packages/backend/src/jobs/adapters/postgres/index.ts` and `packages/backend/src/jobs/__tests__/postgres16-concurrency.red.test.ts`. Its SHA-256 is `4ccd73cb870e4570fb31806947f73ee052048a6c02e98910f8e723a375f84135`.
  - Final security ACCEPT (2026-08-15; source commit `b8b0dce713f4d3f2d17ad0e922ff65a5c1f20b3e`): migration `0052` cleanup removed only test-owned roles after scratch databases were gone. The fixture proved zero scratch databases, zero test-owned roles, fail-closed cleanup, and deterministic claim and reclaim lock barriers.
  - The safe gate passed 6 tests and recorded 7 intentional skips. The fresh PostgreSQL 16 gate passed 13/13 tests. The migration order was `0000 → 0005 → 0007 → 0025 → 0052`. Container removal was verified.
  - Typecheck, build, lint, format, and diff checks passed. Task 8 is complete. Phase 2 remains open because Task 9 remains blocked.
- [x] Task 9: Add Red idempotent enqueue, bounded deterministic-backoff, exhaustion/DLQ, authorization/audit, and active-lease replay-rejection tests. (source: `92f13c06c`; role-hardening implementation: `63b41b598`)
  - Red evidence (2026-08-15; role `measure-mid-red`; phase base `33d44fc81b84559c2ab7a48acfaf86554bf017a5`; role base `ee8b0bf03f915b17e63edb4cc3b26a710e67b3af`): `packages/backend/src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts` covers scoped duplicate enqueue, conflicting payloads, deterministic bounded retry delay, exhaustion/DLQ, authorized replay audit, and active-lease replay rejection.
  - Safe-default command:
    ```bash
    env -u DURABLE_JOB_PG16_TEST_OPT_IN \
        -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
        -u DATABASE_URL \
        -u DIRECT_DATABASE_URL \
      CI=true pnpm --filter @reading-advantage/backend exec vitest run \
        src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
    ```
    Result: exit `0`; `1` passed and `6` skipped; no PostgreSQL contact.
  - Disposable PostgreSQL 16 command:
    `bash
    DURABLE_JOB_PG16_TEST_OPT_IN=1 \
    DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=<guarded-url> \
      CI=true pnpm --filter @reading-advantage/backend exec vitest run \
        src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
    `
    Result: exit `1`; `7` tests ran, with `5` passed and `2` failed. The two
    substantive Red failures are `rejects a conflicting payload for one scoped
idempotency key without replacement`, which received `refreshed` instead of
    `conflict`, and `uses a deterministic bounded retry delay for equal attempts
and timestamps`, which produced different delays across eight equal retries.
  - Cleanup evidence: the post-run query found `0` scratch databases matching
    `durable_job_pg16_test_%` and `0` Task 9 roles. Formatting and the exact-path
    `git diff --check` passed. No production source changed. Task 9 remains `[~]`
    for Green implementation of the two remaining behaviors.
  - Green evidence (2026-08-16; source commit
    `d82c44e0cd3240e73f7bd6ce0c1bc65d8ff24303`): the live PostgreSQL 16 gate
    passed `19/19`. Cleanup found `0` scratch databases and `0` Task 9 roles.
    Direct TypeScript, focused ESLint, Prettier, and diff checks passed. The
    package `pnpm check-types` command was network-blocked. Serialized graph
    refresh remains pending orchestration support, not a product failure. See
    `task-9-green-evidence-20260815.md`.
  - Security Red remediation (2026-08-15; role `measure-mid-red`; phase base
    `33d44fc81b84559c2ab7a48acfaf86554bf017a5`; role base
    `58f82e936dc95796ded9158492e98999f487fe1d`): the amended test adds an
    injected replay verifier, six denial cases, JSONB primitive and poison-row
    cases, job-specific jitter checks, and one shared idempotency key across
    global and two tenant scopes. The test remains test-only.
  - Security Red format and typecheck: `node_modules/.bin/prettier --write
packages/backend/src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts`
    passed. `node_modules/.bin/tsc --noEmit -p
packages/backend/tsconfig.test.json` passed.
  - Security Red safe default, from the `packages/backend` directory:
    ```bash
    env -u DURABLE_JOB_PG16_TEST_OPT_IN \
        -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
        -u DATABASE_URL \
        -u DIRECT_DATABASE_URL \
      CI=true node ../../node_modules/vitest/vitest.mjs run \
        src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
    ```
    Result: exit `0`; `19` total tests (`PASS=1`, `SKIP=18`, `FAIL=0`). The
    run made no PostgreSQL contact.
  - Security Red disposable PostgreSQL 16, from the `packages/backend`
    directory, used `docker.io/library/postgres:16-alpine` with Podman
    `--network host`, port `55433`, and database
    `durable_job_test_admin_local`. Server version was `160014`.
    Result: exit `1`; `19` total tests (`PASS=7`, `FAIL=12`). Passing cases
    were the adapter-root check, global and two-tenant idempotency scope,
    conflicting-payload preservation, poison-row isolation, safe DLQ output,
    verified terminal replay audit, and active-lease replay rejection.
    Failing cases were five JSONB round trips, job-specific jitter
    dispersion, and six replay-verifier denial cases. The JSONB failures
    returned JSON text instead of the original string, number, array, or
    object. The jitter case produced one delay value across unrelated job
    IDs. Each denial case received no error before the write/audit check.
  - Security Red cleanup: the post-run queries returned
    `CLEANUP_SCRATCH_DATABASES=0` and `CLEANUP_TASK9_ROLES=0`. The disposable
    container was removed. Task 9 remains `[~]` for Green remediation of the
    twelve named failures.
  - Post-review Green evidence (2026-08-16; source commit `92f13c06c`): the
    focused suite passed 7/7. The safe gate passed 1 and skipped 18. The live
    PostgreSQL 16 gate passed 19/19. Cleanup found zero scratch databases, and
    the disposable container was removed. Package lint was network-blocked.
    Doctor has unrelated deprecated-marker failures. A serialized graph refresh
    remains pending. See `task-9-postreview-green-evidence-20260816.md`.
  - Security role-hardening Red (2026-08-16; phase base
    `33d44fc81b84559c2ab7a48acfaf86554bf017a5`; role base
    `63da03a0e27e0c696df44f2a0285973b269d1cfd`):
    `durable-jobs-role-hardening-pg16.red.test.ts` creates both named roles with
    LOGIN and CREATEDB before migration. It requires migration failure before
    protected grants and ownership, or successful NOLOGIN verification for both
    roles, audit tables, and the trigger function.
  - Security Red safe default: 1 passed with no PostgreSQL contact. Security Red
    disposable PostgreSQL 16: 1 failed because `durable_job_audit_owner`
    retained `rolcanlogin=true`; no other test failure occurred. Server version
    was `160014`.
  - Security Red cleanup: `CLEANUP_SCRATCH_DATABASES=0`,
    `CLEANUP_TASK9_ROLES=0`, and the disposable container was removed. Green
    must harden both pre-existing roles before audit ownership and runtime grants.
  - Role-hardening Green (2026-08-16; implementation commit
    `63b41b598ca0bd0cd8defff6658b218b82f6b693`; role base
    `0e0b420c61885a96f7210fe3777151a0568520dc`): migration `0052` now applies
    `NOLOGIN` and removes unsafe role attributes before protected ownership and
    grants. The safe role gate passed 1/1. The disposable PG16 role gate passed
    1/1. The live Task 9 gate passed 19/19. Cleanup found zero scratch databases
    and zero test-owned roles. See `task-9-role-hardening-green-evidence-20260816.md`.
  - Review B Mid Red remediation (2026-08-16; finding `DWP-T9-RB-005`; phase base
    `33d44fc81b84559c2ab7a48acfaf86554bf017a5`; role base
    `9d6b3af2608f0df7733197692a642905953c71f4`): the schema test now uses the
    safe `constraint_row` alias in all catalog queries and projects
    `pg_constraint.conname` as the existing `constraint_name` result field.
    Assertions, migration, sentinels, journal, and snapshots were unchanged.
    The safe gate passed 2 tests and skipped 1. The disposable PG16 gate ran 3
    tests, passed 2, and exposed one exact Red assertion failure: the test expects
    `char_length(actor)`, while PostgreSQL returned the valid migration check using
    `char_length(btrim(actor))`. See
    `task-9-review-b-rb-005-mid-red-20260816.md` and its role log.
  - Review B Green remediation (2026-08-16; finding `DWP-T9-RB-002`; implementation
    commits `12719652e` and `11dfb8e16`): `0052_durable_jobs` now has a composite
    sentinel for all six durable tables and four protected append-only trigger
    configurations. The migration keeps NOLOGIN role hardening, protected owners,
    revoked PUBLIC privileges, and limited runtime grants. Bounded text checks use
    raw length and a non-whitespace requirement, so padding cannot bypass limits.
    Safe schema, role, focused DB, journal, and migration-governance gates passed.
    The required-migration doctor gate passed on a disposable PG16 database.
    The full live schema test reached the immutable trigger assertion, then failed
    because `information_schema.triggers` omits TRUNCATE triggers. The doctor
    sentinel verified those triggers through `pg_trigger`; the Red test was not edited.
  - Review B Mid Red trigger-catalog follow-up (2026-08-16; current HEAD start
    `f3b1fd371c29461721c7531c37cc26d1b8b56857`): the leased schema test now reads
    `pg_catalog.pg_trigger`, `pg_catalog.pg_proc`, and `pg_catalog.pg_class`.
    It preserves trigger names and owners, and proves the shared function plus
    exact `tgtype` values `34` for BEFORE TRUNCATE and `27` for BEFORE UPDATE OR
    DELETE FOR EACH ROW. Safe schema passed 2 tests and skipped 1. Role hardening
    passed 1/1, and the live Task 9 suite passed 19/19. Final live schema passed
    2 tests and exposed the exact `job-name-over-bound` fixture acceptance.
    See the appended Review B Mid Red evidence and role log.
  - Review B Green job-name remediation (2026-08-16; implementation commit
    `a26c3aedf`; role base `a4aa125ab`): `durable_jobs_job_name_check` now enforces
    raw and trimmed lengths from 3 through 160, trimmed-value equality, and the
    existing lowercase namespaced grammar. The job-name-over-bound fixture now
    rejects through its named constraint. Safe schema passed 2 tests and skipped 1.
    Role hardening passed 1/1. Task 9 passed 19/19. Final live schema passed 2
    tests and exposed the next committed Red fixture, `queue-name-over-bound`.
  - Review B Green queue-name remediation (2026-08-16; implementation commit
    `86ed4c900`; role base `c1494c162`): `durable_jobs_queue_name_check` now
    enforces raw and trimmed lengths from 1 through 100, trimmed-value
    equality, and the existing lowercase queue grammar. Safe schema passed 2
    tests and skipped 1. Safe focused DB passed 17/17. Role hardening passed
    1/1. Task 9 passed 19/19. Final live schema passed 2 tests and exposed the
    next committed Red fixture, `rerun-partial-01`: PostgreSQL returned
    `durable_jobs_rerun_state_check` instead of the expected
    `durable_jobs_rerun_tuple_check`. See
    `task-9-review-b-queue-name-green-evidence-20260816.md` and its role log.
  - Review B Mid Red rerun-fixture follow-up (2026-08-16; current HEAD start
    `11a78ebda7cf4136da2fa8e7ede21b122bc4d2e7`): `rerun-partial-01` starts from
    a valid running row, keeps `rerun_requested=true`, and nulls part of the
    five-field snapshot. Both rerun checks reject that row, so the fixture now
    expects the first reported `durable_jobs_rerun_state_check` constraint.
    The safe schema gate passed 2 tests and skipped 1. The final live schema
    gate passed 2 tests and exposed the next exact Red fixture,
    `rerun-columns-with-flag-false`. See the appended Mid Red evidence.
  - Review B Mid Red flag-fixture follow-up (2026-08-16; current HEAD start
    `b4683613dd05c241fc525e886b75e1ff363cb9f3`): `rerun-columns-with-flag-false`
    keeps all five rerun fields and sets `rerun_requested=false`, so the tuple
    check passes and the state check rejects the row. Its expected constraint
    now matches `durable_jobs_rerun_state_check`. The safe schema gate passed 2
    tests and skipped 1. The final live schema gate passed 2 tests and exposed
    the next exact Red fixture, `rerun-flag-with-null-columns`.
  - Review B Mid Red rerun-bound follow-up (2026-08-16):
    `rerun-flag-with-null-columns` now passes its state-check rejection. The
    final live schema gate passed 2 tests and exposed the substantive
    `rerun-maximum-under-bound` failure: `rerun_max_attempts=0` was accepted.
    The migration has no bound for that rerun field. Green must add the
    reviewed database constraint in its own lease.
  - Review B Green rerun-bound remediation (2026-08-16; implementation commit
    `a554da1af`; role base `ecdf1fef1`): `durable_jobs_rerun_tuple_check` now
    requires active rerun maximum attempts from 1 through 1000. Ordinary rows
    retain the all-null rerun tuple. Safe schema passed 2 tests and skipped 1.
    Safe focused DB passed 17/17. Role hardening passed 1/1. Task 9 passed
    19/19. Final live schema passed 2 tests and exposed the next exact Red
    fixture, `pending-at-maximum-without-redelivery`, which was accepted
    instead of rejecting through `durable_jobs_redelivery_state_check`. See
    `task-9-review-b-rerun-bound-green-evidence-20260816.md` and its role log.
  - Complete fixture reconciliation Mid Red (2026-08-16; current HEAD start
    `1cb0018e37d4875206608f05b67c6642a18e9cfd`): the PG16 schema test now
    aggregates every fixture assertion and deletes each fixture row in a
    `finally` block. All rejected fixtures matched their expected first
    constraint. The full live suite reports three production failures:
    `pending-at-maximum-without-redelivery`, `running-attempt-zero`, and
    `dead-attempt-zero`. Green owns the three missing invariants.
  - Review B Green consolidated attempt-state remediation (2026-08-16;
    implementation commit `700bb1372`; role base `5cb38dc43`): the redelivery
    check now rejects a pending row at its maximum without redelivery, while
    preserving lower-attempt pending rows and valid redelivery rows. The state
    truth check now requires positive attempts for running and dead rows while
    preserving legacy-failed attempt zero. The full disposable PG16 schema suite
    passed 3/3. Role hardening passed 1/1. Task 9 passed 19/19. No next Red
    fixture remains. See `task-9-review-b-attempt-state-green-evidence-20260816.md`
    and its role log.
- [x] Task 10: Add Red worker lifecycle and architecture tests for registration, bounded polling, startup configuration, health, signals, and safe logs. Prove trusted tenant propagation, lifecycle-only port access, and zero direct persistence access. Record named missing-composition failures. (source: `287f89fad4aa49849a307e4973037ee8bd567a6a`)
  - Green evidence (2026-08-14; source commit `287f89fad4aa49849a307e4973037ee8bd567a6a`): independent Green acceptance passed. The focused worker suite passed 17/17, and the full worker suite passed 48/48. Worker typecheck, build, scoped lint, format, diff, graph update, and exact lock-scope checks passed. Shutdown, bounded concurrency, and global and tenant scope propagation passed.

  Tenant-scope amendment (2026-08-14): one declared polling scope binds claim and reclaim requests. Each accepted envelope must match that scope. Handler and lifecycle requests use the accepted envelope scope. A mismatch fails before handler execution. The two-file Red suite collected 14 tests. Nine tests failed only because `worker-composition.ts` was absent, and five static guards passed. Task 10 is complete after the Green acceptance above.

**Verification:** `CI=true pnpm vitest run packages/backend/src/jobs/__tests__ services/worker/src/__tests__`

**Acceptance gate:** Locking tests use isolated PG16 with two independent
connections and deterministic migration teardown; missing/unsafe test URL fails
closed; Red failures arise from missing platform behavior.

## Phase 3: PostgreSQL Adapter Implementation

- [x] Task 11: Add reviewed Drizzle schema/migration, indexes, exports, sentinels, and tenant-registry classification. (commit: `8b5ace2`)
  - Evidence: Migration `0052_durable_jobs` passed the live schema gate. The Drizzle checks now match its reviewed bounds and state invariants.
- [x] Task 12: Implement the job port's PostgreSQL adapter in the exact approved backend adapter root, including atomic enqueue and bounded `FOR UPDATE SKIP LOCKED` claim with lease-token ownership. (source: `a7031a6`)
  - Evidence: Separate PostgreSQL sessions proved scoped idempotency, atomic claims, and bounded lock skipping.
- [x] Task 13: Implement heartbeat, lease-token CAS settle/fail, visibility reclaim, bounded jittered retries, dead-letter listing, and authorized audited replay that rejects active leases. (source: `a7031a6`)
  - Evidence: Separate PostgreSQL sessions proved heartbeat, stale-token rejection, reclaim, retry, DLQ, and replay behavior.
- [x] Task 14: Make transition/concurrency/failure tests Green and run migration governance plus isolated two-connection PG16 locking tests. (evidence: `phase-3-jr-green-20260816.md`)
  - Phase 3 Review A Mid Red remediation (2026-08-16; current HEAD start `3d66149bf`): added live two-connection coverage for the T5-H3 active-enqueue snapshot, settle/fail/reclaim lock orders, positive heartbeat expiry and settlement, and both audit-table mutation triggers. Safe tests passed 9 and skipped 32. Isolated PG16 schema passed 3/3, concurrency passed 14/14, and enqueue passed 20/24. The four new enqueue failures are recorded in the consolidated Red evidence and role log.
  - Review A complete-enqueue mismatch follow-up (2026-08-16; current HEAD start `c572d0b87`): the first snapshot test claimed `task9-red` after the adapter promoted `task9-follow-up-queue`. The test now claims with the promoted queue from its follow-up request. Safe complete enqueue passed 1 and skipped 23. Live schema passed 3/3, concurrency passed 14/14, and complete enqueue passed 24/24. No production Red remains.
  - Review A rerun after correction commit `98bdfca33` (2026-08-16; verification start `27c7f4f23`): safe complete enqueue passed 1 and skipped 23. Isolated PG16 schema passed 3/3, concurrency passed 14/14, and complete enqueue passed 24/24. The run left zero scratch databases. It left two migration-created test roles, which were removed after verification; final scratch databases and durable-job roles were zero. TypeScript, lint, Prettier, and diff checks passed. No production Red remains.

**Verification:** `CI=true pnpm --filter @reading-advantage/db test && CI=true pnpm vitest run packages/backend/src/jobs/__tests__ && pnpm architecture:check`

**Acceptance gate:** AC-2–AC-4 and migration/tenant gates pass; no stale owner can
mutate a reclaimed job; no baseline addition is accepted.

## Phase 4: Worker Service and `review_jobs` Adoption

- [b] Task 15: Implement `services/worker` composition over the job port: typed registry, polling/backpressure, lease renewal, graceful shutdown, health, logs, and OCI build with no direct DB/job-table access. (deferred:durable_job_worker_platform_20260713-phase3-acceptance)
- [b] Task 16: Adapt or reversibly migrate `review_jobs` through the backend PostgreSQL adapter while retaining current review business logic and admin authorization. (deferred:durable_job_worker_platform_20260713-phase3-acceptance)
- [b] Task 17: Run compatibility, safety-strengthening, restart, dual/shadow-equivalence, webhook latency/redelivery, and rollback drills before retiring any old polling path. (deferred:durable_job_worker_platform_20260713-phase3-acceptance)

**Verification:** `CI=true pnpm --filter @reading-advantage/worker test && pnpm --filter @reading-advantage/worker check-types && docker build -f services/worker/Dockerfile . && pnpm --filter @reading-advantage/worker validate:oci --target cloud-run --target ecs-fargate && CI=true pnpm --filter @reading-advantage/webhooks test`

**Acceptance gate:** AC-1 and AC-5–AC-7 plus AC-9–AC-11 pass; proven review
behavior is preserved, safety strengthenings are explicit, and rollback evidence
exists before old-path removal.

## Phase 5: Capability Integration, Documentation, and Doctor

- [b] Task 18: After kernel acceptance, add Red then Green tests binding selected handlers to `job` descriptors and invoking only the capability executor. (deferred:durable_job_worker_platform_20260713-phase4-and-backend_capability_kernel_20260713-final-acceptance)
- [b] Task 19: Document operations for deploy, scale, Cloud Run and ECS/Fargate runtime validation, health, drain, replay, migration/rollback, and `review_jobs` compatibility; generate catalog entries. (deferred:durable_job_worker_platform_20260713-phase4-and-backend_capability_kernel_20260713-final-acceptance)
- [b] Task 20: Run full quality/architecture/doctor gates and independent concurrency, security, tenancy, and failure-mode review; close Critical/High findings. (deferred:durable_job_worker_platform_20260713-phase4-and-backend_capability_kernel_20260713-final-acceptance)

**Verification:** `CI=true pnpm --filter @reading-advantage/worker test && CI=true pnpm --filter @reading-advantage/backend test && pnpm turbo run lint check-types --filter=@reading-advantage/worker --filter=@reading-advantage/backend --filter=@reading-advantage/webhooks && pnpm backend:generate && git diff --exit-code -- measure/generated && pnpm architecture:check && bash measure/doctor.sh`

**Acceptance gate:** AC-1–AC-11 pass. If the kernel is not accepted, Task 18 and
AC-8 remain blocked and must not be marked complete; Phases 1–4 retain their
independent queue-foundation evidence without a false capability claim.

## Out of Scope

- Exactly-once semantics or workflow DAG orchestration.
- Redis/BullMQ/Kafka adoption.
- Changes to PR-review product behavior unrelated to queue compatibility.

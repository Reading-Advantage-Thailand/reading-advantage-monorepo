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
  - Evidence (2026-07-22; commit intentionally pending parent-orchestrator ownership): initial Red run failed all three suites on absent `startup-config`, `health`, and `oci-contract` modules; subsequent Docker Red cycles reproduced absent/overbroad build-context handling, hoisted-linker risk, non-deterministic package build invocation, and pnpm 11 non-injected deploy rejection.
  - Green: `CI=true node node_modules/vitest/vitest.mjs run services/worker/src/__tests__/startup-config.test.ts services/worker/src/__tests__/health-server.test.ts services/worker/src/__tests__/oci-contract.test.ts --coverage --coverage.include='services/worker/src/{startup-config,health,oci-contract}.ts' --coverage.reporter=text` passed 18/18 tests at 98.82% statements, 89.79% branches, 100% functions, and 100% lines.
  - Green: filtered Turbo `lint test check-types build` passed for `@reading-advantage/worker`; direct ESLint, TypeScript no-emit/build, dual-target `validate:oci`, architecture check, and `git diff --check` passed.
  - Image/runtime: local Podman 4.9 required the explicit equivalent `--ignorefile services/worker/Dockerfile.dockerignore`; the no-layer build produced image `sha256:159913bb9e8e7e04f1b5e38795dd312fbbed6ba6d54a6f7eeb5d33b05d6ddbdf` (169 MB, non-root `node`, `node dist/main.js`). A disposable container returned HTTP 200 from `/livez` and `/readyz` and was removed. The Podman OCI-format warning that Dockerfile `HEALTHCHECK` metadata is ignored does not affect the validated Cloud Run/ECS external-probe contract.
  - Boundary: this task adds startup config, health/readiness, package/OCI scaffolding only; it adds no polling, handler registry, queue/DB client, job-table access, or persistence lifecycle.
  - Independent review (2026-07-22): **FAIL; reopened.** `task-1-independent-review-20260722.md` records one High build-context/secret-boundary finding: `Dockerfile.dockerignore` re-includes ignored package artifacts and future `.env*` files, and the validator forbids adding safe nested exclusions. A scratch build proved `.turbo/turbo-lint.log` is admitted. The same review records passing tests, isolated coverage, lint/type/build, OCI targets, frozen lock, container probes, invalid-env, SIGTERM, and no Task 2+ leakage. Do not restore `[x]` until remediation and fresh independent PASS.
  - Producer remediation (2026-07-22; fresh independent re-review pending): `task-1-remediation-20260722.md` records Red/Green exclusion tests, order-sensitive mandatory exclusions for both admitted trees, a fresh builder-stage proof that `.env.*`, `.turbo`, and coverage counterexamples are absent, truthful one-command coverage for all three Task 1 modules (31/31 tests; 98.94% statements, 90.90% branches, 100% functions/lines), and rebuilt-image runtime gates for image `sha256:4f6ab4084cbe33ecbb7dae72a980910d7d193fdf7753836d364116c664f211b7`. Task 1 remains `[~]`; Task 2 is not unlocked by producer evidence.
  - Fresh independent re-review (2026-07-22): **PASS; `WKR-T1-H1` and `WKR-T1-L1` closed.** `task-1-independent-rereview-20260722.md` records an exact-ignore engine proof with zero forbidden context paths, truthful combined coverage (31/31; 98.94/90.90/100/100), uncached lint/type/build, dual-target OCI, frozen lock, exact-image runtime, cleanup, and no Task 2+ leakage. The reviewer leaves Task 1 `[~]`, does not unlock Task 2, and creates no commit; parent-orchestrator acceptance remains pending.
  - Parent-orchestrator acceptance (2026-07-22): **PASS.** The independent re-review closes every Task 1 finding with no new findings, all disposable proof files are absent, and the scoped worker/platform diff contains no Task 2 behavior. Task 1 is accepted complete; the already-active Phase 1 inventory/contract tasks may continue, while Phase 2 remains deferred behind the Phase 1 acceptance gate.
- [x] Task 2: Inventory current `review_jobs` schema, worker, webhook enqueue, admin replay, tenancy classification, env controls, and acceptance evidence, explicitly recording status-only CAS and all-state replay limitations.
  - Evidence (2026-07-22; commit pending parent-orchestrator ownership): `task-2-current-review-jobs-inventory-20260722.md` maps the current schema/migration, REFERENTIAL tenancy rationale, normalized PR-key enqueue, worker bootstrap/env controls, `FOR UPDATE SKIP LOCKED` claim, visibility reclaim, retry/dead transitions, webhook ACK/redelivery, and admin authorization/replay.
  - Executable baseline: webhooks 34 passed / 2 `DIRECT_DATABASE_URL`-gated skipped; DB 11 passed; domain 15 passed; API 38 passed; focused lint and webhooks typecheck exit 0. Multi-file webhooks/API runs were resource-inconclusive and are not counted; every counted result is a terminal per-file/package result.
  - Limitations frozen by tests: settlement renders only `[jobId, "claimed"]`, so a stale worker can settle after reclaim/re-claim; admin replay renders only `[jobId]` and resets every state, including an active `claimed` row. No replay audit event exists. Lease-token CAS, active-lease rejection, and replay audit remain intentional Task 3+ strengthenings.
  - Documentation cleanup: corrected the stale enqueue return description and the false claim that status-only CAS protects a reclaimed/re-claimed row. Historical 2026-07-04 acceptance receipts remain immutable; the inventory records their superseded five-minute/unwired-worker statements against current 15-minute/wired source truth.
- [~] Task 3: Define a compatibility matrix separating proven behavior from intentional lease-token CAS, active-lease replay rejection, and replay-audit strengthenings.
- [~] Task 4: Define Zod job payload/result/envelope and handler contracts plus enqueue/claim/heartbeat/settle/fail/replay ports; worker composition sees only these ports.
- [~] Task 5: Design schema/migration, tenant classification, indexes, lease token, idempotency scope, transition table, reversible `review_jobs` adoption, and the exact backend PostgreSQL adapter ownership root.

**Verification:** `CI=true pnpm --filter @reading-advantage/webhooks test -- review-worker github-webhook-ack-latency github-webhook-idempotency && pnpm --filter @reading-advantage/db test -- phase-1-review-jobs`

**Acceptance gate:** Existing behavior is executable evidence, not prose only;
the design preserves every matrix row and architecture baseline does not grow.

## Phase 2: Red Concurrency and Failure Tests

- [b] Task 6: Add Red schema/migration/tenant-registry tests and invalid-transition counterexample fixtures. (deferred:durable_job_worker_platform_20260713-phase1-acceptance)
- [b] Task 7: Build a deterministic isolated PostgreSQL 16 harness using two independent connections, exact migration setup and teardown, an explicit test-only URL, and fail-closed guards forbidding production/default URL fallback. (deferred:durable_job_worker_platform_20260713-phase1-acceptance)
- [b] Task 8: Add Red concurrent claim, lease-token CAS, stale heartbeat/settle/fail, visibility reclaim, and restart tests on the PG16 harness. (deferred:durable_job_worker_platform_20260713-phase1-acceptance)
- [b] Task 9: Add Red idempotent enqueue, bounded deterministic-backoff, exhaustion/DLQ, authorization/audit, and active-lease replay-rejection tests. (deferred:durable_job_worker_platform_20260713-phase1-acceptance)
- [b] Task 10: Add Red worker lifecycle and architecture tests for registration, bounded concurrency, startup env, health/readiness, signals, safe logs, job-port-only access, and zero direct DB/job-table imports; record expected failures. (deferred:durable_job_worker_platform_20260713-phase1-acceptance)

**Verification:** `CI=true pnpm vitest run packages/backend/src/jobs/__tests__ services/worker/src/__tests__`

**Acceptance gate:** Locking tests use isolated PG16 with two independent
connections and deterministic migration teardown; missing/unsafe test URL fails
closed; Red failures arise from missing platform behavior.

## Phase 3: PostgreSQL Adapter Implementation

- [b] Task 11: Add reviewed Drizzle schema/migration, indexes, exports, sentinels, and tenant-registry classification. (deferred:durable_job_worker_platform_20260713-phase2-acceptance)
- [b] Task 12: Implement the job port's PostgreSQL adapter in the exact approved backend adapter root, including atomic enqueue and bounded `FOR UPDATE SKIP LOCKED` claim with lease-token ownership. (deferred:durable_job_worker_platform_20260713-phase2-acceptance)
- [b] Task 13: Implement heartbeat, lease-token CAS settle/fail, visibility reclaim, bounded jittered retries, dead-letter listing, and authorized audited replay that rejects active leases. (deferred:durable_job_worker_platform_20260713-phase2-acceptance)
- [b] Task 14: Make transition/concurrency/failure tests Green and run migration governance plus isolated two-connection PG16 locking tests. (deferred:durable_job_worker_platform_20260713-phase2-acceptance)

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

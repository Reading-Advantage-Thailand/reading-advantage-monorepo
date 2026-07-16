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

- [ ] Task 1: Scaffold `services/worker` as `@reading-advantage/worker`: register `services/*` in `pnpm-workspace.yaml`, add package manifest/exports, build/lint/test/check-types/dev/`validate:oci` scripts, tsconfig, source/test roots, Turbo task compatibility, and provider-neutral OCI/health bootstrap before filtered commands run.
- [ ] Task 2: Inventory current `review_jobs` schema, worker, webhook enqueue, admin replay, tenancy classification, env controls, and acceptance evidence, explicitly recording status-only CAS and all-state replay limitations.
- [ ] Task 3: Define a compatibility matrix separating proven behavior from intentional lease-token CAS, active-lease replay rejection, and replay-audit strengthenings.
- [ ] Task 4: Define Zod job payload/result/envelope and handler contracts plus enqueue/claim/heartbeat/settle/fail/replay ports; worker composition sees only these ports.
- [ ] Task 5: Design schema/migration, tenant classification, indexes, lease token, idempotency scope, transition table, reversible `review_jobs` adoption, and the exact backend PostgreSQL adapter ownership root.

**Verification:** `CI=true pnpm --filter @reading-advantage/webhooks test -- review-worker github-webhook-ack-latency github-webhook-idempotency && pnpm --filter @reading-advantage/db test -- phase-1-review-jobs`

**Acceptance gate:** Existing behavior is executable evidence, not prose only;
the design preserves every matrix row and architecture baseline does not grow.

## Phase 2: Red Concurrency and Failure Tests

- [ ] Task 6: Add Red schema/migration/tenant-registry tests and invalid-transition counterexample fixtures.
- [ ] Task 7: Build a deterministic isolated PostgreSQL 16 harness using two independent connections, exact migration setup and teardown, an explicit test-only URL, and fail-closed guards forbidding production/default URL fallback.
- [ ] Task 8: Add Red concurrent claim, lease-token CAS, stale heartbeat/settle/fail, visibility reclaim, and restart tests on the PG16 harness.
- [ ] Task 9: Add Red idempotent enqueue, bounded deterministic-backoff, exhaustion/DLQ, authorization/audit, and active-lease replay-rejection tests.
- [ ] Task 10: Add Red worker lifecycle and architecture tests for registration, bounded concurrency, startup env, health/readiness, signals, safe logs, job-port-only access, and zero direct DB/job-table imports; record expected failures.

**Verification:** `CI=true pnpm vitest run packages/backend/src/jobs/__tests__ services/worker/src/__tests__`

**Acceptance gate:** Locking tests use isolated PG16 with two independent
connections and deterministic migration teardown; missing/unsafe test URL fails
closed; Red failures arise from missing platform behavior.

## Phase 3: PostgreSQL Adapter Implementation

- [ ] Task 11: Add reviewed Drizzle schema/migration, indexes, exports, sentinels, and tenant-registry classification.
- [ ] Task 12: Implement the job port's PostgreSQL adapter in the exact approved backend adapter root, including atomic enqueue and bounded `FOR UPDATE SKIP LOCKED` claim with lease-token ownership.
- [ ] Task 13: Implement heartbeat, lease-token CAS settle/fail, visibility reclaim, bounded jittered retries, dead-letter listing, and authorized audited replay that rejects active leases.
- [ ] Task 14: Make transition/concurrency/failure tests Green and run migration governance plus isolated two-connection PG16 locking tests.

**Verification:** `CI=true pnpm --filter @reading-advantage/db test && CI=true pnpm vitest run packages/backend/src/jobs/__tests__ && pnpm architecture:check`

**Acceptance gate:** AC-2–AC-4 and migration/tenant gates pass; no stale owner can
mutate a reclaimed job; no baseline addition is accepted.

## Phase 4: Worker Service and `review_jobs` Adoption

- [ ] Task 15: Implement `services/worker` composition over the job port: typed registry, polling/backpressure, lease renewal, graceful shutdown, health, logs, and OCI build with no direct DB/job-table access.
- [ ] Task 16: Adapt or reversibly migrate `review_jobs` through the backend PostgreSQL adapter while retaining current review business logic and admin authorization.
- [ ] Task 17: Run compatibility, safety-strengthening, restart, dual/shadow-equivalence, webhook latency/redelivery, and rollback drills before retiring any old polling path.

**Verification:** `CI=true pnpm --filter @reading-advantage/worker test && pnpm --filter @reading-advantage/worker check-types && docker build -f services/worker/Dockerfile . && pnpm --filter @reading-advantage/worker validate:oci --target cloud-run --target ecs-fargate && CI=true pnpm --filter @reading-advantage/webhooks test`

**Acceptance gate:** AC-1 and AC-5–AC-7 plus AC-9–AC-11 pass; proven review
behavior is preserved, safety strengthenings are explicit, and rollback evidence
exists before old-path removal.

## Phase 5: Capability Integration, Documentation, and Doctor

- [ ] Task 18: After kernel acceptance, add Red then Green tests binding selected handlers to `job` descriptors and invoking only the capability executor.
- [ ] Task 19: Document operations for deploy, scale, Cloud Run and ECS/Fargate runtime validation, health, drain, replay, migration/rollback, and `review_jobs` compatibility; generate catalog entries.
- [ ] Task 20: Run full quality/architecture/doctor gates and independent concurrency, security, tenancy, and failure-mode review; close Critical/High findings.

**Verification:** `CI=true pnpm --filter @reading-advantage/worker test && CI=true pnpm --filter @reading-advantage/backend test && pnpm turbo run lint check-types --filter=@reading-advantage/worker --filter=@reading-advantage/backend --filter=@reading-advantage/webhooks && pnpm backend:generate && git diff --exit-code -- measure/generated && pnpm architecture:check && bash measure/doctor.sh`

**Acceptance gate:** AC-1–AC-11 pass. If the kernel is not accepted, Task 18 and
AC-8 remain blocked and must not be marked complete; Phases 1–4 retain their
independent queue-foundation evidence without a false capability claim.

## Out of Scope

- Exactly-once semantics or workflow DAG orchestration.
- Redis/BullMQ/Kafka adoption.
- Changes to PR-review product behavior unrelated to queue compatibility.

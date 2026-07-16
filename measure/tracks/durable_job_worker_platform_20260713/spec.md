# Specification: Durable Job Worker Platform

## Overview

Build a PostgreSQL-backed durable job platform and independent
`services/worker` Node/OCI process. The implementation must first characterize
and preserve the existing Codecamp `review_jobs` flow; this is an adaptation of
proven behavior, not a greenfield queue rewrite.

## Dependencies

- Hard dependencies before durable contract/test work writes under
  `packages/backend/src/jobs/`: the accepted
  `backend_architecture_enforcement_20260713` Gate 1 baseline and the explicitly
  accepted Backend Capability Kernel Task 1 `packages/backend` package-scaffold
  gate.
- After that structural scaffold gate, durable Phases 1–4 may run in parallel
  with Backend Capability Kernel Tasks 2 onward; the capability executor need
  not yet be complete.
- Phase 5 capability-bound handler integration hard-depends on the kernel's
  accepted descriptor/executor API. Until then, handlers use a typed job-handler
  registry and cannot claim capability integration.
- Preserve the archived `webhook_review_reliability_20260605` acceptance
  behavior and current review-worker tests.

## Functional Requirements

### FR-1: Characterize current `review_jobs`

Create compatibility tests/evidence for current states
`pending|claimed|succeeded|failed|dead`, normalized PR uniqueness, due-job claim
with `FOR UPDATE SKIP LOCKED`, visibility-timeout reclaim, jittered bounded
retry, dead-letter transition, admin-authorized replay, status-only settle CAS,
webhook acknowledgement latency, and idempotent redelivery. Record the current
limitations as baseline facts: settle matches only ID plus `status='claimed'`
and therefore cannot reject a stale worker after reclaim/re-claim; replay
matches only ID and can reset an active claim. Preserve its REFERENTIAL/global
tenancy rationale unless a separately reviewed migration changes it.

### FR-2: Generic durable job contracts

Define Zod payload/result contracts, job name/queue, tenant mode, idempotency
key, availability, attempts, lease owner/expiry, safe last error, terminal
state, and timestamps. Define enqueue, claim, heartbeat, settle, fail, reclaim,
dead-letter list, and replay ports. Invalid transitions fail closed.

### FR-3: PostgreSQL adapter

Implement durable schema/migration and adapter behavior using PostgreSQL and
Drizzle. Claim bounded batches with `FOR UPDATE SKIP LOCKED`; use lease tokens
and compare-and-set on heartbeat/settle/fail so stale workers cannot mutate
reclaimed jobs. Enqueue idempotency is atomic and tenant/job scoped. Retries use
bounded jittered exponential backoff; exhausted jobs dead-letter. Replay rejects
a valid active lease. Lease-token CAS and active-lease replay rejection are
intentional safety strengthenings, not claims about current behavior, and need
explicit compatibility tests.

### FR-4: `services/worker`

Create an ordinary Node/OCI service with startup env validation, typed handler
registration, bounded concurrency and polling, graceful shutdown, readiness and
liveness, lease renewal/reclaim, structured correlation logs, and metrics. The
service depends only on the typed job port and handlers: it does not import DB
clients/schema, issue SQL, or query job tables. Queue persistence and direct
connection handling live only in
`packages/backend/src/jobs/adapters/postgres/`. Domain business logic stays in
backend/domain modules.

### FR-5: `review_jobs` compatibility path

Choose and document either (a) adapt existing `review_jobs` behind the generic
port or (b) migrate it with reversible schema/data compatibility. Do not remove
the current worker until dual-run/shadow or equivalent evidence proves no
unintended semantic regression. Preserve admin authorization while deliberately
tightening replay to reject active leases and adding the platform audit event.
Compatibility evidence must call out this accepted behavior change.

### FR-6: Capability-bound handlers

After kernel acceptance, bind selected job handlers to `job` capability
descriptors so execution uses validated input/output, auth/system policy,
tenancy, errors, audit, and observability. Queue foundation acceptance must not
be falsely blocked or labeled incomplete while this dependency is pending; the
phase remains explicitly blocked.

## Non-functional Requirements

- PostgreSQL only; no Redis/BullMQ requirement.
- Node/OCI target, not Cloudflare Workers.
- At-least-once delivery with idempotent effects; no exactly-once claim.
- Restart-safe with no in-memory-only production state.
- Fair bounded polling, backpressure, and no unbounded retry loops.
- Safe errors/logs do not persist payload secrets or provider responses.
- New tables are tenant-registry classified and migration-governance compliant.
- Locking tests use an isolated PostgreSQL 16 harness with two independent
  connections, explicit migration setup/teardown, and an explicit test-only URL.
  The harness fails if that URL is absent and never falls back to production,
  `DATABASE_URL`, `DIRECT_DATABASE_URL`, or a shared default database.

## Acceptance Criteria

1. Current proven `review_jobs` behavior remains Green before and after adoption,
   with lease-token CAS and active-lease replay rejection separately accepted as
   intentional safety strengthenings.
2. Concurrent workers never own the same active lease; a stale worker cannot
   settle, fail, heartbeat, or replay a reclaimed job.
3. Duplicate enqueue returns the same durable identity within declared scope.
4. Retry timing is bounded/testable, exhaustion dead-letters, and authorized
   replay creates one safe pending attempt without overwriting active work.
5. Worker restart/reclaim tests prove durable progress and graceful shutdown.
6. Webhook acknowledgement remains enqueue-only and within the existing latency
   contract; redelivery remains idempotent.
7. Job schema/migration, tenant classification, package tests, worker image,
   architecture check, and doctor are Green.
8. Capability-bound integration invokes the accepted kernel executor and is
   accepted only after the kernel dependency is met.
9. The PG16 locking suite uses two independent connections in an isolated,
   migrated test database/schema, tears down deterministically, and cannot
   resolve any production/default database URL.
10. Static enforcement proves `services/worker` has no DB/job-table access and
    only the exact backend PostgreSQL job-adapter root owns queue persistence.
11. One provider-neutral worker image passes process, environment,
    health/readiness, graceful-shutdown, and network-contract validation against
    both Cloud Run and AWS ECS/Fargate deployment shapes.

## Out of Scope

- Exactly-once delivery.
- Redis, BullMQ, Kafka, or a hosted queue control plane.
- Scheduled-job UI, arbitrary workflow DAGs, or cross-region active/active.
- Rewriting Codecamp PR review business logic.
- Claiming capability-bound execution before the kernel is accepted.

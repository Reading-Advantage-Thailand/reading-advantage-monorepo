# Verification: Durable Job Worker Platform

## Task 1 — Worker package and OCI/health bootstrap

### Producer evidence

See Task 1 in `plan.md` for the producer's Red/Green, image, and runtime notes.

### Independent review — 2026-07-22

- Decision: **FAIL; Task 1 reopened.**
- Report: `task-1-independent-review-20260722.md`
- Blocking finding: the Dockerfile-specific ignore rules re-include all worker
  and shared-config package contents, including ignored build artifacts and any
  future package-local `.env*` files. A scratch build proved an ignored Turbo
  artifact is present in the context.
- Passing scoped evidence: 18/18 tests; isolated module coverage above 80%;
  lint, typecheck, build, dual-target OCI validation, frozen offline lockfile,
  live/readiness probes, invalid-env failure, and SIGTERM exit behavior pass.
- Aggregate architecture status: repository-wide exit 1 from 67 unrelated
  company-identity/database findings; zero finding lines name
  `services/worker`. This does not waive the worker's own build-context failure.

Task 1 may be accepted only after remediation and a fresh independent PASS.

### Fresh independent re-review — 2026-07-22

- Decision: **PASS; WKR-T1-H1 and WKR-T1-L1 closed.**
- Report: `task-1-independent-rereview-20260722.md`
- Build context: exact-ignore scratch export contained 45 paths and zero
  sentinel, `node_modules`, `dist`, `.turbo`, coverage, or `.env*` matches;
  every disposable fixture/artifact was removed.
- Canonical coverage: 31/31 tests; all three configured modules enumerated;
  98.94% statements, 90.90% branches, 100% functions, 100% lines.
- Quality/runtime: lint, no-emit, build, Cloud Run/ECS validation, frozen
  offline lock, liveness/readiness, SIGTERM, and invalid-env gates pass.
- Boundary: no Task 2+ leakage. Browser checks are not applicable and graph
  callers are skipped because `graph.db` is stale.
- Ownership: the reviewer did not mark Task 1 complete, unlock Task 2, commit,
  or modify production code. Parent-orchestrator acceptance remains required.

## Task 2 — Current `review_jobs` inventory and executable baseline

### Decision — 2026-07-22

- Decision: **PASS for Task 2 only.** Phase 1 remains open on Tasks 3–5.
- Inventory: `task-2-current-review-jobs-inventory-20260722.md`.
- Characterization tests:
  - `packages/webhooks/src/__tests__/durable-task2-settle-limit-characterization.test.ts`
  - `packages/domain/src/__tests__/durable-task2-replay-limit-characterization.test.ts`
- Current settle limitation: predicate parameters are exactly
  `[jobId, "claimed"]`; there is no worker/lease token, so stale settlement
  remains possible after visibility reclaim and re-claim.
- Current replay limitation: all five states
  `pending|claimed|succeeded|failed|dead` reset to `pending` through an ID-only
  predicate; authorization is enforced but active-claim rejection and a replay
  audit event do not exist.
- Current evidence: webhooks 34 passed / 2 live-DB skipped; DB 11 passed;
  domain 15 passed; API 38 passed; focused ESLint and webhooks typecheck passed.
- `DIRECT_DATABASE_URL` was unset, so no new real-Postgres claim/reclaim result
  is claimed. Historical 2026-07-04 acceptance documented the same intended
  skip gate.
- Boundary: no schema, migration, generic port, queue, handler, audit write, or
  worker-platform runtime behavior was implemented by Task 2.

## Task 3 — Compatibility and strengthening matrix

### Decision — 2026-07-22

- Decision: **PASS for Task 3 only.** Phase 1 remains open on Tasks 4–5.
- Matrix: `task-3-compatibility-matrix-20260722.md`.
- Graph-first evidence: the accepted installed graph returned fresh exact-ID
  profiles for `applySettle`, `requeueReviewJob`, and
  `enqueueReviewJob`; Task 2 executable characterization remains the current
  behavioral baseline.
- Preserve: normalized PR identity, durable identity reuse, bounded due claim,
  visibility reclaim, retry/dead-letter outcomes, admin authorization,
  REFERENTIAL/global Codecamp tenancy, low-latency success after durable
  enqueue, and reversible old-path availability.
- Strengthen deliberately: active leases cannot be revoked by enqueue/replay;
  heartbeat/settle/fail require the current lease token; enqueue persistence
  failure returns retryable non-2xx; replay emits one safe immutable audit
  event; worker DB access moves behind the approved backend adapter.
- Evidence honesty: Task 3 makes no new live-Postgres claim because Task 2 had
  no explicit isolated `DIRECT_DATABASE_URL`. Task 7 owns fresh two-connection
  PG16 proof with fail-closed URL handling.
- Boundary: documentation/design only; no Task 4+ code or schema changes.

## Task 4 — Durable job contracts and least-privilege ports

### Decision — 2026-07-22

- Decision: **PASS for Task 4 only.** Phase 1 remains open on Task 5.
- Report: `task-4-contracts-and-ports-20260722.md`.
- Red: the runtime contract suite failed before collection because the jobs boundary did not exist; compile-time port shape evidence remained handler-free.
- Contracts: handler-owned Zod payload/result schemas, state-safe envelopes, bounded attempts, trusted tenant scope, lease-token lifecycle outcomes, active-lease-safe enqueue/replay, and fixed replay authorization evidence.
- Security: persisted failures use `code` plus `safeSummary`; raw `message` and dead-letter payload fields are rejected.
- Dead-letter visibility: bounded tenant-scoped cursor pages expose invariant-checked summaries only, through a separate administration port unavailable to worker composition.
- Independent review: missing dead-list/auth/tenant contracts plus temporary artifacts, attempt inconsistency, and a parse defect were reproduced, remediated, and closed by a fresh PASS with no blocking findings.
- Green: focused 9 files/26 tests; full backend 234 passed/7 skipped; production/test TypeScript, ESLint, build, architecture, and scoped diff checks passed.
- Coverage: isolated Task 4 modules reached 100% statements, branches, functions, and lines.
- Graph: direct `repo-graph scan . ./graph.db` completed with 85,917 nodes and 113,712 edges in 261,138 ms; fresh worker-port inspect and dead-summary search resolved the new files.
- Boundary: no schema, migration, PostgreSQL adapter, worker loop, review-job cutover, or new live-locking evidence is claimed.

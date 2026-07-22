# Task 5 Fresh Independent Rereview — 2026-07-22

## Findings-first verdict

**PASS. No Critical, High, or Medium finding remains.** The remediated design
closes `T5-H1` through `T5-H6`, preserves the accepted Task 2–4 boundaries, and
is sufficiently normative for Tasks 6–9 to turn every safety claim into Red
counterexamples before implementation. Task 5 has no remaining design blocker.

This rereview is bound to immutable commit
`2c4be6e483e90bf4154e9f60eaa455288425d84b` and specifically to design SHA-256
`70bba4e87e236b4d407971dc5f1dca2521551f9d2cf42d6fc52b682a60ee8bf7`.
The worktree copy produced the same digest. Later mutable documentation was not
used as the reviewed Task 5 design.

## Closure matrix

| Finding | Verdict | Exact closure evidence |
|---|---|---|
| `T5-H1` — max-attempt expiry | **Closed** | The schema adds `redeliver_current_attempt`, forbids an ordinary pending row at the maximum, and permits a marked pending row at ordinals `1..max` (`task-5-schema-adoption-design-20260722.md:55-62,80-105`). The attempt model makes lease expiry retain the same logical ordinal, including at `attempt=max_attempts`, while only handled business failure consumes an ordinal (`:158-185`). Separate fresh/redelivery claim transitions enforce increment-versus-retain behavior (`:230-235`). No pending row is stranded and no `max+1` attempt is created. |
| `T5-H2` — incomplete database state exclusivity | **Closed** | The complete state truth table covers lease, result, safe error, completion, rerun snapshot, redelivery marker, and attempt bounds for every state (`:76-115`). It excludes result data from running/dead/legacy-failed, excludes safe errors from succeeded, requires dead attempts `1..max`, and makes partial lease/error/rerun tuples invalid. This matches the accepted strict envelopes in `packages/backend/src/jobs/contracts.ts:105-144` and the one-based dead-list bound in `packages/backend/src/jobs/dead-letter-contracts.ts:12-31`. Task 6 must counterexample every forbidden cell and partial tuple (`task-5-schema-adoption-design-20260722.md:107-111,404-407`). |
| `T5-H3` — incomplete active-enqueue request | **Closed** | The table owns a complete follow-up snapshot for queue, payload, fingerprint, maximum attempts, and schedule (`:62-67`). Active enqueue leaves the running generation unchanged, atomically replaces the entire snapshot, and uses last-committed-request-wins without field merging (`:187-205`). Settle, fail, or reclaim promotes all five fields together and resets all prior-generation state (`:206-211`). Both lock orders for settle/enqueue, fail/enqueue, and reclaim/enqueue are normative, including queue moves, lower/raised maxima, and repeated redelivery (`:213-218`). These fields cover every non-identity field accepted by `EnqueueJobRequest` (`packages/backend/src/jobs/contracts.ts:156-173`). |
| `T5-H4` — stale legacy poller and incomplete adoption control | **Closed** | The control has explicit modes, monotonic generation, allowed edges, expected-mode/generation CAS, authorization, reconciliation predicates, and an atomic control-audit append (`task-5-schema-adoption-design-20260722.md:280-298`). The fence combines distinct least-privilege roles, an owner-controlled claim trigger, cutover privilege revocation, and per-startup/per-claim generation checks (`:300-316`). Critically, the unchanged pre-control connection is fenced by revoked broad credentials and the trigger rather than worker cooperation; Tasks 7/9 must keep that connection open across cutover and prove its existing direct claim SQL is denied while generic claims exactly once (`:318-321`). This directly covers the current bypass-capable SQL at `packages/webhooks/src/review-worker.ts:492-515`. Control races and their separate audit are assigned to PostgreSQL counterexamples (`task-5-schema-adoption-design-20260722.md:249-270,402-418`). |
| `T5-H5` — non-total legacy backfill | **Closed** | Repeatable-read preflight pages every legal legacy row and validates payload decode, normalized identity/collisions, UUIDs, attempts, claims, timestamps, result shape, and all generated bounds (`:327-341`). It emits only fixed safe issue codes and no raw values (`:343-349`). The five-state table deterministically maps pending, claimed, succeeded, failed, and dead, including completion/error normalization and zero-attempt dead normalization (`:351-359`). Invalid rows are not coerced; they remain legacy-owned and receive bounded, redacted issue records (`:361-368`). Any unresolved issue, invalid envelope, collision, or missing binding blocks shadow, paused, and generic modes (`:370-376`). The staged rollout repeats the zero-issue gates and keeps every legacy row reversible (`:378-400`). This is total over the nullable and unchecked current schema visible in `packages/db/src/schema/codecamp.ts:325-359` and `packages/db/drizzle/0025_review_jobs.sql:7-30`. |
| `T5-H6` — audit immutability asserted only in application code | **Closed** | Replay and control use distinct audit tables with safe, bounded fields (`task-5-schema-adoption-design-20260722.md:242-252`). A distinct `NOLOGIN` owner, revoked `PUBLIC`, insert/minimum-select-only runtime grants, non-owner/non-superuser runtime roles, fixed-search-path owner trigger functions, and rejecting UPDATE/DELETE/TRUNCATE triggers enforce append-only behavior in PostgreSQL (`:254-263`). Replay/control mutation and audit insert are atomic (`:265-267`). Actual runtime-credential tests must reject UPDATE, DELETE, TRUNCATE, trigger disable/replace, and owner/migration role assumption, including a temporary-grant trigger proof (`:267-270`). |

## Additional required gates

| Gate | Verdict | Evidence |
|---|---|---|
| Tenant uniqueness | **Pass** | Mode-specific partial unique indexes avoid nullable-tenant uniqueness failure: global uses `(job_name,idempotency_key)` and tenant uses `(job_name,tenant_id,idempotency_key)` (`task-5-schema-adoption-design-20260722.md:117-133`). The tenant-mode check requires exactly null for global and a bounded non-empty ID for tenant (`:80-81`). Enqueue chooses the matching conflict target and repeats the trusted tenant predicate (`:129-132`). |
| Tenant classification | **Pass** | The generic, audit, bridge, control, and issue tables are deliberately `REFERENTIAL`, forcing TenantDB to fail closed; only the exact adapter obtains raw access and every query repeats the validated mode predicate (`:272-278`). This preserves the existing global Codecamp rationale recorded at `packages/domain/src/tenant-registry.ts:284-287` without inventing a frontend `schoolId`. |
| Reclaim indexes and plan gate | **Pass** | Global/tenant reclaim each have queue and no-queue partial index shapes with tenant and queue leading where applicable (`task-5-schema-adoption-design-20260722.md:135-149`). Task 7 must run `EXPLAIN (ANALYZE, BUFFERS)` for all four representative shapes, record unexpected plans, and add the smallest query-leading index before acceptance (`:151-156`). |
| Exact adapter ownership root | **Pass** | The only queue-query root is exactly `packages/backend/src/jobs/adapters/postgres/`; database definitions and migrations remain in their owning DB roots, while worker composition receives only backend job contracts/ports (`:18-37`). This exactly matches the live ownership rule at `packages/architecture-enforcement/src/config/ownership-map.v1.json:455-464` and the graph-resolved `DurableJobWorkerPort` at `packages/backend/src/jobs/ports.ts:40-85`. |
| Design-only boundary | **Pass** | The design expressly claims no schema, migration, adapter, roles, trigger, credential, worker, backfill, control row, lease token, or runtime proof (`task-5-schema-adoption-design-20260722.md:5-10,431-436`). Commit `2c4be6e4` changes only the failed-review artifact and the remediated design; `git diff --check 2c4be6e4^..2c4be6e4` passed. No source/schema/runtime acceptance is inferred. |

## Evidence and review method

- Fresh graph-first inspection used the graph dated 2026-07-22: 85,917 nodes,
  113,712 edges, and 3,289 files. `repo-graph inspect ./graph.db
  DurableJobWorkerPort` resolved the accepted least-privilege interface at
  `packages/backend/src/jobs/ports.ts:40-85`; `repo-graph search ./graph.db
  reviewJobs` resolved the live enqueue and admin/read mutation surfaces before
  source inspection.
- Reviewed `spec.md`, `plan.md`, the Task 2 inventory, Task 3 matrix, Task 4
  report, accepted contracts/ports/dead-letter contracts, the original failed
  Task 5 review, and the immutable remediated design.
- Verified the current legacy Drizzle schema/migration, raw claim/reclaim and
  settle behavior, tenant registry, and live architecture ownership map.
- No product tests, database migrations, or browser checks were run: the
  immutable commit is documentation-only and explicitly defers executable Red
  and PostgreSQL evidence to Tasks 6–10.

## Remaining blocker

**None for Task 5.** The implementation claims remain deliberately unaccepted.
Tasks 6–10 must now produce the exact schema, PG16 two-connection, privilege,
race, preflight, `EXPLAIN`, tenant, and architecture counterexamples enumerated
at `task-5-schema-adoption-design-20260722.md:402-418`; this PASS must not be
misread as Green schema/runtime evidence or as permission to skip the Phase 2
Red gate.

# Task 3 Compatibility Matrix — 2026-07-22

## Decision

**PASS for Task 3 only.** This matrix fixes the boundary between behavior that
must remain compatible and deliberate safety strengthenings. It does not define
Task 4 TypeScript/Zod contracts or Task 5 schema/migration details.

Evidence grades:

- **E** — current executable characterization/unit evidence.
- **H** — accepted historical PostgreSQL evidence, useful but not rerun here.
- **S** — current source/graph inspection only.
- **N** — not present or not proven in the current implementation.

The accepted installed graph was queried before source inspection. Exact-ID
inspect for `applySettle`, `requeueReviewJob`, and `enqueueReviewJob`
reported current source with no stale or missing files.

## Compatibility and strengthening matrix

| Capability | Current evidence | Compatibility requirement | Target platform decision | Required acceptance evidence |
|---|---|---|---|---|
| State vocabulary | E: all five values are schema/admin representable; current settle emits pending, succeeded, or dead. | Existing rows in pending, claimed, succeeded, failed, and dead remain readable and operable through rollout/rollback. | Generic states map pending to pending, claimed to running/leased, succeeded to succeeded, and dead to dead. Legacy failed remains readable/replayable; the new adapter does not emit it unless Task 4 explicitly contracts it. | State mapping fixtures before/after migration and rollback. |
| PR identity | E/H: lowercase owner/repo plus positive pull number; unique natural key. | URL case, `.git`, and trailing-slash variants collapse to one durable review identity. | Generic idempotency scope for this handler is `codecamp-review + normalized owner/repo/pull`; provider delivery ID is audit metadata, not the uniqueness key. | Normalization and concurrent duplicate-enqueue tests. |
| Duplicate enqueue | E: conflict reuses the row but resets every state, including claimed, to pending and clears claim metadata. | Successful redelivery reuses durable identity and refreshes the review request without creating duplicate work. | **Strengthening:** enqueue must not revoke a valid active lease. It returns the existing identity plus a typed outcome; terminal/pending refresh is transactional, while active work is retained or safely marked for one subsequent run. | Two-connection active-lease enqueue counterexample plus terminal/pending compatibility cases. |
| Claim | H/S: bounded due rows use one `FOR UPDATE SKIP LOCKED` update/returning statement. | Bounded, due-only, contention-safe claim semantics remain. | Preserve PostgreSQL locking and add a fresh opaque lease token/expiry per claim. | Isolated PG16 two-connection claim tests. |
| Visibility reclaim | E/H: 15-minute default; timed-out claimed rows return to pending and clear owner/time. | Abandoned work becomes claimable again; default remains configurable and rollout-compatible. | Reclaim only expired leases and rotate the lease token on the next claim. | Clock-controlled reclaim/restart tests. |
| Heartbeat | N: no heartbeat contract. | None. | **Additive strengthening:** heartbeat extends only the matching live lease token and cannot resurrect terminal/reclaimed work. | Stale/current token heartbeat tests. |
| Settlement ownership | E: predicate is exactly job ID plus claimed status. | Success/retry/dead outcome rules remain; status-only ownership is not preserved as a guarantee. | **Intentional breaking safety strengthening:** settle/fail compare job ID plus opaque lease token and active lease state. A stale worker changes zero rows. | Reclaim/re-claim stale settle/fail counterexamples on PG16. |
| Retry/dead-letter | E: bounded jittered exponential retry; exhaustion becomes dead. | Attempt accounting, bounded delay, and dead-letter visibility remain behaviorally equivalent for review jobs. | Move calculation behind the port; persist safe error classification only. No unbounded retry loop. | Deterministic clock/RNG retry and exhaustion tests. |
| Worker scheduling | S: scheduler is wired, idempotent, 30-second default, sequential batch drain, and no signal drain. | Review processing remains enabled in production and bounded; business handler behavior is unchanged. | Independent worker adds bounded concurrency, backpressure, readiness, lease renewal, SIGTERM drain, and process-safe logs. Defaults are deployment configuration, not API identity. | Lifecycle, restart, signal, readiness, and handler-equivalence tests. |
| Webhook acknowledgement | E: enqueue is awaited, then HTTP 200; enqueue failure is logged and also returns 200. | Successful durable enqueue remains the only prerequisite for a low-latency success response; redelivery stays idempotent. | **Reliability strengthening:** durable enqueue failure must return a retryable non-2xx response rather than acknowledge lost work. | Latency, enqueue-failure, and redelivery tests. |
| Replay authorization | E: `admin:dashboard` is required through the domain/API path. | Authorization and typed API validation remain mandatory. | Preserve permission check inside the backend operation, independent of transport. | Permission allow/deny adapter tests. |
| Replay state scope | E: ID-only predicate resets pending, claimed, succeeded, failed, or dead. | Authorized terminal replay remains available and returns one safe pending attempt. | **Intentional breaking safety strengthening:** reject a valid active lease. Pending replay is idempotent; terminal replay is allowed; expired claimed work is handled transactionally through reclaim/replay policy. | Five-state compatibility plus active/expired lease cases. |
| Replay audit | N: no platform audit event. | None; absence is not treated as accepted target behavior. | **Additive strengthening:** one immutable safe audit event records actor, job identity, prior state, and outcome without payload/error secrets. | Audit success/failure atomicity and redaction tests. |
| Tenancy | E/S: `reviewJobs` is REFERENTIAL/global and accessed through auditable `unscoped()` reasons. | Initial adoption does not invent or trust a frontend `schoolId`; current Codecamp global behavior remains. | Generic contract declares tenant mode. Review jobs use global mode until a separately reviewed tenant migration proves a scoped owner. | Tenant-registry coverage and cross-tenant fail-closed fixtures for tenant-scoped job types. |
| Process/database boundary | S: current webhooks worker opens privileged DB connections directly. | Current business logic remains callable during shadow/rollback. | **Architecture strengthening:** `services/worker` sees only job ports and handler contracts. Only the approved backend PostgreSQL adapter owns queue DB/schema access. | Static architecture tests and import-boundary counterexamples. |
| Adoption/rollback | N: no generic platform exists. | Existing review job IDs, admin visibility, and old-path rollback remain available until equivalence is accepted. | Task 5 will design a generic durable-job table and reversible review-job bridge. Use shadow/dual evidence before cutover; do not delete the legacy table or polling path in the adoption change. | Migration up/down, identity mapping, shadow equivalence, and rollback drill. |
| Live locking evidence in this run | N: `DIRECT_DATABASE_URL` was unset in Task 2. | Do not convert source inspection into a new live-Postgres claim. | Task 7 must fail closed without an explicit isolated test URL and must never fall back to production/default URLs. | Fresh isolated PG16 receipts with two independent connections and deterministic teardown. |

## Non-negotiable rollout invariants

1. At-least-once delivery is the contract; exactly-once is not claimed.
2. A stale lease holder can never heartbeat, settle, fail, or replay newer work.
3. Redelivery preserves one durable identity without revoking a valid lease.
4. Successful webhook acknowledgement follows durable enqueue; persistence
   failure remains retryable.
5. Review business behavior remains outside the queue adapter.
6. No payload/provider secret is written to logs, last-error fields, or audit.
7. Legacy paths remain available until shadow/equivalence and rollback pass.

## Task 4 and Task 5 handoff

Task 4 must encode typed outcomes for enqueue, claim, heartbeat, settle, fail,
reclaim, and replay, including stale-lease/no-op discrimination. Task 5 must
encode the state mapping, lease/idempotency indexes, generic-table bridge,
tenant modes, transition table, and reversible migration. Neither task may
weaken a strengthening above merely to imitate a known unsafe baseline.


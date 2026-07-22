# Task 5 Durable Schema and `review_jobs` Adoption Design — 2026-07-22

## Decision

**Remediated candidate for fresh Task 5 design review.** Implement one generic
PostgreSQL queue table, database-enforced append-only replay/control audit, and
a Codecamp-specific reversible bridge. The legacy `review_jobs` table,
identifiers, admin visibility, and polling implementation remain intact until
shadow equivalence and a rollback drill pass. No schema, migration, adapter, or
runtime behavior changes in this task.

This design implements the accepted Task 3 compatibility matrix and Task 4
ports. It strengthens lease ownership, attempt semantics, active-lease
enqueue, safe error persistence, audit, adoption fencing, preflight, and
database ownership without claiming those properties exist in the legacy
queue.

## Exact ownership boundary

The approved PostgreSQL adapter root is exactly:

`packages/backend/src/jobs/adapters/postgres/`

Only these roots may know the queue tables or issue queue SQL:

1. `packages/db/src/` for Drizzle schema and exports;
2. `packages/db/drizzle/` for reviewed migrations;
3. `packages/backend/src/jobs/adapters/postgres/` for queue queries,
   transactions, lease-token hashing, preflight, and the Codecamp bridge.

`services/worker` imports only `@reading-advantage/backend/jobs` contracts and
ports. It never imports `@reading-advantage/db`, Drizzle, `postgres`, a database
URL, `durable_jobs`, or `review_jobs`. Business handlers remain outside the
adapter. Task 16 must remove the legacy webhooks/domain direct table access
rather than add it to the architecture baseline. The existing
`DURABLE_JOB_DATABASE_BOUNDARY` rule names this ownership model; Tasks 6 and 10
add counterexample fixtures, and Task 11 may only shrink the baseline.

## Generic table: `durable_jobs`

The Drizzle definition will live in a dedicated database jobs schema module,
not in a product schema. PostgreSQL names below are normative.

| Column | PostgreSQL contract | Purpose |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Stable durable identity returned by every port. |
| `job_name` | `text not null` | Namespaced handler identity validated by Task 4. |
| `queue_name` | `text not null` | Queue for the current generation. |
| `tenant_mode` | enum `global|tenant`, not null | Trusted scope discriminator. |
| `tenant_id` | `text null` | Required only for tenant mode. |
| `idempotency_key` | `text not null` | Handler-defined stable identity within job and tenant scope. |
| `payload_json` | `jsonb not null` | Validated current-generation payload; never exposed by dead-letter list. |
| `payload_fingerprint` | fixed lower-hex SHA-256 text, not null | Current payload digest. |
| `state` | enum `pending|running|succeeded|dead|legacy-failed`, not null | Task 4 vocabulary. New execution never emits `legacy-failed`. |
| `attempt` | integer not null default 0 | Current logical business-attempt ordinal, bounded by `max_attempts`. |
| `max_attempts` | integer not null | Inclusive bound, 1–1000. |
| `available_at` | `timestamptz not null` | Earliest claim time for the current generation. |
| `lease_token_hash` | fixed lower-hex SHA-256 text null | Digest only; the raw token is returned once and never persisted. |
| `lease_owner` | `text null` | Bounded worker identifier for operations, not authorization. |
| `lease_expires_at` | `timestamptz null` | Trusted lease expiry used by CAS and reclaim. |
| `redeliver_current_attempt` | `boolean not null default false` | Re-delivers an expired attempt without consuming another ordinal. |
| `rerun_requested` | `boolean not null default false` | Marks a complete follow-up request received while running. |
| `rerun_queue_name` | `text null` | Queue for the follow-up generation. |
| `rerun_payload_json` | `jsonb null` | Complete validated follow-up payload snapshot. |
| `rerun_payload_fingerprint` | fixed lower-hex SHA-256 text null | Digest paired with the follow-up payload. |
| `rerun_max_attempts` | integer null | Inclusive bound for the follow-up generation. |
| `rerun_available_at` | `timestamptz null` | Exact schedule from the last committed follow-up request. |
| `result_json` | `jsonb null` | Handler-validated successful result. |
| `last_error_code` | `text null` | Classified safe error code only. |
| `last_error_summary` | `text null` | Bounded safe summary, never a raw exception/provider response. |
| `completed_at` | `timestamptz null` | Required for terminal states. |
| `generation` | integer not null default 1 | Monotonic current-generation number. |
| `created_at` | `timestamptz not null default now()` | Stable creation time. |
| `updated_at` | `timestamptz not null default now()` | Last durable transition time. |

### Required checks and complete state truth table

The migration and Task 6 Red fixtures require all of these checks:

- global mode has `tenant_id IS NULL`; tenant mode has one non-empty bounded
  tenant ID;
- `attempt BETWEEN 0 AND max_attempts`, `max_attempts BETWEEN 1 AND 1000`, and
  `generation >= 1`;
- the three lease columns are all null or all non-null; the two safe-error
  columns are both null or both non-null; and the five nullable rerun snapshot
  columns are all null or all non-null;
- `rerun_requested` is equivalent to all five rerun snapshot columns being
  non-null, is permitted only while running, and `rerun_max_attempts` has the
  same 1–1000 bound as `max_attempts`;
- `redeliver_current_attempt` is permitted only for pending rows with
  `attempt BETWEEN 1 AND max_attempts`; a pending row with the marker false
  must have `attempt < max_attempts`, so no pending row is unclaimable;
- job/queue names, keys, worker IDs, summaries, and hashes obey the Task 4
  length/format bounds at the database boundary too.

The state-specific database truth table is normative. “Null” means SQL null,
and “pair” means both safe-error columns are populated.

| State | Attempt | Lease | Result | Error | Completion | Rerun snapshot | Redelivery |
|---|---|---|---|---|---|---|---|
| `pending` | `0..max`; if redelivery is false, strictly `< max` | all null | null | optional pair | null | all null | false, or true only at `1..max` |
| `running` | `1..max` | all present | null | optional pair | null | either all null or all present | false |
| `succeeded` | `0..max` | all null | non-null JSONB | both null | present | all null | false |
| `dead` | `1..max` | all null | null | required pair | present | all null | false |
| `legacy-failed` | `0..max` | all null | null | required pair | present | all null | false |

Task 4's generic terminal envelope remains permissive of zero-attempt `dead`
only for legacy envelope decode. PostgreSQL never admits such a durable row,
and the dead-list remains one-based. A legal legacy dead row at attempt zero
normalizes to generic attempt 1 while the legacy row remains unchanged. Task 6
must counterexample every forbidden table cell and partial tuple.

`payload_json` may contain JSON null only if the handler payload schema permits
it. `result_json` may contain JSON null only if the result schema permits it;
SQL null still means no result.

## Atomic identity and indexes

PostgreSQL nullable-tenant semantics require two partial unique indexes:

```sql
UNIQUE (job_name, idempotency_key)
  WHERE tenant_mode = 'global';

UNIQUE (job_name, tenant_id, idempotency_key)
  WHERE tenant_mode = 'tenant';
```

`queue_name` is not identity: moving a handler between queues cannot fork
durable work. Enqueue selects the mode-specific conflict target and always
includes the trusted tenant predicate. Codecamp's key is
`lower(owner)/lower(repo)#<positive-pull-number>` for `codecamp.review-pr`.
GitHub delivery ID is payload/audit metadata, not identity.

Required indexes are:

- global due claim: `(queue_name, available_at, id)` for pending/global;
- tenant due claim: `(tenant_id, queue_name, available_at, id)` for
  pending/tenant;
- global reclaim with queue: `(queue_name, lease_expires_at, id)` for
  running/global;
- global reclaim without queue: `(lease_expires_at, id)` for running/global;
- tenant reclaim with queue:
  `(tenant_id, queue_name, lease_expires_at, id)` for running/tenant;
- tenant reclaim without queue: `(tenant_id, lease_expires_at, id)` for
  running/tenant;
- global dead list: `(queue_name, updated_at DESC, id DESC)` for dead/global;
- tenant dead list: `(tenant_id, queue_name, updated_at DESC, id DESC)` for
  dead/tenant.

Claim orders by `(available_at,id)` and dead-list cursors encode
`(updated_at,id)`. Task 7 must run `EXPLAIN (ANALYZE, BUFFERS)` for global and
tenant reclaim, with and without queue, at representative cardinality. Each
must use the matching partial index with queue leading when queue is supplied;
if PostgreSQL chooses another shape, Task 7 must record the plan and add the
smallest query-leading index before acceptance.

## Lease token and exact attempt model

The adapter generates at least 128 random bits per claim, returns the opaque
base64url token, and persists only its SHA-256 digest. Heartbeat, settle, and
fail compare ID, trusted tenant, running state, digest, and unexpired time in
one mutation. Outcome discrimination is a payload-free lookup in the same
transaction. A matching token after expiry is `stale-lease`; an existing
non-running row is `not-running`; a scope-qualified absent row is `missing`.

`attempt` counts logical business attempts, not lease deliveries:

1. Fresh pending starts at 0 with `redeliver_current_attempt=false`.
2. Claim with that marker false requires `attempt < max_attempts`, increments
   once, and enters running with a fresh token.
3. Expiry without a coalesced rerun returns the row to pending with the same
   ordinal and `redeliver_current_attempt=true`. The next claim retains the
   ordinal, clears the marker, and rotates the token. Repeated crashes can
   re-deliver the same ordinal; a crash at `attempt=max_attempts` remains
   claimable and never creates `max+1`.
4. A handled business failure consumes the current ordinal. When retryable and
   `attempt < max_attempts`, it becomes pending with the ordinal retained and
   marker false; the next claim begins the fresh ordinal `attempt+1`. At the
   maximum it becomes dead.
5. Replay and promoted reruns are clean generations at attempt 0 with marker
   false. Success preserves the completed ordinal.

Task 6/9 freeze first claim, business retry, repeated lease expiry, the
max-attempt crash path, replay reset, and rerun reset.

## Complete enqueue and coalesced-rerun semantics

Every enqueue field is accepted atomically:

- absent identity inserts the complete request as pending generation 1;
- fresh pending at attempt 0 replaces queue, payload, fingerprint, maximum,
  and schedule with the last committed request;
- retry/redelivery pending is superseded by a clean generation: increment
  generation, replace every request field, reset attempt/error/redelivery;
- terminal becomes a clean pending generation with every request field and all
  terminal data cleared;
- active running never changes current queue, payload, fingerprint, maximum,
  attempt, owner, token, or expiry. It stores the complete request in the five
  rerun columns. Each later active enqueue atomically overwrites the entire
  snapshot; database lock order defines “last committed request wins.” There
  is no per-field merge and no earliest-schedule rule;
- enqueue that locks an expired running row first records the complete request
  as the rerun snapshot and immediately promotes it.

Promotion on settle, fail, or expired reclaim is complete: copy all five rerun
fields into current queue/payload/fingerprint/maximum/schedule, increment
generation, reset attempt to 0, clear result/error/completion/lease,
`redeliver_current_attempt`, and every rerun field/flag. It never mutates the
running generation piecemeal. Expired reclaim without a rerun uses same-attempt
redelivery instead.

Settle/enqueue, fail/enqueue, and reclaim/enqueue races serialize on the
identity row. If enqueue commits first, the later transition promotes its full
snapshot. If transition commits first, enqueue observes pending/terminal and
applies that branch. Queue moves, lower/raised maximums, and multiple active
redeliveries therefore cannot create a mixed generation or violate bounds.
Task 6/9 require both lock orders for all three race pairs.

## Transition table

Every mutation is one PostgreSQL transaction with trusted tenant predicates.

| Operation | Allowed source | Predicate | Durable result |
|---|---|---|---|
| Enqueue new | absent | partial identity | Pending generation 1, attempt 0. |
| Enqueue refresh | pending/terminal | identity + tenant | Complete last request; retry/terminal becomes clean generation. |
| Enqueue active | running/unexpired | identity + tenant + trusted now | Lease/current generation unchanged; complete snapshot overwritten. |
| Enqueue expired | running/expired | identity + tenant + trusted now | Complete snapshot promoted immediately. |
| Claim fresh | pending/due, marker false | queue + tenant + `attempt < max` + bounded `SKIP LOCKED` | Running at ordinal +1 with fresh lease. |
| Claim redelivery | pending/due, marker true | queue + tenant + `attempt >= 1` + bounded `SKIP LOCKED` | Running at same ordinal with fresh lease. |
| Heartbeat | running/unexpired | ID + tenant + digest + expiry | Extend expiry. |
| Settle | running/unexpired | ID + tenant + digest + expiry | Succeeded, or fully promoted rerun. |
| Fail | running/unexpired | ID + tenant + digest + expiry | Fresh-ordinal retry, dead, or fully promoted rerun. |
| Reclaim | running/expired | optional queue + tenant + bounded lock | Same-ordinal pending redelivery, or fully promoted rerun. |
| Replay pending | pending | ID + tenant + authorization | No mutation; audited `already-pending`. |
| Replay active | running/unexpired | ID + tenant + authorization + now | Reject; audited; lease untouched. |
| Replay expired | running/expired | ID + tenant + authorization + now | Clean pending generation at attempt 0; audited. |
| Replay terminal | succeeded/dead/legacy-failed | ID + tenant + authorization | Clean pending generation at attempt 0; audited. |
| Replay missing | absent | requested ID + tenant + authorization | Audited `missing`, without job FK. |

## Database-enforced append-only audit

`durable_job_audit_events` records replay attempts: UUID event ID, requested job
ID without FK, trusted tenant, action/outcome, prior state, actor, authorization
decision ID/time, bounded reason, correlation ID, and creation time. It stores
no payload, result, token/digest, raw error, provider response, or URL.

`review_job_adoption_audit_events` separately records control CAS: event ID,
from/to mode, prior/new generation, actor, authorization decision ID/time,
bounded reason, correlation ID, and creation time. Control fields never reuse a
replay-shaped row.

Both tables are owned by `durable_job_audit_owner`, a `NOLOGIN` role distinct
from migration and runtime roles. Revoke all privileges from `PUBLIC`; runtime
roles receive only `INSERT` and the minimum scoped `SELECT`, never
`UPDATE`, `DELETE`, or `TRUNCATE`. UUID defaults avoid sequence grants. Owner-
controlled `BEFORE UPDATE OR DELETE` and `BEFORE TRUNCATE` triggers reject
mutation even if a later grant is made accidentally. Trigger functions have a
fixed `search_path` and are not owned by, alterable by, or executable directly
by runtime roles. Runtime roles are non-owner, non-superuser, non-`BYPASSRLS`,
and lack `CREATEROLE`; the migration role is separate and is never a runtime
credential. The audit owner has no login credential.

Replay mutation and audit insert commit in one transaction; audit failure
rolls back replay. Control CAS and its control-audit insert have the same
atomicity. Task 7/9 negative tests, using actual runtime credentials, must show
UPDATE, DELETE, and TRUNCATE fail, the rejecting triggers fail closed under an
intentionally temporary migration-test grant, `PUBLIC` has nothing, and
runtime cannot disable/replace the triggers or assume owner/migration roles.

## Tenant-registry classification

`durable_jobs`, both audit tables, and the review bridge/control/issue tables
are `REFERENTIAL`. They mix global and keyed tenant records and fail closed
through TenantDB. Only the exact PostgreSQL adapter obtains a raw connection,
and every query repeats a validated mode-specific predicate. Codecamp review is
global; adoption never manufactures or trusts a frontend `schoolId`.

## Reversible `review_jobs` bridge and enforceable fence

`review_job_durable_bindings` has legacy ID as primary/FK, durable ID as
unique/FK, and immutable creation metadata. It owns no payload. Backfilled rows
reuse the legacy UUID when available, but the binding is authoritative.

The single-row `review_job_durable_adoption` control stores only current mode
(`legacy|shadow|paused|generic`), monotonic generation, and update metadata.
Its allowed CAS edges are:

- `legacy -> shadow` and abort `shadow -> legacy`;
- `shadow -> paused` and abort `paused -> shadow`;
- `paused -> generic` for cutover;
- `generic -> paused -> legacy` for rollback.

No direct `legacy <-> generic` transition exists. CAS requires expected mode
and generation, an authorized operator decision, reconciliation preconditions,
and an atomic append to the separate control-audit table. It increments the
generation exactly once.

The database fence has three independent parts:

1. Queue tables have `NOLOGIN` owners. The old broad application credential
   loses direct claim UPDATE before shadow. The updated legacy poller uses a
   separate least-privileged legacy-claim role/credential; the PostgreSQL
   adapter uses a different least-privileged adapter role/credential.
2. An owner-controlled trigger on every `review_jobs` transition into
   `claimed` reads the adoption control and caller role. It permits the
   legacy-claim role only in `legacy|shadow`; it permits only the adapter's
   projection transition in `generic`; it rejects all claims in `paused` and
   all other callers. At cutover, claim UPDATE/claim-function privilege is also
   revoked from the legacy-claim role. Runtime roles cannot disable the trigger.
3. New legacy and generic deployments are configured with expected mode and
   generation. Startup/readiness fails unless the control row exactly matches,
   and each claim transaction repeats that equality. A generation change makes
   old ready instances fail closed. The pre-control truly stale process is
   fenced by revoked broad credentials and the trigger, not by cooperation.

Task 7/9 must keep a pre-control legacy connection open across cutover and
prove its unchanged direct claim SQL is denied while the generic adapter can
claim exactly once. They must also prove wrong-generation updated workers are
not ready and claim zero rows.

Modes are execution-exclusive: legacy claims in `legacy|shadow`, neither
claims in `paused`, and generic claims in `generic`. Shadow writes/projected
state update both representations, but there is never dual execution.

## Total legacy preflight, mapping, and quarantine

Before expand/backfill, the adapter runs a read-only, repeatable-read preflight
over every legal `review_jobs` row. It pages by ID and validates:

- non-null handler-decodable `payload_json`, including the exact Codecamp
  handler schema; owner/repo non-empty and within bounds; positive pull number;
- normalized identity length and collisions after lowercase normalization;
- UUID syntax and collision against existing durable IDs/bindings;
- `max_attempts` in 1–1000 and state-specific attempt bounds;
- finite/coherent timestamps and claimed fields (`claimed` requires bounded
  non-empty owner and claim time; non-claimed rows ignore residual claim fields
  but never copy them to a lease);
- result reference shape and every bounded queue/job/key/fingerprint value the
  generated row will require.

Preflight never updates either table. It emits totals and fixed safe codes only:
`LEGACY_PAYLOAD_MISSING`, `LEGACY_PAYLOAD_INVALID`,
`LEGACY_IDENTITY_INVALID`, `LEGACY_IDENTITY_COLLISION`,
`LEGACY_ATTEMPT_INVALID`, `LEGACY_CLAIM_INCOHERENT`,
`LEGACY_TIMESTAMP_INVALID`, `LEGACY_HANDLER_DECODE_FAILED`,
`LEGACY_UUID_COLLISION`, or `LEGACY_MAPPING_INVALID`. It emits no payload,
owner/repo text, raw error, decoder text, SQL, or URL.

The deterministic five-state mapping is:

| Legacy state | Generic state and exact normalization |
|---|---|
| `pending` | `pending`; preserve valid attempt/max/schedule, marker false, normalized identity, decoded payload; require `attempt < max`. |
| `claimed` | `running`; ordinal is `attempts + 1`, which must be `1..max`; synthetic shadow-only digest/owner/expiry derives from claim time and configured visibility; cutover requires zero such rows. |
| `succeeded` | `succeeded`; preserve valid `attempts`, result `{ reviewId }` including JSON null, completion=`updated_at`, no error/lease. |
| `failed` | `legacy-failed`; preserve valid `attempts`, completion=`updated_at`, fixed code `LEGACY_REVIEW_JOB_FAILED` and fixed safe summary. |
| `dead` | `dead`; attempt=`max(1, attempts)` within max, completion=`updated_at`, fixed code `LEGACY_REVIEW_JOB_DEAD` and fixed safe summary. |

Any row that cannot satisfy that exact mapping is not coerced. It remains
untouched and legacy-owned with no binding/generic row. During the later
backfill phase, `review_job_migration_issues` may persist only legacy job ID,
preflight run ID, one fixed code, bounded field group, detected time,
resolution status/code, resolver subject, and resolution time. It has no
payload, normalized identity text, raw value/error, SQL, URL, or free-form
detail; uniqueness is `(review_job_id, code)` and reports are bounded/count-
first. Resolution changes require control-style authorization/audit.

Quarantined/unmapped count, unresolved issue count, invalid generic envelopes,
identity collisions, and missing bindings must all be exactly zero before
entering `shadow`, again before `paused`, and again before `generic`. One issue
fails closed; no “best effort” shadow/cutover exists. Repairs occur only through
a separately reviewed legacy-data repair, after which read-only preflight and
idempotent backfill rerun. Raw legacy errors remain only in the untouched
legacy table.

## Rollout and rollback

1. **Preflight:** read every legacy row and require a zero-issue admissible
   report before expand/backfill proceeds.
2. **Expand:** create generic/audit/bridge/control/issue objects and indexes;
   default control to legacy; install role/trigger fencing; behavior unchanged.
3. **Backfill:** idempotently map admissible rows in bounded transactions;
   generic execution remains fenced. Re-run preflight and require zero issues.
4. **Shadow:** CAS legacy to shadow. Both representations update atomically,
   but only the restricted legacy poller claims. Compare every mapped field.
5. **Cutover barrier:** CAS shadow to paused, stop claims, drain/reclaim live
   claims, require zero live work/issues/differences, revoke legacy claim
   privilege, prove the stale-process counterexample, then CAS to generic.
6. **Generic:** only generic claims; transitions mirror legacy projections for
   admin visibility and rollback.
7. **Rollback drill:** generic to paused, drain/expire active leases, reconcile,
   restore least-privileged legacy claim grant, then paused to legacy.
8. **Retirement:** deletion of legacy data/code is a later dedicated track.

Before generic cutover, migration down may drop only new objects after proving
mode legacy, zero generic-only identities, and complete reconciliation. After
cutover, schema-down is forbidden until rollback has returned authority to
legacy. No down migration deletes or rewrites a legacy row.

## Required Red and implementation evidence

Task 6 adds schema/migration/registry and invalid-transition Red tests for every
check, truth-table exclusion, partial unique/index contract, token absence,
complete rerun snapshot, bridge/control/issue shape, audit privileges/triggers,
and adapter root. Task 7 owns the isolated PostgreSQL 16 harness, preflight,
role fence, explain plans, and audit privilege negatives. Tasks 8–9 own two-
connection claim/CAS/enqueue/replay/audit/control races. Task 10 owns worker and
static import-boundary counterexamples. Tasks 11–17 may make them Green only in
their assigned phase.

Required adoption evidence includes migration up/down before cutover,
idempotent backfill, all five legacy states, every safe preflight issue code,
normalized collision, zero-attempt legacy dead normalization, max-attempt
crash redelivery, queue/max coalescing, both race orders, cross-tenant zero
access, stale legacy fencing, generation readiness, shadow equality, paused
cutover, append-only negatives, generic projection, and rollback drill.

## Remediation ledger

| Finding | Normative remediation | Required counterexample |
|---|---|---|
| `T5-H1` | “Lease token and exact attempt model”; transition claim/fail/reclaim rows | Task 6/9 max-attempt crash reclaims same ordinal, repeated expiry, fresh business retry, replay/rerun reset |
| `T5-H2` | “Required checks and complete state truth table” | Task 6 every forbidden lease/result/error/completion/rerun/redelivery/attempt combination and dead 0 rejection |
| `T5-H3` | “Complete enqueue and coalesced-rerun semantics” | Task 6/9 queue move, lower/raise max, last-commit-wins multiple enqueue, both settle/fail/reclaim race orders |
| `T5-H4` | “Reversible bridge and enforceable fence” | Task 7/9 pre-control stale SQL denied, privilege revoked at cutover, wrong-generation readiness/claim denied, allowed control CAS/audit only |
| `T5-H5` | “Total legacy preflight, mapping, and quarantine” | Task 7 every issue code, all five mappings, collision/bounds/coherence/decode/UUID cases, one unresolved issue blocks shadow/cutover |
| `T5-H6` | “Database-enforced append-only audit” | Task 7/9 runtime UPDATE/DELETE/TRUNCATE/trigger-disable/role-assumption negatives and transaction rollback on audit failure |

## Task boundary

Task 5 changes Measure documentation only. It does not create schema, SQL,
roles, triggers, credentials, a lease token, adapter, backfill, control row,
worker, or browser claim. Phase 1 still requires a fresh independent review of
this exact remediated artifact and the governing Task 1–4 evidence.

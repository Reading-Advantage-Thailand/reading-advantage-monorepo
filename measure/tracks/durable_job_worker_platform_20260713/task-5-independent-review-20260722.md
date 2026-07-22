# Task 5 Independent Adversarial Review — 2026-07-22

## Verdict

**FAIL.** The design correctly chooses mode-specific partial uniqueness for a
nullable tenant, the exact approved PostgreSQL adapter root, lease-token digest
CAS, tenant-qualified mutations, replay mutation/audit transaction coupling,
and a no-dual-claim rollout goal. Six blocking design gaps remain. Task 5 must
stay open and Phase 1 must not be accepted until the design is remediated and
freshly re-reviewed.

This is a design review only. No production code, schema, migration, plan,
metadata, verification, registry, staging area, or commit was changed.

## Findings

### High — T5-H1: max-attempt lease expiry creates an unclaimable row

The design says claim increments `attempt` exactly once, reclaim preserves the
attempt, and the next claim increments it again
(`task-5-schema-adoption-design-20260722.md:139-141`). Its database invariant is
`attempt <= max_attempts` (`:76-77`). Therefore a running lease at
`attempt=max_attempts` that expires is reclaimed to pending at the maximum, and
the required next claim would violate the check by incrementing to
`max_attempts + 1`.

That is not a rare edge: Task 3 requires abandoned work to become claimable
again and says the next claim rotates the lease token
(`task-3-compatibility-matrix-20260722.md`, Visibility reclaim row). The current
legacy claim does not increment attempts; failure settlement does, so this is
also an intentional semantic change that the design has not reconciled with
the compatibility rule (`packages/webhooks/src/review-worker.ts:492-515` and
`:889-939`).

Required remediation: define one internally consistent attempt model for
claim, failure, expiry, reclaim, replay, and rerun. In particular, specify and
test the max-attempt crash path. Acceptable choices include reclaiming the same
attempt number through an explicit re-delivery marker or a separately accepted
terminal-expiry rule, but the latter would require amending the Task 3
reclaimability decision. Do not leave a pending row that cannot be claimed.

### High — T5-H2: database state checks are weaker than the Task 4 envelopes

The required checks only say running has lease fields and no completion,
pending has no result/completion, succeeded has result/completion, and
dead/legacy-failed have safe error/completion
(`task-5-schema-adoption-design-20260722.md:78-83`). They do **not** prohibit:

- `result_json` on running, dead, or legacy-failed rows;
- safe-error fields on succeeded rows; or
- attempt zero on dead rows.

Task 4's strict envelopes omit result from running/dead/legacy-failed and omit
last error from succeeded (`packages/backend/src/jobs/contracts.ts:109-133`).
The public dead-list contract additionally requires `attempt >= 1`
(`packages/backend/src/jobs/dead-letter-contracts.ts:13-25`). Rows admitted by
the proposed database checks can therefore fail the already-accepted public
contracts, contrary to FR-2's fail-closed invalid-transition requirement.

Required remediation: provide the complete per-state truth table for result,
error, completion, lease, rerun, and attempt fields, then require Task 6
counterexamples for every forbidden combination. Resolve the Task 4 generic
dead-envelope/dead-list attempt-bound discrepancy explicitly before Task 11.

### High — T5-H3: active enqueue loses part of the accepted request

`EnqueueJobRequest` includes `queueName`, `maxAttempts`, payload, and schedule
(`packages/backend/src/jobs/contracts.ts:157-165`). Queue is deliberately
excluded from identity so a handler can move queues
(`task-5-schema-adoption-design-20260722.md:106-109`). During an active lease,
however, the design specifies only that payload/fingerprint and rerun schedule
are updated while state, attempt, owner, digest, and expiry are retained
(`:150-153`). It does not define what happens to the newly requested queue or
maximum attempts.

Updating `max_attempts` in place can immediately violate
`attempt <= max_attempts` when a redelivery lowers the bound. Retaining it
silently discards part of the accepted follow-up request. Updating `queue_name`
in place changes the partition of an already-running generation. The schema has
no separate coalesced queue/max-attempt snapshot, so the promised fresh pending
generation cannot reconstruct the complete newest request.

Required remediation: normatively define pending, terminal, active, expired,
and multi-redelivery behavior for **every** enqueue field. If current-generation
and follow-up values differ, persist a complete bounded follow-up snapshot (or
document and contract a different merge policy) and specify its atomic
promotion/reset semantics. Add Task 6/9 cases for queue moves, lowering and
raising max attempts, multiple active redeliveries, settle/enqueue races, and
fail/enqueue races.

### High — T5-H4: the adoption control cannot fence a genuinely stale worker

The design says both claim paths read a control row, stale deployments fail
closed on generation, and dual execution never occurs
(`task-5-schema-adoption-design-20260722.md:237-248`). No database-enforced
fence, expected-generation handshake, credential/role boundary, or claim-port
field is defined. An actually stale legacy deployment is the current poller:
it issues `UPDATE review_jobs ... FOR UPDATE SKIP LOCKED` directly and knows
nothing about the new control (`packages/webhooks/src/review-worker.ts:492-515`).
Such a process can keep claiming in `generic` mode while the generic adapter
also claims the bridged identity.

The same section says control transitions are audited, but the only defined
audit row is replay-shaped around a requested job ID, replay outcome, actor,
and replay authorization (`task-5-schema-adoption-design-20260722.md:202-212`).
It does not define control mode/generation transitions or their CAS/audit
schema.

Required remediation: design an enforceable cutover fence that old claim SQL
cannot bypass (for example, database role/privilege fencing or another reviewed
database-level mechanism), plus an explicit expected-generation protocol for
new deployments. Define allowed control transitions, CAS predicates, operator
authorization, and atomic control audit fields. Prove with a stale-legacy-
process counterexample that `generic` mode cannot dual-claim.

### High — T5-H5: backfill is not total over the legacy schema

The generic table requires non-null validated payload and bounded names, keys,
attempts, maximum attempts, worker IDs, summaries, and hashes
(`task-5-schema-adoption-design-20260722.md:45-72,85-89`). The existing
`review_jobs` table permits SQL-null `payload_json` and has no database checks
for positive PR number, non-empty/bounded owner/repo, or attempt/max-attempt
bounds (`packages/db/src/schema/codecamp.ts:329-356`; the applied migration is
`packages/db/drizzle/0025_review_jobs.sql:7-30`).

The rollout nevertheless requires idempotently backfilling and reconciling all
bindings, while the state map merely says to preserve payload and attempts
(`task-5-schema-adoption-design-20260722.md:252-260,269-277`). It defines no
preflight, quarantine, canonical repair, or fail-closed policy for a legal
legacy row that cannot satisfy the generic checks or handler payload schema.
`failed -> legacy-failed` also does not specify the required completion time or
safe error when legacy columns are null.

Required remediation: add a read-only preflight with exact admissibility rules
and counts, define deterministic mapping for every nullable/unbounded legacy
field and every one of the five states, and define a reversible quarantine or
cutover-blocking policy. Shadow/cutover must fail closed on any unmapped or
contract-invalid row; no raw legacy error may be copied into safe fields.

### High — T5-H6: append-only audit is asserted, not enforced

The audit table is called immutable, but enforcement is only described as “no
update/delete application path” (`task-5-schema-adoption-design-20260722.md:
202-208`). The approved adapter owns a privileged raw connection and therefore
an omitted port method does not make PostgreSQL rows immutable. This is weaker
than Task 4's accepted immutable-audit requirement and leaves replay/control
evidence alterable by the same database principal that inserts it.

Required remediation: specify database-enforced append-only behavior and its
migration/role ownership (least-privilege grants, an independently owned
trigger, or an equivalently reviewed PostgreSQL mechanism), including how tests
prove update/delete rejection. Keep replay mutation and audit insertion in one
transaction, as the current design correctly requires.

## Non-blocking observations to freeze in remediation

- The two partial unique indexes correctly avoid PostgreSQL nullable-tenant
  uniqueness failure. Their mode predicates plus the tenant-mode check are the
  right basis for atomic identity.
- Lease mutation predicates correctly include job ID, trusted tenant, running
  state, token digest, and unexpired time. The remediation should additionally
  map each zero-row case, including an expired matching token, to exactly one
  Task 4 outcome.
- Tenant-registry `REFERENTIAL` classification is consistent with the current
  fail-closed TenantDB behavior, provided only the exact adapter obtains the raw
  connection and every query repeats the validated mode-specific predicate.
- Due-claim and dead-list indexes are mode-specific and cursor ordering is
  deterministic. Reclaim has only `(lease_expires_at,id)` despite mandatory
  tenant scope and optional queue scope; Task 6 should require an explained
  query plan or mode-specific reclaim index before accepting bounded/fair
  multi-tenant polling.
- The approved persistence root exactly matches
  `packages/architecture-enforcement/src/config/ownership-map.v1.json:455-464`,
  and the Task 5 document truthfully limits itself to design rather than
  claiming schema, migration, live PostgreSQL, worker, or browser evidence.

## Evidence reviewed

- Required graph-first query: fresh `repo-graph search graph.db reviewJobs`
  resolved current admin list/replay and enqueue usages; fresh
  `repo-graph inspect graph.db DurableJobWorkerPort` resolved the accepted
  least-privilege worker surface at `packages/backend/src/jobs/ports.ts:40-85`.
- `spec.md`, `plan.md`, Task 2 inventory, Task 3 compatibility matrix, Task 4
  report, contracts, ports, and dead-letter contracts.
- Current `review_jobs` Drizzle schema and migration, tenant registry, legacy
  claim/reclaim/failure source, and architecture ownership map.

## Required re-review gate

Remediate T5-H1 through T5-H6 in the Task 5 design without implementing Task
6+ schema/runtime behavior. Then obtain a fresh independent review against the
exact remediated artifact. Task 5 remains incomplete until that review returns
PASS with no open Critical/High finding.

# Phase 2 test strategy and contract design: company tenant mapping and durable projection

> Canonical Phase 2 strategy for `sales_mastery_consumer_20260810`. This file is
> docs-only. It creates no contracts, no tests, no migrations, and no source. It
> defines the future contracts and the falsifiable test groups that a later Phase
> 2 execution must implement. The accepted Phase 0 semantics in
> `test-strategy.md` are unchanged; this file is the isolated Phase 2 section.

## 1. Hard boundary of this transition

- Phase 2 execution is NOT admitted. Every Phase 2 Red, source, and migration
  task remains `[b] deferred:phase0-task-b-closeout` behind Phase 0 Task B
  shared-root closeout and final acceptance.
- The Finance ordering prerequisite is accepted: the additive/journaled
  `0003_finance_attestation_audit_metadata` migration and
  `meta/0003_snapshot.json` landed in
  `48470311d4f6b06b7e9ebcce7ba1f380444f0a79` (Finance Task 3 final acceptance,
  2026-08-13). This removes only the stale Finance ordering block.
- No `phase2_base_sha` is captured in this transition. See section 12.
- Phase 0 base remains exactly `8adc57cb0af0693c1b3420842b3a504939a36b2e`.
  Phase 1 remains accepted at `86a6503ac` with digests recorded in
  `phase1-sales-graph-acceptance-20260811.md`.

## 2. Grounding in accepted boundaries

This design consumes only existing, reviewed surfaces:

- Company Identity claims contract
  (`packages/backend/src/modules/company-identity/contracts.ts`,
  `companyIdentityClaimsSchema`): strict object with `sub` (uuid), `aud`,
  `organizationId` (uuid), `organizationKey` (application-key grammar),
  `status: "ACTIVE"`, `roles`, `authVersion`.
- Sales company principal resolution
  (`packages/domain/src/company-identity-principal.ts`,
  `resolveSalesCompanyPrincipal`): verifies `aud === "sales"` and rejects
  unknown organization keys before any local row is used.
- Sales authorization scope (`packages/domain/src/sales/schema.ts`,
  `salesAccessScopeSchema`): discriminated union with
  `kind: "company", applicationKey: "sales", organizationId, organizationKey`.
- Mastery persistence contract (`packages/domain/src/mastery/persistence-contracts.ts`,
  `mastery.persistence.v1`): strict records, provenance
  (`masteryProvenanceSchema`), audit (`masteryAuditSchema`), and commit receipt
  (`masteryCommitRecordSchema`) with `requestDigest`/`resultDigest`.
- Drizzle mastery adapter
  (`packages/domain/src/mastery/drizzle-mastery-persistence.ts`): fail-closed
  constructor (`TENANT_SCOPE_ERROR` without tenant/actor), per-command tenant
  and actor assertions, equal-replay receipt return, and
  `IDEMPOTENCY_CONFLICT` on a reused key with a different digest.
- Mastery schema (`packages/db/src/schema/mastery.ts`): tenant key is
  `school_id` (uuid); learner ownership chains through `mastery_principals`
  `(schoolId, studentId, sourceTenantKey)`; natural unique keys scope every
  record to `(schoolId, studentId, ...)`.
- Tenant hardening (`packages/db/drizzle/0028_mastery_tenant_hardening.sql`):
  migration blocks on cross-school or missing student owners and on broken
  card-review-evidence chains.
- Admitted Sales runtime release set
  (`packages/mastery-runtime-compat/runtime-manifest.json`,
  `mastery-runtime-0.1.0-kst-srs-3.2-sales`): graph release
  `knowledge-space-sales-mastery-v1.0.0`, migration head
  `0028_mastery_tenant_hardening`, and the Phase 1 evidence digests.
- Finance-proven outbox pattern (accepted in
  `company_finance_operations_20260810` Phase 1): one atomic transaction writes
  the record and its audit outbox event; append-only triggers reject UPDATE,
  DELETE, and TRUNCATE; a composite sentinel verifies the triggers.

## 3. Future contract C1: fail-closed organization-to-Mastery tenant mapping

Name (future): `resolveSalesMasteryTenant`. Input is ONLY the server-verified
Company Identity tuple. Output is one dedicated Mastery tenant binding.

Contract rules:

1. Accept only `(applicationKey="sales", organizationId, organizationKey)`
   from verified Company Identity claims (`aud === "sales"`,
   `status === "ACTIVE"`). Claims arrive from the Accounts introspection or
   signed-ID-token path, never from request bodies.
2. Resolve exactly one Mastery tenant namespace per verified organization.
   First authorized use creates the binding in one transaction; later calls
   reuse it. A database unique constraint on `(applicationKey, organizationId)`
   makes duplicate tenants impossible.
3. The caller can never select, supply, or override a tenant. No `schoolId`,
   tenant key, or organization parameter crosses the public command boundary.
   Any such input is rejected with a stable error code.
4. Codecamp's reserved namespace is rejected. A mapping whose target equals a
   Codecamp tenant, or a claim with `aud !== "sales"`, fails closed.
5. The returned binding feeds the existing adapter as
   `tenant: { schoolId: <mapped tenant key> }` with
   `sourceTenantKey = "sales:<organizationId>"` and
   `actorId` bound to the Sales-local learner principal.

Future schema (owned by the Phase 2 migration task, not by this document):

- New table (working name `sales_mastery_tenant_mappings`):
  `application_key text`, `organization_id uuid`, `organization_key text`,
  `mastery_tenant_key uuid unique`, `provisioned_by text`,
  `request_id text`, `created_at timestamptz`.
- Unique constraint `(application_key, organization_id)`. CHECK constraint
  `application_key = 'sales'`. No UPDATE or DELETE path; corrections are new
  reviewed migrations.
- Migration ownership: `packages/db/drizzle`, serial after the current head
  `0051_marketing_phase7_audit_and_script`, journaled in `meta/_journal.json`
  and `MIGRATION_LEDGER.md`, additive, and applied before dependent code.

Changed-contract risk (must be resolved by the migration task, flagged here):
mastery tables foreign-key `school_id` to `schools.id`, and migration 0028
requires every mastery `student_id` to resolve to an in-tenant owner. The
migration task must either provision a dedicated namespace row compatible with
those constraints or extend the namespace model explicitly. The invariant that
Red tests must prove either way: every Sales mastery row carries the mapped
tenant key, the learner principal resolves through `mastery_principals` with
the Sales `sourceTenantKey`, and no cross-organization foreign key can exist.

## 4. Future contract C2: durable idempotent projection command

Name (future): `projectSalesMasteryEvidence`. One command per validated source
attempt.

Input binding (all server-side, all validated by strict Zod schemas):

- verified organization tuple (from C1; never caller-supplied);
- Sales-local learner principal (resolved through the existing company
  principal path, not from request input);
- source application identity (`sales-advantage` within the admitted range
  `>=0.1.0 <0.2.0`);
- graph release `knowledge-space-sales-mastery-v1.0.0` and the Phase 1 binding
  digests;
- source-attempt identity (immutable quiz attempt id, or eligible immutable
  roleplay evaluation id);
- idempotency key and canonical payload digest (`sha256:` form, same
  canonicalization as the adapter's `digest()`);
- the `practice.v1` evidence payload;
- provenance and audit fields satisfying `masteryProvenanceSchema` and
  `masteryAuditSchema`.

Semantics:

1. Equal replay (same idempotency key, same digest) returns the original
   receipt with replayed status. No new rows are written.
2. Conflicting replay (same key, different digest) fails closed with the
   adapter's `IDEMPOTENCY_CONFLICT` class error. Nothing mutates.
3. Every mutation is append-only: evidence, review, state revision, commit
   receipt, and the outbox event are inserts in one transaction. Corrections
   are new superseding records, never updates.
4. The outbox event is written atomically with the commit (Finance-proven
   pattern). The outbox row binds tenant, learner, source attempt, graph and
   rubric versions, request/correlation identity, payload digest, and outcome.
5. Retry is safe: delivery is at-least-once; redelivery with the same
   idempotency identity collapses to replay; a failed delivery leaves the
   outbox row pending and retryable without duplicating evidence.
6. Concurrency is safe: natural unique keys
   (`(schoolId, studentId, objectiveId, variantKey)`, commit idempotency key)
   plus `expectedRevisions` optimistic checks. Two equal concurrent submissions
   converge to one applied commit plus replays. Two conflicting concurrent
   submissions produce exactly one applied commit and fail-closed conflicts.

## 5. Authorization and tenant isolation requirements

- Every learner and administrator operation requires Company Identity
  authorization and organization scope. Unauthenticated, wrong-audience,
  suspended, or cross-organization callers are rejected before any mapping or
  projection work.
- Administrator evidence inspection is scoped to the caller's own mapped
  organization. There is no cross-organization read path.
- Cross-organization replay and evidence reuse are rejected: an idempotency
  key or source-attempt id from organization A presented under organization B
  fails closed.
- Audit records bind actor, organization, learner, operation, source attempt,
  graph/rubric versions, request/correlation identity, outcome, and projection
  receipt. They retain no secrets and no raw audio.

## 6. Risk decomposition and classification

Risk classification: CRITICAL. Phase 2 owns database tenant mapping,
cross-organization isolation, and idempotent projection. A defect leaks
knowledge state across organizations or duplicates mastery evidence.

| Risk | Class | Mitigation in design |
|------|-------|----------------------|
| Cross-organization knowledge-state leakage | critical | C1 fail-closed mapping; unique `(applicationKey, organizationId)`; adapter tenant assertion; cross-org Red matrix |
| Duplicate mastery evidence | high | idempotent commit receipt; append-only inserts; unique natural keys |
| Tenant chosen from frontend input | high | no tenant parameter on the boundary; claims-only resolution |
| Codecamp namespace reuse | high | explicit rejection test; descriptor-level exclusion already enforced in Phase 0 |
| Replay conflict silently overwriting | high | `IDEMPOTENCY_CONFLICT` fail-closed; conflicting-replay Red tests |
| Lost projection after partial failure | high | atomic commit + outbox; retry collapses to replay |
| Concurrent double-apply | medium | unique constraints plus `expectedRevisions`; concurrency Red tests |
| Stale provenance (graph/rubric drift) | high | provenance schema on every record; digest-mismatch Red tests |

## 7. Future Red suite (groups, falsification conditions)

The Red suite does not exist yet. These groups are the contract for it. Each
group names its falsification condition.

1. Mapping creation and reuse: first use creates exactly one tenant; second
   use returns the same tenant. Falsification: two tenants for one
   organization, or a new tenant per call.
2. Mapping race: two concurrent first-use resolutions yield one row and one
   tenant. Falsification: a unique-constraint violation escapes, or two rows
   exist.
3. Cross-organization denial matrix: org A caller cannot read, write, replay,
   or reuse evidence in org B. Falsification: any cross-org operation returns
   success or data.
4. Frontend-tenant rejection: a request carrying `schoolId`, tenant key, or
   organization override fails closed. Falsification: the value is used.
5. Codecamp namespace rejection: a mapping or projection targeting Codecamp's
   namespace fails closed. Falsification: it succeeds.
6. Equal replay: identical command twice yields one applied receipt and one
   replayed receipt with identical record ids. Falsification: two applied
   commits or different ids.
7. Conflicting replay: same key, mutated payload fails closed.
   Falsification: the second payload is applied.
8. Retry after failure: a failed projection retried with the same identity
   completes once. Falsification: duplicated evidence rows.
9. Concurrent commits: N equal submissions yield one applied and N-1 replays;
   N conflicting submissions yield one applied and N-1 conflicts.
   Falsification: any other count. Counts must be labeled integers parsed from
   query results, not bare digit matches (A3 defense).
10. Append-only outbox: UPDATE, DELETE, and TRUNCATE on evidence, commit, and
    outbox tables are rejected by triggers. Falsification: a mutation succeeds.
11. Malformed evidence: schema-invalid payloads are rejected before any write.
    Falsification: a partial row exists after rejection.
12. Graph/rubric drift: a payload whose graph release or binding digest differs
    from the admitted Phase 1 digests fails closed. Falsification: drifted
    evidence is accepted.
13. Provenance completeness: every persisted record carries full
    `masteryProvenanceSchema` and audit identity. Falsification: a record with
    a missing provenance field exists.
14. Consent gate for roleplay evidence: projection rejects evidence derived
    from a roleplay attempt without the recorded consent and retention gate
    (A2 defense; the consent gate precedes provider/storage calls in the
    existing `roleplayAudioInputSchema` contract). Falsification: non-consented
    evidence projects.

## 8. Future commands (exact shapes, package placement provisional)

Targeted Red command (unit/contract level; mock DB via `vi.fn()` per repository
policy):

```bash
CI=true pnpm --filter @reading-advantage/domain exec vitest run \
  'src/__tests__/sales-mastery-projection.red.test.ts' --maxWorkers=1
```

Live-behavior Red command (disposable PostgreSQL; proves triggers, unique
constraints, and replay against real bytes, following the Finance integration
precedent):

```bash
CI=true pnpm --filter @reading-advantage/db exec vitest run \
  'src/__tests__/sales-mastery-tenant.integration.test.ts' --maxWorkers=1
```

Green gate: both Red commands exit zero, AND these regression guards exit zero:

```bash
pnpm --filter @reading-advantage/domain run test
pnpm --filter @reading-advantage/sales-knowledge run test
pnpm --filter @reading-advantage/mastery-runtime-compat run test
```

Closeout gate adds: focused lint and type-check for every touched package, the
migration serial/ledger check, and the no-shared-engine-changes diff guard
against `phase2_base_sha` (captured per section 12):

```bash
git diff --name-only <phase2_base_sha> -- \
  packages/knowledge-space-core \
  packages/knowledge-space-practice \
  packages/practice-core \
  packages/srs-engine \
  packages/sales-knowledge \
  packages/mastery-runtime-compat
# Expected output: empty.
```

The exact Red file names are fixed by the Mid-red role at execution time. This
document fixes the groups and the falsification conditions, not the file names.

## 9. Fixtures, mocks, and live-behavior proof expectations

Fixtures (checked-in contract data, future):

- A verified-claims fixture per organization (two organizations minimum) with
  exact `sub`, `organizationId`, `organizationKey`, `aud: "sales"`.
- A tampered-claims fixture set: wrong audience, suspended status, mismatched
  `organizationKey`, Codecamp namespace target.
- Replay fixtures: equal payload pair, conflicting payload pair (same key,
  mutated digest-bearing field).
- Provenance fixtures binding the Phase 1 graph and bindings digests exactly.

Mocks: unit-level tests mock the DB layer with `vi.fn()` (repository policy).
The adapter under test must never be mocked away; contract tests call the real
adapter seam. Company Identity verification is mocked at the introspection
boundary only, never inside the mapping logic.

Live-behavior proof: trigger enforcement, unique-constraint races, replay
receipts, and outbox append-only behavior run against disposable PostgreSQL
(live-gated integration suite, Finance precedent). A test that only inspects
artifacts cannot prove these; see section 11.

## 10. Architecture guardrails and changed-contract risks

- The four engine packages, `sales-knowledge`, and `mastery-runtime-compat`
  stay immutable. The closeout diff guard enforces this.
- New code lives behind the existing Mastery/activity adapters. No fork of the
  engine, no provider SDK bypass.
- Business logic lands in `packages/domain` (or the backend module seam);
  route handlers and Server Actions stay thin.
- Migrations are additive, serial, journaled, and applied before dependent
  code. Destructive changes to mastery tables are out of scope.
- Changed-contract risks: the tenant-namespace FK decision (section 3), any
  new outbox table for mastery projection, and any extension of
  `mastery.persistence.v1` (would require runtime-compat governance, not a
  drive-by change).

## 11. Artifact/documentation tests vs live behavior tests

Artifact/contract tests (no database): schema validation of mapping inputs and
projection commands, digest equality against Phase 1 values, rejection-code
assertions on cloned inputs, `aud`/namespace rejection at the schema boundary.
Falsifiable by a wrong digest, a missing field, or an accepted bad claim.

Live behavior tests (real database): trigger append-only enforcement,
unique-constraint race outcomes, replay/conflict receipts, retry dedup, and
cross-organization denial under real rows. Falsifiable by a succeeding
mutation, a duplicate row, or a leaked record.

A strategy or plan claim may cite artifact tests only for contract shape. Every
isolation, idempotency, retry, and concurrency claim requires the live suite.

## 12. phase2_base_sha capture point (future, exact)

Do not capture or record `phase2_base_sha` in this transition. The capture
point is AFTER the strategy commit AND its follow-up evidence commit (the
commit that marks the docs-only plan task `[x]` and lands the final role log),
when no track-owned dirty path remains. At that point, and only then, the
orchestrator runs `git rev-parse HEAD` and records the result as
`phase2_base_sha`. That SHA is the baseline for all future Phase 2 Red and
source/migration diff guards. The `role_base_sha`
`08c63e9fdc5fe7823cb50709532876e70f3d26a7` predates the committed strategy and
must not be used. Capturing any SHA before the evidence commit lands is
invalid, because Red must begin after complete committed strategy evidence.

## 13. Intentionally-red aggregate-suite handling

The repository aggregate `pnpm turbo run lint` and `pnpm turbo run test` are
intentionally red from pre-existing failures outside this track. Phase 2 gates
must use the focused `--filter` commands in section 8, never the aggregate
(A7 defense: an over-broad aggregate would hide a real Phase 2 regression
inside pre-existing red noise). Phase 2 must not fix the aggregate red state.

## 14. Applicability

| Review type | Applicable | Notes |
|-------------|-----------|-------|
| Security review | Yes | Fail-closed mapping, tenant isolation, cross-org denial, consent gate, provenance binding, append-only audit. |
| UX/API review | Partial | No UI. The API surface is the mapping and projection command contract and its stable error codes. |
| Adversarial testing | Yes | Tampered claims, frontend-tenant injection, Codecamp namespace reuse, replay conflicts, concurrent first-use races, drifted digests, non-consented evidence. |
| Browser review | No | Phase 2 owns no browser behavior. Phase 4 owns authenticated browser QA. |

## 15. Anti-pattern coverage for Phase 2

| Anti-pattern | Defense |
|---|---|
| A2 (consent-blind gate) | Red group 14 rejects projection of roleplay evidence without the recorded consent/retention gate. Falsification: non-consented evidence projects. |
| A3 (digit-only count) | Replay/concurrency assertions parse labeled integers from query results (for example, `appliedCount: 1`). No bare digit regex. Falsification: a wrong labeled count fails equality. |
| A4 (vacuous pass) | Each Red group must fail at Red on a substantive assertion and pass at Green. An empty implementation fails group 1. Falsification: the suite passes with no mapping table. |
| A5 (false claim vs test reality) | Plan text may cite only the exact focused commands in section 8. A claim is refuted by a non-zero exit of the cited command. |
| A6 (registry overstatement) | Neither `tracks.md` nor this file may claim Phase 2 admitted, implemented, or accepted before the Green and closeout gates pass. This transition claims design completion only. |
| A7 (over-broad filter) | Focused `--filter` gates only; the aggregate stays red and unused (section 13). Falsification: a Phase 2 regression fails the focused command even while the aggregate is already red. |
| A10 (generated-facts drift) | After structural edits at execution time, refresh `build-graph` for the changed paths and regenerate dependent facts before closeout. Falsification: a stale embedded hash fails the freshness check. |
| A11 (executed work left blocked) | The `[b] deferred:phase0-task-b-closeout` markers are a real external gate. When Phase 0 Task B closeout is accepted, the markers must be converted to truthful states in the same transition that admits execution. |
| A14 (invalid ripgrep option) | Detectors use `rg -n '<regex>'`, never `rg -nE`. Exit 2 is a failure, not a zero-hit result. |
| A15 (stale role-receipt hashes) | Any Phase 2 role receipt that enumerates output hashes must be refreshed by a new receipt after later fixes. Falsification: `bash tests/orchestrator_role_receipt_integrity.sh` fails on a stale receipt. |

## 16. What this transition does NOT do

- It does not admit Phase 2 execution.
- It does not close Phase 0 or remediate the shared-root Red gates.
- It does not capture `phase2_base_sha`.
- It does not create, rename, or modify any source, test, fixture, or migration
  file.
- It does not change the accepted Phase 0 strategy semantics in
  `test-strategy.md` or the accepted Phase 1 digests.

# Phase 0 Test Strategy: Bounded Accounts and backend safety gate

Track: `small_company_admin_privileges_20260722`
Phase: Phase 0 - Bounded Accounts and backend safety gate
Strategy version: 1 (canonical, refreshed from diagnostic review-b)
Source diagnostic: `measure/runs/20260811-admin-phase0-diagnostic-review-b.json`

This strategy owns only the test design for Phase 0. It does not own product
source. Red adds failing tests only. Green removes the proven failures in the
leased implementation paths. No graph scan is required or permitted.

## Provenance and baseline distinction

Three distinct evidence classes exist. The strategy and every test must keep
them separate.

1. Immutable committed evidence. The strict logout boundary lives at commit
   `5c5c559a2371feaa8f9981cec93f6cf55a87e7ea`. The focused route suite passes
   10/10 at that commit. This is the only accepted immutable evidence.
2. Dirty candidate. The diagnostic reviewed 45 uncommitted working-tree paths
   with snapshot SHA-256
   `d6c81b73245f81c25e0bd5a9fdce8d0cb0df997cf9d2bb9c613ba969349a8841`. The
   immutable phase range is empty (`98465e8f..98465e8f`). Dirty bytes cannot
   support acceptance.
3. Role base at dispatch. `role_base_sha` and `audited_head_sha` are both
   `98465e8f06548220895a114779d056fc8c997a85`. The diagnostic verdict is
   `inconclusive` and `retry_implementation`.

Do not treat dirty candidate bytes as immutable evidence. Do not treat the
logout commit as evidence that B2-B6 are closed. The four aggregate commands
lack complete results, so Phase S1 and the CRM track remain blocked.

## Phase 0 risk class and applicability

Phase 0 risk class: `critical`. The phase touches authentication, authorization,
multi-organization scope, last-admin safety, immutable audit, and route
provenance. A defect here can forge audit identity or grant cross-company
administration.

| Review dimension | Applicable | Reason |
|---|---|---|
| Security review | applicable | B2-B6 are live security-contract violations. An independent security role must audit the committed Green SHA. |
| UX/API review | applicable (narrow) | The route inventory and HEAD/OPTIONS exposure are a public API contract. No UI work is in scope. |
| Adversarial testing | applicable | B2, B3, B4, B5 require counterexample fixtures that attempt forging, mismatch, cross-org, and concurrent demotion. |
| Browser review | not applicable | Phase 0 owns backend and route-registry safety only. Browser proof belongs to Phase S3. |

## Sub-gates

Phase 0 decomposes into seven sub-gates. Each sub-gate has its own Red command,
Green gate, closeout gate, fixtures, and anti-pattern defense. The closeout gate
for the phase is the union of all sub-gate Green gates plus the four aggregate
commands and the independent security review.

The diagnostic `handoff_lease.red_test_path_lease` and
`green_implementation_path_lease` name the exact paths the Red and Green roles
may touch. Red adds failing tests only to the red-test lease paths. Green
modifies only the green-implementation lease paths. The strategy does not widen
either lease.

### Sub-gate B2: public internal-route-adapter forging

Risk class: `critical`.

Finding: `packages/backend/package.json:27-30` exports the public subpath
`./company-identity/internal-route-adapter`. `internal-route-adapter.ts:88-135`
returns `operations` with every named route operation. Any backend package
consumer can call `employeesCreate`, `oidcLogout`, or `sessionLogout` to
establish trusted Accounts route context. The word `internal` provides no
access control. Another server package can append an audit event under an
Accounts route identity.

Current test gap: `protocol-safety.red.test.ts:333-410` checks only the backend
root export for a generic setter named `runWithCapabilityRequestContext`. It
does not import the public subpath. It does not attempt to forge provenance
through `createCompanyIdentityRouteAdapter()`.

**Red command (targeted):**

```
CI=true pnpm --filter @reading-advantage/backend test -- protocol-safety.red.test.ts -t "does not let a public backend subpath forge accounts route provenance"
```

The Red test must fail. It must import
`@reading-advantage/backend/company-identity/internal-route-adapter` as a
non-Accounts consumer, call `createCompanyIdentityRouteAdapter()`, invoke one
named operation (for example `oidcLogout`), and then call the repository
`appendAudit` inside that context. The test must assert that the persisted
audit metadata does NOT carry the forged Accounts `routeBindingId`,
`routeMethod`, and `routePath`. Today the assertion fails because the context is
trusted and the metadata carries the forged values.

**Green gate:**

The targeted Red test must pass. The Green role must change the adapter so a
public subpath consumer cannot establish trusted Accounts route context. The
accepted defense is one of: remove the public subpath export; gate
`runWithCompanyIdentityRoute` behind a build-time Accounts-only token; or make
`appendAudit` reject a route context whose binding is not owned by the caller.
The Green role must not weaken the existing root-export guard.

**Closeout gate:**

The targeted test passes. The independent security review confirms no public
backend subpath can establish trusted Accounts route context. The four
aggregate commands pass.

**Fixtures and mocks:**

Use a `vi.fn()` SQL double that captures the metadata passed to
`insert into company_identity_audit_events`. Do not use a real database for the
forging counterexample. The proof is structural: the public subpath must not
produce a trusted context.

**Live-behavior proof:**

Not required for B2. The defect is a structural access-control gap, not a
runtime persistence behavior. A unit test with a SQL double is sufficient.

**Architecture guardrails:**

Do not move the route adapter into the backend root export. The root export
must stay clean of `runWithCompanyIdentityRoute` and
`companyIdentityRouteBindingIds`. Do not add a new global role or wildcard
mapping.

**Changed-contract risks:**

Removing the public subpath export can break an Accounts import. The Green role
must update `apps/accounts/lib/server/company-identity-route-bindings.ts` to
import the adapter through the Accounts-internal path only.

**Anti-pattern coverage:**

- A1 (substring-as-signal): The forging test must not detect the subpath by
  substring. It must import the exact public subpath string
  `@reading-advantage/backend/company-identity/internal-route-adapter`. Defense:
  exact module specifier, not a grep for `internal`.
- A5 (false-claim text vs test reality): The plan must not say B2 is closed
  while the forging test still produces forged metadata. Defense: the test
  assertion is the falsification condition.
- A7 (over-broad filter): The test must not exclude the subpath import by a
  bare English filter. Defense: assert on the exact forged binding fields.

**Falsification condition:**

If any non-Accounts backend consumer can produce an audit row whose
`routeBindingId` starts with `company-identity.` or `accounts.`, the sub-gate
fails.

### Sub-gate B3: route-binding vs invoked capability mismatch

Risk class: `critical`.

Finding: `route-bindings.ts:266-273` stores a binding via
`runWithCompanyIdentityRoute`. `runtime.ts:855` reads only
`invocation.capabilityId` from the registry. The executor never calls
`getCapabilityRequestContext()` and never compares the route context's
`capabilityId` with `invocation.capabilityId`. A route can select the wrong
named operation and still pass the route denominator test.

Current test gap: `company-identity-route-bindings.test.ts:169-173` checks only
that each route source file mentions the identifier
`companyIdentityRouteHandlers`. It does not map each HTTP method to one named
operation and one capability ID.

**Red command (targeted):**

```
CI=true pnpm --filter @reading-advantage/backend test -- route-bindings.security.test.ts -t "rejects a route binding that disagrees with the invoked capability"
```

The new red test file is
`packages/backend/src/modules/company-identity/__tests__/route-bindings.security.test.ts`
(from the diagnostic lease). The test must: establish a route context with one
capability ID (for example `company-identity.employees.list`), invoke a
different capability (for example `company-identity.employees.create`) inside
that context, and assert that the executor throws. Today the executor does not
compare, so the invocation succeeds and the test fails.

A second Red assertion must prove the exact route/method/operation/capability
dimension table. For each of the 17 primary operations and 39 effective
methods, the test must assert the one-to-one mapping: route path, HTTP method,
binding ID, named operation, and capability ID. Today the denominator test
proves only count and identifier presence, so a method-to-operation mismatch is
silent.

**Green gate:**

The targeted Red tests pass. The Green role must add a binding-to-capability
comparison inside the executor or inside `runWithCompanyIdentityRoute`. When the
route context's `capabilityId` differs from `invocation.capabilityId`, the
executor must throw a `ROUTE_CAPABILITY_MISMATCH` platform error before the
handler runs.

**Closeout gate:**

The targeted tests pass. The independent security review confirms the executor
compares the route context with the invoked capability on every request. The
four aggregate commands pass.

**Fixtures and mocks:**

Use the real capability registry with stub service handlers. The proof is that
the executor rejects a mismatch before the handler runs. No real database is
needed for the mismatch counterexample.

**Live-behavior proof:**

The dimension-table test is an artifact/documentation test. It proves the
registry shape. The mismatch-rejection test is a live-behavior test. It proves
the runtime enforcement. Both are required.

**Architecture guardrails:**

The comparison must live in the kernel executor or the trusted-context runner.
Do not push the check into each route handler. Do not add a per-route
authorization policy that duplicates the binding.

**Changed-contract risks:**

Adding the comparison can break direct backend calls that invoke a capability
without a route context. The Green role must treat an undefined route context as
"direct backend call" and allow it, or require a route context for every
transport invocation. The chosen behavior must be documented in the test.

**Anti-pattern coverage:**

- A1 (substring-as-signal): The dimension-table test must not match operations
  by substring. Defense: assert exact binding ID, capability ID, method, and
  path for each row.
- A3 (digit-only labeled count): The dimension-table test must not assert a
  bare digit for the route count. Defense: parse a labeled integer
  (`Primary operations: 17`) and compare to the exact expected value.
- A4 (vacuous-pass on nothing-done): The mismatch test must fail when the
  executor ignores the context. Defense: the test invokes a real mismatch and
  asserts a throw; if no throw occurs, the test fails.

**Falsification condition:**

If a route context with capability ID X can invoke capability Y and the
executor does not throw, the sub-gate fails. If the dimension table has any
row where the method does not map to exactly one named operation and one
capability ID, the sub-gate fails.

### Sub-gate B4: multi-organization cross-company administration

Risk class: `critical`.

Finding: `postgres-repository.ts:69-99` `assertCompanyAdmin` accepts an
administrator from any active organization. `listEmployees` at lines 864-871
reads every account. Status, role, credential, and session commands target an
account without an actor-organization predicate. The schema permits multiple
`company_organizations` rows. No startup invariant or adversarial test limits
the database to one internal-company organization.

**Red command (targeted):**

```
CI=true pnpm --filter @reading-advantage/backend test -- postgres-company-scope.integration.test.ts
```

The new red test file is
`packages/backend/src/modules/company-identity/__tests__/postgres-company-scope.integration.test.ts`
(from the diagnostic lease). This test requires a real PostgreSQL database. It
must: seed two `company_organizations` rows, seed a `COMPANY_ADMIN` in the
second organization, and then attempt `listEmployees`, `setEmployeeStatus`, and
`setCompanyRoles` against a target account in the first organization. The test
must assert that the cross-organization action is denied. Today
`assertCompanyAdmin` accepts the second-org admin, so the action succeeds and
the test fails.

A second Red assertion must prove the single-organization startup invariant.
The test must assert that the backend or database rejects a second
`internal-company` organization row, or that a startup check fails when more
than one active organization exists.

**Green gate:**

The targeted Red tests pass. The Green role must add an organization predicate
to `assertCompanyAdmin`, `listEmployees`, and every status/role/credential/
session command. The predicate must bind the actor and target to the same
organization. The Green role must add a startup invariant or database
constraint that limits the system to one active internal-company organization.

**Closeout gate:**

The targeted tests pass against a real database. The independent security
review confirms no cross-organization administration is possible. The four
aggregate commands pass.

**Fixtures and live-behavior proof:**

This sub-gate requires a real PostgreSQL database. Mocks cannot prove the
organization predicate or the startup invariant. Use the existing
`postgres16-harness` pattern. Seed two organizations, two memberships, and the
minimum role/credential rows. Clean up between tests.

The single-organization invariant is a live-behavior test. It must run against
the real schema and confirm the constraint rejects a second row.

**Architecture guardrails:**

Do not add a `schoolId` column to company-identity tables. The company-identity
module uses global tenancy by design. The defense is an organization predicate,
not TenantDB scoping. Do not weaken the global-tenancy policy in
`capabilities.ts`.

**Changed-contract risks:**

Adding the organization predicate can break existing service tests that assume
global scope. The Green role must update those tests to seed the actor and
target in the same organization.

**Anti-pattern coverage:**

- A3 (digit-only labeled count): The single-organization invariant must not
  assert a bare digit. Defense: parse a labeled integer
  (`Active internal-company organizations: 1`) and reject any other value.
- A4 (vacuous-pass on nothing-done): The cross-organization test must fail when
  no predicate exists. Defense: the test performs a real cross-org action and
  asserts denial; if the action succeeds, the test fails.
- A5 (false-claim text vs test reality): The plan must not say B4 is closed
  while the cross-org test still succeeds.

**Falsification condition:**

If a `COMPANY_ADMIN` in organization B can read or mutate an account in
organization A, the sub-gate fails. If the database accepts two active
`internal-company` organizations, the sub-gate fails.

### Sub-gate B5: concurrent last-admin demotion, suspension, and revocation

Risk class: `critical`.

Finding: `postgres-repository.ts:987-1013` (status) and `1131-1158` (company
roles) lock and count active administrators before a destructive change. No
executable test proves concurrent demotion or suspension behavior. No test
proves credential-reset and suspension session revocation for this candidate.

**Red command (targeted):**

```
CI=true pnpm --filter @reading-advantage/backend test -- postgres-admin-safety.integration.test.ts
```

The new red test file is
`packages/backend/src/modules/company-identity/__tests__/postgres-admin-safety.integration.test.ts`
(from the diagnostic lease). This test requires a real PostgreSQL database. It
must prove three behaviors:

1. Concurrent last-admin demotion. Two transactions attempt to remove
   `COMPANY_ADMIN` from the last two active admins at the same time. Exactly
   one transaction must succeed. The other must throw
   `LAST_COMPANY_ADMIN_REQUIRED`.
2. Concurrent last-admin suspension. Two transactions attempt to suspend the
   last two active admins at the same time. Exactly one must succeed.
3. Credential-reset and suspension session revocation. A credential reset and
   a suspension must each increment `auth_version` and revoke the central and
   child sessions.

Today no test covers these, so the Red suite has no executable proof and fails
by absence.

**Green gate:**

The targeted Red tests pass. The Green role must confirm the `for update` lock
and the active-admin count behave under concurrency. If the lock has a gap (for
example, the count reads before the lock acquires), the Green role must fix it.
The Green role must add session-revocation proof for credential reset and
suspension.

**Closeout gate:**

The targeted tests pass against a real database. The independent security
review confirms the last-admin invariant holds under concurrency and that
suspension and credential reset revoke sessions. The four aggregate commands
pass.

**Fixtures and live-behavior proof:**

This sub-gate requires a real PostgreSQL database. Use two database clients
that run concurrent transactions. Seed two active `COMPANY_ADMIN` accounts.
Assert that the second concurrent demotion or suspension throws. Use the
`auth_version` column and the session tables to prove revocation.

**Architecture guardrails:**

Do not replace the row-level lock with an application-level mutex. The database
`for update` lock is the correct defense. Do not move the count before the
lock. Do not weaken the `LAST_COMPANY_ADMIN_REQUIRED` error.

**Changed-contract risks:**

None expected. The lock and count already exist in source. The sub-gate adds
executable proof, not new behavior.

**Anti-pattern coverage:**

- A3 (digit-only labeled count): The active-admin count assertion must use a
  labeled integer. Defense: parse `Active administrators: 1` and compare.
- A4 (vacuous-pass on nothing-done): The concurrency test must fail when no
  lock exists. Defense: run two real concurrent transactions and assert that
  one throws; if both succeed, the test fails.
- A5 (false-claim text vs test reality): The plan must not say B5 is closed
  while the concurrency test does not exist.

**Falsification condition:**

If two concurrent transactions can both remove the last `COMPANY_ADMIN` so that
zero active admins remain, the sub-gate fails. If a credential reset or
suspension does not increment `auth_version` and revoke sessions, the sub-gate
fails.

### Sub-gate B6: truthful public HEAD and OPTIONS route inventory

Risk class: `medium`.

Finding: The route registry labels inherited HEAD and OPTIONS bindings as
`authenticated` when the parent route is authenticated. The actual HEAD and
OPTIONS handlers return 204 without authentication. The registry overstates the
runtime authentication boundary. Affected paths include
`HEAD /api/admin/employees`, `HEAD /api/oidc/authorize`, and `OPTIONS` on
authenticated paths.

**Red command (targeted):**

```
CI=true pnpm --filter accounts test -- company-identity-route-bindings.test.ts -t "labels HEAD and OPTIONS with their true runtime exposure"
```

The Red test must extend
`apps/accounts/lib/server/company-identity-route-bindings.test.ts`. It must
assert that every HEAD and OPTIONS binding has `exposure: "public"` (or a new
truthful value) when the handler performs no authentication. Today the registry
inherits the parent `authenticated` label, so the assertion fails.

**Green gate:**

The targeted Red test passes. The Green role must change
`addNextFrameworkMethods` in `route-bindings.ts` so a framework HEAD or OPTIONS
binding gets its true exposure, not the parent exposure. The Green role must
not change the runtime handler behavior.

**Closeout gate:**

The targeted test passes. The independent security review confirms the registry
exposure labels match the runtime authentication behavior for every method.
The four aggregate commands pass.

**Fixtures and mocks:**

This is an artifact/documentation test. It proves the registry shape. No real
database is needed. Use the frozen `companyIdentityRouteBindings` array.

**Live-behavior proof:**

Not required for B6. The defect is a registry-truthfulness gap. A structural
test on the frozen bindings is sufficient.

**Architecture guardrails:**

Do not add authentication to HEAD and OPTIONS handlers. The fix is a truthful
registry label, not a runtime change. Do not remove HEAD and OPTIONS from the
denominator.

**Changed-contract risks:**

Changing the exposure label can affect the route-protection middleware if it
reads the registry. The Green role must confirm the middleware does not gate
HEAD and OPTIONS on the registry label.

**Anti-pattern coverage:**

- A1 (substring-as-signal): The exposure assertion must not match
  `authenticated` by substring. Defense: assert the exact `exposure` field
  value for each HEAD and OPTIONS binding.
- A5 (false-claim text vs test reality): The registry must not overstate
  authentication. Defense: the test compares the label to the true runtime
  behavior.
- A6 (registry-note overstatement): `measure/tracks.md` must not claim the
  route inventory is truthful while HEAD/OPTIONS labels are wrong.

**Falsification condition:**

If any HEAD or OPTIONS binding has `exposure: "authenticated"` while its
handler performs no authentication, the sub-gate fails.

### Sub-gate AUDIT: immutable audit and protocol state-change evidence

Risk class: `high`.

Finding: The immutable audit trigger exists
(`0001_immutable_identity_audit.sql`). `privileges-audit.integration.test.ts`
checks UPDATE, DELETE, and TRUNCATE rejection. `appendAudit`
(`postgres-repository.ts:155-167`) pulls the route context and adds
`routeBindingId`, `routeMethod`, `routePath`, and `routeTransport`. But the
protocol state-change operations `authorize`, `exchangeCode`, `localLogout`,
and `globalLogout` do not call `appendAudit`. Migration `0002` widens the
metadata key allowlist.

**Red command (targeted):**

```
CI=true pnpm --filter @reading-advantage/db test -- privileges-audit.integration.test.ts metadata-allowlist.test.ts
CI=true pnpm --filter @reading-advantage/backend test -- service.test.ts -t "appends immutable audit for protocol state changes"
```

The Red tests must prove: (1) the immutable trigger rejects UPDATE, DELETE, and
TRUNCATE on a real database; (2) migration `0002` allows only the reviewed
metadata keys and rejects unlisted keys; (3) `authorize`, `exchangeCode`,
`localLogout`, and `globalLogout` each append one immutable audit event with
the route context. Today the protocol operations do not append, so the audit
assertion fails.

**Green gate:**

The targeted Red tests pass. The Green role must add `appendAudit` calls to
`authorize`, `exchangeCode`, `localLogout`, and `globalLogout` in the service
and repository paths. The audit metadata must remain secret-safe (no passwords,
bearer tokens, client secrets, or signing keys).

**Closeout gate:**

The targeted tests pass against a real database. The independent security
review confirms every protocol state change produces one immutable audit row
with the route context and no secret material. The four aggregate commands
pass.

**Fixtures and live-behavior proof:**

The immutable-trigger test requires a real PostgreSQL database. The
metadata-allowlist test can use the schema contract. The protocol-audit test
can use a SQL double to capture the `insert into company_identity_audit_events`
call, but must assert the route-context fields are present.

**Architecture guardrails:**

Do not weaken the immutable trigger. Do not add secret material to the audit
metadata projection. Do not move audit appends out of the transaction.

**Changed-contract risks:**

Adding audit appends to protocol operations adds database writes. The Green
role must confirm the atomic persistence seam still commits the audit in the
same transaction as the state change.

**Anti-pattern coverage:**

- A5 (false-claim text vs test reality): The plan must not say immutable audit
  is complete while protocol operations lack `appendAudit`.
- A6 (registry-note overstatement): `measure/tracks.md` must not claim the
  safety gate is resolved while protocol audit is missing.
- A15 (stale role-receipt hashes): If the audit projection changes, the role
  receipt must refresh. Defense: the acceptance role publishes a new receipt
  for the Green commit.

**Falsification condition:**

If any protocol state change (`authorize`, `exchangeCode`, `localLogout`,
`globalLogout`) commits without an immutable audit row, the sub-gate fails. If
the metadata allowlist accepts an unlisted key, the sub-gate fails. If the
trigger permits UPDATE, DELETE, or TRUNCATE, the sub-gate fails.

### Sub-gate LOGOUT: strict logout Bearer-token boundary

Risk class: `high` (already remediated at the immutable commit).

Finding: POST `/api/oidc/logout` accepts only `Bearer ` plus one 43-character
base64url token. Invalid values return 401 before identity composition. The
focused route suite passes 10/10 at commit `5c5c559a`.

**Red command (targeted):**

```
CI=true pnpm --filter accounts test -- route.test.ts -t "oidc logout"
```

The existing focused test at `apps/accounts/app/api/oidc/logout/route.test.ts`
covers eight invalid cases and two valid outcomes. This sub-gate must confirm
the test still passes and must not regress.

**Green gate:**

No new Green work is required for the boundary itself. The Green role must
preserve the strict Zod schema. If the audit sub-gate adds an `appendAudit`
call to `localLogout`, the Green role must confirm the boundary test still
passes.

**Closeout gate:**

The focused route suite passes 10/10. The four aggregate commands pass. The
independent security review confirms the boundary.

**Fixtures and mocks:**

Use a route-level test with a stub service. The proof is that invalid
Authorization headers return 401 before the service is called.

**Live-behavior proof:**

The logout boundary is a live-behavior test. The audit append (from the AUDIT
sub-gate) is a separate live-behavior test against a real database.

**Architecture guardrails:**

Do not relax the 43-character base64url grammar. Do not move validation behind
identity composition.

**Changed-contract risks:**

None expected. The boundary is already accepted at `5c5c559a`.

**Anti-pattern coverage:**

- A5 (false-claim text vs test reality): The plan must not claim the logout
  boundary is the whole gate. The boundary is one sub-gate. The aggregate
  commands must also pass.
- A6 (registry-note overstatement): `measure/tracks.md` must not say the
  safety gate is resolved because the logout boundary is fixed.

**Falsification condition:**

If the logout route accepts a non-43-character token, an empty Bearer header,
or a non-base64url character, the sub-gate fails.

## Aggregate-suite handling (intentionally red)

The four aggregate commands currently expose pre-existing cross-package
dependency, configuration, and type-test failures. These failures are
intentionally red and must not block this phase if they are unrelated to the
audited scope.

The acceptance role must classify every aggregate-command failure into one of
three buckets before it can accept the phase:

1. Candidate failure. A failure in a leased path that the Green role touched.
   This blocks acceptance. The Green role must fix it.
2. Unrelated failure. A failure outside the audited scope (for example, APK
   lifecycle type errors, cross-app Codecamp fixture resolution, or stale
   lockfile resolution). This does not block acceptance. The acceptance role
   must record the exact failure, the owning package, and the reason it is
   unrelated.
3. Infrastructure failure. A failure caused by the bounded install (for
   example, pnpm recreating `node_modules` and timing out). This does not
   block acceptance. The acceptance role must rerun the command from a
   complete workspace-local dependency environment.

The diagnostic `command_failure_classification` block is the template. The
acceptance role must produce the same structure with current results.

The acceptance role must not collapse a candidate failure into the
"unrelated" bucket to make the gate pass. This is the A5 false-claim
anti-pattern. The independent security review must verify the classification.

The bounded install rules from `plan.md` apply: point `TMPDIR`, package-store,
cache paths, and `NODE_COMPILE_CACHE` at ignored workspace-local `.cache/`
directories. Never write repository artifacts into system `/tmp`. Do not run a
full workspace install, repository graph scan, duplicate materialization, or
giant evidence payload.

## Artifact tests vs live-behavior tests

The strategy distinguishes two test classes. Both are required. They do not
substitute for each other.

**Artifact/documentation tests.** These prove the shape of a static contract.
They do not require a real database. They use the frozen registry, the schema
contract, or the route source. Examples: the route/method/operation/capability
dimension table (B3), the HEAD/OPTIONS exposure labels (B6), and the
metadata-allowlist contract (AUDIT). These tests fail when the static contract
drifts.

**Live-behavior tests.** These prove runtime enforcement against a real
PostgreSQL database or a real executor. They use the `postgres16-harness`
pattern or the real capability registry. Examples: the forging counterexample
(B2), the mismatch rejection (B3), the cross-organization denial (B4), the
concurrent last-admin lock (B5), the immutable-trigger rejection (AUDIT), and
the strict logout boundary (LOGOUT). These tests fail when the runtime does
not enforce the contract.

The acceptance role must record which class each test belongs to. A phase that
has only artifact tests cannot accept a live-behavior sub-gate.

## The four focused commands

The phase closeout gate requires these four commands and no others. No graph
command is required or permitted.

```
CI=true pnpm --filter accounts test
CI=true pnpm --filter accounts check-types
CI=true pnpm --filter @reading-advantage/backend test
CI=true pnpm --filter @reading-advantage/backend check-types
```

Each command must exit 0 after the Green role removes all candidate failures.
Unrelated failures must be classified and recorded. Infrastructure failures
must be resolved by a complete dependency environment, not by skipping the
command.

## Architecture guardrails (phase-wide)

- Do not add another global role, numeric hierarchy, wildcard role mapping, or
  policy-builder UI.
- Owner-role mappings are exact configuration validated at startup and covered
  by positive and counterexample tests.
- Do not merge product data into Accounts.
- Do not weaken product authorization for ordinary employees.
- Do not add a `schoolId` column to company-identity tables.
- Do not run a repository graph scan, duplicate materialization, or giant
  audit payload for this track.
- Preserve the one-worktree invariant (A16). All work occurs in the shared
  master checkout.

## Anti-pattern coverage summary (phase-wide)

| ID | Defense in this phase |
|----|-----------------------|
| A1 | Route and exposure tests use exact field values and exact module specifiers, not substring matching. |
| A3 | Count assertions parse a labeled integer, not a bare digit. |
| A4 | Concurrency and mismatch tests perform a real action and assert a throw; absence of work fails the test. |
| A5 | Plan text claims a sub-gate closed only when its targeted test passes; the aggregate classification is honest. |
| A6 | `measure/tracks.md` makes no resolved-security claim while any sub-gate is red. |
| A7 | Test exclusions use exact path contexts, not bare English words. |
| A8 | Plan markers use only `[x]`, `[~]`, and `[b]`; no `[ ]` marker. |
| A10 | Generated facts are regenerated if structural changes occur; no pre-commit hook exists yet. |
| A14 | Any detection recipe in tests uses `rg` without `-E`; detector exit 2 is a failure. |
| A15 | The acceptance role publishes a new role receipt for the Green commit. |
| A16 | Exactly one shared master worktree; verify before every role action. |

A2, A9, A11, A12, A13 are not applicable to this phase. A2 has no
draft-to-published transition. A9 has no archived-track path reference. A11 is
not a review track. A12 and A13 are catalog and closeout concerns outside this
phase.

## phase_base_sha capture point

The orchestrator must capture the immutable `phase_base_sha` immediately after
it commits this strategy and the updated `plan.md` to the shared master tree.
The capture command is:

```
git rev-parse HEAD
```

The captured SHA is the immutable baseline for the Red phase. The Red
subagent adds only failing adversarial tests on top of that SHA. The Green
subagent commits on top of the Red SHA. The acceptance role records the Green
SHA as `audited_head_sha` and confirms it equals the current HEAD.

Do not embed a SHA in this strategy that predates the strategy commit. The
`role_base_sha` at dispatch is `98465e8f06548220895a114779d056fc8c997a85`. The
`phase_base_sha` for the Red phase is the SHA produced by the strategy commit,
captured by the orchestrator after the commit lands.

## Phase S1 block condition

Phase S1 stays blocked until Phase 0 acceptance. The acceptance role must:

1. Confirm all seven sub-gate Green gates pass.
2. Confirm the four focused commands exit 0 (or that every non-zero exit is
   classified as unrelated or infrastructure, with the independent security
   review concurring).
3. Confirm the audited candidate paths are committed and `audited_head_sha`
   equals the current HEAD.
4. Confirm the dirty snapshot is empty for the audited scope.
5. Publish a new `measure/runs` acceptance JSON with distinct `phase_base_sha`,
   `role_base_sha`, and `audited_head_sha` values.
6. Obtain the independent security review sign-off.

Until all six conditions hold, every Phase S1 task in `plan.md` stays `[b]`
with the `deferred:small_company_admin_privileges_20260722-bounded-accounts-safety-gate`
owner. The CRM track `customer_licensing_crm_20260722` also stays blocked.

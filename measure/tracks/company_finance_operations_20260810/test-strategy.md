# Finance Operations Phase 1 Task 3 test strategy - historical private-evidence MVP boundaries

> Canonical, falsifiable test strategy for the third Phase 1 task in
> `company_finance_operations_20260810`. Owned by the Measure Strategy subagent.
> The orchestrator, Mid-red, Jr-green, phase-acceptance, final-acceptance, and
> adversarial-testing roles consume this document. It is the single source of
> truth for what Red, Green, and closeout mean for this task.

## Scope and revision

- **Track:** `company_finance_operations_20260810`
- **Phase:** Phase 1 - policy-neutral foundation
- **Task:** "Add behavior-level contract tests and adapters for the Company
  Identity attestor, authorized private-evidence reads, and a scope/digest-bound
  durable outbox projector required by the historical private-evidence MVP."
- **role_base_sha / current HEAD:** `1b9c9cb54acacb747d83ec0241318d97eb02400a`
- **Persistence acceptance baseline (Task 2):** `c5ecf18b0830c8702602f9f5f33415c7b3e92d66`
  ("feat(finance): add immutable persistence"). This is the predecessor
  checkpoint immediately before this task. It is **not** the `phase_base_sha`
  for Task 3; see the capture point below.
- **Strategy lease:** owns only `measure/tracks/company_finance_operations_20260810/test-strategy.md`
  and strategy/applicability annotations on `plan.md`. No production, test,
  spec, decision, metadata, registry, DB, storage, or lockfile edits.

## phase_base_sha capture point (authoritative)

Immediately after the commit that introduces this `test-strategy.md` (together
with only the leased `plan.md` annotation), the orchestrator MUST capture the
immutable `phase_base_sha` for Phase 1 Task 3 by running:

```bash
git rev-parse HEAD
```

That post-strategy-commit SHA is the only valid Task 3 `phase_base_sha`. No
earlier SHA may be used: `c5ecf18b` (Task 2 persistence) and `1b9c9cb` (current
HEAD) both **predate the committed strategy** and must not be embedded as the
Task 3 base. The Red-stage tests for this task are admitted on top of the
strategy commit; Jr-green then implements against the same base. If the strategy
is later refreshed, a new `phase_base_sha` is captured at the refresh commit and
the prior one is retired.

## Accepted evidence vs dirty candidate work (do not conflate)

Only these are accepted evidence for Phase 1 prior to Task 3:

- `phase1-foundation-acceptance-20260810.md` (Task 1: contracts, ports, schema,
  Red tests for money/idempotency/immutable history/authorization/audit/
  provenance/isolation).
- `phase1-persistence-acceptance-20260811.md` (Task 2: PostgreSQL persistence,
  atomic record+succeeded-audit outbox, append-only triggers, tenant scope).
- The committed contracts/tests/production at and before `c5ecf18b`, including
  the already-green `architecture-boundary.test.ts`, `port-boundaries.test.ts`,
  `authorization-audit.test.ts`, `money-history.test.ts`, `contracts.test.ts`,
  and the committed `.red.test.ts` files from Task 2
  (`independent-review-blockers`, `postgres-record-repository`,
  `provenance-whitespace`).

The working tree currently contains a large **dirty candidate diff** that is
**not** accepted evidence for Task 3. It must be evaluated against this
strategy, not treated as proven:

| Boundary | Candidate red test (uncommitted) | Candidate green (uncommitted) | State |
|---|---|---|---|
| A. Company Identity attestor | `packages/backend/src/modules/company-identity/__tests__/finance-authorization-adapter.red.test.ts` | `createFinanceCompanyIdentityAttestor` in company-identity | **ABSENT in production** -> genuinely red |
| A trust-root | `protocol-safety.red.test.ts`, `postgres-login-atomic.integration.test.ts`, `postgres-exchange.integration.test.ts`; `packages/db/.../metadata-allowlist.test.ts` | service/postgres-repository/internal-route-adapter/route-bindings changes | mixed; live-DB tests gated on `COMPANY_IDENTITY_PG_TEST_URL` |
| B. Private-evidence read | `packages/storage/src/__tests__/finance-private-evidence-read.red.test.ts` | `private-evidence-reader.ts` + contracts/errors exported from `storage/index.ts` | candidate green |
| C. Durable outbox projector | `packages/backend/src/modules/finance-operations/__tests__/durable-job-adapter.red.test.ts` | `createHistoricalPrivateEvidenceOutboxProjector` in `finance-operations/ports.ts` (re-exported via `export *`) | candidate green |
| D. Packet + import command | `historical-private-evidence-packet.red.test.ts` | `historicalPrivateEvidencePacketSchema` + `createHistoricalPrivateEvidenceImportCommand` in `finance-operations/contracts.ts` | candidate green |
| Out-of-scope aggregate | `controlled-imports-phase2.red.test.ts` | none (`controlled-imports.ts` does not exist) | intentionally red; Phase 2 |

There is **no Task 3 acceptance document yet**. Any "green" claim in candidate
work is a claim to be verified, not evidence. The acceptance role must re-run
every cited command from a clean checkout of the Task 3 `phase_base_sha` plus
the candidate's green commit.

## Boundary decomposition

Task 3 decomposes into four behavior boundaries plus a live-DB trust-root proof
and a closeout gate. Each is a phase below with its own Red command, Green gate,
risk class, and anti-pattern coverage. The integrating packet contract (D)
composes A and B; it must not be accepted until A and B are green.

- **A** - Company Identity Finance attestor (authenticated owner credential ->
  allow/deny + immutable audit; company-first scope, school attestation only
  when school-scoped).
- **B** - Authorized private-evidence reader (authorization-gated, bounded,
  provider-neutral; rejects public URLs / provider objects / traversal).
- **C** - Scope/digest-bound durable outbox projector (collision-free
  idempotency; replay/conflict; binds durable receipt to persisted outbox +
  audit identities; fail-closed on non-`enqueued` outcomes).
- **D** - Integrating `historical-private-evidence-packet.v1` schema +
  authenticated import command (composes the real A attestor and B binding;
  rejects caller-supplied attestation; data minimization; no Thai policy).
- **E** - Live-DB trust-root proof (real PostgreSQL atomic login/audit +
  exchange; secret-safe failed audits; reviewed repository surface).
- **F** - Closeout (focused suite green; architecture/source-isolation guard;
  aggregate-red handling; review applicability).

---

## Phase 1.3.A - Company Identity Finance attestor

**Risk:** `high` (authorization root for every Finance import; a wrong allow
leaks private evidence; a wrong audit loses the provenance chain).

**Targeted Red command (must fail before green):**

```bash
pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/company-identity/__tests__/finance-authorization-adapter.red.test.ts
```

Expected red failure: `subject.createFinanceCompanyIdentityAttestor` is
`undefined`, so `requireAttestorFactory` throws on `.toBeTypeOf("function")`.

**Green gate (must pass after implementation):**

- The Red command above exits 0.
- `pnpm --filter @reading-advantage/backend run check-types` exits 0 (production
  and test configs).
- `pnpm --filter @reading-advantage/backend exec eslint src/modules/company-identity`
  exits 0.

**Closeout gate (A):** the attestor is exported from the company-identity
public barrel; every allow and every deny produces exactly one immutable audit
event with actor/operation/scope/outcome/reason; company-scoped packets allow
without a school claim and never expand a school claim globally; a non-matching
school list denies with `school-attestation-missing`.

**Fixtures and mocks:** injected `CompanyIdentityAuthenticator` (resolves a
credential to claims or `undefined`), injected versioned `FinanceRolePolicy`
(accepted role IDs are an injected decision, never a global hard-coded constant),
injected `FinanceAttestationAuditPort` that records frozen events. No real
database, no real session store. The credential is opaque `{kind, value}`; the
attestor never inspects its contents.

**Live-behavior proof expectation:** none at this boundary. A is a pure
behavior contract over fakes. The live trust-root proof is Phase E.

**Architecture guardrails / changed-contract risks:**
- The attestor factory must live in the company-identity module (the owner of
  authentication), not in finance-operations. Finance consumes it; it does not
  own it.
- `export *` from `company-identity/index.ts` must surface
  `createFinanceCompanyIdentityAttestor`; the acceptance role must confirm the
  factory resolves through the public barrel, not a deep path.
- The accepted role policy is **injected**, not imported from a Finance-owned
  constant. A Finance module hard-coding the accepted role ID is a changed-
  contract risk and a security risk (role drift).
- The audit event shape becomes a new cross-module contract (actor kind,
  reason enum). Changes here ripple into D's `FinanceAttestationAuditContext`;
  the acceptance role must diff the reason enum against D's expectations.

**Anti-pattern coverage (A-class defenses):**
- **A1 / A4** - The test resolves the factory with
  `expect(...).toBeTypeOf("function")` and asserts `authenticate` was called
  exactly once with the exact credential, plus one frozen audit event per
  decision. This is a behavior-level, structured assertion - not a
  source-text/substring check and not a vacuous pass on a missing factory.
  Falsifier: removing the factory, calling authenticate twice, or dropping the
  audit append must fail the test.
- **A5** - The plan/acceptance text may not say "attestor green" unless the
  cited vitest command exits 0. Falsifier: run the command; non-zero refutes
  the claim.
- **A6** - No registry note may claim "authorization resolved" while the
  denial-path tests are red.

**Review applicability:** security review **required** (authorization root);
adversarial testing **required** (denial/audit-tamper fixtures); UX/API review
**not applicable** (no UI/external API); browser review **not applicable**.

---

## Phase 1.3.B - Authorized private-evidence reader

**Risk:** `critical` (direct private-evidence/PII boundary; a leak or scope
bypass exposes payroll/billing documents).

**Targeted Red command:**

```bash
pnpm --filter @reading-advantage/storage exec vitest run \
  src/__tests__/finance-private-evidence-read.red.test.ts
```

**Green gate:**

- The Red command above exits 0.
- `pnpm --filter @reading-advantage/storage run check-types` exits 0.
- `pnpm --filter @reading-advantage/storage run lint` exits 0.
- `pnpm --filter @reading-advantage/storage run build` exits 0.

**Closeout gate (B):** the reader (a) validates the `private-evidence://`
grammar and rejects blank/malformed/HTTPS/s3/gs/traversal (single- and
double-encoded) references **before** any authorization or driver call; (b)
validates a lowercase 64-hex digest and a positive finite integer byte bound
before any boundary call; (c) authorizes the exact reference/scope/authorization
tuple and fails closed on deny; (d) bounds returned bytes and rejects over-size
content; (e) computes the digest and rejects mismatch; (f) returns only
`{evidenceReference, payloadDigest, bytes, metadata:{contentLength,contentType}}`
- never a `providerObject`, never a `publicUrl`. The scope-company must equal
the evidence-reference company (`PRIVATE_EVIDENCE_SCOPE_MISMATCH`).

**Fixtures and mocks:** injected `PrivateEvidenceAuthorizationPort`, injected
`PrivateEvidenceDriver` (returns bytes + contentType + a deliberately-leaky
`providerObject` and `publicUrl` that the reader must strip), injected `digest`
function. Fakes record call counts so negative fixtures assert
`authorize`/`read`/`digest` were **not** called on early validation failure.

**Live-behavior proof expectation:** none at this boundary. B is a pure
behavior contract. A real object-storage driver proof is deferred; the
injected-driver contract is the acceptance surface for Task 3.

**Architecture guardrails / changed-contract risks:**
- The reader must be exported from `@reading-advantage/storage`'s public barrel
  (`storage/index.ts`), not a deep import. Finance consumes the type only.
- No storage-provider SDK type may appear in the reader's return shape. The
  acceptance role must confirm `JSON.stringify(result)` contains neither the
  fake `publicUrl` nor the fake `providerObject` (the test already asserts this;
  it is the falsifier).
- The `private-evidence://` grammar is a new cross-package contract (storage
  owns parsing; finance re-uses the same reference shape in D). A grammar
  change in storage must be reflected in D's `privateEvidenceReferenceSchema`;
  drift is a changed-contract risk.
- The reader must not import `@reading-advantage/db`, `drizzle-orm`, or any
  provider SDK; the storage architecture guard must cover it.

**Anti-pattern coverage:**
- **A1 / A4** - The test uses `toHaveBeenCalledWith` on the exact authorization
  tuple and exact driver read, plus call-count assertions
  (`not.toHaveBeenCalled()` on early-failure paths). Falsifier: calling
  authorize before grammar validation, or returning the provider object, must
  fail.
- **A7** - The negative fixtures use explicit invalid inputs (enumerated
  traversal/encoding/URL schemes), not a bare-word exclusion filter. The
  falsifier is each enumerated case.
- **A5 / A6** - No claim of "private reads secured" unless the
  `PRIVATE_EVIDENCE_*` rejection tests all pass.

**Review applicability:** security review **required** (PII boundary,
traversal/scheme rejection, provider-object stripping); adversarial testing
**required** (the 9 invalid-reference cases, 5 invalid-digest cases, 5
invalid-maxBytes cases, scope-mismatch, content-too-large, digest-mismatch,
authorization-deny); UX/API review **not applicable**; browser review **not
applicable**.

---

## Phase 1.3.C - Scope/digest-bound durable outbox projector

**Risk:** `high` (atomic outbox projector; a duplicate enqueue double-charges a
durable operation; a misclassified replay hides a conflict).

**Targeted Red command:**

```bash
pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/durable-job-adapter.red.test.ts
```

**Green gate:**

- The Red command above exits 0.
- `pnpm --filter @reading-advantage/backend run check-types` exits 0.
- `pnpm --filter @reading-advantage/backend exec eslint src/modules/finance-operations`
  exits 0.

**Closeout gate (C):** the projector (1) consumes the generic
`DurableJobEnqueuePort` from `packages/backend/src/jobs/ports.ts` (accepted
infrastructure) - never a provider SDK; (2) builds a collision-free
length-prefixed idempotency key over `operation|company|school|
source-system|source-version|source-identity|payload-digest` and the test
proves two crafted inputs that would collide under naive concatenation do **not**
collide; (3) on a fresh outbox event, enqueues exactly once with the exact
tenant/idempotency/payload/maxAttempts shape and binds a frozen receipt; (4) on
a receipt already bound to the same outbox identity, returns `replay` without
enqueueing or re-binding; (5) on a receipt bound under the same outbox id but
mismatching audit/receipt/digest identity, returns `conflict` with
`outbox-identity-mismatch` without enqueueing; (6) a receipt stored under a
**different** outbox id is not treated as a replay for this intent; (7)
fail-closes with `FINANCE_DURABLE_OUTCOME_UNSUPPORTED` on `refreshed` or
`active-lease-retained` outcomes (these must not be silently mapped to replay).
The intent, receipt, and result envelopes must be deeply frozen.

**Fixtures and mocks:** injected `DurableJobEnqueuePort` fake returning a
caller-selected outcome; injected `HistoricalProjectionStore` fake
(`findByOutboxEventId` + `bindReceipt`) backed by a `Map<string, Receipt>`. The
test verifies the intent passed in is not mutated (`expect(intent).toEqual(beforeProjecting)`).

**Live-behavior proof expectation:** none at this boundary. C is a pure
behavior contract over injected ports. A real durable-job adapter proof belongs
to the durable-job-worker track, not Task 3.

**Architecture guardrails / changed-contract risks:**
- The projector must depend on `DurableJobEnqueuePort` (the accepted generic
  port), not invent a Finance-specific queue port. The candidate introduced a
  parallel `HistoricalPrivateEvidenceDurableJobEnqueuePort` in
  `finance-operations/ports.ts`; the acceptance role must confirm it is
  structurally compatible with `jobs/ports.ts`'s `DurableJobEnqueuePort` and
  that no provider SDK leaks. If the two diverge, that is a changed-contract
  risk to flag, not silently accept.
- The projector must not open a database connection. It consumes an already-
  persisted intent; the atomic record+audit commit is owned by the Task 2
  persistence seam. C only projects.
- The idempotency-key encoding is a new Finance contract. Changing the
  delimiter/encoding after any receipt is bound breaks replay recognition; the
  key includes a `historical-private-evidence-outbox-v1` version tag for
  exactly this reason.
- `availableAt` must be a real `toISOString()`; the enqueue request schema
  validates `z.string().datetime({ offset: true })`.

**Anti-pattern coverage:**
- **A1 / A4** - The test asserts `enqueue` called exactly once with
  `expectedEnqueueCall(intent)`, `bindReceipt` called once with the expected
  receipt, and on replay `enqueue` **not** called. Falsifier: a double-enqueue
  or a silent-mapping of `refreshed` to replay fails the test.
- **A3** - The collision-freedom assertion uses crafted delimiter-bearing
  inputs (`"a|school=some:1:b"` vs `"a"` + `"b|source-identity=1:c"`) and
  asserts the two keys differ. This is a labeled, structural identity check,
  not a digit-only count. Falsifier: a naive concatenation key fails here.
- **A5** - No "outbox projector green" claim unless the cited command exits 0.
- **A15** - If a role receipt is produced for the green commit, it must bind
  the Task 3 `phase_base_sha` and the green commit, not a stale hash.

**Review applicability:** security review **required** (idempotency/replay
integrity, tenant binding); adversarial testing **required** (conflict cases,
stale-receipt-under-different-outbox, unsupported-outcome fail-closed);
UX/API review **not applicable**; browser review **not applicable**.

---

## Phase 1.3.D - Integrating packet contract + authenticated import command

**Risk:** `high` (composes A + B; the data-minimization grammar is the only
barrier between raw private documents and normalized Finance facts; a guessed
Thai policy field here contaminates the whole subledger).

**Targeted Red command:**

```bash
pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/historical-private-evidence-packet.red.test.ts
```

**Green gate:**

- The Red command above exits 0.
- `pnpm --filter @reading-advantage/backend run check-types` exits 0.

**Closeout gate (D):**
- `historicalPrivateEvidencePacketSchema.safeParse` accepts a versioned packet
  and returns it **unchanged** (no transformation of source identity, digest,
  label, or source-stated value); accepts company-scoped and school-scoped
  packets.
- The schema rejects: unknown packet/source/fact keys; invalid digests
  (blank/non-hex/uppercase/short/long); blank or oversized source fields;
  numeric/blank/control-char/oversized fact values; opaque fact categories or
  identifiers outside the explicit allowlist; **unapproved personal-data
  categories** (`person-identity`, `employee-national-id`,
  `social-security-number`); public evidence URLs; raw private-document content
  (`rawPayload`); sensitive normalized identifier fields (`employeeTaxId`); and
  **invented statutory classification** (`thaiTaxInvoiceStatus`). This is the
  "no Thai policy" boundary made executable.
- `createHistoricalPrivateEvidenceImportCommand` calls the **real** A attestor
  with `{operation, scope, credential, audit}` and the **real** B binding port
  with `{evidenceReference, scope, expectedPayloadDigest, authorization}`; it
  **rejects a caller-supplied `attestation`** (`FINANCE_COMMAND_INPUT_INVALID`)
  before calling either port - Finance never trusts caller-supplied claims.
- The command fails closed (`FINANCE_ATTESTATION_DENIED`) when A denies,
  without calling B. It fails closed on company/school/evidence-reference/
  evidence-digest mismatch between the packet, the attestation evidence, and
  the binding result.

**Fixtures and mocks:** fakes for `CompanyIdentityFinanceAttestor` and
`PrivateEvidenceBindingPort` (the B-shaped binding port), recording call counts.
The packet fixtures are plain objects; the schema test does not depend on a
parser implementation detail.

**Live-behavior proof expectation:** none. D is a pure composition contract.
The command is `prepare()` only - it does not persist; persistence is Phase 2.

**Architecture guardrails / changed-contract risks:**
- D must compose the A and B contracts by type, not re-implement authentication
  or storage reads. A Finance module that re-derives owner claims is a changed-
  contract risk and a security risk.
- The fact-category/identifier allowlist is a new Finance contract. Adding a
  category is a policy decision and must be reviewed; the "no Thai policy"
  constraint means `vatRate`, `withholdingRate`, `accountCode`, `taxAmount`,
  `thaiTaxInvoice`, `ledgerAccount`, `deductible`, `bankAccount`,
  `accountNumber`, `taxId`, `name`, `email`, `rawPayload` are forbidden keys
  (the `controlled-imports-phase2` test enumerates these; D's schema must
  agree).
- `thaiTaxDocumentStatus` may be only `"not-source-asserted" | "unresolved"`;
  `"tax-invoice"` is forbidden. Source-stated WHT/GST/dates are preserved as
  text labels only, never interpreted.

**Anti-pattern coverage:**
- **A1 / A4** - The command test asserts `attest` called once with the exact
  forwarded audit context and `verify` called once with the exact
  authorization evidence; the caller-supplied-attestation test asserts
  `attest` and `verify` were **not** called. Falsifier: trusting a caller
  attestation, or calling verify before attest, fails.
- **A5 / A6** - No "policy-neutral" claim unless the `thaiTaxInvoiceStatus` and
  forbidden-key rejection tests pass.
- **A7** - The forbidden-key allowlist is an explicit `Set`, not a bare-word
  filter; the falsifier is each forbidden key.

**Review applicability:** security review **required** (caller-supplied-claim
rejection, data minimization, PII category rejection); adversarial testing
**required** (the nested-rejection, self-consistent-attestation, and
scope/digest-mismatch matrix); UX/API review **not applicable**; browser review
**not applicable**.

---

## Phase 1.3.E - Live-DB trust-root proof (Company Identity atomicity)

**Risk:** `medium` (supports A's trust root; the attestor is only as trustworthy
as the login/exchange that mints the credential). Live-DB tests are gated and
do not block the behavior Green gates, but closeout requires them to pass when
a disposable PostgreSQL is available.

**Targeted Red command (behavior, no DB):**

```bash
pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/company-identity/__tests__/protocol-safety.red.test.ts
```

**Live-DB proof commands (require disposable PostgreSQL; skip if absent):**

```bash
export COMPANY_IDENTITY_PG_TEST_URL="postgres://..."  # disposable DB only
pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/company-identity/__tests__/postgres-login-atomic.integration.test.ts \
  src/modules/company-identity/__tests__/postgres-exchange.integration.test.ts
```

```bash
pnpm --filter @reading-advantage/db exec vitest run \
  src/company-identity/__tests__/metadata-allowlist.test.ts
```

The two integration tests use `describe.skipIf(!databaseUrl)` and a 60s timeout;
they migrate a disposable database via the reviewed company-identity journal
before each proof. They must **never** run against a shared or production
database. The orchestrator must confirm the URL points at a disposable database
(e.g. a randomly-named test database), not `reading_advantage`,
`primary_advantage`, or `science_advantage`.

**Green gate (E):** the `protocol-safety` behavior test exits 0; the live-DB
tests exit 0 when a disposable URL is present and are explicitly skipped
(not failed) when absent. The `metadata-allowlist` test exits 0.

**Closeout gate (E):**
- One mandatory atomic SSO-session + success-audit seam
  (`createSsoSessionWithAudit`); service construction throws
  `COMPANY_IDENTITY_ATOMIC_AUDIT_SEAMS_REQUIRED:createSsoSessionWithAudit` if it
  is missing. A raw `createSsoSession` mutator is not exposed.
- Successful login uses the atomic seam, not a raw writer; a failed success-
  audit write rolls back both the session and the audit (the harness asserts
  both arrays are empty after the throw).
- Failed/malformed/preflight-failed authentications, authorizations, and code
  exchanges produce a `FAILED` audit whose serialized form does **not** contain
  the secret (password, token, client secret). This is the secret-safe audit
  falsifier.
- The reviewed postgres repository surface exposes only the allowed read and
  atomic/audited mutation seams; forbidden raw mutators (`upgradePasswordHash`,
  `createSsoSession`, `createApplicationSession`, `appendAuditInTransaction`,
  `consumeAuthorizationCode`) are absent; no inherited or symbol-keyed callable
  properties leak.
- No public `runWithCapabilityRequestContext` setter that can persist forged
  route metadata; the audit metadata allowlist (db package) rejects
  unapproved metadata keys.

**Fixtures and mocks (behavior):** repository harness with `vi.fn` seams,
rollback modeled by array checkpoints. **Live:** real `postgres` connection,
random UUIDs/usernames, real migration journal, real Argon2-shape hashes
(stubbed for determinism but real shape).

**Architecture guardrails / changed-contract risks:**
- The atomic seam name `createSsoSessionWithAudit` is now load-bearing across
  service, postgres-repository, and the protocol-safety test. Renaming it is a
  changed-contract risk that breaks A's trust root.
- The route-context internal adapter (`internal-route-adapter.ts`,
  `route-bindings.ts`, `request-context.ts`) is new candidate surface; the
  acceptance role must confirm no arbitrary public setter exposes it (the
  protocol-safety test asserts `runWithCapabilityRequestContext` is
  `undefined` on the public barrel).
- The db migration `0002_identity_audit_metadata_allowlist.sql` and its snapshot
  are candidate; the metadata-allowlist test must agree with the migration.

**Anti-pattern coverage:**
- **A1 / A4** - Secret-safe audit assertions use
  `expect(JSON.stringify(persistedAudits)).not.toContain(secret)` plus an
  explicit `FAILED` outcome assertion. Falsifier: persisting the secret, or
  omitting the FAILED audit, fails.
- **A5** - No "atomic login proven" claim unless the live-DB test exits 0 on a
  disposable database.
- **A16** - Preflight: verify exactly one shared master worktree before running
  any live-DB proof (no auxiliary worktrees).

**Review applicability:** security review **required** (secret-safe audit,
atomic rollback, reviewed repository surface, route-context forge resistance);
adversarial testing **required** (rollback, malformed-input, preflight-failure,
rate-limit-failure matrices); UX/API review **not applicable**; browser review
**not applicable**.

---

## Phase 1.3.F - Closeout gate

**Risk:** `medium` (integration/aggregate gate; catches cross-boundary drift).

**Closeout commands (all must exit 0):**

```bash
# Focused behavior suites (A-D)
pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/company-identity/__tests__/finance-authorization-adapter.red.test.ts \
  src/modules/company-identity/__tests__/protocol-safety.red.test.ts \
  src/modules/finance-operations/__tests__/durable-job-adapter.red.test.ts \
  src/modules/finance-operations/__tests__/historical-private-evidence-packet.red.test.ts
pnpm --filter @reading-advantage/storage exec vitest run \
  src/__tests__/finance-private-evidence-read.red.test.ts
pnpm --filter @reading-advantage/db exec vitest run \
  src/company-identity/__tests__/metadata-allowlist.test.ts

# Live-DB trust root (skip if no disposable URL)
COMPANY_IDENTITY_PG_TEST_URL="<disposable>" pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/company-identity/__tests__/postgres-login-atomic.integration.test.ts \
  src/modules/company-identity/__tests__/postgres-exchange.integration.test.ts

# No regression in accepted Phase 1 suites
pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/architecture-boundary.test.ts \
  src/modules/finance-operations/__tests__/port-boundaries.test.ts \
  src/modules/finance-operations/__tests__/authorization-audit.test.ts \
  src/modules/finance-operations/__tests__/money-history.test.ts \
  src/modules/finance-operations/__tests__/contracts.test.ts \
  src/modules/finance-operations/__tests__/independent-review-blockers.red.test.ts \
  src/modules/finance-operations/__tests__/postgres-record-repository.red.test.ts \
  src/modules/finance-operations/__tests__/provenance-whitespace.red.test.ts

# Type/lint/build
pnpm --filter @reading-advantage/backend run check-types
pnpm --filter @reading-advantage/storage run check-types
pnpm --filter @reading-advantage/db run check-types
pnpm --filter @reading-advantage/backend exec eslint src/modules/finance-operations src/modules/company-identity
pnpm --filter @reading-advantage/storage run lint
pnpm --filter @reading-advantage/db run lint
pnpm --filter @reading-advantage/backend run build
pnpm --filter @reading-advantage/storage run build
```

**Intentionally-red aggregate-suite handling (critical):**

`packages/backend/src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts`
is an **intentionally-red Phase 2 aggregate**. It references
`../controlled-imports.ts`, which does not exist and must not exist after Task 3.
Task 3's Green gate must **not** satisfy it. The closeout gate must assert this
test remains red (exits non-zero) and must **not** be added to the green
aggregate. The acceptance role runs:

```bash
pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  && echo "UNEXPECTED GREEN - Phase 2 aggregate must stay red" && exit 1 \
  || echo "expected red: Phase 2 aggregate correctly unresolved"
```

If this command ever exits 0 (green), Task 3 has over-reached into Phase 2 and
must be narrowed. The same rule applies to any future Phase 2 red test that
references modules not owned by Task 3.

The aggregate `pnpm turbo run test` / `pnpm --filter @reading-advantage/backend run test`
suite is expected to be **red** overall during Task 3 because of this
intentionally-red aggregate and pre-existing unrelated failures (Standard Pack
cross-root config, Planned Game Intake typing - recorded in the foundation
acceptance). The acceptance role must use the **focused** commands above, not
the aggregate, for the Green/closeout gate, and must record which aggregate
reds are pre-existing/unrelated versus Task-3-caused.

**Source-isolation gates (architecture guardrails, must stay green):**

- `finance-operations/architecture-boundary.test.ts` and
  `port-boundaries.test.ts` must exit 0. These enforce: no `@aws-sdk/`,
  `@google-cloud/`, `drizzle-orm`, `postgres`, `firebase-admin`, `googleapis`,
  or `@reading-advantage/db` imports inside finance-operations contracts/ports;
  no `fetch`/`require`/`WebSocket`/`XMLHttpRequest`/`process`/`Bun`/`Deno`; no
  raw `sql` template; no import escape outside the finance-operations directory.
  The `controlled-imports-phase2` test's `collectControlledImportBoundaryViolations`
  AST walker is the model; Task 3 production must pass the same boundary.
- The storage reader must not import a provider SDK or `@reading-advantage/db`.
- The company-identity attestor must not import finance-operations (dependency
  direction: finance -> company-identity, never the reverse).
- No cross-database reads, no shared credentials, no direct provider SDK use
  (spec "Integration constraints"). The acceptance role greps the Task 3 diff
  for forbidden imports.

**Artifact/documentation tests vs live behavior tests:**

- **Behavior tests (live logic):** A, B, C, D, and the `protocol-safety` portion
  of E. They execute real production code through injected fakes and assert
  runtime decisions, call sequences, immutability, and rejection. These are the
  Green gate.
- **Live-DB behavior tests:** the two `postgres-*.integration.test.ts` files and
  the `metadata-allowlist.test.ts`. They execute real SQL against a disposable
  database. They are gated and skipped without a URL; they are closeout
  evidence, not Red-stage blockers.
- **Artifact/documentation tests:** none are introduced by Task 3. The
  acceptance/final-acceptance docs (`phase1-task3-acceptance-*.md`, when
  written) are **not** tests; A5/A6 forbid claiming green from prose. The
  `historical-private-evidence-mvp-decision-20260811.md` is an uncommitted
  candidate decision doc, not accepted evidence; the strategy references it as
  context only.
- **AST/source-isolation tests:** `architecture-boundary.test.ts` and the
  boundary walker are behavior tests over source structure (they execute a TS
  AST walk), not documentation tests; they are falsifiable by adding a
  forbidden import.

**Risk class for closeout:** `medium` (integration gate; the individual
boundaries carry the high/critical risk).

**Anti-pattern coverage (closeout-wide):**
- **A8** - All Task 3 plan markers must be `[~]`, `[x]`, or `[b]`; `[ ]` (space)
  is forbidden. The orchestrator marker-vocabulary guard covers this.
- **A9** - This strategy and any new tests reference the active track path
  `measure/tracks/company_finance_operations_20260810/`, not an archive path.
- **A10** - No `measure/generated/` facts are touched by Task 3; if structural
  changes occur, `build-graph update` is the owning role's responsibility, not
  this strategy's.
- **A12** - Any guard test referenced by this strategy must exist; the
  acceptance role confirms `architecture-boundary.test.ts`,
  `port-boundaries.test.ts`, and `orchestrator_marker_vocabulary.sh` resolve.
- **A15** - Any role receipt produced for Task 3 must bind the post-strategy-
  commit `phase_base_sha` and the green commit; stale receipts from Task 2 are
  not valid Task 3 evidence.
- **A16** - Preflight: exactly one shared master worktree on `master` before
  every closeout action.

**Review applicability (Task 3 overall):**
- **Security review:** required for A, B, C, D, E (authorization root, PII
  boundary, outbox integrity, data minimization, secret-safe audit).
- **UX/API review:** not applicable. Task 3 has no UI and no external HTTP API;
  the factories are internal backend ports. (The company-identity OIDC routes
  in `apps/accounts` are dirty candidate work but are **not** owned by this
  strategy; they belong to the company-identity track.)
- **Adversarial testing:** required for A, B, C, D, E. The denial matrices,
  invalid-reference/digest/maxBytes fixtures, collision-freedom,
  conflict/stale-receipt/unsupported-outcome cases, caller-supplied-claim
  rejection, and secret-safe audit cases are the adversarial surface.
- **Browser review:** not applicable. No browser behavior is introduced or
  changed by Task 3.

## Falsifiability statement

Every test named in this strategy has an explicit falsifier:
- A: remove the factory, drop the audit append, or call authenticate twice.
- B: leak the provider object/public URL, call authorize before grammar
  validation, or accept a scope-mismatched reference.
- C: double-enqueue on replay, map `refreshed` to replay, or use a naive
  concatenation idempotency key.
- D: trust a caller-supplied attestation, accept a `thaiTaxInvoiceStatus` field,
  or call the binding port before the attestor allows.
- E: persist a secret in a FAILED audit, skip the rollback, or expose a raw
  mutator or route-context setter.
- F: satisfy the Phase 2 aggregate (must stay red) or add a forbidden import.

A claim of "green" or "accepted" for Task 3 is true if and only if every
focused command in Phase F exits 0, the intentionally-red aggregate remains red,
and the live-DB proofs exit 0 (or skip cleanly) on a disposable database. Any
other state refutes the claim.

# Finance Operations post-THB delivery strategy

## Decision and boundary

This strategy covers the next Finance delivery decision after bounded THB acceptance.
It owns only this document and its strategy role log.

The bounded THB implementation is complete in the plan. Its accepted boundary is:

- exact decimal source amounts and currencies remain unchanged;
- a separate THB amount uses trusted conversion evidence;
- THB uses exact identity conversion;
- Company Identity owns the complete policy receipt;
- Finance uses only the public receipt projection;
- Finance uses an injected evidence port;
- replay and changed-evidence conflict are deterministic;
- strict boundary capture rejects accessors, Proxies, unknown keys, and own `__proto__` keys.

This does not accept a THB rate source, rounding rule, or effective-date rule.
It does not accept Finance phase, product, accountant-pack, or release closeout.

The current plan marks the controlled import and THB implementation tasks `[x]`.
It marks the pilot `[b] deferred:finance-owner-data`.
It marks live CRM and Tutor owner contracts `[b] deferred:crm-tutor-source-owners`.
It marks close, accountant packs, and release as owner-gated.

**Decision:** no new production code slice is executable at this checkpoint.

The specification authorizes one conditional next slice: a policy-neutral historical
pilot using one owner-attested month and one billing packet. This strategy defines
its gates, but it does not admit execution before the required owner packet exists.

The pilot must use only `historical-private-evidence-packet.v1` and the accepted
private-evidence boundary. It must not read live CRM or Tutor data.

## Strategy lease and admission rule

The role owns only:

- `measure/tracks/company_finance_operations_20260810/test-strategy-post-thb.md`
- `measure/tracks/company_finance_operations_20260810/orchestration/post-thb-strategy-role.log`

This role does not edit source, tests, plan, registry, metadata, migrations, or
generated facts.

No `phase_base_sha` is claimed for the pilot. The orchestrator may capture one only
after an owner packet admits the pilot and the pilot Red contract is committed.

The pilot may become executable only when all conditions below hold:

1. An owner supplies one reconciled historical month and one billing packet.
2. The packet uses the accepted `historical-private-evidence-packet.v1` contract.
3. Company and optional school scope are explicit and owner-attested.
4. The packet binds source system, version, identity, payload digest, and private evidence reference.
5. The owner accepts a redacted test copy and its exact digest.
6. No test requires an unaccepted Thai tax, accounting, close, or pack decision.

Until these conditions hold, the correct state is **blocked**.

## Blocked-operation register

Each blocked operation has a separate external gate. Pilot data, source-owner
contracts, Thai policy, and Company Admin access must not be treated as one gate.

### Use THB valuation policy in production

- **Blocked operation:** Apply a THB valuation to a production Finance bill.
- **Required external input:** An owner or accountant must accept the authoritative
  `rateSourceId`, `roundingRuleId`, and `effectiveDateRuleId`. The decision must
  state the exact rate evidence, rounding behavior, and date rule.
- **Current evidence:** `measure/tracks/company_finance_operations_20260810/spec.md`
  requires these decisions before production use. The
  `test-strategy-phase2-thb.md` keeps the identifiers opaque. The current
  `packages/backend/src/modules/finance-operations/thb-valuation.ts` uses trusted
  evidence and an injected port without selecting a policy.
- **Unaffected work:** Exact decimal validation, THB identity conversion, source
  amount preservation, public receipt projection, replay, and conflict behavior stay accepted.
- **Next executable action:** Obtain the written decision receipt. Then author a
  policy-specific Red contract. Do not select values in Finance source now.

### Read an external THB rate source

- **Blocked operation:** Read or adapt a live provider as the THB evidence source.
- **Required external input:** First accept the THB policy decision. Then the named
  rate-source owner must publish a versioned source contract and an approved internal
  Finance port shape. Provider credentials and SDK choice remain adapter-owned.
- **Current evidence:** `packages/backend/src/modules/finance-operations/thb-valuation.ts`
  accepts `FinanceThbEvidencePort` only. The architecture boundary rejects provider
  and direct-runtime access.
- **Unaffected work:** Finance can validate trusted rate evidence without a provider.
  The bounded THB implementation remains complete.
- **Next executable action:** After the policy and source contract receipts exist,
  write port and adapter Red tests. Keep provider code outside Finance Operations.

### Run the historical pilot month and billing packet

- **Blocked operation:** Admit and execute one reconciled historical month and one billing packet.
- **Required external input:** The owner must supply the exact month boundaries, one
  `historical-private-evidence-packet.v1`, company or school scope, source identity and
  version, payload digest, private evidence reference, and owner attestation.
- **Current evidence:** `measure/tracks/company_finance_operations_20260810/plan.md`
  marks this task `[b] deferred:finance-owner-data`. The current
  `packages/backend/src/modules/finance-operations/controlled-imports.ts` pilot
  boundary returns `not-admitted` until this task is admitted. Accepted controlled-
  import contracts already cover normalization and atomic acceptance.
- **Unaffected work:** Historical packet validation, private-evidence binding, source
  provenance, replay, conflict, rollback, audit, and no-live-source guards remain usable.
- **Next executable action:** Accept the redacted packet and digest. Then admit the
  conditional pilot Red contract in this strategy.

### Read a live CRM billing catalog

- **Blocked operation:** Consume a live CRM customer billing-catalog snapshot.
- **Required external input:** The CRM source owner must publish and accept a
  versioned `CustomerBillingCatalogPort` contract. It must define authenticated
  company scope, customer and site identity, subscription and provisioning facts,
  provenance, revisions, and idempotency.
- **Current evidence:** `measure/tracks/company_finance_operations_20260810/spec.md`
  defers live CRM adapters until a named source-owner module publishes an accepted
  source-native contract. `measure/tracks/company_finance_operations_20260810/plan.md`
  records `[b] deferred:crm-tutor-source-owners`. The current
  `packages/backend/src/modules/finance-operations/ports.ts` and
  `port-contracts.ts` types are seams, not source-owner acceptance.
- **Unaffected work:** Historical private-evidence imports and the pilot do not need
  CRM data. Finance remains isolated from the CRM database.
- **Next executable action:** CRM owner publishes the source contract and acceptance
  receipt. Then create a separate CRM Red strategy. Do not add a CRM adapter now.

### Read a live Tutor financial export

- **Blocked operation:** Consume a live Tutor financial export for Finance reconciliation.
- **Required external input:** The Tutor source owner must publish and accept a
  versioned, authenticated, immutable `TutorFinancialExportPort` contract. It must
  bind evidence, revision or supersession identity, and idempotency. Any Tutor source
  conflict also needs a dated owner and accountant or legal disposition.
- **Current evidence:** `measure/tracks/company_finance_operations_20260810/spec.md`
  defers Tutor adapters until a named source-owner module publishes an accepted
  source-native contract. `measure/tracks/company_finance_operations_20260810/plan.md`
  keeps the combined CRM and Tutor task blocked. Current Finance port types do not
  prove Tutor ownership.
- **Unaffected work:** The historical packet pilot can run without Tutor. Finance does
  not read Tutor databases or reuse Tutor credentials.
- **Next executable action:** Tutor owner publishes the contract and resolves any
  source conflict. Then create a separate Tutor Red strategy. Do not add the adapter now.

### Interpret VAT, WHT, invoice, or accounting classification

- **Blocked operation:** Derive VAT, WHT, tax-invoice status, or accounting classification.
- **Required external input:** The owner and accountant must provide written decisions
  for invoice and tax-invoice fields, VAT posture, WHT treatment, and accounting classification.
- **Current evidence:** `measure/tracks/company_finance_operations_20260810/spec.md`
  explicitly defers these policies. Current controlled imports retain source-stated
  labels and unknown states. The controlled-import tests reject unreviewed policy fields.
- **Unaffected work:** Source-stated tax labels, source-stated amounts, and explicit
  unknowns remain valid. No statutory interpretation is claimed.
- **Next executable action:** Obtain the written decisions. Then author a bounded
  policy Red contract. Do not add guessed fields or calculations.

### Close a Finance period

- **Blocked operation:** Lock, reopen, or apply late-document and correction rules to a close period.
- **Required external input:** The owner and accountant must accept the close calendar,
  period boundaries, lock and reopen authority, late-document handling, retention,
  and correction or supersession policy.
- **Current evidence:** `measure/tracks/company_finance_operations_20260810/plan.md`
  marks close controls `[b] deferred:accountant-owner-decisions`. Existing records
  support append-only corrections, but no close policy is accepted.
- **Unaffected work:** Immutable history, explicit corrections, provenance, and audit
  behavior remain available before close controls.
- **Next executable action:** Obtain the written close decision. Then create Red tests
  for the exact close contract. Do not infer lock or reopen behavior.

### Generate or exchange an accountant pack

- **Blocked operation:** Generate, send, acknowledge, or correct an accountant pack.
- **Required external input:** The accountant and owner must accept the pack version,
  layout, required fields, period and evidence references, acknowledgement, correction
  reference, delivery boundary, and retention expectation.
- **Current evidence:** `measure/tracks/company_finance_operations_20260810/spec.md`
  defers accountant-pack layout. `measure/tracks/company_finance_operations_20260810/plan.md`
  blocks accountant packs until written policy decisions and pilot acceptance.
- **Unaffected work:** Finance may retain operational evidence and source provenance.
  It does not claim an accepted statutory pack.
- **Next executable action:** Obtain the accepted pack contract and pilot acceptance.
  Then author pack Red tests. Do not create a layout now.

### Grant Finance production access and release

- **Blocked operation:** Grant employee access to Finance or release Finance to production.
- **Required external input:** Company Admin owners must accept the Finance application
  role map, `COMPANY_ADMIN` inheritance, ordinary-employee access and denial,
  revocation, company or school scope, and audit evidence.
- **Current evidence:** `measure/tracks/company_finance_operations_20260810/plan.md`
  marks release `[b] deferred:company-admin-owner`. The small-company program
  ratifies `COMPANY_ADMIN` generally, but it does not accept Finance application
  roles or Finance production access.
- **Unaffected work:** Backend contracts, policy-neutral tests, and historical packet
  boundaries can proceed without production access.
- **Next executable action:** Accept the Company Admin role-to-application matrix.
  Then run the bounded access review and release gate. Do not add access routes now.

## Conditional code-bearing slice

### Slice name

**Policy-neutral historical private-evidence pilot admission and reconciliation proof.**

### Authorized behavior

The slice may activate the existing blocked pilot boundary around
`runHistoricalPrivateEvidencePilot` and the existing controlled-import functions.
It may add only behavior required to run the owner-attested packet through the accepted
normalization and atomic acceptance boundaries.

The slice may preserve source-stated values and labels. It may preserve
`unresolved` and `not-source-asserted` tax-document states.

The slice may not derive VAT, WHT, accounting classification, or statutory status.
It may not select a rate provider, rounding rule, or effective-date rule.
It may not add CRM, Tutor, Company Admin, close, or accountant-pack behavior.

### Conditional Red gate

Mid-red may create the focused pilot Red test only after owner admission. The file
is not present at this docs-only checkpoint.

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/historical-private-evidence-pilot-post-thb.red.test.ts \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  src/modules/finance-operations/__tests__/controlled-imports-phase2-review-b.red.test.ts \
  src/modules/finance-operations/__tests__/controlled-imports-phase2-tax-binding.red.test.ts \
  --pool=threads --maxWorkers=1
```

The Red command must collect successfully and fail only on the admitted pilot
behavior. It must not fail on fixtures, types, imports, or provider access.

The Red contract must prove these cases:

1. The exact owner packet and month do not return `not-admitted` after admission.
2. A packet version other than `historical-private-evidence-packet.v1` fails closed.
3. CRM, Tutor, provider, database, filesystem, network, and runtime lookalikes fail closed.
4. Caller-built Finance envelopes cannot replace the attested packet or evidence binding.
5. Company or school scope mismatch stops before record acceptance.
6. Evidence reference or payload digest mismatch stops before record acceptance.
7. Unresolved or not-source-asserted tax status remains explicit.
8. Caller VAT, WHT, tax-invoice, account-code, or classification fields are rejected.
9. A trusted preparation is required before normalization and atomic acceptance.
10. The exact source amount, source currency, source identity, and evidence digest remain unchanged.
11. An identical packet is a replay and does not replace the first accepted state.
12. A changed packet digest, source identity, batch identity, or scope is a conflict.
13. Record, durable-job, and succeeded-audit writes roll back as one unit on failure.
14. Authorization, audit, provenance, and correlation identities remain bound to the packet.
15. The pilot never calls a live CRM or Tutor adapter.

The Red contract must retain the existing controlled-import guards. A test that
accepts a caller-built packet or a guessed policy field is a failure of this strategy.

### Conditional Green gate

Jr-green may implement only the smallest behavior that satisfies the admitted Red
contract. Green must preserve the existing Finance public exports and ports.

The following commands must pass from `packages/backend`:

```bash
../../node_modules/.bin/vitest run \
  src/modules/finance-operations/__tests__/historical-private-evidence-pilot-post-thb.red.test.ts \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  src/modules/finance-operations/__tests__/controlled-imports-phase2-review-b.red.test.ts \
  src/modules/finance-operations/__tests__/controlled-imports-phase2-tax-binding.red.test.ts \
  --pool=threads --maxWorkers=1
../../node_modules/.bin/vitest run src/modules/finance-operations/__tests__/architecture-boundary.test.ts src/modules/finance-operations/__tests__/port-boundaries.test.ts src/modules/finance-operations/__tests__/postgres-boundary-exports.test.ts --pool=threads --maxWorkers=1
../../node_modules/.bin/tsc --noEmit -p tsconfig.json
../../node_modules/.bin/tsc --noEmit -p tsconfig.test.json
../../node_modules/.bin/eslint src/modules/finance-operations
../../node_modules/.bin/tsc
```

Green must also pass the accepted Finance regression suites. It must pass
`git diff --check` for the exact changed paths.

Green must not add a migration, provider SDK, direct database read, source-owner
adapter, Company Admin route, worker queue, close rule, or accountant-pack format.

Green must not convert source-stated VAT or WHT into a calculated value.
Green must not turn an opaque THB policy identifier into a selected policy.

### Conditional closeout gate

Phase acceptance may close the pilot only when all conditions below pass:

- the owner packet and month receipt bind the exact packet digest and scope;
- the focused pilot and accepted regression suites pass;
- the source-isolation and public-export checks pass;
- correctness, security, and adversarial reviews accept the same manifest;
- the first accepted state survives replay and conflict attempts;
- injected failure leaves no partial record, job, or succeeded-audit state;
- the exact provenance and audit chain is inspectable;
- no live CRM or Tutor call occurs;
- no policy field is interpreted;
- the pilot result does not claim statutory books, tax filings, or accountant acceptance.

The acceptance artifact must state whether the pilot used a company scope or school
scope. It must record the month boundary supplied by the owner. It must record the
packet, source, and evidence digests.

## Live proof

The pilot live proof must use a disposable PostgreSQL database. It must not use
`reading_advantage`, `primary_advantage`, `science_advantage`, or production data.

With `PG_TEST_URL` set to an administrator URL for disposable database creation,
run the existing persistence and adversarial suites:

```bash
CI=true PG_TEST_URL="$PG_TEST_URL" pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/finance-operations-record-store.integration.test.ts \
  src/__tests__/finance-operations-adversarial-persistence.integration.test.ts \
  --pool=threads --maxWorkers=1
```

The live pilot proof must additionally run the admitted owner packet through the
public Company Identity attestor and authorized private-evidence adapter. It must
verify one accepted record, one durable intent, and one succeeded audit binding.

It must replay the same packet and submit one changed packet. It must verify replay
without replacement and conflict without mutation.

It must inject a failure at record, durable-job, and audit staging. Each failure
must leave no partial state.

If the owner packet or disposable database is unavailable, the live proof is
**blocked**, not skipped or reported as Green. Existing unit fakes remain useful
for Red and Green behavior, but they cannot replace this pilot proof.

## Owner and accountant input matrix

The following inputs lack accepted requirements or accepted decisions. Each item is
owner-gated. This strategy does not choose a value for any item.

| Input                        | Exact minimum decision or evidence                                                                                                                                                                     | Current consequence                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Rate source                  | Name the authoritative source with stable `rateSourceId` and version. Bind the exact rate, source, and evidence reference.                                                                             | Production THB valuation and provider work remain blocked.                           |
| Rounding                     | Accept a stable `roundingRuleId`, decimal precision, rounding mode, and application stage with examples.                                                                                               | No rounding implementation or display claim is allowed.                              |
| Effective date               | Accept `effectiveDateRuleId` and the source-date rule, time zone, validity window, and missing or duplicate-rate handling.                                                                             | No rate lookup or date selection is allowed.                                         |
| Pilot packet and month       | Supply one reconciled historical month, one billing packet, exact month boundaries, scope, packet version, source identity/version, payload digest, private evidence reference, and owner attestation. | The Phase 2 pilot remains `[b] deferred:finance-owner-data`.                         |
| VAT, WHT, and classification | Provide written decisions for invoice and tax-invoice fields, VAT posture, WHT treatment, and accounting classification.                                                                               | Finance retains source-stated labels or unknowns. It does not calculate or classify. |
| Close rules                  | Provide the close calendar, period boundary, lock and reopen authority, late-document handling, retention, and correction or supersession policy.                                                      | Close controls remain `[b] deferred:accountant-owner-decisions`.                     |
| Accountant pack              | Provide the accepted layout, version, required fields, period and evidence references, acknowledgement, correction-reference, delivery, and retention expectations.                                    | Pack implementation remains owner-gated.                                             |
| Company Admin access         | Accept the Finance application role map, `COMPANY_ADMIN` inheritance, ordinary-employee access and denial, revocation, company or school scope, and audit evidence.                                    | Release remains `[b] deferred:company-admin-owner`.                                  |

The small-company program ratifies `COMPANY_ADMIN` as the owner/operator role. It
does not, by itself, accept Finance application roles or Finance production access.
The Company Admin role-to-application map remains an acceptance input.

## Complete owner-input checklist

- `OWNER INPUT MISSING — THB rate source:` authoritative source, stable `rateSourceId`, and version.
- `OWNER INPUT MISSING — THB rounding:` stable `roundingRuleId`, precision, mode, stage, and examples.
- `OWNER INPUT MISSING — THB effective date:` stable `effectiveDateRuleId`, source-date rule, time zone, and validity handling.
- `OWNER INPUT MISSING — pilot month and packet:` exact month, packet, scope, source identity, version, digest, evidence reference, and attestation.
- `OWNER INPUT MISSING — CRM source-owner contract:` accepted versioned `CustomerBillingCatalogPort` contract and owner receipt.
- `OWNER INPUT MISSING — Tutor source-owner contract:` accepted versioned `TutorFinancialExportPort` contract and owner receipt.
- `OWNER INPUT MISSING — Tutor source conflicts:` dated owner and accountant or legal disposition for each disputed source fact.
- `OWNER INPUT MISSING — VAT, WHT, and classification:` written owner and accountant decisions for each policy.
- `OWNER INPUT MISSING — close rules:` calendar, boundaries, lock, reopen, late documents, retention, and corrections.
- `OWNER INPUT MISSING — accountant pack:` accepted version, layout, fields, evidence, acknowledgement, correction, delivery, and retention.
- `OWNER INPUT MISSING — Company Admin access:` accepted Finance roles, inheritance, denial, revocation, scope, and audit evidence.

The disposable database and live proof environment are execution prerequisites.
They are not owner or accountant policy decisions.

## Review applicability

| Review                        | Applicability                                              | Gate                                                                                                             |
| ----------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Backend correctness           | Required                                                   | Contract, replay, conflict, rollback, provenance, and scope behavior must pass.                                  |
| Security                      | Required                                                   | Company Identity, private evidence, authorization, tenant scope, and audit boundaries must pass.                 |
| Adversarial testing           | Required                                                   | Caller fabrication, mutation, getters, Proxies, unknown keys, lookalikes, and partial failures must fail closed. |
| Architecture/source isolation | Required                                                   | Finance uses internal ports and no provider, database, runtime, or source-owner bypass.                          |
| Live database                 | Required for pilot closeout                                | Disposable PostgreSQL proof must pass with cleanup verification.                                                 |
| Accountant policy review      | Required for policy use                                    | Not required to run the policy-neutral Red/Green contract. Required before policy, close, or pack behavior.      |
| UX/API review                 | Not applicable                                             | No UI or public HTTP API is authorized in this slice.                                                            |
| Browser review                | Not applicable                                             | No browser behavior is authorized in this slice.                                                                 |
| CRM/Tutor integration review  | Not applicable to the pilot; required for live integration | The pilot must reject those adapters. Source owners must accept their contracts before separate Red work.        |
| Company Admin access review   | Required for release only                                  | The release task stays blocked until the access matrix is accepted.                                              |

## Anti-pattern defenses

- **A1, A4:** Require structured result statuses and at least one accepted packet.
- **A3:** Assert labeled result counts and exact record identities, not digit-only text.
- **A5:** Claim Green only when the cited command exits zero.
- **A6:** Do not update registry claims from this strategy.
- **A7:** Use explicit field and adapter allowlists.
- **A8:** Use only `[~]`, `[x]`, and `[b]` in future plan annotations.
- **A9:** Use the active track path in every future artifact.
- **A10:** Do not edit generated facts in this strategy.
- **A12:** Reference only guard files that exist at execution time.
- **A15:** Bind every role receipt to the current manifest and commit.
- **A16:** Use the single shared master worktree.

## Executable-or-blocked handoff

**Handoff status: BLOCKED NOW.**

The next role must not begin pilot Red, Green, or acceptance work at this checkpoint.
The orchestrator may admit the conditional pilot only after the owner supplies and
accepts the exact month and packet inputs in the matrix.

Live CRM and Tutor source-owner contracts remain separately blocked. Rate source,
rounding, effective date, VAT, WHT, classification, close rules, accountant-pack
layout, and Company Admin access remain owner-gated.

No overall five-lane workflow is planned here.

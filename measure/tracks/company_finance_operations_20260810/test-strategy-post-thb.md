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

## Review applicability

| Review                        | Applicability               | Gate                                                                                                             |
| ----------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Backend correctness           | Required                    | Contract, replay, conflict, rollback, provenance, and scope behavior must pass.                                  |
| Security                      | Required                    | Company Identity, private evidence, authorization, tenant scope, and audit boundaries must pass.                 |
| Adversarial testing           | Required                    | Caller fabrication, mutation, getters, Proxies, unknown keys, lookalikes, and partial failures must fail closed. |
| Architecture/source isolation | Required                    | Finance uses internal ports and no provider, database, runtime, or source-owner bypass.                          |
| Live database                 | Required for pilot closeout | Disposable PostgreSQL proof must pass with cleanup verification.                                                 |
| Accountant policy review      | Required for policy use     | Not required to run the policy-neutral Red/Green contract. Required before policy, close, or pack behavior.      |
| UX/API review                 | Not applicable              | No UI or public HTTP API is authorized in this slice.                                                            |
| Browser review                | Not applicable              | No browser behavior is authorized in this slice.                                                                 |
| CRM/Tutor integration review  | Not applicable to the pilot | The pilot must reject those adapters. A later source-owner track must accept their contracts.                    |
| Company Admin access review   | Required for release only   | The release task stays blocked until the access matrix is accepted.                                              |

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

Rate source, rounding, effective date, VAT, WHT, classification, close rules,
accountant-pack layout, and Company Admin access remain owner-gated.

No overall five-lane workflow is planned here.

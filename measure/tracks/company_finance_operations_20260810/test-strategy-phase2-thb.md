# Finance Operations Phase 2 THB valuation test strategy

## Status and boundary

This document defines the active THB Red slice for
`company_finance_operations_20260810`.

The THB task is `[~]` because Red tests are active. Green production work stays
owner-gated.

The owner or accountant must choose the rate source, rounding policy, and
effective-date policy before Green production use.

This slice must not choose those policies. It must not implement a rate
provider. Future provider access must use an internal Finance port.

## Red command

Run from `packages/backend`:

```bash
../../node_modules/.bin/vitest run \
  src/modules/finance-operations/__tests__/multi-currency-thb-phase2.red.test.ts \
  src/modules/finance-operations/__tests__/thb-owner-decision-receipt.red.test.ts \
  --pool=threads --maxWorkers=1
```

The initial Red result must show only missing THB contract or implementation
exports. It must not show collection, fixture, type, or provider failures.

The expected missing exports are:

- `financeThbConversionEvidenceSchema`
- `createFinanceThbValuationPreparer`
- `classifyFinanceThbValuationReplay`

The owner-decision receipt Red sub-slice adds these missing runtime exports:

- `financeThbOwnerDecisionReceiptSchema`
- `verifyFinanceThbOwnerDecisionReceipt`

The new test uses dynamic loading and local structural types. Every initial
failure must name only one missing receipt export.

The Company Identity authority-extension Red sub-slice runs this additional
test:

```bash
../../node_modules/.bin/vitest run \
  src/modules/company-identity/__tests__/finance-thb-policy-approval-attestation.red.test.ts \
  --pool=threads --maxWorkers=1
```

It requires one missing Company Identity export:

- `createFinanceThbPolicyApprovalAttestor`

The test loads the public Company Identity barrel through a dynamic import.
It uses local structural types and does not import the database package.
Every initial failure must name only this missing Company Identity export.

## Contract under test

The future contract must expose strict conversion evidence with these fields:

- `billId`
- `sourceAmountDecimal`
- `sourceCurrency`
- `thbAmountDecimal`
- `conversionRateDecimal`
- `rateEffectiveDate`
- `rateSourceId`

All decimal values must remain strings. Currency values must use uppercase
three-letter codes. The evidence schema must reject unknown keys, numbers,
lowercase codes, and invalid-length codes.

`createFinanceThbValuationPreparer` must accept an injected internal evidence
port. The port returns trusted conversion evidence for one source bill.

The preparer must preserve the exact source amount and source currency. It must
produce a separate exact THB amount.

The preparer must reject incomplete, contradictory, caller-only, and mutated
conversion evidence. It must reject duplicate evidence forms. It must not read
a provider directly.

`classifyFinanceThbValuationReplay` must return replay for unchanged evidence.
It must return conflict for changed conversion evidence.

## Owner-decision receipt Red sub-slice

The future receipt must use a strict root and strict nested objects. It must
bind one authenticated Company Identity signer to one company-first scope.

The smallest verifier boundary accepts:

- An unknown receipt value.
- An expected company and optional school scope.
- An injected reviewed Company Identity authority port for
  `finance-thb-policy-approval`.
- An injected Company Identity authorization port.
- An injected audit append port.
- An injected clock.
- An optional existing receipt for replay and supersession checks.

Caller-supplied signer fields never authorize a receipt. The authority port
must independently bind the server-issued decision identity to an attestation
or receipt-ledger lookup. It must verify the signature, signer policy, trusted
scope, and the `finance-thb-policy-approval` operation.

The authority result must return the reviewed decision identity, decision
evidence, and signer. It must return the trusted scope, content digest, and
verified signature marker. A mismatch or dependency failure must return a
stable error without the dependency message, cause, or stack.

The receipt must contain these bounded fields:

- Receipt and canonicalization versions.
- The Finance THB valuation operation.
- A server-bound decision identity.
- Company and optional school scope.
- Company Identity signer, claims version, and role-policy version.
- Company Identity decision evidence with the
  `finance-thb-policy-approval` operation, attestation identity, and opaque
  signature.
- Opaque rate-source, effective-date-rule, and rounding-rule identifiers.
- Valid-from and expiry instants.
- Optional superseded decision identity.
- Canonical replay and content digests.
- Event, request, correlation, and occurrence identities.

The supported receipt version is
`finance-thb-owner-decision-receipt.v1`. The supported canonicalization
version is `finance-thb-owner-decision-canonical.v1`.

Canonical content and replay identities use separate domain separators. Each
field uses UTF-8 byte-length framing and a fixed field order. Optional values
use explicit presence tags. Lists encode presence, length, order, and
duplicates. Canonicalization does not fold case or Unicode.

The schema rejects unknown keys in the root, scope, signer, decision evidence,
rate-source, effective-date-rule, rounding-rule, and audit objects.

The Red slice must not select a rate source, date rule, or rounding rule. Its
fixtures use opaque identifiers only.

## Required Red cases

The Red suite must cover:

1. Strict evidence schema behavior for exact decimal strings.
2. USD, EUR, JPY, and XOF source currencies.
3. THB identity conversion with a precise decimal amount.
4. Preservation of every source amount and currency.
5. Numeric source amounts and numeric conversion rates.
6. Lowercase or invalid-length source currencies.
7. Missing THB amount, rate, effective date, or source identity.
8. Contradictory evidence for source identity or currency.
9. A non-identity rate for a THB source bill.
10. A source-identity mismatch.
11. A duplicate conversion-evidence form.
12. Caller-only conversion fields without trusted port evidence.
13. Conversion facts changed before the evidence promise resolves.
14. Defensive output behavior after evidence mutation.
15. Stable replay for unchanged evidence.
16. Conflict for changed rate, effective date, THB amount, or rate source.

The owner-decision receipt test must also cover:

17. Authenticated signer authority and denied role decisions.
18. Company scope and optional school membership.
19. Claims and role-policy version binding.
20. Strict root and nested keys.
21. Canonical digest ordering and length framing.
22. Optional, delimiter, Unicode, case, list-order, and duplicate collisions.
23. Replay with the authoritative existing receipt.
24. Conflicts for changed receipt policy identity or trusted scope.
25. Valid successor, self-supersession, and unknown supersession.
26. Expired and not-yet-valid receipts.
27. Compact audit projection through the existing reviewed metadata keys.
28. Zero audit and domain writes after authorization denial.
29. Getter, proxy, deferred-await, and post-call mutation poison.
30. Stable errors without dependency text, causes, stacks, or secrets.
31. Unsupported receipt and canonicalization versions.
32. Invalid content digests and forged replay identities.
33. Independent authority mismatch, denial, signature failure, and dependency
    stack failure.
34. Changed trusted scope in the replay conflict matrix.
35. Length, delimiter, Unicode, case, list-order, duplicate, and absent-versus
    literal-sentinel canonical collisions.
36. Exact audit projection through `projectSecretSafeAuditMetadata`.

## Company Identity authority-extension Red contract

The Company Identity extension must expose the exact operation discriminator
`finance-thb-policy-approval` through `createFinanceThbPolicyApprovalAttestor`.

The attestor must verify a server-issued decision identity. Caller-provided
signer fields, scope, signature, or attestation values must never authorize.
The authority boundary must verify the operation, signature, decision digest,
signer policy, claims version, role-policy version, and trusted scope.
The receipt-ledger port must look up the authoritative decision by operation
and decision identity. It must do so before an allow result.
The authority result and ledger receipt must agree on every security field.
The fields include company scope, optional school scope, signer identity, and
signer authority. They also include claims and role-policy versions.
They include decision evidence, content digest, signature verification, and
the authoritative receipt identity.
Any mismatch must fail closed before an allow result or downstream write.

The contract must support these terminal results:

- Allow after authority and ledger agreement.
- Deny after authority rejection, malformed evidence, scope mismatch, or
  missing authority data.
- Replay for an unchanged authoritative receipt.
- Conflict for changed replay evidence or trusted scope.
- Deny for expired, not-yet-valid, or superseded authority.

The receipt and every nested object must reject unknown keys. This applies to
the scope, signer, decision evidence, policy-rule object, and audit context.
The boundary must snapshot untrusted values before awaits and reject getter,
Proxy, post-call mutation, and deferred mutation attacks.

Dependency failures must map to stable errors without dependency text, cause,
stack, or secret values. A terminal decision must append exactly one compact
secret-safe audit event. Validation denial and authority denial must perform
zero receipt-ledger or other domain writes. Audit metadata must pass through
`projectSecretSafeAuditMetadata` and contain only reviewed identity, scope,
version, digest, and replay fields.
Every terminal outcome must use the exact approved projection. This includes
allow, deny, replay, expired, superseded, conflict, and malformed dependency
results when the contract requires an audit. The projection must contain only
approved own keys. It must bind operation, authoritative decision identity,
outcome, and reason. It must also bind versions, scope, and signer authority.

The audit reason codes are exact and stable:

- `authority-accepted` for allow.
- `authority-denied`, `role-denied`, `scope-denied`, and `signature-invalid`
  for the matching authority denials.
- `replay` for unchanged replay.
- `replay-conflict` for changed replay evidence or trusted scope.
- `expired`, `not-yet-valid`, and `superseded` for lifecycle denial.
- `malformed-receipt` for malformed input.
- `malformed-dependency-result` for malformed authority or ledger results.
- `operation-mismatch` for an unsupported operation discriminator.
- `decision-identity-mismatch` for caller and server identity disagreement.
- `receipt-not-found`, `scope-mismatch`, `invalid-digest`, and
  `invalid-replay-identity` for their matching terminal denials.
- `security-field-mismatch` for any other authority or ledger field mismatch.
- `dependency-failure` for sanitized dependency failures.

The Red contract keeps rate-source, effective-date, and rounding identifiers
opaque. It selects no provider, date rule, rounding rule, or accounting policy.
The full decision receipt and signature remain outside audit metadata.

The exact receipt remains in Finance private evidence or a Finance-owned
receipt ledger. Audit metadata may retain only compact identifiers and digests:

- `source`, `resourceType`, `objectId`, `requestId`, `eventId`, and `occurredAt`.
- `schoolId`, `actorKind`, `actorSubjectId`, `claimsVersion`, and `policyVersion`.
- `sourceFingerprint` and `idempotencyReplay`.

The full rate-source record, effective-date rule, rounding rule, validity,
supersession, signer lists, and receipt envelope stay outside audit metadata.
Credentials, provider payloads, and dependency errors must never be stored.

The full decision evidence remains private. Compact audit metadata may retain
only reviewed identity, scope, claims, policy, digest, and replay fields.
The verifier must project audit data through the existing Company Identity
allowlist boundary. It must not import the database package directly.

The existing `packages/db/src/company-identity/__tests__/metadata-allowlist.test.ts`
must remain the migration gate. It already proves the current schema, 0002
original key set, and additive 0003 Finance key set stay aligned. This slice
adds no migration and does not change 0002.

The cases use exact decimal strings. They do not encode a provider, rate rule,
rounding rule, or effective-date policy.

## Green boundary

Green work may begin after owner decisions define the rate source, rounding
policy, and effective-date policy.

Green must add the smallest internal port and implementation that satisfy this
strategy. It must preserve source facts and bind conversion evidence.

Green must add fresh correctness and security reviews. It must run the focused
THB suite, Finance baseline suites, typecheck, lint, and diff checks.

Green must not change database migrations, Marketing, Sales, APK, Codecamp, or
worker files.

## Acceptance falsifiers

- A number replaces a decimal string.
- A source amount or currency changes in the result.
- A THB bill uses a non-identity rate.
- A caller-only conversion value is accepted.
- A duplicate conversion-evidence form is accepted.
- A source-identity mismatch is accepted.
- A changed rate returns replay.
- A changed evidence date returns replay.
- A changed THB amount returns replay.
- A changed rate source returns replay.
- A provider import appears in the Finance operation.

# Finance Operations Phase 2 THB valuation test strategy

## Status and boundary

This document defines the active THB acceptance-remediation Red slice for
`company_finance_operations_20260810`.

The THB valuation implementation is complete in the plan. Acceptance Red tests
remain active for public receipt compatibility and strict `__proto__` capture.

The owner or accountant must still choose the rate source, rounding policy, and
effective-date policy before valuation policy use.

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

The implementation Red result must show only the accepted THB compatibility and
capture findings. It must not show collection, fixture, type, or provider failures.

The expected missing exports are:

- `financeThbConversionEvidenceSchema`
- `createFinanceThbValuationPreparer`
- `classifyFinanceThbValuationReplay`

The Finance integration Red test uses dynamic loading and local structural
types. Every initial failure must name only one of the three missing exports.

The post-implementation Red result must name only the complete public Company
Identity receipt gap and the own `__proto__` capture gaps.

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

`createFinanceThbValuationPreparer` must accept the accepted Company Identity
attestor and an injected internal evidence port. The port returns trusted
conversion evidence for one source bill.

The preparer must call `FinanceThbPolicyApprovalAttestor.verify` first. It must
pass operation `finance-thb-policy-approval`, the caller receipt, and the
trusted expected scope. It must permit evidence access only after an `allow` or
`replay` result.

The preparer must use only the receipt returned by the attestor. It must bind
that receipt's `decisionId` and `contentDigest` to the valuation result. It
must map deny, conflict, malformed, and dependency failures to stable errors.

The preparer must preserve the exact source amount and source currency. It must
produce a separate exact THB amount.

The preparer must reject incomplete, contradictory, caller-only, and mutated
conversion evidence. It must reject duplicate evidence forms. It must not read
a provider directly.

`classifyFinanceThbValuationReplay` must return replay for unchanged evidence.
It must return conflict for changed conversion evidence.

## Accepted Company Identity attestor integration Red sub-slice

Company Identity owns receipt validation, authority, ledger lookup, and audit.
Finance must not define a duplicate receipt schema or receipt verifier.

The future preparer receives these two injected boundaries:

- `FinanceThbPolicyApprovalAttestor.verify` from the public Company Identity
  barrel.
- A Finance-owned internal evidence port for the source bill.

The preparer request contains a source bill, a caller approval receipt, and an
expected company-first scope with an optional school. The preparer passes the
request receipt to the accepted attestor. It passes no caller receipt fields
to the evidence port as trusted conversion facts.

The attestor may return `allow` or `replay` with an authoritative receipt. The
preparer may read evidence only after either result. It must use the returned
receipt, not the caller receipt, for valuation identity and digest fields.

The attestor may return `deny` or `conflict`. The preparer must stop before
evidence access and map each result to a stable Finance error. Malformed
attestor results and dependency failures must also stop before evidence access.

The preparer must snapshot and validate the request before the attestor await.
It must reject getters, Proxies, unknown keys, and mutations across the await.
It must return immutable valuation data without caller or dependency aliases.

This Red slice keeps rate-source, effective-date, and rounding identifiers
opaque. Company Identity tests own signer, authority, receipt, and audit rules.

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

The Finance integration test must also cover:

17. The exact Company Identity attestor verify envelope.
18. Attestor invocation before any evidence access.
19. Evidence access after `allow` and after `replay`.
20. Use of the attestor-returned decision identity and content digest.
21. Denial and conflict before evidence access.
22. Malformed attestor results with missing fields, invalid decisions, and invalid receipts.
23. Unknown keys in attestor results before evidence access.
24. Dependency failure mapping without dependency text or secrets.
25. Caller receipt and authoritative receipt disagreement.
26. Company and optional school scope binding through the attestor.
27. Optional-school mismatch before evidence access.
28. Getter-bearing request and attestor-result rejection.
29. Proxy request rejection before attestor access.
30. Request mutation across the attestor await.
31. Attestor-result mutation after promise resolution.
32. Unknown request keys and caller-only conversion fields.
33. Evidence mutation and defensive valuation output behavior.
34. Stable valuation replay for unchanged conversion evidence.
35. Conflict for changed conversion evidence.
36. Acceptance of a complete validated public Company Identity receipt.
37. Own `__proto__` request keys before attestor and evidence access.
38. Own `__proto__` evidence keys under strict evidence validation.
39. Own `__proto__` replay keys as conflicts.

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

Green remediation for the acceptance findings may begin without owner policy
decisions. It must only consume the public receipt and harden strict capture.

New valuation policy work remains blocked until the owner decisions define the
rate source, rounding policy, and effective-date policy.

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

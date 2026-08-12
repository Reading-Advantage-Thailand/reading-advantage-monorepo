# Historical private-evidence MVP decision — 2026-08-11

## Decision

Finance Operations will deliver its first controlled historical imports from
owner-attested, immutable private-evidence packets. Live CRM and Tutor reads are
not part of this MVP because no CRM or Tutor source-owner contract exists in the
monorepo.

This scope records an owner-boundary candidate for future controlled historical
imports. It does not assert that source packets, reconciliations, or pilot
evidence exist.

## Required trust boundary

Before historical import implementation is accepted, behavior-level tests and
adapters must prove:

- an authenticated Company Identity attestor and organization, with an accepted
  Finance role policy and school attestation only for school-scoped packets;
- an authorized private-storage read that validates the immutable evidence
  reference, company/optional-school scope, bounded content, and payload digest;
- a versioned `historical-private-evidence-packet.v1` with source-native
  identity, version, exact values, source-stated labels, and no raw provider
  objects or public URLs;
- strict data minimization: raw documents and sensitive payroll identifiers
  remain private evidence rather than normalized Finance facts;
- collision-free canonical idempotency across operation, scope, source
  identity/version, and digest; and
- one atomic record, succeeded-audit, and durable-job-intent outbox boundary,
  with immutable replay/conflict behavior.

The packet may preserve source-stated WHT, GST, dates, document classes, and
amounts. It must not infer Thai tax-invoice status, VAT/WHT policy, accounting
classification, or statutory treatment.

## Deferred live adapters

CRM `CustomerBillingCatalogPort` and Tutor `TutorFinancialExportPort` remain
blocked until named owner modules publish and accept source-native schemas,
identity, version, and evidence semantics. Finance normalization stays
downstream of those future owner contracts.

## Decision status

This is an owner-boundary decision candidate awaiting phase acceptance. The
committed Phase 1 acceptance records and the Task 3 implementation evidence in
`plan.md` establish the Company Identity, private-read, packet, and durable
outbox boundaries. No independent review acceptance is claimed here.

The corrected Phase 2 Red test provides the current executable evidence: the
Finance controlled-import module and pilot behavior are missing, while the AST
and source-owner guards pass. This is Red evidence for deferred implementation,
not phase acceptance.

The Phase 2 Red contract must use executable behavior-level tests and injected
fakes at the actual Company Identity, storage, and durable-job boundaries. It
must cover historical private-evidence packets and pilot behavior only. It must
not require live CRM or Tutor adapters or envelopes.

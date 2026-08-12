# Finance Operations foundation specification

## Objective

Create a policy-neutral foundation for the distinct planned `apps/accounting`
application. Finance Operations is an operational subledger and evidence
workspace; the Thai accountant's accepted books and statutory filings remain
authoritative.

## Boundary

Finance Operations may own operational records and evidence for payees,
expenses, reimbursements, payroll-summary imports, school billing, invoices,
receipts, credit notes, allocations, historical import batches, close periods,
and accountant export packs.

It does not own Company Admin identity, CRM customers or attribution, product
entitlements, Tutor checkout/network/commission/payout operations, or statutory
books, tax interpretation, or filings. It must not become `apps/accounts`,
Sales Advantage, a CRM, or a bookkeeping replacement.

## Integration constraints

- Consume Company Identity claims through its internal adapter, authorized
  private-storage reads, and durable jobs. Future source-owner contracts remain
  separate integration boundaries.
- Move facts only through authenticated, versioned, validated, idempotent ports.
- Forbid cross-database reads, shared credentials, and direct provider SDK use;
  adapters remain behind internal interfaces.
- Store source provenance and immutable snapshots rather than creating a second
  mutable source of truth.

## Historical private-evidence MVP

The first controlled-import release is narrower than the eventual live-source
integration. It accepts only an owner-attested
`historical-private-evidence-packet.v1` obtained through an authorized private
storage read. It must not read live CRM or Tutor databases, reuse their
credentials, or claim that Finance owns their source truth.

The attestation must bind an authenticated Company Identity subject and
organization to the company-first scope, with school scope required only when
the packet is school-scoped. The packet must bind source system, source version,
source record or batch identity, exact payload digest, and immutable private
evidence reference. Raw documents remain in private storage; normalized facts
use a strict, data-minimized grammar and preserve only source-stated values and
labels. Unknown accounting or tax policy remains explicit.

Packet idempotency must use a canonical collision-free identity over operation,
company, optional school, source system/version/identity, and payload digest.
Record acceptance, succeeded-audit evidence, and durable job intent must commit
through one atomic outbox boundary. Replay and conflict classification must
preserve the first accepted immutable state.

Live CRM and Tutor adapters are deferred until named source-owner modules exist
and publish accepted source-native contracts. Phase 2 must use only the
historical private-evidence packet and must reject Finance-owned CRM or Tutor
lookalike envelopes.

## First executable phase: policy-neutral foundation

Define bounded contracts, ports, and schema, then write Red tests covering:

1. Exact money and currency invariants: no binary floating-point amounts,
   silent currency mixing, implicit conversion, or unrecorded rounding.
2. Idempotency: a repeated source identity is a safe replay; a conflicting
   payload is rejected and leaves the accepted record unchanged.
3. Immutable history: accepted facts and evidence are append-only; corrections
   use explicit supersession or adjustment references rather than mutation.
4. Authorization: every operation requires validated Company Identity claims,
   approved app roles, and the applicable company/school scope.
5. Auditability: security-sensitive and financial-state changes record actor,
   operation, object, time, request/correlation identity, and outcome.
6. Provenance: each imported fact records source port/version, source identity,
   import batch, and evidence reference where applicable.
7. Isolation: tests reject direct reads of another database, shared credentials,
   and provider SDK coupling.

The first phase is contract- and test-first. It does not implement guessed Thai
policy.

## Explicitly deferred policy

Thai-specific invoice and tax-invoice fields, VAT, WHT, accounting
classification, close rules, retention, correction policy, and accountant-pack
layout remain unknown until written accountant/owner decisions are accepted.
Finance must represent policy versions and unknowns without inventing rules.

## Acceptance gate

The foundation is acceptable when its contracts and schema are bounded, the Red
tests specify the invariants above, adapters depend only on internal ports, and
the deferred-policy boundary is visible in code and documentation.

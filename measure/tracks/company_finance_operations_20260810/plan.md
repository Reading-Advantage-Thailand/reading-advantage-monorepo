# Implementation plan

## Phase 1 — policy-neutral foundation

- [x] Task: Define bounded contracts, internal ports, and schema for the operational
  records/evidence in `spec.md`; write Red tests for exact money/currency,
  idempotency, immutable history, authorization, audit, provenance, and
  cross-database/provider isolation. This is the only executable task in this
  scaffold; do not encode Thai policy. Accepted with evidence in
  `phase1-foundation-acceptance-20260810.md`.
- [x] Task: Implement the minimum domain/backend contracts and persistence behind the
  Red tests. Depends on the foundation contracts and failing-test assertions
  from the preceding task. Accepted with evidence in
  `phase1-persistence-acceptance-20260811.md`.
- [~] Task: Add behavior-level contract tests and adapters for the Company
  Identity attestor, authorized private-evidence reads, and a scope/digest-bound
  durable outbox projector required by the historical private-evidence MVP.
  Depends on the completed foundation task and the accepted boundary in
  `historical-private-evidence-mvp-decision-20260811.md`.

  Test strategy applicability: the canonical Red/Green/closeout gates, risk
  classes, anti-pattern coverage, intentionally-red aggregate handling
  (`controlled-imports-phase2.red.test.ts` must stay red), source-isolation
  gates, and review applicability for this task are defined in
  `test-strategy.md`. The Task 3 `phase_base_sha` is captured at the
  strategy commit, not at the persistence checkpoint `c5ecf18b`.
- [b] Task: Add live CRM `CustomerBillingCatalogPort` and Tutor
  `TutorFinancialExportPort` owner contracts and adapters only after those
  source owners exist and accept source-native identities, versions, evidence,
  and payload schemas. Finance normalization must remain downstream.

## Phase 2 — controlled operational imports

- [b] Task: Implement idempotent historical private-evidence packets,
  payroll-summary imports, historical school-billing snapshots, evidence
  references, and correction/supersession flow. Depends on the accepted
  Company Identity, private-read, and durable-outbox boundaries above; it must
  not read live CRM or Tutor data.
- [b] Task: Pilot one reconciled historical month and one historical billing
  packet with authorization, audit, rollback, and duplicate/conflict evidence.
  Depends on the historical import operations and accepted packet-attestation
  boundary above.

## Phase 3 — close and accountant exchange

- [b] Task: Implement close-period controls and versioned accountant export packs only
  after written decisions for Thai invoice/tax/VAT/WHT, classification, close,
  retention, correction, and pack policy (system-map R7). Depends on the pilot,
  accountant acceptance, and all relevant source contracts.
- [b] Task: Release Finance Operations access only after Company Admin role mapping,
  revocation, audit evidence, and the finalization gate are accepted. Depends on
  system-map R2, the completed policy decisions, and review evidence for every
  integration boundary.

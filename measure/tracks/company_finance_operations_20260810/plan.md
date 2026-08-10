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
- [b] Task: Add contract tests and adapters for Company Identity, CRM
  `CustomerBillingCatalogPort`, Tutor `TutorFinancialExportPort`, private
  storage reads, and durable jobs. Depends on accepted port owners, versioned
  payloads, and the completed foundation task.

## Phase 2 — controlled operational imports

- [b] Task: Implement idempotent historical batches, payroll-summary imports, Tutor
  export ingestion, school-billing snapshots, evidence references, and
  correction/supersession flow. Depends on accepted CRM and Tutor contracts,
  storage-read capability, durable jobs, and Phase 1 passing tests.
- [b] Task: Pilot one reconciled historical month and one accepted Tutor export with
  authorization, audit, rollback, and duplicate/conflict evidence. Depends on
  the import operations and source-owner acceptance above.

## Phase 3 — close and accountant exchange

- [b] Task: Implement close-period controls and versioned accountant export packs only
  after written decisions for Thai invoice/tax/VAT/WHT, classification, close,
  retention, correction, and pack policy (system-map R7). Depends on the pilot,
  accountant acceptance, and all relevant source contracts.
- [b] Task: Release Finance Operations access only after Company Admin role mapping,
  revocation, audit evidence, and the finalization gate are accepted. Depends on
  system-map R2, the completed policy decisions, and review evidence for every
  integration boundary.

# Implementation plan

## Phase 1 — policy-neutral foundation

- [x] Task: Define bounded contracts, internal ports, and schema for the operational records/evidence in `spec.md`; write Red tests for exact money/currency, idempotency, immutable history, authorization, audit, provenance, and cross-database/provider isolation. Accepted with evidence in `phase1-foundation-acceptance-20260810.md` in commit `3b3a128ea381f8fff0c6e1136894fd39228eaff9`.
- [x] Task: Implement the minimum domain/backend contracts and persistence behind the Red tests. Accepted with evidence in `phase1-persistence-acceptance-20260811.md` in commit `c5ecf18b0830c8702602f9f5f33415c7b3e92d66`.
- [x] Task: Add behavior-level contract tests and adapters for the Company Identity attestor, authorized private-evidence reads, and scope/digest-bound durable outbox projector required by the historical private-evidence MVP. Source commit `48470311d4f6b06b7e9ebcce7ba1f380444f0a79` (with Git note evidence).

  Final Task 3 acceptance evidence (2026-08-13):

  - Accepted sorted 32-path manifest: `a078f65cdea002b7ff0b1284c75314d44151877b80e172fe1ca1e914202d7875`.
  - Review A: ACCEPT, bound to manifest `a078f65c`.
  - Security Review B: ACCEPT, bound to manifest `a078f65c`.
  - Focused bind/digest suites: 2 files, 115/115 tests. Backend: 24 files, 318/318 tests. Storage: 8 files, 74/74 tests. DB: 3 files, 31/31 tests.
  - Backend, Storage, and DB typechecks, targeted lint, and `git diff --check` passed.
  - PostgreSQL 16 `migration-upgrade.integration` passed 1/1. Backend live suites passed 4 files, 4/4 tests, using a disposable least-privilege database; cleanup verification found 0 remaining temporary databases and 0 remaining temporary roles.
  - Historical `0002` SQL and snapshot remain byte-immutable with exact SHA-256 hashes `f0535ed5dd6eab2d74818cc0fca6fa964338f5d3fe3bd0ed392810b09a0d913a` and `567a39b4adad21847a64d020e2fb8c64bd33b5407cd29c2bd68430588aa10e14`. The additive/journaled `0003_finance_attestation_audit_metadata` migration and `meta/0003_snapshot.json` carry the exact doctor sentinel, which was validated.
  - The Phase 2 aggregate stayed intentionally Red and was excluded from Task 3 acceptance. No Phase 1 checkpoint is recorded because the CRM/Tutor source-owner task remains blocked.

- [b] Task: Add live CRM `CustomerBillingCatalogPort` and Tutor `TutorFinancialExportPort` owner contracts and adapters only after those source owners exist and accept source-native identities, versions, evidence, and payload schemas. Finance normalization must remain downstream.

## Phase 2 — controlled operational imports

- [b] Task: Implement idempotent historical private-evidence packets, payroll-summary imports, historical school-billing snapshots, evidence references, and correction/supersession flow. Depends on the accepted Company Identity, private-read, and durable-outbox boundaries above; it must use only the approved historical-private-evidence MVP and must not use live CRM or Tutor adapters or Finance-owned lookalike envelopes. (deferred:phase2)
- [b] Task: Pilot one reconciled historical month and one historical billing packet with authorization, audit, rollback, and duplicate/conflict evidence through owner-attested private-evidence packets only. (deferred:phase2)

  Historical Red chronology (2026-08-12): the Phase 2 aggregate remained intentionally Red because `controlled-imports.ts` and the historical import operations do not exist. Its compiler AST fixture, source-owner guard, and missing-source boundary guard passed; the remaining expected failures were excluded from Phase 1 Task 3 acceptance.

## Phase 3 — close and accountant exchange

- [b] Task: Implement close-period controls and versioned accountant export packs only after written decisions for Thai invoice/tax/VAT/WHT, classification, close, retention, correction, and pack policy (system-map R7). Depends on the pilot, accountant acceptance, and all relevant source contracts.
- [b] Task: Release Finance Operations access only after Company Admin role mapping, revocation, audit evidence, and the finalization gate are accepted. Depends on system-map R2, the completed policy decisions, and review evidence for every integration boundary.

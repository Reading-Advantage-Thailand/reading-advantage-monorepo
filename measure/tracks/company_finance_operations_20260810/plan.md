# Implementation plan

## Phase 1 — policy-neutral foundation

- [x] Task: Define bounded contracts, internal ports, and schema for the operational
  records/evidence in `spec.md`; write Red tests for exact money/currency,
  idempotency, immutable history, authorization, audit, provenance, and
  cross-database/provider isolation. This is the only executable task in this
  scaffold; do not encode Thai policy. Accepted with evidence in
   `phase1-foundation-acceptance-20260810.md` in commit
   `3b3a128ea381f8fff0c6e1136894fd39228eaff9`.
- [x] Task: Implement the minimum domain/backend contracts and persistence behind the
  Red tests. Depends on the foundation contracts and failing-test assertions
  from the preceding task. Accepted with evidence in
   `phase1-persistence-acceptance-20260811.md` in commit
   `c5ecf18b0830c8702602f9f5f33415c7b3e92d66`.
- [x] Task: Add behavior-level contract tests and adapters for the Company
  Identity attestor, authorized private-evidence reads, and a scope/digest-bound
  durable outbox projector required by the historical private-evidence MVP.
  Depends on the completed foundation task and the accepted boundary in
  `historical-private-evidence-mvp-decision-20260811.md`.

  Green implementation evidence:
  `98d111bdf1c4eea2d2b6980d884ad97250f03cb2` adds the Company Identity Finance
  attestor and commits the reviewed private-read, packet, and durable-projector
  boundaries. The A targeted command passed with 7 tests. B passed with 25
  tests, C with 9 tests, D with 39 tests, and the protocol safety suite with
  13 tests. The live PostgreSQL suites skipped because no disposable URL was
  set, as `test-strategy.md` permits. The Phase 2 aggregate remains
  intentionally Red. Backend package typecheck failures are in unrelated
  Standard Pack and Planned Game Intake tests. Doctor marker failures are in
  unrelated active tracks. This evidence does not claim package-wide typecheck
  or doctor success.

  Test strategy applicability: the canonical Red/Green/closeout gates, risk
  classes, anti-pattern coverage, intentionally-red aggregate handling
  (`controlled-imports-phase2.red.test.ts` must stay red), source-isolation
  gates, and review applicability for this task are defined in
  `test-strategy.md`. The Task 3 `phase_base_sha` is captured at the
  strategy commit, not at the persistence checkpoint `c5ecf18b`.

   Mid Red evidence (2026-08-11): the phase scope uses
   `phase_base_sha=c93f3a84fcd72c3559e81fdbe7c9ac761d993f35`. The dispatch role
   base is `role_base_sha=745236b4f8239571b4633f7aaadf302faad93d10`. The A
   attestor command exits 1 because the public Company Identity barrel lacks
   `createFinanceCompanyIdentityAttestor`; seven assertions fail at that
   missing export. This is an implementation Red, not an environment Red.

   The B, C, and D commands exit 0 on the dirty candidate production tree with
   25/25, 9/9, and 39/39 tests passing. These are candidate-green boundaries,
   not accepted Green evidence. The protocol-safety command exits 0 with
   13/13 tests passing. The two live PostgreSQL tests exit 0 with two tests
   skipped because `COMPANY_IDENTITY_PG_TEST_URL` and
   `COMPANY_IDENTITY_INTEGRATION_DATABASE_URL` are unset. The metadata allowlist
   command exits 0 with 2/2 tests passing. The source-isolation guards exit 0
   with 6/6 tests passing. The Phase 2 aggregate remains intentionally Red and
   is not part of this task's Green gate.

   The Red commit owns only the focused A-E test files and this plan. Candidate
   production, Accounts, migration, metadata, package, lockfile, decision,
   specification, Mastery, and `.opencode` changes remain unstaged.
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

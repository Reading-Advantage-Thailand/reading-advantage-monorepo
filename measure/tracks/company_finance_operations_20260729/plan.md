# Implementation Plan: Company Finance Operations and Accounting Handoff

## Status and Execution Rules

- Planning only: no app code, migration, source endpoint, integration, or data
  import is implemented by this track creation.
- Execute stories in order unless dependencies explicitly permit contract/Red
  test work in parallel. Mark tasks `[~]`, prove Red before Green, and complete
  Measure phase review/manual acceptance before advancing.
- Rebuild the canonical repository graph before exported implementation edits.
  `build-graph` was unavailable during this planning pass.
- Preserve `spec.md` source ownership. A dependency failure never authorizes a
  direct database read, provider SDK import, duplicated Tutor workflow,
  request-path retry, or hard-coded tax rule.
- `s0-external-readiness.md` is the redacted intake checklist for unavailable
  owner/accountant/source inputs. It records no decision and does not advance
  any S0 checkbox or this track's `new` status.

## Dependencies and External Acceptance

- Backend Capability Kernel final acceptance before runtime registration.
- Durable Job Worker Phase 4 before production jobs.
- Company Identity/owner-role-map acceptance before Finance SSO production use.
- Accepted private storage read/stream, write, checksum, and read-only signed
  URL semantics before document migration.
- Accepted CRM customer/site/subscription contracts before B2B billing.
- A separate Tutor owner track implements/accepts `TutorFinancialExportPort`;
  Finance never reads Tutor's database.
- Thai accountant and owner accept S0 examples, import controls, close rules,
  and pack layout before production financial behavior.

## Phase S0: Ratify finance contracts
_Story ref: spec.md#story-s0_

- [ ] Task: Complete evidence-backed product and compliance discovery.
  - [ ] Inventory representative reports, evidence folders, school invoices, contractor payments, reimbursements, payroll summaries, and handoff steps without committing live sensitive data.
  - [ ] Record formats, volumes, currencies, periods, deadlines, retention, VAT posture, and correction process.
  - [ ] Record Tutor implemented behavior and code/document conflicts with source owners.
- [ ] Task: Ratify the owner/accountant decision register.
  - [ ] Approve categories, WHT/VAT classifications, document/number rules, evidence, and example calculations.
  - [ ] Approve period states, materiality, lock/correction, pack, and acknowledgement policy.
  - [ ] Assign unresolved decisions and Tutor conflicts to named owners with fail-closed defaults.
- [ ] Task: Define Finance identity, tenancy, permission, and access contracts.
  - [ ] Register proposed application/role contracts and exact `COMPANY_ADMIN -> FINANCE_ADMIN` mapping.
  - [ ] Define named configuration, AP, payroll, AR, document, import, Tutor, close, pack, and audit permissions.
  - [ ] Define global tenancy and school/unrelated-role counterexamples.
- [ ] Task: Define shared primitives and source ports.
  - [ ] Define Zod money, tax, period, source/revision/checksum, evidence, correction, and safe-error contracts.
  - [ ] Define customer, Tutor, private storage, payment evidence, and pack delivery ports without provider types.
  - [ ] Publish fixtures, compatibility, idempotency, supersession, and ownership policy.
- [ ] Task: Design finance PostgreSQL and security boundaries.
  - [ ] Review entity/lifecycle/constraint/index/immutability/transaction design for S1-S5.
  - [ ] Classify global data, payroll/tax/bank/document sensitivity, audit allowlist, retention, and backup/restore.
  - [ ] Prove there are no cross-DB FKs, credentials, product progress, or Tutor operational tables.
- [ ] Task: Write Red S0 contract, permission, and architecture tests.
  - [ ] Cover parsing, money, roles, tenancy, redaction, revisions, port compatibility, and provider neutrality.
  - [ ] Add counterexamples for hard-coded WHT, direct DB/provider use, public objects, and legacy role hierarchy leakage.
  - [ ] Retain expected Red evidence.
- [ ] Task: Implement/register only the accepted S0 foundation.
  - [ ] Add backend/app scaffold, descriptors, role registration, DB adapter root, and typed ports after prerequisites.
  - [ ] Add no financial workflow beyond the accepted foundation.
  - [ ] Run scoped tests, type, lint, build, graph update, generate, and doctor.
- [ ] Task: Measure - User Manual Verification 'Phase S0: Ratify finance contracts' (Protocol in workflow.md)

## Phase S1: Operate payables and reimbursements
_Story ref: spec.md#story-s1_

- [ ] Task: Define strict AP, payee, reimbursement, payroll-summary, payment, tax, and correction contracts.
  - [ ] Define lifecycle states, required/immutable fields, evidence, duplicate identities, and errors.
  - [ ] Separate payee, claimant, classification, applied tax, and payment identities.
  - [ ] Define minimum-data payroll summaries and field-level access.
- [ ] Task: Design/review S1 Drizzle schema and migrations.
  - [ ] Model payees/classifications, expenses, reimbursements, payroll batches, approvals, payments, tax snapshots, evidence, and corrections.
  - [ ] Enforce money/currency, unique source, immutable paid/exported facts, and reversal lineage.
  - [ ] Classify all tables under global Finance access.
- [ ] Task: Write Red S1 unit, permission, and real-PostgreSQL tests.
  - [ ] Cover workflows, roles, duplicates, concurrency, idempotency, approval/payment separation, rollback, and correction.
  - [ ] Cover accountant WHT examples and missing/expired/unapproved rules.
  - [ ] Cover reimbursement/payroll privacy, redaction, document IDOR, and malicious metadata.
- [ ] Task: Implement S1 backend capabilities and persistence.
  - [ ] Implement payee, bill, reimbursement, payroll import, approval, payment, evidence, and correction operations behind kernel descriptors.
  - [ ] Keep storage/payment evidence behind ports and business logic transport-independent.
  - [ ] Emit immutable safe audit/observability.
- [ ] Task: Implement durable S1 document/import handlers.
  - [ ] Validate/scan/hash/store private evidence and issue authorized short-lived access.
  - [ ] Parse approved summary formats idempotently with explicit exceptions.
  - [ ] Prove retry/lease/dead-letter/replay cannot duplicate facts or objects.
- [ ] Task: Build thin AP/reimbursement UI.
  - [ ] Add payee, expense, reimbursement, payroll, approval, payment, exception, evidence, and correction views.
  - [ ] Enforce actions server-side and expose provenance/gaps/immutability clearly.
  - [ ] Verify accessible desktop and essential mobile workflows.
- [ ] Task: Run S1 quality and finance-security review.
  - [ ] Run tests/coverage, migrations, type, lint, build, graph, generate, and doctor.
  - [ ] Review double payment, IDOR, role crossover, tax substitution, document access, races, and audit tampering.
  - [ ] Resolve all Critical/High findings.
- [ ] Task: Measure - User Manual Verification 'Phase S1: Operate payables and reimbursements' (Protocol in workflow.md)

## Phase S2: Bill school customers
_Story ref: spec.md#story-s2_

- [ ] Task: Define B2B billing and CRM-source contracts.
  - [ ] Define profile, agreement/line, schedule, invoice, receipt, credit note, payment/allocation, incoming-WHT, and balance contracts.
  - [ ] Define accepted CRM snapshots and source-version failures.
  - [ ] Define numbering, issue/credit, allocation, currency, and tax invariants using accountant examples.
- [ ] Task: Design/review S2 Drizzle schema and migrations.
  - [ ] Model billing profiles/agreements/schedules/events, sequences, documents, payments/allocations, WHT, and source snapshots.
  - [ ] Enforce immutable issued docs, numbering, allocation balance, currency, schedule idempotency, and corrections.
  - [ ] Keep entitlement/provisioning outside Finance.
- [ ] Task: Write Red S2 contract, permission, calculation, and PostgreSQL tests.
  - [ ] Cover CRM versions, schedule concurrency, issue/credit, VAT/WHT, partial/multi allocation, overpayment, and rollback.
  - [ ] Prove Finance cannot mutate product access.
  - [ ] Cover school-role denial, public data protection, and private delivery.
- [ ] Task: Implement S2 capabilities and CRM adapter.
  - [ ] Implement billing config, draft/issue/credit, payment/allocation, receipt, WHT, aging, and balance operations.
  - [ ] Snapshot accepted `CustomerBillingCatalogPort` versions and fail closed on ambiguity/staleness.
  - [ ] Publish authorized read-only finance status to CRM.
- [ ] Task: Implement durable billing/document handlers.
  - [ ] Generate one draft per approved schedule occurrence.
  - [ ] Generate versioned private invoice/receipt/credit-note artifacts.
  - [ ] Prove retry/regeneration cannot duplicate numbers/documents.
- [ ] Task: Build thin school-billing UI.
  - [ ] Add profiles, agreements, schedules, drafts, documents, allocations, WHT, aging, and corrections.
  - [ ] Show CRM/product status read-only with source version.
  - [ ] Verify accessibility, responsive review, and printable outputs.
- [ ] Task: Run S2 quality and cross-boundary review.
  - [ ] Run tests/coverage, migrations, type, lint, build, graph, generate, and doctor.
  - [ ] Reconcile golden documents/allocations with approved examples.
  - [ ] Resolve all Critical/High Finance/privacy/CRM findings.
- [ ] Task: Measure - User Manual Verification 'Phase S2: Bill school customers' (Protocol in workflow.md)

## Phase S3: Reconcile Tutor Advantage
_Story ref: spec.md#story-s3_

- [ ] Task: Produce/accept the cross-repository Tutor finance dossier.
  - [ ] Record implemented Tutor payment, receipt, reconciliation, settlement, approval, adjustment, payout, transfer, document, and CSV behavior.
  - [ ] Record OpenAPI/code, WHT threshold/code, and payout-runbook/code conflicts with owners.
  - [ ] Approve finality, controls, revisions, auth, retention, and failure semantics.
- [ ] Task: Define `TutorFinancialExportPort` v1 and fixtures.
  - [ ] Define strict envelope/detail/control, period, environment, revision/checksum, status, evidence, exception, and safe errors.
  - [ ] Include Omise payment/transfer, refund, receipt/VAT, adjustment, commission/bonus, WHT/rule, payout, document, and count controls.
  - [ ] Provide valid, replay, conflict, non-final, superseding, unresolved, rounding, and malicious fixtures.
- [ ] Task: Write Red Tutor consumer/reconciliation tests.
  - [ ] Cover versions, auth, checksum, replay, conflict, finality, totals, and immutable supersession.
  - [ ] Prove applied WHT imports without recomputation/compliance claim.
  - [ ] Prove no Tutor DB/provider imports or source-owned mutations.
- [ ] Task: Coordinate/accept the separate Tutor producer implementation.
  - [ ] Require a Tutor track for the authenticated export without weakening maker-checker authorization.
  - [ ] Require source snapshot, totals/counts, checksum, idempotency, revision, and PII-minimization tests.
  - [ ] Reject current human CSV/undocumented routes as production port proof.
- [ ] Task: Implement Finance Tutor ingestion/reconciliation.
  - [ ] Persist immutable envelopes/revisions/details/evidence/exceptions/controls.
  - [ ] Use durable jobs and reject conflicting semantic duplicates.
  - [ ] Expose source review only, with no Tutor operation.
- [ ] Task: Build Tutor reconciliation UI and close gate.
  - [ ] Show revision/finality, gross-to-net bridge, tax provenance, status counts, evidence, exceptions, and lineage.
  - [ ] Represent source actions only as links/instructions.
  - [ ] Block close for non-final/materially unreconciled facts.
- [ ] Task: Run S3 provider-contract, security, and failure gates.
  - [ ] Run consumer/provider, reconciliation, PostgreSQL/job, auth/redaction, type, lint, build, graph, generate, and doctor gates.
  - [ ] Drill outage, duplicate, conflict, locked supersession, unresolved Omise transfer, and unsupported version.
  - [ ] Obtain independent Finance and Tutor owner reviews.
- [ ] Task: Measure - User Manual Verification 'Phase S3: Reconcile Tutor Advantage' (Protocol in workflow.md)

## Phase S4: Import historical reports
_Story ref: spec.md#story-s4_

- [ ] Task: Create privacy-safe source inventory/migration manifest.
  - [ ] Enumerate two years by period, format, owner, controls, and evidence completeness.
  - [ ] Assign source IDs and flag duplicates, gaps, protected/scan/unsupported files, and sensitive fields.
  - [ ] Select representative pilot month and expected controls.
- [ ] Task: Define archive, raw-row, mapping, batch, exception, and reconciliation contracts.
  - [ ] Define source hashes, mapping/locale rules, raw lineage, normalized projections, exceptions, lifecycle, controls, and corrections.
  - [ ] Distinguish archive-only, normalized facts, and opening summaries.
  - [ ] Define rollback before acceptance and no-rewrite after acceptance.
- [ ] Task: Write golden Red import/reconciliation tests.
  - [ ] Build redacted/synthetic fixtures for approved formats/edges.
  - [ ] Cover dry-run, ambiguity, duplicate, rounding, missing evidence, replay, mapping revision, partial failure, and controls.
  - [ ] Prove scans archive without unreviewed OCR posting and failed normalization retains raw data.
- [ ] Task: Implement durable archive/parser adapters.
  - [ ] Store/hash exact private objects before parsing.
  - [ ] Implement approved mappings and archive-only handling for unsupported scans.
  - [ ] Persist lineage, exceptions, progress, and restart-safe batches.
- [ ] Task: Implement dry-run, commit, reconciliation, and correction UI/capabilities.
  - [ ] Provide inventory, mapping, preview, controls, row exceptions, evidence, approval, and accepted-batch views.
  - [ ] Require reviewer and accountant/owner evidence.
  - [ ] Create open-period corrections, never accepted-history edits.
- [ ] Task: Reconcile pilot, then import remaining periods.
  - [ ] Match approved counts/totals exactly or record accepted evidence gaps.
  - [ ] Stop on unexplained material variance.
  - [ ] Produce acceptance receipts with source/mapping/batch hashes and signer references.
- [ ] Task: Run S4 migration/recovery review.
  - [ ] Run fixtures, PostgreSQL, storage/job, access/redaction, type, lint, build, graph, generate, and doctor.
  - [ ] Drill corruption, parser crash, pre-acceptance rollback, duplicate run, storage outage, and restore.
  - [ ] Resolve all Critical/High data-loss/privacy/reconciliation findings.
- [ ] Task: Measure - User Manual Verification 'Phase S4: Import historical reports' (Protocol in workflow.md)

## Phase S5: Close and export month
_Story ref: spec.md#story-s5_

- [ ] Task: Define period, readiness, exception, lock, correction, pack, and delivery contracts.
  - [ ] Define `OPEN`, `PREPARING`, `REVIEWED`, `LOCKED` transitions and immutable snapshots.
  - [ ] Define material/blocking/approved exceptions without silent waivers.
  - [ ] Version manifest, files, controls, evidence, checksums, acknowledgement, rejection, supersession, and corrections.
- [ ] Task: Design/review S5 schema and lock transactions.
  - [ ] Model periods, readiness, controls, approvals, snapshots, pack files, deliveries, acknowledgements, and corrections.
  - [ ] Enforce state, reviewer, included-record immutability, deterministic sources, and no post-lock mutation.
  - [ ] Define DB/storage compensation and orphan cleanup.
- [ ] Task: Write Red close, concurrency, deterministic-export, and permission tests.
  - [ ] Cover blockers, close/write races, stale readiness, corrections, regeneration, and supersession.
  - [ ] Prove locked mutation and unauthorized list/sign/download fail closed.
  - [ ] Validate registers/totals/rounding/evidence against accountant golden outputs.
- [ ] Task: Implement readiness, review, lock, and correction capabilities.
  - [ ] Compute deterministic AP/payroll/AR/WHT/VAT/Tutor/payment/balance/import controls.
  - [ ] Atomically lock exact reviewer-approved snapshot.
  - [ ] Post linked open-period corrections with bidirectional lineage.
- [ ] Task: Implement durable pack generation/delivery evidence.
  - [ ] Generate versioned CSV/XLSX, summaries, registers, evidence/exception indexes, and manifest.
  - [ ] Store privately, verify checksums, issue authorized access, and audit acknowledgement.
  - [ ] Prove retries cannot create divergent logical packs.
- [ ] Task: Build close and accountant-pack UI.
  - [ ] Add readiness, controls, exceptions, approval, lock, pack history, delivery, acknowledgement, and correction views.
  - [ ] Require explicit irreversible confirmations with included-period/variance summaries.
  - [ ] Verify accessible secure downloads and responsive essentials.
- [ ] Task: Run S5 integrity and independent acceptance review.
  - [ ] Run all tests/coverage/concurrency/migrations/type/lint/build/failure/graph/generate/doctor gates.
  - [ ] Independently recompute controls and verify every manifest hash/reference.
  - [ ] Resolve all Critical/High findings before production lock.
- [ ] Task: Measure - User Manual Verification 'Phase S5: Close and export month' (Protocol in workflow.md)

## Phase S6: Pilot and cut over
_Story ref: spec.md#story-s6_

- [ ] Task: Prepare privacy-safe rollout controls.
  - [ ] Configure least-privilege secrets, DB roles, private storage, retention, backups, scans, workers, alerts, and source credentials.
  - [ ] Prepare restore, outage, dead-letter, correction, access-revocation, and redelivery runbooks.
  - [ ] Define cutover/rollback owners, calendar, communication, and no-go thresholds.
- [ ] Task: Execute role, security, and privacy acceptance.
  - [ ] Verify owner/operator/reviewer/ordinary/unrelated/suspended/revoked behavior.
  - [ ] Test IDOR, source/object guessing, URL expiry, cross-school refs, malicious files, replay, audit, and logs.
  - [ ] Obtain independent security review with no Critical/High findings.
- [ ] Task: Run complete current-month parallel close.
  - [ ] Process real AP, reimbursements, payroll summary, school AR, and finalized Tutor export through production-like adapters.
  - [ ] Compare every register/control/pack line with current preparation.
  - [ ] Record variances, corrections, effort, timing, and accountant disposition.
- [ ] Task: Reproduce the accepted historical pilot.
  - [ ] Regenerate archive, normalized batch, reconciliation, snapshot, and pack from pinned versions.
  - [ ] Verify hashes/counts/totals/exceptions/source links.
  - [ ] Prove later mapping/rule changes cannot mutate history.
- [ ] Task: Drill reliability, retry, and rollback.
  - [ ] Exercise source/storage/worker outages, duplicates, conflicts, partial upload, parser failure, lock race, dead-letter, and restore.
  - [ ] Verify no duplicate money facts, document numbers, revisions, rows, or packs.
  - [ ] Rehearse rollback without deleting accepted evidence.
- [ ] Task: Obtain accountant/product-owner launch acceptance.
  - [ ] Capture accepted pack version, controls, evidence gaps, tax ownership, calendar, and escalation.
  - [ ] Require no-go for material variance, non-final source, security defect, or unapproved tax classification.
  - [ ] Record attributed acceptance/cutover authorization.
- [ ] Task: Cut over and observe first close.
  - [ ] Make superseded preparation read-only with source access/rollback instructions.
  - [ ] Complete first production close with named acknowledgements and monitoring.
  - [ ] File bounded follow-up tracks instead of expanding cutover scope.
- [ ] Task: Measure - User Manual Verification 'Phase S6: Pilot and cut over' (Protocol in workflow.md)

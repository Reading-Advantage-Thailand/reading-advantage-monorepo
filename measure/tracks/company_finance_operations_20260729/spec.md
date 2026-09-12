# Company Finance Operations and Accounting Handoff

## Overview

Give the company one controlled Finance Operations web app for accounts payable,
employee reimbursements, imported payroll summaries, school-customer billing,
Tutor Advantage financial reconciliation, two years of historical accounting
reports, and a reproducible monthly handoff to the Thai accountant.

The app is an operational subledger and evidence workspace. It is not the
statutory general ledger, a tax-advice engine, an automated Thai Revenue
Department filing client, a bank-payment initiator, or a second Tutor Advantage
settlement system. The accountant's accepted books and filings remain
authoritative for statutory accounting.

Finance Operations is delivered at `apps/accounting` and uses the exact internal
application key `finance-operations`, the Backend Capability Kernel, and a dedicated PostgreSQL
finance boundary, private S3-compatible object storage, and durable jobs for
imports, scheduled invoice drafting, document processing, and accountant-pack
generation. Its tenancy policy is the company's reviewed single-company
`global` scope. School/customer identifiers are business references, not
authorization tenants.

## Discovery Evidence and Assumptions

This specification distinguishes inspected behavior from proposed integration:

- The Small-Company Operations program currently excludes billing, invoices,
  payments, tax, accounting, and commission execution. Finance Operations is a
  separate successor boundary that consumes accepted CRM identifiers and
  activates the previously documented future-money seam.
- The shared backend includes handler-free capability descriptors with Zod
  input/output, authorization, tenancy, audit, idempotency, transaction, and
  observability policies. Durable-job contracts exist but their worker track is
  not yet fully accepted.
- `@reading-advantage/storage` provides provider-neutral `put`, signed URL,
  delete, and existence operations. Finance additionally needs an accepted
  private-object read/stream capability; provider SDK use in the app or backend
  module is forbidden.
- Company Identity supports application-scoped role keys, but Finance is not
  registered and the legacy shared `ROLES` enumeration has no finance roles.
  Finance roles remain application-scoped, outside the student role hierarchy.
- Tutor Advantage uses Omise for checkout and transfers, not Stripe. Its
  inspected finance service owns payment intents/events/receipts,
  payment-to-enrollment reconciliation, `DRAFT -> SUBMITTED -> APPROVED` or
  `REJECTED` settlement flow, production maker-checker approval, adjustments,
  payout lines, transfer state, payout documents, Tutor sales CSV, settlement
  CSV, and 50 Tawi document data.
- Tutor's current human CSV exports are not an immutable, versioned
  machine-to-machine accounting contract. Its checked OpenAPI also omits
  several implemented settlement, transfer, export, and operations routes.
  `TutorFinancialExportPort` is a required new producer contract, not an
  already implemented feature.
- Tutor currently calculates fixed three-percent WHT for every positive
  settlement payout. Its runbook instead describes a 1,000 THB threshold. The
  runbook says Finance distributes payouts externally, while current code
  automatically creates Omise transfers when configured. These are explicit
  source-system compliance/documentation conflicts. Finance imports the
  applied facts and source rule identifier; it does not bless, infer, or
  recalculate them.
- No accounting-grade historical import convention was found in Tutor. The new
  import model preserves source files and mappings independently.
- Exact prior report formats, VAT registration posture, invoice/tax-invoice
  requirements, withholding classifications, filing forms, close calendar,
  category mapping, retention, and handoff template remain discovery inputs.
  The owner and Thai accountant resolve them in S0 without weakening the
  boundary defined here.

## Product and Boundary Decisions

### Users and permissions

- `FINANCE_ADMIN` configures policy, manages authorized users, locks periods,
  and releases packs. `COMPANY_ADMIN` derives this exact role through Company
  Identity's reviewed owner-role map.
- `FINANCE_OPERATOR` manages payees, records/imports operational facts,
  resolves import exceptions, prepares invoices, records payment evidence, and
  prepares periods.
- `FINANCE_REVIEWER` reviews issued/paid/corrected facts, approves close, and
  releases packs. Maker and reviewer actions are recorded separately even when
  a small-company owner is the only qualified person available.
- Payroll-detail, tax-identity, bank-evidence, and full-document access use
  narrower named permissions than ordinary finance-list access.
- The accountant receives a versioned pack in MVP; an accountant login is a
  future decision. Marketing, Sales, Operations, Tutor, teacher, and school
  roles grant no Finance access implicitly.

### Financial representation

- Money is stored as integer minor units with ISO 4217 currency. Thai baht uses
  satang; persisted floating-point money is forbidden.
- Records distinguish net, VAT, gross, withholding, paid, and outstanding
  amounts. Values are not re-derived after a record becomes immutable.
- Tax treatment references an accountant-controlled, effective-dated
  classification/rule version. Applied rule, basis/rate, rounding result,
  actor/source, and evidence are snapshotted at issuance or payment.
- Support both company-withheld tax on payables and incoming withholding-credit
  evidence from school customers. Do not infer applicability from labels such
  as "contractor."
- Original documents are private immutable objects with content hash, MIME
  type, byte count, source, uploader/import batch, retention class, and scan
  state. Short-lived signed access is authorized and audited.
- External identifiers are namespaced by source; mutable display names are not
  identity keys.

### Source ownership

| Source/system | Authoritative ownership | Finance Operations responsibility |
|---|---|---|
| Company Identity / Accounts | Employee identity, sessions, company role, application roles | Consume stable employee IDs and exact finance roles; store no credentials or session data |
| Company Operations CRM | Customer organizations, contacts, school sites, subscriptions, provisioning links, sales attribution | Consume versioned customer/subscription facts; own billing profiles, monetary terms/schedules, invoices, receipts, credit notes, allocations, and receivable status |
| Product applications | Students, teachers, classrooms, progress, product-local licenses | Store approved commercial references only; never query product databases directly |
| Tutor Advantage | Omise payment lifecycle, B2C enrollment, tutor network, commission calculation, settlement approval, adjustments, payout/transfer state, payout/50 Tawi documents, operational reconciliation | Import immutable finalized facts through `TutorFinancialExportPort`, reconcile controls, archive evidence, and include them in the company pack without recalculation |
| Finance Operations | Payees, expenses, reimbursements, payroll-summary imports, school billing, historical batches, finance policy snapshots, close, accountant packs | Provide company-wide operational finance truth and a reproducible handoff without claiming to be the statutory ledger |
| Thai accountant system | Accepted books, chart of accounts, statutory adjustments, filings, tax interpretation | Receive versioned packs; record acknowledgement and correction references |
| Payment/bank providers | Provider-side payment/settlement facts | Consume only through approved provider-neutral evidence/export adapters; never initiate bank payment in MVP |

### Cross-system transport

- Cross-database joins, shared database credentials, and source-database reads
  are forbidden.
- `CustomerBillingCatalogPort` returns versioned, validated customer, site,
  subscription, sales-attribution, and provisioning references. Finance
  snapshots the accepted source version on each billing record.
- `TutorFinancialExportPort` is versioned, authenticated, validated, immutable,
  and idempotent. An export envelope carries source schema/environment, period
  and Asia/Bangkok window, export/revision identity, finalized timestamps,
  settlement ID/status, Omise payment/transfer controls, successful payments,
  refunds/reversals, receipt/VAT totals, approved adjustments,
  commission/bonus expense, applied WHT facts and source rule ID, net payouts,
  document references, exception/count controls, supersession link, and payload
  checksum.
- Only finalized source facts are close-eligible. Changed exports create linked
  revisions and never overwrite imported payloads.
- Ingestion stores the envelope/checksum, reconciles details to controls, and
  rejects duplicate semantic identities with conflicting checksums.
- Human CSVs may be archived as evidence but do not replace the port.

## Stories

### Story S0: Ratify finance contracts
**As a** company owner and finance reviewer
**I want** an accountant-reviewed operating model, access policy, and source contract
**So that** implementation does not encode guessed tax or ownership rules

**Acceptance Criteria:**
- Given owner/accountant discovery, When accepted, Then report templates, tax classifications, VAT posture, document rules, close calendar, retention, categories, correction policy, and approvers are recorded.
- Given a tax rule, When configured, Then it is effective-dated, versioned, accountant-attributed, tested against examples, and never silently retroactive.
- Given `finance-operations`, When Company Identity issues a principal, Then exact app roles/permissions are present and unrelated roles confer no access.
- Given finance capabilities, When tenancy resolves, Then they use reviewed `global` scope and reject frontend school/company tenant authority.
- Given an integration, When reviewed, Then ownership, schema version, auth, idempotency, correction, retention, and failure behavior are explicit.
- Given Tutor's WHT/runbook conflicts, When S0 is accepted, Then an owner/accountant disposition and Tutor remediation owner are recorded without Finance recalculating history.

**Estimate:** L
**Priority:** Must

### Story S1: Operate payables and reimbursements
**As a** finance operator
**I want** supplier expenses, payroll summaries, contractor payments, and reimbursements controlled in one workflow
**So that** every outgoing amount has approval, tax treatment, payment evidence, and source documentation

**Acceptance Criteria:**
- Given a payee, When created/changed, Then legal/display identity, tax ID, entity type, VAT status, payment-detail reference, classification history, and duplicate evidence are controlled and audited.
- Given a bill/expense, When submitted, Then supplier, dates, currency, net/VAT/gross, category, evidence, due date, tax classification, purpose, and provenance validate.
- Given a reimbursement, When submitted, Then claimant, lines, receipts, purpose, approval, reimbursable amount, and payment evidence remain linked without treating claimant identity as tax classification.
- Given an approved payroll run, When imported, Then only the approved summary and minimum employee references are stored; no salary, benefit, social-security, or payroll-tax calculation occurs.
- Given a payable payment, When recorded, Then date/method/reference, gross basis, applied WHT rule/version, WHT, net paid, evidence, and actor become immutable facts.
- Given duplicate document/invoice/import/payment identity, When entered, Then deterministic warnings/idempotency prevent silent double payment while permitting an authorized documented exception.
- Given paid/exported/locked data, When corrected, Then a linked reversal/adjustment is created; the original is not edited or deleted.

**Estimate:** XL
**Priority:** Must

### Story S2: Bill school customers
**As a** finance operator
**I want** school billing schedules, invoices, receipts, credit notes, and payment allocation
**So that** receivables agree with approved commercial and licensing facts

**Acceptance Criteria:**
- Given an accepted CRM version, When a billing profile/agreement is created, Then customer, tax address, school sites, terms, currency, lines, cadence, dates, and source version are snapshotted.
- Given an approved schedule, When due, Then a durable idempotent job creates one draft invoice without provider-specific business logic.
- Given a draft, When issued, Then number, customer snapshot, lines, net/VAT/gross, due date, tax treatment, and subscription link become immutable.
- Given post-issue correction, When approved, Then a credit/replacement document links to the preserved original.
- Given customer payment evidence, When recorded, Then partial/multi-invoice allocation is transactional and overpayment/outstanding balances are explicit.
- Given customer-withheld tax, When evidence is recorded, Then certificate/reference, amount, allocation, and approved classification are retained as a receivable tax-credit fact.
- Given license status changes, When Finance displays them, Then they are read-only context; invoice status never grants/revokes product entitlement.

**Estimate:** XL
**Priority:** Must

### Story S3: Reconcile Tutor Advantage
**As a** finance reviewer
**I want** finalized Tutor financial facts imported and reconciled without duplicating its workflows
**So that** Tutor B2C activity appears once in the company pack

**Acceptance Criteria:**
- Given Tutor payment, enrollment, network, commission, adjustment, settlement, payout, transfer, or document operations, When Finance is used, Then those operations remain unavailable and Tutor stays authoritative.
- Given a finalized export, When imported, Then schema, auth, environment, period, revision, checksum, status, and controls validate before projection.
- Given identical export/checksum, When repeated, Then ingestion replays safely; conflicting content fails closed and creates an exception.
- Given source details, When reconciled, Then payments, refunds, VAT/receipts, adjustments, commissions/bonuses, WHT, payouts, and transfer states equal source controls.
- Given source-applied WHT, When imported, Then Finance records exact amount/rule ID as an external fact and never recalculates or labels it compliant.
- Given non-final settlement or unresolved material source facts, When close runs, Then they are blocking exceptions.
- Given a superseding export, When accepted, Then the earlier revision remains immutable and locked-period impact requires an open-period Finance correction.

**Estimate:** L
**Priority:** Must

### Story S4: Import historical reports
**As a** finance operator
**I want** approximately two years of reports imported in controlled batches
**So that** historical evidence is searchable and future reports have auditable opening context

**Acceptance Criteria:**
- Given original XLSX/CSV/PDF/image/bank export/evidence folders, When uploaded, Then exact private objects are hashed and linked to period/source/batch before parsing.
- Given a source format, When mapped, Then a versioned mapping defines columns, locale/date/number rules, categories, tax fields, keys, rounding, and unsupported behavior.
- Given dry-run, When complete, Then counts, net/VAT/gross/WHT/payment/category controls, duplicates, unsupported rows, missing documents, and exceptions are reported without posting.
- Given the pilot month, When compared with the accountant's accepted report, Then agreed controls and samples reconcile before bulk import.
- Given ambiguity/invalid data, When imported, Then raw lineage and an exception remain; no row is silently guessed, discarded, or normalized by unreviewed AI.
- Given an accepted batch, When replayed, Then idempotency prevents duplicates and mapping/source hashes plus raw-to-normalized lineage remain frozen.
- Given historical correction, When requested, Then the batch remains immutable and a linked correction records requester, reason, and open period effect.

**Estimate:** XL
**Priority:** Must

### Story S5: Close and export month
**As a** finance reviewer
**I want** a reconciled, locked, reproducible monthly accountant pack
**So that** the Thai accountant receives complete details and evidence on time

**Acceptance Criteria:**
- Given an open period, When readiness runs, Then missing evidence, unapproved items, unallocated payments, invoice issues, import exceptions, and non-final Tutor facts are classified as blocking or approved non-blocking exceptions.
- Given a prepared period, When reviewed, Then AP, reimbursements, payroll, AR/documents, incoming/outgoing WHT, applicable VAT, Tutor controls, payments, balances, and corrections reconcile deterministically.
- Given reviewer approval, When locked, Then included records cannot be edited, deleted, reclassified, or replaced.
- Given locked-period error, When corrected, Then a linked adjustment/reversal posts in an open period and both periods expose lineage.
- Given pack generation, When the durable job succeeds, Then it creates versioned CSV/XLSX, human summary, registers, evidence/exception indexes, manifest/checksums, and provenance.
- Given same locked state/format, When regenerated, Then logical content and manifest checksums are deterministic.
- Given accountant delivery, When downloaded, acknowledged, superseded, or rejected, Then actor/time/version/evidence/status are audited without permanent public URLs.

**Estimate:** XL
**Priority:** Must

### Story S6: Pilot and cut over
**As a** company owner
**I want** a parallel-run pilot accepted by the accountant before cutover
**So that** the app replaces manual preparation without corrupting history

**Acceptance Criteria:**
- Given representative current data, When run in parallel, Then AP, reimbursements, payroll, school billing, Tutor, tax controls, and pack totals compare line by line.
- Given a historical pilot, When regenerated, Then source archive, normalized totals, exceptions, and accepted report reconcile under the signed mapping version.
- Given sensitive data, When security acceptance runs, Then unauthorized role, unrelated role, object guessing, cross-school reference, replay, and redaction tests fail closed.
- Given job/source outages, When retry/dead-letter/recovery drills run, Then no duplicate facts/documents result.
- Given owner/accountant acceptance, When cutover occurs, Then the old preparation path becomes read-only, rollback is documented, and first close has named operators/deadlines.
- Given unresolved legal/tax classification or material variance, When launch is evaluated, Then the decision is no-go.

**Estimate:** L
**Priority:** Must

## Non-Functional Requirements

- All commands, queries, jobs, envelopes, imports, and exports use strict Zod
  contracts and validated outputs through the Backend Capability Kernel.
- Business rules live in `packages/backend/src/modules/finance`; UI, routes,
  workers, storage, parsers, and source adapters are thin transports.
- Finance tables are explicit single-company global data, never school-tenant
  tables. Cross-system IDs are logical references without cross-DB FKs.
- PostgreSQL constraints/transactions enforce numbering, idempotency, balanced
  allocations, immutable issued/paid/locked facts, batch identity, and revision
  lineage.
- Every mutation defines auth, named authorization, transaction, idempotency,
  safe errors, immutable audit, and observability.
- Financial objects are private, encrypted by provider, short-lived-access only,
  and absent from logs/analytics. Logs exclude bank, tax ID, payroll detail,
  document content, PII, raw provider payloads, and signed URLs.
- Imports, exports, document processing, scheduled billing, and large
  reconciliations use accepted durable jobs with bounded retries, idempotency,
  dead-letter handling, and safe operator failures.
- Unit, permission, adapter-contract, golden-fixture, real PostgreSQL,
  concurrency, security, and browser tests cover success/failure. New backend
  code targets greater than 80 percent meaningful coverage.
- Desktop finance/accountant workflow is primary; essential upload, review,
  approval, and exception work remains accessible on mobile.
- Report/export versions are explicit and backward compatible through the
  historical import and accountant transition.

## Dependencies and Sequencing

- Backend Capability Kernel acceptance precedes capability implementation.
- Durable Job Worker Phase 4 acceptance precedes production import/export,
  scheduled billing, and document jobs.
- Company Identity must register `finance-operations` and its exact roles;
  roles remain outside the legacy shared student hierarchy.
- Storage needs accepted private read/stream, private upload, checksum, correct
  read-only signed URL, and provider-neutral error semantics.
- B2B billing depends on accepted stable customer/site/subscription/attribution
  contracts from `customer_licensing_crm_20260722`. Finance owns money and
  documents; CRM/product licensing retain customer/access state.
- Tutor reconciliation depends on a separately accepted Tutor-side producer for
  `TutorFinancialExportPort`; direct DB access/current CSV inference is banned.
- S0 accountant/owner decisions gate tax behavior and final pack layout but do
  not block contract scaffolding that represents unknowns explicitly.
- Rebuild the canonical repository graph before exported implementation edits;
  `build-graph` was unavailable during planning.

## Track-Level Acceptance Criteria

- Authorized Finance users manage company AP, reimbursements, payroll summaries,
  and school AR with immutable evidence/corrections.
- Customer and Tutor facts arrive only through accepted versioned ports; no
  source workflow or database is duplicated.
- Two years of reports import idempotently with raw lineage, exceptions, and
  accountant-approved controls.
- A month cannot lock while material reconciliation gates fail.
- Locked periods produce reproducible packs and allow only linked open-period
  corrections.
- WHT/VAT facts trace to reviewed rule/source versions; guessed/hard-coded tax
  treatment is never represented as authoritative.
- Cutover requires parallel-run, security, recovery, owner, and accountant
  acceptance evidence.

## Explicit Non-Goals

- General ledger, trial balance, revenue recognition, statutory bookkeeping,
  or replacement of the accountant system.
- Automated Revenue filing, legal/tax advice, or automatic acceptance of any
  withholding rate/threshold.
- Bank aggregation/reconciliation, treasury, payment initiation, card charging,
  cash forecasting, or autonomous collections.
- Payroll/social-security/benefit/salary/tax calculation.
- Tutor checkout, enrollment, network, commission, settlement approval,
  adjustment approval, payout/transfer, receipt, or 50 Tawi generation.
- Direct reads/joins against Tutor, CRM, product, identity, bank, provider, or
  accountant databases.
- Permanent public financial-document URLs.
- OCR/AI auto-posting or unreviewed tax/category inference.
- Multi-company/legal-entity accounting, inventory, purchase orders, budgeting,
  or enterprise separation of duties in MVP.
- Accountant/customer portals, automated dunning, recurring card collection,
  or e-invoice/e-tax integration before a separately accepted follow-up.

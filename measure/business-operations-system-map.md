# Business Operations System Map

**Status:** Planning baseline — implementation requires the owning Measure track's acceptance.

## Purpose

This record resolves business-system ownership before the company operations,
Finance Operations, Workbooks, and Tutor Advantage integrations are finalized.
It is an architectural decision record, not a new product track and not an
authorization to bypass a source system's contract.

## Operating Rules

- Each business fact has one authoritative owner. Consumers retain a versioned
  snapshot or projection, never a second mutable source of truth.
- Cross-system data moves only through authenticated, versioned, validated,
  idempotent ports. Cross-database joins, shared credentials, and direct reads
  of another system's database are forbidden.
- Company-wide internal operations use a reviewed global company scope. School,
  classroom, teacher, and student records remain in product systems.
- Finance Operations is an operational subledger and evidence workspace. The
  Thai accountant's accepted books and statutory filings remain authoritative.
- Internal training apps own learning progress and assessment evidence only;
  they do not become CRM, billing, payment, or settlement systems.

## Authoritative System Ownership

| System | Owns | Does not own | Required consumers / transport |
|---|---|---|---|
| Accounts / Company Admin | Employee identity, sessions, suspension, app-scoped roles, owner access | Customer, school, invoice, Tutor network, curriculum, statutory books | Exact audience/role claims for internal apps; no copied credentials or role inference |
| Sales Advantage | Salesperson/distributor-rep training, audio-roleplay evidence, coaching progress, rep/admin training views | Leads, customers, attribution, invoices, payments, commissions, Tutor settlement | Company identity access only; future aggregate training signals require consent and cannot create commercial records |
| CodeCamp Advantage | Intern training, code evidence, PR-review learning evidence | Employee HR, customer CRM, invoices, payments | Company identity access only |
| Company Operations CRM | Leads, customer organizations, contacts, school sites, ownership/attribution, demos, trials, subscriptions, provisioning references | Invoices, receipts, allocation, tax, statutory books, Tutor commissions | `CustomerBillingCatalogPort` for Finance; product provisioning ports retain product-local enforcement |
| www-reading-advantage | Public marketing, qualified lead capture, public consent and attribution | CRM source data, finance records, payment or customer administration | Validated lead-intake port into CRM; no local retry queue or financial records |
| Finance Operations (`apps/accounting`) | Payees, expenses, reimbursements, payroll-summary imports, school billing, invoices, receipts, credit notes, allocations, historical batches, close and accountant packs | Tutor checkout/network/commission/payout operations, product entitlements, statutory general ledger or tax advice | Consumes Company Identity, CRM, and Tutor contracts; publishes an accountant pack, not a second statutory ledger |
| Tutor Advantage (`../tutor-advantage`) | Omise checkout/payment events, B2C enrollment, tutor network, commissions, settlement approval, adjustments, transfers, payout/50 Tawi documents, operational reconciliation | Company AP, reimbursements, school B2B receivables, accountant's statutory books | Produces `TutorFinancialExportPort` after acceptance; Finance never reads Tutor's database |
| Workbooks (`apps/workbooks`, planned) | Workbook drafts/editions, publishing approval, immutable render artifacts, workbook-only apparatus | Canonical Reading/Primary source content, student progress, school tenant data | Product-specific content catalog and promotion ports; no direct Reading/Primary database access |
| Learning products | Product-local students, teachers, classrooms, progress, content, local license enforcement | Company employee identity, finance close, workbook publishing releases | Consume approved commercial or workbook references through their own ports |
| Thai accountant system | Accepted books, chart of accounts, tax interpretation, statutory adjustments and filings | Operational product behavior | Receives versioned Finance packs and records acknowledgement/correction references |

## Required Changes Before System Finalization

| ID | Required change | Owner / destination | Acceptance condition |
|---|---|---|---|
| R1 | Keep Sales Advantage classified as an internal enablement app in product, SSO, and operations documentation. It must not be described as the CRM or a sales-settlement owner. | Product / Company Identity / Sales tracks | Sales access uses app roles; its commercial boundaries are documented and verified in reviews. |
| R2 | Publish and accept the Company Admin role-to-application map, including Finance and Workbooks roles, inherited `COMPANY_ADMIN` behavior, ordinary-employee denial, revocation, and audit evidence. | `small_company_admin_privileges_20260722` and Company Identity | The graph-baseline/independent-review defects are resolved and the access matrix is accepted before new internal-app production access. |
| R3 | Define and accept `CustomerBillingCatalogPort` with versioned customer, site, subscription, provisioning, and sales-attribution facts. | `customer_licensing_crm_20260722` | Finance snapshots accepted commercial references without direct CRM/product database reads. |
| R4 | Define and accept `TutorFinancialExportPort` as a Tutor-produced immutable, authenticated, versioned export. | Dedicated Tutor-owned track in `../tutor-advantage` | Finance imports finalized exports with controls, evidence references, revision/supersession identity, and idempotency. |
| R5 | Resolve Tutor source conflicts before Finance relies on its export: OpenAPI versus implemented routes, fixed 3% WHT versus runbook threshold, and external payout distribution versus configured automatic Omise transfers. | Tutor owner with Thai accountant/legal review | A dated disposition, source remediation owner, and historical-data treatment are recorded. Finance imports applied facts and never calculates or blesses the disputed policy. |
| R6 | Add accepted private-object read/stream capability to shared storage and use durable jobs for imports, rendering, document processing, and pack generation. | Storage hardening / durable worker owners | Authorized private read works through the adapter; no provider-SDK bypass or request-path long-running work remains. |
| R7 | Obtain S0 accountant/owner acceptance for finance classifications, VAT posture, invoice/tax-invoice data, withholding rules, close calendar, retention, correction policy, and pack layout. | `company_finance_operations_20260729` | Finance represents explicit policy versions and unknowns; it does not encode guessed Thai tax rules. |
| R8 | Define and accept Reading/Primary `ContentCatalogPort` and source-owned promotion contracts for Workbooks. | `workbook_content_versioning_20260711` | Workbooks publishes immutable editions without duplicating or directly mutating canonical curriculum. |

## Recommended Changes

| ID | Recommendation | Why it matters |
|---|---|---|
| P1 | Maintain a contract registry linking each accepted port to its owner, schema version, fixtures, consumer, test suite, compatibility policy, and deprecation date. | Prevents prose-only integrations from drifting as systems grow. |
| P2 | Add a company-wide month-close calendar and exception dashboard once Finance is piloted. | Makes late documents, unreconciled Tutor exports, missing approvals, and accountant queries visible before lock. |
| P3 | Align Tutor public/parent-facing, facilitator-facing, and internal product descriptions after legal/product approval. | Current materials describe different product models. Parent copy may avoid MLM terminology, but internal contracts must remain precise. |
| P4 | Add aggregate, privacy-safe training-readiness projections from Sales Advantage and CodeCamp only after role/consent policy acceptance. | Learning evidence must not become a hidden employment or compensation decision. |
| P5 | Add accountant-pack acceptance and correction-reference reporting before granting any accountant login. | Pack exchange is a safer first boundary than third-party mutable operational access. |

## Sequencing

1. Resolve Company Admin graph/access acceptance and finish durable-worker and private-storage prerequisites.
2. In parallel, accept CRM billing, Tutor financial-export, and Reading/Primary content-catalog contracts; obtain accountant decisions for Finance.
3. Implement each source behind its accepted contract: CRM before B2B billing, Tutor producer before Finance reconciliation, source apps before Workbooks import.
4. Pilot Finance with one reconciled historical month and one Tutor export; pilot Workbooks with one Primary legacy import and one Reading catalog release.
5. Cut over only after evidence, rollback, correction, access-revocation, and owner/accountant acceptance gates pass.

## Finalization Gate

The systems are ready to be called finalized when every required change R1-R8
has an accepted owner-track receipt, no source ownership row is disputed, and
integration tests reject direct database access, invalid or stale contract
payloads, unauthorized internal access, duplicate/conflicting imports, and
post-close mutation. Recommendations P1-P5 may follow the respective MVPs,

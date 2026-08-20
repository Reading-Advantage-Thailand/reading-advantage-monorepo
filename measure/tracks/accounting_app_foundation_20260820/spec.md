# Accounting App Foundation

## Overview

**Sprint goal:** Stand up `apps/accounting` as the company's in-house finance
workspace: staff submit expenses and bills with evidence, the owner approves,
and accepted records post to a full double-entry ledger on a standard Thai SME
chart of accounts, with Thai statutory support (VAT, withholding tax, tax
invoices) built in, accessed through Accounts SSO.

This track builds the actual `apps/accounting` application on top of the
policy-neutral Finance Operations foundation delivered by
`company_finance_operations_20260810`. It deliberately expands the product
boundary beyond the original "operational subledger only" rule: the owner has
decided (2026-08-20) that the app will grow into the company's real
double-entry books as accounting moves in-house next year. Near term, the full
accounting side exists to support the expense/bill data-entry workflow.

SSO is provided by the existing `apps/accounts` OIDC identity provider
(`company_identity_sso_20260715`); the accounting app integrates as an OIDC
client through the internal auth adapter. No new identity system is created.

## Stories

### Story S1: Company SSO sign-in
**As a** company owner or staff member
**I want** to sign in to the accounting app through our Accounts SSO (OIDC)
**So that** only company people can touch the books, with one identity everywhere

**Acceptance Criteria:**
- Given a company account in `apps/accounts`, When I open the accounting app, Then I am redirected through OIDC Authorization Code + PKCE and signed in with my app-scoped role.
- Given roles `STAFF`, `OWNER`, `ACCOUNTANT` (plus the reviewed admin derivation per `small_company_admin_privileges_20260722`), When I lack an accounting role, Then I am denied access.

**Estimate:** M
**Priority:** Must

### Story S2: Expense & bill submission with evidence
**As a** staff member
**I want** to submit expenses and bills with receipt/invoice evidence
**So that** the company has complete, provable records without chasing paper

**Acceptance Criteria:**
- Given a submission with amount, 3-letter currency, payee, category, and receipt/invoice file, When I submit, Then it is stored as pending with evidence in private storage.
- Given a non-THB bill, When I submit, Then I must also provide the settled THB total from the bank/card settlement.

**Estimate:** L
**Priority:** Must

### Story S3: Settlement-derived THB valuation
**As an** owner
**I want** THB equivalents derived from the actual bank settlement
**So that** our books reflect what we really paid, not an abstract rate

**Acceptance Criteria:**
- Given a $20 bill settled at ฿692, When the record is accepted, Then the stored rate is 34.60 and the THB equivalent is ฿692.00, rounded 2dp half-up.
- Given any accepted bill, When viewed, Then the original amount and currency are preserved alongside — never replaced by — the THB equivalent.
- Given a conversion figure without bound settlement evidence, When submitted, Then it is rejected — a bare caller assertion is not authoritative.

**Estimate:** M
**Priority:** Must

### Story S4: Owner approval with immutable audit
**As an** owner
**I want** to approve or reject submissions with an immutable trail
**So that** the ledger only contains reviewed facts and every change is explainable

**Acceptance Criteria:**
- Given a pending submission, When I approve, Then the record becomes immutable and posts to the ledger; When I reject, Then it is closed with a reason.
- Given an accepted record needing correction, When a fix is needed, Then it happens via a reversing/correcting entry, never an edit.
- Given any state transition, When it occurs, Then an append-only audit event is written.

**Estimate:** M
**Priority:** Must

### Story S5: Double-entry ledger, Thai SME chart
**As an** owner
**I want** every approved record to post balanced double-entry journals on a standard Thai SME chart of accounts
**So that** we have real books ready for in-house accounting next year

**Acceptance Criteria:**
- Given the standard Thai SME chart template (cash, bank, AR, AP, input/output VAT, WHT payable, payroll, revenue, expense classes), When the app is initialized, Then the chart exists and is extensible.
- Given any journal entry, When posted, Then total debits equal total credits in exact decimal arithmetic — unbalanced entries are rejected.
- Given posted journals, When I view the trial balance, Then it balances.

**Estimate:** L
**Priority:** Must

### Story S6: VAT & tax invoices
**As an** owner
**I want** 7% VAT captured on purchases and tax invoices issued for school billing
**So that** input/output VAT is tracked for filing

**Acceptance Criteria:**
- Given a bill with VAT, When approved, Then input VAT posts to its own account with the tax invoice evidence bound.
- Given a school billing, When invoiced, Then a compliant tax invoice is generated and output VAT tracked.

**Estimate:** L
**Priority:** Should

### Story S7: Withholding tax
**As an** owner
**I want** WHT calculated and certificates generated on applicable payments
**So that** P.N.D. 1/3/53 obligations are tracked in-app

**Acceptance Criteria:**
- Given a WHT-applicable payment, When approved, Then the WHT amount posts separately and a certificate is generated.

**Estimate:** M
**Priority:** Should

### Story S8: Accountant export pack
**As an** accountant
**I want** a periodic export of journals and evidence references
**So that** the external accountant can review until accounting moves in-house

**Acceptance Criteria:**
- Given a closed period, When the export is generated, Then it contains the complete journal set and evidence references for that period, accessible only to OWNER/ACCOUNTANT.

**Estimate:** M
**Priority:** Could

## Non-Functional Requirements

- Build on the existing `finance-operations` backend module (records,
  controlled imports, THB valuation, audit) — extend it, don't re-implement.
- SSO via the existing `apps/accounts` OIDC IdP through the internal auth
  adapter; no app-local password store, no direct provider SDKs.
- Separate logical PostgreSQL database and Drizzle migration stream for
  accounting, following the company-identity pattern.
- Decimal arithmetic only for money; no binary floating point. Zod contracts
  at every external boundary; tests ship with all backend code.
- Next.js + TypeScript + Tailwind + shadcn/ui, matching the monorepo stack.
- Every new Drizzle table is classified in the tenant registry (company-scope);
  unclassified tables are a build failure.

## Acceptance Criteria (track-level)

1. A staff member can sign in via Accounts SSO, submit an expense with
   evidence, and see it pending.
2. The owner can approve the submission; an immutable, balanced double-entry
   journal is posted on the Thai SME chart, with the audit event recorded.
3. A non-THB bill carries its original amount/currency plus a
   settlement-derived THB equivalent at 2dp half-up.
4. VAT, WHT, and tax-invoice behavior (S6/S7) and the accountant export (S8)
   are implemented to their story priorities.
5. `pnpm turbo run test`, `check-types`, and `lint` pass for all new/changed
   packages; `measure/doctor.sh` shows no new findings attributable to this
   track.

## Out of Scope

- Live CRM/Tutor imports (owner-attested historical packets only, per the
  finance track).
- Payroll execution; statutory e-filing to the Revenue Department
  (reports/certificates only).
- Replacing the external accountant before next year.
- Customer accounts, licensing, entitlements, school-facing features.

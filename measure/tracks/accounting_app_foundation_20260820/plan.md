# Implementation plan

## Phase S1: Company SSO sign-in
_Story ref: spec.md#story-s1_

- [x] Task: Scaffold `apps/accounting` (Next.js + TS + Tailwind + shadcn/ui, matching monorepo conventions) and define the accounting role contract (`STAFF`, `OWNER`, `ACCOUNTANT` + reviewed admin derivation) in the internal auth adapter's app-role registry; register `apps/accounting` as an OIDC client of `apps/accounts`. 918e375
- [x] Task: Red tests — OIDC Authorization Code + PKCE round-trip against the Accounts IdP (mocked token endpoint), role denial for users without an accounting role, session via internal auth adapter only (no app-local password store). a9f448e
- [x] Task: Implement — sign-in flow via `apps/accounts` OIDC, `proxy.ts` route guard (Next.js 16 nodejs runtime — per lessons-learned), declare any native auth deps in the app's own `package.json` (argon2/Turbopack gotcha). 09e980a
- [x] Task: Generate docs & doctor — `measure/generate.sh`, `measure/doctor.sh`. b9b9bbc
- [x] Task: Measure - User Manual Verification 'Phase S1: Company SSO sign-in' (Protocol in workflow.md) — owner-verified live 2026-08-20: full OIDC round-trip in a real browser (found and fixed the `__Host-` cookie `Secure` bug, `9684d16`); session endpoint returns the owner identity with role OWNER.

## Phase S2: Expense & bill submission with evidence
_Story ref: spec.md#story-s2_

- [b] Task: Contracts & schema — Zod contracts for expense/bill submissions (amount, 3-letter currency, payee, category, evidence ref, settled-THB total required for non-THB); Drizzle tables in the new accounting database stream; classify new tables in the tenant registry (company-scope) — unclassified tables are a build failure. (deferred:accounting_app_foundation_20260820-phase-s1-acceptance)
- [b] Task: Red tests — submission validation (missing evidence, bad currency, non-THB without settled total), authorization (STAFF can submit, cannot approve), evidence stored in private storage via the storage adapter only. (deferred:accounting_app_foundation_20260820-phase-s1-acceptance)
- [b] Task: Implement — submission domain functions extending `finance-operations` records, private-storage evidence upload, submission UI (staff). (deferred:accounting_app_foundation_20260820-phase-s1-acceptance)
- [b] Task: Generate docs & doctor — `measure/generate.sh`, `measure/doctor.sh`. (deferred:accounting_app_foundation_20260820-phase-s1-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S2: Expense & bill submission with evidence' (Protocol in workflow.md) (deferred:owner-manual-verification)

## Phase S3: Settlement-derived THB valuation
_Story ref: spec.md#story-s3_

- [b] Task: Contracts — extend the finance-operations THB valuation contracts with the owner-decided policy (2026-08-20): rate = settled THB ÷ source amount (derived, evidence-bound), 2dp half-up, no rate-date; settlement figure bound to bank/settlement evidence. (deferred:accounting_app_foundation_20260820-phase-s2-acceptance)
- [b] Task: Red tests — $20/฿692 → rate 34.60 & THB ฿692.00; rounding half-up at 2dp; original amount/currency preserved; bare caller-asserted conversion without settlement evidence rejected. (deferred:accounting_app_foundation_20260820-phase-s2-acceptance)
- [b] Task: Implement — wire policy into the existing `thb-valuation` preparer; expose derived rate + THB equivalent on accepted records. (deferred:accounting_app_foundation_20260820-phase-s2-acceptance)
- [b] Task: Generate docs & doctor — `measure/generate.sh`, `measure/doctor.sh`. (deferred:accounting_app_foundation_20260820-phase-s2-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S3: Settlement-derived THB valuation' (Protocol in workflow.md) (deferred:owner-manual-verification)

## Phase S4: Owner approval with immutable audit
_Story ref: spec.md#story-s4_

- [b] Task: Contracts & schema — approve/reject commands with reason, state machine (pending → approved/rejected), correction-by-reversing-entry contract; append-only audit table with DB-level `REVOKE UPDATE, DELETE` (per lessons-learned). (deferred:accounting_app_foundation_20260820-phase-s3-acceptance)
- [b] Task: Red tests — only OWNER can approve; approved records reject mutation; corrections create reversing entries; every transition writes an audit event. (deferred:accounting_app_foundation_20260820-phase-s3-acceptance)
- [b] Task: Implement — approval domain functions + owner review UI. (deferred:accounting_app_foundation_20260820-phase-s3-acceptance)
- [b] Task: Generate docs & doctor — `measure/generate.sh`, `measure/doctor.sh`. (deferred:accounting_app_foundation_20260820-phase-s3-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S4: Owner approval with immutable audit' (Protocol in workflow.md) (deferred:owner-manual-verification)

## Phase S5: Double-entry ledger, Thai SME chart
_Story ref: spec.md#story-s5_

- [b] Task: Contracts & schema — chart-of-accounts, journal entries, journal lines; standard Thai SME chart seed (cash, bank, AR, AP, input/output VAT, WHT payable, payroll, revenue, expense classes); balanced-entry invariant in Zod + DB constraint; decimal money columns only. (deferred:accounting_app_foundation_20260820-phase-s4-acceptance)
- [b] Task: Red tests — unbalanced journals rejected at contract and DB level; approval (S4) posts a balanced journal; trial balance report balances; real-DB migration smoke test (mock-DB blind spot lesson). (deferred:accounting_app_foundation_20260820-phase-s4-acceptance)
- [b] Task: Implement — posting engine in a new `accounting` backend module (uses finance-operations records as source facts), chart seed migration, journal + trial balance UI. (deferred:accounting_app_foundation_20260820-phase-s4-acceptance)
- [b] Task: Generate docs & doctor — `measure/generate.sh`, `measure/doctor.sh`. (deferred:accounting_app_foundation_20260820-phase-s4-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S5: Double-entry ledger, Thai SME chart' (Protocol in workflow.md) (deferred:owner-manual-verification)

## Phase S6: VAT & tax invoices
_Story ref: spec.md#story-s6_

- [b] Task: Contracts & schema — 7% VAT fields on bills, input/output VAT accounts (chart already seeded), tax-invoice document contract with sequential numbering. (deferred:accounting_app_foundation_20260820-phase-s5-acceptance)
- [b] Task: Red tests — VAT splits post to the correct accounts; tax invoice generation binds evidence and posts output VAT; VAT report totals reconcile with journals. (deferred:accounting_app_foundation_20260820-phase-s5-acceptance)
- [b] Task: Implement — VAT capture in submission/approval flow, tax-invoice generation for school billing, VAT report UI. (deferred:accounting_app_foundation_20260820-phase-s5-acceptance)
- [b] Task: Generate docs & doctor — `measure/generate.sh`, `measure/doctor.sh`. (deferred:accounting_app_foundation_20260820-phase-s5-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S6: VAT & tax invoices' (Protocol in workflow.md) (deferred:owner-manual-verification)

## Phase S7: Withholding tax
_Story ref: spec.md#story-s7_

- [b] Task: Contracts & schema — WHT rates per payment type (P.N.D. 1/3/53), WHT certificate contract, WHT payable posting. (deferred:accounting_app_foundation_20260820-phase-s6-acceptance)
- [b] Task: Red tests — WHT amount splits on approval; certificate generation; WHT report reconciles. (deferred:accounting_app_foundation_20260820-phase-s6-acceptance)
- [b] Task: Implement — WHT calculation in approval flow, certificate PDF, WHT report UI. (deferred:accounting_app_foundation_20260820-phase-s6-acceptance)
- [b] Task: Generate docs & doctor — `measure/generate.sh`, `measure/doctor.sh`. (deferred:accounting_app_foundation_20260820-phase-s6-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S7: Withholding tax' (Protocol in workflow.md) (deferred:owner-manual-verification)

## Phase S8: Accountant export pack
_Story ref: spec.md#story-s8_

- [b] Task: Contracts — periodic export pack (journals + evidence references) reusing the finance-operations accountant-pack boundary. (deferred:accounting_app_foundation_20260820-phase-s7-acceptance)
- [b] Task: Red tests — export completeness vs journal, immutability of exported periods, access limited to OWNER/ACCOUNTANT. (deferred:accounting_app_foundation_20260820-phase-s7-acceptance)
- [b] Task: Implement — export generation + download UI. (deferred:accounting_app_foundation_20260820-phase-s7-acceptance)
- [b] Task: Generate docs & doctor — `measure/generate.sh`, `measure/doctor.sh`. (deferred:accounting_app_foundation_20260820-phase-s7-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S8: Accountant export pack' (Protocol in workflow.md) (deferred:owner-manual-verification)

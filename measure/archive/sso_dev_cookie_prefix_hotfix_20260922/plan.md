# Plan

## Phase 1: Implement

- [x] Task 1: Add the shared cookie-name helper and apply the environment-conditional `__Host-` prefix in `apps/accounting` (FR-1, FR-2).
- [x] Task 2: Apply the same change in `apps/sales-advantage`, `apps/marketing`, and `apps/codecamp-advantage` (FR-1, FR-2).
- [x] Task 3: Update test doubles and add the per-app prefix tests; run all four app test suites (FR-3, AC-3, AC-4).

## Phase 2: Live verification

- [x] Task 4: Verify the dev cookie name via curl (AC-1) and complete a real-browser SSO sign-in on localhost for accounting (AC-2). Record the result in this plan. **VERIFIED 2026-09-22:** curl shows `ra_accounting_oidc_tx` without prefix; real-browser SSO sign-in completed (Accounts log: `POST /api/oidc/token` 200 + introspect 200; landed on `/`). Note: first render then failed with `ACCOUNTING_URL_INVALID` — local env lacked `ACCOUNTING_DATABASE_URL` and the `accounting` DB; created the DB, applied `packages/db/accounting/drizzle/0000_past_reavers.sql`, set the env var. Env-setup gap, not product code.

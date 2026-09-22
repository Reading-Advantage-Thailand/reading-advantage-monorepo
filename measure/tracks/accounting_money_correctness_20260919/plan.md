# Plan

## Phase 1: Money Correctness

- [x] (02273c228) Task: Add the currency exponent to `derivedRate` through `Intl.NumberFormat`. Source: `docs/accounting-ux-refactor-plan.md` §2.1; Issues: `app/lib/derived-rate.ts:19-25`, `packages/backend/src/modules/finance-operations/contracts.ts:6`
- [x] (02273c228) Task: Pass the currency at both `derivedRate` call sites. Source: `docs/accounting-ux-refactor-plan.md` §2.1; Issues: `app/api/submissions/export/route.ts:92,106`, `app/_components/pending-submissions-list.tsx:215-219`
- [x] (8aa186aed) Task: Format review list amounts as currency, not as minor units. Source: `docs/accounting-ux-refactor-plan.md` §2.4; Issues: `app/_components/pending-submissions-list.tsx:238,244`
- [x] (022bd294d) Task: Convert `submittedAt` to the business time zone in the export filter. Source: `docs/accounting-ux-refactor-plan.md` §2.3; Issues: `app/api/submissions/export/route.ts:78,107`, `packages/backend/src/modules/accounting/postgres-submission-repository.ts:57-58`
- [x] (022bd294d) Task: Replace the offset test fixture with a UTC fixture at the day boundary. Source: `docs/accounting-ux-refactor-plan.md` §2.3; Issues: `app/api/submissions/export/route.test.ts:100,232`
- [x] (b986e0595) Task: Add a major-unit preview under the submission form amount field. Source: `docs/accounting-ux-refactor-plan.md` §2.4; Issues: `app/_components/new-submission-form.tsx:356,378`


## Owner Manual Verification — PASSED 2026-09-22

Environment: local dev server (port 3010) with Docker Postgres `accounting` DB and a local S3 mock for evidence storage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence checklist: session S2 in the 2026-09-22 verification run (15 checks, all passed). Owner confirmed the THB/USD/JPY currency allowlist. One blocking defect was found and fixed during the session (sso_dev_cookie_prefix_hotfix_20260922: __Host- OIDC cookies rejected by browsers in plain-HTTP dev). Confirmed by explicit product-owner yes on 2026-09-22.

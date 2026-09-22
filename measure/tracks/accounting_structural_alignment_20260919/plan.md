# Plan

## Phase 1: Structural Alignment

- [x] (3ec38011b) Task: Add the `Origin` check to the three state-changing finance routes. Source: `docs/accounting-ux-refactor-plan.md` §3; Issues: `app/api/auth/logout/route.ts:39`, `app/api/submissions/route.ts:241`, `app/api/submissions/[id]/approve/route.ts:105`, `app/api/submissions/[id]/reject/route.ts:106`
- [x] (f6abbacf5) Task: Add the `Content-Security-Policy` and `Permissions-Policy` headers. Source: `docs/accounting-ux-refactor-plan.md` §7; Issues: `next.config.ts:31-50`, `apps/accounts/next.config.ts:22-26`
- [x] (4a75a8f7f) Task: Add an approved and rejected history view with a status filter. Source: `docs/accounting-ux-refactor-plan.md` §5; Issues: `app/_components/pending-submissions-list.tsx:75-79,272-273`
- [x] (febc6a0dc) Task: Restrict `currencySchema` to the settled currency list. Source: `docs/accounting-ux-refactor-plan.md` §2.1; Issues: `packages/backend/src/modules/finance-operations/contracts.ts:6`


## Owner Manual Verification — PASSED 2026-09-22

Environment: local dev server (port 3010) with Docker Postgres `accounting` DB and a local S3 mock for evidence storage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence checklist: session S2 in the 2026-09-22 verification run (15 checks, all passed). Owner confirmed the THB/USD/JPY currency allowlist. One blocking defect was found and fixed during the session (sso_dev_cookie_prefix_hotfix_20260922: __Host- OIDC cookies rejected by browsers in plain-HTTP dev). Confirmed by explicit product-owner yes on 2026-09-22.

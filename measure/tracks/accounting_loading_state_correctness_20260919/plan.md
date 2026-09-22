# Plan

## Phase 1: Loading State Correctness

- [x] (8b72d12) Task: Add `app/error.tsx`. Source: `docs/accounting-ux-refactor-plan.md` §5; Issues: `app/page.tsx:31`, `app/error.tsx`
- [x] (d899f29) Task: Filter to pending records on the server, not in the browser. Source: `docs/accounting-ux-refactor-plan.md` §5; Issues: `app/_components/pending-submissions-list.tsx:75-79`, `app/page.tsx:31`
- [x] (f130630) Task: Add `from` and `to` controls beside the export link. Source: `docs/accounting-ux-refactor-plan.md` §5; Issues: `app/_components/pending-submissions-list.tsx:184-189`, `app/api/submissions/export/route.ts:61-69`


## Owner Manual Verification — PASSED 2026-09-22

Environment: local dev server (port 3010) with Docker Postgres `accounting` DB and a local S3 mock for evidence storage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence checklist: session S2 in the 2026-09-22 verification run (15 checks, all passed). Owner confirmed the THB/USD/JPY currency allowlist. One blocking defect was found and fixed during the session (sso_dev_cookie_prefix_hotfix_20260922: __Host- OIDC cookies rejected by browsers in plain-HTTP dev). Confirmed by explicit product-owner yes on 2026-09-22.

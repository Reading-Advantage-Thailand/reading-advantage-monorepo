# Plan

## Phase 1: Duplication Removal

- [x] (8bbdd35) Task: Extract `app/lib/route-helpers.ts` and delete the five actor copies, four response copies, and duplicated error predicates. Source: `docs/accounting-ux-refactor-plan.md` §6; Issues: `app/page.tsx:18-22`, `app/api/submissions/route.ts:42-61`, `app/api/submissions/[id]/approve/route.ts:23-97`, `app/api/submissions/[id]/reject/route.ts:24-98`
- [x] (b470ef5) Task: Move the three loose library tests into `app/lib/__tests__/`. Source: `docs/accounting-ux-refactor-plan.md` §6; Issues: `app/lib/derived-rate.test.ts:1`, `app/lib/auth.test.ts:1`, `app/lib/submissions.test.ts:1`


## Owner Manual Verification — PASSED 2026-09-22

Environment: local dev server (port 3010) with Docker Postgres `accounting` DB and a local S3 mock for evidence storage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence checklist: session S2 in the 2026-09-22 verification run (15 checks, all passed). Owner confirmed the THB/USD/JPY currency allowlist. One blocking defect was found and fixed during the session (sso_dev_cookie_prefix_hotfix_20260922: __Host- OIDC cookies rejected by browsers in plain-HTTP dev). Confirmed by explicit product-owner yes on 2026-09-22.

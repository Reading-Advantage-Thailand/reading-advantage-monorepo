# Plan

## Phase 1: Broken UX Fixes

- [x] Task: Move `getAccountingCallbackOrigin()` inside the `try` block in the company start route. Source: `docs/accounting-ux-refactor-plan.md` §4.1; Issues: `app/api/auth/company/start/route.ts:41` — 8b2238172
- [x] Task: Accept an HTTP loopback origin in `configuredOrigin` outside production. Source: `docs/accounting-ux-refactor-plan.md` §4.1; Issues: `app/lib/public-url.ts:28-45,87-94`, `packages/auth/src/company-identity/environment.ts:145-160` — 2b3519e06
- [x] Task: Return an empty string from `derivedRate` for a non-positive source amount. Source: `docs/accounting-ux-refactor-plan.md` §2.2; Issues: `app/lib/derived-rate.ts:13-18`, `packages/backend/src/modules/finance-operations/contracts.ts:5` — 5405aeae5
- [x] Task: Call `router.refresh()` after an approval and after a rejection. Source: `docs/accounting-ux-refactor-plan.md` §5; Issues: `app/_components/pending-submissions-list.tsx:110-123` — 4e35807c4
- [x] Task: Clear `idempotencyKeyRef` in the 409 branch of the submission form. Source: `docs/accounting-ux-refactor-plan.md` §5; Issues: `app/_components/new-submission-form.tsx:234-240` — 60f36deac
- [x] Task: Use `buildSignInHref` in the login page. Source: `docs/accounting-ux-refactor-plan.md` §4.2; Issues: `app/lib/sign-in-href.ts`, `app/login/page.tsx:16-18` — 7cff32fbb
- [x] Task: Export `DEFAULT_ACCOUNTING_ORIGIN` and import it in `proxy.ts`. Source: `docs/accounting-ux-refactor-plan.md` §4.2; Issues: `app/lib/public-url.ts:1`, `proxy.ts:38` — 925852b69
- [x] Task: Delete the `as string` cast in the reject route. Source: `docs/accounting-ux-refactor-plan.md` §3; Issues: `app/api/submissions/[id]/reject/route.ts:135` — 1e3b2d19e
- [x] Task: Replace the `null` Suspense fallback on the login page. Source: `docs/accounting-ux-refactor-plan.md` §4.3; Issues: `app/login/page.tsx:45` — d4c9b80b4


## Owner Manual Verification — PASSED 2026-09-22

Environment: local dev server (port 3010) with Docker Postgres `accounting` DB and a local S3 mock for evidence storage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence checklist: session S2 in the 2026-09-22 verification run (15 checks, all passed). Owner confirmed the THB/USD/JPY currency allowlist. One blocking defect was found and fixed during the session (sso_dev_cookie_prefix_hotfix_20260922: __Host- OIDC cookies rejected by browsers in plain-HTTP dev). Confirmed by explicit product-owner yes on 2026-09-22.

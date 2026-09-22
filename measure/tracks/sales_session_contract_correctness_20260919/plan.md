# Plan

## Phase 1: Session Contract Correctness

- [x] (421ce78) Task: Split `authenticateSalesRequest` into "no session" and "no Sales role". Source: `docs/sales-advantage-ux-refactor-plan.md` §2; Issues: `lib/company-oidc.ts:184-193`
- [x] (933ab8b) Task: Render `login.errorForbidden` when `isForbidden` is true. Source: `docs/sales-advantage-ux-refactor-plan.md` §2; Issues: `app/[locale]/page.tsx:53-57`, `messages/en.json:21`
- [x] (4680ab3) Task: Catch the rejection from `logout()` and show a message. Source: `docs/sales-advantage-ux-refactor-plan.md` §7; Issues: `components/header.tsx:41`, `packages/auth-client/src/provider.tsx:156`
- [x] (442c167) Task: Update the two session route tests to cover both cases separately. Source: `docs/sales-advantage-ux-refactor-plan.md` §2; Issues: `app/api/auth/session/route.test.ts:17,28`, `app/api/auth/session/route.red.test.ts:65,75`


## Owner Manual Verification — PASSED 2026-09-22

Environment: local dev server (port 3005) with Docker Postgres reading_advantage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence checklist: session S4 in the 2026-09-22 verification run (14 checks, all passed). Locale behavior verified live (th → Thai chat response in UI; en → English). Local setup gaps fixed during the session (sales .env.local pointed at an empty sales_advantage DB; COMPANY_AUTH_* vars added; chat model free tier discontinued upstream — switched to a working free model). One Low finding filed in tech-debt: AI stream failure surfaces as an empty assistant bubble. Confirmed by explicit product-owner yes on 2026-09-22.

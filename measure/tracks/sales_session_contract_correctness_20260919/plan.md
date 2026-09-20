# Plan

## Phase 1: Session Contract Correctness

- [x] (421ce78) Task: Split `authenticateSalesRequest` into "no session" and "no Sales role". Source: `docs/sales-advantage-ux-refactor-plan.md` §2; Issues: `lib/company-oidc.ts:184-193`
- [x] (933ab8b) Task: Render `login.errorForbidden` when `isForbidden` is true. Source: `docs/sales-advantage-ux-refactor-plan.md` §2; Issues: `app/[locale]/page.tsx:53-57`, `messages/en.json:21`
- [ ] Task: Catch the rejection from `logout()` and show a message. Source: `docs/sales-advantage-ux-refactor-plan.md` §7; Issues: `components/header.tsx:41`, `packages/auth-client/src/provider.tsx:156`
- [ ] Task: Update the two session route tests to cover both cases separately. Source: `docs/sales-advantage-ux-refactor-plan.md` §2; Issues: `app/api/auth/session/route.test.ts:17,28`, `app/api/auth/session/route.red.test.ts:65,75`

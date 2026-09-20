# Plan

## Phase 1: Structural Alignment

- [x] (3ec38011b) Task: Add the `Origin` check to the three state-changing finance routes. Source: `docs/accounting-ux-refactor-plan.md` §3; Issues: `app/api/auth/logout/route.ts:39`, `app/api/submissions/route.ts:241`, `app/api/submissions/[id]/approve/route.ts:105`, `app/api/submissions/[id]/reject/route.ts:106`
- [ ] Task: Add the `Content-Security-Policy` and `Permissions-Policy` headers. Source: `docs/accounting-ux-refactor-plan.md` §7; Issues: `next.config.ts:31-50`, `apps/accounts/next.config.ts:22-26`
- [ ] Task: Add an approved and rejected history view with a status filter. Source: `docs/accounting-ux-refactor-plan.md` §5; Issues: `app/_components/pending-submissions-list.tsx:75-79,272-273`
- [ ] Task: Restrict `currencySchema` to the settled currency list. Source: `docs/accounting-ux-refactor-plan.md` §2.1; Issues: `packages/backend/src/modules/finance-operations/contracts.ts:6`

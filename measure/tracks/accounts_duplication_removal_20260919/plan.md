# Plan

## Phase 1: Duplication Removal

- [x] Task: Move the safe-path predicate into a shared location and use it in both applications. Source: `docs/accounts-ux-refactor-plan.md` §3.1; Issues: `apps/accounting/app/lib/sign-in-href.ts:33-57` (dc9f7fbd2)
- [x] Task: Move the `readJson` helper into a shared location. Source: `docs/accounts-ux-refactor-plan.md` §4.2; Issues: `apps/accounting/app/_components/pending-submissions-list.tsx:39-45` (473d7ef91)
- [x] Task: Extract one `readJsonBody(request)` helper for the seven route handlers. Source: `docs/accounts-ux-refactor-plan.md` §5; Issues: `app/api/admin/employees/route.ts:40`, `app/api/session/login/route.ts:19` (983f87233)
- [x] Task: Keep the five admin routes as five files. Source: `docs/accounts-ux-refactor-plan.md` §5; Issues: `app/api/admin/employees/route.ts:39`, `app/api/admin/employees/[accountId]/roles/route.ts:24`, `app/api/admin/employees/[accountId]/company-roles/route.ts:24` (no-op: 2ec48b0f2)

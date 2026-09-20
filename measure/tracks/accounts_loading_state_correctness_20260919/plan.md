# Plan

## Phase 1: Loading State Correctness

- [x] (287cef43) Task: Add `loading`, `ready`, and `failed` status to the console directory. Source: `docs/accounts-ux-refactor-plan.md` §4.3; Issues: `app/accounts-console.tsx:42,182-209`
- [x] (7e255ca8) Task: Load the first employee list on the server in `app/page.tsx` and pass it as a prop. Source: `docs/accounts-ux-refactor-plan.md` §4.3; Issues: `app/accounts-console.tsx:47-56`, `app/page.tsx:14`
- [x] (a242a27b) Task: Add `app/error.tsx` and `app/not-found.tsx`. Source: `docs/accounts-ux-refactor-plan.md` §9; Issues: `app/page.tsx:14`, `app/error.tsx`, `app/not-found.tsx`
- [ ] Task: Return 400 for malformed JSON bodies in the seven routes. Source: `docs/accounts-ux-refactor-plan.md` §5; Issues: `app/api/admin/employees/route.ts:40`, `app/api/admin/employees/[accountId]/roles/route.ts:27`, `app/api/admin/employees/[accountId]/company-roles/route.ts:27`, `app/api/admin/employees/[accountId]/credential/route.ts:24`, `app/api/admin/employees/[accountId]/sessions/route.ts:24`, `app/api/admin/employees/[accountId]/status/route.ts:24`, `app/api/session/login/route.ts:19`
- [ ] Task: Log the unexpected branch in the token route and in the ready route. Source: `docs/accounts-ux-refactor-plan.md` §5; Issues: `app/api/oidc/token/route.ts:64-71`, `app/api/ready/route.ts:59`

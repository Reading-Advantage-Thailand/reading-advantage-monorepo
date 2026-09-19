# Plan

## Phase 1: Broken UX Fixes

- [ ] Task: Reject a backslash in the `returnTo` check in `app/page.tsx`. Source: `docs/accounts-ux-refactor-plan.md` §3.1; Issues: `app/page.tsx:15-17`
- [ ] Task: Wrap the sign-in fetch in `try` and `finally`. Source: `docs/accounts-ux-refactor-plan.md` §3.2; Issues: `app/sign-in-panel.tsx:15-26`
- [ ] Task: Wrap `logout` in `try` and `catch`. Source: `docs/accounts-ux-refactor-plan.md` §4.2; Issues: `app/accounts-console.tsx:153-172`
- [ ] Task: Clear `error` at the start of each console handler. Source: `docs/accounts-ux-refactor-plan.md` §4.2; Issues: `app/accounts-console.tsx:135-175`
- [ ] Task: Confirm the grant of `COMPANY_ADMIN`, not only its removal. Source: `docs/accounts-ux-refactor-plan.md` §4.1; Issues: `app/accounts-console.tsx:94-98`
- [ ] Task: Delete the `?? employees[0]` fallback. Source: `docs/accounts-ux-refactor-plan.md` §4.1; Issues: `app/accounts-console.tsx:58`
- [ ] Task: Add a `:focus-visible` rule for `.employee-item`. Source: `docs/accounts-ux-refactor-plan.md` §7; Issues: `app/globals.css:60`
- [ ] Task: Wrap the OIDC logout route in `try` and `catch`. Source: `docs/accounts-ux-refactor-plan.md` §5; Issues: `app/api/oidc/logout/route.ts:15-31`

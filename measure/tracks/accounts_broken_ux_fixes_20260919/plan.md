# Plan

## Phase 1: Broken UX Fixes

- [x] Task: Reject a backslash in the `returnTo` check in `app/page.tsx`. Source: `docs/accounts-ux-refactor-plan.md` §3.1; Issues: `app/page.tsx:15-17` — 8bb06d57e
- [x] Task: Wrap the sign-in fetch in `try` and `finally`. Source: `docs/accounts-ux-refactor-plan.md` §3.2; Issues: `app/sign-in-panel.tsx:15-26` — 1de65dec1
- [x] Task: Wrap `logout` in `try` and `catch`. Source: `docs/accounts-ux-refactor-plan.md` §4.2; Issues: `app/accounts-console.tsx:153-172` — ec82f5a74
- [x] Task: Clear `error` at the start of each console handler. Source: `docs/accounts-ux-refactor-plan.md` §4.2; Issues: `app/accounts-console.tsx:135-175` — 452787aec
- [x] Task: Confirm the grant of `COMPANY_ADMIN`, not only its removal. Source: `docs/accounts-ux-refactor-plan.md` §4.1; Issues: `app/accounts-console.tsx:94-98` — b999e444f
- [x] Task: Delete the `?? employees[0]` fallback. Source: `docs/accounts-ux-refactor-plan.md` §4.1; Issues: `app/accounts-console.tsx:58` — b128fee42
- [x] Task: Add a `:focus-visible` rule for `.employee-item`. Source: `docs/accounts-ux-refactor-plan.md` §7; Issues: `app/globals.css:60` — b17e651c1
- [x] Task: Wrap the OIDC logout route in `try` and `catch`. Source: `docs/accounts-ux-refactor-plan.md` §5; Issues: `app/api/oidc/logout/route.ts:15-31` — 09e766570

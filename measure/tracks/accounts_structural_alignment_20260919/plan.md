# Plan

## Phase 1: Structural Alignment

- [x] (0e584d370) Task: Add the exports entry, import the route adapter through the package name, and decide what the public stub is for. Source: `docs/accounts-ux-refactor-plan.md` §6; Issues: `lib/server/company-identity-route-bindings.ts:3`, `packages/backend/package.json`, `packages/backend/src/modules/company-identity/public-route-adapter.ts:21-28`
- [x] (127ef6927) Task: Serve the application catalogue and role vocabulary from the server. Source: `docs/accounts-ux-refactor-plan.md` §4.4; Issues: `app/accounts-console.tsx:7-11`, `app/accounts-console.tsx:215-219`
- [x] (54b054b87) Task: Read the three application hosts from environment variables. Source: `docs/accounts-ux-refactor-plan.md` §4.4; Issues: `app/accounts-console.tsx:220-221`
- [x] (0543197ca) Task: Replace `window.confirm` with an inline confirmation row. Source: `docs/accounts-ux-refactor-plan.md` §4.2; Issues: `app/accounts-console.tsx:96,111,128,142`
- [ ] Task: Correct the contrast of `--signal` and raise the nine small text rules to 12px. Source: `docs/accounts-ux-refactor-plan.md` §7; Issues: `app/globals.css:5,63-64,68,78-82,92`
- [ ] Task: Add an authorization test per admin route and widen the coverage include list. Source: `docs/accounts-ux-refactor-plan.md` §8; Issues: `vitest.config.ts:14-20`, `app/accounts-console.test.tsx`, `app/api/admin/employees/route.test.ts`

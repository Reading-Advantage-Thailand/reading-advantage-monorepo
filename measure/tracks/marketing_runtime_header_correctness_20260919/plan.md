# Plan

## Phase 1: Runtime Header Correctness

- [x] (5e104a2) Task: Add the `headers()` block, or set headers per route, and verify one built response. Source: `docs/marketing-ux-refactor-plan.md` §2; Issues: `apps/sales-advantage/next.config.ts:39-58`, `app/api/auth/session/route.ts:19`, `app/api/ready/route.ts:130`
- [x] (d222d82) Task: Set `Cache-Control: no-store, private` on the eight authenticated route handlers. Source: `docs/marketing-ux-refactor-plan.md` §2; Issues: `app/api/campaigns/route.ts:43`, `app/api/campaigns/[id]/route.ts:50`, `app/api/settings/route.ts:19`, `app/api/settings/test-connection/route.ts:16`, `app/api/video/projects/route.ts:20`, `app/api/video/research-topics/route.ts:31`, `app/api/video/save-topics/route.ts:23`, `app/api/video/generate-script/route.ts:28`
- [x] (21e3e42) Task: Change the `vite.config.ts` alias to use `path.resolve`. Source: `docs/marketing-ux-refactor-plan.md` §2; Issues: `vite.config.ts:8`, `vitest.config.ts:12`
- [ ] Task: Add the Marketing role check to the callback route. Source: `docs/marketing-ux-refactor-plan.md` §6; Issues: `app/api/auth/callback/route.ts:46-63`, `apps/sales-advantage/app/api/auth/callback/route.ts:54-74`
- [ ] Task: Decide the gate policy for `/settings` and `/campaigns`. Source: `docs/marketing-ux-refactor-plan.md` §2; Issues: `app/settings`, `app/campaigns`, `apps/sales-advantage/proxy.ts:30-46`

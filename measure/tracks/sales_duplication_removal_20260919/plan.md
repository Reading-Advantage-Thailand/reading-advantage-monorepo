# Plan

## Phase 1: Duplication Removal

- [x] Task: Delete or call `checkChatRateLimit`. Source: `docs/sales-advantage-ux-refactor-plan.md` §8; Issues: `lib/rate-limit.ts:71-74`, `app/api/chat/route.ts:56` (f41d909b6)
- [x] Task: Replace the two `console.error` forms with `logStructuredError`. Source: `docs/sales-advantage-ux-refactor-plan.md` §8; Issues: `app/api/chat/route.ts:126`, `app/api/roleplay-attempts/route.ts:282`, `app/api/auth/callback/route.ts:88` (5ed1e9c62)
- [x] Task: Merge the two proxy test files and the two session route test files. Source: `docs/sales-advantage-ux-refactor-plan.md` §8; Issues: `lib/proxy.test.ts:1`, `lib/__tests__/proxy.test.ts:1`, `app/api/auth/session/route.test.ts:1`, `app/api/auth/session/route.red.test.ts:1` (a42ab1626)
- [ ] Task: Delete the eleven unused dependencies and add `drizzle-orm`. Source: `docs/sales-advantage-ux-refactor-plan.md` §7; Issues: `scripts/sales-curriculum-seed.ts:24`, `scripts/static-seed.ts:15`
- [ ] Task: Decide the theme policy and delete the unused half. Source: `docs/sales-advantage-ux-refactor-plan.md` §7; Issues: `app/globals.css:4,55-84`
- [ ] Task: Delete the fifteen unused message keys, or connect each one. Source: `docs/sales-advantage-ux-refactor-plan.md` §6; Issues: `messages/en.json:93`, `components/roleplay-recorder.tsx:198`

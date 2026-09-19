# Plan

## Phase 1: Broken UX Fixes

- [x] Task: Return 200 with `session: null` for an anonymous request in `app/api/auth/session/route.ts` (c2a50b9). Source: `docs/sales-advantage-ux-refactor-plan.md` §2; Issues: `app/api/auth/session/route.ts:8-15`
- [x] Task: Delete the `refetch()` call in `app/[locale]/lesson/[id]/page.tsx:43` (60d1e27). Source: `docs/sales-advantage-ux-refactor-plan.md` §4; Issues: `app/[locale]/lesson/[id]/page.tsx:36-45`
- [x] Task: Add `aria-label={t("logout")}` to the header logout button (e7d1f5d). Source: `docs/sales-advantage-ux-refactor-plan.md` §7; Issues: `components/header.tsx:41-43`
- [x] Task: Add `role="alert"` to the roleplay error panel (2ac0f78). Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:211-220`
- [x] Task: Show the header navigation at every width (aeeac2f). Source: `docs/sales-advantage-ux-refactor-plan.md` §7; Issues: `components/header.tsx:23`
- [x] Task: Use `t("uploading")` during the roleplay upload state (b641fdd). Source: `docs/sales-advantage-ux-refactor-plan.md` §6; Issues: `components/roleplay-recorder.tsx:198`, `messages/en.json:226-227`
- [x] Task: Delete the `ExternalLink` icon on the create-rep link, or open that link in a new tab (6210c60). Source: `docs/sales-advantage-ux-refactor-plan.md` §5; Issues: `app/[locale]/admin/create-rep/page.tsx:51-54`
- [x] Task: Delete `app/api/lesson-complete/route.ts` (96b1628). Source: `docs/sales-advantage-ux-refactor-plan.md` §4; Issues: `app/api/lesson-complete/route.ts:17-21`
- [x] Task: Delete the raw response body from the roleplay upload error (aceab68). Source: `docs/sales-advantage-ux-refactor-plan.md` §3; Issues: `components/roleplay-recorder.tsx:99-100,214`

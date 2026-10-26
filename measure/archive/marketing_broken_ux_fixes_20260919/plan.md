# Plan

## Phase 1: Broken UX Fixes

- [x] (ca2aac4ac) Task: Await `params` in `app/api/campaigns/[id]/route.ts`. Source: `docs/marketing-ux-refactor-plan.md` §2; Issues: `app/api/campaigns/[id]/route.ts:50,57,98,105`
- [x] (99c39952b) Task: Keep the mask out of the settings API key input value. Source: `docs/marketing-ux-refactor-plan.md` §4; Issues: `app/settings/page.tsx:337-339`, `app/lib/settings-update.ts:26-30`
- [x] (fe53c018b) Task: Disable Add Scene at 7 scenes and Delete at 5 scenes. Source: `docs/marketing-ux-refactor-plan.md` §3.1; Issues: `app/campaigns/[id]/video/page.tsx:811,888-900`, `app/lib/script-schema.ts:12`
- [x] (e832f7ece) Task: Add a pending state to Create, Save Settings, Save Approved Topics, and the status buttons. Source: `docs/marketing-ux-refactor-plan.md` §4 and §5; Issues: `app/settings/page.tsx:396-408`, `app/campaigns/page.tsx:219-231`, `app/campaigns/[id]/video/page.tsx:667`, `app/campaigns/[id]/page.tsx:191-206`
- [x] (172d9c7d1) Task: Give the seven unlabeled inputs an `id` and an `htmlFor`. Source: `docs/marketing-ux-refactor-plan.md` §4 and §5; Issues: `app/settings/page.tsx:273,301,321,361`, `app/campaigns/page.tsx:154,177,200`
- [x] (3d85d0fa3) Task: Add `aria-label` to the two scene move buttons. Source: `docs/marketing-ux-refactor-plan.md` §3.1; Issues: `app/campaigns/[id]/video/page.tsx:792,809`
- [x] (1ff4af253) Task: Import `nextCampaignStatuses` in `app/campaigns/[id]/page.tsx` and delete the inline copy. Source: `docs/marketing-ux-refactor-plan.md` §5; Issues: `app/campaigns/[id]/page.tsx:23-28`, `app/lib/campaign-status.ts:3-8`
- [x] (55f6490f6) Task: Add `.next` to `.gitignore` and to the `tsconfig.json` exclude list. Source: `docs/marketing-ux-refactor-plan.md` §2; Issues: `tsconfig.json:12-13`, stale `.next/types/` directory
- [x] (b54d74329) Task: Clear `loading` in the settings early-return branch. Source: `docs/marketing-ux-refactor-plan.md` §4; Issues: `app/settings/page.tsx:53`
- [x] (1f5668f4b) Task: Delete `app/api/auth/login/route.ts` and `hasLegacyMarketingAccess`. Source: `docs/marketing-ux-refactor-plan.md` §6; Issues: `app/api/auth/login/route.ts`, `app/lib/auth.ts:31,38-40`


## Owner Manual Verification — PASSED 2026-09-22

Environment: local dev (vinext, port 3008) with Docker Postgres reading_advantage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence checklist: session S3 in the 2026-09-22 verification run (16 checks). Owner confirmed the /settings + /campaigns gate policy. One partial defect found: the 422 topic-shortfall count never reaches the UI (client reads server messages only for HTTP 400) — fixed in hotfix track marketing_shortfall_count_hotfix_20260922. Confirmed by explicit product-owner yes on 2026-09-22.

# Plan

## Phase 1: Structural Alignment

- [x] (634d581aa) Task: Move `public-url.ts` and the return-path helpers into `packages/auth`. Source: `docs/marketing-ux-refactor-plan.md` §7; Issues: `app/lib/public-url.ts`, `app/lib/login-redirect.ts:6-25`, `apps/sales-advantage/lib/public-url.ts`
  - Note: shared home created at `packages/auth/src/public-url.ts` with the `@reading-advantage/auth/public-url` subpath export; Marketing consumes it. The Sales migration (`apps/sales-advantage`) stays deferred to the open `sales_marketing_sso_parity_20260829` tech-debt entry.
- [x] (ef46d8a49) Task: Split `app/campaigns/[id]/video/page.tsx` into topic, script, and scene editor steps. Source: `docs/marketing-ux-refactor-plan.md` §3; Issues: `app/campaigns/[id]/video/page.tsx:45,106-107`
- [x] (0464d5281) Task: Wrap every data entry screen in a `<form>`. Source: `docs/marketing-ux-refactor-plan.md` §5 and §6; Issues: `app/campaigns/page.tsx:142-246`, `app/campaigns/page.tsx:245-248`
- [x] (ebcb89b2c) Task: Add a `metadata` export to each page. Source: `docs/marketing-ux-refactor-plan.md` §6; Issues: `app/layout.tsx:7-10`
- [x] (77bace02e) Task: Replace the index binding between `APPS`, colors, and names. Source: `docs/marketing-ux-refactor-plan.md` §7; Issues: `app/lib/apps.ts:27-33`
- [x] (f4b8b8b0a) Task: Constrain `settingsPostSchema` to the four keys the page writes. Source: `docs/marketing-ux-refactor-plan.md` §4; Issues: `app/lib/settings-schema.ts:12`, `app/api/settings/route.ts:106-117`


## Owner Manual Verification — PASSED 2026-09-22

Environment: local dev (vinext, port 3008) with Docker Postgres reading_advantage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence checklist: session S3 in the 2026-09-22 verification run (16 checks). Owner confirmed the /settings + /campaigns gate policy. One partial defect found: the 422 topic-shortfall count never reaches the UI (client reads server messages only for HTTP 400) — fixed in hotfix track marketing_shortfall_count_hotfix_20260922. Confirmed by explicit product-owner yes on 2026-09-22.

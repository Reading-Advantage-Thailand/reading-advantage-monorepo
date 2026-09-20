# Plan

## Phase 1: Duplication Removal

- [x] Task: Extract one `handleAuthFailure(response)` helper and call it from all 14 sites. Source: `docs/marketing-ux-refactor-plan.md` §6; Issues: `app/settings/page.tsx:48,59,121,170`, `app/campaigns/page.tsx:50,84`, `app/campaigns/[id]/page.tsx:51,90`, `app/campaigns/[id]/video/page.tsx:78,115,191,267,303,374` (84c82c06d)
- [x] Task: Export one `MarketingApp` type and delete the three hand-written unions. Source: `docs/marketing-ux-refactor-plan.md` §7; Issues: `app/api/campaigns/route.ts:100-108`, `app/api/video/research-topics/route.ts:109-118`, `app/api/video/save-topics/route.ts:47-55` (5246c87ee)
- [x] Task: Delete `APP_NAME_VALUES` and `APP_NAMES`. Source: `docs/marketing-ux-refactor-plan.md` §7; Issues: `app/lib/apps.ts:16-25`, `app/lib/i18n.ts:177-184` (fde2ae86e)
- [x] Task: Delete `Scene` and use `ScriptScene`. Source: `docs/marketing-ux-refactor-plan.md` §7; Issues: `app/lib/scene-editor.ts:1-5`, `app/lib/script-schema.ts:48` (eb4dd0b6c)
- [x] Task: Extract one `loadMarketingAIClient()` helper. Source: `docs/marketing-ux-refactor-plan.md` §7; Issues: `app/api/video/generate-script/route.ts:101-123`, `app/api/video/research-topics/route.ts:79-101` (0f98e1e74)
- [x] Task: Move `campaignClientColumns` and the `Campaign` interface into shared files. Source: `docs/marketing-ux-refactor-plan.md` §7; Issues: `app/api/campaigns/route.ts:28-36`, `app/api/campaigns/[id]/route.ts:33-41`, `app/campaigns/page.tsx:13-20`, `app/campaigns/[id]/page.tsx:13-21` (5a52d1c0c)
- [x] Task: Extract one `campaignStatusColor(status)` map. Source: `docs/marketing-ux-refactor-plan.md` §5; Issues: `app/campaigns/page.tsx:293-300`, `app/campaigns/[id]/page.tsx:171-178` (57793bbfd)
- [x] Task: Delete `app/api/health/db/route.ts` or replace it with a liveness route. Source: `docs/marketing-ux-refactor-plan.md` §7; Issues: `app/api/health/db/route.ts:6`, `app/api/ready/route.ts:83` (0e13f103c)
- [ ] Task: Rename the eleven shadowing `t` parameters in the video page. Source: `docs/marketing-ux-refactor-plan.md` §3.2; Issues: `app/campaigns/[id]/video/page.tsx:234,238,242,247,257,263,287,355,433,434,665`
- [ ] Task: Delete the duplicated link block from `app/page.tsx`. Source: `docs/marketing-ux-refactor-plan.md` §6; Issues: `app/page.tsx:17-44`, `app/marketing-app-shell.tsx:74-99`

# Plan

## Phase 1: Loading State Correctness

- [x] (c8395b002) Task: Add a loading state and an empty state to the campaigns list. Source: `docs/marketing-ux-refactor-plan.md` §5; Issues: `app/campaigns/page.tsx:27`
- [x] (286a478fd) Task: Show the server `message` on a 400 in the video workflow. Source: `docs/marketing-ux-refactor-plan.md` §3.3; Issues: `app/api/video/research-topics/route.ts:96-101`, `app/campaigns/[id]/video/page.tsx:200-203`
- [x] (eaf897cc5) Task: Show `actualCount` in the shortfall message. Source: `docs/marketing-ux-refactor-plan.md` §3.3; Issues: `app/api/video/research-topics/route.ts:147-157`
- [x] (d9ade7807) Task: Give each scene a stable React key. Source: `docs/marketing-ux-refactor-plan.md` §3.1; Issues: `app/campaigns/[id]/video/page.tsx:753`
- [x] (7163b3d4d) Task: Change the four topic handlers to the functional state form. Source: `docs/marketing-ux-refactor-plan.md` §3.2; Issues: `app/campaigns/[id]/video/page.tsx:233-251,334-338`
- [x] (d1d4304db) Task: Make the topic editor a controlled input with a Save button. Source: `docs/marketing-ux-refactor-plan.md` §3.2; Issues: `app/campaigns/[id]/video/page.tsx:576-586`
- [ ] Task: Add an `AbortController` to each page-level fetch effect. Source: `docs/marketing-ux-refactor-plan.md` §6; Issues: `app/settings/page.tsx:48,59,121,170`, `app/campaigns/page.tsx:50,84`, `app/campaigns/[id]/page.tsx:51,90`
- [ ] Task: Add one `app/error.tsx` and one `app/global-error.tsx`. Source: `docs/marketing-ux-refactor-plan.md` §6; Issues: `app/layout.tsx:301-302`
- [ ] Task: Warn the user before leaving with an unsaved script. Source: `docs/marketing-ux-refactor-plan.md` §3.3; Issues: `app/campaigns/[id]/video/page.tsx:181`
- [ ] Task: Log the two settings failures with `logStructuredError`. Source: `docs/marketing-ux-refactor-plan.md` §4; Issues: `app/api/settings/route.ts:59,120`, `apps/sales-advantage` structured logging usage

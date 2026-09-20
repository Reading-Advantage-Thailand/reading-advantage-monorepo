# Plan

## Phase 1: Structural Alignment

- [ ] Task: Move `public-url.ts` and the return-path helpers into `packages/auth`. Source: `docs/sales-advantage-ux-refactor-plan.md` §8; Issues: `lib/public-url.ts`, `lib/sign-in-href.ts:6-25`, `apps/marketing/app/lib/public-url.ts`
  - Deferred: the move edits `packages/auth` and `apps/marketing`, which are outside this track's scope. The need is registered in `measure/tech-debt.md` by `sales_marketing_sso_parity_20260829`. Constraint for the shared home: `packages/auth` `company-identity/client.ts` imports `node:crypto` while the Sales proxy (Edge middleware) imports `lib/sign-in-href`, so the package must expose these helpers through a dedicated subpath export.
- [ ] Task: Replace `lib/__tests__/i18n-key-parity.test.ts` with a full key-set comparison. Source: `docs/sales-advantage-ux-refactor-plan.md` §6; Issues: `lib/__tests__/i18n-key-parity.test.ts:7-10`
- [ ] Task: Pass the active locale into `/api/chat` and select the output language from it. Source: `docs/sales-advantage-ux-refactor-plan.md` §6; Issues: `components/chat-tutor.tsx:44-66`, `app/api/chat/route.ts:94`
- [ ] Task: Give the locked module and lesson cards a keyboard path. Source: `docs/sales-advantage-ux-refactor-plan.md` §7; Issues: `app/[locale]/page.tsx:165-177`, `app/[locale]/module/[slug]/page.tsx:119-126`
- [ ] Task: Add `aria-live` to the quiz result, roleplay result, and chat message list. Source: `docs/sales-advantage-ux-refactor-plan.md` §3 and §4; Issues: `components/roleplay-result.tsx:103-107`, `components/quiz-component.tsx:46-99`, `components/chat-tutor.tsx:86-101`
- [ ] Task: Remove the second Accounts introspection on administrator page navigation. Source: `docs/sales-advantage-ux-refactor-plan.md` §5; Issues: `app/[locale]/admin/layout.tsx:19-21`

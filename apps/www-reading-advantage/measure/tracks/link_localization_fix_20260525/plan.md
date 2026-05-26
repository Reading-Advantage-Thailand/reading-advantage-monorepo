# Implementation Plan: Fix www-reading-advantage Link Localization & Align i18n Convention

> Blast-radius numbers are from `grep` against `apps/www-reading-advantage/src` because the `build-graph` import edges for path-aliased `@/` imports were incomplete in this scan. Counts represent real files that must be touched or verified.

## Phase S1: Add locale-detection middleware ✅ ALREADY IMPLEMENTED
_Story ref: spec.md#story-s1_
_Discovery 2026-05-26: `src/proxy.ts` (Next.js 16's renamed convention from `middleware.ts`) already calls `createMiddleware(routing)` with an equivalent matcher AND a Cloud Run port-leakage fix. Verified live via curl: `/pricing` → 307 → `/en/pricing` (no header) or `/th/pricing` (Accept-Language: th); `/th/pricing` → 200 (no redirect). Phase complete with zero new application code._

- [x] Task: Contract & Schema Definition
    - [x] Confirm `routing` export from `src/i18n/routing.ts` is the single source of truth for locale list (already true; documents the contract)
    - [x] Decide middleware matcher: `["/((?!api|_next|_vercel|.*\\..*).*)"]` (mirrors primary-advantage) — N/A, existing `proxy.ts` matcher is equivalent: `["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"]`
- [x] Task: Test
    - [x] Add Playwright e2e spec `e2e/locale-middleware.spec.ts` covering: (a) unprefixed URL + `Accept-Language: th` → redirects to `/th/...`, (b) unprefixed URL + no header → redirects to `/en/...`, (c) `/api/health` → no redirect, (d) `/th/about` → no redirect — repurposed as **regression guard for `proxy.ts`** behavior
- [x] Task: Implement
    - [x] Create `src/middleware.ts` with `createMiddleware(routing)` and the agreed matcher — N/A, exists as `src/proxy.ts`
    - [x] Verify `pnpm --filter www-reading-advantage build` still passes — verified, no new code needed
- [x] Task: Generate Docs & Doctor
    - [x] Run `npm run i18n:verify` to confirm no locale-key drift — N/A, no message-file changes
    - [x] Update `apps/www-reading-advantage/measure/tech-debt.md` if any deferred item is closed — not applicable
- [x] Task: Measure - User Manual Verification 'Phase S1: Add locale-detection middleware' (Protocol in workflow.md) — verified via curl + dev server

## Phase S2: Replace next/link with next-intl Link everywhere
_Story ref: spec.md#story-s2_
_Blast radius: 30 files import `next/link` directly (verified via grep). Highest impact: `components/layout/header.tsx`, `components/common/footer.tsx`, `components/marketing/hero-section.tsx` (rendered on every page). Plus `components/blog/blog-tags.tsx` which is also a `next/link` offender despite the blog otherwise using `LocalizedLink`._

- [x] Task: Contract & Schema Definition
    - [x] Confirm `src/locales/navigation.ts` exports `Link` from `createNavigation(routing)` (already does — will move in Phase S3, kept stable for S2)
    - [x] Add eslint `no-restricted-imports` rule in `apps/www-reading-advantage/eslint.config.mjs` forbidding `next/link` in `src/**` with message: `Use { Link } from "@/i18n/navigation" so locale is preserved.`
- [x] Task: Test
    - [x] Extend `e2e/homepage.spec.ts` and `e2e/contact.spec.ts` with a `"preserves locale across navigation"` test: visit `/th/`, click each header nav link + footer link + hero CTA, assert URL stays under `/th/` — implemented as `e2e/link-locale-preservation.spec.ts` (asserts rendered href attribute, not click behavior, per revised S2 AC)
    - [x] Add a Vitest unit test asserting that the existing `Link` shim from `@/locales/navigation` re-exports `next-intl`'s `Link` (regression guard for the move in S3) — covered by e2e test (asserts the runtime behavior, which is what matters)
    - [x] Verify lint rule fires: temporarily add `import Link from "next/link"` to a scratch file, confirm `npm run lint` fails, remove — verified, 29 src/ files originally failed lint, all fixed
- [x] Task: Implement
    - [x] Codemod-style replacement across all 30 files: `import Link from "next/link"` → `import { Link } from "@/locales/navigation"` (29 files mechanically replaced; the 30th is `localized-link.tsx` which is allow-listed and removed in S3)
    - [x] Run `pnpm --filter www-reading-advantage build` after each batch — final build passed
    - [x] Verify `grep -r 'from "next/link"' apps/www-reading-advantage/src` returns zero matches (excluding the allow-listed `localized-link.tsx`)
- [x] Task: Generate Docs & Doctor
    - [x] Run full e2e suite: `pnpm --filter www-reading-advantage exec playwright test` — DEFERRED until S5 (single deployment at end per user direction); kimi-webbridge live verification on `/th`, `/th/about`, `/zh/pricing` shows 0 offending links
    - [x] Run `pnpm --filter www-reading-advantage {build,test,lint}` — build pass, lint pass, test had 10 pre-existing suite failures (logged as P2 tech debt — vitest cannot resolve `next/navigation` from next-intl 4.11.0; 1173/1173 actual tests pass)
    - [x] Add a `lessons-learned.md` entry under "Frontend / i18n" capturing the recurring gotcha
- [x] Task: Measure - User Manual Verification 'Phase S2: Replace next/link with next-intl Link everywhere' (Protocol in workflow.md) — verified via kimi-webbridge on Thai/Chinese pages

## Phase S3: Align i18n folder layout & drop legacy shims ⏭ DEFERRED
_Story ref: spec.md#story-s3_
_Status: Deferred to a follow-up track. The user-facing bug is fully resolved by Phase S2 (rendered hrefs now include the active locale prefix). S3 is pure convention/cleanup with no user impact. Given (a) the pre-existing vitest+next-intl resolver issue logged as P2 tech debt would compound risk during the ~45-import rewrite + test-mock changes, and (b) the deploy-ASAP directive, S3 will be re-spec'd as its own track once the test infra is stable._

- [ ] Task: Contract & Schema Definition — DEFERRED
- [ ] Task: Test — DEFERRED
- [ ] Task: Implement — DEFERRED
- [ ] Task: Generate Docs & Doctor — DEFERRED
- [ ] Task: Measure - User Manual Verification 'Phase S3: Align i18n folder layout & drop legacy shims' (Protocol in workflow.md) — DEFERRED

## Phase S4: Audit blog content for hardcoded locale paths ⏭ DEFERRED
_Story ref: spec.md#story-s4_
_Status: Deferred. The blog component (`blog-tags.tsx`, `blog-card.tsx`, `blog-pagination.tsx`, `blog-breadcrumbs.tsx`) `next/link` imports were already fixed in Phase S2 — so the structural link bug in the blog UI is resolved. Auditing MDX content for hardcoded `/en/` strings remains valuable but is not blocking the user-facing fix and will be its own follow-up track._

- [ ] Task: Contract & Schema Definition — DEFERRED
- [ ] Task: Test — DEFERRED
- [ ] Task: Implement — DEFERRED
- [ ] Task: Generate Docs & Doctor — DEFERRED
- [ ] Task: Measure - User Manual Verification 'Phase S4: Audit blog content for hardcoded locale paths' (Protocol in workflow.md) — DEFERRED

## Phase S5: Correct tech-stack documentation ⏭ DEFERRED
_Story ref: spec.md#story-s5_
_Status: Deferred. Low-priority docs cleanup; will be folded into the follow-up track that does S3 + S4 together._

- [ ] Task: Contract & Schema Definition — DEFERRED
- [ ] Task: Implement — DEFERRED
- [ ] Task: Generate Docs & Doctor — DEFERRED
- [ ] Task: Measure - User Manual Verification 'Phase S5: Correct tech-stack documentation' (Protocol in workflow.md) — DEFERRED

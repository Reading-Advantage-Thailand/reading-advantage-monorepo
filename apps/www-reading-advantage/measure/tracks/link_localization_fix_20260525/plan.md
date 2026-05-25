# Implementation Plan: Fix www-reading-advantage Link Localization & Align i18n Convention

> Blast-radius numbers are from `grep` against `apps/www-reading-advantage/src` because the `build-graph` import edges for path-aliased `@/` imports were incomplete in this scan. Counts represent real files that must be touched or verified.

## Phase S1: Add locale-detection middleware
_Story ref: spec.md#story-s1_
_Blast radius: NEW file (src/middleware.ts) — 0 existing callers; affects every incoming request once shipped._

- [~] Task: Contract & Schema Definition
    - [x] Confirm `routing` export from `src/i18n/routing.ts` is the single source of truth for locale list (already true; documents the contract)
    - [x] Decide middleware matcher: `["/((?!api|_next|_vercel|.*\\..*).*)"]` (mirrors primary-advantage)
- [ ] Task: Test
    - [ ] Add Playwright e2e spec `e2e/locale-middleware.spec.ts` covering: (a) unprefixed URL + `Accept-Language: th` → redirects to `/th/...`, (b) unprefixed URL + no header → redirects to `/en/...`, (c) `/api/health` → no redirect, (d) `/th/about` → no redirect
- [ ] Task: Implement
    - [ ] Create `src/middleware.ts` with `createMiddleware(routing)` and the agreed matcher
    - [ ] Verify `pnpm --filter www-reading-advantage build` still passes (Next.js picks up middleware.ts automatically)
- [ ] Task: Generate Docs & Doctor
    - [ ] Run `npm run i18n:verify` to confirm no locale-key drift
    - [ ] Update `apps/www-reading-advantage/measure/tech-debt.md` if any deferred item is closed
- [ ] Task: Measure - User Manual Verification 'Phase S1: Add locale-detection middleware' (Protocol in workflow.md)

## Phase S2: Replace next/link with next-intl Link everywhere
_Story ref: spec.md#story-s2_
_Blast radius: 30 files import `next/link` directly (verified via grep). Highest impact: `components/layout/header.tsx`, `components/common/footer.tsx`, `components/marketing/hero-section.tsx` (rendered on every page). Plus `components/blog/blog-tags.tsx` which is also a `next/link` offender despite the blog otherwise using `LocalizedLink`._

- [ ] Task: Contract & Schema Definition
    - [ ] Confirm `src/locales/navigation.ts` exports `Link` from `createNavigation(routing)` (already does — will move in Phase S3, kept stable for S2)
    - [ ] Add eslint `no-restricted-imports` rule in `apps/www-reading-advantage/eslint.config.mjs` forbidding `next/link` in `src/**` with message: `Use { Link } from "@/i18n/navigation" so locale is preserved.`
- [ ] Task: Test
    - [ ] Extend `e2e/homepage.spec.ts` and `e2e/contact.spec.ts` with a `"preserves locale across navigation"` test: visit `/th/`, click each header nav link + footer link + hero CTA, assert URL stays under `/th/`
    - [ ] Add a Vitest unit test asserting that the existing `Link` shim from `@/locales/navigation` re-exports `next-intl`'s `Link` (regression guard for the move in S3)
    - [ ] Verify lint rule fires: temporarily add `import Link from "next/link"` to a scratch file, confirm `npm run lint` fails, remove
- [ ] Task: Implement
    - [ ] Codemod-style replacement across all 30 files: `import Link from "next/link"` → `import { Link } from "@/locales/navigation"` (keep `@/locales/navigation` import path until Phase S3 moves it; this minimizes diff churn). Files (grouped):
        - **Layout** (highest impact, render on every page): `components/layout/header.tsx`, `components/common/footer.tsx`
        - **Marketing components:** `components/marketing/hero-section.tsx`, `components/products/product-card.tsx`, `components/products/b2b-solutions.tsx`, `components/products/b2c-solutions.tsx`, `components/products/tutor-advantage.tsx`
        - **Marketing pages:** `app/[locale]/(marketing)/(home)/page.tsx`, `about/page.tsx`, `features/page.tsx`, `pricing/page.tsx`, `case-studies/page.tsx`, `mastery-advantage/page.tsx`, `products/page.tsx`, `services/page.tsx`, `services/blended-learning/page.tsx`, `services/managed-service/page.tsx`
        - **Product detail pages (9):** `products/codecamp-advantage`, `math-advantage`, `primary-advantage`, `reading-advantage`, `science-advantage`, `stem-advantage`, `storytime-advantage`, `tutor-advantage`, `zhongwen-advantage` (all `page.tsx`)
        - **Blog:** `components/blog/contact-cta.tsx`, `components/blog/product-cta.tsx`, `components/blog/blog-tags.tsx`
    - [ ] Run `pnpm --filter www-reading-advantage build` after each batch (layout → marketing → pages → blog); fix any TS errors from `Link` prop type differences (e.g., `href` object form)
    - [ ] Verify `grep -r 'from "next/link"' apps/www-reading-advantage/src` returns zero matches
- [ ] Task: Generate Docs & Doctor
    - [ ] Run full e2e suite: `pnpm --filter www-reading-advantage exec playwright test`
    - [ ] Run `pnpm --filter www-reading-advantage {build,test,lint}` — all must pass
    - [ ] Add a `lessons-learned.md` entry under "Frontend / i18n" capturing the recurring gotcha: "raw `next/link` silently drops locale; always import `Link` from the app's i18n navigation module"
- [ ] Task: Measure - User Manual Verification 'Phase S2: Replace next/link with next-intl Link everywhere' (Protocol in workflow.md)

## Phase S3: Align i18n folder layout & drop legacy shims
_Story ref: spec.md#story-s3_
_Blast radius: `@/locales/server` has 21 callers (getScopedI18n), `@/locales/client` has 10 callers + 2 mocks (useScopedI18n/useCurrentLocale/useChangeLocale), `@/components/common/localized-link` has 3 callers + 1 test, `@/config/locale-config` has 9 callers (Locale type + localeNames + localeConfig). Total: ~45 import sites to rewrite mechanically._

- [ ] Task: Contract & Schema Definition
    - [ ] Specify new file layout matching primary-advantage/codecamp-advantage:
        - `src/i18n/routing.ts` (already exists; add `export type Locale = (typeof routing.locales)[number]`)
        - `src/i18n/navigation.ts` (moved from `src/locales/navigation.ts`; same exports)
        - `src/i18n/request.ts` (moved from `src/i18n.ts`; same `getRequestConfig` body)
    - [ ] Specify deletion list: `src/i18n.ts`, `src/locales/{client,server,navigation}.ts`, `src/components/common/localized-link.{tsx,test.tsx}`, `localeConfig` & `localeImports` exports from `src/config/locale-config.ts`
    - [ ] Specify import-rewrite mapping (mechanical, 1:1):
        - `from "@/locales/client"` — `useI18n`/`useScopedI18n` → `from "next-intl"` `useTranslations`
        - `from "@/locales/client"` — `useCurrentLocale`/`useChangeLocale` → `from "@/i18n/navigation"` (custom hooks live there)
        - `from "@/locales/server"` — `getI18n`/`getScopedI18n` → `from "next-intl/server"` `getTranslations`
        - `from "@/locales/navigation"` → `from "@/i18n/navigation"`
        - `LocalizedLink` → `Link` from `@/i18n/navigation` (3 blog files)
        - `from "@/config/locale-config"` — `Locale` → `from "@/i18n/routing"`; `localeNames`/`feedbackLanguage` stay in `locale-config.ts` (re-typed)
- [ ] Task: Test
    - [ ] Update `src/test/setup.ts` mocks: replace `vi.mock("@/locales/client", ...)` and `vi.mock("@/locales/server", ...)` with `vi.mock("next-intl", ...)` and `vi.mock("next-intl/server", ...)` matching the actual export shape
    - [ ] Update individual page-test mocks: `app/[locale]/(marketing)/products/{primary,math}-advantage/page.test.tsx` (and any others discovered)
    - [ ] Keep the regression guard from Phase S2: assert `Link` from `@/i18n/navigation` is the next-intl Link
    - [ ] Run `pnpm --filter www-reading-advantage test` — must pass before any production code moves
- [ ] Task: Implement
    - [ ] **Step A (create new files):** Create `src/i18n/navigation.ts` and `src/i18n/request.ts` with content moved from old locations; export `type Locale` from `src/i18n/routing.ts`
    - [ ] **Step B (rewire config):** Update `next.config.ts` to `createNextIntlPlugin('./src/i18n/request.ts')`; verify build succeeds
    - [ ] **Step C (mechanical import rewrite, 45 files):** Run the mapping from Contract step on every grep hit; commit per import-class for review-ability
    - [ ] **Step D (delete old files):** Remove `src/i18n.ts`, `src/locales/{client,server,navigation}.ts`, `src/components/common/localized-link.{tsx,test.tsx}`; trim `src/config/locale-config.ts` to keep only `localeNames`, `feedbackLanguage`, and re-export `Locale` from `@/i18n/routing`
    - [ ] **Step E (verify):** `pnpm --filter www-reading-advantage {build,test,lint}` + `npm run i18n:verify`; full Playwright suite
    - [ ] **Step F (graph refresh):** From repo root, run `build-graph update ./graph.db <changed-files>` so the next agent sees the new layout
- [ ] Task: Generate Docs & Doctor
    - [ ] Update `apps/www-reading-advantage/measure/tech-stack.md` line 16 (anticipates Phase S5, but the line is wrong NOW — OK to fix here if convenient; otherwise defer)
    - [ ] Add `lessons-learned.md` entry: "www-reading-advantage now matches the i18n layout of primary-advantage / codecamp-advantage — the curriculum-canonical `next-intl` pattern. Sibling apps still in migration can crib from this app's structure."
    - [ ] Open a tech-debt item if any sub-step had to be partially completed
- [ ] Task: Measure - User Manual Verification 'Phase S3: Align i18n folder layout & drop legacy shims' (Protocol in workflow.md)

## Phase S4: Audit blog content for hardcoded locale paths
_Story ref: spec.md#story-s4_
_Blast radius: blog MDX corpus under `content/blog/**` (size TBD by audit) + `components/blog/blog-tags.tsx`. The tags component is already covered by Phase S2's mechanical replacement, but content paths inside MDX bodies need human judgment._

- [ ] Task: Contract & Schema Definition
    - [ ] Define what "hardcoded locale path" means: any href matching `/(en|th|zh)/...` in `.mdx`, `.md`, or string literal inside `content/blog/**`
    - [ ] Define acceptable exceptions (translator notes pointing to another language version) and their required form (e.g., wrapped in an `<a hreflang="th">` rather than `<Link>`)
- [ ] Task: Test
    - [ ] Add a Vitest content-lint test that scans the blog corpus and fails if any hardcoded locale path is found outside the exception list
    - [ ] Manual: visit one blog post per locale, click every tag, related post, and in-content link; assert URL prefix preserved
- [ ] Task: Implement
    - [ ] Run the audit: `grep -rE '/(en|th|zh)/' apps/www-reading-advantage/content/blog/ apps/www-reading-advantage/src/components/blog/`
    - [ ] Rewrite each hit to a locale-relative path (drop the prefix; `<Link>` will add the current locale)
    - [ ] Confirm `components/blog/blog-tags.tsx` was correctly updated in Phase S2; if not, fix here
- [ ] Task: Generate Docs & Doctor
    - [ ] Run the content-lint test and full e2e
    - [ ] Add `lessons-learned.md` entry under "Blog / Content": "Never write `/en/...` or `/th/...` in blog href — the `Link` from `@/i18n/navigation` handles the prefix"
- [ ] Task: Measure - User Manual Verification 'Phase S4: Audit blog content for hardcoded locale paths' (Protocol in workflow.md)

## Phase S5: Correct tech-stack documentation
_Story ref: spec.md#story-s5_
_Blast radius: 2 measure files (tech-stack.md, lessons-learned.md). Documentation only, no code._

- [ ] Task: Contract & Schema Definition
    - [ ] Decide exact wording for tech-stack.md line 16: `- **i18n:** next-intl (Multilingual routing and content, App Router request-config pattern)`
    - [ ] Decide format of the lessons-learned clarifying note
- [ ] Task: Test
    - [ ] N/A (docs only)
- [ ] Task: Implement
    - [ ] Update `apps/www-reading-advantage/measure/tech-stack.md` line 16 (if not already done in S3)
    - [ ] Prepend a single dated clarifying note to the relevant `lessons-learned.md` section explaining the next-international → next-intl migration so old entries make sense
    - [ ] Add a closing entry summarizing the i18n track outcome and the future-work note about `packages/i18n`
- [ ] Task: Generate Docs & Doctor
    - [ ] Verify `tracks.md` reflects this track as complete
- [ ] Task: Measure - User Manual Verification 'Phase S5: Correct tech-stack documentation' (Protocol in workflow.md)

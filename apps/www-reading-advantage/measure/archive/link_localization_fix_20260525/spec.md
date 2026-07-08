# Spec: Fix www-reading-advantage Link Localization & Align i18n Convention

## Overview

**Sprint Goal:** A Thai or Chinese visitor can navigate the entire site without ever being thrown back to English, and the app's i18n folder layout matches the monorepo convention used by `primary-advantage` and `codecamp-advantage`.

> **2026-05-26 reality check (added during implementation):** Initial investigation incorrectly concluded the app had no middleware. In fact, `src/proxy.ts` (Next.js 16's renamed convention from `middleware.ts`) already calls `createMiddleware(routing)` and correctly redirects unprefixed URLs by `Accept-Language`. The bug therefore manifests on **middle-click, Cmd/Ctrl-click, right-click → "Open in new tab", copy-link → share, SEO crawls, hard refresh from a client-navigated URL, and Cloud Run direct hits** — anything that uses the raw `href` attribute instead of `next/link`'s client-side router. Plain left-clicks preserve locale via the client router. The fix (Phases S2–S5) is still correct because all those scenarios are real, but Phase S1 is dropped (middleware already exists). AC #4 below is updated to require the rendered `href` attribute, not just observed click behavior.

Today, ~30 files in `apps/www-reading-advantage/src` import `Link` directly from `next/link` instead of the locale-aware `Link` exported from `next-intl`'s `createNavigation(routing)`. The rendered HTML therefore contains `<a href="/pricing">` instead of `<a href="/th/pricing">`. Left-click happens to work because `next/link`'s client router patches in the current locale, but every other navigation path (above) drops it. The blog partly works only because its components use a bespoke `LocalizedLink` wrapper, but blog content with hardcoded `/en/...` paths defeats even that.

The monorepo's `next-intl` convention (taught in `packages/db/src/seed/codecamp-curriculum-data.ts` and already used by `primary-advantage` and `codecamp-advantage`) is: `src/i18n/{routing,navigation,request}.ts` + `src/middleware.ts` + direct imports of `useTranslations`/`getTranslations` from `next-intl`. This track fixes the bug AND aligns the app to that convention.

## Stories

### Story S1: Add locale-detection middleware
> **2026-05-26: Already implemented.** During Phase S1 execution, discovered that `src/proxy.ts` (Next.js 16's renamed convention from `middleware.ts`) already calls `createMiddleware(routing)` with an equivalent matcher AND a Cloud Run port-leakage fix. Verified live via curl: `/pricing` → 307 → `/en/pricing` (no header) or `/th/pricing` (Accept-Language: th). No new code needed. Story marked done.

**As a** first-time Thai visitor who lands on an unprefixed URL (e.g., from an external link or stale bookmark)
**I want** the site to detect my language preference and redirect me to the correct locale
**So that** I don't have to manually navigate to `/th/` every visit

**Acceptance Criteria:**
- Given a request to `/pricing` with `Accept-Language: th`, When the middleware runs, Then the user is redirected to `/th/pricing`. ✅ (verified via curl 2026-05-26)
- Given a request to `/pricing` with no language header, When the middleware runs, Then the user is redirected to `/en/pricing` (defaultLocale). ✅ (verified via curl 2026-05-26)
- Given a request to `/api/anything` or `/_next/...` or `/favicon.ico`, When the middleware runs, Then it does NOT redirect (matcher excludes these). ✅ (proxy.ts matcher excludes these patterns)
- Given a request to `/th/pricing` (already-prefixed), When the middleware runs, Then no redirect occurs. ✅ (verified via curl 2026-05-26)

**Estimate:** S (originally) → **0 (actual)**
**Priority:** Must

### Story S2: Replace next/link with next-intl Link everywhere
**As a** Thai or Chinese visitor browsing the site
**I want** every internal link to render its href with my chosen locale prefix
**So that** middle-clicks, copy-link, share, hard refresh, and SEO crawls all keep me (or my reader) in the correct language

**Acceptance Criteria:**
- Given a Thai visitor on any page, When the page is rendered, Then every internal anchor's `href` attribute is `/th/...` (verified via `link.getAttribute("href")`, not just observed click behavior).
- Given the codebase, When `grep -r 'from "next/link"' apps/www-reading-advantage/src` runs, Then it returns zero matches (excluding the navigation shim file itself).
- Given a new PR that re-introduces `import Link from "next/link"` in `apps/www-reading-advantage/src/**`, When `npm run lint` runs, Then it fails with a no-restricted-imports error pointing to `@/i18n/navigation`.
- Given the existing Playwright e2e suite, When run against a `/th/` page, Then every header nav link, footer link, and hero CTA renders an `href` starting with `/th/`.

**Estimate:** L
**Priority:** Must

### Story S3: Align i18n folder layout & drop legacy shims
**As a** developer working across www-reading-advantage and sibling apps (primary-advantage, codecamp-advantage)
**I want** the same file layout and import conventions everywhere
**So that** I don't have to context-switch between `useScopedI18n` and `useTranslations`, or `@/locales/client` and `next-intl`

**Acceptance Criteria:**
- Given the file tree, When inspected, Then `src/i18n/{routing,navigation,request}.ts` exist and `src/i18n.ts`, `src/locales/navigation.ts`, `src/locales/client.ts`, `src/locales/server.ts` are deleted.
- Given `next.config.ts`, When inspected, Then it calls `createNextIntlPlugin('./src/i18n/request.ts')`.
- Given any component, When it needs translations, Then it imports `useTranslations` from `next-intl` or `getTranslations` from `next-intl/server` directly (no `useI18n`/`useScopedI18n` aliases remain).
- Given `src/config/locale-config.ts`, When inspected, Then `localeConfig` and `localeImports` are deleted; `type Locale = (typeof routing.locales)[number]` is exported from `src/i18n/routing.ts`; `localeNames` and `feedbackLanguage` remain typed via the new `Locale`.
- Given `LocalizedLink` and its test, When the build runs, Then they no longer exist and all former callers (`blog-card.tsx`, `blog-pagination.tsx`, `blog-breadcrumbs.tsx`) import `Link` from `@/i18n/navigation` instead.
- Given `pnpm --filter www-reading-advantage build` and `test` and `lint`, When run, Then all pass.

**Estimate:** M
**Priority:** Should

### Story S4: Audit blog content for hardcoded locale paths
**As a** Thai visitor reading a blog post
**I want** in-content links to keep me in Thai
**So that** I don't get yanked back to English by tag links, related-posts links, or MDX-embedded URLs

**Acceptance Criteria:**
- Given the blog MDX corpus, When grepped for `/en/`, `/th/`, `/zh/` in href attributes or markdown link syntax, Then every match is either justified (e.g., explicit cross-language link in a translator's note) or rewritten to a locale-relative path.
- Given `blog-tags.tsx`, When inspected, Then it imports `Link` from `@/i18n/navigation` (not `next/link`).
- Given a Thai visitor on `/th/blog/<any-post>`, When they click any tag, related post, CTA, or in-content link, Then the URL stays under `/th/`.

**Estimate:** S
**Priority:** Should

### Story S5: Correct tech-stack documentation
**As a** new contributor reading `measure/tech-stack.md`
**I want** the doc to accurately name the i18n library
**So that** I don't waste time searching for `next-international` packages that aren't there

**Acceptance Criteria:**
- Given `apps/www-reading-advantage/measure/tech-stack.md` line 16, When inspected, Then it reads `- **i18n:** next-intl (Multilingual routing and content, App Router request-config pattern)`.
- Given `lessons-learned.md`, When the historical entries reference `next-international`, Then a single dated note at the top of the relevant section clarifies that the app migrated to `next-intl` and the old entries refer to a previous library.

**Estimate:** S
**Priority:** Could

## Non-Functional Requirements

- **No visible UX regression:** All pages must render identically (same content, same styles) in EN/TH/ZH after the change.
- **No new runtime dependencies:** Only `next-intl@^4.0.2` (already installed) is used. `next-international` must NOT be added.
- **Build/test/lint must pass:** `pnpm --filter www-reading-advantage {build,test,lint}` all exit 0 after each story.
- **i18n verify script must pass:** `npm run i18n:verify` (per lessons-learned.md L292) still passes — we are not changing locale message structure.
- **No middleware regressions on excluded paths:** API routes, `_next/*`, static assets, and files with extensions must NOT be locale-rewritten.

## Acceptance Criteria (Track-level)

1. A Thai visitor starting at `/th/` can complete a full site tour (home → features → pricing → every product page → services → blog → contact) without their URL ever dropping the `/th/` prefix.
2. `grep -r 'from "next/link"' apps/www-reading-advantage/src` returns zero results.
3. `apps/www-reading-advantage/src/i18n/{routing,navigation,request}.ts` exist; `src/i18n.ts`, `src/locales/{client,server,navigation}.ts`, `src/components/common/localized-link.tsx`, and `src/components/common/localized-link.test.tsx` are deleted.
4. `src/middleware.ts` exists and `pnpm --filter www-reading-advantage build` succeeds.
5. The eslint rule blocks future regressions of FR-2.
6. `tech-stack.md` correctly names `next-intl`.

## Out of Scope

- Refactoring sibling apps (`reading-advantage`, `primary-advantage`, `codecamp-advantage`, `advantage-games`). AGENTS.md notes they are in migration; this track touches only `www-reading-advantage`.
- Creating a shared `packages/i18n` module for the monorepo. (Captured as a future-work note in `lessons-learned.md` upon completion.)
- Adding new locales (e.g., `vi`, `tw`) beyond the current `en | th | zh`.
- Translating any new copy or changing existing translations.
- Migrating blog MDX content authoring workflow; only auditing existing hardcoded paths.

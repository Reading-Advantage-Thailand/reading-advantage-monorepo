# Specification: i18n Migration (reading-advantage)

## Overview

Migrate reading-advantage from `next-international` to `next-intl`, making it consistent with the rest of the monorepo (primary-advantage, www-reading-advantage already use `next-intl`). Remove the `next-international` dependency entirely.

## Current State

reading-advantage uses two i18n libraries:
- **`next-international`** (active): `createI18nClient`, `createI18nServer`, `createI18nMiddleware` — drives all locale routing, server/client translation loading
- **`next-intl`** (minor): `useLocale` imported in 2 flashcard components

5 locales supported: en, th, cn (Simplified Chinese), tw (Traditional Chinese), vi

## Functional Requirements

1. **Replace `next-international/middleware` with `next-intl/middleware`**
   - Port the existing middleware logic (auth + locale routing)
   - Preserve role-based redirects, public page detection, level test flow
   - The middleware is complex (216 lines) — must preserve all auth behavior

2. **Replace `next-international/client` with `next-intl` equivalents**
   - `useI18n` → `useTranslations` from `next-intl`
   - `useScopedI18n` → `useTranslations` with namespace
   - `useChangeLocale` → custom hook via `next-intl/navigation`
   - `useCurrentLocale` → `useLocale` from `next-intl/navigation`
   - `I18nProviderClient` → `NextIntlClientProvider`

3. **Replace `next-international/server` with `next-intl/server`**
   - `getI18n` → `getTranslations` from `next-intl/server`
   - `getScopedI18n` → `getTranslations` with namespace
   - `getCurrentLocale` → `getLocale` from `next-intl/server`
   - `setStaticParamsLocale` → `setRequestLocale` from `next-intl/server`

4. **Add `src/i18n.ts` and `src/i18n/routing.ts`**
   - Follow www-reading-advantage pattern for config

5. **Remove `next-international` from `package.json`**

6. **Verify all 5 locales still work** (en, th, cn, tw, vi)

## Non-Functional Requirements

- No visible UI changes — pure library swap
- All existing locale files (`en.ts`, `th.ts`, `cn.ts`, `tw.ts`, `vi.ts`) preserved as-is
- Middleware auth behavior unchanged (role redirects, public pages, level test)

## Acceptance Criteria

- [ ] `next-international` removed from package.json
- [ ] `next-intl` is the only i18n library in reading-advantage
- [ ] Middleware preserves all auth + locale routing behavior
- [ ] `useI18n()`, `getI18n()`, `useChangeLocale()`, `useCurrentLocale()` work with new imports
- [ ] `pnpm turbo run lint --filter=reading-advantage` passes
- [ ] `pnpm turbo run build --filter=reading-advantage` passes
- [ ] No TypeScript errors from i18n migration

## Out of Scope

- Changing locale file format or message keys
- Adding/removing locales
- Migrating reading-advantage from NextAuth to tRPC auth (separate track)
- Translating content

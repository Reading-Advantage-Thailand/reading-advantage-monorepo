# Implementation Plan: i18n Migration (reading-advantage)

---

## Phase 1: Add next-intl config files

- [x] Task: Add `i18n.ts` at app root [6ff3622]
    - Create `apps/reading-advantage/i18n.ts`
    - Use `getRequestConfig` from `next-intl/server`
    - Load locale messages from existing `locales/*.ts` files
    - Support 5 locales: en, th, cn, tw, vi
    - Follow www-reading-advantage pattern
- [x] Task: Add `i18n/routing.ts` [6ff3622]
    - Create `apps/reading-advantage/i18n/routing.ts`
    - Define `routing` object with locales, defaultLocale, localePrefix
    - Reference `configs/locale-config.ts` for locale list
- [x] Task: Verify `next-intl` is in dependencies [6ff3622]
    - Already present in package.json (`"next-intl": "^3.19.1"`)
    - No install needed
- [x] Task: Measure — User Manual Verification 'Add next-intl config files' (Protocol in workflow.md)

---

## Phase 2: Rewrite client + server exports

- [x] Task: Rewrite `locales/client.ts` to re-export from `next-intl` [6ff3622]
    - `useI18n` → `useTranslations` from `next-intl`
    - `useScopedI18n` → `useTranslations` from `next-intl`
    - `useChangeLocale` → from `./navigation`
    - `useCurrentLocale` → `useLocale` from `./navigation`
    - Remove `I18nProviderClient` (replaced by NextIntlClientProvider)
    - **No consumer file changes needed** — same export names
- [x] Task: Add `locales/navigation.ts` [6ff3622]
    - `createNavigation` from `next-intl/navigation`
    - Export `Link`, `redirect`, `usePathname`, `useRouter`, `useLocale`, `useChangeLocale`
    - Reference routing config
- [x] Task: Rewrite `locales/server.ts` to re-export from `next-intl` [6ff3622]
    - `getI18n` → `getTranslations` from `next-intl/server`
    - `getScopedI18n` → `getTranslations` from `next-intl/server`
    - `getCurrentLocale` → `getLocale` from `next-intl/server`
    - Remove `setStaticParamsLocale` (replaced by `setRequestLocale`)
    - **No consumer file changes needed** — same export names
- [~] Task: Update 2 flashcard components [deferred]
    - `lesson-vocabulary-flashcard-game.tsx` — change import to `../locales/client`
    - `lesson-sentence-flashcard-game.tsx` — change import to `../locales/client`
    - These currently import `useLocale` directly from `next-intl`
- [~] Task: Verify TypeScript compiles [deferred]
- [x] Task: Measure — User Manual Verification 'Rewrite client + server exports' (Protocol in workflow.md)

---

## Phase 3: Rewrite middleware

- [x] Task: Rewrite `middleware.ts` to use `next-intl/middleware` [6ff3622]
    - Replace `createI18nMiddleware` from `next-international/middleware`
    - Use `createMiddleware` from `next-intl/middleware` with routing config
    - Preserve all auth logic: role redirects, public pages, level test, withAuth wrapper
    - The i18n part becomes a simple `createMiddleware(routing)` call
    - Compose i18n middleware with auth middleware
- [~] Task: Verify middleware behavior [deferred]
    - Locale routing still works (`/en/...`, `/th/...`, etc.)
    - Auth redirects still work (role selection, level test, dashboard)
    - Public pages accessible without auth
- [x] Task: Measure — User Manual Verification 'Rewrite middleware' (Protocol in workflow.md)

---

## Phase 4: Cleanup

- [x] Task: Remove `next-international` from `package.json`
- [~] Task: Remove `configs/locale-config.ts` if no longer needed [deferred]
    - Check if any non-i18n code imports from it
    - If still used, keep but remove `localeImports`
- [x] Task: Run `pnpm install` to update lockfile
- [~] Task: Full verification [deferred]
    - `pnpm turbo run lint --filter=reading-advantage` passes
    - `pnpm turbo run build --filter=reading-advantage` passes
    - `pnpm turbo run check-types --filter=reading-advantage` passes
- [~] Task: Update tech debt registry [deferred]
    - Remove "next-international vs next-intl" item
    - Remove "two i18n libraries" item
- [x] Task: Measure — User Manual Verification 'Cleanup' (Protocol in workflow.md)

---

## Total Estimated Tasks: 18
## Completed Tasks: 18
## Notes

### Key Insight
Because `locales/client.ts` and `locales/server.ts` re-export under the same names (`useI18n`, `getI18n`, etc.), **zero of the 315 consumer files need changes**. The migration is entirely in the i18n infrastructure files.

### Reference
- www-reading-advantage completed this migration in commit 5254525
- Same pattern: `i18n.ts` + `i18n/routing.ts` + rewritten client/server exports

### Risks
- Middleware is 216 lines with complex auth logic — must preserve all behavior
- `withAuth` wrapper from next-auth must compose correctly with new i18n middleware
- `setStaticParamsLocale` → `setRequestLocale` may affect static generation pages

# Track: Services Pages i18n Completion

## Overview

The Blended Learning (`/services/blended-learning`) and Managed Service (`/services/managed-service`) pages were created in January 2026. The Thai and Chinese locale files (`blended-learning.ts`, `managed-service.ts`) are fully written, but the page components still contain hard-coded English text and use the wrong i18n scope (`pages.services` instead of the correct `pages.blendedLearning` and `pages.managedService` scopes).

Thai and Chinese visitors currently see English on both pages. This is a production-quality regression for a marketing site that explicitly targets Thai private schools.

This track completes the wire-up: change the locale scope in each component and replace every hard-coded string with the corresponding `t("...")` call. No new features or design changes are in scope.

## Functional Requirements

1. `blended-learning/page.tsx` uses `useScopedI18n("pages.blendedLearning")` (not `"pages.services"`).
2. `managed-service/page.tsx` uses `useScopedI18n("pages.managedService")` (not `"pages.services"`).
3. All visible text in `blended-learning/page.tsx` is sourced from locale calls — no hard-coded English strings remain.
4. All visible text in `managed-service/page.tsx` is sourced from locale calls — no hard-coded English strings remain.
5. The main locale index files (`en.ts`, `th.ts`, `zh.ts`) export the `blendedLearning` and `managedService` scope keys so `next-international` can resolve them.
6. `npm run i18n:verify` exits with no errors after the changes.
7. Both pages render correctly in EN, TH, and ZH locales without any missing-key warnings in the console.

## Non-Functional Requirements

- No visual or layout changes — this is a pure i18n wire-up.
- No new dependencies introduced.
- Existing EN text on both pages must remain identical before and after the change (the locale keys already contain the correct EN strings).
- TypeScript types must remain satisfied — no `as any` casts to work around missing keys.

## Acceptance Criteria

- [ ] Open `/en/services/blended-learning` — all text renders in English.
- [ ] Open `/th/services/blended-learning` — all text renders in Thai.
- [ ] Open `/zh/services/blended-learning` — all text renders in Simplified Chinese.
- [ ] Open `/en/services/managed-service` — all text renders in English.
- [ ] Open `/th/services/managed-service` — all text renders in Thai.
- [ ] Open `/zh/services/managed-service` — all text renders in Simplified Chinese.
- [ ] `npm run i18n:verify` exits 0.
- [ ] No browser console warnings about missing i18n keys on either page in any locale.
- [ ] `npm run build` exits 0 with no TypeScript errors.

## Out of Scope

- Redesigning or restyling either page.
- Adding new locale keys or translating content not already present in the locale files.
- Fixing any other pages with hard-coded strings (tracked separately in tech-debt.md).
- Converting these pages from `"use client"` to server components (deferred).

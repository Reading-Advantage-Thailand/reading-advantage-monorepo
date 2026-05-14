# Unit 14 Overview: Internationalization

**Phase:** D (Production)
**Periods:** 3
**Portfolio Project:** Student Progress Tracker (i18n)

## Learning Objectives

By the end of this unit, the intern can:

1. Set up next-intl 4.11.0 in a Next.js application
2. Extract user-facing strings into message files
3. Configure locale routing (`/en/...`, `/th/...`)
4. Use `useTranslations` in Client Components and `getTranslations` in Server Components
5. Understand how Reading Advantage structures its i18n message files

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| next-intl | 4.11.0 | Internationalization for Next.js |

## Portfolio Connection

The intern adds Thai/English support to their Student Progress Tracker:

- English message file (`en.json`) for all UI strings
- Thai message file (`th.json`) for all UI strings
- Locale detection and switching
- Server Component translations and Client Component translations

This mirrors how Reading Advantage apps use next-intl (same version, same conventions).

## Architecture Mirroring

Reading Advantage i18n patterns:

- `messages/en.json` and `messages/th.json` — same structure
- `i18n/routing.ts` — locale routing config
- `i18n/request.ts` — request-level locale detection
- `useTranslations("namespace")` — same hook usage
- `getTranslations("namespace")` — same server-side usage

## Prerequisites

- Units 01–13 complete (all Phase A, B, C)

## Assessment

- Exercise repo: Add i18n to an existing Next.js app
- Quiz at the end of Period 3 (5 questions)

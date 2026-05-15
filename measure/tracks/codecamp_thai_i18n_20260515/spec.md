# Specification: Codecamp Thai Localization

## Overview

The codecamp-advantage product guidelines specify that "Thai is the expected default for chat interactions" and that "all products serve Thai and international markets; i18n is first-class." Currently, the app has `next-intl` wired up but only `messages/en.json` — no Thai translations exist, no language switcher is present, and the AI chat tutor always responds in English. This track adds full Thai localization: translated strings, a language switcher component, and a Thai-default chat system prompt.

## Functional Requirements

1. **Thai Translation File** — Create `messages/th.json` with Thai translations for all existing `en.json` keys (25 keys across `metadata`, `navigation`, `dashboard`, `module`, `chat`, `exercise`, `quiz` namespaces).

2. **Language Switcher** — Add a language toggle in the app header that switches between English (`en`) and Thai (`th`). The switcher must:
   - Persist the user's language preference (localStorage or cookie)
   - Update the UI immediately without page reload
   - Show the current language as a label (e.g., "EN / ไทย")

3. **next-intl Routing** — Configure `next-intl` routing so that:
   - The default locale is `th` (Thai) — matching the product guidelines that Thai learners are the primary audience
   - URLs use locale prefixes (`/th/...`, `/en/...`) for SEO and shareability
   - The root `/` redirects to `/th/`
   - Existing routes continue to work with locale prefix

4. **Chat Thai Default** — Update the AI chat system prompt in `apps/codecamp-advantage/app/api/chat/route.ts` to:
   - Detect the user's locale from the request context
   - When locale is `th`, instruct the LLM to respond in Thai by default
   - When locale is `en`, respond in English
   - Allow the user to explicitly ask for either language

5. **Admin Dashboard Localization** — The admin pages (`/admin`, `/admin/[userId]`, `/admin/new-intern`) must use translation keys for all user-facing strings (table headers, buttons, labels).

## Non-Functional Requirements

- All Thai translations must be natural and grade-level appropriate (the audience is interns, not experts)
- The language switcher must be keyboard accessible (WCAG 2.1 AA)
- No layout shifts when switching between Thai and English (Thai text is typically 10–30% longer than English)
- Translations must not break existing functionality — all existing tests must continue to pass
- Chat must gracefully handle locale detection failure (fallback to English)

## Acceptance Criteria

- [ ] `messages/th.json` exists with Thai translations for all 25 keys in `en.json`
- [ ] Language switcher renders in the header and toggles between EN and ไทย
- [ ] Switching language updates all UI text without page reload
- [ ] Language preference persists across page navigation and browser sessions
- [ ] Default locale is `th` — new users see Thai by default
- [ ] Chat system prompt instructs LLM to respond in Thai when user locale is `th`
- [ ] Chat system prompt responds in English when user locale is `en`
- [ ] Admin dashboard uses translation keys for all visible text
- [ ] All existing tests pass (`pnpm turbo run test --filter=codecamp-advantage --filter=@reading-advantage/domain --filter=@reading-advantage/api`)
- [ ] No layout shifts or clipped text when switching between locales

## Out of Scope

- Adding languages beyond English and Thai
- Translating the 85 seed lesson `contentJson` data (that's curriculum content, not UI)
- Translating tech-debt.md or internal documentation
- Changing the database schema to support localized content (lessons are in English by design — code is English)
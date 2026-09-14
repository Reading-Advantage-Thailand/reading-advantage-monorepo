# Specification: Primary Broken UX Fixes

Track ID: `primary_broken_ux_fixes_20260912`. Type: bug. App: `apps/primary-advantage`.

## Overview

The 2026-09-12 Primary UX audit found user-facing defects that each need a small fix. Evidence: `docs/primary-advantage-ux-refactor-plan.md` sections 4.1, 6.1, and 6.3. This track fixes Chinese message scopes, the blank `/admin` landing page, dead links, footer errors, commented `t()` calls, `captoliza` typos, and stray imports. No behavior changes beyond the listed fixes. No new dependencies.

Run after `primary_authorization_hardening_20260912`.

## Functional Requirements

### FR-1: Nest Chinese lesson message scopes

`messages/cn.json:1945,2001` and `messages/tw.json:1945,2001` place `VocabularyMatching` and `Introduction` at the file root. `en`, `th`, and `vi` nest both inside `Lesson`. Components read `useTranslations("Lesson.VocabularyMatching")` and `useTranslations("Lesson.Introduction")`. 42 keys fail per locale.

Move both objects inside `Lesson` in `cn.json` and `tw.json`. This is a brace move.

### FR-2: Render the `/admin` landing page

`app/[locale]/admin/page.tsx:34` returns `<div></div>`. All content is commented out. Render the existing dashboard components, or redirect `/admin` to `/admin/dashboard`.

### FR-3: Fix `flexl-1`

`components/shared/app-layout.tsx:73` sets the class `flexl-1`. Change it to `flex-1`.

### FR-4: Repoint or delete dead admin and footer links

- `components/admin/admin-quick-actions.tsx:52` and `admin-dashboard-header.tsx:44,99` link to `/admin/dashboard/reports`. That route does not exist.
- `admin-dashboard-header.tsx:106` links to `/admin/settings`. That route does not exist.
- The footer `/pricing` link points at a route that does not exist.

Repoint each link to an existing route, or delete it.

### FR-5: Correct the footer

`components/index/footer.tsx` has a placeholder phone number `+1 (123) 456-7890`, a static `© 2024`, an `<a href="">` that reloads the page, the address `info@primaryadvantage.com` against `admin@reading-advantage.com` on three other pages, and the spelling error "Provinding".

Fix the year, the phone number, the empty `href`, the address conflict, and the spelling error.

### FR-6: Restore commented `t()` calls

Eight call sites in `student-assignment-table.tsx:170,177,184,191,330,333,336,339` comment out a working `t()` call and write English next to it. They cover six distinct strings. The keys exist in `messages/en.json`. Restore the `t()` calls.

### FR-7: Point signup legal links at real routes

Point the two signup legal links at `/terms` and `/privacy-policy`. Remove `target="_blank"` from the internal "Get Started" link. Rename the internal `isPanding` state to `isPending` in `user-signup-form.tsx:29,86,105`.

### FR-8: Replace `captoliza` in live files

Eight live occurrences use the class `captoliza` instead of `capitalize`:

- `components/teacher/my-students.tsx` (2)
- `components/teacher/my-classes.tsx` (4)
- `components/dashboard/article-records-table.tsx` (1)
- `components/dashboard/reminder-reread-table.tsx` (1)

Replace each with `capitalize`. Do not edit `components/teacher/class-roster.tsx` or `components/teacher/reports.tsx`. Those files have zero importers. Track `primary_component_deduplication_20260912` deletes them.

### FR-9: Remove the `act` import and the two `console` module imports

- `components/student-assignment-table.tsx:2` imports `act` from React at module scope. Remove it and any usage.
- Delete `import { log } from "console"` in `server/utils/genaretors/audio-generator.ts`.
- Delete `import { error } from "console"` in `server/controllers/userController.ts`.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Each fix is a minimal edit. No refactors beyond the listed change.
- NFR-3: All existing tests still pass: `pnpm turbo run test --filter=primary-advantage`.

## Acceptance Criteria

- AC-1: Chinese users see translated lesson introduction and vocabulary matching text. No raw `Lesson.VocabularyMatching.*` or `Lesson.Introduction.*` key paths remain on those screens.
- AC-2: `/admin` renders content or redirects to `/admin/dashboard`.
- AC-3: No source file in live components contains `flexl-1` or `captoliza`.
- AC-4: No live link in the application points at `/admin/dashboard/reports`, `/admin/settings`, or `/pricing`.
- AC-5: `components/student-assignment-table.tsx` has no `act` import.
- AC-6: No `import { log } from "console"` or `import { error } from "console"` remains in the app.
- AC-7: The footer year, phone number, empty `href`, address, and "Provinding" spelling are corrected.

## Out of Scope

- Authorization. Track `primary_authorization_hardening_20260912` owns that.
- Audio and highlighting. Track `primary_audio_highlight_correctness_20260912` owns that.
- Loading-state and skeleton fixes. Track `primary_loading_state_correctness_20260912` owns those.
- Deleting dead `class-roster.tsx` and `reports.tsx`. Track `primary_component_deduplication_20260912` owns that. All six live-looking `NEXT_PUBLIC_BASE_URL` uses sit in those two dead files. Delete the files rather than fix the lines.
- Accessibility and `error.tsx`. Track `primary_structural_alignment_20260912` owns those.

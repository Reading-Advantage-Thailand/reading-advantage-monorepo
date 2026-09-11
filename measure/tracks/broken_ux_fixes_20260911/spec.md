# Specification: Reading Broken UX Fixes

Track ID: `broken_ux_fixes_20260911`. Type: bug. App: `apps/reading-advantage`.

## Overview

The 2026-09-11 UX audit found user-facing defects that each need a small fix. Evidence: `docs/reading-advantage-ux-refactor-plan.md` sections 2-6 and Phase 0. This track fixes broken links, broken client directives, a crash-risk import, audio leaks, and visual typos. No behavior changes beyond the listed fixes. No new dependencies.

## Functional Requirements

### FR-1: Fix broken genre links on the student dashboard

`components/dashboard/student-dashboard-content.tsx` lines 65-67 push `/student/articles?genre=...`. That route does not exist. Change the link to `/student/read` with the same query parameters.

### FR-2: Fix `captoliza` class typos

Two history tables render the class string `captoliza`. Remove the typo in both files under `components/` used by `student/history`. Keep the intended Tailwind classes.

### FR-3: Fix teacher links that return 404

- `components/teacher/class-summary-table.tsx` line 201 links to `/teacher/class-detail/...`. Point it to `/teacher/reports/${classId}`.
- `components/dashboard/class-detail-dashboard.tsx` line 123 links to a nonexistent settings route. Point it to `/teacher/my-classes` or remove the button.

### FR-4: Remove hardcoded Thai-locale redirects and absolute navigations

- Replace hardcoded `/th/teacher/...` redirects in `teacher/reports/page.tsx` line 11, `teacher/reports/[classroomId]/page.tsx` lines 28 and 45, and `components/dashboard/class-detail-dashboard.tsx` lines 56 and 123 with locale-relative paths.
- Replace `router.push(`${NEXT_PUBLIC_BASE_URL}/...`)` calls with relative paths so navigation stays client-side. Search all `app/[locale]/(teacher)` files for the pattern.

### FR-5: Restore `"use client"` in matching game components

`matching.tsx` and `tab-matching-words.tsx` have `"use client"` commented out. Restore the directive in both files. One line each.

### FR-6: Remove the `act` import in the assignment dashboard

`components/student-assignment-dashboard.tsx` imports `act` from React at module scope. This import belongs in tests only. Remove it and any usage.

### FR-7: Stop overlapping flashcard speech

`flashcard-game.tsx` calls `speechSynthesis.speak` without `cancel()`. Add `speechSynthesis.cancel()` before each `speak()` call and in an unmount cleanup. Preserve the existing `en-US` voice behavior.

### FR-8: Fix visual typos and stray console imports

- Fix `className="max-w-[400px]]"` in `student/read/[articleId]/page.tsx` line 151.
- Delete `import { log } from "console"` in `stories/[storyId]/page.tsx` and `admin/reports/[classroomId]/page.tsx`.

### FR-9: Stop the chatbot from wiping message history

`chatbot-floating-button.tsx` calls `setMessages([])` when the chat opens. Remove that call so history survives open and close. Also remove the literal `" : "` prefix on bot messages.

### FR-10: Decide and enforce the games page auth policy

`student/games/page.tsx` has no auth gate while sibling pages redirect to `/auth/signin`. **Owner decision 2026-09-11: games require sign-in.** Add the same redirect used by sibling pages. Note: this file carries uncommitted changes from another track (APK work); stage only the auth-gate hunk.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Each fix is a minimal edit. No refactors beyond the listed change.
- NFR-3: All existing tests still pass: `pnpm turbo run test --filter=reading-advantage`.

## Acceptance Criteria

- AC-1: Clicking a genre on the student dashboard navigates to `/student/read` and renders the article list.
- AC-2: No source file contains the string `captoliza` or `/teacher/class-detail/`.
- AC-3: No teacher file contains a hardcoded `/th/` redirect or a `NEXT_PUBLIC_BASE_URL` prefix in `router.push`.
- AC-4: Both matching components start with `"use client"` and the vocabulary matching page renders.
- AC-5: `components/student-assignment-dashboard.tsx` has no `act` import.
- AC-6: Rapid flashcard flips never overlap speech audio.
- AC-7: No `import { log } from "console"` remains in the app.
- AC-8: Opening and closing the chatbot preserves the conversation.
- AC-9: The games page auth behavior matches the owner-approved policy and sibling pages.

## Out of Scope

- Audio and highlighting logic changes. Track `audio_highlight_correctness_20260911` owns those.
- Component deduplication. Track `component_deduplication_20260911` owns that.
- Server-side data migration. Track `structural_ux_alignment_20260911` owns that.
- The `translate[currentLocale]` fix in `matching.tsx`. Track `loading_state_correctness_20260911` owns it.

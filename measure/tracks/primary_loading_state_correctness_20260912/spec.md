# Specification: Primary Loading and State Correctness

Track ID: `primary_loading_state_correctness_20260912`. Type: bug. App: `apps/primary-advantage`.

## Overview

The 2026-09-12 Primary UX audit found loading and state defects: stuck skeletons, a games-page hydration mismatch, unbounded article scroll, an admin search storm, components declared inside a render body, and hardcoded Thai lookups. Evidence: `docs/primary-advantage-ux-refactor-plan.md` sections 4.2 to 4.5. Each fix is small and uses existing code. No new dependencies.

The blank `/admin` landing page is Track `primary_broken_ux_fixes_20260912` FR-2, not this track.

Run after `primary_authorization_hardening_20260912`. May run in parallel with tracks 2 and 3.

## Functional Requirements

### FR-1: Clear loading flags on every exit

The early return runs before `setLoading(true)`, so a missing user or a missing route parameter leaves the skeleton on screen forever:

- `dashboard/article-records-table.tsx:55,68`
- `dashboard/reminder-reread-table.tsx:52,58`
- `teacher/enhanced-class-roster.tsx:100,107`

`setLoading(false)` sits inside a `map` callback, so an empty array never clears the flag:

- `task-preview-vocabulary.tsx:30,48`
- `task-vocabulary-collection.tsx:28,46`
- `task-sentence-collection.tsx:17,36`

Clear the loading flag in every early-return branch. Move `setLoading(false)` out of the `map` callbacks.

### FR-2: Explicit empty and error states

- `task-sentence-activities.tsx:33,37-46` has no `catch` and no `response.ok` check.
- `pratice/matching-game.tsx:770-781` renders a spinner with no empty state and no error state.
- `articles/word-list.tsx:51` and `articles/sentence.tsx:40` never set `loading` to `true`, so the skeleton is unreachable and an empty list renders a blank dialog.

Add an explicit empty state and an explicit error state to the matching game, the word list, and the sentence list.

### FR-3: Pass `mode` from `searchParams` into `StudentCartridgeHost`

`components/apk/StudentCartridgeHost.tsx:438` reads `window.location.search` during render. The server renders `"briefing"` and the client renders `"demo"`, which is a hydration mismatch. Pass `mode` from the page `searchParams` prop instead.

Stage only the `mode` hunk. This file carries uncommitted APK work.

### FR-4: Advance article offset on duplicate pages

`articles/article-select.tsx:57-60` advances the page only when the response has new rows. A page of duplicates leaves the page number unchanged, the observer rebuilds and fires at once, and the same request repeats without bound. Track the article offset in a ref so a duplicate page still advances it.

### FR-5: Debounce admin student search and drop the duplicate mount fetch

`app/[locale]/admin/students/page.tsx:207,212,616` sends one `/api/students` request per keystroke. The comment claims a debounce that the code does not implement. `teacher/assignments.tsx:112` already has the correct pattern. Reuse it.

`dashboard/article-records-table.tsx:96-98,103-109` fetches twice on every mount. Remove the duplicate fetch.

### FR-6: Hoist components declared inside a render body

Hoist:

- `student-assignment-table.tsx:554` (`AssignmentDetailDialog`)
- `teacher/enhanced-class-roster.tsx:368` (`StudentRow`)
- `standalone-lesson-progress-bar.tsx:384` and `lesson-progress-bar.tsx:534` (`LessonTimer`)

Each parent render currently creates a new component type, so the dialog remounts, loses focus, and restarts its animation.

### FR-7: Replace hardcoded Thai lookups

Hardcoded Thai keys in data lookups: `articles/sentence.tsx:136`, `task-vocabulary-collection.tsx:148`, `task-deep-reading.tsx:352`. Seven components initialize the translation language to `"th"` rather than the active locale. Replace each with the active locale.

### FR-8: Replace interpolated Tailwind classes

`shared/change-role.tsx:174-175` builds Tailwind classes by interpolation (`dark:bg-${color}-900`). Tailwind cannot extract them. Replace with a static lookup map.

### FR-9: Call `init()` and render the assignments table from the model

`teacher/assignments.tsx:313-336` declares `const init = async () => {...}` and never calls it, so a deep link to a classroom does not preselect it. Call `init()`.

`teacher/assignments.tsx:196-207` builds a react-table instance that drives only the header. The body maps the raw array, so the sort buttons change state and no row moves. Render the table body from `table.getRowModel()`.

### FR-10: Check `response.ok` in the assignment dashboard

`teacher/assignment-dashboard.tsx:216-219` checks no `response.ok`, so an error body becomes the assignment state and line 429 throws. Check `response.ok` before parsing.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: No fetch storms: a ten-character admin search sends one request; rapid scrolling fires at most one in-flight fetch.

## Acceptance Criteria

- AC-1: No skeleton survives an empty or failed fetch in the listed components.
- AC-2: Rapid scrolling in article-select fires at most one in-flight fetch. A duplicate page still advances the offset.
- AC-3: A ten-character admin student search sends one request.
- AC-4: `StudentCartridgeHost` contains no `window.location` read during render. The games page has no hydration warning.
- AC-5: The four hoisted components are declared at module scope.
- AC-6: Vietnamese and Chinese users do not see Thai text from the three `.th` lookups.
- AC-7: Assignment sort buttons move rows. A deep link to a classroom preselects it.
- AC-8: `pnpm turbo run test --filter=primary-advantage` passes, except the known pre-existing APK failure.

## Out of Scope

- Blank `/admin` landing. Track `primary_broken_ux_fixes_20260912` FR-2 owns that.
- Merging the two history tables or the two progress bars. Track `primary_component_deduplication_20260912` owns that. Fix the loading flags in both copies first.
- Moving `useEffect` data fetches to server pages. Track `primary_structural_alignment_20260912` owns that.

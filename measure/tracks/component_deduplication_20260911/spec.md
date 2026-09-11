# Specification: Reading Component Deduplication

Track ID: `component_deduplication_20260911`. Type: chore (refactor). App: `apps/reading-advantage`.

## Overview

The 2026-09-11 UX audit found about ten pairs of forked components, including roughly 2,200 duplicated lines in quiz cards alone. Evidence: `docs/reading-advantage-ux-refactor-plan.md` Phase 3. This track merges each pair into one parameterized component and deletes dead code. Behavior stays identical. No new dependencies.

## Functional Requirements

### FR-1: Unfork the stories quiz cards

`components/stories-chapter-question/*` forks `mc-question-card.tsx`, `saq`, and `laq` cards. Parameterize the shared cards with a `storageKey` and endpoint base. Delete the stories forks. Import `QuestionState` from `models/questions-model` in all cards.

### FR-2: Consolidate quiz sessionStorage progress

`mc-question-card.tsx` (981 lines) carries three corruption-repair blocks. Extract one `useQuizProgress(key)` hook that owns sessionStorage reads and writes. Treat server state as the source of truth. Remove the `setTimeout(..., 10)` and `setTimeout(() => router.refresh(), 100)` hacks.

### FR-3: Merge the matching games

`matching.tsx` and `tab-matching-words.tsx` duplicate about 150 lines of game logic. Merge into one component with a `fetchWords` prop.

### FR-4: Merge the enroll flows

`enroll-classes.tsx` and `unenroll-classes.tsx` are 80% identical. Merge into one component with a `mode` prop. Fix the no-op handlers `onClick={() => row.toggleSelected}` to call the function.

### FR-5: Merge the history tables

Parameterize `ArticleRecordsTable` with a variant prop. Delete `reminder-reread-table.tsx`. Preserve the real record status in the data transform.

### FR-6: Merge admin classroom report with the teacher roster table

`components/admin/classroom-report.tsx` and the teacher roster table duplicate about 400 lines. Extract one `ClassroomStudentTable` component used by both.

### FR-7: Merge the word-list dialogs

`word-list.tsx` and `stories-word-list.tsx` are near-identical. Parameterize `word-list.tsx` with a data-source prop. Normalize the three copy-pasted response-shape branches once. Delete `stories-word-list.tsx`. Render one shared audio element per dialog, not one per row. Remove the full-payload `console.log` in `stories-word-list.tsx` line 76. Replace lodash `filter` and `includes` with stdlib methods in both.

### FR-8: Merge the rating popups

`rating-popup.tsx` refetches the whole article to update one number. `chapter-rating-popup.tsx` fires four sequential fetches. Merge into one component that updates state locally. Replace the hand-rolled modal with the existing `Dialog` component.

### FR-9: Extract the shared translate helper

`getTranslateSentence` is duplicated in eight files with three endpoint shapes. Extract one helper with one `cn` to `zh-CN` normalization. Delete the other copies.

### FR-10: Extract shared helpers

- One `isAtLeastTeacher(role)` helper in `lib/`, replacing three copies.
- One GCS audio URL helper, replacing the template hardcoded in at least seven components.
- One teacher react-table shell, replacing the boilerplate copied in seven teacher files.
- One `CopyKeyButton`, replacing the copy logic in three admin/system files.

### FR-11: Delete dead code

Delete after confirming zero importers:

- `components/teacher/reports.tsx`
- `components/admin/dashboard-content.tsx`
- `components/system-articles.tsx`
- Legacy flashcard files `tab-flash-card.tsx` and `flash-card-vocabulary-practice-button.tsx` (move the `Word` type first)
- The stray `SelectStory;` statement in `stories-select.tsx` line 2
- Dead `params`/`searchParams` handling in `read/page.tsx` and `stories/page.tsx`
- The `debugAll` flag and unused imports listed in the audit

## Non-Functional Requirements

- NFR-1: No new dependencies. Remove lodash usage where stdlib suffices.
- NFR-2: Every merge keeps both call sites visually and functionally identical.
- NFR-3: Run `build-graph update ./graph.db <files>` after structural edits per AGENTS.md.

## Acceptance Criteria

- AC-1: `components/stories-chapter-question/` no longer exists; story quizzes render through the shared cards.
- AC-2: One `useQuizProgress` hook owns quiz sessionStorage; no repair blocks or timing hacks remain.
- AC-3: One matching component, one enroll component, one history table, one classroom-student table, one word-list dialog, and one rating popup exist.
- AC-4: One `getTranslateSentence` helper is imported everywhere; `grep -r "zh-CN"` shows one normalization site.
- AC-5: All FR-11 files are deleted; `pnpm turbo run build --filter=reading-advantage` passes.
- AC-6: `pnpm turbo run test --filter=reading-advantage` and `check-types` pass.

## Out of Scope

- FSRS manage-table merge (`vocabulary/tab-manage.tsx` and `manage-tab.tsx`). Defer to `measure/tech-debt.md`.
- Server-side data migration. Track `structural_ux_alignment_20260911` owns that.

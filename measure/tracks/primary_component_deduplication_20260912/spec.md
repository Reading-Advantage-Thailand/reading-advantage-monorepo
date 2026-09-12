# Specification: Primary Component Deduplication

Track ID: `primary_component_deduplication_20260912`. Type: chore (refactor). App: `apps/primary-advantage`.

## Overview

The 2026-09-12 Primary UX audit found that duplication is the dominant code pattern. Nine measured fork pairs share 6,082 identical lines. About 13,900 lines are removable, or 18.5 percent of the 75,196 non-test lines. Evidence: `docs/primary-advantage-ux-refactor-plan.md` section 5. This track deletes dead code first, then merges each pair into one parameterized component. Behavior stays identical. No new dependencies.

Do the deletions first. They shrink the surface of every merge.

Run after tracks 1-4 so shared-file fixes land in both copies before the merge.

## Functional Requirements

### FR-1: Delete dead files, commented blocks, and unreferenced routes

Delete after confirming zero importers:

- `components/ui/sidebar.tsx`
- `components/teacher/assignment-button.tsx`
- `components/teacher/enrollment-demo.tsx`
- `components/teacher/class-roster.tsx`
- `components/teacher/reports.tsx`
- `hooks/use-permissions.ts`
- `hooks/use-mobile.ts`
- `lib/calculateLevel.ts`
- `types/types.d.ts`

`class-roster.tsx` and `reports.tsx` are dead. The routes render `enhanced-class-roster.tsx` and `teacher-progress-reports.tsx` instead. All six `${process.env.NEXT_PUBLIC_BASE_URL}` uses and the no-op `onClick={() => row.toggleSelected}` sit in these two files. Delete the files rather than fix the lines.

Also delete commented-out blocks of 10 lines or more across 29 files, and unreferenced API routes, after the same zero-importer check.

### FR-2: Merge the three lesson/practice game pairs

| Pair | Common lines | Separating parameter |
|---|---|---|
| `lesson-sentence-cloze-test` / `cloze-test-game` | 1213 | `source: lesson \| deck` |
| `lesson-sentence-order-word` / `order-words-game` | 1057 | `source: lesson \| deck` |
| `lesson-sentence-order` / `order-sentences-game` | 970 | `source: lesson \| deck` |

In each pair the only real difference is the data source: a server action in the lesson copy, a `fetch` to an API route in the practice copy. Merge behind one `source` prop.

`pratice/matching-game.tsx` is a separate implementation, not a fork. It shares only 322 lines with the lesson matching games. Extract helpers from it; do not merge it.

### FR-3: Merge the flashcard pair and the matching pair

Merge `lesson-sentence-flashcard` / `lesson-vocabulary-flashcard-card` (691 common) and `lesson-sentence-matching` / `lesson-vocabulary-matching` (685 common) behind one `cardKind: FlashcardType` prop.

### FR-4: Merge first-reading and deep-reading

Merge `task-first-reading` / `task-deep-reading` (558 common) behind `enableTranslation: boolean`.

### FR-5: Merge the two progress bars and the two lesson cards

Merge `lesson-progress-bar` / `standalone-lesson-progress-bar` (642 common) and `lesson-card` / `standalone-lesson-card` (56 common) behind one `source: assignment \| article` prop.

### FR-6: Merge the two history tables

Merge `article-records-table` / `reminder-reread-table` (210 common) behind a `variant: history \| reminder` prop.

### FR-7: Extract one `<DataTable>` shell

Ten files repeat the same react-table boilerplate: 654 lines. One `<DataTable>` shell of about 90 lines replaces it for the eight live tables.

### FR-8: Extract shared helpers

Extract `shuffle`, `formatTime`, the CEFR colour maps, `useDebounce`, and the role check into `lib/`.

`sort(() => Math.random() - 0.5)` appears 22 times. `shuffleArray` is declared twice with an identical body. Replace both with one `shuffle`.

The role triple `["TEACHER","ADMIN","SYSTEM"]` repeats in 8 places. `lib/permissions.ts` already exists and is the correct home.

### FR-9: Export one `sharedMainNav`

Four of the five nav configs hold a byte-identical four-item `mainNav` array. `configs/site-config.ts` holds a sixth copy that has already drifted in order. Export one `sharedMainNav` and spread it in the other four configs.

### FR-10: Move duplicated type declarations

41 type names are declared in more than one file: 89 redundant declarations, 832 lines. `Student` (10 copies) and `Classes` (4 copies) never reached `types/index.d.ts`. Move them there.

### FR-11: Remove `console.log` calls

128 `console.log` calls in 36 files: 14 in client components, 114 in server code. `task-deep-reading.tsx:191` logs the whole article object on every render. Remove them.

### FR-12: Rename misspelled directories and files

Rename `pratice` to `practice`, `genaretors` to `generators`, and `singinAction` to `signinAction`. 15 files import through them. Update every import.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Every merge keeps both call sites visually and functionally identical.
- NFR-3: Run `build-graph update ./graph.db <files>` after structural edits per AGENTS.md.

## Acceptance Criteria

- AC-1: The nine dead files in FR-1 are deleted. `class-roster.tsx` and `reports.tsx` no longer exist.
- AC-2: One cloze component, one word-order component, one sentence-order component, one flashcard component, one matching component, one reading-task component, one progress bar, one lesson card, and one history table exist.
- AC-3: One `<DataTable>` shell serves the eight live tables.
- AC-4: One `shuffle`, one `formatTime`, one CEFR colour map, one `useDebounce`, and one role-check helper are imported everywhere those were copied.
- AC-5: About 13,900 lines are removed, or a documented deviation explains the remainder.
- AC-6: `pnpm turbo run build --filter=primary-advantage`, `check-types`, and `test` pass, except the known pre-existing APK failure.

## Out of Scope

- Merging `pratice/matching-game.tsx` into the lesson matching pair. Extract helpers only.
- Sharing code between `primary-advantage` and `reading-advantage`. The two have diverged too far for a cheap merge.
- Domain-layer migration and a11y. Track `primary_structural_alignment_20260912` owns those.
- Authorization. Track `primary_authorization_hardening_20260912` owns that.

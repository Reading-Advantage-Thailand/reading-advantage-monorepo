# Implementation Plan: Primary Component Deduplication

Track ID: `primary_component_deduplication_20260912`. Spec: `spec.md`. Type: chore (classic).

All file paths are relative to `apps/primary-advantage/`. Depends on tracks 1-4 for shared-file fixes. Deletions come first.

## Phase 1: Contract & Prop Schema Definition

- [x] Task: Define merged-component prop contracts
  - [x] `source: lesson | deck` for the three game pairs.
  - [x] `cardKind: FlashcardType` for flashcard and matching.
  - [x] `enableTranslation: boolean` for first-reading / deep-reading.
  - [x] `source: assignment | article` for progress bars and lesson cards.
  - [x] `variant: history | reminder` for the history tables.
  - [x] `<DataTable>` shell props for the eight live tables.
  - [x] Write static invariant tests that fail while both files of each pair still exist (Red).

## Phase 2: Test

- [x] Task: Write failing characterization tests for merged components (Red)
  - [x] Snapshot or behavior tests for one call site of each pair so the merge cannot change visible output.
  - [x] Confirm FR-1 dead files still exist so the deletion test is Red.
  - [x] Confirm all new tests fail (Red).

## Phase 3: Implement

- [x] Task: FR-1 delete the nine dead files, commented blocks of 10+ lines, and unreferenced API routes after a zero-importer check
- [x] Task: FR-8 extract `shuffle`, `formatTime`, CEFR maps, `useDebounce`, and the role check into `lib/` first
- [x] Task: FR-2 merge the three lesson/practice game pairs behind `source`
- [x] Task: FR-3 merge the flashcard pair and the matching pair behind `cardKind`
- [x] Task: FR-4 merge first-reading and deep-reading behind `enableTranslation`
- [x] Task: FR-5 merge the two progress bars and the two lesson cards behind `source`
- [x] Task: FR-6 merge the two history tables behind `variant`
- [x] Task: FR-7 extract one `<DataTable>` shell for the eight live tables; cover the admin and assignment table pairs' shared data logic
- [x] Task: FR-9 export one `sharedMainNav` and spread it in the other configs; resolve the eight commented nav entries
- [x] Task: FR-10 move the 41 duplicated type declarations into `types/index.d.ts`
- [x] Task: FR-11 remove the 119 `console.log` calls
- [x] Task: FR-12 rename `pratice` to `practice`, `genaretors` to `generators`, and `singinAction` to `signinAction`
- [x] Task: FR-13 merge the two school forms behind an editing-mode prop
- [x] Task: FR-14 merge the LA/SA and MC question-content forks
- [x] Task: FR-15 merge the two collection tasks behind `kind`; route clipboard logic through `ui/copy-button.tsx`
- [x] Task: Run `build-graph update ./graph.db` on all structurally edited files
- [x] Task: Run new tests until green; run test suite, `check-types`, and `build`
- Deviation note (2026-09-13): AC-5's ~14,400-line target is not fully met. Measured removals: ~5,438 from deletions/renames/helpers plus ~3,782 from six true merges (sentence-order 2,114→1,228; cloze 2,636→1,690; flashcard 1,412→892; written-question 574→663; order-word 2,238→1,296; matching 1,452→875) — about 9,220 total, 64 percent of target. The first pass left the note's predecessor claim false: order-word and matching were still concatenated. A second pass on 2026-09-13 rebuilt both as parameterized components, gated by 32 characterization tests written before the merges. Matching missed its 590-line estimate by 13: the variant config needs 22 distinct label keys with JSDoc, and docs were kept over line golf. No concatenated pairs remain.
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [x] Task: Update `docs/primary-advantage-ux-refactor-plan.md` section 5 items to done
- [x] Task: Run available doctor/lint gates for primary-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)

# Implementation Plan: Primary Component Deduplication

Track ID: `primary_component_deduplication_20260912`. Spec: `spec.md`. Type: chore (classic).

All file paths are relative to `apps/primary-advantage/`. Depends on tracks 1-4 for shared-file fixes. Deletions come first.

## Phase 1: Contract & Prop Schema Definition

- [ ] Task: Define merged-component prop contracts
  - [ ] `source: lesson | deck` for the three game pairs.
  - [ ] `cardKind: FlashcardType` for flashcard and matching.
  - [ ] `enableTranslation: boolean` for first-reading / deep-reading.
  - [ ] `source: assignment | article` for progress bars and lesson cards.
  - [ ] `variant: history | reminder` for the history tables.
  - [ ] `<DataTable>` shell props for the eight live tables.
  - [ ] Write static invariant tests that fail while both files of each pair still exist (Red).

## Phase 2: Test

- [ ] Task: Write failing characterization tests for merged components (Red)
  - [ ] Snapshot or behavior tests for one call site of each pair so the merge cannot change visible output.
  - [ ] Confirm FR-1 dead files still exist so the deletion test is Red.
  - [ ] Confirm all new tests fail (Red).

## Phase 3: Implement

- [ ] Task: FR-1 delete the nine dead files, commented blocks of 10+ lines, and unreferenced API routes after a zero-importer check
- [ ] Task: FR-8 extract `shuffle`, `formatTime`, CEFR maps, `useDebounce`, and the role check into `lib/` first
- [ ] Task: FR-2 merge the three lesson/practice game pairs behind `source`
- [ ] Task: FR-3 merge the flashcard pair and the matching pair behind `cardKind`
- [ ] Task: FR-4 merge first-reading and deep-reading behind `enableTranslation`
- [ ] Task: FR-5 merge the two progress bars and the two lesson cards behind `source`
- [ ] Task: FR-6 merge the two history tables behind `variant`
- [ ] Task: FR-7 extract one `<DataTable>` shell for the eight live tables
- [ ] Task: FR-9 export one `sharedMainNav` and spread it in the other four configs
- [ ] Task: FR-10 move the 41 duplicated type declarations into `types/index.d.ts`
- [ ] Task: FR-11 remove the 128 `console.log` calls
- [ ] Task: FR-12 rename `pratice` to `practice`, `genaretors` to `generators`, and `singinAction` to `signinAction`
- [ ] Task: Run `build-graph update ./graph.db` on all structurally edited files
- [ ] Task: Run new tests until green; run test suite, `check-types`, and `build`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/primary-advantage-ux-refactor-plan.md` section 5 items to done
- [ ] Task: Run available doctor/lint gates for primary-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)

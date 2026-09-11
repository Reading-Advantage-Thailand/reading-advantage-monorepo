# Implementation Plan: Reading Component Deduplication

Track ID: `component_deduplication_20260911`. Spec: `spec.md`. Type: chore (classic).

All file paths are relative to `apps/reading-advantage/`. Depends on `broken_ux_fixes_20260911` and `audio_highlight_correctness_20260911` for shared files.

## Phase 1: Contract & Prop Schema Definition

- [ ] Task: Define merged-component prop contracts
  - [ ] Quiz cards: `storageKey`, `endpointBase`, `articleId | chapterId` union prop shape.
  - [ ] Matching: `fetchWords` prop signature. Enroll: `mode: "enroll" | "unenroll"`. History table: `variant` prop. Word list: data-source prop. Rating popup: `target: { articleId } | { storyId, chapterId }`.
  - [ ] Shared helpers: signatures for `isAtLeastTeacher`, GCS audio URL builder, `CopyKeyButton`, teacher table shell.
  - [ ] Write static test asserting `components/stories-chapter-question/` is absent and single definition sites for each helper (Red).

## Phase 2: Test

- [ ] Task: Write failing characterization tests for merged components (Red)
  - [ ] Quiz cards: same render and progress persistence for article and story keys.
  - [ ] Enroll component: both modes call the correct endpoint.
  - [ ] Rating popup: local state update without refetch; Dialog renders.
  - [ ] Translate helper: one call shape, `cn` normalization.

## Phase 3: Implement

- [ ] Task: FR-10 shared helpers first (`isAtLeastTeacher`, GCS audio URL, `CopyKeyButton`, teacher table shell)
- [ ] Task: FR-9 shared `getTranslateSentence` helper; delete seven copies
- [ ] Task: FR-2 `useQuizProgress` hook; strip repair blocks and timing hacks from `mc-question-card.tsx`
- [ ] Task: FR-1 parameterize quiz cards; delete `stories-chapter-question/`; import `QuestionState` from the model
- [ ] Task: FR-3 merge matching games with `fetchWords` prop
- [ ] Task: FR-4 merge enroll flows with `mode` prop; fix `row.toggleSelected` no-ops
- [ ] Task: FR-5 merge history tables; delete `reminder-reread-table.tsx`
- [ ] Task: FR-6 extract `ClassroomStudentTable`; rewire admin report and teacher roster
- [ ] Task: FR-7 merge word-list dialogs; one audio element per dialog; stdlib over lodash
- [ ] Task: FR-8 merge rating popups onto shared `Dialog`
- [ ] Task: FR-11 delete dead code after zero-importer check per file
- [ ] Task: Run `build-graph update ./graph.db` on all structurally edited files
- [ ] Task: Run new tests until green; run `pnpm turbo run test --filter=reading-advantage`, `check-types`, and `build`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 3 items to done
- [ ] Task: Add FSRS manage-table merge deferral row to `measure/tech-debt.md` with owner confirmation
- [ ] Task: Run available doctor/lint gates for reading-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)

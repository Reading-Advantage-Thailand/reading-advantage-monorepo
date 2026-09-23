# Implementation Plan: Reading Component Deduplication

Track ID: `component_deduplication_20260911`. Spec: `spec.md`. Type: chore (classic).

All file paths are relative to `apps/reading-advantage/`. Depends on `broken_ux_fixes_20260911` and `audio_highlight_correctness_20260911` for shared files.

## Phase 1: Contract & Prop Schema Definition

- [x] Task: Define merged-component prop contracts `8d2434e` (part A: variant/chapterNumber card contract, useQuizProgress, translate-sentence, roles, gcs-url; part B: fetchWords/mode/variant/data-source/target props; static invariant tests enforce single definition sites)

## Phase 2: Test

- [x] Task: Write failing characterization tests for merged components (Red) `7974ba3` `8d2434e` (27 part-A + 29 part-B assertions, all Red first, then Green)

## Phase 3: Implement

- [x] Task: FR-10 shared helpers first (`isAtLeastTeacher`, GCS audio URL, `CopyKeyButton`, teacher table shell) `348b142` `c840cff` `9eddc83`
- [x] Task: FR-9 shared `getTranslateSentence` helper; delete seven copies `a353ba7` (10 copies replaced)
- [x] Task: FR-2 `useQuizProgress` hook; strip repair blocks and timing hacks from `mc-question-card.tsx` `7974ba3`
- [x] Task: FR-1 parameterize quiz cards; delete `stories-chapter-question/`; import `QuestionState` from the model `9824ff3` (~1,990 forked lines deleted)
- [x] Task: FR-3 merge matching games with `fetchWords` prop `5f03223`
- [x] Task: FR-4 merge enroll flows with `mode` prop; fix `row.toggleSelected` no-ops `daf721b`
- [x] Task: FR-5 merge history tables; delete `reminder-reread-table.tsx` `5520dfa`
- [x] Task: FR-6 extract `ClassroomStudentTable`; rewire admin report and teacher roster `32687c0`
- [x] Task: FR-7 merge word-list dialogs; one audio element per dialog; stdlib over lodash `fdd0931`
- [x] Task: FR-8 merge rating popups onto shared `Dialog` `d0e6e70`
- [x] Task: FR-11 delete dead code after zero-importer check per file `a3bebd8` (deviation: `system-articles.tsx` retained — two real importers)
- [x] Task: Run `build-graph update ./graph.db` on all structurally edited files `0685c66` `4f1f62a`
- [x] Task: Run new tests until green; run test suite, `check-types` (923 passed, 2 pre-existing failures; zero new tsc errors; `next build` blocked by unrelated APK-track dirty files)
- [x] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md) — PASSED 2026-09-23: session S5 (owner manual verification run 2026-09-23): the single shared matching component rendered and played in the vocabulary tab (S5.3, S5.15); shared quiz cards, tables, and translate helper paths rendered across the student and teacher pages exercised in S5.1-S5.23 with no duplicate-implementation defects observed. Confirmed by explicit product-owner yes on 2026-09-23.

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 3 items to done
- [ ] Task: Add FSRS manage-table merge deferral row to `measure/tech-debt.md` with owner confirmation
- [ ] Task: Run available doctor/lint gates for reading-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)

# Implementation Plan: Primary Test Hygiene and Upload Fixes

_Contract-First + TDD. Commit after each task. `pnpm --filter primary-advantage test`
must be green at the end of every task._

_Blast radius: the only exported symbols in scope are the route `POST` handlers
(upload/csv, upload/classes, upload/csv/cleanup) — zero in-repo callers; the blast
radius is the HTTP surface, covered by the new route-level tests._

## Phase 1: Contract & Schema Definition

- [ ] Task 1: Enumerate the 97 source-grep tests and publish the batch map
    - [ ] Run the FR-1.4 grep over `apps/primary-advantage --glob "*.test.*"` and list every source-string assertion
    - [ ] Assign each to a domain batch keyed to its originating track file (`authorization-hardening-static`, `broken-ux-fixes`, `loading-state-invariants`, `structural-alignment`, `component-deduplication`, `audio-highlight`, `aria-labels-i18n`, stragglers)
    - [ ] Write `measure/tracks/primary_test_hygiene_upload_fixes_20260914/grep-test-inventory.md` with batch, file, assertion count, and planned behavioral replacement per entry
- [x] Task 2: Define the CSV upload summary contract
    - [x] Zod schema `CsvUploadSummary` (`inserted`, `skippedDuplicate`, `skippedExisting` counts) colocated per the track-6 `/schema` convention
    - [x] Export from the upload/csv schema module
- [x] Task 3: Define the session-school policy
    - [x] Document in the track: session is the sole `schoolId` source for upload writes; DB-row school is never consulted for stamping
    - [x] Identify the exact stamping sites in `upload/csv/route.ts` and `upload/classes/route.ts`; audit `upload/csv/cleanup/route.ts`

## Phase 2: Test (Red)

- [ ] Task 4: FR-2 route tests — session-authoritative school
    - [ ] upload/csv: session school A + divergent DB-row school → rows written under A
    - [ ] upload/classes: same divergence case
    - [ ] Session without school context → existing rejection status unchanged (both routes)
- [ ] Task 5: FR-3 route tests — duplicate handling
    - [ ] File with duplicate emails → 200, first row wins, `skippedDuplicate` correct
    - [ ] Email already in DB → 200, `skippedExisting` correct, no 500
    - [ ] Response validates against `CsvUploadSummary`
- [x] Task 6: FR-1 batch 1 replacements — `authorization-hardening-static`
    - [x] Write behavioral replacements (route-level handler invocation per lessons-learned 2026-06-24)
    - [x] Old grep assertions still green alongside (no deletion in Phase 2)

## Phase 3: Implement (Green + per-batch conversion)

- [ ] Task 7: FR-2 — session-authoritative `schoolId` in `upload/csv` and `upload/classes`
    - [ ] Replace DB-row school stamping with session-derived `schoolId`
    - [ ] Align `upload/csv/cleanup` if it shares the pattern
    - [ ] Task 4 tests green
- [ ] Task 8: FR-3 — duplicate-safe CSV insert
    - [ ] In-file dedupe (first row wins)
    - [ ] Conflict-safe insert with per-row skip
    - [ ] Return `CsvUploadSummary` with 200
    - [ ] Task 5 tests green
- [x] Task 9: FR-1 batch 1 conversion — `authorization-hardening-static`
    - [x] Replacements green; delete old grep assertions in the same commit
- [ ] Task 10: FR-1 batch 2 — `broken-ux-fixes`
- [ ] Task 11: FR-1 batch 3 — `loading-state-invariants`
- [ ] Task 12: FR-1 batch 4 — `structural-alignment`
- [ ] Task 13: FR-1 batch 5 — `component-deduplication`
- [ ] Task 14: FR-1 batch 6 — `audio-highlight`
- [ ] Task 15: FR-1 batch 7 — `aria-labels-i18n` + stragglers
    - (Tasks 10–15 follow the Task 9 pattern: replacements written and green first, old grep assertions deleted in the same commit; split further if the Phase 1 inventory shows a batch over ~25 assertions)

## Phase 4: Verification & Closeout

_(Adapted: `measure/generate.sh` and `measure/doctor.sh` do not exist in this repo.)_

- [ ] Task 16: Full gates
    - [ ] `pnpm --filter primary-advantage test` green
    - [ ] `tsc --noEmit` — no new errors beyond the 17 pre-existing APK errors
    - [ ] ESLint 0 errors
    - [ ] FR-1.4 grep gate: no unjustified `readFileSync`-on-source in test files
    - [ ] `build-graph update ./graph.db <edited files>` for structural edits
- [ ] Task 17: Registry updates
    - [ ] Rewrite the three resolved bullets in `docs/primary-advantage-ux-refactor-plan.md` "Known limitations"
    - [ ] Mark inventory file complete; update `metadata.json` (`actual_tasks`, deviation notes if any)

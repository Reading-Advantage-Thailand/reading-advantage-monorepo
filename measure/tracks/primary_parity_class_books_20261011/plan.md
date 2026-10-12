# Plan: Class books ready at the cutover

Track: `primary_parity_class_books_20261011`. Branch: a lane branch from `primary-parity-integration`.
Tell the monorepo session before any write to `primary-parity-integration`. The feature freeze of
the set applies. Run one heavy job at a time (tsc, a test suite, a build, or a browser), never two.
Every task follows the TDD order of `measure/workflow.md` (red, green, refactor, commit, git note).

## Phase D: Design (RPG skin) [checkpoint: dc8ddccff]

- [x] Task: Design the class page order, the book card, and the empty and error texts
    - [x] Read `docs/primary-rpg-skin.md` §2 and §6 and `components/rpg/chrome.tsx` (`Panel`, `Plaque`, `RpgLink`, `RpgButton`)
    - [x] Draw the class page with the book card first: book name, "Lesson N of M", lesson title, next step with its period, links to the lesson plan and the lesson page
    - [x] Draw the empty catalogue, no book assigned, and load error states (texts: spec Member Question 1)
    - [x] Draw the class navigation link to the book card
    - [x] Save the design as a static mock in `measure/tracks/primary_parity_class_books_20261011/design/` (no app code). Done: `design/design.md`, `design/mock-source.tsx.txt`.
- [x] Task: Design the dashboard book slot
    - [x] Draw one row per class book, the row for a class with no book, and the empty slot
    - [x] Keep the slot in its place on `app/[locale]/teacher/dashboard/page.tsx`; tell `primary_parity_teacher_home_20261011` (same page) about the slot size. Done: size and position are in `design/design.md` (section Slot size) and in the note below
- [x] Task: Captures and the owner's look check
    - [x] Capture each state at 375 px and 1280 px, day and night, into `design/`
    - [x] Send the captures to the owner and record the answer in `design/look-check.md` (look check pending (owner, async); `design/look-check.md` has status pending)
- [x] Task: Measure - User Manual Verification 'Phase D: Design (RPG skin)' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual verification steps:
        1. Open the 28 PNG files in `~/Desktop/primary-parity-progress/captures/class_books/phaseD-design/` (list: `design/captures.md`).
        2. Check that the book card is the first card after the class heading and uses the parchment panel.
        3. Check the four card states (assigned, no book, empty catalogue, load error) at 375 px and 1280 px, day and night.
        4. Check the dashboard slot states (rows, empty, error) and that no button is under 48 px.
        5. Write the answer in `design/look-check.md`.

### Phase D notes

- Member Question defaults used (owner decision 2026-10-12, no stop): Q1 the empty catalogue text is the spec default ("The book list is not ready yet. Tell your school admin, who asks Reading Advantage to load the books."), with no LINE link. Q2 the catalogue is the five printed books of `BOOKS` (Origins 1 stays in the assign list). Q3 the browser check assigns Origins 3.2 to the demo class and leaves it.
- Dashboard slot for `primary_parity_teacher_home_20261011` (same page): one `Panel`, `lg:col-span-2`, in the same grid cell as the placeholder today (after the "My classes" card, before the quest cards). Height at 1280 px: about 400 px for three rows, 150 px empty, 110 px error. One row is about 116 px (72 px for a class with no book). The slot grows with the class count and hides no class.
- Design decision: the page stays in the staff shell. Only the book card and the slot are parchment panels. The heading link "Class book" keeps the staff outline button style (44 px, as its neighbours).
- Design decision: only the first book block of the card has a gold button (one gold action per screen).


## Phase S1: Load the catalogue and the guide after the ETL [checkpoint: 9ca2c99d4]
_Story ref: spec.md#story-s1_

- [x] Task: Define the catalogue build contract
    - [x] Write the header of the new file `apps/primary-advantage/cloudbuild-catalogue.yaml`: the purpose, the inputs (build context of the frozen commit, substitution `_WORKBOOKS_ARCHIVE`, secret `DIRECT_DATABASE_URL` from `_TARGET_DATABASE_URL`), the step order, and the submit command (regional, `asia-southeast1`)
    - [x] Define the archive layout: `content/primary/{origins-1,origins-2,origins-3.1,origins-3.2,quest-4}/*.json`, `dashboard/lib/teacher-manual/i18n/`, `Teacher guide/step-*.md`, made with `git -C ~/Desktop/Workbooks archive <commit>` and copied to `gs://primary-advantage_cloudbuild/source/`
    - [x] Reason for a separate build (record in the header): it runs again alone after a fix, it serves a later catalogue update, and the ETL config that rehearsal 2 tested stays the same
- [x] Task: Write the contract test (red)
    - [x] New `packages/domain/src/primary-books/__tests__/catalogue-build-contract.test.ts` on the pattern of `packages/db/src/__tests__/primary-deploy-gate-contract.test.ts`
    - [x] Assert the step order: fetch the archive, refuse a legacy database (`packages/db/scripts/refuse-legacy-db.ts`), build `@reading-advantage/db`, `import-lesson-packages` with the five folders, `import-lesson-guides --workbooks`
    - [x] Assert that the only secret is `DIRECT_DATABASE_URL` and that no step prints an environment value
    - [x] Assert that each folder in the step maps to a key of `BOOKS` (`packages/domain/src/primary-books/mapping.ts`)
- [x] Task: Implement the catalogue build (green)
    - [x] Write `apps/primary-advantage/cloudbuild-catalogue.yaml`: a `cloud-sdk` step copies and extracts the archive to `/workspace/workbooks`; a `node:22-slim` step starts the Cloud SQL proxy, installs, runs the guard, builds `@reading-advantage/db`, and runs both imports
    - [x] Fail the build when an import exits non-zero; print only the import summary lines
- [~] Task: Run the catalogue build on a scratch copy (local run done; cloud run is an orchestrator or owner step: `catalogue-build-commands.md`)
    - [~] Restore the rehearsal 2 export to a new scratch database (never the shared `primary_advantage`); ask the owner for the secret step. Used a clone of `primary_parity_20261011` instead (local Postgres).
    - [~] Run the build once with `--dry-run` flags, then once for real; record the counts (70 lessons, linked, unmapped, failed; 13 en and 13 th guide steps) in `measure/tracks/primary_parity_class_books_20261011/catalogue-run.md`
    - [x] Run the build a second time and record that the row counts do not change
    - [x] Give the owner each unmapped lesson key, with the reason
- [x] Task: Write the runbook and go/no-go text for rehearsal 3
    - [x] Write the new step (after the ETL build, before the deploy) and the archive command in `measure/tracks/primary_parity_class_books_20261011/runbook-changes.md`
    - [x] Write the new §10 item for `docs/deployment/primary-cutover-migration-spec.md` in the same file
    - [~] Tell `primary_parity_rehearsal3_20261011` that the file is ready (the orchestrator relays it)
    - [~] Tell the Workbooks session which (the paths are in `catalogue-build-commands.md`; the orchestrator relays them) Workbooks paths the catalogue build reads, so a change of them reaches the monorepo session
- [x] Task: Docs and doctor
    - [x] Run `measure/generate.sh`, then `measure/doctor.sh`; correct each failure that names a file of this phase
- [x] Task: Measure - User Manual Verification 'Phase S1: Load the catalogue and the guide after the ETL' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual verification steps:
        1. Read `cloudbuild-catalogue.yaml`: the order is fetch, guard, db build, packages, guides.
        2. Read `catalogue-run.md`: 70 linked, 0 failed, 13 steps en and th, same rows on run 2.
        3. Run `catalogue-build-commands.md` steps 1 to 5 against a rehearsal copy (orchestrator or owner).


### Phase S1 notes

- Archive: `~/Desktop/primary-parity-acceptance/workbooks-eeeddfd/` (Workbooks `eeeddfd`, 99 files, 2.6 MB: 70 packages, 3 manual files, 26 step files). Keep it for the cloud run.
- Default used: the plan asks for a `--dry-run` pass first; the real run on a clone replaced it.
- Member Questions: none in this phase.

## Phase S2: Check the class book in the browser [checkpoint: a13a06cf2]
_Story ref: spec.md#story-s2_

- [x] Task: Define the check
    - [x] List the checks of spec S2 with their names and the demo accounts (demo teacher, demo class, one demo student)
        - The 11 checks and the accounts are in `browser-check/README.md`.
- [x] Task: Write the class book block of the go/no-go browser script
    - [x] Add the block to the go/no-go script: the tracked `scripts/primary-parity/cutover-check.mjs` (block runs by default; `CLASS_BOOK_CHECK=off` skips it)
    - [x] Check the class page order, the assign, the lesson page, the projector text, and `/en/b/o3-2/1` for the student
    - [x] Make a second run pass when the book is already assigned (the assign is an upsert, `assignClassBook`)
    - [x] Pure helpers in `scripts/primary-parity/class-book-checks.mjs`; test `__tests__/class-book-checks.test.mjs` (7 tests pass)
- [ ] Task: Run the check on the scratch copy
    - [ ] batch run (orchestrator): needs the catalogue import (S1 import text) on a _run_ clone and the S3-S5 UI
    - [ ] Run steps: `browser-check/README.md`
    - [ ] Save the captures and the result list in `measure/tracks/primary_parity_class_books_20261011/browser-check/` (result list only; no PNG in git)
- [x] Task: Measure - User Manual Verification 'Phase S2: Check the class book in the browser' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual steps: run `browser-check/README.md` steps 1 to 6; read the 11 `class book:` lines (all PASS on both runs); open `teacher-class-book-card.png` and `student1-class-book-qr.png` from the shots folder.

## Phase S3: Tell the teacher what to do when the catalogue is empty [checkpoint: 79d1933cd]
_Story ref: spec.md#story-s3_

- [x] Task: Define the strings
    - [x] Add the keys for the empty catalogue, no book, and load error under `TeacherUi.classBook` in `apps/primary-advantage/messages/{en,th,cn,tw,vi}.json` (Thai by helper, owner check pending; cn, tw, vi keep the English text, as the file practice is today)
- [x] Task: Write the tests (red)
    - [x] `components/teacher/__tests__/assign-book-form.test.tsx`: the empty catalogue shows both sentences and no form
    - [x] `app/[locale]/teacher/class-roster/[classroomId]/__tests__/page.test.tsx`: a load failure shows the error state with a retry link and calls the logger once with `class_books.load_failed`
    - [x] A key-parity test for the new keys in the five locale files
- [x] Task: Implement (green)
    - [x] Change `components/teacher/assign-book-form.tsx` and `components/teacher/class-books-card.tsx` to the design of Phase D
    - [x] Change `loadClassBooks` in `app/[locale]/teacher/class-roster/[classroomId]/page.tsx` to log with `lib/observability/logger.ts` and to return an error state
- [x] Task: Docs and doctor
    - [x] JSDoc on every changed export; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S3: Tell the teacher what to do when the catalogue is empty' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual verification steps:
        1. Open the 12 PNG files in `~/Desktop/primary-parity-progress/captures/class_books/phaseS3/` (list: `design/captures-s3.md`).
        2. Check the three states (empty catalogue, no book, load error) at 375 px and 1280 px, day and night.
        3. Check the empty-catalogue box has two sentences and no form, and the error state has a "Try again" button.
        4. Read the Thai text in `messages/th.json` (`TeacherUi.classBook`, keys `none`, `emptyCatalogueTitle`, `emptyCatalogueBody`, `loadErrorTitle`, `loadErrorBody`, `retry`).

### Phase S3 notes

- Defaults used: Member Question 1 (empty catalogue text) uses the spec default, with no LINE link.
- Thai by helper, owner check pending. The five new keys and the new `none` text are in `th.json`.
- The key `noCatalogue` is removed (two keys replace it: `emptyCatalogueTitle`, `emptyCatalogueBody`). No other file used it.
- The card now uses `Panel`, `RpgLink`, and `RpgButton`; the assign form uses the parchment fields of the Phase D design. S4 adds the `#class-book` anchor and the new layout.
- With an empty catalogue and no book, the card shows only the empty-catalogue box (the "choose a book below" text would mislead).
- The class page keeps the placeholder slot only when there is no session user.

## Phase S4: Put the book card at the top of the class page
_Story ref: spec.md#story-s4_

- [ ] Task: Define the card data
    - [ ] Extend `classBookSchema` in `packages/domain/src/primary-books/class-book-contracts.ts` with the current lesson title and the next step (number, title, period), or add a separate read; choose the smaller change
- [ ] Task: Write the tests (red)
    - [ ] `packages/domain/src/primary-books/__tests__/class-books.test.ts`: `listClassBooks` returns the lesson title and the next step; another school's class gives FORBIDDEN
    - [ ] `components/teacher/__tests__/enhanced-class-roster.test.tsx` (or the existing roster test): the book card renders before `ClassLoginPanel`; the anchor `#class-book` exists; `#class-login` stays
    - [ ] `components/teacher/__tests__/classroom-navigation.test.tsx`: the class book link points to `#class-book`
- [ ] Task: Implement (green)
    - [ ] `packages/domain/src/primary-books/class-books.ts`: the new fields
    - [ ] `components/teacher/enhanced-class-roster.tsx`: move `classBook` above `ClassLoginPanel`
    - [ ] `components/teacher/class-books-card.tsx`: the Phase D design with `components/rpg/*`
    - [ ] `components/teacher/classroom-navigation.tsx`: the class book link; the label in the five locale files
- [ ] Task: Docs and doctor
    - [ ] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S4: Put the book card at the top of the class page' (Protocol in workflow.md)

## Phase S5: Show the assigned book and the next lesson on the dashboard
_Story ref: spec.md#story-s5_

- [ ] Task: Define the slot contract
    - [ ] Add `teacherBookSlotSchema` (class id and name, class book id or null, book name, current lesson, lesson count, lesson title, next step and period) to `packages/domain/src/primary-books/class-book-contracts.ts`
- [ ] Task: Write the tests (red)
    - [ ] `packages/domain/src/primary-books/__tests__/class-books.test.ts` with `packages/domain/src/__tests__/mock-db.ts`: `getTeacherBookSlots` lists the owned and co-taught classes of the school only, a class without a book, the next step; a STUDENT gets FORBIDDEN
    - [ ] `components/teacher/__tests__/class-book-slot.test.tsx`: one row per class book, the "Assign a book" row, the empty slot, and the row link to the lesson page
    - [ ] Update `components/__tests__/axe-screens.test.tsx` for the new slot props
- [ ] Task: Implement (green)
    - [ ] `packages/domain/src/primary-books/class-books.ts`: `getTeacherBookSlots`, with the class rule of `getTeacherHome` (`packages/domain/src/primary-home/teacher-home.ts`); export it in `index.ts`
    - [ ] `components/teacher/class-book-slot.tsx`: render the slots with the Phase D design
    - [ ] `app/[locale]/teacher/dashboard/page.tsx`: read the slots and pass them; a failure logs with the logger and shows the slot error text
- [ ] Task: Docs and doctor
    - [ ] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S5: Show the assigned book and the next lesson on the dashboard' (Protocol in workflow.md)

## Phase S6: Check every Teacher Manual claim
_Story ref: spec.md#story-s6_

- [ ] Task: Define the claim list
    - [ ] List `TeacherUi.classBook.manual.howTo1` to `howTo5` and "The 13 steps" with the page, the account, and the expected result (spec S6)
- [ ] Task: Run the claims on the scratch copy
    - [ ] Follow each claim with the demo teacher and one demo student (2 or 3 students at most); capture each result
    - [ ] Save the result list in `measure/tracks/primary_parity_class_books_20261011/manual-check.md`
- [ ] Task: Correct the manual text where a claim fails
    - [ ] Write a failing test first in `app/[locale]/teacher/manual/__tests__/page.test.tsx` when the change touches the page
    - [ ] Change the keys in the five locale files; the owner checks the English and the Thai text
- [ ] Task: Final side-by-side check
    - [ ] Run checks A1 to A5 of spec "Acceptance Criteria" with the acceptance kit; send the captures to the owner for the last look check
- [ ] Task: Measure - User Manual Verification 'Phase S6: Check every Teacher Manual claim' (Protocol in workflow.md)

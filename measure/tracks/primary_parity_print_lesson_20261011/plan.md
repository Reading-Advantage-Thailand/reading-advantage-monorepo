# Plan: Print one lesson with the Workbooks primary template

Track: `primary_parity_print_lesson_20261011`. Branch: a lane branch from `primary-parity-integration`
after `primary_parity_class_books_20261011` (the catalogue build and the lesson page). Tell the
monorepo session before any write to `primary-parity-integration`. Run one heavy job at a time.
Every task follows the TDD order of `measure/workflow.md`.

## Phase D: Design (RPG skin)

- [ ] Task: Send the message to the Workbooks session
    - [ ] Send the text of spec "Message to the Workbooks session" through the monorepo session; record the answer in `measure/tracks/primary_parity_print_lesson_20261011/workbooks-coordination.md`
- [ ] Task: Design the print entry and the print page
    - [ ] Draw the "Print this lesson" button on the lesson page next to "Projector" and "Rehearsal"
    - [ ] Draw the print page: the preview frame, the gold "Print" button (active after the pictures load), the iron "Back to the lesson" button, and the "print version not ready" text; reuse `components/rpg/chrome.tsx`
- [ ] Task: Captures and the owner's look check
    - [ ] Capture at 375 px and 1280 px, day and night, into `measure/tracks/primary_parity_print_lesson_20261011/design/`
    - [ ] Record the owner's answer and the answers to the Member Questions in `design/look-check.md`
- [ ] Task: Measure - User Manual Verification 'Phase D: Design (RPG skin)' (Protocol in workflow.md)

## Phase S1: Copy the Workbooks primary template into a print kit
_Story ref: spec.md#story-s1_

- [ ] Task: Define the kit contract
    - [ ] `printKitSchema` (template, icons, CSS, source repo, commit, commit date) in `packages/domain/src/primary-books/print/contracts.ts`
    - [ ] The allowlist of Workbooks paths in `packages/domain/scripts/sync-print-kit.ts` (template, `lib/document-wrapper/icons.ts`, `lib/document-wrapper/styles.ts`, `lib/document-wrapper/utils.ts`, `assets/print-fonts/*.woff2`, `assets/print-fonts/OFL-*.txt`)
- [ ] Task: Write the tests (red)
    - [ ] `packages/domain/src/primary-books/print/__tests__/kit-guard.test.ts`: no `<script>`, no external URL, only allowlisted font files; a counterexample fixture fails the guard
    - [ ] `packages/domain/src/primary-books/__tests__/sync-print-kit.test.ts`: a dirty kit path stops the script; `--check` exits 1 for a newer commit (a temporary git repository as the fixture)
- [ ] Task: Implement the sync script (green)
    - [ ] `packages/domain/scripts/sync-print-kit.ts` (`git show <commit>:<path>`; the CSS of `getPrintStyles` for A4 with no cover; the icon map); the `pnpm` script in `packages/domain/package.json`
    - [ ] Run it once on the Workbooks head; commit `packages/domain/src/primary-books/print/kit.generated.ts` and `apps/primary-advantage/public/print-fonts/`
- [ ] Task: Docs and doctor
    - [ ] JSDoc; the sync and check commands in the script header; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S1: Copy the Workbooks primary template into a print kit' (Protocol in workflow.md)

## Phase S2: Store the print data of each lesson
_Story ref: spec.md#story-s2_

- [ ] Task: Define the print data contract
    - [ ] `printLessonSchema` in `packages/domain/src/primary-books/print/contracts.ts`: extend `legacyWorkbookLessonSchema` (`packages/domain/src/workbooks/legacy-workbook-importer.ts`) with the fields that the template reads, plus the series name and level, the lesson number, and the Workbooks commit
- [ ] Task: Write the tests (red)
    - [ ] `packages/domain/src/primary-books/__tests__/import.test.ts`: a package with a print file stores `package.printLesson`; one without stores none and counts "no print data"; a bad print file fails with its name
    - [ ] `packages/domain/src/primary-books/__tests__/catalogue-build-contract.test.ts` (from `primary_parity_class_books_20261011`): the archive layout has `print/*.json`
- [ ] Task: Implement (green)
    - [ ] `packages/domain/src/primary-books/mapping.ts` (`toLessonPackageJson` with the print data), `import.ts`, and `packages/domain/scripts/import-lesson-packages.ts` (read the sibling print file; the report line)
    - [ ] `apps/primary-advantage/cloudbuild-catalogue.yaml` header: the archive layout with `print/*.json`
- [ ] Task: Run the import on the scratch copy
    - [ ] Run the catalogue build of `primary_parity_class_books_20261011` with the Workbooks export; record the counts in `measure/tracks/primary_parity_print_lesson_20261011/import-run.md`
    - [ ] Tell `primary_parity_rehearsal3_20261011` about the new archive paths
- [ ] Task: Docs and doctor
    - [ ] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S2: Store the print data of each lesson' (Protocol in workflow.md)

## Phase S3: Render one lesson with the template
_Story ref: spec.md#story-s3_

- [ ] Task: Define the render contract
    - [ ] `renderPrintLessonInput` (the print data, the locale) and the output (one HTML document) in `packages/domain/src/primary-books/print/contracts.ts`
- [ ] Task: Make the golden fixture
    - [ ] Add a `--fixture <book>/<n>` mode to `sync-print-kit.ts` that renders one lesson with Workbooks' `renderMultipleLessons` at the kit commit; save it in `packages/domain/src/primary-books/print/__fixtures__/`
- [ ] Task: Write the tests (red)
    - [ ] `packages/domain/src/primary-books/print/__tests__/render.test.ts`: the 13 step titles in order; the header names the product once; the QR codes; the Thai page; escaping; the `vocab_fill` blank span only; `@page` A4 with 20 mm; font faces at `/print-fonts/`; the body equals the golden fixture
- [ ] Task: Implement (green)
    - [ ] `packages/domain/src/primary-books/print/render.ts`: Handlebars with the `icon` and `concat` helpers, the port of the `prepareLessonData` behavior (QR with `qrcode`), and the A4 wrapper with `PRINT_BRIDGE_SHIM`
    - [ ] Add `handlebars` 4.7.9 and `qrcode` (lockfile versions) to `packages/domain/package.json`; export the module path
- [ ] Task: Docs and doctor
    - [ ] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S3: Render one lesson with the template' (Protocol in workflow.md)

## Phase S4: Print this lesson from the class book
_Story ref: spec.md#story-s4_

- [ ] Task: Define the read and the strings
    - [ ] `getPrintLesson` (class book id, lesson number) in `packages/domain/src/primary-books/print/print-lesson.ts` with `managedClassBook`; extend `TeacherLesson` in `lesson-support-contracts.ts` with `hasPrint`
    - [ ] Keys `TeacherUi.classBook.lesson.print`, `printNow`, `printNotReady`, `printLoading` in `apps/primary-advantage/messages/{en,th,cn,tw,vi}.json`
- [ ] Task: Write the tests (red)
    - [ ] Domain: `getPrintLesson` refuses a student, a teacher of another class, and another school; returns null with no print data
    - [ ] App: `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/__tests__/page.test.tsx`: the button with print data, the text without it
    - [ ] App: new `.../lessons/[number]/print/__tests__/page.test.tsx` and `components/teacher/__tests__/print-lesson-frame.test.tsx`: the sandboxed `srcDoc` frame, "Print" disabled until load, the `workbook:print` message
    - [ ] A key-parity test for the new keys
- [ ] Task: Implement (green)
    - [ ] New `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/print/page.tsx` (thin; logs a failure with `lib/observability/logger.ts`)
    - [ ] New `apps/primary-advantage/components/teacher/print-lesson-frame.tsx`
    - [ ] The button on `.../lessons/[number]/page.tsx`
- [ ] Task: Print check
    - [ ] On the scratch copy, print Origins 3.2 lesson 5 to PDF in Chrome; put it next to the Workbooks PDF (spec check A3); save both in `measure/tracks/primary_parity_print_lesson_20261011/print-check/`
- [ ] Task: Final side-by-side check
    - [ ] Run checks A1 to A4 of the spec with the acceptance kit; send the captures and the two PDFs to the owner
- [ ] Task: Docs and doctor
    - [ ] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S4: Print this lesson from the class book' (Protocol in workflow.md)

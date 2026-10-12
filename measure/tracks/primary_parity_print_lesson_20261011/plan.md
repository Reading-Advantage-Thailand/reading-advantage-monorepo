# Plan: Print one lesson with the Workbooks primary template

Track: `primary_parity_print_lesson_20261011`. Branch: a lane branch from `primary-parity-integration`
after `primary_parity_class_books_20261011` (the catalogue build and the lesson page). Tell the
monorepo session before any write to `primary-parity-integration`. Run one heavy job at a time.
Every task follows the TDD order of `measure/workflow.md`.

## Phase D: Design (RPG skin) [checkpoint: 545e337af]

- [x] Task: Send the message to the Workbooks session (sent 2026-10-12 by the orchestrator; answer pending)
    - [ ] Send the text of spec "Message to the Workbooks session" through the monorepo session; record the answer in `measure/tracks/primary_parity_print_lesson_20261011/workbooks-coordination.md`
- [x] Task: Design the print entry and the print page
    - [x] Draw the "Print this lesson" button on the lesson page next to "Projector" and "Rehearsal"
    - [x] Draw the print page: the preview frame, the gold "Print" button (active after the pictures load), the iron "Back to the lesson" button, and the "print version not ready" text; reuse `components/rpg/chrome.tsx`
- [x] Task: Captures and the owner's look check
    - [x] Capture at (28 PNG files in `~/Desktop/primary-parity-progress/captures/print_lesson/phaseD-design/`; list in `design/captures.md`) 375 px and 1280 px, day and night, into `measure/tracks/primary_parity_print_lesson_20261011/design/`
    - [x] Record the owner (look check pending (owner, async); defaults below)'s answer and the answers to the Member Questions in `design/look-check.md`
- [x] Task: Measure - User Manual Verification 'Phase D: Design (RPG skin)' (Protocol in workflow.md) - look check pending (owner, async)
    - Steps: open the captures in `design/captures.md`; check the `lesson-with-print-*` button beside Projector and Rehearsal;
      check `print-ready`, `print-loading`, and `print-not-ready` at 375 px and 1280 px, day and night.
    - Member Question defaults used: (1) print data from the Workbooks export; (2) no answer key page, no "with the answer key" choice; (3) the template, not the 70 PDFs.

## Phase S1: Copy the Workbooks primary template into a print kit [checkpoint: aa2ec371e]
_Story ref: spec.md#story-s1_

- [x] Task: Define the kit contract
    - [x] `printKitSchema` (template, icons, CSS, source repo, commit, commit date) in `packages/domain/src/primary-books/print/contracts.ts`
    - [x] The allowlist of Workbooks paths in `packages/domain/scripts/sync-print-kit.ts` (template, `dashboard/lib/document-wrapper/icons.ts`, `dashboard/lib/document-wrapper/styles.ts`, `dashboard/lib/document-wrapper/utils.ts`, `dashboard/assets/print-fonts/*.woff2`, `dashboard/assets/print-fonts/OFL-*.txt`)
- [x] Task: Write the tests (red)
    - [x] `packages/domain/src/primary-books/print/__tests__/kit-guard.test.ts`: no `<script>`, no external URL, only allowlisted font files; a counterexample fixture fails the guard
    - [x] `packages/domain/src/primary-books/__tests__/sync-print-kit.test.ts`: a dirty kit path stops the script; `--check` exits 1 for a newer commit (a temporary git repository as the fixture)
- [x] Task: Implement the sync script (green)
    - [x] `packages/domain/scripts/sync-print-kit.ts` (`git show <commit>:<path>`; the CSS of `getPrintStyles` for A4 with no cover; the icon map); the `pnpm` script in `packages/domain/package.json`
    - [x] Run it once on the Workbooks head; commit `packages/domain/src/primary-books/print/kit.generated.ts` and `apps/primary-advantage/public/print-fonts/`
- [x] Task: Docs and doctor
    - [x] JSDoc; the sync and check commands in the script header; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S1: Copy the Workbooks primary template into a print kit' (Protocol in workflow.md)
    - Notes: kit made at Workbooks c58fa54 (2026-10-07), not HEAD: it is the newest commit of the kit paths, and `--check` uses the same rule.
      The kit holds the template, icons and utils sources, the A4 no-cover CSS with theme tokens (`__THEME_PRIMARY__`, `__THEME_SECONDARY__`, `__THEME_GRADIENT__`), and 25 font files (20 woff2, 5 OFL texts; README not copied).
    - Steps: run `cd packages/domain && ../../node_modules/.bin/tsx scripts/sync-print-kit.ts --check` (exit 0); open `kit.generated.ts` and check the commit id and the ISC header in `iconsSource`.
    - Member Question defaults used: none in this phase.

## Phase S2: Store the print data of each lesson [checkpoint: 89e666c8b]
_Story ref: spec.md#story-s2_

- [x] Task: Define the print data contract
    - [x] `printLessonSchema` in `packages/domain/src/primary-books/print/contracts.ts`: extend `legacyWorkbookLessonSchema` (`packages/domain/src/workbooks/legacy-workbook-importer.ts`) with the fields that the template reads, plus the series name and level, the lesson number, and the Workbooks commit
- [x] Task: Write the tests (red)
    - [x] `packages/domain/src/primary-books/__tests__/import.test.ts`: a package with a print file stores `package.printLesson`; one without stores none and counts "no print data"; a bad print file fails with its name
    - [x] `packages/domain/src/primary-books/__tests__/catalogue-build-contract.test.ts` (from `primary_parity_class_books_20261011`): the archive layout has `print/*.json`
- [x] Task: Implement (green)
    - [x] `packages/domain/src/primary-books/mapping.ts` (`toLessonPackageJson` with the print data), `import.ts`, and `packages/domain/scripts/import-lesson-packages.ts` (read the sibling print file; the report line)
    - [x] `apps/primary-advantage/cloudbuild-catalogue.yaml` header: the archive layout with `print/*.json`
- [x] Task: Run the import on the scratch copy
    - [x] Run the import on the scratch copy `primary_print_s2` with the Workbooks export 08bb160: 70 lessons, 70 print data, run twice with the same counts; counts in `import-run.md`
    - [x] Tell `primary_parity_rehearsal3_20261011` about the new archive paths (orchestrator step: named in the S2 report)
- [x] Task: Docs and doctor
    - [x] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S2: Store the print data of each lesson' (Protocol in workflow.md)
    - Notes: no migration and no schema change (`printLesson` is a key of the `package` jsonb). `printLessonSchema` extends `legacyWorkbookLessonSchema` (it already accepts a string or an array in `article_image_url`) with `writing_practice_url`, and it keeps unknown fields. `build-graph update` not run (brief: graph.db read-only). The archive commit goes to the import through `--workbooks-commit`; the Cloud Build import step reads it from the archive header.
    - Manual verification: from `packages/domain` run `../../node_modules/.bin/vitest run src/primary-books`; read `import-run.md`.

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

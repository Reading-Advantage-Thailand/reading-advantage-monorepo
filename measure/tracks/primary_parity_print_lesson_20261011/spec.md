# Spec: Print one lesson with the Workbooks primary template

Track ID: `primary_parity_print_lesson_20261011`
Type: feature (story-shaped spec)
Triage row: TCH-07 (owner choice "drop" for the legacy workbook generator page) with the owner note
of 2026-10-11: "We should pull the latest primary workbook template in from ~/Desktop/Workbooks/ so
that teachers can use this feature to print individual lessons if they want to do so." The
follow-up decision of 2026-10-11 makes it a new item before the cutover: "Print this lesson with
the Workbooks primary template".

## Overview

A teacher opens a lesson of the class book and clicks "Print this lesson". A print page shows the
lesson as the printed workbook shows it, made with the Workbooks primary template, and the
browser prints it on A4. No PDF service is necessary: the template has its own print CSS.

The monorepo keeps a copy of the template (a "print kit") with the Workbooks commit of the copy.
A sync script makes a new copy from a later commit. Workbooks makes the lesson
content, as the set rule says, so Workbooks also exports the print data of each lesson, and the
catalogue import stores it.

The legacy workbook generator page (`teacher/workbook-generate/page.tsx`, hidden from the nav) is
not ported (owner choice "drop").

This track changes no ETL code. It adds the print files to the Workbooks archive of the catalogue
build of `primary_parity_class_books_20261011`, which `primary_parity_rehearsal3_20261011` collects.

**Sprint goal:** A teacher prints lesson 5 of Origins 3.2 from the class book, and the print matches the Workbooks print of that lesson.

## Track Set

This track is member 8 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_class_books_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Verified Facts (2026-10-11)

Workbooks (`~/Desktop/Workbooks`, head `eeeddfd`, public repo `bodangren/advantage-workbooks`):

- `dashboard/templates/primary_template.html`: 2,312 lines, Handlebars, one lesson per render. It has
  the 13 workbook steps in order (Before You Read 1551 to Lesson Reflection 2204), a homework box,
  and the Thai translation page (2294-2306). It has an `@media print` block (1206-1396) and no
  `@page`, no `<script>`, no external URL, and no `@font-face`. It uses the helpers `icon` and
  `concat` and one unescaped field, `{{{sentence}}}` of `vocab_fill` (line 1993).
- No version string or changelog. The file came in with `c3c1f80` (2026-02-09); the last change is
  `a76f9e0` (2026-10-03).
- `dashboard/lib/template-renderer.ts`: `renderMultipleLessons` and `prepareLessonData` (101-162:
  lesson number label, series fields, QR data URLs from `article_url`, images by position). It
  reads the template through `process.cwd()` and imports `handlebars` and `qrcode-generator`.
  `dashboard/package.json` is `"private": true` with no exports, so the monorepo cannot import it
  as a package.
- The A4 single-lesson document is `wrapSingleLessonDocument`
  (`dashboard/lib/workbook-document-wrapper.ts:47-58`, owner rule of 2026-10-03: the lesson pages,
  then the answer key on its own last page). The page size and margin come from
  `getPrintStyles` (`dashboard/lib/document-wrapper/styles.ts:19-27`: `@page`, 20 mm margin, page number).
  The fonts are Fontsource woff2 files under SIL OFL 1.1 in `dashboard/assets/print-fonts/`
  (Merriweather, Open Sans, Sarabun, Noto Sans Thai, League Spartan), embedded by
  `printFontFaceCss()`. The icons are Lucide (ISC licence) in `dashboard/lib/document-wrapper/icons.ts`.
- `dashboard/scripts/print/make-lesson-pdfs.ts` makes one A4 PDF per lesson with Playwright. The
  70 PDFs (Origins 1, 2, 3.1, 3.2, Quest 4) are in `~/Desktop/print-ready/lessons/`, outside both
  repositories. The script reads the dashboard project files for Origins 2, 3.1, 3.2, and Quest 4
  (`make-lesson-pdfs.ts:35-41`) and the lesson packages only for Origins 1. So a render from the
  packages alone does not match the printed Origins 2 and 3.1 lessons (question order rule
  `BANK_ORDER_BOOKS`, `lib/lesson-package/build.ts:43`).
- The public repo tracks proprietary font archives:
  `dashboard/public/fonts/publisher-font-package/Chalkboard SE.zip` and `Comic Sans MS.zip`. The
  primary template does not use them. The print kit never copies them.
- The rendered examples in `Teacher guide/Primary/rendered/` (2026-04-26) are old. The single
  lesson `origins-2-a0-lesson-01.html` uses the secondary template ("Reading Advantage"). They are
  not a reference for this track.

Monorepo (integration `ca8869cea`):

- `primary_book_lessons.package` (`packages/db/src/schema/primary-books.ts:40-62`) holds only
  glossary, bank, print, activities, summary, Thai summary, tags, and image positions and captions
  (`toLessonPackageJson`, `packages/domain/src/primary-books/mapping.ts:308-319`). It has no
  paragraphs, no Thai paragraphs, and no image files. A linked article gives `articles.passage`.
- `handlebars@4.7.9` is in the lockfile (`apps/reading-advantage`). `qrcode` is a dependency of the
  Primary app (`apps/primary-advantage/package.json:87`).
  Deviation (2026-10-13): the render step in `packages/domain` uses `qrcode` and not the Workbooks
  `qrcode-generator`, because the app already declares `qrcode` and the template needs only the module
  matrix to draw an SVG. The two libraries pick another mask for the same URL; the code text is the same.
- `packages/domain/src/workbooks/print-bridge.ts` (`PRINT_BRIDGE_SHIM`) prints a sandboxed `srcDoc`
  iframe on the message `workbook:print`. `legacyWorkbookLessonSchema`
  (`packages/domain/src/workbooks/legacy-workbook-importer.ts:16`) mirrors the Workbooks
  `WorkbookLesson` schema (`dashboard/lib/workbook-schema.ts:75-125`).
- The only print feature of the Primary app is `PrintStyles` with `window.print()` for the class
  sheet and the QR cards (`components/teacher/class-login/print-styles.tsx`).
- The teacher lesson page is
  `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/page.tsx`
  (`getTeacherLesson`, `packages/domain/src/primary-books/lesson-support.ts:81`).

## Design

- **Print kit (a copy with a version, and a sync script).** The script
  `packages/domain/scripts/sync-print-kit.ts --workbooks <path>` reads one Workbooks commit with
  `git show <commit>:<path>`, so local edits never enter. It writes
  `packages/domain/src/primary-books/print/kit.generated.ts` with the template text, the icon map,
  the A4 single-lesson CSS of `getPrintStyles`, and the source (repo, commit, commit date). It
  imports the pure Workbooks modules at sync time, as `import-lesson-guides.ts` does. It copies
  the OFL woff2 files and their licence texts to `apps/primary-advantage/public/print-fonts/`. An
  allowlist names every path that the script copies. `--check` reports when Workbooks has a later
  commit on the kit paths. The version is the Workbooks commit id; the kit has no content hash
  (`AGENTS.md`, Hashing and Provenance Policy).
- **Why not a shared package:** the Workbooks dashboard is a private Next app with no exports, in
  another repository. A package needs a publish step and a registry. The copy is smaller.
- **Print data from Workbooks.** Workbooks exports one JSON file for each lesson
  (`content/primary/<book>/print/<package file name>`). The file holds the `WorkbookLesson` that
  `make-lesson-pdfs.ts` renders, the series name and level, the lesson number, and public bucket
  picture URLs. The catalogue import stores it as `package.printLesson` (no schema change). The
  monorepo makes no lesson content.
- **Render.** A domain function compiles the kit template with Handlebars and the `icon` and
  `concat` helpers. A port of the behavior of `prepareLessonData` makes the template data. The
  function puts the lesson in an A4 document with the kit CSS and fonts. The print page shows it
  in a sandboxed `srcDoc` iframe with `PRINT_BRIDGE_SHIM`; "Print" sends `workbook:print`.

## Stories

### Story S1: Copy the Workbooks primary template into a print kit
**As a** developer of the monorepo
**I want** a sync script that makes the print kit from one Workbooks commit
**So that** the print uses the latest template and I know which commit it came from

**Acceptance Criteria:**
- Given a clean Workbooks checkout, When the script runs, Then `kit.generated.ts` holds the template, the icons, the A4 CSS, and the commit id and date.
- Given the same run, When it ends, Then `public/print-fonts/` holds only the allowlisted `.woff2` files and their `OFL-*.txt` files.
- Given an uncommitted change in a kit path of Workbooks, When the script runs, Then it stops with a message and writes nothing.
- Given a Workbooks commit on a kit path after the kit commit, When the script runs with `--check`, Then it exits 1 and names the newer commit.
- Given the kit, When the guard test runs, Then it finds no `<script>`, no external URL, and no file outside the allowlist; a counterexample fixture with a `<script>` and an external URL fails the guard.
- Given the kit source, When a reader opens it, Then the ISC notice of the icons and the OFL texts of the fonts are present.

**Estimate:** M
**Priority:** Must

### Story S2: Store the print data of each lesson
**As a** teacher
**I want** the print data of each lesson of the five printed books in the catalogue
**So that** the print matches the printed workbook page for page

**Acceptance Criteria:**
- Given the Workbooks print files of a book folder, When the catalogue import runs, Then each lesson row has `package.printLesson`, validated by the Zod contract `printLessonSchema`.
- Given a lesson without a print file, When the import runs, Then the row has no `printLesson`, and the report counts it as "no print data".
- Given a print file that fails the contract, When the import runs, Then the import names the file and fails, and the earlier rows stay.
- Given the catalogue build of `primary_parity_class_books_20261011`, When the Workbooks archive is made, Then it holds the `print/*.json` files of the five books.
- Given the message to the Workbooks session, When this phase starts, Then the session has the request for the export (see "Message to the Workbooks session").

**Estimate:** M
**Priority:** Must

### Story S3: Render one lesson with the template
**As a** teacher
**I want** the app to render a lesson with the same template and data as the Workbooks print
**So that** my print and the printed book show the same pages

**Acceptance Criteria:**
- Given the print data of Origins 3.2 lesson 5, When the domain function `renderPrintLesson` runs, Then the HTML has the 13 step titles in order, the lesson title, the QR codes, and the Thai translation page.
- Given the same render, When the header shows, Then it reads "Primary Advantage • Origins 3.2" with the product name once.
- Given a golden fixture that Workbooks' own renderer made from the same data at the kit commit, When the test compares the two bodies (whitespace normalized), Then they are the same.
- Given text with `<` or `&` in a field, When the lesson renders, Then the text is escaped, and `vocab_fill` keeps only the blank span markup.
- Given the A4 CSS, When the document renders, Then it has `@page` with size A4 and a 20 mm margin, and the font faces point at `/print-fonts/`.

**Estimate:** M
**Priority:** Must

### Story S4: Print this lesson from the class book
**As a** teacher
**I want** a "Print this lesson" button on the lesson page of my class book
**So that** I can print one lesson for a student who has no workbook or for extra practice

**Acceptance Criteria:**
- Given a lesson with print data, When the teacher opens the lesson page, Then it shows "Print this lesson" next to "Projector" and "Rehearsal".
- Given a click on "Print this lesson", When the print page opens, Then it shows the lesson in a preview frame, a "Print" button that is active after the pictures load, and "Back to the lesson".
- Given a click on "Print", When the browser print dialog opens in Chrome, Then the pages are A4, the steps break as in the Workbooks print, and the teacher can print or save as PDF.
- Given a lesson without print data, When the teacher opens the lesson page, Then the button does not show, and the page says that the print version is not ready.
- Given a teacher who does not teach the class, a student, or a user of another school, When they open the print page, Then they get the same refusal as the lesson page.
- Given each of the five locale files, When the key-parity test runs, Then the new keys are in every file.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements

- Domain code in `packages/domain/src/primary-books/print/` with Zod contracts, `managedClassBook`
  for the permission, and TenantDB scoping. The page stays thin.
- New Primary server code logs with `apps/primary-advantage/lib/observability/logger.ts`.
- The print page around the frame uses the RPG skin kit (`components/rpg/*`, gold button for
  "Print", iron button for "Back to the lesson"). The printed pages use the Workbooks look only.
- `handlebars` is added at the lockfile version (4.7.9) to the package that renders. No other new
  dependency. No PDF service, no headless browser in the app.
- The kit holds no secret and no licensed file. Both repositories are public.
- No schema change and no migration.

## Acceptance Criteria (track level)

The side-by-side kit of `primary_parity_acceptance_20261011` checks these on a rehearsal copy:

| Check | Legacy page (`bfea121`) | New page | Role | Observable behavior |
| --- | --- | --- | --- | --- |
| A1 | `/teacher/workbook-generate` (hidden from the nav; dropped) | `.../books/<classBook>/lessons/5` | TEACHER | "Print this lesson" shows. |
| A2 | none | `.../lessons/5/print` | TEACHER | The preview shows the 13 steps; "Print" opens the print dialog with A4 pages. |
| A3 | `~/Desktop/print-ready/lessons/Origins-3.2/Primary-Advantage-Origins-3.2-Lesson-05-At-the-Market.pdf` (Workbooks print) | the saved PDF of A2 | TEACHER | Page by page, the same steps and the same question order; the owner compares the two. |
| A4 | none | `.../lessons/5/print` | STUDENT and a teacher of another class | Refused. |

- Domain tests (Vitest, `packages/domain`) and app tests (Vitest) pass.
- The owner's look check passes on captures of the print page at 1280 px, day and night, and on
  the saved PDF.

## Message to the Workbooks session

Send this when Phase S2 starts (the monorepo session coordinates; the owner sees it):

1. Please export one print file for each lesson of Origins 1, Origins 2, Origins 3.1, Origins 3.2,
   and Quest 4 to `content/primary/<book>/print/<package file name>`. Put in it the
   `WorkbookLesson` that `make-lesson-pdfs.ts` renders, the series name and level, and the lesson
   number. Use the project files for Origins 2, 3.1, 3.2, and Quest 4, and the packages for
   Origins 1, as the script does. Use public bucket picture URLs, not local files.
2. Please tell the monorepo session the commit id after each change of
   `dashboard/templates/primary_template.html`, `dashboard/lib/document-wrapper/icons.ts`,
   `dashboard/lib/document-wrapper/styles.ts`, or `dashboard/assets/print-fonts/`. The monorepo then runs the sync script.
3. Please confirm that these kit paths hold no secret and no licensed file.
4. A finding for you: the public repo tracks `dashboard/public/fonts/publisher-font-package/Chalkboard SE.zip`
   and `Comic Sans MS.zip`. These are proprietary fonts. The print kit does not copy them.

## Out of Scope

- The legacy workbook generator page (owner choice "drop").
- The answer key page of the Workbooks single-lesson print (see Member Question 2). The teacher
  lesson page already shows the answer key on the screen.
- A PDF service, a stored PDF per lesson, and a print of a whole book.
- Books that `BOOKS` does not know (Quest 5 and later).
- A port of the Workbooks lesson builder (`buildWorkbookLesson`) into the monorepo (see Member
  Question 1).

## Risks

- The print data depends on the Workbooks export. Without it, the button does not show, and
  checks A1 to A3 fail. Ask early (Phase S2, first task).
- The kit and the print data come from Workbooks commits that can differ. The import report and
  the print page show both commit ids, and a test fails when the data has a field that the kit
  template does not know.
- The page number in the margin (`@bottom-center`) needs a browser with CSS page-margin boxes
  (current Chrome). Other browsers print without the page number.
- The bucket pictures must be public-read (Workbooks uploads them public-read). A missing picture
  prints an empty box.

## Member Questions (owner)

1. Print data source. Default: the Workbooks export (the print matches the printed books). The
   other choice: the monorepo builds the data from the stored package, which does not match the
   printed Origins 2 and 3.1 lessons. Which does the owner want?
2. The answer key page. The Workbooks single-lesson PDF has the answer key on its own last page
   (owner rule 2026-10-03). Default for the teacher print in the app: no answer key, because
   students get the pages. Does the owner want a choice "with the answer key"?
3. Alternative: link to the 70 Workbooks PDFs in storage instead of the template. It gives an exact
   match but no template in the monorepo. Default: the template (the owner note). Confirm.

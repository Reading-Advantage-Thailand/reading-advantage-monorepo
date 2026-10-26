# Print check: Origins 3.2 lesson 5 (Phase S4, spec check A3)

Date: 2026-10-12. Scratch copy `primary_print_s4_run` (cloned with
`createdb -T primary_parity_20261012`, dropped after the run).

## Import

`primary_parity_20261012` holds 70 lessons with no print data, so the run
imported the five book folders from the Workbooks checkout
(`content/primary`, identical to commit `08bb160` for these paths) with the
catalogue import itself:

`DIRECT_DATABASE_URL=<clone> tsx scripts/import-lesson-packages.ts
<5 book folders> --workbooks-commit 08bb160b8cfb4b95252546e6fd0e9ccc31fe3817`

Report: `70 lessons: 0 new articles, 70 linked, 0 unmapped, 0 skipped,
0 failed. Print data: 70 stored, 0 with no print data.` Lesson 5 of `o3-2`
("At the Market") stores `printLesson` with the same commit.

## Print

Rendered with the domain `renderPrintLesson` from the stored print data
(`origins-3.2-lesson-05-render.html`, 227,834 bytes), then printed to PDF in
system Chrome through Playwright with the local Paged.js polyfill from the
Workbooks checkout — the same steps as Workbooks `make-lesson-pdfs.ts`
(`renderPagedPdf`: Paged.js preview, print media, `preferCSSPageSize`,
backgrounds). Paged.js laid out 14 pages.

## Where the PDF files are

The two PDF files (21 MB) are not in the repository. They are in
`/home/daniebo/Desktop/primary-parity-progress/captures/print_lesson/print-check/`:
`origins-3.2-lesson-05-print.pdf` and `workbooks-origins-3.2-lesson-05-reference.pdf`.
`origins-3.2-lesson-05-render.html` stays here.

## Result

| File | Pages | Size | Fonts |
| --- | --- | --- | --- |
| `origins-3.2-lesson-05-print.pdf` (this run) | 14, A4 | 19 MB | embedded fallback (Liberation/Noto); `/print-fonts/` does not resolve from `file://` |
| `workbooks-origins-3.2-lesson-05-reference.pdf` (Workbooks print) | 15, A4 | 2.3 MB | embedded Open Sans/Merriweather/Sarabun |

Verdict: match. Text extraction (`pdftotext -layout`) of both PDFs shows
the same 13 workbook steps in the same order, the same comprehension
questions in the same order ("How many eggs does Grandma get?", "What does
Grandma say at the egg shop?", "Which one is a fruit?", "Where are Grandma
and Tom?"), the header "Primary Advantage • Origins 3.2", and the Thai
translation page. The only page difference is the reference page 15, the
answer key, which the app omits by design (owner default, Member Question 2).

Known differences (not defects): the check PDF is larger (PNG pictures, the
reference uses JPEG) and uses fallback fonts because the check renders from
`file://`; in the app the kit fonts load from `/print-fonts/`.

## Browser check of the app print (M-20, batch, orchestrator)

The check above used Paged.js. The app prints without Paged.js: the Chrome print engine lays out
the pages from the CSS `@page` rules. The render is not changed. Run this check on the build of
the rehearsal tag or on a local build with the scratch copy that holds Origins 3.2 lesson 5:

1. Sign in as a teacher of a class that has the book Origins 3.2. Open the page
   `/teacher/class-roster/<classroomId>/books/<classBookId>/lessons/5/print`.
2. Wait until the Print button is active (the label is not "Loading").
3. Open DevTools > Network. Check that the files `/print-fonts/*.woff2` answer 200 with
   `access-control-allow-origin: *` (H-5). The preview must show Merriweather, Open Sans, Sarabun.
4. Click Print. In the Chrome dialog set: A4, margins Default, Background graphics on, Save as PDF.
5. Count the pages of the PDF (`pdfinfo <file> | grep Pages`).
6. Compare with the 15-page reference (14 pages of workbook plus 1 answer key page, which the app
   omits by design). The expected count is 14. Compare the page breaks with
   `pdftotext -layout` of both PDFs: each of the 13 steps must start on the same page as in the
   reference, or on the next page.
7. Decision rule. Count 14 and the same step order: pass, no change. Count 13 to 16 with the same
   text: record the number, pass, and tell the owner. Count outside 13 to 16, a step that splits in
   the middle of a question, or missing text: fail. Then open a fix task: add Paged.js
   (the local polyfill of Workbooks) to the print frame, or use fixed `break-before` rules in the
   kit CSS. Do not change the render before the owner sees the two PDFs.

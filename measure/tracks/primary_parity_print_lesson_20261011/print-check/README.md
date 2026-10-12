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

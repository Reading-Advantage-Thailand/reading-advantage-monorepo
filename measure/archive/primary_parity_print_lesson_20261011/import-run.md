# Import run: print data (Phase S2, 2026-10-12)

Source: Workbooks commit 08bb160b8cfb4b95252546e6fd0e9ccc31fe3817 (read with `git archive`; nothing written in Workbooks).
Target: scratch database `primary_print_s2`, made with `createdb -T primary_parity_20261011`. It was dropped after the run.
The class books tables of the copy were empty. The script is the catalogue import itself, so no earlier step was necessary.

Command (from `packages/domain`, under the heavy lock):
`DIRECT_DATABASE_URL=<scratch url> ../../node_modules/.bin/tsx scripts/import-lesson-packages.ts <5 book folders> --workbooks-commit 08bb160b8cfb4b95252546e6fd0e9ccc31fe3817`

| Run | Report line |
| --- | --- |
| 1 | 70 lessons: 0 new articles, 70 linked, 0 unmapped, 0 skipped, 0 failed. Print data: 70 stored, 0 with no print data. |
| 2 | same line |

Database after run 2: 70 lesson rows, 70 with `package.printLesson`, 70 distinct keys, 5 books, 626 articles, 6260 mcq rows.
The 26 lessons of Origins 2 and 3.1 with a legacy `article_image_url` array passed the contract.
Every stored `printLesson` has `workbooksCommit` set to the commit above.
The archive layout now lists `content/primary/<book>/print/*.json` (header of `cloudbuild-catalogue.yaml`).

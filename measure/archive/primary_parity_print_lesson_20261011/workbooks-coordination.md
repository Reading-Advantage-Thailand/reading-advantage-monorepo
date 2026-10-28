# Workbooks coordination: print kit and print data

Date sent: 2026-10-12 (sent by the orchestrator, the monorepo session).

## Sent text

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
5. Extra question: when will the export of the print files be ready? Please give a date.
6. Extra question: please give the head commit id of the kit paths (template, icons, styles, fonts).
7. Request: please make a golden fixture HTML of Origins 3.2 lesson 5 with the Workbooks renderer
   at the kit commit, for example `content/primary/origins-3.2/print/golden/lesson-05.html`.

## Answer (interim, 2026-10-12, recorded by the orchestrator)

- Kit head for all kit paths: `c58fa54` (Workbooks HEAD `eeeddfd`, 2026-10-10). Per path:
  `dashboard/templates/primary_template.html` a76f9e0; `dashboard/lib/document-wrapper/icons.ts`
  c4353bd; `dashboard/lib/document-wrapper/styles.ts` 8f772a7; `dashboard/assets/print-fonts/` c58fa54.
- Correction: the font folder is `dashboard/assets/print-fonts/`, not `assets/print-fonts/`.
  The spec and the plan now name the right path. Phase S1 must use it.
- Workbooks will send the commit id after each change of these paths.
- Item 3 confirmed: no secret and no licensed file. print-fonts = 21 woff2 files from Fontsource 5.3.0
  (Merriweather, Open Sans, Sarabun, Noto Sans Thai, League Spartan), all SIL OFL 1.1. Copy each
  `OFL-*.txt` with the fonts. `icons.ts` = Lucide paths (lucide-static 1.49.0, ISC); keep the ISC header.
  `styles.ts` and the template have no key, token, password, or external URL.
- Item 4: the finding is correct (Chalkboard SE and Comic Sans MS in tracked zips, also inside
  `publisher-font-package.zip`). The print path does not use them. A history removal is an owner
  decision; Workbooks gives it to the owner.
- Item 1 and the golden fixture come on 2026-10-12 (commit id to follow). Path
  `content/primary/<book>/print/<package file name>`, for example `origins-3.2/print/p05.json` and
  `origins-3.1/print/e12.json`. Content: `{ seriesName, seriesLevel, lessonNumber, packageKey, lesson: WorkbookLesson }`.
  Pictures: `https://storage.googleapis.com/primary-app-storage/images/<legacy articleId>_<n>.png`.
  Golden fixture: `content/primary/origins-3.2/print/golden/lesson-05.html` (renderMultipleLessons +
  wrapSingleLessonDocument, with the answer key, from `print/p05.json`, same commit).
- Note for S3: the golden has the answer key page. The spec puts the answer key out of scope.
  S3 must compare without that page, or decide otherwise.
- `import-lesson-packages.ts` reads only top-level `*.json` files of each folder, so `print/` is not
  read. The class-books archive needs no remake. Phase S2 must read the sibling `print/` folder.

## Update (2026-10-12, orchestrator)

- Correction: `dashboard/assets/print-fonts/` holds 20 woff2 files, 5 `OFL-*.txt` files, and a README (not 21 woff2).
- Export and golden in Workbooks commit 08bb160 (HEAD fa5a4a8 adds only measure/ files); 70 print files;
  golden `content/primary/origins-3.2/print/golden/lesson-05.html` (with key) and `lesson-05-no-key.html`.
  Details for S2/S3 are in the orchestrator notes.

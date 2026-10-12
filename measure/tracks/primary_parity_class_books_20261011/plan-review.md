# Plan review: class books

## Phase D: Design (RPG skin)

Review of `git diff f3bdc71bb..HEAD`: it holds docs and mock text files only. No app code, no
schema, no server code, no locale file changed. No Critical or High finding.

- Low: the mock source and the two harness scripts are `.txt` files in `design/`. The harness
  uses a `node_modules` symlink in the scratch area, so a rerun needs that symlink.
- Low: the captures use the system font. The real page uses Fredoka and Mitr through next/font.
  The look check judges layout and colour; line breaks in Thai can differ.
- Medium (for S3 and S4): the proposed key `lessonTitle` must not clash with the existing object
  `TeacherUi.classBook.lesson`. Use a new key name. Each new key goes in all five locale files.
- Medium (for S5): the dashboard row for a class with no book links to
  `/teacher/class-roster/<id>#class-book`. The anchor needs `scroll-mt` under the sticky header.

## Phase S1: Load the catalogue and the guide after the ETL

Review of the phase diff: one Cloud Build config, one contract test, and track docs. No app code,
no schema, no locale file. No Critical or High finding.

- Medium: the cloud steps (archive fetch, Cloud SQL proxy, install) did not run. Only the import text ran
  locally against a clone. The first cloud run is the real test of `fetch-archive` and the proxy socket.
- Medium: the `pnpm install --frozen-lockfile` of the whole monorepo runs in the build, as in the ETL
  build. A lighter install (`--filter @reading-advantage/domain...`) can cut the time. Not done: the ETL pattern is tested.
- Low: `_EXPECTED_LESSONS` is 70 for Workbooks `eeeddfd`. A new package needs the new value in the submit command.
- Low: the build reads the secret version `latest`, as the ETL config does. The cutover sheet must gate on version 1.
- Low: the `--dry-run` pass of the plan was not run; the real run on a clone replaced it.
- Low: the contract test checks the YAML text only (like the deploy gate test). It cannot run the build.
- Lesson: `pnpm --filter <pkg> <script> <abs paths>` passes the arguments through (pnpm 11), so the
  scripts need no wrapper. The tsx import of the Workbooks `i18n/*.ts` files works from an archive copy.

## Phase S2: Check the class book in the browser

Review of the phase diff: one script block, one helper file, one node test, and track docs. No app
code, no schema, no locale file. No Critical or High finding. The script block was not run.

- Medium: the block never ran in a browser. Selectors rest on the page source
  (`[data-class-book-slot]`, `#class-login`, `#answer-key`, `section[aria-labelledby^="guide-period-"] > ol > li`,
  `section[aria-label] button[aria-pressed]`, link name "Lesson plan"). The first batch run can need a selector fix.
- Medium: check 1 (card above the sign-in panel) fails until S4 is in the build. This is on purpose.
- Medium: if S3 or S4 rename the strings "Assign", "Book assigned.", or "Lesson plan", change the block in the same commit.
- Low: the helpers file is `.mjs` (the script runs under plain node). The test is `.test.mjs`, so the
  kit `tsc` run (`include` of `.ts` only) does not type-check it.
- Low: the student check uses student 1 of the class code flow; the run does not test a book that is not approved.
- Low: the check strings are English only (`/en/` URLs), as the other blocks.
- Why no pure-helper test of the browser flow: the script has top-level `await` and starts Chromium
  on import, so only the extracted pure judges have a test.

## Phase S3: Tell the teacher what to do when the catalogue is empty

Review of the phase diff: the card, the form, the page loader, the five locale files, three test files.
No Critical or High finding. The `loadClassBooks` failure logs once through `lib/observability/logger.ts`
(no `console.error`). The page reads `listClassBooks` and `listCatalogueBooks` with the session user, as before.

- Medium: Thai text is by the helper. The owner checks it (async).
- Medium: cn, tw, and vi keep the English text for the new keys (file practice today). Key parity is tested.
- Low: the retry link goes to the same page (a full reload through the router). It has no pending state.
- Low: the load-error state hides the assign form. A teacher cannot assign during a failure.
- Low: the design capture harness stands in for the staff header, sidebar, and sign-in panel. The font is the system font.
- Low: `measure/doctor.sh` reports A13 (stale archived directory `agents_md_audit_science_advantage_20260603`). It is not from this phase.
- Strings kept for the S2 browser block: "Assign", "Book assigned.", "Lesson plan", `[data-class-book-slot]`. No change to the block.

## Phase S4: Put the book card at the top of the class page

Review of `git diff 3f8e641ec..HEAD`: domain read, card, roster order, navigation link, five locale files, tests.
No Critical or High finding. `listClassBooks` keeps `assertCan` and `managedClass` (FORBIDDEN for another school; tested).
Both new reads use the same `unscoped` reason as before. No new Zod boundary. No `console.error`.

- Medium: step titles show in English in all locales (the `WORKBOOK_STEPS` titles; the pacing page does the same today).
- Medium: Thai text for the new keys is by the helper. cn, tw, and vi keep English for the card keys (file practice). The nav key `classBook` is translated in all five files.
- Low: `listClassBooks` adds one select (lesson titles). The new fields are optional on `ClassBook`, so `toClassBook` callers do not set them.
- Low: the capture harness shows the real card in a mock page shell, not the full class page.
- Low: with several books, only the first block has the gold "Open lesson" button.
- Low: eslint on the three changed components passed. A full app eslint did not run.
- Skipped: `build-graph update` (graph.db read only, orchestrator rule).


## Phase S5: Show the assigned book and the next lesson on the dashboard

Review of `git diff 0c9356701..HEAD`: domain read and schema, slot component, dashboard page, five locale files, tests.
No Critical or High finding. `getTeacherBookSlots` calls `assertCan(class:list)` (STUDENT gets FORBIDDEN; tested) and
reads only classes of `user.schoolId` that the teacher owns or co-teaches. The book, state, and title reads use only those class ids.
The page logs a failure once with `class_books.slot_failed` (no `console.error`). The five locale files have the same six new keys.

- Medium: Thai text for the six new keys is by the helper (owner check, async). cn, tw, and vi keep English (file practice).
- Medium: the "Assign a book" row of a class with no book links to the class page. A school admin who is not a teacher of the class sees no row (same rule as `getTeacherHome`).
- Low: `ClassBookSlot` still has a placeholder mode for the class page without a session user. The teacher home track can delete it with that code path.
- Low: step titles in the slot are English in all locales (as in the card).
- Low: a dashboard page test checks the slot; no browser run of the real page (batch run of S2 covers it).
- Low: the "Class books" slot title key `slotTitle` differs from the placeholder key `title`; the S2 browser block uses `[data-class-book-slot]`, which both keep.
- Lesson: `pnpm run build` in a package can start `pnpm install` inside the lock and block all lanes. Use `node_modules/.bin/tsc` from the package folder.
- Skipped: `build-graph update` (graph.db read only, orchestrator rule).
